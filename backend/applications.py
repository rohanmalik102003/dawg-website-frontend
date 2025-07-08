from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
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


class ApplicationCreate(BaseModel):
    task_id: str
    message: str
    offered_price: Optional[float] = None


class ApplicationUpdate(BaseModel):
    status: str  # pending, accepted, rejected


class ApplicationResponse(BaseModel):
    id: str
    task_id: str
    applicant_id: str
    message: str
    offered_price: Optional[float]
    status: str
    created_at: datetime
    updated_at: datetime


class ApplicationWithDetails(ApplicationResponse):
    task: dict
    applicant: dict


@router.post("/", response_model=ApplicationResponse)
async def create_application(
    application_data: ApplicationCreate,
    current_user=Depends(get_current_user)
):
    task = get_document("tasks", application_data.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task["status"] != "open":
        raise HTTPException(status_code=400, detail="Task is not available for applications")

    if task["creator_uid"] == current_user["uid"]:
        raise HTTPException(status_code=400, detail="Cannot apply to your own task")

    applications = get_all_documents("applications")
    for app in applications:
        if app["task_id"] == application_data.task_id and app["applicant_id"] == current_user["uid"]:
            raise HTTPException(status_code=409, detail="You have already applied to this task")

    app_id = str(uuid4())

    new_app = {
        "id": app_id,
        "task_id": application_data.task_id,
        "applicant_id": current_user["uid"],
        "message": application_data.message,
        "offered_price": application_data.offered_price,
        "status": "pending",
        "created_at": now(),
        "updated_at": now()
    }

    add_document("applications", app_id, new_app)
    return new_app


@router.get("/", response_model=List[ApplicationWithDetails])
async def get_applications(
    task_id: Optional[str] = None,
    applicant_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    all_apps = get_all_documents("applications")
    filtered_apps = []

    for app in all_apps:
        if task_id and app["task_id"] != task_id:
            continue
        if applicant_id and app["applicant_id"] != applicant_id:
            continue
        if status and app["status"] != status:
            continue

        task = get_document("tasks", app["task_id"])
        if not task:
            continue
        if task["creator_uid"] != current_user["uid"] and app["applicant_id"] != current_user["uid"]:
            continue

        applicant = get_document("users", app["applicant_id"])
        filtered_apps.append({
            **app,
            "task": task,
            "applicant": applicant
        })

    return filtered_apps[offset:offset + limit]


@router.get("/{application_id}", response_model=ApplicationWithDetails)
async def get_application(
    application_id: str,
    current_user=Depends(get_current_user)
):
    app = get_document("applications", application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    task = get_document("tasks", app["task_id"])
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task["creator_uid"] != current_user["uid"] and app["applicant_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    applicant = get_document("users", app["applicant_id"])
    return {**app, "task": task, "applicant": applicant}


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application_status(
    application_id: str,
    application_update: ApplicationUpdate,
    current_user=Depends(get_current_user)
):
    app = get_document("applications", application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    task = get_document("tasks", app["task_id"])
    if not task or task["creator_uid"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    app["status"] = application_update.status
    app["updated_at"] = now()
    update_document("applications", application_id, app)

    if application_update.status == "accepted":
        task["status"] = "matched"
        task["tasker_uid"] = app["applicant_id"]
        task["updated_at"] = now()
        update_document("tasks", task["id"], task)

        for other in get_all_documents("applications"):
            if other["task_id"] == task["id"] and other["id"] != application_id and other["status"] == "pending":
                other["status"] = "rejected"
                other["updated_at"] = now()
                update_document("applications", other["id"], other)

    return app


@router.delete("/{application_id}")
async def delete_application(
    application_id: str,
    current_user=Depends(get_current_user)
):
    app = get_document("applications", application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app["applicant_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this application")

    if app["status"] != "pending":
        raise HTTPException(status_code=400, detail="Cannot withdraw processed application")

    delete_document("applications", application_id)
    return {"message": "Application withdrawn successfully"}


@router.get("/task/{task_id}", response_model=List[ApplicationWithDetails])
async def get_task_applications(
    task_id: str,
    current_user=Depends(get_current_user)
):
    task = get_document("tasks", task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task["creator_uid"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    apps = get_all_documents("applications")
    result = []
    for app in apps:
        if app["task_id"] == task_id:
            applicant = get_document("users", app["applicant_id"])
            result.append({**app, "task": task, "applicant": applicant})

    return result
