"""Backfill script for sales collection.

Run this from the repository root (Windows PowerShell):

cd backend; python -m scripts.backfill_sales

It will compute doctor_commission_amount for sales missing it using existing
fields (doctor_commission_type/value and final_amount) and ensure cost_price is numeric.
"""
import asyncio
from services.sales_service import SalesService

async def main():
    svc = SalesService()
    db = svc.db
    collection = db.sales

    query = {
        '$or': [
            {'doctor_commission_amount': {'$exists': False}},
            {'doctor_commission_amount': None},
            {'cost_price': {'$exists': False}},
        ]
    }

    cursor = collection.find(query)
    updated = 0
    async for doc in cursor:
        sale_id = doc.get('sale_id')
        final_amount = float(doc.get('final_amount') or 0)
        commission_type = doc.get('doctor_commission_type')
        commission_value = float(doc.get('doctor_commission_value') or 0)
        cost_price = float(doc.get('cost_price') or 0)

        if commission_type and commission_value > 0:
            if commission_type == 'percentage':
                doctor_commission_amount = (final_amount * commission_value) / 100.0
            else:
                doctor_commission_amount = commission_value
        else:
            doctor_commission_amount = 0.0

        update = {}
        if doc.get('doctor_commission_amount') != doctor_commission_amount:
            update['doctor_commission_amount'] = doctor_commission_amount
        if 'cost_price' not in doc or doc.get('cost_price') is None:
            update['cost_price'] = cost_price

        if update:
            await collection.update_one({'_id': doc['_id']}, {'$set': update})
            updated += 1
            print(f"Updated sale {sale_id}: {update}")

    print(f"Done. Updated {updated} documents.")

if __name__ == '__main__':
    asyncio.run(main())
