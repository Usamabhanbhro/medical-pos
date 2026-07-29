from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum

class UserType(str, Enum):
    salesman = "salesman"
    admin = "admin"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    user_type: Optional[UserType] = UserType.salesman  

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: Optional[str] = None 
    email: str
    user_type: UserType
    token: Optional[str] = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class ValidateResponse(BaseModel):
    valid: bool
    username: str
    id: str
    user_type: UserType


class UserUpdateRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    user_type: Optional[UserType] = None

class BulkUserAction(BaseModel):
    user_ids: List[str]
    reason: Optional[str] = None


class UserManagementResponse(BaseModel):
    id: str
    email: str
    user_type: UserType