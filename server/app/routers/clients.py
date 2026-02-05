from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_db, get_current_admin
from app.models.client import Client
from app.schemas.client import Client as ClientSchema

router = APIRouter()

@router.get("/lookup", response_model=ClientSchema)
def lookup_client_by_phone(phone: str, db: Session = Depends(get_db)):
    """
    Public endpoint to check if a client exists by phone number.
    Used for pre-filling booking forms.
    """
    client = db.query(Client).filter(Client.phone == phone).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.get("/", response_model=List[ClientSchema], dependencies=[Depends(get_current_admin)])
def get_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Admin only: List all clients.
    """
    return db.query(Client).offset(skip).limit(limit).all()
