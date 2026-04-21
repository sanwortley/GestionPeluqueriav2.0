from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.deps import get_db, get_current_admin
from app.models.client import Client
from app.schemas.client import Client as ClientSchema, ClientUpdate

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
def get_clients(
    skip: int = Query(0), 
    limit: int = Query(100), 
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Admin only: List all clients.
    """
    query = db.query(Client)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Client.name.ilike(search_filter)) | 
            (Client.phone.ilike(search_filter))
        )
    return query.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()


@router.put("/{client_id}", response_model=ClientSchema, dependencies=[Depends(get_current_admin)])
def update_client(client_id: int, client_in: ClientUpdate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
        
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@router.delete("/{client_id}", dependencies=[Depends(get_current_admin)])
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(client)
    db.commit()
    return {"ok": True}
