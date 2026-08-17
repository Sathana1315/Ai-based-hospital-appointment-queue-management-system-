from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from app.database import (
    doctors_collection, users_collection,
    hospitals_collection, doctor_attendance_collection, prescriptions_collection, db
)
from app.models.hospital import DoctorCreate, DoctorResponse, DoctorStatusUpdate
from app.auth import get_current_user, require_role, get_password_hash
from app.ws_manager import manager

med_records_col = db["medical_records"]

router = APIRouter(prefix="/doctors", tags=["Doctors"])

@router.get("/me")
async def get_my_doctor_profile(current_user=Depends(require_role(["doctor"]))):
    """Returns the doctor profile for the currently logged-in doctor user."""
    doc = await doctors_collection.find_one({"user_id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found for this user")

    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)

    h = await hospitals_collection.find_one({"_id": doc.get("hospital_id")})
    doc["hospital_name"] = h["name"] if h else "Unknown Hospital"
    return doc

@router.get("", response_model=List[DoctorResponse])
async def get_doctors(
    hospital_id: Optional[str] = None,
    department: Optional[str] = None
):
    query = {}
    if hospital_id:
        query["hospital_id"] = hospital_id
    if department:
        query["department"] = {"$regex": f"^{department}$", "$options": "i"}

    doctors = []
    async for doc in doctors_collection.find(query):
        doc["id"] = str(doc["_id"])
        doc.pop("_id", None)

        h_id = doc.get("hospital_id")
        h = await hospitals_collection.find_one({"_id": h_id})
        doc["hospital_name"] = h["name"] if h else "Unknown Hospital"
        doctors.append(doc)
    return doctors

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_doctor(
    doc_data: DoctorCreate,
    current_user=Depends(require_role(["admin", "receptionist"]))
):
    hospital = await hospitals_collection.find_one({"_id": doc_data.hospital_id})
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    existing_user = await users_collection.find_one({
        "$or": [
            {"username": doc_data.username},
            {"email": doc_data.email}
        ]
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(doc_data.password)

    await users_collection.insert_one({
        "_id": user_id,
        "username": doc_data.username,
        "email": doc_data.email,
        "hashed_password": hashed_password,
        "role": "doctor",
        "created_at": datetime.now(timezone.utc)
    })

    doc_id = str(uuid.uuid4())
    doc_dict = doc_data.model_dump(exclude={"username", "email", "password"})
    doc_dict["_id"] = doc_id
    doc_dict["user_id"] = user_id
    doc_dict["status"] = "OFFLINE"

    await doctors_collection.insert_one(doc_dict)

    return {"message": "Doctor profile created successfully", "doctor_id": doc_id}

@router.put("/status")
async def update_doctor_status(
    status_update: DoctorStatusUpdate,
    doctor_id: Optional[str] = None,
    current_user=Depends(require_role(["doctor", "receptionist", "admin"]))
):
    resolved_doc_id = doctor_id

    if current_user["role"] == "doctor":
        doc_profile = await doctors_collection.find_one({"user_id": current_user["id"]})
        if not doc_profile:
            raise HTTPException(status_code=404, detail="Doctor profile not found for this user")
        resolved_doc_id = str(doc_profile["_id"])
    elif not resolved_doc_id:
        raise HTTPException(status_code=400, detail="doctor_id parameter is required for staff updates")

    doc = await doctors_collection.find_one({"_id": resolved_doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    new_status = status_update.status
    await doctors_collection.update_one(
        {"_id": resolved_doc_id},
        {"$set": {"status": new_status}}
    )

    await doctor_attendance_collection.insert_one({
        "_id": str(uuid.uuid4()),
        "doctor_id": resolved_doc_id,
        "status": new_status,
        "timestamp": datetime.now(timezone.utc)
    })

    # Broadcast update
    await manager.broadcast({
        "type": "DOCTOR_STATUS_UPDATE",
        "doctor_id": resolved_doc_id,
        "status": new_status
    })

    return {"message": "Doctor status updated and logged successfully", "status": new_status}

@router.get("/attendance/{doctor_id}")
async def get_doctor_attendance(
    doctor_id: str,
    current_user=Depends(require_role(["admin", "receptionist", "doctor"]))
):
    if current_user["role"] == "doctor":
        doc_profile = await doctors_collection.find_one({"user_id": current_user["id"]})
        if not doc_profile or str(doc_profile["_id"]) != doctor_id:
            raise HTTPException(status_code=403, detail="Doctors can only view their own attendance history")

    logs = []
    async for log in doctor_attendance_collection.find({"doctor_id": doctor_id}).sort("timestamp", -1):
        log["id"] = str(log["_id"])
        log.pop("_id", None)
        logs.append(log)
    return logs

@router.get("/history")
async def get_doctor_history(current_user=Depends(require_role(["doctor"]))):
    doc_profile = await doctors_collection.find_one({"user_id": current_user["id"]})
    if not doc_profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
        
    from app.database import patients_collection, users_collection
    hosp = await hospitals_collection.find_one({"_id": doc_profile.get("hospital_id")})

    records = []
    # match by doctor_id in prescriptions_collection
    async for record in prescriptions_collection.find({"doctor_id": str(doc_profile["_id"])}).sort("created_at", -1):
        record["id"] = str(record["_id"])
        record.pop("_id", None)

        record["doctor_name"] = doc_profile.get("name", "Specialist Doctor")
        record["doctor_specialization"] = doc_profile.get("department", "Specialist")
        record["doctor_qualification"] = doc_profile.get("qualification", "MBBS, MD")
        record["doctor_registration_no"] = f"TNMC-{str(doc_profile.get('_id', '98765'))[-6:].upper()}"
        
        if hosp:
            record["hospital_name"] = hosp.get("name", "Q-Med General Hospital")
            record["hospital_address"] = hosp.get("address", "100 Medical Plaza, Central District")
            record["hospital_phone"] = hosp.get("phone", "+91 98765 43210")
        else:
            record["hospital_name"] = "Q-Med General Hospital"
            record["hospital_address"] = "123 Health Ave, Medical District, Central City - 600001"
            record["hospital_phone"] = "+91 98765 43210"

        # Patient info
        pat = await patients_collection.find_one({"user_id": record.get("patient_id")})
        pat_user = await users_collection.find_one({"_id": record.get("patient_id")})
        record["patient_name"] = (pat and pat.get("name")) or (pat_user and pat_user.get("username")) or f"Patient #{str(record.get('patient_id', ''))[-6:].upper()}"
        record["patient_age"] = (pat and pat.get("age")) or 30
        record["patient_gender"] = (pat and pat.get("gender")) or "Male"
        record["patient_phone"] = (pat and pat.get("phone")) or "+91 98765 43210"

        if "medicines" in record and isinstance(record["medicines"], list):
            record["prescriptions"] = ", ".join(f"{m.get('name','')} {m.get('dosage','')}".strip() for m in record["medicines"])
        elif "prescriptions" in record and not record.get("medicines"):
            parsed_meds = []
            for item in record["prescriptions"].split(","):
                item_clean = item.strip()
                if item_clean:
                    parsed_meds.append({
                        "name": item_clean,
                        "dosage": "1 tablet",
                        "frequency": "Once daily",
                        "duration": "5 days",
                        "instructions": "After food"
                    })
            record["medicines"] = parsed_meds

        records.append(record)
    return records

@router.get("/analytics")
async def get_doctor_analytics(current_user=Depends(require_role(["doctor"]))):
    doc_profile = await doctors_collection.find_one({"user_id": current_user["id"]})
    if not doc_profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
        
    # Dummy analytics for doctor workload/common diseases. 
    # In a real app we'd aggregate over med_records.
    # We will do a basic aggregation if possible, or return static stats.
    pipeline = [
        {"$match": {"doctor_id": str(doc_profile["_id"])}},
        {"$group": {"_id": "$notes", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    common_notes = []
    async for row in prescriptions_collection.aggregate(pipeline):
        if row["_id"]:
            common_notes.append({"disease": row["_id"][:30] + "..." if len(row["_id"])>30 else row["_id"], "count": row["count"]})
            
    total = await prescriptions_collection.count_documents({"doctor_id": str(doc_profile["_id"])})
    
    return {
        "total_consultations": total,
        "average_consultation_time": 15, # static 15 min for now
        "common_diseases": common_notes
    }
