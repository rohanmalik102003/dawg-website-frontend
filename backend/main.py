"""
Main FastAPI application for DoIt backend
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from backend import database  # Use Firebase-integrated database.py
from backend.routers import auth, users, tasks, applications, chat, reviews, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    database.db  # Initialize Firestore client
    print(" Firebase Firestore client ready")
    yield
    # Shutdown
    print("Application shutting down")


# Create FastAPI app
app = FastAPI(
    title="DoIt API",
    description="Task marketplace backend API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to specific domains in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])


@app.get("/")
async def root():
    return {"message": "DoIt API is running", "version": "1.0.0"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
