from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.appointment import Appointment, AppointmentStatus
from app.models.service import Service
from app.schemas.appointment import AppointmentCreate, AppointmentReschedule
from app.services.slot_generator import is_overlapping, time_to_min, parse_time, min_to_time

from app.models.client import Client
from app.services.whatsapp import send_whatsapp_sync
from app.services.telegram import send_telegram_sync


def create_appointment(db: Session, appt_in: AppointmentCreate) -> Appointment:
    # 1. Get Service
    service = db.query(Service).filter(Service.id == appt_in.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
        
    duration = service.duration_min
    start_min = time_to_min(parse_time(appt_in.start_time))
    end_min = start_min + duration
    end_time = min_to_time(end_min)
    
    # 2. Validate availability
    query = db.query(Appointment).filter(
        Appointment.date == appt_in.date,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.FINISHED])
    )

    if appt_in.staff_id:
        query = query.filter(Appointment.staff_id == appt_in.staff_id)
    else:
        # If staff_id is None, it means the service doesn't require specific staff or it's a general slot?
        # The prompt says "staff_id (nullable)".
        # We assume if staff_id is None in appt_in, we check general availability (no staff assigned slots).
        query = query.filter(Appointment.staff_id.is_(None))
        
    existing_appts = query.all()
    
    for existing in existing_appts:
        e_start = time_to_min(parse_time(existing.start_time))
        e_end = time_to_min(parse_time(existing.end_time))
        if is_overlapping(start_min, end_min, e_start, e_end):
             raise HTTPException(status_code=400, detail="Slot is not available")

    # 3. Handle Client (Find or Create)
    client = db.query(Client).filter(Client.phone == appt_in.client_phone).first()
    if not client:
        client = Client(
            name=appt_in.client_name,
            phone=appt_in.client_phone,
            # Email is not in AppointmentCreate currently, assumed optional or not captured yet
        )
        db.add(client)
        db.flush() # Get ID without committing transaction yet
    else:
        # Update name if changed? Optional. Let's keep original for now or update it.
        # client.name = appt_in.client_name 
        pass

    # 4. Create Appointment
    appt = Appointment(
        date=appt_in.date,
        start_time=appt_in.start_time,
        end_time=end_time,
        service_id=appt_in.service_id,
        staff_id=appt_in.staff_id,
        client_name=appt_in.client_name,
        client_phone=appt_in.client_phone,
        client_id=client.id, # Link to client
        note=appt_in.note,
        is_paid=appt_in.is_paid,
        status=AppointmentStatus.PENDING
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    
    # Notify Client (Request Received)
    client_msg = (f"¡Hola {appt.client_name}! 💇‍♀️ Reservaste un turno en Roma Cabello:\n"
                  f"📅 Fecha: {appt.date}\n"
                  f"🕒 Hora: {appt.start_time}\n"
                  f"✨ Servicio: {service.name}\n\n"
                  f"✅ *Por favor, respondé este mensaje con un 1 para CONFIRMAR tu asistencia* "
                  f"o con un *2 para CANCELAR*.")
    send_whatsapp_sync(appt.client_phone, client_msg)
    
    # Notify Admin (Telegram)
    admin_msg = (f"<b>🚨 ¡NUEVA SOLICITUD DE TURNO! 🚨</b>\n\n"
                 f"👤 <b>Cliente:</b> {appt.client_name}\n"
                 f"📞 <b>Tel:</b> {appt.client_phone}\n"
                 f"📅 <b>Fecha:</b> {appt.date}\n"
                 f"🕒 <b>Hora:</b> {appt.start_time}\n"
                 f"✨ <b>Servicio:</b> {service.name}")
    send_telegram_sync(admin_msg)
    
    return appt

def cancel_appointment(db: Session, id: int) -> Appointment:
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appt.status = AppointmentStatus.CANCELLED
    db.commit()
    db.refresh(appt)
    
    # Notify Cancellation
    msg = (f"Hola {appt.client_name}. Te informamos que tu turno para el día {appt.date} "
           f"a las {appt.start_time} ha sido CANCELADO. Si fue un error, por favor contactanos.")
    send_whatsapp_sync(appt.client_phone, msg)
    
    # Notify Admin Cancellation
    from app.services.whatsapp import settings
    if settings.ADMIN_PHONE:
        admin_cancel_msg = (f"❌ Turno Cancelado ❌\n👤 Cliente: {appt.client_name}\n📅 Fecha: {appt.date}\n🕒 Hora: {appt.start_time}")
        send_whatsapp_sync(settings.ADMIN_PHONE, admin_cancel_msg)
    
    return appt

def confirm_appointment(db: Session, id: int) -> Appointment:
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appt.status = AppointmentStatus.CONFIRMED
    db.commit()
    db.refresh(appt)
    
    # Notify Client via WhatsApp
    msg = (f"¡Hola {appt.client_name}! 💇‍♀️ Tu turno en Roma Cabello ha sido **CONFIRMADO** por el peluquero.\n"
           f"📅 Fecha: {appt.date}\n"
           f"🕒 Hora: {appt.start_time}\n"
           f"¡Te esperamos!")
    send_whatsapp_sync(appt.client_phone, msg)
    
    return appt

def finish_appointment(db: Session, id: int, is_paid: bool = False) -> Appointment:
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appt.status = AppointmentStatus.FINISHED
    appt.is_paid = is_paid
    db.commit()
    db.refresh(appt)
    return appt

def reschedule_appointment(db: Session, id: int, parsed: AppointmentReschedule) -> Appointment:
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    # Recalculate end time
    service = appt.service
    duration = service.duration_min
    start_min = time_to_min(parse_time(parsed.start_time))
    end_min = start_min + duration
    end_time = min_to_time(end_min)
    
    # Validate overlap
    # Exclude self
    query = db.query(Appointment).filter(
        Appointment.date == parsed.date,
        Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.FINISHED]),
        Appointment.id != id
    )
    if appt.staff_id:
        query = query.filter(Appointment.staff_id == appt.staff_id)
    else:
        query = query.filter(Appointment.staff_id.is_(None))
    
    existing_appts = query.all()
    for existing in existing_appts:
        e_start = time_to_min(parse_time(existing.start_time))
        e_end = time_to_min(parse_time(existing.end_time))
        if is_overlapping(start_min, end_min, e_start, e_end):
             raise HTTPException(status_code=400, detail="New slot is not available")
             
    appt.date = parsed.date
    appt.start_time = parsed.start_time
    appt.end_time = end_time
    
    if appt.status == AppointmentStatus.CANCELLED:
        appt.status = AppointmentStatus.CONFIRMED
        
    db.commit()
    db.refresh(appt)
    
    # Notify Reschedule
    msg = (f"¡Hola {appt.client_name}! Tu turno ha sido REPROGRAMADO:\n"
           f"📅 Nueva fecha: {appt.date}\n"
           f"🕒 Nueva hora: {appt.start_time}\n"
           f"¡Te esperamos!")
    send_whatsapp_sync(appt.client_phone, msg)
    
    return appt

def update_appointment(db: Session, id: int, appt_in: any) -> Appointment:
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    update_data = appt_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appt, field, value)
    
    db.commit()
    db.refresh(appt)
    return appt

def delete_appointment(db: Session, id: int) -> bool:
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    db.delete(appt)
    db.commit()
    return True
