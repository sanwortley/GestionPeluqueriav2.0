from pydantic import BaseModel
from typing import Optional

class ServiceBase(BaseModel):
    name: str
    duration_min: int = 45
    price: Optional[float] = None
    active: bool = True

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    duration_min: Optional[int] = None
    price: Optional[float] = None
    active: Optional[bool] = None

class ServiceOut(ServiceBase):
    id: int
    
    class Config:
        from_attributes = True
