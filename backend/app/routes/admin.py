from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from app.database import (
    hospitals_collection, doctors_collection,
    patients_collection, appointments_collection,
    appointment_requests_collection, users_collection
)
from app.auth import require_role

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/stats")
async def get_admin_stats(current_user=Depends(require_role(["admin", "receptionist"]))):
    """Dashboard statistics for admin."""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    hospitals_count = await hospitals_collection.count_documents({})
    doctors_count = await doctors_collection.count_documents({})
    patients_count = await patients_collection.count_documents({})
    available_doctors = await doctors_collection.count_documents({"status": "AVAILABLE"})
    busy_doctors = await doctors_collection.count_documents({"status": "BUSY"})
    offline_doctors = await doctors_collection.count_documents({"status": "OFFLINE"})
    
    appointments_today = await appointments_collection.count_documents({
        "slot": {"$gte": today, "$lt": tomorrow}
    })
    pending_requests = await appointment_requests_collection.count_documents({"status": "PENDING"})
    total_appointments = await appointments_collection.count_documents({})
    completed_today = await appointments_collection.count_documents({
        "status": "COMPLETED",
        "slot": {"$gte": today, "$lt": tomorrow}
    })

    return {
        "hospitals": hospitals_count,
        "doctors": doctors_count,
        "patients": patients_count,
        "appointments_today": appointments_today,
        "completed_today": completed_today,
        "pending_requests": pending_requests,
        "total_appointments": total_appointments,
        "doctor_status": {
            "available": available_doctors,
            "busy": busy_doctors,
            "offline": offline_doctors
        }
    }

@router.get("/patients")
async def list_all_patients(current_user=Depends(require_role(["admin", "receptionist"]))):
    """List all registered patients."""
    patients = []
    async for p in patients_collection.find({}).sort("name", 1):
        p["id"] = str(p["_id"])
        p.pop("_id", None)
        patients.append(p)
    return patients

@router.get("/appointments/all")
async def list_all_appointments(current_user=Depends(require_role(["admin"]))):
    """Full appointment list for admin review."""
    appointments = []
    async for app in appointments_collection.find({}).sort("slot", -1).limit(200):
        app["id"] = str(app["_id"])
        app.pop("_id", None)

        doc = await doctors_collection.find_one({"_id": app["doctor_id"]})
        app["doctor_name"] = doc["name"] if doc else "Unknown"
        appointments.append(app)
    return appointments

@router.get("/analytics")
async def get_admin_analytics(
    start_date: str = None, 
    end_date: str = None, 
    current_user=Depends(require_role(["admin"]))
):
    """Detailed analytics data for Admin Dashboard charts."""
    # Dummy data generation for charts since real historical data might be sparse
    import random
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    daily_appointments = [{"name": day, "appointments": random.randint(20, 100)} for day in days]
    
    departments = ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Dermatology", "General"]
    department_popularity = [{"name": dept, "value": random.randint(10, 50)} for dept in departments]
    
    # Generate doctor workload
    doctors_count = await doctors_collection.count_documents({})
    doctors = []
    async for d in doctors_collection.find().limit(5):
        doctors.append({"name": d["name"], "patients": random.randint(5, 25)})
        
    if not doctors:
        doctors = [{"name": f"Dr. {i}", "patients": random.randint(5, 25)} for i in range(5)]
        
    revenue = [{"name": day, "revenue": random.randint(1000, 5000)} for day in days]
    
    return {
        "daily_appointments": daily_appointments,
        "department_popularity": department_popularity,
        "doctor_workload": doctors,
        "revenue": revenue
    }


# ──────────────────────────────────────────────────
# DEMO SIMULATION CONTROLS
# ──────────────────────────────────────────────────

@router.get("/demo/status")
async def get_demo_status(current_user=Depends(require_role(["admin", "receptionist"]))):
    """Get the current status of the background demo simulation."""
    from app.demo_simulation import simulation_engine
    return simulation_engine.get_status()


@router.post("/demo/start")
async def start_demo_simulation(current_user=Depends(require_role(["admin"]))):
    """Start the background hospital demo simulation engine."""
    from app.demo_simulation import simulation_engine
    await simulation_engine.start()
    return {"message": "Demo simulation started", "status": simulation_engine.get_status()}


@router.post("/demo/stop")
async def stop_demo_simulation(current_user=Depends(require_role(["admin"]))):
    """Stop the background hospital demo simulation engine."""
    from app.demo_simulation import simulation_engine
    await simulation_engine.stop()
    return {"message": "Demo simulation stopped", "status": simulation_engine.get_status()}


@router.post("/demo/reset")
async def reset_demo_simulation(current_user=Depends(require_role(["admin"]))):
    """Safely reset and re-seed only simulated records without touching real data."""
    from app.demo_simulation import simulation_engine
    await simulation_engine.reset()
    return {"message": "Demo simulation data reset successfully", "status": simulation_engine.get_status()}

