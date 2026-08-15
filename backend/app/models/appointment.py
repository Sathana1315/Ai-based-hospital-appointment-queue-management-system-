from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class AppointmentRequestCreate(BaseModel):
    doctor_id: str
    hospital_id: str
    requested_slot: datetime
    notes: Optional[str] = ""
    symptoms: Optional[str] = ""
    priority: Optional[str] = "NORMAL" # NORMAL | HIGH | EMERGENCY
    booking_method: Optional[str] = "MANUAL" # MANUAL | AI_ASSISTANT | VOICE
    age: Optional[int] = None
    gender: Optional[str] = None

class AppointmentSuggest(BaseModel):
    suggested_slot: datetime
    notes: Optional[str] = ""

class AppointmentReject(BaseModel):
    reason: str

class PatientRespondSuggestion(BaseModel):
    action: str # ACCEPT | DECLINE

class MedicineItem(BaseModel):
    name: str
    dosage: str       # e.g. "500mg" or "1 tablet"
    frequency: str    # e.g. "three times a day"

class PrescriptionCreate(BaseModel):
    diagnosis: Optional[str] = None
    medicines: List[MedicineItem]
    lab_tests: Optional[List[str]] = []
    advice: Optional[str] = None
    follow_up_date: Optional[str] = None
    notes: Optional[str] = ""
    attachment_url: Optional[str] = None

class QueueItem(BaseModel):
    appointment_id: str
    patient_name: str
    queue_number: int
    status: str

class QueueResponse(BaseModel):
    doctor_id: str
    date: str
    active_appointments: List[QueueItem]
    current_serving_index: int

class WalkInCreate(BaseModel):
    """Receptionist creates a walk-in patient token directly."""
    patient_name: str
    doctor_id: str
    hospital_id: str
    notes: Optional[str] = ""
