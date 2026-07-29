from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from services.ledger_service import LedgerService
from services.ledger_excel_service import LedgerExcelReportService
from pydantic import BaseModel, Field
from datetime import datetime
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/ledger", tags=["ledger"])


class LedgerEntryCreate(BaseModel):
    description: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1)
    date: Optional[datetime] = None
    notes: Optional[str] = None


class LedgerEntryUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1)
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, min_length=1)
    date: Optional[datetime] = None
    notes: Optional[str] = None


@router.post("/entries")
async def create_entry(entry: LedgerEntryCreate):
    """Create a new ledger entry"""
    service = LedgerService()
    result = await service.create_entry(entry.dict())
    return result


@router.get("/entries")
async def list_entries(
    category: Optional[List[str]] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100)
):
    """List ledger entries with optional filters"""
    service = LedgerService()
    entries, total = await service.list_entries(
        category=category,
        date_from=date_from,
        date_to=date_to,
        search_query=q,
        page=page,
        per_page=per_page
    )
    
    total_pages = (total + per_page - 1) // per_page
    
    return {
        "entries": entries,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages
    }


@router.get("/entries/{entry_id}")
async def get_entry(entry_id: str):
    """Get a specific ledger entry"""
    service = LedgerService()
    entry = await service.get_entry(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.put("/entries/{entry_id}")
async def update_entry(entry_id: str, entry: LedgerEntryUpdate):
    """Update a ledger entry"""
    service = LedgerService()
    result = await service.update_entry(entry_id, entry.dict(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="Entry not found")
    return result


@router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str):
    """Delete a ledger entry"""
    service = LedgerService()
    success = await service.delete_entry(entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted successfully"}


@router.get("/summary")
async def get_summary(
    category: Optional[List[str]] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get summary statistics for ledger entries"""
    service = LedgerService()
    summary = await service.get_summary(
        category=category,
        date_from=date_from,
        date_to=date_to
    )
    return summary


@router.get("/export/excel")
async def export_to_excel(
    category: Optional[List[str]] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Export ledger entries to Excel"""
    service = LedgerService()
    
    # Fetch all entries matching the filters (no pagination for export)
    entries, _ = await service.list_entries(
        category=category,
        date_from=date_from,
        date_to=date_to,
        page=1,
        per_page=10000  # Large number to get all entries
    )
    
    # Generate Excel file
    filters = {}
    if category:
        if isinstance(category, list):
            filters['category'] = ', '.join(category)
        else:
            filters['category'] = category
    if date_from:
        filters['date_from'] = date_from
    if date_to:
        filters['date_to'] = date_to
    
    excel_file = LedgerExcelReportService.generate_ledger_report(entries, filters)
    
    # Generate filename
    filename = f"ledger_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
