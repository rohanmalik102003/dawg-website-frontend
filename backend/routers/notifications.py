# backend/routers/notifications.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import uuid4

from backend.database import (
    get_all_documents,
    get_document,
    add_document,
    update_document,
    delete_document,
    now
)
from backend.routers.auth import get_current_user

router = APIRouter()


class NotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    data: Optional[dict] = None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    data: Optional[dict]
    read: bool
    created_at: datetime


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(current_user=Depends(get_current_user)):
    notifications = get_all_documents("notifications")
    user_notifications = [n for n in notifications if n["user_id"] == current_user["uid"]]
    user_notifications.sort(key=lambda n: n.get("created_at", datetime.utcnow()), reverse=True)
    return user_notifications


@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    current_user=Depends(get_current_user)
):
    notification_id = str(uuid4())
    new_notification = {
        "id": notification_id,
        "user_id": current_user["uid"],
        "type": notification_data.type,
        "title": notification_data.title,
        "message": notification_data.message,
        "data": notification_data.data,
        "read": False,
        "created_at": now()
    }
    add_document("notifications", notification_id, new_notification)
    return new_notification


@router.put("/{notification_id}/read")
async def mark_as_read(notification_id: str, current_user=Depends(get_current_user)):
    notification = get_document("notifications", notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    update_document("notifications", notification_id, {"read": True})
    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_as_read(current_user=Depends(get_current_user)):
    notifications = get_all_documents("notifications")
    for notif in notifications:
        if notif["user_id"] == current_user["uid"] and not notif["read"]:
            update_document("notifications", notif["id"], {"read": True})
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, current_user=Depends(get_current_user)):
    notification = get_document("notifications", notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification["user_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    delete_document("notifications", notification_id)
    return {"message": "Notification deleted"}
