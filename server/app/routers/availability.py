from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.schemas.availability import AvailabilityOut, AvailabilityCreate, AvailabilityUpdate
from app.models.availability import AvailabilityDay, AvailabilityRange
from app.core.deps import get_db, get_current_admin

router = APIRouter()

@router.get("/", response_model=List[AvailabilityOut])
def get_availability(
    start_date: date = Query(..., alias="from"),
    end_date: date = Query(..., alias="to"),
    staff_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AvailabilityDay).filter(
        AvailabilityDay.date >= start_date,
        AvailabilityDay.date <= end_date
    )
    if staff_id:
        query = query.filter(AvailabilityDay.staff_id == staff_id)
    else:
        query = query.filter(AvailabilityDay.staff_id.is_(None))
        
    return query.all()

@router.put("/{date_str}", response_model=AvailabilityOut, dependencies=[Depends(get_current_admin)])
def update_availability(
    date_str: date,
    avail_in: AvailabilityUpdate,
    db: Session = Depends(get_db)
):
    target_staff_id = avail_in.staff_id
    
    existing = db.query(AvailabilityDay).filter(
        AvailabilityDay.date == date_str,
        AvailabilityDay.staff_id == target_staff_id
    ).first()
    
    if not existing:
        existing = AvailabilityDay(date=date_str, staff_id=target_staff_id)
        db.add(existing)
        db.commit()
    
    if avail_in.enabled is not None:
        existing.enabled = avail_in.enabled
    if avail_in.slot_size_min is not None:
        existing.slot_size_min = avail_in.slot_size_min
        
    if avail_in.ranges is not None:
        # Replace ranges
        # Delete old
        db.query(AvailabilityRange).filter(AvailabilityRange.availability_day_id == existing.id).delete()
        # Add new
        for r in avail_in.ranges:
            new_r = AvailabilityRange(
                availability_day_id=existing.id,
                start_time=r.start_time,
                end_time=r.end_time
            )
            db.add(new_r)
            
    db.commit()
    db.refresh(existing)
    return existing
