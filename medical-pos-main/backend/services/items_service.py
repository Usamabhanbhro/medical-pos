from typing import Optional, List, Tuple
from db.mongodb import get_database
from bson.objectid import ObjectId
from pymongo.errors import DuplicateKeyError


class DuplicateItemError(Exception):
    """Raised when attempting to create/update an item with a name that already exists."""
    pass


class ItemsService:
    @staticmethod
    async def list_items(q: Optional[str] = None, page: int = 1, per_page: int = 15) -> Tuple[List[dict], int]:
        db = get_database()
        filter_query = {}
        if q:
            # simple case-insensitive substring search on name
            filter_query = {"name": {"$regex": q, "$options": "i"}}

        total = await db.items.count_documents(filter_query)
        skip = max(0, (page - 1)) * per_page
        cursor = db.items.find(filter_query).sort('name', 1).skip(skip).limit(per_page)
        items = await cursor.to_list(length=per_page)
        return items, total

    @staticmethod
    async def get_item(item_id: str) -> Optional[dict]:
        db = get_database()
        item = await db.items.find_one({"_id": ObjectId(item_id)})
        if item:
            item['id'] = str(item['_id'])
            del item['_id']
        return item

    @staticmethod
    async def create_item(data: dict) -> dict:
        db = get_database()
        try:
            res = await db.items.insert_one(data)
        except DuplicateKeyError as e:
            # normalize and raise our own error for the route to handle
            raise DuplicateItemError("Item with this name already exists") from e
        item = await db.items.find_one({"_id": res.inserted_id})
        item['id'] = str(item['_id'])
        del item['_id']
        return item

    @staticmethod
    async def update_item(item_id: str, data: dict) -> Optional[dict]:
        db = get_database()
        try:
            await db.items.update_one({"_id": ObjectId(item_id)}, {"$set": data})
        except DuplicateKeyError as e:
            # trying to rename to an existing name
            raise DuplicateItemError("Item with this name already exists") from e
        item = await db.items.find_one({"_id": ObjectId(item_id)})
        if item:
            item['id'] = str(item['_id'])
            del item['_id']
        return item

    @staticmethod
    async def delete_item(item_id: str) -> bool:
        db = get_database()
        res = await db.items.delete_one({"_id": ObjectId(item_id)})
        return res.deleted_count == 1
