from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class HospitalCreate(BaseModel):
    name: str
    district: str
    rating: float = Field(default=4.0, ge=1.0, le=5.0)
    departments: List[str]
    address: str
    image_url: Optional[str] = None  # optional hospital image
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    gallery_urls: Optional[List[str]] = None
    description: Optional[str] = None
    gps_coordinates: Optional[dict] = None # {"lat": float, "lng": float}
    email: Optional[str] = None
    website: Optional[str] = None
    working_hours: Optional[str] = None
    facilities: Optional[List[str]] = None
    emergency_support: Optional[bool] = False

class HospitalResponse(HospitalCreate):
    id: str

class DoctorCreate(BaseModel):
    username: str
    email: str
    password: str
    name: str
    hospital_id: str
    department: str
    rating: float = Field(default=4.0, ge=1.0, le=5.0)
    qualification: Optional[str] = None   # e.g. "MBBS, MD"
    experience: Optional[int] = None      # years of experience
    photo_url: Optional[str] = None       # avatar/photo URL
    languages: Optional[List[str]] = None
    consultation_fee: Optional[float] = None
    biography: Optional[str] = None
    education: Optional[List[str]] = None
    certificates: Optional[List[str]] = None
    weekly_schedule: Optional[dict] = None # e.g. {"Monday": "09:00-17:00"}

class DoctorResponse(BaseModel):
    id: str
    name: str
    hospital_id: str
    hospital_name: Optional[str] = None
    department: str
    rating: float
    status: str
    qualification: Optional[str] = None
    experience: Optional[int] = None
    photo_url: Optional[str] = None
    languages: Optional[List[str]] = None
    consultation_fee: Optional[float] = None
    biography: Optional[str] = None
    education: Optional[List[str]] = None
    certificates: Optional[List[str]] = None
    weekly_schedule: Optional[dict] = None

class DoctorStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(AVAILABLE|OFFLINE|BUSY)$")
