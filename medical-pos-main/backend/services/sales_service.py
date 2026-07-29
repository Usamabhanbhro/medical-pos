from typing import Optional, Dict, Any
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


class SalesService:
    def __init__(self, db: AsyncIOMotorDatabase = None):
        self.db = db or get_database()
        self.collection = self.db.sales
        self._counters = self.db.counters

    async def _get_next_sale_id(self) -> str:
        """
        Generate a year-based sale ID like 2025-000123.
        This format:
        - Includes year for easy identification and filtering
        - Resets counter each year (prevents unlimited growth)
        - Supports up to 999,999 sales per year
        - Future-proof and scalable
        """
        current_year = get_pakistan_time().year
        counter_id = f"sales_{current_year}"
        
        counter = await self._counters.find_one_and_update(
            {"_id": counter_id},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        
        if not counter:
            return f"{current_year}-000001"

        next_seq = counter.get("seq", 1)
        
        # On first use of a new year counter, check if we need to migrate from old format
        if next_seq == 1:
            # Count existing sales for this year to align counter
            start_of_year = datetime.datetime(current_year, 1, 1)
            existing_count = await self.collection.count_documents({
                'created_at': {'$gte': start_of_year}
            })
            if existing_count >= next_seq:
                counter = await self._counters.find_one_and_update(
                    {"_id": counter_id},
                    {"$set": {"seq": existing_count + 1}},
                    return_document=ReturnDocument.AFTER,
                )
                next_seq = counter.get("seq", existing_count + 1)

        # Format: YEAR-NNNNNN (6 digits allows up to 999,999 sales per year)
        return f"{current_year}-{next_seq:06d}"

    async def create_sale(self, sale_data: Dict[str, Any]) -> Dict[str, Any]:
        # Generate a short, sequential sale id for readability
        sale_id = sale_data.get('sale_id')
        if not sale_id:
            sale_id = await self._get_next_sale_id()
        sale_id = str(sale_id).strip()
        now = get_pakistan_time()  # Use Pakistan time instead of UTC
        patient_gender = (sale_data.get('patient_gender') or None)
        hospital_name = (sale_data.get('hospital_name') or None)

        # Handle both single test (old format) and multiple tests (new format)
        tests = sale_data.get('tests', [])
        if not tests and sale_data.get('test_name'):
            # Convert old single test format to new format
            tests = [{
                'test_name': sale_data.get('test_name'),
                'amount': float(sale_data.get('subtotal', 0))
            }]
        
        # Calculate totals from tests if provided, otherwise use legacy values
        if tests:
            # Handle both old format (test_name, amount) and new format (name, sell_price)
            subtotal = 0
            total_cost = 0
            for test in tests:
                if 'sell_price' in test:
                    # New format
                    subtotal += float(test.get('sell_price', 0))
                    total_cost += float(test.get('cost_price', 0))
                else:
                    # Old format
                    subtotal += float(test.get('amount', 0))
        else:
            subtotal = float(sale_data.get('subtotal', 0))
            total_cost = 0
        
        discount_amount = float(sale_data.get('discount_amount', 0))
        # Use provided final_amount from frontend, or calculate if not provided
        final_amount = float(sale_data.get('final_amount', subtotal - discount_amount))

        # Calculate doctor commission amount
        commission_type = sale_data.get('doctor_commission_type')
        commission_value = sale_data.get('doctor_commission_value')
        commission_value = float(commission_value) if commission_value is not None else 0.0
        if commission_type and commission_value > 0:
            if commission_type == 'percentage':
                doctor_commission_amount = (final_amount * commission_value) / 100
            else:
                doctor_commission_amount = commission_value
        else:
            doctor_commission_amount = 0
        
        # Handle partial payment
        is_partial = sale_data.get('is_partial', False)
        paid_amount = float(sale_data.get('paid_amount', 0))
        if is_partial:
            remaining_amount = final_amount - paid_amount
            payment_history = [{
                'amount': paid_amount,
                'date': now,
                'type': 'partial'
            }]
        else:
            remaining_amount = 0
            payment_history = [{
                'amount': final_amount,
                'date': now,
                'type': 'full'
            }]
        
        # Create test_name field for backward compatibility (join multiple test names)
        if tests:
            test_names = []
            for test in tests:
                name = test.get('name') or test.get('test_name', 'Unknown Test')
                test_names.append(name)
            test_name = ', '.join(test_names)
        else:
            test_name = sale_data.get('test_name', 'Unknown Test')
        
        doc = {
            'sale_id': sale_id,
            'tests': tests,
            'test_name': test_name,  # Backward compatibility - will contain all test names joined
            'patient_name': sale_data.get('patient_name'),
            'patient_gender': patient_gender,
            'phone': sale_data.get('phone'),
            'hospital_name': hospital_name,
            'subtotal': subtotal,
            'cost_price': total_cost,  # Total cost of all tests
            'discount_type': sale_data.get('discount_type'),
            'discount_value': float(sale_data.get('discount_value', 0)),
            'discount_amount': discount_amount,
            'final_amount': final_amount,
            'with_receipt': bool(sale_data.get('with_receipt', False)),
            'doctor_id': sale_data.get('doctor_id'),
            'doctor_name': sale_data.get('doctor_name'),
            'doctor_commission_type': commission_type,
            'doctor_commission_value': commission_value,
            'doctor_commission_amount': doctor_commission_amount,
            'is_partial': is_partial,
            'paid_amount': paid_amount,
            'remaining_amount': remaining_amount,
            'payment_history': payment_history,
            'created_at': now,
        }

        # IMPORTANT: Validate patient/phone BEFORE inserting sale to prevent orphan records
        patients_collection = self.db.patients
        phone = sale_data.get('phone')
        patient_name = sale_data.get('patient_name')
        
        if phone and phone.strip():
            existing_patient = await patients_collection.find_one({'phone': phone.strip()})
            if existing_patient:
                existing_name = existing_patient.get('name', '').strip()
                incoming_name = (patient_name or '').strip()
                if existing_name.lower() != incoming_name.lower():
                    raise ValueError(
                        f"Phone number {phone} is already associated with a different patient name: {existing_patient['name']}"
                    )

        # Now insert the sale (after validation passes)
        result = await self.collection.insert_one(doc)
        doc['id'] = str(result.inserted_id)
        doc.pop('_id', None)

        # Handle patient history (validation already done above, so we just update/create)
        existing_patient = await patients_collection.find_one({'phone': phone}) if phone else None

        if existing_patient:
            # Add single entry for all tests in this sale
            test_names = []
            for test in tests:
                # Handle both old format (test_name, amount) and new format (name, sell_price)
                test_name = test.get('name') or test.get('test_name', 'Unknown Test')
                test_names.append(test_name)
            
            # Create single entry for this sale with all tests combined
            test_entry = {
                'test_name': ', '.join(test_names),
                'amount': final_amount,
                'date': now,
                'sale_id': sale_id,
                'doctor_name': sale_data.get('doctor_name'),
                'doctor_commission_amount': doctor_commission_amount,
                'is_partial': is_partial,
                'paid_amount': paid_amount,
                'remaining_amount': remaining_amount,
                'discount_amount': discount_amount,
            }
            update_ops: Dict[str, Any] = {'$push': {'tests': test_entry}}
            set_fields: Dict[str, Any] = {}
            if patient_gender:
                set_fields['gender'] = patient_gender
            if hospital_name:
                set_fields['hospital'] = hospital_name
            if set_fields:
                update_ops['$set'] = set_fields
            await patients_collection.update_one(
                {'phone': phone},
                update_ops
            )
        else:
            # Create new patient with single entry for all tests in this sale
            test_names = []
            for test in tests:
                # Handle both old format (test_name, amount) and new format (name, sell_price)
                test_name = test.get('name') or test.get('test_name', 'Unknown Test')
                test_names.append(test_name)
            
            # Create single entry for this sale with all tests combined
            test_entry = {
                'test_name': ', '.join(test_names),
                'amount': final_amount,
                'date': now,
                'sale_id': sale_id,
                'doctor_name': sale_data.get('doctor_name'),
                'doctor_commission_amount': doctor_commission_amount,
                'is_partial': is_partial,
                'paid_amount': paid_amount,
                'remaining_amount': remaining_amount,
                'discount_amount': discount_amount,
            }
                
            patient_doc = {
                'phone': phone,
                'name': patient_name,
                'gender': patient_gender,
                'hospital': hospital_name,
                'tests': [test_entry],  # Single entry in array
                'created_at': now
            }
            await patients_collection.insert_one(patient_doc)

        return doc

    async def update_sale_payment(self, sale_id: str, additional_payment: float, with_receipt: bool | None = None) -> Dict[str, Any]:
        """Update a partial sale with additional payment. Optionally set with_receipt flag."""
        now = get_pakistan_time()  # Use Pakistan time instead of UTC
        
        # Find the sale
        sale = await self.collection.find_one({'sale_id': sale_id})
        if not sale:
            raise ValueError(f"Sale with ID {sale_id} not found")
        
        if not sale.get('is_partial', False):
            raise ValueError("Sale is not partial")
        
        current_paid = float(sale.get('paid_amount', 0))
        remaining = float(sale.get('remaining_amount', 0))
        
        if additional_payment > remaining:
            raise ValueError("Payment amount exceeds remaining amount")
        
        new_paid = current_paid + additional_payment
        new_remaining = remaining - additional_payment
        
        update_data = {
            'paid_amount': new_paid,
            'remaining_amount': new_remaining,
        }
        
        # Add to payment history
        payment_history = sale.get('payment_history', [])
        payment_history.append({
            'amount': additional_payment,
            'date': now,
            'type': 'additional'
        })
        update_data['payment_history'] = payment_history
        
        # If fully paid, mark as not partial
        if new_remaining <= 0:
            update_data['is_partial'] = False
            # If caller provided with_receipt explicitly, prefer it; otherwise set True on full payment
            update_data['with_receipt'] = True if with_receipt is None else bool(with_receipt)
        else:
            # If not fully paid but caller provided with_receipt, apply it
            if with_receipt is not None:
                update_data['with_receipt'] = bool(with_receipt)
        
        await self.collection.update_one({'sale_id': sale_id}, {'$set': update_data})
        
        # Update patient history
        patients_collection = self.db.patients
        phone = sale.get('phone')
        if phone:
            await patients_collection.update_one(
                {'phone': phone, 'tests.sale_id': sale_id},
                {'$set': {
                    'tests.$.paid_amount': new_paid,
                    'tests.$.remaining_amount': new_remaining,
                    'tests.$.is_partial': update_data.get('is_partial', True)
                }}
            )
        
        updated_sale = await self.collection.find_one({'sale_id': sale_id})
        updated_sale['id'] = str(updated_sale['_id'])
        del updated_sale['_id']
        return updated_sale

    async def get_sale_by_id(self, sale_id: str) -> Optional[Dict[str, Any]]:
        """Get a sale by sale_id"""
        doc = await self.collection.find_one({'sale_id': sale_id})
        if not doc:
            return None
        doc['id'] = str(doc['_id'])
        del doc['_id']
        return doc

    async def get_sales(self, q: str = None, page: int = 1, per_page: int = 15, date_filter: str = None, doctor_id: str = None) -> tuple:
        """Get sales with optional filtering and pagination"""
        query = {}

        # Add text search if query provided
        if q:
            query['$or'] = [
                {'test_name': {'$regex': q, '$options': 'i'}},
                {'patient_name': {'$regex': q, '$options': 'i'}},
                {'phone': {'$regex': q, '$options': 'i'}},
                {'sale_id': {'$regex': q, '$options': 'i'}}
            ]

        # Add doctor filter
        if doctor_id:
            if doctor_id == 'none':
                # Filter for sales with no doctor (null or empty)
                query['$or'] = query.get('$or', [])
                if query['$or']:
                    # If we already have a $or for search, we need to combine with $and
                    search_or = query.pop('$or')
                    query['$and'] = [
                        {'$or': search_or},
                        {'$or': [
                            {'doctor_id': None},
                            {'doctor_id': ''},
                            {'doctor_id': {'$exists': False}}
                        ]}
                    ]
                else:
                    query['$or'] = [
                        {'doctor_id': None},
                        {'doctor_id': ''},
                        {'doctor_id': {'$exists': False}}
                    ]
            else:
                query['doctor_id'] = doctor_id

        # Add date filtering
        if date_filter:
            now = get_pakistan_time()  # Use Pakistan time instead of UTC
            if date_filter == 'today':
                start_of_day = datetime.datetime(now.year, now.month, now.day)
                query['created_at'] = {'$gte': start_of_day}
            elif date_filter == 'week':
                week_ago = now - datetime.timedelta(days=7)
                query['created_at'] = {'$gte': week_ago}
            elif date_filter == 'month':
                month_ago = now - datetime.timedelta(days=30)
                query['created_at'] = {'$gte': month_ago}

        # Get total count
        total = await self.collection.count_documents(query)

        # Get paginated results
        skip = (page - 1) * per_page
        cursor = self.collection.find(query).sort('created_at', -1).skip(skip).limit(per_page)
        sales = await cursor.to_list(length=None)

        # Convert ObjectId to string
        for sale in sales:
            sale['id'] = str(sale['_id'])
            del sale['_id']

        return sales, total

    async def get_sales_summary(self, date_filter: str = None) -> Dict[str, Any]:
        """Get sales summary statistics"""
        query = {}

        # Add date filtering
        if date_filter:
            now = get_pakistan_time()  # Use Pakistan time instead of UTC
            if date_filter == 'today':
                start_of_day = datetime.datetime(now.year, now.month, now.day)
                query['created_at'] = {'$gte': start_of_day}
            elif date_filter == 'week':
                week_ago = now - datetime.timedelta(days=7)
                query['created_at'] = {'$gte': week_ago}
            elif date_filter == 'month':
                month_ago = now - datetime.timedelta(days=30)
                query['created_at'] = {'$gte': month_ago}

        pipeline = [
            {'$match': query},
            {
                '$addFields': {
                    # Calculate cost_price from tests array if not stored
                    'computed_cost': {
                        '$cond': {
                            'if': {'$gt': [{'$ifNull': ['$cost_price', 0]}, 0]},
                            'then': '$cost_price',
                            'else': {
                                '$sum': {
                                    '$map': {
                                        'input': {'$ifNull': ['$tests', []]},
                                        'as': 'test',
                                        'in': {'$ifNull': ['$$test.cost_price', 0]}
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                '$group': {
                    '_id': None,
                    'total_subtotal': {'$sum': '$subtotal'},
                    'total_cost': {'$sum': '$computed_cost'},
                    'total_discount': {'$sum': {'$ifNull': ['$discount_amount', 0]}},
                    'total_revenue': {'$sum': '$final_amount'},
                    'total_doctor_share': {'$sum': {'$ifNull': ['$doctor_commission_amount', 0]}},
                    'total_sales': {'$sum': 1},
                    'avg_sale': {'$avg': '$final_amount'}
                }
            }
        ]

        result = await self.collection.aggregate(pipeline).to_list(length=1)
        if result:
            total_subtotal = result[0].get('total_subtotal', 0)
            total_cost = result[0].get('total_cost', 0)
            total_discount = result[0].get('total_discount', 0)
            total_revenue = result[0]['total_revenue']  # This is final_amount (already has discount subtracted)
            total_doctor_share = result[0].get('total_doctor_share', 0)
            
            # Total Profit = Final Amount - Cost Price
            # NOTE: total_revenue is already final_amount with discount subtracted, so don't subtract discount again
            total_profit = total_revenue - total_cost
            
            # Net Profit (After Commission) = Total Profit - Doctor Commission
            total_profit_after_share = total_profit - total_doctor_share
            
            # DEBUG: Print calculation
            print(f"[DEBUG SALES SUMMARY]")
            print(f"  Total Revenue (Final Amount): {total_revenue}")
            print(f"  Total Cost: {total_cost}")
            print(f"  Total Discount: {total_discount}")
            print(f"  Total Doctor Share: {total_doctor_share}")
            print(f"  CALCULATION: {total_revenue} - {total_cost} = {total_profit}")
            print(f"  Net Profit: {total_profit} - {total_doctor_share} = {total_profit_after_share}")
            
            return {
                'total_subtotal': total_subtotal,
                'total_cost': total_cost,
                'total_discount': total_discount,
                'total_revenue': total_revenue,
                'total_profit': total_profit,
                'total_doctor_share': total_doctor_share,
                'total_profit_after_share': total_profit_after_share,
                'total_sales': result[0]['total_sales'],
                'avg_sale': result[0]['avg_sale']
            }
        else:
            return {
                'total_subtotal': 0,
                'total_cost': 0,
                'total_discount': 0,
                'total_revenue': 0,
                'total_profit': 0,
                'total_doctor_share': 0,
                'total_profit_after_share': 0,
                'total_sales': 0,
                'avg_sale': 0
            }
