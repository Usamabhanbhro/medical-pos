"""
Script to generate test data for the medical POS system.
This will create 1000 patients and associated sales records using the sales service.
"""

import asyncio
import random
import sys
import os
from datetime import datetime, timedelta
from bson import ObjectId

# Add parent directory to path to import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.mongodb import get_database
from services.sales_service import SalesService
from utils.datetime_utils import get_pakistan_time

# Sample data for generating realistic test data
first_names = [
    "Muhammad", "Ahmed", "Ali", "Hassan", "Hussain", "Usman", "Omar", "Bilal", "Khalid", "Tariq",
    "Fatima", "Aisha", "Khadija", "Maryam", "Zainab", "Hafsa", "Ruqayyah", "Safia", "Amna", "Sana",
    "Abdullah", "Ibrahim", "Ismail", "Yusuf", "Daud", "Sulaiman", "Musa", "Isa", "Harun", "Idris",
    "Zara", "Nadia", "Sarah", "Hina", "Farah", "Rabia", "Sadaf", "Mehwish", "Samina", "Rubina",
    "Imran", "Asad", "Fahad", "Shahid", "Rashid", "Waseem", "Naeem", "Saleem", "Kareem", "Raheem",
    "Ayesha", "Bushra", "Saima", "Farzana", "Shaista", "Nasreen", "Parveen", "Yasmeen", "Shireen", "Tabassum"
]

last_names = [
    "Khan", "Ahmed", "Ali", "Sheikh", "Malik", "Chaudhry", "Qureshi", "Siddiqui", "Shah", "Butt",
    "Awan", "Bajwa", "Bhatti", "Cheema", "Dar", "Gill", "Gondal", "Iqbal", "Javed", "Kamran",
    "Lodhi", "Mughal", "Niazi", "Paracha", "Rajput", "Saeed", "Tarar", "Virk", "Waqas", "Yousaf",
    "Abbassi", "Baloch", "Durrani", "Farooqi", "Gardezi", "Hashmi", "Janjua", "Kazmi", "Leghari", "Mirza"
]

hospitals = [
    "Shaukat Khanum Hospital", "Aga Khan University Hospital", "Combined Military Hospital",
    "Jinnah Hospital", "Services Hospital", "Mayo Hospital", "General Hospital", 
    "Civil Hospital", "Lady Reading Hospital", "Nishtar Hospital", "Children Hospital",
    "National Hospital", "Fatimid Foundation", "Indus Hospital", "Ziauddin Hospital",
    "Liaquat National Hospital", "Dow University Hospital", "Hameed Latif Hospital",
    "Ittefaq Hospital", "Surgimed Hospital", "National Institute of Health",
    "Punjab Institute of Cardiology", "Ghurki Trust Hospital", "Doctors Hospital"
]

# Doctors data - will fetch/create actual doctor records
DOCTORS = [
    {"name": "smith", "commission_type": "flat", "commission_value": 300}
]

def generate_phone_number():
    """Generate a realistic Pakistani phone number"""
    prefixes = ["0300", "0301", "0302", "0303", "0304", "0305", "0306", "0307", "0308", "0309",
                "0310", "0311", "0312", "0313", "0314", "0315", "0316", "0317", "0318", "0319",
                "0320", "0321", "0322", "0323", "0324", "0325", "0330", "0331", "0332", "0333",
                "0334", "0335", "0336", "0337", "0340", "0341", "0342", "0343", "0344", "0345"]
    
    prefix = random.choice(prefixes)
    suffix = ''.join([str(random.randint(0, 9)) for _ in range(7)])
    return f"{prefix}{suffix}"

async def get_or_create_doctors(db):
    """Get existing doctors or create them if they don't exist"""
    doctors_collection = db.doctors
    
    for doctor in DOCTORS:
        # Search case-insensitive
        existing = await doctors_collection.find_one({"name": {"$regex": f"^{doctor['name']}$", "$options": "i"}})
        if existing:
            doctor["id"] = str(existing["_id"])
            doctor["db_name"] = existing["name"]
            print(f"Found existing doctor: {existing['name']} (searching for: {doctor['name']})")
        else:
            # Create the doctor
            now = get_pakistan_time()
            new_doctor = {
                "name": doctor["name"],
                "specialization": "General Medicine",
                "phone": generate_phone_number(),
                "email": f"{doctor['name'].lower().replace(' ', '').replace('.', '')}@clinic.com",
                "commission_type": doctor["commission_type"],
                "commission_value": doctor["commission_value"],
                "created_at": now
            }
            result = await doctors_collection.insert_one(new_doctor)
            doctor["id"] = str(result.inserted_id)
            doctor["db_name"] = doctor["name"]
            print(f"Created new doctor: {doctor['name']}")

