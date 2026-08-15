import logging
import os
import shutil
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from groq import Groq
from app.config import settings
from app.auth import get_current_user
from app.database import chat_history_collection, doctors_collection, appointments_collection, appointment_requests_collection
from datetime import datetime, timezone, time, timedelta
import uuid
import json
from app.database import (
    chat_history_collection, doctors_collection, appointments_collection, 
    appointment_requests_collection, hospitals_collection, prescriptions_collection
)
from bson.objectid import ObjectId

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Services"])

# Attempt to load local whisper model, fallback to Groq Cloud Whisper if error or slow
whisper_model = None
try:
    from faster_whisper import WhisperModel
    # Load 'base' model on CPU to save memory/speed, compute_type="int8"
    logger.info("Initializing local faster-whisper model...")
    # Delay initialization until first request to keep server startup fast, or load here
except Exception as e:
    logger.warning(f"Could not load local faster-whisper (this is fine, falling back to Groq Cloud Whisper): {e}")

def get_groq_client():
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
    return Groq(api_key=settings.GROQ_API_KEY)

async def transcribe_audio_file(file_path: str) -> str:
    global whisper_model
    # 1. Try Groq Cloud Whisper API (Translations to English for better NLP)
    try:
        client = get_groq_client()
        with open(file_path, "rb") as audio_file:
            translation = client.audio.translations.create(
                file=(os.path.basename(file_path), audio_file.read()),
                model="whisper-large-v3",
                response_format="text"
            )
            if translation.strip():
                return translation.strip()
    except Exception as e:
        logger.warning(f"Groq Cloud Whisper translation failed: {e}. Falling back to local faster-whisper...")

    # 2. Fallback to local faster-whisper
    try:
        from faster_whisper import WhisperModel
        if whisper_model is None:
            # Load model lazily
            whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
        
        logger.info("Transcribing locally with faster-whisper...")
        segments, info = whisper_model.transcribe(file_path, beam_size=5)
        text = " ".join([segment.text for segment in segments])
        if text.strip():
            return text.strip()
    except Exception as e:
        logger.error(f"Local faster-whisper transcription failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Speech to text transcription failed (both cloud & local): {str(e)}"
        )
    return ""

