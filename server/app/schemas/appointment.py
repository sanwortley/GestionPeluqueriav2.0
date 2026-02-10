from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from enum import Enum

class AppointmentStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    FINISHED = "FINISHED"

class AppointmentBase(BaseModel):
    date: date
    start_time: str
    end_time: str
    service_id: int
    staff_id: Optional[int] = None
    client_name: str
    client_phone: str
    note: Optional[str] = None
    is_paid: bool = False

class AppointmentCreate(BaseModel):
    date: date
    start_time: str
    service_id: int
    staff_id: Optional[int] = None
    client_name: str
    client_phone: str
    note: Optional[str] = None
    is_paid: bool = False

class AppointmentReschedule(BaseModel):
    date: date
    start_time: str

class AppointmentUpdate(BaseModel):
    status: Optional[AppointmentStatus] = None
    is_paid: Optional[bool] = None
    note: Optional[str] = None

from app.schemas.service import ServiceOut

class AppointmentOut(AppointmentBase):
    id: int
    status: AppointmentStatus
    service: Optional[ServiceOut] = None
    
    class Config:
        from_attributes = True

class SlotSchema(BaseModel):
    start_time: str
    end_time: str
    available: bool = True
