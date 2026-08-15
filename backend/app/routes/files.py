import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from typing import List
from datetime import datetime, timezone
from app.auth import get_current_user, require_role
from app.database import files_collection

router = APIRouter(prefix="/files", tags=["Medical Files"])

UPLOAD_DIR = "uploads/medical_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user=Depends(require_role(["doctor", "admin"]))
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, PNG, JPG allowed.")
        
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")
        
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as f:
        f.write(contents)
        
    doc = {
        "_id": file_id,
        "original_name": file.filename,
        "path": f"/uploads/medical_files/{filename}",
        "uploaded_by": current_user["id"],
        "uploaded_at": datetime.now(timezone.utc)
    }
    
    await files_collection.insert_one(doc)
    
    return {"message": "File uploaded successfully", "file_id": file_id, "url": doc["path"]}

@router.get("/history")
async def get_files(current_user=Depends(get_current_user)):
    # Simple list files based on role (admins see all, doctors see theirs, patients logic can be extended)
    query = {}
    if current_user["role"] == "doctor":
        query["uploaded_by"] = current_user["id"]
        
    files = []
    async for f in files_collection.find(query).sort("uploaded_at", -1):
        f["id"] = f["_id"]
        f.pop("_id", None)
        files.append(f)
    return files

@router.delete("/{file_id}")
async def delete_file(file_id: str, current_user=Depends(require_role(["doctor", "admin"]))):
    f_doc = await files_collection.find_one({"_id": file_id})
    if not f_doc:
        raise HTTPException(status_code=404, detail="File not found")
        
    if current_user["role"] == "doctor" and f_doc["uploaded_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")
        
    # Delete from filesystem
    file_path = os.path.join(os.getcwd(), f_doc["path"].lstrip("/"))
    if os.path.exists(file_path):
        os.remove(file_path)
        
    await files_collection.delete_one({"_id": file_id})
    return {"message": "File deleted successfully"}
