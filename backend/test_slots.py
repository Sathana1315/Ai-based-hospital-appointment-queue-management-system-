import asyncio
from datetime import datetime, timezone
import motor.motor_asyncio
from app.config import settings

async def test_slots():
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    db = client.get_default_database() if client.get_default_database() is not None else client['hospital_db']
    
    doctor_id = "doc-dr_wilson_west"
    doctor = await db.doctors.find_one({"_id": doctor_id})
    print("Doctor:", doctor)
    
    from app.routes.ai import _get_available_slots
    slots = await _get_available_slots(doctor_id, "2026-07-23")
    print("Slots for tomorrow:", slots)

if __name__ == "__main__":
    asyncio.run(test_slots())
