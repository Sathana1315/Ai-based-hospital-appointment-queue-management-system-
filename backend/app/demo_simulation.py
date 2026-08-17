import asyncio
import logging
import uuid
import random
from datetime import datetime, timezone, timedelta, time
from typing import List, Dict, Optional

from app.config import settings
from app.database import (
    doctors_collection,
    users_collection,
    hospitals_collection,
    queues_collection,
    appointments_collection,
    appointment_requests_collection,
    patients_collection
)
from app.ws_manager import manager

logger = logging.getLogger("qmed_simulation")

SIMULATED_PATIENT_NAMES = [
    {"name": "Arun Kumar", "gender": "Male", "age": 42},
    {"name": "Priya Sharma", "gender": "Female", "age": 29},
    {"name": "Karthik Raj", "gender": "Male", "age": 35},
    {"name": "Meena Devi", "gender": "Female", "age": 51},
    {"name": "Rahul Verma", "gender": "Male", "age": 24},
    {"name": "Ananya Singh", "gender": "Female", "age": 31},
    {"name": "Pooja Patel", "gender": "Female", "age": 38},
    {"name": "Suresh Nair", "gender": "Male", "age": 58},
    {"name": "Vikram Malhotra", "gender": "Male", "age": 46},
    {"name": "Sneha Gupta", "gender": "Female", "age": 27},
    {"name": "Deepak Joshi", "gender": "Male", "age": 33},
    {"name": "Kavita Rao", "gender": "Female", "age": 45}
]

SIMULATED_SYMPTOMS = [
    "Routine health checkup and vitals assessment",
    "Mild chest heaviness after light exercise",
    "Persistent dry cough and fatigue for 4 days",
    "Seasonal allergy and sore throat",
    "Knee joint stiffness and mild pain",
    "Skin irritation and allergic rash on arm",
    "Recurrent migraine headaches and dizziness",
    "Follow-up consultation for blood pressure review"
]

