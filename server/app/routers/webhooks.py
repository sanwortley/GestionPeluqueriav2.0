from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.services.whatsapp import send_whatsapp_sync, settings
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/ultramsg")
async def ultramsg_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook to handle incoming messages from UltraMsg.
    It expects a JSON payload from UltraMsg.
    """
    data = await request.json()
    
    # UltraMsg structure: data['data']['body'], data['data']['from'], etc.
    # Note: Structure can vary depending on the event type (message_create, etc.)
    
    msg_data = data.get("data", {})
    body = msg_data.get("body", "").strip()
    from_phone = msg_data.get("from", "") # e.g. "5493512345678@c.us"
    
    if not body or not from_phone:
        return {"ok": True}

    # Clean the phone number (remove @c.us and other symbols)
    clean_phone = from_phone.split("@")[0]
    logger.info(f"Webhook recibido: Mensaje='{body}' desde {clean_phone}")
    
    # Buscar turnos pendientes que hayan recibido una solicitud recientemente (últimas 48hs)
    from datetime import datetime, timedelta
    limit_time = datetime.now() - timedelta(hours=48)
    
    all_pending = db.query(Appointment).filter(
        Appointment.status == AppointmentStatus.PENDING,
        Appointment.confirmation_sent_at != None,
        Appointment.confirmation_sent_at >= limit_time
    ).all()
    
    appt = None
    for a in all_pending:
        db_phone = a.client_phone.replace("+", "").replace(" ", "")
        # Normalizar el teléfono de la DB para comparar
        if db_phone.startswith("549"):
            pass
        elif db_phone.startswith("54"):
            db_phone = "549" + db_phone[2:]
        
        # Comparar si el teléfono coincide
        if db_phone in clean_phone or clean_phone in db_phone:
            appt = a
            break

    if not appt:
        logger.warning(f"No se encontró turno PENDING con recordatorio reciente para: {clean_phone}")
        return {"ok": True, "detail": "No pending appointment with recent reminder found"}

    if body == "1":
        # CONFIRM
        appt.status = AppointmentStatus.CONFIRMED
        db.commit()
        
        # Notify Client
        date_formatted = appt.date.strftime("%d/%m") if hasattr(appt.date, 'strftime') else str(appt.date)
        confirm_msg = (f"✅ ¡Gracias {appt.client_name}! Tu turno ha sido CONFIRMADO. "
                       f"Te esperamos el {date_formatted} a las {appt.start_time} hs.")
        send_whatsapp_sync(appt.client_phone, confirm_msg)
        
        # Notify Admin
        if settings.ADMIN_PHONE:
            admin_msg = (f"✅ Turno CONFIRMADO por cliente\n"
                         f"👤 Cliente: {appt.client_name}\n"
                         f"📅 Fecha: {appt.date}\n"
                         f"🕒 Hora: {appt.start_time}")
            send_whatsapp_sync(settings.ADMIN_PHONE, admin_msg)
            
    elif body == "2":
        # CANCEL
        appt.status = AppointmentStatus.CANCELLED
        db.commit()
        
        # Notify Client
        cancel_msg = f"Turno cancelado correctamente. ¡Esperamos verte pronto!"
        send_whatsapp_sync(appt.client_phone, cancel_msg)
        
        # Notify Admin
        if settings.ADMIN_PHONE:
            admin_msg = (f"❌ Turno CANCELADO por cliente\n"
                         f"👤 Cliente: {appt.client_name}\n"
                         f"📅 Fecha: {appt.date}\n"
                         f"🕒 Hora: {appt.start_time}")
            send_whatsapp_sync(settings.ADMIN_PHONE, admin_msg)

    return {"ok": True}
