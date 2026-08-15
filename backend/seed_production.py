import asyncio
import uuid
import random
import time
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from faker import Faker
from app.config import settings
from app.auth import get_password_hash

fake = Faker('en_IN')

# Configuration
HOSPITALS_COUNT = 50
DOCTORS_COUNT = 400
PATIENTS_COUNT = 800
RECEPTIONISTS_COUNT = 50
ADMINS_COUNT = 10
APPOINTMENTS_COUNT = 5000
QUEUE_ITEMS_COUNT = 3500
PRESCRIPTIONS_COUNT = 3000
NOTIFICATIONS_COUNT = 6000
MEDICAL_HISTORY_COUNT = 3000
FILES_COUNT = 1000

DISTRICTS = ["Central", "North", "South", "East", "West", "Metro", "Airport", "Industrial", "Hill View", "Lake Side", "River Side", "Green Park", "Tech City", "Medical City", "University Zone"]
DEPARTMENTS = ["Cardiology", "Neurology", "Orthopedics", "Dermatology", "Pediatrics", "General Medicine", "ENT", "Psychiatry", "Pulmonology", "Nephrology", "Urology", "Gynecology", "Radiology", "Oncology", "Dentistry", "Emergency", "Physiotherapy", "Gastroenterology", "Endocrinology", "Ophthalmology"]
LANGUAGES = ["English", "Tamil", "Hindi", "Malayalam", "Telugu", "Kannada"]
FEES = [300, 400, 500, 600, 700, 800, 1000, 1200]
EXPERIENCE_YEARS = [1, 3, 5, 7, 10, 15, 20, 25, 30]
RATINGS = [4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9]
FACILITIES = ["Emergency", "ICU", "NICU", "MRI", "CT Scan", "Blood Bank", "Dialysis", "Operation Theatre", "Pharmacy", "Laboratory", "Parking", "Ambulance", "Cafeteria"]
HOSPITAL_PREFIXES = ["Apollo", "City Central", "Metro", "Global Care", "Sunrise", "Lifeline", "Fortis", "Rainbow", "Government", "Care Plus", "Apex", "Nova", "Prime", "Sterling", "Elite", "Pioneer", "Summit", "Crescent", "Trinity", "Lotus", "Zenith"]
HOSPITAL_SUFFIXES = ["Medical Centre", "Hospital", "Heart Institute", "Multispeciality", "Children Hospital", "General Hospital", "Care Clinic", "Healthcare", "Medical College"]