class HospitalSimulationEngine:
    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self.is_running: bool = False
        self._target_doctor_ids: List[str] = []

    async def start(self):
        """Starts the background hospital simulation loop."""
        if not settings.DEMO_MODE or not settings.DEMO_SIMULATION_ENABLED:
            logger.info("Demo simulation is disabled by configuration (DEMO_MODE=False or DEMO_SIMULATION_ENABLED=False).")
            return

        if self.is_running and self._task and not self._task.done():
            logger.info("Demo simulation engine is already running.")
            return

        self.is_running = True
        await self._discover_target_doctors()
        await self._seed_initial_simulated_queues()
        self._task = asyncio.create_task(self._simulation_loop())
        logger.info("Demo simulation engine started successfully.")

    async def stop(self):
        """Stops the background hospital simulation loop."""
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Demo simulation engine stopped.")

    def get_status(self) -> Dict:
        """Returns the current simulation engine status."""
        return {
            "demo_mode": settings.DEMO_MODE,
            "simulation_enabled": settings.DEMO_SIMULATION_ENABLED,
            "is_running": self.is_running,
            "interval_seconds": settings.DEMO_SIMULATION_INTERVAL_SECONDS,
            "consultation_duration_seconds": settings.DEMO_CONSULTATION_DURATION_SECONDS,
            "demo_doctor": settings.DEMO_DOCTOR_USERNAME,
            "simulated_doctors_count": len(self._target_doctor_ids)
        }

    async def reset(self):
        """Safely cleans up only simulated data and re-seeds fresh baseline queues."""
        logger.info("Resetting demo simulation data...")
        # 1. Remove only documents marked with is_demo_simulation: true
        await appointments_collection.delete_many({"is_demo_simulation": True})
        await appointment_requests_collection.delete_many({"is_demo_simulation": True})

        # 2. Reset queues for target simulation doctors (preserving real patient entries)
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        for doc_id in self._target_doctor_ids:
            q = await queues_collection.find_one({"doctor_id": doc_id, "date": today_str})
            if q:
                # Retain only non-simulated real appointments if any
                real_apps = [a for a in q.get("active_appointments", []) if not a.get("is_demo_simulation", False)]
                await queues_collection.update_one(
                    {"_id": q["_id"]},
                    {"$set": {
                        "active_appointments": real_apps,
                        "current_serving_index": 0 if real_apps else -1
                    }}
                )

        # 3. Re-seed initial simulation
        await self._seed_initial_simulated_queues()
        logger.info("Demo simulation data reset complete.")

    async def _discover_target_doctors(self):
        """Identifies 4-8 non-demo doctors across departments to simulate activity on."""
        demo_user = await users_collection.find_one({"username": settings.DEMO_DOCTOR_USERNAME})
        demo_user_id = demo_user["_id"] if demo_user else None

        query = {}
        if demo_user_id:
            query["user_id"] = {"$ne": demo_user_id}

        doctors = await doctors_collection.find(query).limit(8).to_list(None)
        self._target_doctor_ids = [str(d["_id"]) for d in doctors]
        logger.info(f"Target simulation doctors discovered: {len(self._target_doctor_ids)}")

    async def _seed_initial_simulated_queues(self):
        """Pre-seeds 2-3 simulated patients for each target doctor to ensure realistic live queues."""
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        now = datetime.now(timezone.utc)

        for doc_id in self._target_doctor_ids:
            doc = await doctors_collection.find_one({"_id": doc_id})
            if not doc:
                continue

            q = await queues_collection.find_one({"doctor_id": doc_id, "date": today_str})
            existing_sim = [a for a in (q.get("active_appointments", []) if q else []) if a.get("is_demo_simulation", False)]
            
            if len(existing_sim) >= 2:
                continue

            # Seed 2-3 simulated appointments
            active_list = q.get("active_appointments", []) if q else []
            max_token = max([a.get("queue_number", 0) for a in active_list], default=0)

            for i in range(2):
                max_token += 1
                p_info = random.choice(SIMULATED_PATIENT_NAMES)
                app_id = str(uuid.uuid4())
                slot_time = now + timedelta(minutes=(i * 15) + 10)
                
                sim_app = {
                    "_id": app_id,
                    "patient_id": f"sim-patient-{uuid.uuid4().hex[:8]}",
                    "patient_name": p_info["name"],
                    "doctor_id": doc_id,
                    "doctor_name": doc["name"],
                    "hospital_id": doc["hospital_id"],
                    "slot": slot_time,
                    "queue_number": max_token,
                    "status": "SCHEDULED" if i > 0 else "IN_CONSULTATION",
                    "symptoms": random.choice(SIMULATED_SYMPTOMS),
                    "is_guest": False,
                    "is_demo_simulation": True,
                    "created_at": now
                }
                await appointments_collection.insert_one(sim_app)

                active_list.append({
                    "appointment_id": app_id,
                    "queue_number": max_token,
                    "patient_name": p_info["name"],
                    "status": "SCHEDULED" if i > 0 else "IN_CONSULTATION",
                    "slot": slot_time.isoformat(),
                    "is_demo_simulation": True
                })

            if not q:
                new_q_id = str(uuid.uuid4())
                await queues_collection.insert_one({
                    "_id": new_q_id,
                    "doctor_id": doc_id,
                    "date": today_str,
                    "active_appointments": active_list,
                    "current_serving_index": 0
                })
            else:
                await queues_collection.update_one(
                    {"_id": q["_id"]},
                    {"$set": {
                        "active_appointments": active_list,
                        "current_serving_index": 0 if q.get("current_serving_index", -1) < 0 else q["current_serving_index"]
                    }}
                )

            # Mark doctor as IN_CONSULTATION
            await doctors_collection.update_one(
                {"_id": doc_id},
                {"$set": {"status": "IN_CONSULTATION"}}
            )

    async def _simulation_loop(self):
        """Periodic background loop to progress simulated queues and update doctor statuses."""
        logger.info(f"Background simulation loop running with interval {settings.DEMO_SIMULATION_INTERVAL_SECONDS}s.")
        while self.is_running:
            try:
                await asyncio.sleep(settings.DEMO_SIMULATION_INTERVAL_SECONDS)
                if not self.is_running:
                    break

                today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                now = datetime.now(timezone.utc)

                # Pick 2-3 target doctors to advance in this cycle
                active_sample = random.sample(
                    self._target_doctor_ids,
                    min(len(self._target_doctor_ids), random.randint(2, 4))
                ) if self._target_doctor_ids else []

                for doc_id in active_sample:
                    q = await queues_collection.find_one({"doctor_id": doc_id, "date": today_str})
                    if not q:
                        continue

                    active_apps = q.get("active_appointments", [])
                    current_idx = q.get("current_serving_index", -1)

                    # 1. Complete the current simulated patient if in consultation
                    if 0 <= current_idx < len(active_apps):
                        curr_app = active_apps[current_idx]
                        if curr_app.get("is_demo_simulation", False) and curr_app.get("status") == "IN_CONSULTATION":
                            curr_app["status"] = "COMPLETED"
                            await appointments_collection.update_one(
                                {"_id": curr_app["appointment_id"], "is_demo_simulation": True},
                                {"$set": {"status": "COMPLETED"}}
                            )

                    # 2. Advance to the next SCHEDULED simulated patient
                    next_idx = None
                    for idx, app in enumerate(active_apps):
                        if app.get("status") == "SCHEDULED" and app.get("is_demo_simulation", False):
                            next_idx = idx
                            break

                    doc_status = "AVAILABLE"
                    if next_idx is not None:
                        active_apps[next_idx]["status"] = "IN_CONSULTATION"
                        current_idx = next_idx
                        doc_status = "IN_CONSULTATION"
                        await appointments_collection.update_one(
                            {"_id": active_apps[next_idx]["appointment_id"], "is_demo_simulation": True},
                            {"$set": {"status": "IN_CONSULTATION"}}
                        )
                    else:
                        current_idx = -1
                        doc_status = random.choice(["AVAILABLE", "BUSY"])

                    # 3. If remaining scheduled simulated patients < 2, generate a new simulated appointment
                    scheduled_sim = [a for a in active_apps if a.get("status") == "SCHEDULED" and a.get("is_demo_simulation", False)]
                    if len(scheduled_sim) < 2:
                        p_info = random.choice(SIMULATED_PATIENT_NAMES)
                        max_token = max([a.get("queue_number", 0) for a in active_apps], default=0) + 1
                        new_app_id = str(uuid.uuid4())
                        slot_time = now + timedelta(minutes=25)

                        doc_rec = await doctors_collection.find_one({"_id": doc_id})
                        hospital_id = doc_rec["hospital_id"] if doc_rec else "unknown"

                        new_sim_app = {
                            "_id": new_app_id,
                            "patient_id": f"sim-patient-{uuid.uuid4().hex[:8]}",
                            "patient_name": p_info["name"],
                            "doctor_id": doc_id,
                            "doctor_name": doc_rec["name"] if doc_rec else "Doctor",
                            "hospital_id": hospital_id,
                            "slot": slot_time,
                            "queue_number": max_token,
                            "status": "SCHEDULED",
                            "symptoms": random.choice(SIMULATED_SYMPTOMS),
                            "is_guest": False,
                            "is_demo_simulation": True,
                            "created_at": now
                        }
                        await appointments_collection.insert_one(new_sim_app)

                        active_apps.append({
                            "appointment_id": new_app_id,
                            "queue_number": max_token,
                            "patient_name": p_info["name"],
                            "status": "SCHEDULED",
                            "slot": slot_time.isoformat(),
                            "is_demo_simulation": True
                        })

                    # 4. Save updated queue
                    await queues_collection.update_one(
                        {"_id": q["_id"]},
                        {"$set": {
                            "active_appointments": active_apps,
                            "current_serving_index": current_idx
                        }}
                    )

                    # 5. Update doctor status
                    await doctors_collection.update_one(
                        {"_id": doc_id},
                        {"$set": {"status": doc_status}}
                    )

                    # 6. Broadcast real-time WebSocket events
                    await manager.broadcast({
                        "type": "DOCTOR_STATUS_UPDATE",
                        "doctor_id": doc_id,
                        "status": doc_status
                    })

                    await manager.broadcast({
                        "type": "QUEUE_UPDATE",
                        "doctor_id": doc_id,
                        "current_serving_index": current_idx,
                        "active_appointments_count": len([a for a in active_apps if a.get("status") in ["SCHEDULED", "IN_CONSULTATION"]])
                    })

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in simulation loop: {e}", exc_info=True)
                await asyncio.sleep(5)

simulation_engine = HospitalSimulationEngine()
