from fastapi import APIRouter, Response, Request, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel
from passlib.context import CryptContext
from db.mongodb import get_database
from services.login_service import authenticate_user
from schemas.user import UserResponse, LoginRequest, ValidateResponse
from services.user_management_service import UserManagementService
from services.session_service import SessionService
from datetime import timedelta
import os

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

print(f"[DEBUG] SECRET_KEY: {SECRET_KEY}")
print(f"[DEBUG] ALGORITHM: {ALGORITHM}")
print(f"[DEBUG] ACCESS_TOKEN_EXPIRE_MINUTES: {ACCESS_TOKEN_EXPIRE_MINUTES}")


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/user/login")

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Helper to create JWT token
def create_access_token(data: dict):
    from datetime import datetime, timedelta
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp())})  # Convert to Unix timestamp
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Login route 
@router.post("/login")
async def login(request: LoginRequest, response: Response):
    username = request.username
    password = request.password
    user = await authenticate_user(username, password, force_login=False)
    if not user:
        # Return a 400 Bad Request with an explicit message so the frontend
        # can show a user-friendly error for wrong username/password.
        raise HTTPException(status_code=400, detail="Invalid username or password")
    
    print(f"[DEBUG] User {username} logged in successfully.")
    # extract token whether `user` is a pydantic model/object or a dict
    token_val = None
    try:
        token_val = getattr(user, 'token')
    except Exception:
        if isinstance(user, dict):
            token_val = user.get('token')

    if not token_val:
        raise HTTPException(status_code=500, detail="Login succeeded but token missing")

    response.set_cookie(
        key="access_token",
        value=token_val,
        httponly=True,
        secure=True,
        max_age = ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        samesite="none"  # Allow cross-domain cookies for HTTPS
    )

    # Build response without token (do not expose raw token to client-side JS)
    try:
        user_id = getattr(user, 'id')
        email = getattr(user, 'email')
        user_type = getattr(user, 'user_type')
    except Exception:
        user_id = user.get('id') if isinstance(user, dict) else None
        email = user.get('email') if isinstance(user, dict) else None
        user_type = user.get('user_type') if isinstance(user, dict) else None

    # read exp if available from authenticate_user result or token payload
    exp_val = None
    try:
        exp_val = getattr(user, 'exp')
    except Exception:
        if isinstance(user, dict):
            exp_val = user.get('exp')

    return {
        "id": user_id,
        "email": email,
        "user_type": user_type,
        "exp": exp_val
    }


# Token validation route (updated to use SessionService)
@router.get("/validate", response_model=ValidateResponse)
async def validate_token(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="No token found")
    
    # Use SessionService for validation
    payload = await SessionService.validate_session(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    username = payload.get("sub")
    user_id = payload.get("user_id")
    
    if not username or not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    db = get_database()
    user = await db.users.find_one({"email": username})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    exp = payload.get("exp")
    return {
        "valid": True,
        "username": username,
        "id": user_id,
        "user_type": user.get("user_type", "user"),
        "exp": exp
    }

# Logout route (updated to invalidate session)
@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("access_token")
    if token:
        # Invalidate the specific session
        try:
            payload = await SessionService.validate_session(token)
            if payload:
                user_id = payload.get("user_id")
                if user_id:
                    # Invalidate just this session, not all user sessions
                    db = get_database()
                    await db.sessions.update_one(
                        {"token": token, "user_id": user_id},
                        {"$set": {"is_active": False, "logged_out_at": __import__('time').time()}}
                    )
                    print(f"[DEBUG] Invalidated session for user {user_id}")
        except Exception as e:
            print(f"[DEBUG] Error invalidating session: {e}")
    
    response.delete_cookie(
        key="access_token", 
        path="/",
        secure=True,
        samesite="none"
    )
    return {"message": "Logged out"}
