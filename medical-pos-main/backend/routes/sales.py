from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
from services.sales_service import SalesService
from services.excel_service import ExcelReportService
from bson import ObjectId
import datetime

router = APIRouter(tags=["sales"]) 
service = SalesService()
excel_service = ExcelReportService()


class TestItem(BaseModel):
    name: str = Field(...)
    sell_price: float = Field(..., ge=0)
    cost_price: Optional[float] = Field(default=0, ge=0)


class SaleCreateIn(BaseModel):
    tests: List[TestItem] = Field(..., min_items=1)
    patient_name: str = Field(..., min_length=1)
    patient_gender: Optional[str] = Field(None)
    hospital_name: Optional[str] = Field(None)
    phone: str = Field(..., min_length=1, description="Phone number is required")
    subtotal: float = Field(..., ge=0)
    discount_type: Optional[str] = None  # 'flat' or 'percent'
    discount_value: Optional[float] = 0
    discount_amount: Optional[float] = 0
    final_amount: float = Field(..., ge=0)
    with_receipt: bool = False
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_commission_type: Optional[str] = None  # 'flat' or 'percent'
    doctor_commission_value: Optional[float] = None
    is_partial: bool = False
    paid_amount: float = 0
    remaining_amount: float = 0


@router.post("/", status_code=201)
async def create_sale(payload: SaleCreateIn):
    try:
        # Validate phone number is not empty
        if not payload.phone or not payload.phone.strip():
            raise ValueError("Phone number is required")
        
        # Validate phone/patient name consistency
            existing_patient = await service.db.patients.find_one({
                'phone': payload.phone.strip()
            })
            if existing_patient:
                existing_name = existing_patient.get('name', '').strip()
                incoming_name = payload.patient_name.strip()
                if existing_name.lower() != incoming_name.lower():
                    raise ValueError(
                        f"Phone number {payload.phone} is already associated with patient '{existing_name}'. "
                        f"Please use a different phone number or verify the patient name."
                    )
        
        # Validate that final_amount matches calculated amount
        calculated_final = payload.subtotal
        if payload.discount_type == 'percent' and payload.discount_value:
            calculated_final = payload.subtotal - (payload.subtotal * payload.discount_value / 100.0)
        elif payload.discount_type == 'flat' and payload.discount_value:
            calculated_final = payload.subtotal - payload.discount_value
        
        if calculated_final < 0:
            calculated_final = 0.0

        # Create test names string for backward compatibility
        test_names = ", ".join([test.name for test in payload.tests])
        
        sale_doc = await service.create_sale({
            'tests': [test.dict() for test in payload.tests],
            'test_name': test_names,  # Keep for backward compatibility
            'patient_name': payload.patient_name,
            'patient_gender': payload.patient_gender,
            'hospital_name': payload.hospital_name,
            'phone': payload.phone,
            'subtotal': payload.subtotal,
            'discount_type': payload.discount_type,
            'discount_value': payload.discount_value or 0,
            'discount_amount': payload.discount_amount or 0,
            'final_amount': payload.final_amount,
            'with_receipt': payload.with_receipt,
            'doctor_id': payload.doctor_id,
            'doctor_name': payload.doctor_name,
            'doctor_commission_type': payload.doctor_commission_type,
            'doctor_commission_value': payload.doctor_commission_value,
            'is_partial': payload.is_partial,
            'paid_amount': payload.paid_amount,
            'remaining_amount': payload.remaining_amount,
        })
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return sale_doc


@router.get("/patients")
async def get_patients(
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
    q: Optional[str] = Query(None)
):
    patients_collection = service.db.patients
    
    # Build search query
    query = {}
    if q and q.strip():
        # Search in name and phone fields
        query = {
            "$or": [
                {"name": {"$regex": q.strip(), "$options": "i"}},
                {"phone": {"$regex": q.strip(), "$options": "i"}}
            ]
        }
    
    # Calculate skip and limit for pagination
    skip = (page - 1) * per_page
    
    # Get total count with search filter
    total_count = await patients_collection.count_documents(query)
    
    # Get paginated patients with search filter
    patients = await patients_collection.find(query).sort("created_at", -1).skip(skip).limit(per_page).to_list(length=per_page)
    
    for p in patients:
        p['id'] = str(p['_id'])
        del p['_id']
    
    return {
        "patients": patients,
        "total": total_count,
        "page": page,
        "per_page": per_page,
        "total_pages": (total_count + per_page - 1) // per_page
    }


