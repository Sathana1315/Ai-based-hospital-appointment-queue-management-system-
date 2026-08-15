from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth import require_role
from app.database import admin_settings_collection

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    consultation_duration_min: Optional[int] = None
    hospital_working_hours: Optional[str] = None
    emergency_mode: Optional[bool] = None
    max_daily_appointments: Optional[int] = None

@router.get("/")
async def get_settings():
    doc = await admin_settings_collection.find_one({"_id": "global_settings"})
    if not doc:
        # Defaults
        return {
            "consultation_duration_min": 15,
            "hospital_working_hours": "09:00 - 17:00",
            "emergency_mode": False,
            "max_daily_appointments": 100
        }
    doc.pop("_id", None)
    return doc

@router.put("/")
async def update_settings(
    update: SettingsUpdate,
    current_user=Depends(require_role(["admin"]))
):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update_data:
        await admin_settings_collection.update_one(
            {"_id": "global_settings"},
            {"$set": update_data},
            upsert=True
        )
    return {"message": "Settings updated successfully"}
