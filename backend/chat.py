# backend/routers/chat.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import uuid4

from backend.database import (
    get_all_documents,
    get_document,
    add_document,
    update_document,
    create_chat,
    get_chat,
    send_message as send_message_to_db,
    get_chat_messages,
    now
)
from backend.routers.auth import get_current_user

router = APIRouter()


class ChatCreate(BaseModel):
    task_id: str
    user2_id: str


class MessageCreate(BaseModel):
    chat_id: str
    content: Optional[str] = None
    message_type: str = "text"
    image_url: Optional[str] = None
    location_data: Optional[dict] = None


class MessageResponse(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    content: Optional[str]
    message_type: str
    image_url: Optional[str]
    location_data: Optional[dict]
    read_at: Optional[datetime]
    created_at: datetime


@router.post("/start", response_model=dict)
async def start_chat(chat_data: ChatCreate, current_user=Depends(get_current_user)):
    chats = get_all_documents("chats")
    for c in chats:
        if (
            ((c["user1_id"] == current_user["uid"] and c["user2_id"] == chat_data.user2_id) or
             (c["user1_id"] == chat_data.user2_id and c["user2_id"] == current_user["uid"]))
            and c["task_id"] == chat_data.task_id
        ):
            return {"chat_id": c["id"]}

    chat_id = str(uuid4())
    new_chat = {
        "id": chat_id,
        "task_id": chat_data.task_id,
        "user1_id": current_user["uid"],
        "user2_id": chat_data.user2_id,
        "last_message_at": now(),
        "location_shared": False,
        "location_shared_by": None,
        "location_accepted_by": None,
        "created_at": now(),
        "updated_at": now()
    }

    add_document("chats", chat_id, new_chat)
    return {"chat_id": chat_id}


@router.get("/", response_model=List[dict])
async def list_chats(current_user=Depends(get_current_user)):
    chats = get_all_documents("chats")
    return [c for c in chats if current_user["uid"] in (c["user1_id"], c["user2_id"])]


@router.post("/send", response_model=MessageResponse)
async def send_message(message_data: MessageCreate, current_user=Depends(get_current_user)):
    chat = get_document("chats", message_data.chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if current_user["uid"] not in (chat["user1_id"], chat["user2_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    msg_data = {
        "chat_id": message_data.chat_id,
        "sender_uid": current_user["uid"],
        "content": message_data.content,
        "message_type": message_data.message_type,
        "image_url": message_data.image_url,
        "location_data": message_data.location_data
    }

    msg_id = send_message_to_db(message_data.chat_id, current_user["uid"], msg_data)

    return {
        "id": msg_id,
        "chat_id": message_data.chat_id,
        "sender_id": current_user["uid"],
        "content": message_data.content,
        "message_type": message_data.message_type,
        "image_url": message_data.image_url,
        "location_data": message_data.location_data,
        "read_at": None,
        "created_at": now()
    }


@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
async def get_messages(chat_id: str, current_user=Depends(get_current_user)):
    chat = get_document("chats", chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if current_user["uid"] not in (chat["user1_id"], chat["user2_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    messages = get_chat_messages(chat_id)
    return messages


@router.put("/{chat_id}/location")
async def share_location(
    chat_id: str,
    action: str,
    current_user=Depends(get_current_user)
):
    chat = get_document("chats", chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if action == "share":
        update_document("chats", chat_id, {
            "location_shared": True,
            "location_shared_by": current_user["uid"],
            "updated_at": now()
        })
    elif action == "accept":
        update_document("chats", chat_id, {
            "location_accepted_by": current_user["uid"],
            "updated_at": now()
        })
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    return {"message": "Location updated"}
