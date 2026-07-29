"""
Migration script to update sale IDs to new year-based format.

Old format: 0015
New format: 2025-000015

This script:
1. Updates all existing sale IDs to include the year from their created_at date
2. Creates year-based counters for each year
3. Maintains the sequence numbers from the old format
4. Updates patient history references

Run with: python -m scripts.migrate_sale_ids
"""

import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.mongodb import get_database


async def migrate_sale_ids():
    """Migrate existing sale IDs to year-based format"""
    db = get_database()
    sales_collection = db.sales
    patients_collection = db.patients
    counters_collection = db.counters
    
    print("=" * 60)
    print("Sale ID Migration to Year-Based Format")
    print("=" * 60)
    
    # Get all sales
    sales_cursor = sales_collection.find({})
    sales = await sales_cursor.to_list(length=None)
    
    if not sales:
        print("No sales found. Nothing to migrate.")
        return
    
    print(f"\nFound {len(sales)} sales to migrate.")
    
    # Group sales by year and track counters
    year_counters = {}
    migrations = []
    
    for sale in sales:
        old_sale_id = sale.get('sale_id')
        created_at = sale.get('created_at')
        
        if not old_sale_id or not created_at:
            print(f"⚠ Warning: Sale {sale.get('_id')} missing sale_id or created_at, skipping")
            continue
        
        # Extract year from created_at
        if isinstance(created_at, datetime):
            year = created_at.year
        else:
            # Fallback to current year if date is invalid
            year = datetime.now().year
            print(f"⚠ Warning: Sale {old_sale_id} has invalid created_at, using {year}")
        
        # Skip if already in new format (contains hyphen)
        if '-' in str(old_sale_id):
            print(f"✓ Sale {old_sale_id} already in new format, skipping")
            continue
        
        # Extract numeric part from old ID (remove leading zeros)
        try:
            old_seq = int(old_sale_id)
        except ValueError:
            print(f"⚠ Warning: Could not parse sequence from {old_sale_id}, skipping")
            continue
        
        # Create new ID: YEAR-NNNNNN
        new_sale_id = f"{year}-{old_seq:06d}"
        
        # Track the highest sequence per year
        if year not in year_counters:
            year_counters[year] = 0
        year_counters[year] = max(year_counters[year], old_seq)
        
        migrations.append({
            'old_id': old_sale_id,
            'new_id': new_sale_id,
            'sale_object_id': sale['_id'],
            'year': year
        })
    
    if not migrations:
        print("\n✓ All sales are already in the new format. No migration needed.")
        return
    
    print(f"\nWill migrate {len(migrations)} sale IDs:")
    print(f"Sample: {migrations[0]['old_id']} → {migrations[0]['new_id']}")
    
    # Confirm migration
    response = input("\nProceed with migration? (yes/no): ")
    if response.lower() != 'yes':
        print("Migration cancelled.")
        return
    
    print("\n" + "=" * 60)
    print("Starting Migration...")
    print("=" * 60)
    
    # Step 1: Update sales collection
    print("\n[1/3] Updating sales collection...")
    updated_sales = 0
    failed_sales = []
    
    for migration in migrations:
        try:
            result = await sales_collection.update_one(
                {'_id': migration['sale_object_id']},
                {'$set': {'sale_id': migration['new_id']}}
            )
            if result.modified_count > 0:
                updated_sales += 1
                print(f"  ✓ {migration['old_id']} → {migration['new_id']}")
            else:
                print(f"  ⚠ {migration['old_id']} - no changes made")
        except Exception as e:
            failed_sales.append(migration['old_id'])
            print(f"  ✗ {migration['old_id']} - Error: {e}")
    
    print(f"\nSales updated: {updated_sales}/{len(migrations)}")
    if failed_sales:
        print(f"Failed: {len(failed_sales)} - {failed_sales}")
    
    # Step 2: Update patient history references
    print("\n[2/3] Updating patient history references...")
    updated_patients = 0
    
    for migration in migrations:
        try:
            # Update tests array in patients collection
            result = await patients_collection.update_many(
                {'tests.sale_id': migration['old_id']},
                {'$set': {'tests.$[elem].sale_id': migration['new_id']}},
                array_filters=[{'elem.sale_id': migration['old_id']}]
            )
            if result.modified_count > 0:
                updated_patients += result.modified_count
                print(f"  ✓ Updated {result.modified_count} patient(s) for sale {migration['old_id']}")
        except Exception as e:
            print(f"  ⚠ Error updating patients for sale {migration['old_id']}: {e}")
    
    print(f"\nPatient records updated: {updated_patients}")
    
    # Step 3: Create/update year-based counters
    print("\n[3/3] Creating year-based counters...")
    
    for year, max_seq in year_counters.items():
        counter_id = f"sales_{year}"
        try:
            result = await counters_collection.update_one(
                {'_id': counter_id},
                {'$set': {'seq': max_seq + 1}},  # Set to next available number
                upsert=True
            )
            print(f"  ✓ Counter for {year}: set to {max_seq + 1}")
        except Exception as e:
            print(f"  ✗ Error creating counter for {year}: {e}")
    
    # Optional: Remove old global counter (keep for reference)
    old_counter = await counters_collection.find_one({'_id': 'sales'})
    if old_counter:
        print(f"\n  ℹ Old global counter found (seq: {old_counter.get('seq')})")
        print(f"    Keeping for reference. You can manually delete it later if needed.")
    
    print("\n" + "=" * 60)
    print("Migration Complete!")
    print("=" * 60)
    print(f"\n✓ Updated {updated_sales} sales")
    print(f"✓ Updated {updated_patients} patient records")
    print(f"✓ Created {len(year_counters)} year-based counters")
    
    # Show sample of migrated IDs
    print("\n" + "=" * 60)
    print("Sample Migrated Sale IDs:")
    print("=" * 60)
    sample_count = min(10, len(migrations))
    for i in range(sample_count):
        m = migrations[i]
        print(f"  {m['old_id']:>6} → {m['new_id']}")
    if len(migrations) > sample_count:
        print(f"  ... and {len(migrations) - sample_count} more")
    
    print("\n" + "=" * 60)
    print("Next Steps:")
    print("=" * 60)
    print("1. Verify the migrated data in your database")
    print("2. Test creating new sales - they should use the new format")
    print("3. Check that existing sale lookups still work")
    print("4. Update any external systems that reference sale IDs")
    print("\nNew sale ID format: YEAR-NNNNNN (e.g., 2025-000123)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(migrate_sale_ids())
