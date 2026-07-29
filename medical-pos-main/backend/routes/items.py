from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, StrictFloat
from typing import List, Optional
from pydantic import BaseModel
from services.items_service import ItemsService, DuplicateItemError
from bson.objectid import ObjectId


class ItemIn(BaseModel):
    name: str = Field(..., min_length=1)
    # Use StrictFloat to prevent automatic coercion from strings -> floats.
    # This ensures payloads like {"cost_price": "2000"} are rejected with 422.
    cost_price: StrictFloat = Field(..., ge=0)
    sell_price: StrictFloat = Field(..., ge=0)


class ItemOut(ItemIn):
    id: str


class ItemsListOut(BaseModel):
    items: List[ItemOut]
    total: int


router = APIRouter()


@router.get('/', response_model=ItemsListOut)
async def list_items(q: Optional[str] = None, page: int = 1, per_page: int = 15):
    items, total = await ItemsService.list_items(q=q, page=page, per_page=per_page)
    out_items = [{
        "id": str(i["_id"]),
        "name": i.get("name"),
        "cost_price": i.get("cost_price", 0.0),
        "sell_price": i.get("sell_price", 0.0),
    } for i in items]
    return {"items": out_items, "total": int(total)}


@router.post('/', response_model=ItemOut)
async def create_item(payload: ItemIn):
    data = payload.dict()
    try:
        created = await ItemsService.create_item(data)
    except DuplicateItemError:
        raise HTTPException(status_code=409, detail="Item with this name already exists")
    return {"id": created["id"], "name": created["name"], "cost_price": created.get("cost_price", 0.0), "sell_price": created.get("sell_price", 0.0)}


@router.put('/{item_id}', response_model=ItemOut)
async def update_item(item_id: str, payload: ItemIn):
    try:
        updated = await ItemsService.update_item(item_id, payload.dict())
    except DuplicateItemError:
        raise HTTPException(status_code=409, detail="Item with this name already exists")
    except Exception:
        raise HTTPException(status_code=404, detail="Item not found")
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"id": updated["id"], "name": updated.get("name"), "cost_price": updated.get("cost_price", 0.0), "sell_price": updated.get("sell_price", 0.0)}


@router.delete('/{item_id}')
async def delete_item(item_id: str):
    try:
        ok = await ItemsService.delete_item(item_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Item not found")
    if not ok:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"deleted": True}
