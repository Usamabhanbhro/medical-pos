import jwt
import os
from passlib.context import CryptContext
from dotenv import load_dotenv
from schemas.user import UserResponse
from db.mongodb import get_database
from services.session_service import SessionService
from datetime import datetime, timedelta

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def authenticate_user(email: str, password: str, force_login: bool = False):
    db = get_database()
    user = await db.users.find_one({"email": email})
    if not user or not pwd_context.verify(password, user['password']):
        return None
    
    user_id = str(user['_id'])
    token = await SessionService.create_session(user_id, user['email'], user['user_type'])
    import jwt as pyjwt
    try:
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get('exp')
    except Exception:
        exp = None

    print(f"[DEBUG] Login successful for {user['email']}, token: {token}")

    # Return user info with exp and token (token used server-side by login route to set cookie)
    return {
        "id": user_id,
        "email": user['email'],
        "user_type": user['user_type'],
        "token": token,
        "exp": exp
    }
