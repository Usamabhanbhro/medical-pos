from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
import bcrypt
from bson import ObjectId
from services.session_service import SessionService
from db.mongodb import get_database

router = APIRouter(prefix="/api/user", tags=["user"])

async def get_current_user(request: Request):
    """
    Dependency to get current user from cookie-based authentication
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token found"
        )
    
    # Validate token using SessionService
    payload = await SessionService.validate_session(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Get user data from database
    db = get_database()
    user_id = payload.get("user_id")
    email = payload.get("sub")
    
    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Return user data as dict
    return {
        "id": str(user["_id"]),
        "username": user["email"],  # Use email as username (consistent with JWT token)
        "email": user["email"],
        "user_type": user.get("user_type", "user")
    }

class UpdateEmailRequest(BaseModel):
    email: EmailStr

class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserProfileResponse(BaseModel):
    username: str
    email: str
    role: str

@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile information"""
    return UserProfileResponse(
        username=current_user["username"],
        email=current_user["email"],
        role=current_user["user_type"]
    )

@router.put("/update-email")
async def update_user_email(
    request: UpdateEmailRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user email address"""
    db = get_database()
    users_collection = db.users
    
    # Check if email already exists for another user
    print(f"[DEBUG] Checking email: {request.email} for user ID: {current_user['id']}")
    existing_user = await users_collection.find_one({
        "email": request.email,
        "_id": {"$ne": ObjectId(current_user["id"])}
    })
    print(f"[DEBUG] Existing user found: {existing_user is not None}")
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address is already registered to another user. Please choose a different email address."
        )
    
    # Update user email
    result = await users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"email": request.email}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update email address"
        )
    
    return {"message": "Email address updated successfully"}

@router.put("/update-password")
async def update_user_password(
    request: UpdatePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user password"""
    db = get_database()
    users_collection = db.users
    
    # Get current user data
    user = await users_collection.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify current password
    stored_password = user["password"]
    if isinstance(stored_password, str):
        stored_password = stored_password.encode('utf-8')
    
    if not bcrypt.checkpw(request.current_password.encode('utf-8'), stored_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Hash new password
    hashed_password = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt())
    
    # Store password as string (for consistency with existing data)
    hashed_password_str = hashed_password.decode('utf-8')
    
    # Update password
    result = await users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"password": hashed_password_str}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
    
    return {"message": "Password updated successfully"}