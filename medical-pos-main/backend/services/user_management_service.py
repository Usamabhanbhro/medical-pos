from typing import List, Optional, Dict, Union
from motor.motor_asyncio import AsyncIOMotorDatabase
from db.mongodb import get_database
from schemas.user import UserCreate, UserType
from passlib.context import CryptContext
from bson import ObjectId
from pymongo import ReturnDocument
from services.session_service import SessionService
import re


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserManagementService:
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db or get_database()
        self.collection = self.db.users

    @staticmethod
    def _normalize_user_type(value: Union[str, UserType, None]) -> str:
        if isinstance(value, UserType):
            return value.value
        if isinstance(value, str):
            return value.split(".")[-1] if value.startswith("UserType.") else value
        return UserType.salesman.value

    @classmethod
    def _serialize(cls, user: Dict) -> Dict[str, str]:
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "user_type": cls._normalize_user_type(user.get("user_type")),
        }

    async def search_users(
        self,
        query: str = "",
        user_type: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[Dict[str, str]]:
        """Search users by email with optional role filtering."""

        filters: Dict[str, Dict] = {}
        if query:
            filters["email"] = {"$regex": re.escape(query), "$options": "i"}
        if user_type:
            normalized_role = self._normalize_user_type(user_type)
            filters["user_type"] = {"$in": [normalized_role, f"UserType.{normalized_role}"]}

        cursor = (
            self.collection.find(filters)
            .sort("email", 1)
            .skip(max(skip, 0))
            .limit(max(limit, 1))
        )
        users = await cursor.to_list(length=limit)
        return [self._serialize(user) for user in users]

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, str]]:
        """Return a single user by Mongo ID."""

        try:
            user = await self.collection.find_one({"_id": ObjectId(user_id)})
            if user:
                return self._serialize(user)
        except Exception as exc:  # pragma: no cover - defensive logging
            print(f"[UserManagementService] Error fetching user {user_id}: {exc}")
        return None

    async def create_user(self, user_data: UserCreate) -> Dict[str, str]:
        """Create and return a new user."""

        normalized_email = user_data.email.lower()
        existing = await self.collection.find_one({"email": normalized_email})
        if existing:
            raise ValueError("User with this email already exists")

        hashed_password = pwd_context.hash(user_data.password)
        user_type_value = self._normalize_user_type(user_data.user_type)

        doc = {
            "email": normalized_email,
            "password": hashed_password,
            "user_type": user_type_value,
        }

        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return self._serialize(doc)

    async def update_user(self, user_id: str, update_data: Dict[str, Optional[str]]) -> Optional[Dict[str, str]]:
        """Update user details and return the updated record."""

        clean_data = {k: v for k, v in update_data.items() if v not in (None, "")}
        if not clean_data:
            return await self.get_user_by_id(user_id)

        if "email" in clean_data:
            normalized_email = clean_data["email"].lower()
            conflict = await self.collection.find_one(
                {"email": normalized_email, "_id": {"$ne": ObjectId(user_id)}}
            )
            if conflict:
                raise ValueError("Another user already uses this email")
            clean_data["email"] = normalized_email

        if "password" in clean_data:
            clean_data["password"] = pwd_context.hash(clean_data["password"])

        if "user_type" in clean_data:
            clean_data["user_type"] = self._normalize_user_type(clean_data["user_type"])

        try:
            updated = await self.collection.find_one_and_update(
                {"_id": ObjectId(user_id)},
                {"$set": clean_data},
                return_document=ReturnDocument.AFTER,
            )
            if updated:
                await SessionService.invalidate_user_sessions(user_id)
                return self._serialize(updated)
        except ValueError:
            raise
        except Exception as exc:
            print(f"[UserManagementService] Error updating user {user_id}: {exc}")
        return None

    async def delete_user(self, user_id: str) -> bool:
        """Delete a user and invalidate active sessions."""

        try:
            result = await self.collection.delete_one({"_id": ObjectId(user_id)})
            deleted = result.deleted_count > 0
            if deleted:
                await SessionService.invalidate_user_sessions(user_id)
            return deleted
        except Exception as exc:
            print(f"[UserManagementService] Error deleting user {user_id}: {exc}")
            return False
