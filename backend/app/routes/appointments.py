from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import uuid
from datetime import datetime, time, timezone, timedelta
from app.config import settings
from app.database import (
    appointment_requests_collection,
    appointments_collection,
    queues_collection,
    patients_collection,
    guest_accounts_collection,
    doctors_collection,
    hospitals_collection,
    prescriptions_collection,
    notifications_collection,
    users_collection,
    db
)
from app.models.appointment import (
    AppointmentRequestCreate, AppointmentSuggest, AppointmentReject,
    PatientRespondSuggestion, PrescriptionCreate, WalkInCreate
)
from app.auth import get_current_user, require_role
from app.ws_manager import manager

router = APIRouter(prefix="/appointments", tags=["Appointments"])

medical_records_col = db["medical_records"]


# ──────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────

async def _resolve_patient_name(patient_id: str, is_guest: bool) -> str:
    if is_guest:
        return f"Guest ({patient_id})"
    pat = await patients_collection.find_one({"user_id": patient_id})
    return pat["name"] if pat else "Registered Patient"


async def _create_notification(user_id: str, title: str, message: str, notif_type: str = "info"):
    """Helper to push a notification to a user."""
    notif = {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,   # info | success | warning | error
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await notifications_collection.insert_one(notif)
    
    # Send notification via websocket
    await manager.send_personal_message(
        {"type": "NEW_NOTIFICATION", "notification": {**notif, "_id": str(notif["_id"]), "created_at": notif["created_at"].isoformat()}},
        user_id
    )


# ──────────────────────────────────────────────────
# PATIENT: Submit appointment request
# ──────────────────────────────────────────────────

@router.post("/request", status_code=status.HTTP_201_CREATED)
async def request_appointment(
    req: AppointmentRequestCreate,
    current_user=Depends(get_current_user)
):
    role = current_user["role"]
    user_id = current_user["id"]

    target_doctor_id = req.doctor_id
    target_hospital_id = req.hospital_id

    # If DEMO_MODE is active and logged-in user is Demo Patient, route to Demo Doctor
    if settings.DEMO_MODE and (current_user.get("username") == settings.DEMO_PATIENT_USERNAME):
        demo_doc_user = await users_collection.find_one({"username": settings.DEMO_DOCTOR_USERNAME})
        if demo_doc_user:
            demo_doc_prof = await doctors_collection.find_one({"user_id": demo_doc_user["_id"]})
            if demo_doc_prof:
                target_doctor_id = str(demo_doc_prof["_id"])
                target_hospital_id = demo_doc_prof.get("hospital_id", req.hospital_id)

    doctor = await doctors_collection.find_one({"_id": target_doctor_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    req_id = str(uuid.uuid4())
    new_request = {
        "_id": req_id,
        "patient_id": user_id,
        "is_guest": role == "guest",
        "doctor_id": target_doctor_id,
        "hospital_id": target_hospital_id,
        "status": "PENDING_DOCTOR_APPROVAL",
        "requested_slot": req.requested_slot,
        "suggested_slot": None,
        "suggested_slots": [],
        "symptoms": req.symptoms or req.notes or "",
        "notes": req.notes or "",
        "priority": req.priority or "NORMAL",
        "booking_method": req.booking_method or "MANUAL",
        "age": req.age,
        "gender": req.gender,
        "rejection_reason": None,
        "is_demo_simulation": False,
        "created_at": datetime.now(timezone.utc)
    }
    await appointment_requests_collection.insert_one(new_request)

    # Notify doctor if registered user
    if doctor.get("user_id"):
        await _create_notification(
            doctor["user_id"],
            "New Appointment Request",
            f"New appointment request from {current_user.get('username', 'a patient')} for {req.requested_slot.strftime('%Y-%m-%d %H:%M')}.",
            "info"
        )
        await manager.send_personal_message({
            "type": "NEW_APPOINTMENT_REQUEST",
            "request_id": req_id,
            "doctor_id": target_doctor_id,
            "patient_id": user_id
        }, doctor["user_id"])

    return {
        "message": "Appointment request submitted successfully. Awaiting doctor approval.",
        "request_id": req_id,
        "status": "PENDING_DOCTOR_APPROVAL"
    }


# ──────────────────────────────────────────────────
# DOCTOR / RECEPTIONIST: Approve request (Generates Queue Token)
# ──────────────────────────────────────────────────

@router.post("/approve/{request_id}")
async def approve_appointment(
    request_id: str,
    current_user=Depends(require_role(["doctor", "receptionist", "admin"]))
):
    req = await appointment_requests_collection.find_one({"_id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Appointment request not found")

    if req["status"] == "APPROVED":
        raise HTTPException(status_code=400, detail="Already approved")

    # If doctor is calling, verify it's for their profile
    if current_user["role"] == "doctor":
        doc_prof = await doctors_collection.find_one({"user_id": current_user["id"]})
        if doc_prof and str(doc_prof["_id"]) != req["doctor_id"]:
            raise HTTPException(status_code=403, detail="You can only approve requests for your own schedule")

    patient_name = await _resolve_patient_name(req["patient_id"], req["is_guest"])

    slot_dt = req.get("suggested_slot") or req["requested_slot"]
    slot_date_str = slot_dt.strftime("%Y-%m-%d")

    start_date = datetime.combine(slot_dt.date(), time.min)
    end_date = datetime.combine(slot_dt.date(), time.max)

    existing_count = await appointments_collection.count_documents({
        "doctor_id": req["doctor_id"],
        "slot": {"$gte": start_date, "$lt": end_date},
        "status": {"$ne": "CANCELLED"}
    })
    queue_number = existing_count + 1
    app_id = str(uuid.uuid4())

    new_app = {
        "_id": app_id,
        "request_id": request_id,
        "doctor_id": req["doctor_id"],
        "patient_id": req["patient_id"],
        "is_guest": req["is_guest"],
        "slot": slot_dt,
        "status": "SCHEDULED",
        "queue_number": queue_number,
        "is_demo_simulation": False,
        "created_at": datetime.now(timezone.utc)
    }
    await appointments_collection.insert_one(new_app)

    await appointment_requests_collection.update_one(
        {"_id": request_id},
        {"$set": {"status": "APPROVED"}}
    )

    # Add to live queues safely according to doctor_id index
    queue_doc = await queues_collection.find_one({"doctor_id": req["doctor_id"]})
    queue_item = {
        "appointment_id": app_id,
        "patient_name": patient_name,
        "queue_number": queue_number,
        "status": "SCHEDULED",
        "is_demo_simulation": False
    }
    if not queue_doc:
        await queues_collection.insert_one({
            "_id": str(uuid.uuid4()),
            "doctor_id": req["doctor_id"],
            "date": slot_date_str,
            "active_appointments": [queue_item],
            "current_serving_index": -1
        })
    else:
        if queue_doc.get("date") != slot_date_str:
            # New date: replace list and update date
            await queues_collection.update_one(
                {"_id": queue_doc["_id"]},
                {"$set": {"date": slot_date_str, "active_appointments": [queue_item], "current_serving_index": -1}}
            )
        else:
            await queues_collection.update_one(
                {"_id": queue_doc["_id"]},
                {"$push": {"active_appointments": queue_item}}
            )

    # Notify patient
    est_wait_mins = queue_number * 15
    await _create_notification(
        req["patient_id"],
        "Appointment Approved",
        f"Your appointment request was approved! Queue Token: #{queue_number} (Est. Wait: ~{est_wait_mins} mins).",
        "success"
    )

    await manager.send_personal_message({
        "type": "APPOINTMENT_APPROVED",
        "request_id": request_id,
        "appointment_id": app_id,
        "queue_number": queue_number,
        "estimated_wait_minutes": est_wait_mins,
        "doctor_id": req["doctor_id"]
    }, req["patient_id"])

    # Broadcast queue update
    await manager.broadcast({
        "type": "QUEUE_UPDATE",
        "doctor_id": req["doctor_id"]
    })

    return {
        "message": "Appointment approved and queue token generated.",
        "appointment_id": app_id,
        "queue_number": queue_number,
        "estimated_wait_minutes": est_wait_mins
    }


# ──────────────────────────────────────────────────
# DOCTOR / RECEPTIONIST: Reject request
# ──────────────────────────────────────────────────

@router.post("/reject/{request_id}")
async def reject_appointment(
    request_id: str,
    rejection: AppointmentReject,
    current_user=Depends(require_role(["doctor", "receptionist", "admin"]))
):
    req = await appointment_requests_collection.find_one({"_id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Appointment request not found")

    if req["status"] in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail=f"Cannot reject a request that is already {req['status']}")

    if current_user["role"] == "doctor":
        doc_prof = await doctors_collection.find_one({"user_id": current_user["id"]})
        if doc_prof and str(doc_prof["_id"]) != req["doctor_id"]:
            raise HTTPException(status_code=403, detail="You can only reject requests for your own schedule")

    await appointment_requests_collection.update_one(
        {"_id": request_id},
        {"$set": {"status": "REJECTED", "rejection_reason": rejection.reason}}
    )

    # Notify patient
    await _create_notification(
        req["patient_id"],
        "Appointment Request Declined",
        f"Doctor declined your appointment request. Reason: {rejection.reason}",
        "error"
    )

    await manager.send_personal_message({
        "type": "APPOINTMENT_REJECTED",
        "request_id": request_id,
        "reason": rejection.reason
    }, req["patient_id"])

    return {"message": "Appointment request rejected", "reason": rejection.reason}


# ──────────────────────────────────────────────────
# DOCTOR / RECEPTIONIST: Suggest alternate slot
# ──────────────────────────────────────────────────

@router.post("/suggest/{request_id}")
async def suggest_slots(
    request_id: str,
    suggestion: AppointmentSuggest,
    current_user=Depends(require_role(["doctor", "receptionist", "admin"]))
):
    req = await appointment_requests_collection.find_one({"_id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Appointment request not found")

    if current_user["role"] == "doctor":
        doc_prof = await doctors_collection.find_one({"user_id": current_user["id"]})
        if doc_prof and str(doc_prof["_id"]) != req["doctor_id"]:
            raise HTTPException(status_code=403, detail="You can only suggest slots for your own schedule")

    dt = suggestion.suggested_slot
    slot_str = dt.strftime("%A, %b %d at %I:%M %p")

    await appointment_requests_collection.update_one(
        {"_id": request_id},
        {"$set": {
            "status": "WAITING_FOR_PATIENT_CONFIRMATION",
            "suggested_slot": dt,
            "suggested_slots": [dt],
            "doctor_notes": suggestion.notes or ""
        }}
    )

    await _create_notification(
        req["patient_id"],
        "Doctor Suggested New Appointment Time",
        f"Doctor suggested a new slot: {slot_str}. Please accept or decline.",
        "info"
    )

    await manager.send_personal_message({
        "type": "DOCTOR_SUGGESTED_TIME",
        "request_id": request_id,
        "suggested_slot": dt.isoformat(),
        "notes": suggestion.notes
    }, req["patient_id"])

    return {"message": f"Suggested new slot ({slot_str}) sent to patient."}


# ──────────────────────────────────────────────────
# PATIENT: Respond to Doctor's Suggested Slot (Accept / Decline)
# ──────────────────────────────────────────────────

@router.post("/patient-respond/{request_id}")
async def patient_respond_suggestion(
    request_id: str,
    body: PatientRespondSuggestion,
    current_user=Depends(require_role(["patient", "guest", "admin"]))
):
    req = await appointment_requests_collection.find_one({"_id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Appointment request not found")

    if req["patient_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only respond to your own appointment requests")

    if body.action.upper() == "ACCEPT":
        target_slot = req.get("suggested_slot") or req["requested_slot"]
        slot_date_str = target_slot.strftime("%Y-%m-%d")
        start_date = datetime.combine(target_slot.date(), time.min)
        end_date = datetime.combine(target_slot.date(), time.max)

        existing_count = await appointments_collection.count_documents({
            "doctor_id": req["doctor_id"],
            "slot": {"$gte": start_date, "$lt": end_date},
            "status": {"$ne": "CANCELLED"}
        })
        queue_number = existing_count + 1
        app_id = str(uuid.uuid4())

        new_app = {
            "_id": app_id,
            "request_id": request_id,
            "doctor_id": req["doctor_id"],
            "patient_id": req["patient_id"],
            "is_guest": req["is_guest"],
            "slot": target_slot,
            "status": "SCHEDULED",
            "queue_number": queue_number,
            "created_at": datetime.now(timezone.utc)
        }
        await appointments_collection.insert_one(new_app)

        await appointment_requests_collection.update_one(
            {"_id": request_id},
            {"$set": {"status": "APPROVED", "requested_slot": target_slot}}
        )

        patient_name = await _resolve_patient_name(req["patient_id"], req["is_guest"])
        queue_doc = await queues_collection.find_one({"doctor_id": req["doctor_id"]})
        queue_item = {
            "appointment_id": app_id,
            "patient_name": patient_name,
            "queue_number": queue_number,
            "status": "SCHEDULED"
        }
        if not queue_doc:
            await queues_collection.insert_one({
                "_id": str(uuid.uuid4()),
                "doctor_id": req["doctor_id"],
                "date": slot_date_str,
                "active_appointments": [queue_item],
                "current_serving_index": -1
            })
        else:
            if queue_doc.get("date") != slot_date_str:
                await queues_collection.update_one(
                    {"_id": queue_doc["_id"]},
                    {"$set": {"date": slot_date_str, "active_appointments": [queue_item], "current_serving_index": -1}}
                )
            else:
                await queues_collection.update_one(
                    {"_id": queue_doc["_id"]},
                    {"$push": {"active_appointments": queue_item}}
                )

        doc = await doctors_collection.find_one({"_id": req["doctor_id"]})
        if doc and doc.get("user_id"):
            await _create_notification(
                doc["user_id"],
                "Patient Accepted Slot",
                f"Patient {patient_name} accepted your suggested slot for {target_slot.strftime('%Y-%m-%d %H:%M')}.",
                "success"
            )

        return {
            "message": "Suggested slot accepted. Appointment approved and Queue Token generated!",
            "appointment_id": app_id,
            "queue_number": queue_number
        }
    else:
        await appointment_requests_collection.update_one(
            {"_id": request_id},
            {"$set": {"status": "CANCELLED"}}
        )
        doc = await doctors_collection.find_one({"_id": req["doctor_id"]})
        if doc and doc.get("user_id"):
            await _create_notification(
                doc["user_id"],
                "Patient Declined Slot",
                f"Patient declined the suggested appointment slot.",
                "info"
            )
        return {"message": "Suggested slot declined and request cancelled."}


# ──────────────────────────────────────────────────
# DOCTOR: List Pending Requests for Doctor Dashboard
# ──────────────────────────────────────────────────

@router.get("/doctor/requests")
async def get_doctor_requests(
    current_user=Depends(require_role(["doctor", "admin"]))
):
    doc_prof = await doctors_collection.find_one({"user_id": current_user["id"]})
    if not doc_prof:
        return []

    doctor_id = str(doc_prof["_id"])
    requests = []

    async for req in appointment_requests_collection.find({"doctor_id": doctor_id}).sort("created_at", -1):
        r = {
            "id": str(req["_id"]),
            "patient_id": req["patient_id"],
            "doctor_id": req["doctor_id"],
            "hospital_id": req["hospital_id"],
            "status": req.get("status", "PENDING_DOCTOR_APPROVAL"),
            "requested_slot": req["requested_slot"].isoformat() if isinstance(req.get("requested_slot"), datetime) else req.get("requested_slot"),
            "suggested_slot": req.get("suggested_slot").isoformat() if isinstance(req.get("suggested_slot"), datetime) else req.get("suggested_slot"),
            "symptoms": req.get("symptoms") or req.get("notes") or "No symptoms specified",
            "priority": req.get("priority", "NORMAL"),
            "booking_method": req.get("booking_method", "MANUAL"),
            "rejection_reason": req.get("rejection_reason"),
            "created_at": req.get("created_at").isoformat() if isinstance(req.get("created_at"), datetime) else req.get("created_at")
        }

        # Resolve patient details & medical history summary
        pat = await patients_collection.find_one({"user_id": req["patient_id"]})
        if pat:
            r["patient_name"] = pat.get("name", "Registered Patient")
            r["patient_age"] = req.get("age") or pat.get("age", 30)
            r["patient_gender"] = req.get("gender") or pat.get("gender", "N/A")
            r["medical_history"] = pat.get("medical_history", [])
        else:
            r["patient_name"] = f"Guest Patient ({req['patient_id'][:8]})"
            r["patient_age"] = req.get("age", "N/A")
            r["patient_gender"] = req.get("gender", "N/A")
            r["medical_history"] = []

        # Previous visits count
        past_visits_count = await appointments_collection.count_documents({
            "patient_id": req["patient_id"],
            "status": "COMPLETED"
        })
        r["previous_visits_count"] = past_visits_count

        requests.append(r)

    return requests


# ──────────────────────────────────────────────────
# WALK-IN: Receptionist creates direct token
# ──────────────────────────────────────────────────

@router.post("/walk-in", status_code=status.HTTP_201_CREATED)
async def create_walk_in(
    data: WalkInCreate,
    current_user=Depends(require_role(["receptionist", "admin"]))
):
    doctor = await doctors_collection.find_one({"_id": data.doctor_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    today_str = datetime.now().strftime("%Y-%m-%d")

    # Count today's appointments for this doctor
    from datetime import date
    today = date.today()
    start_date = datetime.combine(today, time.min)
    end_date = datetime.combine(today, time.max)

    existing_count = await appointments_collection.count_documents({
        "doctor_id": data.doctor_id,
        "slot": {"$gte": start_date, "$lt": end_date},
        "status": {"$ne": "CANCELLED"}
    })
    queue_number = existing_count + 1

    # Create guest-like record for walk-in
    walk_in_id = f"WALKIN-{uuid.uuid4().hex[:8].upper()}"
    app_id = str(uuid.uuid4())

    new_app = {
        "_id": app_id,
        "request_id": None,
        "doctor_id": data.doctor_id,
        "patient_id": walk_in_id,
        "patient_name_override": data.patient_name,  # direct name storage
        "is_guest": True,
        "slot": datetime.now(timezone.utc),
        "status": "SCHEDULED",
        "queue_number": queue_number,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc)
    }
    await appointments_collection.insert_one(new_app)

    # Add to live queue
    queue_doc = await queues_collection.find_one({
        "doctor_id": data.doctor_id, "date": today_str
    })
    queue_item = {
        "appointment_id": app_id,
        "patient_name": data.patient_name,
        "queue_number": queue_number,
        "status": "SCHEDULED"
    }
    if not queue_doc:
        await queues_collection.insert_one({
            "_id": str(uuid.uuid4()),
            "doctor_id": data.doctor_id,
            "date": today_str,
            "active_appointments": [queue_item],
            "current_serving_index": -1
        })
    else:
        await queues_collection.update_one(
            {"_id": queue_doc["_id"]},
            {"$push": {"active_appointments": queue_item}}
        )

    # Broadcast queue update
    await manager.broadcast({
        "type": "QUEUE_UPDATE",
        "doctor_id": data.doctor_id
    })

    return {
        "message": "Walk-in token created successfully",
        "appointment_id": app_id,
        "queue_number": queue_number,
        "patient_name": data.patient_name
    }


# ──────────────────────────────────────────────────
# LIST: Appointments
# ──────────────────────────────────────────────────

@router.get("/list")
async def list_appointments(
    doctor_id: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    user_id = current_user["id"]
    user_role = current_user["role"]

    query = {}
    if user_role == "doctor":
        doc_profile = await doctors_collection.find_one({"user_id": user_id})
        if doc_profile:
            query["doctor_id"] = str(doc_profile["_id"])
        else:
            return []
    elif user_role in ["patient", "guest"]:
        query["patient_id"] = user_id
    else:
        if doctor_id:
            query["doctor_id"] = doctor_id

    appointments = []
    async for app in appointments_collection.find(query).sort("slot", 1):
        app["id"] = str(app["_id"])
        app.pop("_id", None)

        doc = await doctors_collection.find_one({"_id": app["doctor_id"]})
        if doc:
            app["doctor_name"] = doc["name"]
            app["department"] = doc["department"]
            h = await hospitals_collection.find_one({"_id": doc["hospital_id"]})
            app["hospital_name"] = h["name"] if h else "Unknown Hospital"
        else:
            app["doctor_name"] = "Unknown Doctor"
            app["hospital_name"] = "Unknown Hospital"

        # Resolve patient name (use override for walk-ins)
        if app.get("patient_name_override"):
            app["patient_name"] = app["patient_name_override"]
        elif app["is_guest"]:
            app["patient_name"] = f"Guest ({app['patient_id']})"
        else:
            pat = await patients_collection.find_one({"user_id": app["patient_id"]})
            app["patient_name"] = pat["name"] if pat else "Registered Patient"

        appointments.append(app)

    return appointments


# ──────────────────────────────────────────────────
# LIST: Appointment Requests
# ──────────────────────────────────────────────────

@router.get("/requests")
async def list_requests(
    current_user=Depends(require_role(["receptionist", "admin", "patient", "guest"]))
):
    user_id = current_user["id"]
    user_role = current_user["role"]

    query = {}
    if user_role in ["patient", "guest"]:
        query["patient_id"] = user_id

    requests = []
    async for req in appointment_requests_collection.find(query).sort("created_at", -1):
        req["id"] = str(req["_id"])
        req.pop("_id", None)

        if isinstance(req.get("requested_slot"), datetime):
            req["requested_slot"] = req["requested_slot"].isoformat()
        if isinstance(req.get("suggested_slot"), datetime):
            req["suggested_slot"] = req["suggested_slot"].isoformat()
        if isinstance(req.get("created_at"), datetime):
            req["created_at"] = req["created_at"].isoformat()

        doc = await doctors_collection.find_one({"_id": req["doctor_id"]})
        if doc:
            req["doctor_name"] = doc["name"]
            req["department"] = doc["department"]
            h = await hospitals_collection.find_one({"_id": req["hospital_id"]})
            req["hospital_name"] = h["name"] if h else "Unknown"
        else:
            req["doctor_name"] = "Unknown Doctor"
            req["hospital_name"] = "Unknown Hospital"

        if req.get("is_guest"):
            req["patient_name"] = f"Guest ({req['patient_id']})"
        else:
            pat = await patients_collection.find_one({"user_id": req["patient_id"]})
            req["patient_name"] = pat["name"] if pat else "Registered Patient"

        requests.append(req)
    return requests


# ──────────────────────────────────────────────────
# PUBLIC: Get dynamic time slots for a doctor on a specific date
# ──────────────────────────────────────────────────

@router.get("/slots/{doctor_id}")
async def get_doctor_slots(
    doctor_id: str,
    date: str, # YYYY-MM-DD
    current_user=Depends(get_current_user)
):
    doctor = await doctors_collection.find_one({"_id": doctor_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    day_name = target_date.strftime("%A")
    
    # Get schedule for this day (or default)
    schedule_str = "09:00-17:00"
    if doctor.get("weekly_schedule") and day_name in doctor["weekly_schedule"]:
        schedule_str = doctor["weekly_schedule"][day_name]
        
    if schedule_str.lower() in ["off", "closed", "leave"]:
        return {"date": date, "slots": []}
        
    try:
        start_str, end_str = schedule_str.split("-")
        start_time = datetime.strptime(start_str.strip(), "%H:%M").time()
        end_time = datetime.strptime(end_str.strip(), "%H:%M").time()
    except:
        start_time = time(9, 0)
        end_time = time(17, 0)
        
    start_dt = datetime.combine(target_date, time.min)
    end_dt = datetime.combine(target_date, time.max)
    
    existing_apps = await appointments_collection.find({
        "doctor_id": doctor_id,
        "slot": {"$gte": start_dt, "$lt": end_dt},
        "status": {"$ne": "CANCELLED"}
    }).to_list(None)
    
    booked_times = [app["slot"].strftime("%H:%M") for app in existing_apps]
    
    pending_reqs = await appointment_requests_collection.find({
        "doctor_id": doctor_id,
        "requested_slot": {"$gte": start_dt, "$lt": end_dt},
        "status": {"$in": ["PENDING", "APPROVED", "SUGGESTED"]}
    }).to_list(None)
    
    for req in pending_reqs:
        booked_times.append(req["requested_slot"].strftime("%H:%M"))
        
    slots = []
    current_time = datetime.combine(target_date, start_time)
    end_time_dt = datetime.combine(target_date, end_time)
    
    # Ensure current time is timezone aware UTC
    current_time = current_time.replace(tzinfo=timezone.utc)
    end_time_dt = end_time_dt.replace(tzinfo=timezone.utc)
    
    # also mark slots in the past as BLOCKED
    now = datetime.now(timezone.utc)
    
    while current_time < end_time_dt:
        time_str = current_time.strftime("%H:%M")
        
        # Check if lunch break (e.g. 13:00 - 14:00)
        is_lunch = time(13, 0) <= current_time.time() < time(14, 0)
        
        status = "AVAILABLE"
        if current_time < now:
            status = "BLOCKED"
        elif is_lunch:
            status = "LUNCH"
        elif time_str in booked_times:
            status = "BOOKED"
            
        slots.append({
            "time": time_str,
            "datetime": current_time.isoformat(),
            "status": status
        })
        current_time += timedelta(minutes=15)
        
    return {"date": date, "slots": slots}


# ──────────────────────────────────────────────────
# DOCTOR: Prescribe & Complete Appointment
# ──────────────────────────────────────────────────

@router.post("/prescribe/{appointment_id}")
async def prescribe(
    appointment_id: str,
    pres_data: PrescriptionCreate,
    current_user=Depends(require_role(["doctor"]))
):
    app = await appointments_collection.find_one({"_id": appointment_id})
    if not app:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if app["status"] == "COMPLETED":
        raise HTTPException(status_code=400, detail="Prescription already submitted for this appointment")

    doc_profile = await doctors_collection.find_one({"user_id": current_user["id"]})
    if not doc_profile or str(doc_profile["_id"]) != app["doctor_id"]:
        raise HTTPException(status_code=403, detail="You can only prescribe for your own appointments")

    pres_id = str(uuid.uuid4())
    new_prescription = {
        "_id": pres_id,
        "appointment_id": appointment_id,
        "doctor_id": app["doctor_id"],
        "doctor_name": doc_profile["name"],
        "patient_id": app["patient_id"],
        "diagnosis": pres_data.diagnosis,
        "medicines": [m.model_dump() for m in pres_data.medicines],
        "lab_tests": pres_data.lab_tests,
        "advice": pres_data.advice,
        "follow_up_date": pres_data.follow_up_date,
        "notes": pres_data.notes,
        "attachment_url": pres_data.attachment_url,
        "created_at": datetime.now(timezone.utc)
    }
    await prescriptions_collection.insert_one(new_prescription)

    # Mark appointment COMPLETED
    await appointments_collection.update_one(
        {"_id": appointment_id},
        {"$set": {"status": "COMPLETED"}}
    )

    # Update queue status
    slot_date_str = app["slot"].strftime("%Y-%m-%d")
    await queues_collection.update_one(
        {
            "doctor_id": app["doctor_id"],
            "date": slot_date_str,
            "active_appointments.appointment_id": appointment_id
        },
        {"$set": {"active_appointments.$.status": "COMPLETED"}}
    )

    # Broadcast queue update
    await manager.broadcast({
        "type": "QUEUE_UPDATE",
        "doctor_id": app["doctor_id"]
    })

    # Build medical record
    medicines_summary = ", ".join([f"{m.name} ({m.dosage})" for m in pres_data.medicines])
    await medical_records_col.insert_one({
        "_id": str(uuid.uuid4()),
        "patient_id": app["patient_id"],
        "doctor_name": doc_profile["name"],
        "date": datetime.now(timezone.utc),
        "notes": pres_data.notes,
        "prescriptions": medicines_summary
    })

    # Update patient medical_history if registered
    if not app["is_guest"]:
        history_entry = (
            f"Date: {datetime.now().strftime('%Y-%m-%d')} | "
            f"Doctor: {doc_profile['name']} | "
            f"Notes: {pres_data.notes} | "
            f"Medicines: {medicines_summary}"
        )
        await patients_collection.update_one(
            {"user_id": app["patient_id"]},
            {"$push": {"medical_history": history_entry}}
        )
    else:
        await guest_accounts_collection.update_one(
            {"_id": app["patient_id"]},
            {"$set": {"status": "ARCHIVED"}}
        )

    # Notify patient
    await _create_notification(
        app["patient_id"],
        "Consultation Completed",
        f"Your consultation is complete. Prescription issued by {doc_profile['name']}.",
        "success"
    )

    return {
        "message": "Prescription added and appointment completed successfully",
        "prescription_id": pres_id
    }
