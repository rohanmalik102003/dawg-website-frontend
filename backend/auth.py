# backend/routers/auth.py

from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
from firebase_admin import auth as firebase_auth
from uuid import uuid4

from backend.database import (
    get_document,
    add_document,
    get_all_documents,
    update_document,
    now
)

router = APIRouter()


class FirebaseUser(BaseModel):
    uid: str
    email: EmailStr
    phone_number: Optional[str] = None  
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


@router.post("/register")
async def register_user(user: FirebaseUser):
    """Register new Firebase-authenticated user"""

    existing_users = get_all_documents("users")
    for u in existing_users:
        if not u:
            continue
        if u.get("uid") == user.uid or u.get("email") == user.email or u.get("username") == user.username:
            raise HTTPException(status_code=409, detail="User already exists")
        if user.phone_number and u.get("phone_number") == user.phone_number:
            raise HTTPException(status_code=409, detail="Phone number already in use")

    new_user = {
        "uid": user.uid,
        "email": user.email,
        "username": user.username,
        "phone_number": user.phone_number or "",
        "display_name": user.display_name or "",
        "avatar_url": user.avatar_url or "",
        "location": "",
        "radius": 20,
        "location_source": "manual",
        "bio": "",
        "rating": 0.0,
        "rating_count": 0,
        "completed_tasks": 0,
        "posted_tasks": 0,
        "is_verified": False,
        "created_at": now(),
        "updated_at": now(),
        "last_notification_read_at": now()
    }

    add_document("users", user.uid, new_user)
    return {"message": "User registered successfully", "user": new_user}


@router.post("/login")
async def login_user(authorization: str = Header(...)):
    """Login with Firebase ID token"""

    id_token = extract_token(authorization)

    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

    user = get_document("users", uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Login successful", "user": user}


@router.post("/upload-avatar")
async def upload_avatar(
    avatar_url: str = Header(...),
    authorization: str = Header(...)
):
    """Save avatar URL uploaded via Firebase Storage"""

    id_token = extract_token(authorization)

    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

    user = get_document("users", uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_document("users", uid, {
        "avatar_url": avatar_url,
        "updated_at": now()
    })

    return {"message": "Avatar URL saved", "avatar_url": avatar_url}


def get_current_user(authorization: str = Header(...)):
    """Extract and verify Firebase user from Authorization header"""
    id_token = extract_token(authorization)

    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

    user = get_document("users", uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


def extract_token(authorization: str) -> str:
    """Safely extract Bearer token from Authorization header"""
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    parts = authorization.split(" ")
    if len(parts) != 2:
        raise HTTPException(status_code=401, detail="Invalid Authorization header structure")
    
    return parts[1]
