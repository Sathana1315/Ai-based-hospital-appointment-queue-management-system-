from fastapi import APIRouter, Depends, HTTPException
from app.database import notifications_collection
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/notifications", tags=["Notifications"])

from typing import Optional

@router.get("")
async def get_notifications(
    type: Optional[str] = None,
    read: Optional[bool] = None,
    current_user=Depends(get_current_user)
):
    """Get all notifications for the current user, newest first. Supports filtering by type and read status."""
    user_id = current_user["id"]
    query = {"user_id": user_id}
    
    if type:
        query["type"] = type
    if read is not None:
        query["read"] = read
        
    notifs = []
    async for n in notifications_collection.find(query).sort("created_at", -1).limit(100):
        n["id"] = str(n["_id"])
        n.pop("_id", None)
        notifs.append(n)
    return notifs

@router.get("/unread-count")
async def get_unread_count(current_user=Depends(get_current_user)):
    count = await notifications_collection.count_documents({
        "user_id": current_user["id"],
        "read": False
    })
    return {"unread_count": count}

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user=Depends(get_current_user)
):
    result = await notifications_collection.update_one(
        {"_id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@router.put("/mark-all-read")
async def mark_all_read(current_user=Depends(get_current_user)):
    await notifications_collection.update_many(
        {"user_id": current_user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user=Depends(get_current_user)
):
    result = await notifications_collection.delete_one(
        {"_id": notification_id, "user_id": current_user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

@router.delete("")
async def clear_all_notifications(current_user=Depends(get_current_user)):
    """Clear all notifications for the current user."""
    await notifications_collection.delete_many({"user_id": current_user["id"]})
    return {"message": "All notifications cleared"}
