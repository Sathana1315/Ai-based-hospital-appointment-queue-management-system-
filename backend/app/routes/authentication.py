from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta, timezone
import uuid
from app.database import users_collection, patients_collection, guest_accounts_collection
from app.models.user import UserRegister, UserLogin, Token, GuestInitRequest, GuestSessionResponse
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    # Check if username or email already exists
    existing_user = await users_collection.find_one({
        "$or": [
            {"username": user_data.username},
            {"email": user_data.email}
        ]
    })
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    
    hashed_password = get_password_hash(user_data.password)
    user_id = str(uuid.uuid4())
    
    # Insert main User record
    new_user = {
        "_id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": hashed_password,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc)
    }
    await users_collection.insert_one(new_user)
    
    # If registering as a Patient, also create the patient profile
    if user_data.role == "patient":
        new_patient = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": user_data.name or user_data.username,
            "phone": user_data.phone or "",
            "district": user_data.district or "",
            "age": user_data.age or 0,
            "gender": user_data.gender or "",
            "medical_history": []
        }
        await patients_collection.insert_one(new_patient)
        
    return {"message": "User registered successfully", "user_id": user_id}

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await users_collection.find_one({
        "$or": [
            {"username": login_data.username_or_email},
            {"email": login_data.username_or_email}
        ]
    })
    
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(
        data={"sub": user["_id"], "role": user["role"]}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"]
    }

@router.post("/guest/init", response_model=GuestSessionResponse)
async def init_guest(guest_req: GuestInitRequest):
    guest_id = f"GUEST-{uuid.uuid4().hex[:8].upper()}"
    
    # Create guest profile active for 24 hours
    guest_profile = {
        "_id": guest_id,
        "district": guest_req.district,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    await guest_accounts_collection.insert_one(guest_profile)
    
    access_token = create_access_token(
        data={"sub": guest_id, "role": "guest"}
    )
    
    return {
        "guest_id": guest_id,
        "access_token": access_token,
        "role": "guest"
    }

@router.get("/me")
async def read_users_me(current_user = Depends(get_current_user)):
    return current_user


# ── Google OAuth Login ──────────────────────────────────────────────
from pydantic import BaseModel as PydanticBaseModel
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from app.config import settings as app_settings
import logging

logger = logging.getLogger("qmed_backend.auth")

class GoogleLoginRequest(PydanticBaseModel):
    credential: str  # Google ID token from frontend

@router.post("/google")
async def google_login(body: GoogleLoginRequest):
    """
    Verify Google ID token server-side, find-or-create PATIENT account,
    and return a standard Q-Med JWT.
    """
    if not app_settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured on this server.")

    # 1. Verify Google ID token
    try:
        idinfo = google_id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            app_settings.GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google credential. Please try again.")

    # 2. Validate issuer
    if idinfo.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(status_code=401, detail="Invalid token issuer.")

    # 3. Require verified email
    if not idinfo.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Google email is not verified. Please verify your email with Google first.")

    google_email = idinfo["email"].lower().strip()
    google_name = idinfo.get("name", google_email.split("@")[0])
    google_picture = idinfo.get("picture", "")
    google_sub = idinfo.get("sub", "")

    logger.info(f"Google OAuth login for email: {google_email}")

    # 4. Find existing user by email
    existing_user = await users_collection.find_one({"email": google_email})

    if existing_user:
        # Enforce Google Sign-In is ONLY for patient accounts
        if existing_user.get("role") != "patient":
            raise HTTPException(
                status_code=403,
                detail="Google sign-in is available for patient accounts only. Please use your staff login."
            )

        # Link google_sub if not already linked
        if not existing_user.get("google_sub"):
            await users_collection.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"google_sub": google_sub}}
            )

        # Update profile picture if available and not already set
        if google_picture:
            pat = await patients_collection.find_one({"user_id": existing_user["_id"]})
            if pat and not pat.get("profile_picture"):
                await patients_collection.update_one(
                    {"user_id": existing_user["_id"]},
                    {"$set": {"profile_picture": google_picture}}
                )

        # Issue JWT for patient
        access_token = create_access_token(
            data={"sub": existing_user["_id"], "role": "patient"}
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": "patient",
            "username": existing_user["username"]
        }

    # 5. No existing user → Create new PATIENT account
    user_id = str(uuid.uuid4())
    # Generate a unique username from Google name
    base_username = google_name.lower().replace(" ", "_")[:20]
    username = base_username
    counter = 1
    while await users_collection.find_one({"username": username}):
        username = f"{base_username}_{counter}"
        counter += 1

    new_user = {
        "_id": user_id,
        "username": username,
        "email": google_email,
        "hashed_password": "",  # No password for Google-only accounts
        "role": "patient",      # Google login ALWAYS creates patients
        "google_sub": google_sub,
        "created_at": datetime.now(timezone.utc)
    }
    await users_collection.insert_one(new_user)

    # Create patient profile
    new_patient = {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": google_name,
        "phone": "",
        "district": "Central",
        "age": 0,
        "gender": "",
        "medical_history": [],
        "profile_picture": google_picture
    }
    await patients_collection.insert_one(new_patient)

    logger.info(f"Created new patient account for Google user: {google_email} (username: {username})")

    access_token = create_access_token(
        data={"sub": user_id, "role": "patient"}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": "patient",
        "username": username
    }
