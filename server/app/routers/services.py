from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceOut
from app.models.service import Service
from app.core.deps import get_db, get_current_admin

router = APIRouter()

@router.get("/", response_model=List[ServiceOut])
def read_services(db: Session = Depends(get_db)):
    return db.query(Service).filter(Service.active == True).all()

@router.post("/", response_model=ServiceOut, dependencies=[Depends(get_current_admin)])
def create_service(service_in: ServiceCreate, db: Session = Depends(get_db)):
    service = Service(**service_in.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

@router.put("/{id}", response_model=ServiceOut, dependencies=[Depends(get_current_admin)])
def update_service(id: int, service_in: ServiceUpdate, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = service_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)
        
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

@router.delete("/{id}", dependencies=[Depends(get_current_admin)])
def delete_service(id: int, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service.active = False
    db.add(service)
    db.commit()
    return {"ok": True}
