from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.deps import get_db
from app.services.slot_generator import generate_slots
from app.schemas.appointment import SlotSchema

router = APIRouter()

@router.get("/", response_model=List[SlotSchema])
def get_slots(
    date: date,
    service_id: int,
    staff_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    slots = generate_slots(db, date, service_id, staff_id)
    # Convert dict to schema
    return [SlotSchema(start_time=s["start_time"], end_time=s["end_time"], available=True) for s in slots]
