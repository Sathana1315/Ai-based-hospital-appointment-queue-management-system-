from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
from app.database import queues_collection, doctors_collection
from app.auth import get_current_user, require_role
from app.ws_manager import manager

router = APIRouter(prefix="/queues", tags=["Queues"])

AVG_CONSULT_MINUTES = 15  # estimated average consultation time

@router.get("/live/{doctor_id}")
async def get_live_queue(
    doctor_id: str,
    date_str: Optional[str] = None
):
    """Public endpoint — returns full live queue for a doctor on a given date."""
    today_str = date_str or datetime.now().strftime("%Y-%m-%d")

    queue = await queues_collection.find_one({
        "doctor_id": doctor_id,
        "date": today_str
    })

    doc = await doctors_collection.find_one({"_id": doctor_id})
    doctor_name = doc["name"] if doc else "Unknown"

    if not queue:
        return {
            "doctor_id": doctor_id,
            "doctor_name": doctor_name,
            "date": today_str,
            "active_appointments": [],
            "current_serving_index": -1,
            "serving_now": None,
            "waiting_count": 0,
            "completed_count": 0,
            "estimated_wait_minutes": 0
        }

    active_apps = queue.get("active_appointments", [])
    current_idx = queue.get("current_serving_index", -1)

    serving_now = None
    if 0 <= current_idx < len(active_apps):
        serving_now = active_apps[current_idx]

    waiting = [a for a in active_apps if a["status"] == "SCHEDULED"]
    completed = [a for a in active_apps if a["status"] == "COMPLETED"]

    # Estimate: count SCHEDULED patients still before serving position
    estimated_wait = len(waiting) * AVG_CONSULT_MINUTES

    return {
        "id": str(queue["_id"]),
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "date": today_str,
        "active_appointments": active_apps,
        "current_serving_index": current_idx,
        "serving_now": serving_now,
        "waiting_count": len(waiting),
        "completed_count": len(completed),
        "estimated_wait_minutes": estimated_wait
    }


@router.post("/next")
async def call_next_patient(
    doctor_id: Optional[str] = None,
    current_user=Depends(require_role(["doctor", "receptionist", "admin"]))
):
    """Advance the queue to the next patient."""
    resolved_doc_id = doctor_id

    if current_user["role"] == "doctor":
        doc_profile = await doctors_collection.find_one({"user_id": current_user["id"]})
        if not doc_profile:
            raise HTTPException(status_code=404, detail="Doctor profile not found for current user")
        resolved_doc_id = str(doc_profile["_id"])
    elif not resolved_doc_id:
        raise HTTPException(status_code=400, detail="doctor_id is required for staff operations")

    today_str = datetime.now().strftime("%Y-%m-%d")
    queue = await queues_collection.find_one({
        "doctor_id": resolved_doc_id,
        "date": today_str
    })

    if not queue or not queue.get("active_appointments"):
        raise HTTPException(status_code=400, detail="No appointments scheduled for this doctor today")

    active_apps = queue.get("active_appointments", [])
    current_idx = queue.get("current_serving_index", -1)

    # Find next SCHEDULED patient
    next_idx = None
    for i in range(current_idx + 1, len(active_apps)):
        if active_apps[i]["status"] == "SCHEDULED":
            next_idx = i
            break

    if next_idx is None:
        raise HTTPException(status_code=400, detail="All patients have been called or no more SCHEDULED patients remain")

    # Mark previous as CALLED if still SERVING
    for idx, app in enumerate(active_apps):
        if idx == current_idx and app["status"] == "SERVING":
            app["status"] = "CALLED"
        if idx == next_idx:
            app["status"] = "SERVING"

    await queues_collection.update_one(
        {"_id": queue["_id"]},
        {"$set": {
            "current_serving_index": next_idx,
            "active_appointments": active_apps
        }}
    )

    # Broadcast update
    await manager.broadcast({
        "type": "QUEUE_UPDATE",
        "doctor_id": resolved_doc_id
    })

    return {
        "message": f"Called patient #{active_apps[next_idx]['queue_number']}: {active_apps[next_idx]['patient_name']}",
        "serving_index": next_idx,
        "serving_now": active_apps[next_idx]
    }