@router.post("/voice-symptoms")
async def analyze_voice_symptoms(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    # Save the uploaded file temporarily
    suffix = os.path.splitext(file.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_path = temp_file.name

    try:
        # Step 1: Transcribe audio
        transcription = await transcribe_audio_file(temp_path)
        logger.info(f"Transcribed Text: {transcription}")
        
        # Step 2: Query Groq to determine specialized department
        client = get_groq_client()
        prompt = f"""
        Analyze the following user symptoms and recommend exactly one medical department from this list:
        - Cardiology
        - Dermatology
        - Orthopedics
        - Pediatrics
        - General Medicine
        - Neurology

        Your response must contain ONLY the name of the department as listed, with no extra text, explanations, or punctuation.

        Symptoms: "{transcription}"
        """
        
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.0,
            max_tokens=10
        )
        
        recommended_specialty = completion.choices[0].message.content.strip()
        
        # Basic parsing check in case LLM outputs extra fluff
        valid_departments = ["Cardiology", "Dermatology", "Orthopedics", "Pediatrics", "General Medicine", "Neurology"]
        matched_specialty = "General Medicine" # fallback
        for dept in valid_departments:
            if dept.lower() in recommended_specialty.lower():
                matched_specialty = dept
                break
                
        return {
            "transcription": transcription,
            "recommended_specialty": matched_specialty
        }
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

class ChatRequest(BaseModel):
    message: str
    session_token: Optional[str] = None

# Helper functions for Tools
async def get_available_doctors(hospital_id: str = None, department: str = None):
    query = {"status": "AVAILABLE"}
    if department: query["department"] = {"$regex": f"^{department}$", "$options": "i"}
    if hospital_id: query["hospital_id"] = hospital_id
    docs = []
    async for d in doctors_collection.find(query).limit(10):
        docs.append({
            "name": d["name"], 
            "department": d["department"], 
            "id": str(d["_id"]),
            "experience": d.get("experience", 0),
            "hospital_id": d.get("hospital_id")
        })
    return docs

async def get_my_appointments(user_id: str, status: str = None):
    query = {"patient_id": user_id}
    if status and status != "ALL":
        query["status"] = status
    apps = []
    async for a in appointments_collection.find(query).sort("slot", -1).limit(5):
        apps.append({
            "id": str(a["_id"]),
            "doctor_id": a.get("doctor_id"),
            "date": a["slot"].strftime("%Y-%m-%d %H:%M"), 
            "status": a["status"]
        })
    # Attach doctor details
    for app in apps:
        if app.get("doctor_id"):
            doc = await doctors_collection.find_one({"_id": app["doctor_id"]})
            if doc:
                app["doctor_name"] = doc["name"]
                app["department"] = doc["department"]
    return apps

async def find_hospitals(specialty: str = None, district: str = None):
    query = {}
    if district:
        query["district"] = {"$regex": f"^{district}$", "$options": "i"}
    if specialty:
        query["departments"] = {"$regex": f"^{specialty}$", "$options": "i"}
        
    hospitals = []
    async for h in hospitals_collection.find(query).sort("rating", -1).limit(5):
        hospitals.append({
            "id": str(h["_id"]),
            "name": h["name"],
            "district": h.get("district", ""),
            "rating": h.get("rating", 0.0)
        })
    return hospitals

async def get_hospital_details(hospital_id: str):
    hosp = await hospitals_collection.find_one({"_id": hospital_id})
    if not hosp:
        return {"error": "Hospital not found."}
    
    address = hosp.get("address", "Hospital Address")
    encoded_addr = address.replace(" ", "+")
    google_maps_url = f"https://www.google.com/maps/search/?api=1&query={encoded_addr}"
    
    return {
        "name": hosp.get("name"),
        "district": hosp.get("district"),
        "address": address,
        "phone": hosp.get("phone", hosp.get("email", "+1-800-HOSPITAL")),
        "working_hours": hosp.get("working_hours", "24/7"),
        "departments": hosp.get("departments", []),
        "facilities": hosp.get("facilities", ["Emergency", "Pharmacy", "Laboratory"]),
        "emergency_support": hosp.get("emergency_support", True),
        "rating": hosp.get("rating", 4.8),
        "google_maps_url": google_maps_url
    }

async def get_appointment_status_details(user_id: str):
    requests = []
    async for req in appointment_requests_collection.find({"patient_id": user_id}).sort("created_at", -1).limit(5):
        doc = await doctors_collection.find_one({"_id": req["doctor_id"]})
        hosp = await hospitals_collection.find_one({"_id": req["hospital_id"]})
        requests.append({
            "request_id": str(req["_id"]),
            "doctor_name": doc["name"] if doc else "Specialist Doctor",
            "hospital_name": hosp["name"] if hosp else "Hospital",
            "status": req.get("status", "PENDING_DOCTOR_APPROVAL"),
            "requested_slot": req["requested_slot"].strftime("%Y-%m-%d %H:%M") if isinstance(req.get("requested_slot"), datetime) else req.get("requested_slot"),
            "suggested_slot": req.get("suggested_slot").strftime("%Y-%m-%d %H:%M") if isinstance(req.get("suggested_slot"), datetime) else req.get("suggested_slot"),
            "rejection_reason": req.get("rejection_reason")
        })
    return {"appointment_requests": requests}

async def get_patient_medical_history_details(user_id: str):
    from app.database import db, patients_collection
    pat = await patients_collection.find_one({"user_id": user_id})
    history = pat.get("medical_history", []) if pat else []
    
    prescriptions = []
    async for p in prescriptions_collection.find({"patient_id": user_id}).sort("created_at", -1).limit(5):
        doc = await doctors_collection.find_one({"_id": p.get("doctor_id")})
        prescriptions.append({
            "date": p["created_at"].strftime("%Y-%m-%d") if isinstance(p.get("created_at"), datetime) else p.get("created_at"),
            "doctor_name": doc["name"] if doc else "Doctor",
            "medicines": p.get("medicines", []),
            "notes": p.get("notes", "")
        })
    return {"medical_history": history, "prescriptions": prescriptions}

async def book_appointment(user_id: str, doctor_id: str, hospital_id: str, requested_slot: str):
    try:
        dt = datetime.fromisoformat(requested_slot)
    except:
        return {"error": "Invalid slot format. Must be ISO 8601."}
        
    req_id = str(uuid.uuid4())
    new_request = {
        "_id": req_id,
        "patient_id": user_id,
        "is_guest": False,
        "doctor_id": doctor_id,
        "hospital_id": hospital_id,
        "status": "PENDING_DOCTOR_APPROVAL",
        "requested_slot": dt,
        "suggested_slots": [],
        "notes": "Booked via AI Personal Healthcare Assistant",
        "symptoms": "Booked via AI Assistant",
        "priority": "NORMAL",
        "booking_method": "AI_ASSISTANT",
        "rejection_reason": None,
        "created_at": datetime.now(timezone.utc)
    }
    await appointment_requests_collection.insert_one(new_request)
    
    # Fetch doctor and hospital for the response
    doc = await doctors_collection.find_one({"_id": doctor_id})
    hosp = await hospitals_collection.find_one({"_id": hospital_id})
    
    # Notify doctor if registered user
    if doc and doc.get("user_id"):
        from app.routes.appointments import _create_notification
        from app.ws_manager import manager
        await _create_notification(
            doc["user_id"],
            "New Appointment Request",
            f"New AI booking request for {dt.strftime('%Y-%m-%d %H:%M')}.",
            "info"
        )
        await manager.send_personal_message({
            "type": "NEW_APPOINTMENT_REQUEST",
            "request_id": req_id,
            "doctor_id": doctor_id,
            "patient_id": user_id
        }, doc["user_id"])
    
    return {
        "success": True,
        "request_id": req_id,
        "doctor_name": doc["name"] if doc else "Unknown",
        "hospital_name": hosp["name"] if hosp else "Unknown",
        "requested_slot": requested_slot,
        "status": "PENDING_DOCTOR_APPROVAL"
    }

async def cancel_appointment(user_id: str, appointment_id: str):
    # Try cancelling an active appointment
    res = await appointments_collection.update_one(
        {"_id": appointment_id, "patient_id": user_id},
        {"$set": {"status": "CANCELLED", "updated_at": datetime.now(timezone.utc)}}
    )
    if res.modified_count > 0:
        return {"success": True, "message": "Appointment cancelled."}
        
    # Try cancelling a pending request
    res2 = await appointment_requests_collection.update_one(
        {"_id": appointment_id, "patient_id": user_id},
        {"$set": {"status": "CANCELLED", "updated_at": datetime.now(timezone.utc)}}
    )
    if res2.modified_count > 0:
        return {"success": True, "message": "Appointment request cancelled."}
        
    return {"success": False, "error": "Appointment not found or already cancelled."}

tools_definition = [
    {
        "type": "function",
        "function": {
            "name": "get_available_doctors",
            "description": "Get a list of currently available doctors. Use this when the user asks for doctors, or after they select a hospital.",
            "parameters": {
                "type": "object",
                "properties": {
                    "hospital_id": {"type": "string", "description": "The ID of the hospital to filter doctors by. Pass this if the user has selected a hospital."},
                    "department": {"type": "string", "description": "The medical department (e.g. Cardiology, Neurology)."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_appointments",
            "description": "Get a list of the user's recent or upcoming appointments.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "Filter by status: ALL, PENDING_DOCTOR_APPROVAL, APPROVED, COMPLETED, CANCELLED. Default is ALL."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_appointment_status_details",
            "description": "Fetch real-time appointment request status, doctor decision, and queue details for the patient.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_hospital_details",
            "description": "Get detailed hospital information including address, contact number, facilities, working hours, emergency availability, and Google Maps link.",
            "parameters": {
                "type": "object",
                "properties": {
                    "hospital_id": {"type": "string", "description": "The ID of the hospital."}
                },
                "required": ["hospital_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_patient_medical_history_details",
            "description": "Get patient's past medical history, consultation records, and prescriptions.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_hospitals",
            "description": "Find hospitals based on specialty/department or district. Call this when the user needs to select a hospital.",
            "parameters": {
                "type": "object",
                "properties": {
                    "specialty": {"type": "string", "description": "The medical department needed (e.g. Cardiology)."},
                    "district": {"type": "string", "description": "The district or city name."}
                },
                "required": ["specialty"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book an appointment for the user. Creates an Appointment Request awaiting Doctor Approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "doctor_id": {"type": "string", "description": "The ID of the selected doctor."},
                    "hospital_id": {"type": "string", "description": "The ID of the hospital where the doctor works."},
                    "requested_slot": {"type": "string", "description": "The chosen slot in ISO 8601 format (e.g. 2026-07-23T10:00:00+00:00)."}
                },
                "required": ["doctor_id", "hospital_id", "requested_slot"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "recommend_slots",
            "description": "Get available appointment slots for a specific doctor. Call this when the user has selected a doctor and needs to pick a time.",
            "parameters": {
                "type": "object",
                "properties": {
                    "doctor_id": {"type": "string", "description": "The ID of the selected doctor."},
                    "target_date": {"type": "string", "description": "The desired date in YYYY-MM-DD format (e.g. 2026-07-23)."}
                },
                "required": ["doctor_id", "target_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_appointment",
            "description": "Cancel an existing appointment or pending request.",
            "parameters": {
                "type": "object",
                "properties": {
                    "appointment_id": {"type": "string", "description": "The ID of the appointment or request to cancel."}
                },
                "required": ["appointment_id"]
            }
        }
    }
]

@router.post("/chatbot")
async def hospital_chatbot(
    req: ChatRequest,
    current_user = Depends(get_current_user)
):
    client = get_groq_client()
    session_id = req.session_token or current_user["id"]
    user_id = current_user["id"]
    
    # Retrieve chat history
    chat_doc = await chat_history_collection.find_one({"session_id": session_id})
    
    system_prompt = {
        "role": "system", 
        "content": (
            "You are Q-Med, a friendly, supportive, and intelligent Personal Healthcare Assistant for Q-Med Hospitals. "
            "WORKFLOW & DOCTOR APPROVAL: "
            "1. When booking, explain that an Appointment Request will be created with status PENDING_DOCTOR_APPROVAL. "
            "2. Once book_appointment is called, reply warmly: 'Your appointment request has been submitted to Dr. [Doctor Name]. The doctor will review it shortly. You will receive a notification once a decision is made.' "
            "3. DO NOT END THE CONVERSATION after booking! Transition into a helpful healthcare companion and offer post-booking assistance options (View Appointment Status, Hospital Info/Location, Specialist Lookup, Explain Symptoms, General Health Advice, Prescriptions/Medical History). "
            "HEALTHCARE & SAFETY GUARDRAILS: "
            "- ALWAYS include a medical disclaimer when explaining symptoms: 'This information is for general educational purposes and is not a medical diagnosis. Please consult your doctor for professional advice.' "
            "- EMERGENCY PROTOCOL: If the user reports severe symptoms (e.g. chest pain with difficulty breathing, stroke symptoms, loss of consciousness, severe bleeding), immediately advise calling emergency medical services (108 / 911) or visiting the nearest ER! "
            "- STRICT TOOL USAGE: Call tools to fetch real data (get_appointment_status_details, get_hospital_details, get_patient_medical_history_details, get_available_doctors, recommend_slots, find_hospitals). Never hallucinate status or slots. "
            "- DO NOT EXPOSE BACKEND JSON OR IDs TO THE USER."
        )
    }
    
    if not chat_doc:
        history = [system_prompt]
    else:
        history = chat_doc.get("messages", [])
        if history and history[0].get("role") == "system":
            history[0] = system_prompt
        elif not history or history[0].get("role") != "system":
            history.insert(0, system_prompt)
            
    history.append({"role": "user", "content": req.message})
    
    try:
        # First LLM call
        try:
            completion = client.chat.completions.create(
                messages=history[-12:], 
                model="llama-3.3-70b-versatile",
                tools=tools_definition,
                tool_choice="auto"
            )
            response_message = completion.choices[0].message
        except Exception as llm_err:
            err_str = str(llm_err)
            if "tool_use_failed" in err_str and "<function=" in err_str:
                import re
                match = re.search(r'<function=(\w+)(.*?)(?:</function>|>|<|$)', err_str)
                if match:
                    func_name = match.group(1)
                    raw_args = match.group(2)
                    
                    # Extract the first valid JSON-like block (starts with { or [)
                    json_match = re.search(r'(\{.*\}|\[.*\])', raw_args, re.DOTALL)
                    if json_match:
                        func_args_str = json_match.group(1)
                    else:
                        func_args_str = "{}"
                        
                    logger.info(f"Recovered tool call: {func_name} with args {func_args_str}")
                    class MockToolCall:
                        def __init__(self, name, args):
                            self.id = "call_" + str(uuid.uuid4())[:8]
                            self.function = type('obj', (object,), {'name': name, 'arguments': args})
                    class MockMessage:
                        def __init__(self, tool_calls):
                            self.tool_calls = tool_calls
                            self.content = ""
                        def model_dump(self, **kwargs):
                            return {"role": "assistant", "content": None, "tool_calls": [{"id": t.id, "type": "function", "function": {"name": t.function.name, "arguments": t.function.arguments}} for t in self.tool_calls]}
                    response_message = MockMessage([MockToolCall(func_name, func_args_str)])
                else:
                    raise llm_err
            else:
                raise llm_err
        
        ui_actions = []
        
        # Check if LLM wants to call a tool
        if response_message.tool_calls:
            history.append(response_message.model_dump(exclude_unset=True))
            
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                # Execute tool
                if function_name == "get_available_doctors":
                    result = await get_available_doctors(function_args.get("hospital_id"), function_args.get("department"))
                    if result: ui_actions.append({"type": "DOCTOR_LIST", "data": result})
                elif function_name == "get_my_appointments":
                    result = await get_my_appointments(user_id, function_args.get("status"))
                elif function_name == "find_hospitals":
                    result = await find_hospitals(function_args.get("specialty"), function_args.get("district"))
                    if result: ui_actions.append({"type": "HOSPITAL_LIST", "data": result})
                elif function_name == "book_appointment":
                    result = await book_appointment(user_id, function_args.get("doctor_id"), function_args.get("hospital_id"), function_args.get("requested_slot"))
                    if result.get("success"):
                        ui_actions.append({"type": "APPOINTMENT_SUMMARY", "data": result})
                elif function_name == "cancel_appointment":
                    result = await cancel_appointment(user_id, function_args.get("appointment_id"))
                elif function_name == "recommend_slots":
                    # Scan up to 5 days ahead to find the earliest available slots
                    target_date_str = function_args.get("target_date")
                    doctor_id = function_args.get("doctor_id")
                    logger.info(f"recommend_slots called for doctor_id={doctor_id}, target_date={target_date_str}")
                    try:
                        base_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
                    except:
                        base_date = datetime.now(timezone.utc).date()
                        
                    found_slots = []
                    actual_date = None
                    for i in range(7):
                        check_date = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
                        slots = await _get_available_slots(doctor_id, check_date)
                        if slots:
                            found_slots = slots[:6]
                            actual_date = check_date
                            break
                    logger.info(f"found_slots: {found_slots} on date {actual_date}")        
                    if found_slots:
                        result = {"slots": found_slots, "date": actual_date}
                        doc = await doctors_collection.find_one({"_id": doctor_id})
                        ui_actions.append({
                            "type": "SLOT_LIST", 
                            "data": found_slots, 
                            "doctor_id": doctor_id,
                            "hospital_id": doc.get("hospital_id") if doc else None
                        })
                elif function_name == "get_appointment_status_details":
                    result = await get_appointment_status_details(user_id)
                elif function_name == "get_hospital_details":
                    result = await get_hospital_details(function_args.get("hospital_id"))
                elif function_name == "get_patient_medical_history_details":
                    result = await get_patient_medical_history_details(user_id)
                else:
                    result = {"error": "Unknown tool"}
                
                # Append tool result
                history.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": function_name,
                    "content": json.dumps(result)
                })
                
            # Second LLM call with tool results
            completion2 = client.chat.completions.create(
                messages=history[-15:],
                model="llama-3.3-70b-versatile"
            )
            assistant_reply = completion2.choices[0].message.content
            # Clean up any leaked XML tags if the LLM tries to call tools without definitions
            import re
            assistant_reply = re.sub(r'<function=.*?</function>', '', assistant_reply, flags=re.DOTALL).strip()
            
            history.append({"role": "assistant", "content": assistant_reply})
        else:
            assistant_reply = response_message.content
            import re
            assistant_reply = re.sub(r'<function=.*?</function>', '', assistant_reply, flags=re.DOTALL).strip()
            history.append({"role": "assistant", "content": assistant_reply})
            
        # Clean tool calls from history before saving to MongoDB if desired, or save as is
        # MongoDB handles dicts fine, but let's ensure no weird objects
        
        await chat_history_collection.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "messages": history,
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
        return {
            "session_token": session_id,
            "reply": assistant_reply,
            "ui_actions": ui_actions
        }
    except Exception as e:
        logger.error(f"Chatbot query error: {e}")
        raise HTTPException(status_code=500, detail=f"Chatbot failed: {str(e)}")


class RecommendSlotsRequest(BaseModel):
    doctor_id: str
    target_date: str

async def _get_available_slots(doctor_id: str, date_str: str) -> list:
    doctor = await doctors_collection.find_one({"_id": doctor_id})
    if not doctor: return []
    
    target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    day_name = target_date.strftime("%A")
    schedule_str = doctor.get("weekly_schedule", {}).get(day_name, "09:00-17:00")
    if schedule_str.lower() in ["off", "closed", "leave"]: return []
    
    try:
        start_str, end_str = schedule_str.split("-")
        start_time = datetime.strptime(start_str.strip(), "%H:%M").time()
        end_time = datetime.strptime(end_str.strip(), "%H:%M").time()
    except:
        start_time = time(9, 0)
        end_time = time(17, 0)
    
    start_dt = datetime.combine(target_date, time.min)
    end_dt = datetime.combine(target_date, time.max)
    
    existing_apps = await appointments_collection.find({
        "doctor_id": doctor_id, "slot": {"$gte": start_dt, "$lt": end_dt}, "status": {"$ne": "CANCELLED"}
    }).to_list(None)
    booked_times = [app["slot"].strftime("%H:%M") for app in existing_apps]
    
    pending_reqs = await appointment_requests_collection.find({
        "doctor_id": doctor_id, "requested_slot": {"$gte": start_dt, "$lt": end_dt}, "status": {"$in": ["PENDING", "APPROVED", "SUGGESTED"]}
    }).to_list(None)
    for req in pending_reqs: booked_times.append(req["requested_slot"].strftime("%H:%M"))
        
    slots = []
    current_time = datetime.combine(target_date, start_time).replace(tzinfo=timezone.utc)
    end_time_dt = datetime.combine(target_date, end_time).replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    
    while current_time < end_time_dt:
        time_str = current_time.strftime("%H:%M")
        is_lunch = time(13, 0) <= current_time.time() < time(14, 0)
        
        if current_time >= now and not is_lunch and time_str not in booked_times:
            slots.append(current_time.isoformat())
        current_time += timedelta(minutes=15)
    return slots

@router.post("/recommend-slots")
async def recommend_slots(req: RecommendSlotsRequest, current_user = Depends(get_current_user)):
    target_dt = datetime.strptime(req.target_date, "%Y-%m-%d").date()
    
    available_slots = []
    for i in range(3):
        d_str = (target_dt + timedelta(days=i)).strftime("%Y-%m-%d")
        slots = await _get_available_slots(req.doctor_id, d_str)
        available_slots.extend(slots)
        if len(available_slots) > 20: # Cap so we don't overwhelm LLM
            available_slots = available_slots[:20]
            break
        
    if not available_slots:
        raise HTTPException(status_code=404, detail="No available slots found in the next 3 days.")
        
    client = get_groq_client()
    prompt = f"""
    You are an AI Smart Scheduling Assistant for a hospital.
    Here are the available appointment slots for the requested doctor:
    {available_slots}
    
    Select the Top 3 best appointment slots for the patient. 
    Criteria for selection:
    1. Earliest availability (shortest waiting time).
    2. Spread out options (e.g., morning vs afternoon).
    
    Return the response strictly as a JSON array of objects, with no markdown formatting, no code blocks, and no extra text.
    Format:
    [
      {{"datetime": "...", "reason": "..."}}
    ]
    """
    
    try:
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.0
        )
        result_text = completion.choices[0].message.content.strip()
        
        if result_text.startswith("```json"):
            result_text = result_text[7:-3].strip()
        elif result_text.startswith("```"):
            result_text = result_text[3:-3].strip()
            
        recommendations = json.loads(result_text)
        return {"recommendations": recommendations[:3]}
    except Exception as e:
        logger.error(f"Failed to generate AI slot recommendations: {e}")
        recs = []
        for i, slot in enumerate(available_slots[:3]):
            recs.append({"datetime": slot, "reason": "Earliest available slot."})
        return {"recommendations": recs}

