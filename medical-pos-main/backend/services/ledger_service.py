from typing import Optional, List, Tuple, Dict, Any
from db.mongodb import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from pymongo import ReturnDocument
import datetime
import sys
import os

# Add parent directory to path to import utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.datetime_utils import get_pakistan_time


class LedgerService:
    def __init__(self, db: AsyncIOMotorDatabase = None):
        self.db = db or get_database()
        self.collection = self.db.ledger

    async def create_entry(self, entry_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new ledger entry"""
        now = get_pakistan_time()  # Use Pakistan time instead of UTC
        
        # Use provided date or current date
        entry_date = entry_data.get('date')
        if entry_date and isinstance(entry_date, datetime.datetime):
            entry_date = entry_date
        else:
            entry_date = now
        
        doc = {
            'description': entry_data.get('description'),
            'amount': float(entry_data.get('amount', 0)),
            'category': entry_data.get('category'),  # 'official' or 'unofficial'
            'date': entry_date,
            'notes': entry_data.get('notes'),
            'created_at': now,
            'updated_at': now,
        }
        
        result = await self.collection.insert_one(doc)
        doc['id'] = str(result.inserted_id)
        doc.pop('_id', None)
        
        return doc

    async def list_entries(
        self,
        category: Optional[List[str]] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        per_page: int = 15
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List ledger entries with optional filters"""
        query = {}
        
        # Category filter - handle multiple categories
        if category:
            if isinstance(category, list) and len(category) > 0:
                query['category'] = {'$in': category}
            elif isinstance(category, str):
                query['category'] = category
        
        # Date range filter
        if date_from or date_to:
            date_query = {}
            if date_from:
                try:
                    from_date = datetime.datetime.strptime(date_from, '%Y-%m-%d')
                    date_query['$gte'] = from_date
                except ValueError:
                    pass
            if date_to:
                try:
                    to_date = datetime.datetime.strptime(date_to, '%Y-%m-%d')
                    # Add one day and subtract one second to include the entire day
                    to_date = to_date + datetime.timedelta(days=1) - datetime.timedelta(seconds=1)
                    date_query['$lte'] = to_date
                except ValueError:
                    pass
            if date_query:

                query['date'] = date_query
        
        # Search query filter (search in description and notes)
        if search_query:
            query['$or'] = [
                {'description': {'$regex': search_query, '$options': 'i'}},
                {'notes': {'$regex': search_query, '$options': 'i'}}
            ]
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * per_page
        cursor = self.collection.find(query).sort('date', -1).skip(skip).limit(per_page)
        entries = await cursor.to_list(length=per_page)
        
        # Convert ObjectId to string
        for entry in entries:
            entry['id'] = str(entry['_id'])
            entry.pop('_id', None)
        
        return entries, total

    async def get_entry(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific ledger entry"""
        try:
            entry = await self.collection.find_one({'_id': ObjectId(entry_id)})
            if entry:
                entry['id'] = str(entry['_id'])
                entry.pop('_id', None)
            return entry
        except Exception:
            return None

    async def update_entry(
        self,
        entry_id: str,
        entry_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update a ledger entry"""
        try:
            entry_data['updated_at'] = get_pakistan_time()  # Use Pakistan time instead of UTC
            
            result = await self.collection.find_one_and_update(
                {'_id': ObjectId(entry_id)},
                {'$set': entry_data},
                return_document=ReturnDocument.AFTER
            )
            
            if result:
                result['id'] = str(result['_id'])
                result.pop('_id', None)
            
            return result
        except Exception:
            return None

    async def delete_entry(self, entry_id: str) -> bool:
        """Delete a ledger entry"""
        try:
            result = await self.collection.delete_one({'_id': ObjectId(entry_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    async def get_summary(
        self,
        category: Optional[List[str]] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get summary statistics for ledger entries"""
        query = {}
        
        # Category filter - handle multiple categories
        if category:
            if isinstance(category, list) and len(category) > 0:
                query['category'] = {'$in': category}
            elif isinstance(category, str):
                query['category'] = category
        
        # Date range filter
        if date_from or date_to:
            date_query = {}
            if date_from:
                try:
                    from_date = datetime.datetime.strptime(date_from, '%Y-%m-%d')
                    date_query['$gte'] = from_date
                except ValueError:
                    pass
            if date_to:
                try:
                    to_date = datetime.datetime.strptime(date_to, '%Y-%m-%d')
                    to_date = to_date + datetime.timedelta(days=1) - datetime.timedelta(seconds=1)
                    date_query['$lte'] = to_date
                except ValueError:
                    pass
            if date_query:
                query['date'] = date_query
        
        # Aggregate pipeline
        pipeline = [
            {'$match': query},
            {
                '$group': {
                    '_id': None,
                    'total_amount': {'$sum': '$amount'},
                    'total_entries': {'$sum': 1},
                    'avg_amount': {'$avg': '$amount'},
                    'official_total': {
                        '$sum': {
                            '$cond': [
                                {'$eq': ['$category', 'official']},
                                '$amount',
                                0
                            ]
                        }
                    },
                    'unofficial_total': {
                        '$sum': {
                            '$cond': [
                                {'$eq': ['$category', 'unofficial']},
                                '$amount',
                                0
                            ]
                        }
                    }
                }
            }
        ]
        
        result = await self.collection.aggregate(pipeline).to_list(length=1)
        
        if result:
            return {
                'total_amount': result[0].get('total_amount', 0),
                'total_entries': result[0].get('total_entries', 0),
                'avg_amount': result[0].get('avg_amount', 0),
                'official_total': result[0].get('official_total', 0),
                'unofficial_total': result[0].get('unofficial_total', 0)
            }
        else:
            return {
                'total_amount': 0,
                'total_entries': 0,
                'avg_amount': 0,
                'official_total': 0,
                'unofficial_total': 0
            }