async def seed_production():
    start_time = time.time()
    print("Starting production data generation...")
    
    # Connect to DB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client.get_default_database()
    if db is None:
        db = client["hospital_queue_db"]

    # Clear existing collections
    print("Clearing collections...")
    await asyncio.gather(
        db["users"].delete_many({}),
        db["patients"].delete_many({}),
        db["hospitals"].delete_many({}),
        db["doctors"].delete_many({}),
        db["appointments"].delete_many({}),
        db["queues"].delete_many({}),
        db["prescriptions"].delete_many({}),
        db["notifications"].delete_many({}),
        db["medical_records"].delete_many({}),
        db["medical_files"].delete_many({})
    )
    
    # Pre-hash password for performance
    print("Hashing default password...")
    default_password = get_password_hash("password123")
    
    users_data = []
    hospitals_data = []
    doctors_data = []
    patients_data = []
    
    print("Generating Admins and Receptionists...")
    # Generate Admins
    for i in range(ADMINS_COUNT):
        users_data.append({
            "_id": str(uuid.uuid4()),
            "username": f"admin{i+1}",
            "email": f"admin{i+1}@hospital.com",
            "hashed_password": default_password,
            "role": "admin"
        })
    
    # Generate Receptionists
    for i in range(RECEPTIONISTS_COUNT):
        users_data.append({
            "_id": str(uuid.uuid4()),
            "username": f"receptionist{i+1}",
            "email": f"receptionist{i+1}@hospital.com",
            "hashed_password": default_password,
            "role": "receptionist"
        })
        
    print("Generating Hospitals...")
    # Add Fixed Demo Hospital
    demo_hospital_id = str(uuid.uuid4())
    hospitals_data.append({
        "_id": demo_hospital_id,
        "name": "City Central Hospital",
        "description": "City Central Hospital is a premier medical institute providing top-tier care.",
        "district": "Central",
        "address": "100 Main Street, Central District",
        "phone": "+91 9876543210",
        "email": "contact@citycentral.com",
        "website": "https://citycentral.com",
        "rating": 4.9,
        "review_count": 5000,
        "working_hours": "24/7",
        "emergency_support": True,
        "gps_coordinates": {"lat": 28.6139, "lng": 77.2090},
        "logo_url": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=150",
        "banner_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200",
        "gallery_urls": ["https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400"],
        "departments": DEPARTMENTS[:10],
        "facilities": FACILITIES
    })
    
    # Generate Remaining Hospitals
    for _ in range(HOSPITALS_COUNT - 1):
        name = f"{random.choice(HOSPITAL_PREFIXES)} {random.choice(HOSPITAL_SUFFIXES)}"
        hospitals_data.append({
            "_id": str(uuid.uuid4()),
            "name": name,
            "description": fake.text(max_nb_chars=200),
            "district": random.choice(DISTRICTS),
            "address": fake.address(),
            "phone": fake.phone_number(),
            "email": fake.company_email(),
            "website": fake.url(),
            "rating": random.choice(RATINGS),
            "review_count": random.choice([100, 300, 700, 1500, 2500, 5000]),
            "working_hours": "09:00 - 21:00",
            "emergency_support": random.choice([True, False]),
            "gps_coordinates": {"lat": float(fake.latitude()), "lng": float(fake.longitude())},
            "logo_url": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=150",
            "banner_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200",
            "gallery_urls": ["https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400"],
            "departments": random.sample(DEPARTMENTS, random.randint(3, 15)),
            "facilities": random.sample(FACILITIES, random.randint(4, len(FACILITIES)))
        })
        
    print("Generating Doctors...")
    # Add Fixed Demo Doctor
    demo_doctor_user_id = str(uuid.uuid4())
    demo_doctor_id = str(uuid.uuid4())
    users_data.append({
        "_id": demo_doctor_user_id,
        "username": "dr_sarah",
        "email": "dr.sarah@citycentral.com",
        "hashed_password": default_password,
        "role": "doctor"
    })
    doctors_data.append({
        "_id": demo_doctor_id,
        "user_id": demo_doctor_user_id,
        "name": "Dr. Sarah Smith",
        "gender": "Female",
        "age": 45,
        "hospital_id": demo_hospital_id,
        "department": "Cardiology",
        "qualification": "MBBS, MD (Cardiology)",
        "experience": 15,
        "rating": 4.9,
        "photo_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400",
        "status": "AVAILABLE",
        "languages": ["English", "Hindi"],
        "consultation_fee": 1000,
        "biography": "Expert in interventional cardiology and heart failure.",
        "education": ["AIIMS Delhi"],
        "certificates": ["Board Certified in Cardiology"],
        "weekly_schedule": {"Monday": "09:00-17:00", "Tuesday": "09:00-17:00", "Wednesday": "09:00-17:00", "Thursday": "09:00-17:00", "Friday": "09:00-17:00"}
    })
    
    # Generate Remaining Doctors
    for i in range(DOCTORS_COUNT - 1):
        u_id = str(uuid.uuid4())
        gender = random.choice(["Male", "Female"])
        first_name = fake.first_name_male() if gender == "Male" else fake.first_name_female()
        last_name = fake.last_name()
        d_name = f"Dr. {first_name} {last_name}"
        username = f"dr_{first_name.lower()}_{i}"
        
        users_data.append({
            "_id": u_id,
            "username": username,
            "email": fake.email(),
            "hashed_password": default_password,
            "role": "doctor"
        })
        doctors_data.append({
            "_id": str(uuid.uuid4()),
            "user_id": u_id,
            "name": d_name,
            "gender": gender,
            "age": random.randint(30, 65),
            "hospital_id": random.choice(hospitals_data)["_id"],
            "department": random.choice(DEPARTMENTS),
            "qualification": "MBBS, MD",
            "experience": random.choice(EXPERIENCE_YEARS),
            "rating": random.choice(RATINGS),
            "photo_url": "https://images.unsplash.com/photo-1612349317150-e410f624c4a5?w=400",
            "status": random.choice(["AVAILABLE", "BUSY", "OFFLINE", "ON_LEAVE"]),
            "languages": random.sample(LANGUAGES, random.randint(1, 3)),
            "consultation_fee": random.choice(FEES),
            "biography": fake.paragraph(nb_sentences=3),
            "education": ["Medical University"],
            "certificates": ["Medical Board Certified"],
            "weekly_schedule": {"Monday": "09:00-17:00", "Tuesday": "09:00-17:00", "Wednesday": "09:00-17:00"}
        })
        
    print("Generating Patients...")
    # Add Fixed Demo Patient
    demo_patient_user_id = str(uuid.uuid4())
    demo_patient_id = str(uuid.uuid4())
    users_data.append({
        "_id": demo_patient_user_id,
        "username": "rahul_kumar",
        "email": "rahul.kumar@example.com",
        "hashed_password": default_password,
        "role": "patient"
    })
    patients_data.append({
        "_id": demo_patient_id,
        "user_id": demo_patient_user_id,
        "name": "Rahul Kumar",
        "age": 35,
        "gender": "Male",
        "phone": "+91 9988776655",
        "email": "rahul.kumar@example.com",
        "district": "Central",
        "address": "45 Park Avenue",
        "emergency_contact": "+91 1122334455",
        "medical_notes": "No known allergies.",
        "medical_history": []
    })
    
    # Generate Remaining Patients
    for i in range(PATIENTS_COUNT - 1):
        u_id = str(uuid.uuid4())
        gender = random.choice(["Male", "Female"])
        name = fake.name_male() if gender == "Male" else fake.name_female()
        users_data.append({
            "_id": u_id,
            "username": f"patient_{i}",
            "email": fake.email(),
            "hashed_password": default_password,
            "role": "patient"
        })
        patients_data.append({
            "_id": str(uuid.uuid4()),
            "user_id": u_id,
            "name": name,
            "age": random.randint(18, 80),
            "gender": gender,
            "phone": fake.phone_number(),
            "email": fake.email(),
            "district": random.choice(DISTRICTS),
            "address": fake.address(),
            "emergency_contact": fake.phone_number(),
            "medical_notes": fake.text(max_nb_chars=50),
            "medical_history": []
        })
        
    # Bulk Inserts for base collections
    print("Inserting base data...")
    await db["users"].insert_many(users_data)
    await db["hospitals"].insert_many(hospitals_data)
    await db["doctors"].insert_many(doctors_data)
    await db["patients"].insert_many(patients_data)
    
    print("Generating Appointments, Queues, Prescriptions, Medical Records, Notifications...")
    appts_data = []
    prescriptions_data = []
    medical_records_data = []
    notifications_data = []
    queue_dict = {} # (doctor_id, date) -> list of queue items
    files_data = []
    
    # Pre-calculate counts to reach targets approximately
    # We will generate APPOINTMENTS_COUNT appointments.
    # Out of these, some will be COMPLETED, some PENDING.
    statuses = ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED", "NO_SHOW"]
    
    # 1. Guaranteed Demo Scenario Appointment
    demo_appt_id = str(uuid.uuid4())
    demo_slot = datetime.now(timezone.utc) - timedelta(hours=2)
    appts_data.append({
        "_id": demo_appt_id,
        "patient_id": demo_patient_user_id,
        "patient_name": "Rahul Kumar",
        "doctor_id": demo_doctor_id,
        "hospital_id": demo_hospital_id,
        "slot": demo_slot,
        "status": "COMPLETED",
        "queue_number": "A-001",
        "notes": "Routine checkup for BP.",
        "created_at": demo_slot - timedelta(days=1),
        "is_guest": False
    })
    
    # Demo Prescription
    prescriptions_data.append({
        "_id": str(uuid.uuid4()),
        "appointment_id": demo_appt_id,
        "doctor_id": demo_doctor_id,
        "patient_id": demo_patient_user_id,
        "medicines": [{"name": "Aspirin", "dosage": "75mg", "frequency": "Once daily"}],
        "notes": "Take after meals.",
        "attachment_url": None,
        "created_at": demo_slot + timedelta(minutes=15)
    })
    
    # Demo Medical Record
    medical_records_data.append({
        "_id": str(uuid.uuid4()),
        "patient_id": demo_patient_user_id,
        "doctor_name": "Dr. Sarah Smith",
        "date": demo_slot,
        "notes": "Blood pressure stable.",
        "prescriptions": "Aspirin (75mg)"
    })
    
    # Demo File
    files_data.append({
        "_id": str(uuid.uuid4()),
        "filename": "ECG_Report_Rahul.pdf",
        "filesize": 1024500,
        "type": "application/pdf",
        "uploaded_at": demo_slot - timedelta(days=1),
        "uploaded_by": demo_patient_user_id,
        "path": "/uploads/medical_files/ECG_Report_Rahul.pdf"
    })
    
    # Demo Notification
    notifications_data.append({
        "_id": str(uuid.uuid4()),
        "user_id": demo_patient_user_id,
        "title": "Consultation Completed",
        "message": "Your consultation with Dr. Sarah Smith is complete.",
        "type": "success",
        "read": False,
        "created_at": demo_slot + timedelta(minutes=15)
    })

    # Generate the rest
    for i in range(APPOINTMENTS_COUNT - 1):
        doc = random.choice(doctors_data)
        pat = random.choice(patients_data)
        
        # Distribute across past 90 days to future 30 days
        days_offset = random.randint(-90, 30)
        slot = datetime.now(timezone.utc) + timedelta(days=days_offset, hours=random.randint(9, 17))
        
        status = random.choices(statuses, weights=[10, 10, 5, 65, 5, 5])[0]
        q_num = random.randint(1, 100)
        appt_id = str(uuid.uuid4())
        
        appts_data.append({
            "_id": appt_id,
            "patient_id": pat["user_id"],
            "patient_name": pat["name"],
            "doctor_id": doc["_id"],
            "hospital_id": doc["hospital_id"],
            "slot": slot,
            "status": status,
            "queue_number": q_num,
            "notes": fake.text(max_nb_chars=50),
            "created_at": slot - timedelta(days=random.randint(1, 5)),
            "is_guest": False
        })
        
        # Add to queue if status is approved or pending for today
        if status in ["APPROVED", "SCHEDULED", "SERVING"]:
            q_key = (doc["_id"], slot.strftime("%Y-%m-%d"))
            if q_key not in queue_dict:
                queue_dict[q_key] = []
            queue_dict[q_key].append({
                "appointment_id": appt_id,
                "patient_name": pat["name"],
                "queue_number": q_num,
                "status": "WAITING"
            })
            
        # Create prescription and history if COMPLETED
        if status == "COMPLETED" and len(prescriptions_data) < PRESCRIPTIONS_COUNT:
            prescriptions_data.append({
                "_id": str(uuid.uuid4()),
                "appointment_id": appt_id,
                "doctor_id": doc["_id"],
                "patient_id": pat["user_id"],
                "medicines": [{"name": "Paracetamol", "dosage": "500mg", "frequency": "Twice a day"}],
                "notes": fake.text(max_nb_chars=50),
                "attachment_url": None,
                "created_at": slot + timedelta(minutes=20)
            })
            medical_records_data.append({
                "_id": str(uuid.uuid4()),
                "patient_id": pat["user_id"],
                "doctor_name": doc["name"],
                "date": slot,
                "notes": "General checkup.",
                "prescriptions": "Paracetamol (500mg)"
            })
            
        # Create random notifications
        if len(notifications_data) < NOTIFICATIONS_COUNT:
            notifications_data.append({
                "_id": str(uuid.uuid4()),
                "user_id": pat["user_id"],
                "title": f"Appointment {status}",
                "message": f"Your appointment with {doc['name']} is {status}.",
                "type": "info",
                "read": random.choice([True, False]),
                "created_at": slot - timedelta(days=1)
            })

    # Prepare Queue documents
    queues_data = []
    # If we need 3500 queue records (docs), we generate random queue docs until we hit it, or just insert the ones we grouped.
    # The requirement says "3500 Queue Records", which could mean 3500 active appointments waiting in queues.
    # Let's just create Queue documents for all items we collected.
    for (d_id, q_date), items in list(queue_dict.items())[:QUEUE_ITEMS_COUNT]:
        queues_data.append({
            "_id": str(uuid.uuid4()),
            "doctor_id": d_id,
            "date": q_date,
            "active_appointments": items,
            "current_serving_index": 0
        })

    # Generate extra Queue documents if short of 3500 items (not strictly required if we just treat 'records' as docs, but we'll fulfill the quota roughly)
    while len(queues_data) < 3500:
        d_id = random.choice(doctors_data)["_id"]
        q_date = (datetime.now() + timedelta(days=random.randint(-10, 10))).strftime("%Y-%m-%d")
        queues_data.append({
            "_id": str(uuid.uuid4()),
            "doctor_id": d_id,
            "date": q_date,
            "active_appointments": [],
            "current_serving_index": 0
        })

    # Generate extra notifications if short
    while len(notifications_data) < NOTIFICATIONS_COUNT:
        pat = random.choice(patients_data)
        notifications_data.append({
            "_id": str(uuid.uuid4()),
            "user_id": pat["user_id"],
            "title": "System Notice",
            "message": fake.text(max_nb_chars=40),
            "type": "info",
            "read": True,
            "created_at": datetime.now(timezone.utc)
        })

    # Generate Files
    file_types = ["Blood Report", "MRI Scan", "X-Ray", "Prescription PDF", "CT Scan", "Ultrasound", "ECG", "Lab Report"]
    for i in range(FILES_COUNT - 1): # Account for demo file
        pat = random.choice(patients_data)
        ftype = random.choice(file_types)
        files_data.append({
            "_id": str(uuid.uuid4()),
            "filename": f"{ftype.replace(' ', '_')}_{pat['name'].replace(' ', '_')}.pdf",
            "filesize": random.randint(100000, 5000000),
            "type": "application/pdf",
            "uploaded_at": datetime.now(timezone.utc) - timedelta(days=random.randint(1, 90)),
            "uploaded_by": pat["user_id"],
            "path": f"/uploads/medical_files/{uuid.uuid4()}.pdf"
        })

    # Ensure sizes
    print("Writing bulk data...")
    chunk_size = 1000
    for i in range(0, len(appts_data), chunk_size):
        await db["appointments"].insert_many(appts_data[i:i+chunk_size])
    
    for i in range(0, len(queues_data), chunk_size):
        await db["queues"].insert_many(queues_data[i:i+chunk_size])
        
    for i in range(0, len(prescriptions_data), chunk_size):
        await db["prescriptions"].insert_many(prescriptions_data[i:i+chunk_size])
        
    for i in range(0, len(medical_records_data), chunk_size):
        await db["medical_records"].insert_many(medical_records_data[i:i+chunk_size])
        
    for i in range(0, len(notifications_data), chunk_size):
        await db["notifications"].insert_many(notifications_data[i:i+chunk_size])
        
    for i in range(0, len(files_data), chunk_size):
        await db["medical_files"].insert_many(files_data[i:i+chunk_size])
        
    end_time = time.time()
    
    print("-" * 50)
    print("FINAL OUTPUT")
    print(f"Hospitals Created       : {len(hospitals_data)}")
    print(f"Doctors Created         : {len(doctors_data)}")
    print(f"Patients Created        : {len(patients_data)}")
    print(f"Appointments Created    : {len(appts_data)}")
    print(f"Queues Created          : {len(queues_data)}")
    print(f"Prescriptions Created   : {len(prescriptions_data)}")
    print(f"Notifications Created   : {len(notifications_data)}")
    print(f"Medical History Created : {len(medical_records_data)}")
    print(f"Files Created           : {len(files_data)}")
    print(f"Execution Time          : {end_time - start_time:.2f} seconds")
    print("-" * 50)
    print("Demo Scenario is fully configured:")
    print("Hospital: City Central Hospital")
    print("Doctor: Dr. Sarah Smith (Cardiology)")
    print("Patient: Rahul Kumar")
    print("Status: Completed")
    print("Queue: A-001 (Inside Appointment)")
    print("Prescription: Available")
    print("Medical Report: Attached")
    print("Notifications: Generated")

if __name__ == "__main__":
    asyncio.run(seed_production())