async def generate_sales_records(db, count=1000):
    """Generate sales records using the SalesService which will also create patient history"""
    sales_service = SalesService()
    
    print(f"Generating {count} sales records...")
    
    # Collect all doctor info
    doctors_data = []
    for doctor in DOCTORS:
        if doctor.get("id"):
            doctors_data.append({
                "id": doctor["id"],
                "name": doctor["db_name"],
                "commission_type": doctor["commission_type"],
                "commission_value": doctor["commission_value"]
            })
    
    if not doctors_data:
        print("No doctors found! Please ensure doctors exist in the database.")
        return
    
    print(f"Using doctors: {[d['name'] for d in doctors_data]}")
    
    sales_count = 0
    genders = ["male", "female"]
    discount_types = ["percentage", "fixed", None]
    
    for i in range(count):
        # Generate patient data
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        patient_name = f"{first_name} {last_name}"
        phone = generate_phone_number()
        gender = random.choice(genders)
        hospital = random.choice(hospitals)
        
        # Select random doctor
        doctor = random.choice(doctors_data)
        
        # Generate sale data - only using CBC test as requested
        test_amount = 1000  # CBC test price
        
        # Random discount
        discount_type = random.choice(discount_types)
        discount_value = 0
        discount_amount = 0
        
        if discount_type == "percentage":
            discount_value = random.randint(5, 20)  # 5-20% discount
            discount_amount = (test_amount * discount_value) / 100
        elif discount_type == "fixed":
            discount_value = random.randint(50, 200)  # Fixed discount
            discount_amount = min(discount_value, test_amount)
        
        final_amount = test_amount - discount_amount
        
        # Partial payment decision
        is_partial = random.choice([True, False]) if random.random() < 0.3 else False  # 30% chance of partial payment
        if is_partial:
            paid_amount = random.randint(int(final_amount * 0.3), int(final_amount * 0.8))
        else:
            paid_amount = final_amount
        
        # Create sale data
        sale_data = {
            "tests": [{
                "test_name": "cbc",
                "amount": test_amount
            }],
            "patient_name": patient_name,
            "patient_gender": gender,
            "phone": phone,
            "hospital_name": hospital,
            "subtotal": test_amount,
            "discount_type": discount_type,
            "discount_value": discount_value,
            "discount_amount": discount_amount,
            "final_amount": final_amount,
            "with_receipt": random.choice([True, False]),
            "doctor_id": doctor["id"],
            "doctor_name": doctor["name"],
            "doctor_commission_type": doctor["commission_type"],
            "doctor_commission_value": doctor["commission_value"],
            "is_partial": is_partial,
            "paid_amount": paid_amount
        }
        
        try:
            # Use the sales service to create the sale (this will also create/update patient history)
            result = await sales_service.create_sale(sale_data)
            sales_count += 1
            
            if (i + 1) % 100 == 0:
                print(f"Generated {i + 1} sales records...")
                
        except Exception as e:
            print(f"Error creating sale {i + 1}: {str(e)}")
            continue
    
    print(f"Successfully created {sales_count} sales records!")
    return sales_count

async def main():
    """Main function to generate all test data"""
    print("Starting test data generation...")
    
    db = get_database()
    
    # First, get or create doctors
    await get_or_create_doctors(db)
    
    # Check if sales/patients already exist
    sales_collection = db.sales
    patients_collection = db.patients
    
    existing_sales = await sales_collection.count_documents({})
    existing_patients = await patients_collection.count_documents({})
    
    if existing_sales > 0 or existing_patients > 0:
        print(f"Found {existing_sales} existing sales and {existing_patients} existing patients.")
        response = input("Do you want to add 1000 more sales records? (y/N): ")
        if response.lower() != 'y':
            print("Operation cancelled.")
            return
    
    # Generate sales using the sales service
    sales_created = await generate_sales_records(db, 1000)
    
    # Print summary
    final_patients = await patients_collection.count_documents({})
    final_sales = await sales_collection.count_documents({})
    
    print(f"\n=== Data Generation Complete ===")
    print(f"Total Patients: {final_patients}")
    print(f"Total Sales: {final_sales}")
    print(f"New Sales Created: {sales_created}")
    print(f"Doctors available: {len(DOCTORS)}")
    
if __name__ == "__main__":
    asyncio.run(main())