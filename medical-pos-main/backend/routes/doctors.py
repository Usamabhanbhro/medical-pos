from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, StrictFloat
from typing import List, Optional
from services.doctor_service import DoctorService, DuplicateDoctorError
from bson.objectid import ObjectId


class DoctorIn(BaseModel):
    name: str = Field(..., min_length=1)
    commission_type: str = Field(..., pattern="^(percentage|flat)$")
    commission_value: StrictFloat = Field(..., ge=0)


class DoctorOut(DoctorIn):
    id: str


class DoctorsListOut(BaseModel):
    doctors: List[DoctorOut]
    total: int


router = APIRouter()


@router.get('/', response_model=DoctorsListOut)
async def list_doctors(q: Optional[str] = None, page: int = 1, per_page: int = 15):
    doctors, total = await DoctorService.list_doctors(q=q, page=page, per_page=per_page)
    out_doctors = [{
        "id": str(d["_id"]),
        "name": d.get("name"),
        "commission_type": d.get("commission_type"),
        "commission_value": d.get("commission_value", 0.0),
    } for d in doctors]
    return {"doctors": out_doctors, "total": int(total)}


@router.post('/', response_model=DoctorOut)
async def create_doctor(payload: DoctorIn):
    data = payload.dict()
    try:
        created = await DoctorService.create_doctor(data)
    except DuplicateDoctorError:
        raise HTTPException(status_code=409, detail="Doctor with this name already exists")
    return {
        "id": created["id"],
        "name": created["name"],
        "commission_type": created["commission_type"],
        "commission_value": created.get("commission_value", 0.0)
    }


@router.put('/{doctor_id}', response_model=DoctorOut)
async def update_doctor(doctor_id: str, payload: DoctorIn):
    data = payload.dict()
    try:
        updated = await DoctorService.update_doctor(doctor_id, data)
    except DuplicateDoctorError:
        raise HTTPException(status_code=409, detail="Doctor with this name already exists")
    if not updated:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {
        "id": updated["id"],
        "name": updated["name"],
        "commission_type": updated["commission_type"],
        "commission_value": updated.get("commission_value", 0.0)
    }


@router.delete('/{doctor_id}')
async def delete_doctor(doctor_id: str):
    deleted = await DoctorService.delete_doctor(doctor_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {"message": "Doctor deleted successfully"}
