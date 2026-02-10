from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from app.core.deps import get_db, get_current_admin
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentReschedule, AppointmentUpdate
from app.models.appointment import Appointment
from app.services.appointment_service import create_appointment as service_create_appointment
from app.services.appointment_service import cancel_appointment as service_cancel_appointment
from app.services.appointment_service import reschedule_appointment as service_reschedule_appointment
from app.services.appointment_service import confirm_appointment as service_confirm_appointment
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.post("/", response_model=AppointmentOut)
@limiter.limit("3/minute")
def create_appointment(request: Request, appt_in: AppointmentCreate, db: Session = Depends(get_db)):
    return service_create_appointment(db, appt_in)

@router.get("/", response_model=List[AppointmentOut], dependencies=[Depends(get_current_admin)])
def get_appointments(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    date_eq: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db)
):
    query = db.query(Appointment).options(joinedload(Appointment.service), joinedload(Appointment.staff))
    
    if date_eq:
        query = query.filter(Appointment.date == date_eq)
    else:
        if from_date:
            query = query.filter(Appointment.date >= from_date)
        if to_date:
            query = query.filter(Appointment.date <= to_date)
            
    return query.order_by(Appointment.date, Appointment.start_time).all()

@router.put("/{id}/cancel", response_model=AppointmentOut, dependencies=[Depends(get_current_admin)])
def cancel_appointment(id: int, db: Session = Depends(get_db)):
    return service_cancel_appointment(db, id)

@router.put("/{id}/confirm", response_model=AppointmentOut, dependencies=[Depends(get_current_admin)])
def confirm_appointment(id: int, db: Session = Depends(get_db)):
    return service_confirm_appointment(db, id)

@router.put("/{id}/reschedule", response_model=AppointmentOut, dependencies=[Depends(get_current_admin)])
def reschedule_appointment(id: int, parsed: AppointmentReschedule, db: Session = Depends(get_db)):
    return service_reschedule_appointment(db, id, parsed)

@router.put("/{id}/finish", response_model=AppointmentOut, dependencies=[Depends(get_current_admin)])
def finish_appointment(id: int, is_paid: bool = Query(False), db: Session = Depends(get_db)):
    from app.services.appointment_service import finish_appointment as service_finish_appointment
    return service_finish_appointment(db, id, is_paid)

@router.patch("/{id}", response_model=AppointmentOut, dependencies=[Depends(get_current_admin)])
def update_appointment(id: int, appt_in: AppointmentUpdate, db: Session = Depends(get_db)):
    from app.services.appointment_service import update_appointment as service_update_appointment
    return service_update_appointment(db, id, appt_in)
@router.delete("/{id}", dependencies=[Depends(get_current_admin)])
def delete_appointment(id: int, db: Session = Depends(get_db)):
    from app.services.appointment_service import delete_appointment as service_delete_appointment
    service_delete_appointment(db, id)
    return {"ok": True}
