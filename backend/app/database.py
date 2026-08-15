import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(settings.MONGODB_URI)
db = client.get_default_database()
if db is None:
    db = client["hospital_queue_db"]

# Collections
users_collection = db["users"]
patients_collection = db["patients"]
guest_accounts_collection = db["guest_accounts"]
hospitals_collection = db["hospitals"]
doctors_collection = db["doctors"]
doctor_attendance_collection = db["doctor_attendance"]
appointment_requests_collection = db["appointment_requests"]
appointments_collection = db["appointments"]
queues_collection = db["queues"]
prescriptions_collection = db["prescriptions"]
chat_history_collection = db["chat_history"]
notifications_collection = db["notifications"]
audit_logs_collection = db["audit_logs"]
admin_settings_collection = db["admin_settings"]
files_collection = db["medical_files"]

async def setup_indexes():
    """Create indexes for performance optimization."""
    try:
        await users_collection.create_index("username", unique=True)
        await users_collection.create_index("email", unique=True)
        await patients_collection.create_index("user_id", unique=True)
        await doctors_collection.create_index("user_id", unique=True)
        await doctors_collection.create_index("hospital_id")
        await appointments_collection.create_index([("doctor_id", 1), ("slot", -1)])
        await appointments_collection.create_index("patient_id")
        await appointment_requests_collection.create_index("doctor_id")
        await queues_collection.create_index("doctor_id", unique=True)
        logger.info("MongoDB indexes verified.")
    except Exception as e:
        logger.error(f"Error setting up indexes: {e}")

async def ping_database():
    try:
        # The ismaster command is cheap and does not require auth.
        await db.command("ismaster")
        logger.info("MongoDB connection successful")
        print("MongoDB connection successful")
        return True
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        print(f"MongoDB connection failed: {e}")
        return False
