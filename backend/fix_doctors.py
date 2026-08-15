import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def update_doctors():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client.get_default_database()
    if db is None:
        db = client["hospital_db"]
    result = await db.doctors.update_many({}, {"$set": {"status": "AVAILABLE"}})
    print(f"Updated {result.modified_count} doctors to AVAILABLE status.")

if __name__ == "__main__":
    asyncio.run(update_doctors())
