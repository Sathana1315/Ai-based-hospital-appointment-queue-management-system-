from fastapi import APIRouter, Depends, HTTPException, status
from app.database import patients_collection, guest_accounts_collection
from app.models.user import PatientProfileUpdate
from app.auth import get_current_user
from app.database import db
from pydantic import BaseModel

router = APIRouter(prefix="/patients", tags=["Patients"])

from app.database import db, prescriptions_collection
favorites_col = db["favorites"]

@router.get("/profile")
async def get_patient_profile(current_user = Depends(get_current_user)):
    role = current_user["role"]
    user_id = current_user["id"]
    
    if role == "guest":
        guest = await guest_accounts_collection.find_one({"_id": user_id})
        if not guest:
            raise HTTPException(status_code=404, detail="Guest session not found")
        return {
            "id": user_id,
            "role": "guest",
            "name": f"Guest ({user_id})",
            "district": guest.get("district", ""),
            "age": None,
            "gender": None,
            "phone": "",
            "medical_history": []
        }
        
    patient = await patients_collection.find_one({"user_id": user_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    # Cast MongoDB ObjectId or string id
    patient["id"] = str(patient["_id"])
    patient.pop("_id", None)
    return patient

@router.put("/profile")
async def update_patient_profile(profile_data: PatientProfileUpdate, current_user = Depends(get_current_user)):
    role = current_user["role"]
    user_id = current_user["id"]
    
    if role == "guest":
        # Guest can update their district
        if profile_data.district is not None:
            await guest_accounts_collection.update_one(
                {"_id": user_id},
                {"$set": {"district": profile_data.district}}
            )
            return {"message": "Guest district updated successfully"}
        raise HTTPException(status_code=400, detail="Guests can only update their district")
        
    patient = await patients_collection.find_one({"user_id": user_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
        
    update_fields = {}
    if profile_data.name is not None: update_fields["name"] = profile_data.name
    if profile_data.phone is not None: update_fields["phone"] = profile_data.phone
    if profile_data.district is not None: update_fields["district"] = profile_data.district
    if profile_data.age is not None: update_fields["age"] = profile_data.age
    if profile_data.gender is not None: update_fields["gender"] = profile_data.gender
    if profile_data.medical_history is not None: update_fields["medical_history"] = profile_data.medical_history
    
    if update_fields:
        await patients_collection.update_one(
            {"user_id": user_id},
            {"$set": update_fields}
        )
        
    return {"message": "Profile updated successfully"}

@router.get("/history")
async def get_patient_history(current_user = Depends(get_current_user)):
    user_id = current_user["id"]
    
    records = []
    # Appointments and prescriptions are linked to the user's account ID (user_id)
    async for record in prescriptions_collection.find({"patient_id": user_id}):
        record["id"] = str(record["_id"])
        record.pop("_id", None)
        
        # Format medicines list to string for the frontend if needed
        if "medicines" in record and isinstance(record["medicines"], list):
            record["prescriptions"] = ", ".join(f"{m['name']} {m['dosage']}" for m in record["medicines"])
            
        records.append(record)
        
    return records

class FavoriteRequest(BaseModel):
    item_id: str
    type: str # "doctor" or "hospital"
    action: str # "add" or "remove"

@router.get("/favorites")
async def get_favorites(current_user = Depends(get_current_user)):
    user_id = current_user["id"]
    fav_doc = await favorites_col.find_one({"user_id": user_id})
    if not fav_doc:
        return {"doctors": [], "hospitals": []}
    return {
        "doctors": fav_doc.get("doctors", []),
        "hospitals": fav_doc.get("hospitals", [])
    }

@router.post("/favorites")
async def toggle_favorite(req: FavoriteRequest, current_user = Depends(get_current_user)):
    user_id = current_user["id"]
    fav_doc = await favorites_col.find_one({"user_id": user_id})
    if not fav_doc:
        fav_doc = {"user_id": user_id, "doctors": [], "hospitals": []}
        await favorites_col.insert_one(fav_doc)
        
    field = "doctors" if req.type == "doctor" else "hospitals"
    items = fav_doc.get(field, [])
    
    if req.action == "add" and req.item_id not in items:
        items.append(req.item_id)
    elif req.action == "remove" and req.item_id in items:
        items.remove(req.item_id)
        
    await favorites_col.update_one({"user_id": user_id}, {"$set": {field: items}})
    return {"message": "Favorites updated"}
