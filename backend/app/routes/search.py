from fastapi import APIRouter, Depends
from app.database import (
    hospitals_collection, doctors_collection,
    patients_collection, appointments_collection
)
from app.auth import get_current_user

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/")
async def global_search(q: str = "", current_user = Depends(get_current_user)):
    if not q or len(q) < 2:
        return {"hospitals": [], "doctors": [], "patients": []}
        
    regex = {"$regex": q, "$options": "i"}
    
    # 1. Search Hospitals
    hospitals = []
    async for h in hospitals_collection.find({"name": regex}).limit(5):
        h["id"] = str(h["_id"])
        h.pop("_id", None)
        hospitals.append(h)
        
    # 2. Search Doctors
    doctors = []
    async for d in doctors_collection.find({"$or": [{"name": regex}, {"department": regex}]}).limit(5):
        d["id"] = str(d["_id"])
        d.pop("_id", None)
        h_id = d.get("hospital_id")
        h = await hospitals_collection.find_one({"_id": h_id})
        d["hospital_name"] = h["name"] if h else ""
        doctors.append(d)
        
    # 3. Search Patients (only for admin/receptionist/doctor)
    patients = []
    role = current_user.get("role")
    if role in ["admin", "receptionist", "doctor"]:
        async for p in patients_collection.find({"name": regex}).limit(5):
            p["id"] = str(p["_id"])
            p.pop("_id", None)
            patients.append(p)
            
    return {
        "hospitals": hospitals,
        "doctors": doctors,
        "patients": patients
    }
