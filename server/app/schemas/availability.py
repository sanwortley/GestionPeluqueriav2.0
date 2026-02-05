from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class RangeSchema(BaseModel):
    start_time: str
    end_time: str

class AvailabilityBase(BaseModel):
    enabled: bool = True
    slot_size_min: int = 45
    staff_id: Optional[int] = None

class AvailabilityCreate(AvailabilityBase):
    date: date
    ranges: List[RangeSchema]

class AvailabilityUpdate(BaseModel):
    enabled: Optional[bool] = None
    slot_size_min: Optional[int] = None
    staff_id: Optional[int] = None
    ranges: Optional[List[RangeSchema]] = None

class AvailabilityOut(AvailabilityBase):
    id: int
    date: date
    ranges: List[RangeSchema]

    class Config:
        from_attributes = True
