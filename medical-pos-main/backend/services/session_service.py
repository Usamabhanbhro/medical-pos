from db.mongodb import get_database
from datetime import datetime, timedelta
import time
import jwt
import os
from typing import Optional

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

class SessionService:
    @staticmethod
    async def has_active_session(user_id: str) -> bool:
        """Check if user has an active session"""
        db = get_database()
        
        # Look for active sessions in the sessions collection
        current_time = time.time()
        active_session = await db.sessions.find_one({
            "user_id": user_id,
            "expires_at": {"$gt": current_time},
            "is_active": True
        })
        
        return active_session is not None
    
    @staticmethod
    async def create_session(user_id: str, email: str, user_type: str) -> str:
        """Create a new session and return JWT token"""
        db = get_database()
        
        # Create token
        current_time = time.time()
        expire_time = current_time + (ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        
        token_data = {
            "sub": email,
            "user_type": user_type,
            "user_id": user_id,
            "exp": int(expire_time)
        }
        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
        
        # Store session in database
        session_doc = {
            "user_id": user_id,
            "token": token,
            "created_at": current_time,
            "expires_at": expire_time,
            "is_active": True,
            "last_activity": current_time
        }
        
        await db.sessions.insert_one(session_doc)
        
        print(f"[SessionService] Created new session for user {user_id}")
        return token
    
    @staticmethod
    async def invalidate_user_sessions(user_id: str):
        """Invalidate all active sessions for a user"""
        db = get_database()
        
        # Mark all sessions as inactive
        result = await db.sessions.update_many(
            {"user_id": user_id, "is_active": True},
            {"$set": {"is_active": False, "invalidated_at": time.time()}}
        )
        
        print(f"[SessionService] Invalidated {result.modified_count} sessions for user {user_id}")
        
    @staticmethod
    async def validate_session(token: str) -> Optional[dict]:
        """Validate if session is still active"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("user_id")

            if not user_id:
                return None

            db = get_database()
            session = await db.sessions.find_one({
                "token": token,
                "user_id": user_id,
                "is_active": True,
                "expires_at": {"$gt": time.time()}
            })

            if session:
                # Update last activity
                await db.sessions.update_one(
                    {"_id": session["_id"]},
                    {"$set": {"last_activity": time.time()}}
                )
                return payload

            return None
        except Exception:
            # Any decode/validation error from PyJWT
            return None
    
    @staticmethod
    async def cleanup_expired_sessions():
        """Clean up expired sessions"""
        db = get_database()
        current_time = time.time()
        
        result = await db.sessions.delete_many({
            "expires_at": {"$lt": current_time}
        })
        
        print(f"[SessionService] Cleaned up {result.deleted_count} expired sessions")
