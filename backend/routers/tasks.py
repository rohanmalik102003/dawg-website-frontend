# backend/routers/tasks.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import uuid4

from backend.database import (
    get_document,
    get_all_documents,
    add_document,
    update_document,
    delete_document,
    now
)
from backend.routers.auth import get_current_user

router = APIRouter()


class TaskCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    budget: Optional[float]
    images: Optional[List[str]] = []
    deadline: Optional[datetime]
    preferred_time: Optional[str]
    time_flexible: bool = False


class TaskUpdate(BaseModel):
    title: Optional[str]
    description: Optional[str]
    location: Optional[str]
    category: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    budget: Optional[float]
    deadline: Optional[datetime]
    preferred_time: Optional[str]
    time_flexible: Optional[bool]
    status: Optional[str]
    images: Optional[List[str]]


class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    budget: Optional[float]
    status: str
    creator_uid: str
    tasker_uid: Optional[str]
    images: List[str]
    deadline: Optional[datetime]
    preferred_time: Optional[str]
    time_flexible: bool
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]


@router.post("/", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    current_user=Depends(get_current_user)
):
    task_id = str(uuid4())

    new_task = {
        "id": task_id,
        "title": task_data.title,
        "description": task_data.description,
        "category": task_data.category,
        "location": task_data.location,
        "latitude": task_data.latitude,
        "longitude": task_data.longitude,
        "budget": task_data.budget,
        "status": "open",
        "creator_uid": current_user["uid"],
        "tasker_uid": None,
        "images": task_data.images or [],
        "deadline": task_data.deadline,
        "preferred_time": task_data.preferred_time,
        "time_flexible": task_data.time_flexible,
        "created_at": now(),
        "updated_at": now(),
        "completed_at": None
    }

    add_document("tasks", task_id, new_task)
    return new_task


@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user=Depends(get_current_user)
):
    tasks = get_all_documents("tasks")

    filtered = [
        task for task in tasks
        if (not category or task["category"] == category) and
           (not status_filter or task["status"] == status_filter)
    ]

    return filtered[skip:skip + limit]


@router.get("/my-posted", response_model=List[TaskResponse])
async def get_my_posted_tasks(current_user=Depends(get_current_user)):
    tasks = get_all_documents("tasks")
    return [t for t in tasks if t["creator_uid"] == current_user["uid"]]


@router.get("/my-assigned", response_model=List[TaskResponse])
async def get_my_assigned_tasks(current_user=Depends(get_current_user)):
    tasks = get_all_documents("tasks")
    return [t for t in tasks if t.get("tasker_uid") == current_user["uid"]]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, current_user=Depends(get_current_user)):
    task = get_document("tasks", task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    update_data: TaskUpdate,
    current_user=Depends(get_current_user)
):
    task = get_document("tasks", task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["creator_uid"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")

    update_dict = update_data.dict(exclude_unset=True)
    update_dict["updated_at"] = now()

    if update_dict.get("status") == "completed":
        update_dict["completed_at"] = now()

    update_document("tasks", task_id, update_dict)
    return get_document("tasks", task_id)


@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user=Depends(get_current_user)):
    task = get_document("tasks", task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["creator_uid"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")

    delete_document("tasks", task_id)
    return {"message": "Task deleted successfully"}
