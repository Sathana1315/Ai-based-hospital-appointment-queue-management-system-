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
