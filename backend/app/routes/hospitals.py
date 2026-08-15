from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
from app.database import hospitals_collection, patients_collection, guest_accounts_collection, doctors_collection
from app.models.hospital import HospitalCreate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])

@router.get("")
async def get_hospitals(
    district: Optional[str] = None,
    specialty: Optional[str] = None
):
    query = {}
    if district:
        query["district"] = {"$regex": f"^{district}$", "$options": "i"} # case insensitive match
    if specialty:
        query["departments"] = {"$regex": f"^{specialty}$", "$options": "i"}
        
    hospitals = []
    async for h in hospitals_collection.find(query).sort("rating", -1):
        h["id"] = str(h["_id"])
        h.pop("_id", None)
        hospitals.append(h)
    return hospitals

@router.post("", response_model=dict)
async def create_hospital(
    hospital: HospitalCreate,
    current_user = Depends(require_role(["admin", "receptionist"]))
):
    existing = await hospitals_collection.find_one({"name": hospital.name, "district": hospital.district})
    if existing:
        raise HTTPException(status_code=400, detail="Hospital already exists in this district")
        
    hospital_id = str(uuid.uuid4())
    new_hospital = hospital.model_dump()
    new_hospital["_id"] = hospital_id
    await hospitals_collection.insert_one(new_hospital)
    return {"message": "Hospital created successfully", "hospital_id": hospital_id}

@router.get("/recommend")
async def recommend_hospitals(
    specialty: str,
    district: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    # 1. Resolve patient's district if not provided
    resolved_district = district
    if not resolved_district:
        role = current_user["role"]
        user_id = current_user["id"]
        if role == "guest":
            guest = await guest_accounts_collection.find_one({"_id": user_id})
            resolved_district = guest.get("district") if guest else None
        else:
            patient = await patients_collection.find_one({"user_id": user_id})
            resolved_district = patient.get("district") if patient else None
            
    if not resolved_district:
        raise HTTPException(
            status_code=400, 
            detail="District could not be resolved. Please provide a district parameter or update your profile."
        )

    query = {
        "district": {"$regex": f"^{resolved_district}$", "$options": "i"},
        "departments": {"$regex": f"^{specialty}$", "$options": "i"}
    }
    
    hospitals = []
    async for h in hospitals_collection.find(query).sort("rating", -1):
        h_id = str(h["_id"])
        h["id"] = h_id
        h.pop("_id", None)
        
        # 3. Embed doctors available in this hospital under the requested specialty
        doctors = []
        async for doc in doctors_collection.find({"hospital_id": h_id, "department": {"$regex": f"^{specialty}$", "$options": "i"}}):
            doc["id"] = str(doc["_id"])
            doc.pop("_id", None)
            doc.pop("hashed_password", None)
            doctors.append(doc)
            
        h["doctors"] = doctors
        hospitals.append(h)
        
    return {
        "specialty": specialty,
        "district": resolved_district,
        "hospitals": hospitals
    }
