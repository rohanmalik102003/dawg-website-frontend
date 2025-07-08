from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from backend.database import get_document, get_all_documents, update_document
from backend.routers.auth import get_current_user

router = APIRouter()


class UserUpdate(BaseModel):
    display_name: Optional[str]
    avatar_url: Optional[str]
    location: Optional[str]
    radius: Optional[int]
    location_source: Optional[str]
    bio: Optional[str]


class UserResponse(BaseModel):
    uid: str
    username: str
    email: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    location: Optional[str]
    radius: Optional[int]
    location_source: Optional[str]
    bio: Optional[str]
    rating: float
    rating_count: int
    completed_tasks: int
    posted_tasks: int
    is_verified: bool
    created_at: datetime
    updated_at: datetime


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = Query(None),
    current_user=Depends(get_current_user)
):
    users = get_all_documents("users")

    # Optional search filter
    if search:
        users = [u for u in users if search.lower() in u["username"].lower() or search.lower() in u["email"].lower()]

    users = users[skip:skip + limit]
    return users


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user=Depends(get_current_user)):
    return current_user


@router.get("/{uid}", response_model=UserResponse)
async def get_user_by_uid(uid: str, current_user=Depends(get_current_user)):
    user = get_document("users", uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    update: UserUpdate,
    current_user=Depends(get_current_user)
):
    uid = current_user["uid"]
    user = get_document("users", uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updated_data = update.dict(exclude_unset=True)
    updated_data["updated_at"] = str(datetime.utcnow())

    update_document("users", uid, updated_data)
    updated_user = get_document("users", uid)
    return updated_user
