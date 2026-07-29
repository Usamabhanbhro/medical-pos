from typing import Optional, List, Tuple
from db.mongodb import get_database
from bson.objectid import ObjectId
from pymongo.errors import DuplicateKeyError


class DuplicateDoctorError(Exception):
    """Raised when attempting to create/update a doctor with a name that already exists."""
    pass


class DoctorService:
    @staticmethod
    async def list_doctors(q: Optional[str] = None, page: int = 1, per_page: int = 15) -> Tuple[List[dict], int]:
        db = get_database()
        filter_query = {}
        if q:
            # simple case-insensitive substring search on name
            filter_query = {"name": {"$regex": q, "$options": "i"}}

        total = await db.doctors.count_documents(filter_query)
        skip = max(0, (page - 1)) * per_page
        cursor = db.doctors.find(filter_query).sort('name', 1).skip(skip).limit(per_page)
        doctors = await cursor.to_list(length=per_page)
        return doctors, total

    @staticmethod
    async def get_doctor(doctor_id: str) -> Optional[dict]:
        db = get_database()
        doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
        if doctor:
            doctor['id'] = str(doctor['_id'])
            del doctor['_id']
        return doctor

    @staticmethod
    async def create_doctor(data: dict) -> dict:
        db = get_database()
        try:
            res = await db.doctors.insert_one(data)
        except DuplicateKeyError as e:
            # normalize and raise our own error for the route to handle
            raise DuplicateDoctorError("Doctor with this name already exists") from e
        doctor = await db.doctors.find_one({"_id": res.inserted_id})
        doctor['id'] = str(doctor['_id'])
        del doctor['_id']
        return doctor

    @staticmethod
    async def update_doctor(doctor_id: str, data: dict) -> Optional[dict]:
        db = get_database()
        try:
            res = await db.doctors.update_one({"_id": ObjectId(doctor_id)}, {"$set": data})
        except DuplicateKeyError as e:
            raise DuplicateDoctorError("Doctor with this name already exists") from e
        if res.modified_count == 0:
            return None
        doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
        if doctor:
            doctor['id'] = str(doctor['_id'])
            del doctor['_id']
        return doctor

    @staticmethod
    async def delete_doctor(doctor_id: str) -> bool:
        db = get_database()
        res = await db.doctors.delete_one({"_id": ObjectId(doctor_id)})
        return res.deleted_count > 0
