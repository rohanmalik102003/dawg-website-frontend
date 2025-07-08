# backend/routers/reviews.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import uuid4

from backend.database import get_all_documents, add_document, get_document, delete_document, now
from backend.routers.auth import get_current_user

router = APIRouter()


class ReviewCreate(BaseModel):
    task_id: str
    reviewed_id: str
    rating: int
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: str
    task_id: str
    reviewer_id: str
    reviewed_id: str
    rating: int
    comment: Optional[str]
    created_at: datetime


@router.post("/", response_model=ReviewResponse)
async def create_review(
    review_data: ReviewCreate,
    current_user=Depends(get_current_user)
):
    existing_reviews = get_all_documents("reviews")
    for r in existing_reviews:
        if r["task_id"] == review_data.task_id and r["reviewer_id"] == current_user["uid"]:
            raise HTTPException(status_code=400, detail="You already submitted a review for this task")

    review_id = str(uuid4())
    new_review = {
        "id": review_id,
        "task_id": review_data.task_id,
        "reviewer_id": current_user["uid"],
        "reviewed_id": review_data.reviewed_id,
        "rating": review_data.rating,
        "comment": review_data.comment,
        "created_at": now()
    }

    add_document("reviews", review_id, new_review)
    return new_review


@router.get("/", response_model=List[ReviewResponse])
async def get_reviews(
    user_id: Optional[str] = None,
    task_id: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    reviews = get_all_documents("reviews")

    if user_id:
        reviews = [r for r in reviews if r["reviewed_id"] == user_id]
    if task_id:
        reviews = [r for r in reviews if r["task_id"] == task_id]

    return sorted(reviews, key=lambda r: r.get("created_at", datetime.utcnow()), reverse=True)


@router.get("/me", response_model=List[ReviewResponse])
async def get_my_reviews(current_user=Depends(get_current_user)):
    reviews = get_all_documents("reviews")
    return [r for r in reviews if r["reviewed_id"] == current_user["uid"]]


@router.delete("/{review_id}")
async def delete_review(review_id: str, current_user=Depends(get_current_user)):
    review = get_document("reviews", review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if review["reviewer_id"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")

    delete_document("reviews", review_id)
    return {"message": "Review deleted successfully"}
