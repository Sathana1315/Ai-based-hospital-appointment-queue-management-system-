import asyncio
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.auth import get_password_hash

async def seed_database():
    print("Connecting to MongoDB Atlas...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client.get_default_database()
    if db is None:
        db = client["hospital_db"]

    hospitals_col = db["hospitals"]
    doctors_col   = db["doctors"]
    users_col     = db["users"]
    patients_col  = db["patients"]
    queues_col    = db["queues"]
    appts_col     = db["appointments"]
    requests_col  = db["appointment_requests"]
    attendance_col= db["doctor_attendance"]

    print("Cleaning existing seed data...")
    await hospitals_col.delete_many({})
    await doctors_col.delete_many({})
    await users_col.delete_many({"role": {"$in": ["doctor", "receptionist", "admin"]}})
    await queues_col.delete_many({})
    await appts_col.delete_many({})
    await requests_col.delete_many({})
    await attendance_col.delete_many({})

    # ── Admin user ────────────────────────────────
    admin_id = str(uuid.uuid4())
    await users_col.insert_one({
        "_id": admin_id,
        "username": "admin",
        "email": "admin@hospital.com",
        "hashed_password": get_password_hash("admin123"),
        "role": "admin"
    })
    print("Admin: admin / admin123")

    # ── Receptionist user ─────────────────────────
    rec_id = str(uuid.uuid4())
    await users_col.insert_one({
        "_id": rec_id,
        "username": "receptionist",
        "email": "receptionist@hospital.com",
        "hashed_password": get_password_hash("staff123"),
        "role": "receptionist"
    })
    print("Receptionist: receptionist / staff123")

    # ── Hospitals ─────────────────────────────────
    hospitals = [
        {
            "_id": "hosp-central-gen",
            "name": "City Central General Hospital",
            "district": "Central",
            "rating": 4.8,
            "departments": ["General Medicine", "Pediatrics", "Cardiology", "Neurology"],
            "address": "100 Medical Plaza, Central City",
            "image_url": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400",
            "logo_url": "https://via.placeholder.com/150",
            "banner_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200",
            "gallery_urls": ["https://images.unsplash.com/photo-1551076805-e1869033e561?w=400"],
            "description": "City Central General Hospital is a state-of-the-art facility providing comprehensive medical care.",
            "gps_coordinates": {"lat": 40.7128, "lng": -74.0060},
            "email": "info@citycentral.com",
            "website": "https://citycentral.com",
            "working_hours": "24/7",
            "facilities": ["Emergency", "ICU", "Pharmacy", "Laboratory"],
            "emergency_support": True
        },
        {
            "_id": "hosp-metro-heart",
            "name": "Metro Heart Institute",
            "district": "Central",
            "rating": 4.9,
            "departments": ["Cardiology", "Neurology"],
            "address": "45 Cardiovascular Ave, Central City",
            "image_url": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400"
        },
        {
            "_id": "hosp-north-kids",
            "name": "North District Pediatric Center",
            "district": "North",
            "rating": 4.5,
            "departments": ["Pediatrics", "General Medicine"],
            "address": "12 Toyland Rd, North District",
            "image_url": "https://images.unsplash.com/photo-1631815588090-d1bcbe9b4b38?w=400"
        },
        {
            "_id": "hosp-south-ortho",
            "name": "South Orthopedics & Joint Clinic",
            "district": "South",
            "rating": 4.7,
            "departments": ["Orthopedics"],
            "address": "88 Spine Boulevard, South District",
            "image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400"
        },
        {
            "_id": "hosp-east-skin",
            "name": "East Coast Skin & Dermatology Clinic",
            "district": "East",
            "rating": 4.6,
            "departments": ["Dermatology", "General Medicine"],
            "address": "77 Sunscreen Street, East District",
            "image_url": "https://images.unsplash.com/photo-1504813184591-01572f98c85f?w=400"
        }
    ]

    # ── Doctors ───────────────────────────────────
    doctor_data = [
        {
            "username": "dr_smith",
            "name": "Dr. Sarah Smith",
            "hospital_id": "hosp-central-gen",
            "department": "Cardiology",
            "qualification": "MBBS, MD (Cardiology)",
            "experience": 12,
            "rating": 4.9,
            "password": "doctor123",
            "email": "dr.smith@hospital.com"
        },
        {
            "username": "dr_davis",
            "name": "Dr. Emily Davis",
            "hospital_id": "hosp-central-gen",
            "department": "Pediatrics",
            "qualification": "MBBS, DCH",
            "experience": 8,
            "rating": 4.7,
            "password": "doctor123",
            "email": "dr.davis@hospital.com"
        },
        {
            "username": "dr_miller",
            "name": "Dr. Michael Miller",
            "hospital_id": "hosp-central-gen",
            "department": "General Medicine",
            "qualification": "MBBS, MD",
            "experience": 15,
            "rating": 4.6,
            "password": "doctor123",
            "email": "dr.miller@hospital.com"
        },
        {
            "username": "dr_patel",
            "name": "Dr. Raj Patel",
            "hospital_id": "hosp-metro-heart",
            "department": "Cardiology",
            "qualification": "MBBS, DM (Cardiology)",
            "experience": 20,
            "rating": 5.0,
            "password": "doctor123",
            "email": "dr.patel@hospital.com"
        },
        {
            "username": "dr_wilson",
            "name": "Dr. Robert Wilson",
            "hospital_id": "hosp-metro-heart",
            "department": "Neurology",
            "qualification": "MBBS, DM (Neurology)",
            "experience": 18,
            "rating": 4.8,
            "password": "doctor123",
            "email": "dr.wilson@hospital.com"
        },
        {
            "username": "dr_johnson",
            "name": "Dr. Jessica Johnson",
            "hospital_id": "hosp-north-kids",
            "department": "Pediatrics",
            "qualification": "MBBS, MD (Pediatrics)",
            "experience": 10,
            "rating": 4.8,
            "password": "doctor123",
            "email": "dr.johnson@hospital.com"
        },
        {
            "username": "dr_brown",
            "name": "Dr. David Brown",
            "hospital_id": "hosp-south-ortho",
            "department": "Orthopedics",
            "qualification": "MBBS, MS (Ortho)",
            "experience": 14,
            "rating": 4.7,
            "password": "doctor123",
            "email": "dr.brown@hospital.com"
        },
        {
            "username": "dr_taylor",
            "name": "Dr. Sophia Taylor",
            "hospital_id": "hosp-east-skin",
            "department": "Dermatology",
            "qualification": "MBBS, DVD",
            "experience": 9,
            "rating": 4.5,
            "password": "doctor123",
            "email": "dr.taylor@hospital.com"
        },
        {
            "username": "dr_clark",
            "name": "Dr. Richard Clark",
            "hospital_id": "hosp-central-gen",
            "department": "Neurology",
            "qualification": "MBBS, DM (Neurology)",
            "experience": 11,
            "rating": 4.9,
            "password": "doctor123",
            "email": "dr.clark@hospital.com"
        },
        {
            "username": "dr_white",
            "name": "Dr. Nancy White",
            "hospital_id": "hosp-north-kids",
            "department": "General Medicine",
            "qualification": "MBBS, MD",
            "experience": 16,
            "rating": 4.6,
            "password": "doctor123",
            "email": "dr.white@hospital.com"
        },
        {
            "username": "dr_martin",
            "name": "Dr. George Martin",
            "hospital_id": "hosp-east-skin",
            "department": "General Medicine",
            "qualification": "MBBS, MD",
            "experience": 22,
            "rating": 4.8,
            "password": "doctor123",
            "email": "dr.martin@hospital.com"
        },
        {
            "username": "dr_moore",
            "name": "Dr. Alice Moore",
            "hospital_id": "hosp-central-gen",
            "department": "General Medicine",
            "qualification": "MBBS, MD",
            "experience": 5,
            "rating": 4.4,
            "password": "doctor123",
            "email": "dr.moore@hospital.com"
        }
    ]

    districts = ["Central", "North", "South", "East", "West"]
    expanded_hospitals = []
    expanded_doctors = []
    
    for d in districts:
        for h in hospitals:
            h_copy = h.copy()
            h_copy["_id"] = f"{h['_id']}-{d.lower()}"
            h_copy["name"] = f"{h['name']} ({d})"
            h_copy["district"] = d
            expanded_hospitals.append(h_copy)
            
        for doc in doctor_data:
            doc_copy = doc.copy()
            doc_copy["username"] = f"{doc['username']}_{d.lower()}"
            doc_copy["hospital_id"] = f"{doc['hospital_id']}-{d.lower()}"
            doc_copy["email"] = f"{doc['username']}_{d.lower()}@hospital.com"
            expanded_doctors.append(doc_copy)

    await hospitals_col.insert_many(expanded_hospitals)
    print(f"Seeded {len(expanded_hospitals)} hospitals.")

    for doc in expanded_doctors:
        doc_id = str(uuid.uuid4())
        await users_col.insert_one({
            "_id": doc_id,
            "username": doc["username"],
            "email": doc["email"],
            "hashed_password": get_password_hash(doc["password"]),
            "role": "doctor"
        })
        
        await doctors_col.insert_one({
            "_id": f"doc-{doc['username']}",
            "user_id": doc_id,
            "hospital_id": doc["hospital_id"],
            "name": doc["name"],
            "department": doc["department"],
            "qualification": doc.get("qualification", ""),
            "experience": doc.get("experience", 0),
            "rating": doc.get("rating", 0.0),
            "photo_url": None,
            "status": "OFFLINE",
            "languages": ["English", "Spanish"],
            "consultation_fee": 150.0,
            "biography": f"Experienced specialist in {doc['department']}.",
            "education": ["Harvard Medical School"],
            "certificates": ["Board Certified"],
            "weekly_schedule": {"Monday": "09:00-17:00", "Tuesday": "09:00-17:00", "Wednesday": "09:00-17:00", "Thursday": "09:00-17:00", "Friday": "09:00-17:00"}
        })
        print(f"  Doctor: {doc['username']} / doctor123  [{doc['department']}]")

    print(f"\nSeeded {len(doctor_data)} doctors.")
    print("\nAll credentials:")
    print("  admin / admin123")
    print("  receptionist / staff123")
    print("  dr_smith / doctor123  (Cardiology, Central)")
    print("  dr_davis / doctor123  (Pediatrics, Central)")
    print("  dr_miller / doctor123 (General Medicine, Central)")
    print("  dr_patel / doctor123  (Cardiology, Central)")
    print("  dr_wilson / doctor123 (Neurology, Central)")
    print("  dr_johnson / doctor123 (Pediatrics, North)")
    print("  dr_brown / doctor123  (Orthopedics, South)")
    print("  dr_taylor / doctor123 (Dermatology, East)")
    print("\nDatabase seeding completed successfully.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
