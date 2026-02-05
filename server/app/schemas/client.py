from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class ClientBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ClientSearch(BaseModel):
    phone: str
