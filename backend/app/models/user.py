from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field("patient", pattern="^(patient|doctor|receptionist|admin)$")
    # Patient specific fields if registered as patient:
    name: Optional[str] = None
    phone: Optional[str] = None
    district: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class GuestInitRequest(BaseModel):
    district: str

class GuestSessionResponse(BaseModel):
    guest_id: str
    access_token: str
    role: str

class PatientProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    district: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    medical_history: Optional[List[str]] = None
