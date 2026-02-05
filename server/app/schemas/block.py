from pydantic import BaseModel
from typing import Optional
from datetime import date

class BlockBase(BaseModel):
    start_date: date
    end_date: date
    start_time: str
    end_time: str
    reason: Optional[str] = None
    staff_id: Optional[int] = None

class BlockCreate(BlockBase):
    pass

class BlockOut(BlockBase):
    id: int

    class Config:
        from_attributes = True
