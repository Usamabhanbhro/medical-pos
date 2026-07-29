from fastapi import APIRouter, HTTPException
from db.mongodb import db

router = APIRouter()

@router.get("/", response_model=dict)
async def get_store_details():
    doc = await db.settings.find_one({"_id": "store"})
    if not doc:
        return {"name": "", "address": "", "phone": ""}

    name = doc.get("name") or doc.get("storeName", "")
    address = doc.get("address") or doc.get("storeAddress", "")
    phone = doc.get("phone") or doc.get("storePhone", "")

    return {"name": name, "address": address, "phone": phone}

@router.post("/", response_model=dict)
async def set_store_details(data: dict):
    name = data.get("name") or data.get("storeName", "")
    address = data.get("address") or data.get("storeAddress", "")
    phone = data.get("phone") or data.get("storePhone", "")

    await db.settings.update_one(
        {"_id": "store"},
        {"$set": {
            "name": name,
            "address": address,
            "phone": phone,
            "storeName": name,
            "storeAddress": address,
            "storePhone": phone,
        }},
        upsert=True
    )
    return {"name": name, "address": address, "phone": phone}