@router.put("/patients/{patient_id}")
async def update_patient(patient_id: str, patient_data: dict):
    patients_collection = service.db.patients
    try:
        result = await patients_collection.update_one(
            {"_id": ObjectId(patient_id)},
            {"$set": patient_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Patient not found")
        return {"message": "Patient updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str):
    patients_collection = service.db.patients
    try:
        result = await patients_collection.delete_one({"_id": ObjectId(patient_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Patient not found")
        return {"message": "Patient deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/patients/{patient_id}/tests/{sale_id}")
async def delete_patient_test(patient_id: str, sale_id: str):
    patients_collection = service.db.patients
    try:
        result = await patients_collection.update_one(
            {"_id": ObjectId(patient_id)},
            {"$pull": {"tests": {"sale_id": sale_id}}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Patient not found")
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Test not found")
        return {"message": "Test deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
async def get_sales(
    q: Optional[str] = Query(None, description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(15, ge=1, le=100, description="Items per page"),
    date_filter: Optional[str] = Query(None, description="Date filter: today, week, month"),
    doctor_id: Optional[str] = Query(None, description="Filter by doctor ID")
):
    """Get sales with optional filtering and pagination"""
    try:
        sales, total = await service.get_sales(
            q=q, 
            page=page, 
            per_page=per_page, 
            date_filter=date_filter,
            doctor_id=doctor_id
        )
        return {
            "sales": sales,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_sales_summary(date_filter: Optional[str] = Query(None, description="Date filter: today, week, month")):
    """Get sales summary statistics"""
    try:
        summary = await service.get_sales_summary(date_filter=date_filter)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SaleUpdatePaymentIn(BaseModel):
    additional_payment: float = Field(..., gt=0)
    with_receipt: bool | None = None


@router.put("/{sale_id}/payment")
async def update_sale_payment(sale_id: str, payload: SaleUpdatePaymentIn):
    """Update payment for a partial sale"""
    try:
        updated_sale = await service.update_sale_payment(sale_id, payload.additional_payment, payload.with_receipt)
        return updated_sale
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/excel")
async def export_sales_to_excel(
    doctor_name: Optional[str] = Query(None, description="Filter by doctor name"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month (1-12)"),
    year: Optional[int] = Query(None, description="Filter by year"),
):
    """Export sales to Excel with optional filters"""
    try:
        # Build query filter
        query = {}
        
        # Doctor filter
        if doctor_name:
            query['doctor_name'] = {'$regex': doctor_name, '$options': 'i'}
        
        # Date range filter
        if date_from or date_to or month or year:
            date_query = {}
            
            if date_from:
                try:
                    from_date = datetime.datetime.strptime(date_from, '%Y-%m-%d')
                    date_query['$gte'] = from_date
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")
            
            if date_to:
                try:
                    to_date = datetime.datetime.strptime(date_to, '%Y-%m-%d')
                    # Include the entire end date
                    to_date = to_date.replace(hour=23, minute=59, second=59)
                    date_query['$lte'] = to_date
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD")
            
            # Month/Year filter (overrides date_from/date_to if provided)
            if year:
                if month:
                    # Specific month and year
                    start_date = datetime.datetime(year, month, 1)
                    if month == 12:
                        end_date = datetime.datetime(year + 1, 1, 1) - datetime.timedelta(seconds=1)
                    else:
                        end_date = datetime.datetime(year, month + 1, 1) - datetime.timedelta(seconds=1)
                else:
                    # Entire year
                    start_date = datetime.datetime(year, 1, 1)
                    end_date = datetime.datetime(year, 12, 31, 23, 59, 59)
                
                date_query = {'$gte': start_date, '$lte': end_date}
            
            if date_query:
                query['created_at'] = date_query
        
        # Fetch sales with filters
        sales_cursor = service.collection.find(query).sort('created_at', -1)
        sales = await sales_cursor.to_list(length=None)
        
        # Prepare filter info for Excel
        filter_info = {}
        if doctor_name:
            filter_info['doctor_name'] = doctor_name
        if date_from:
            filter_info['date_from'] = date_from
        if date_to:
            filter_info['date_to'] = date_to
        if month and year:
            filter_info['date_from'] = f"{year}-{month:02d}-01"
            # Calculate last day of month
            if month == 12:
                last_day = 31
            else:
                last_day = (datetime.datetime(year, month + 1, 1) - datetime.timedelta(days=1)).day
            filter_info['date_to'] = f"{year}-{month:02d}-{last_day}"
        elif year:
            filter_info['date_from'] = f"{year}-01-01"
            filter_info['date_to'] = f"{year}-12-31"
        
        # Generate Excel
        excel_file = excel_service.generate_sales_report(sales, filter_info)
        
        # Generate filename with timestamp and filters
        filename_parts = ["sales_report"]
        if doctor_name:
            filename_parts.append(f"doctor_{doctor_name.replace(' ', '_')}")
        if year:
            if month:
                filename_parts.append(f"{year}_{month:02d}")
            else:
                filename_parts.append(f"{year}")
        elif date_from or date_to:
            if date_from:
                filename_parts.append(f"from_{date_from}")
            if date_to:
                filename_parts.append(f"to_{date_to}")
        
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        filename_parts.append(timestamp)
        filename = "_".join(filename_parts) + ".xlsx"
        
        return StreamingResponse(
            excel_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel report: {str(e)}")


@router.get("/{sale_id}")
async def get_sale_by_id(sale_id: str):
    """Get a sale by sale_id"""
    try:
        sale = await service.get_sale_by_id(sale_id)
        if not sale:
            raise HTTPException(status_code=404, detail="Sale not found")
        return sale
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

