from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import logging
from app.core.deps import get_current_admin, get_db
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

import time

# Simple cache for WhatsApp status
_wa_status_cache = {"data": None, "timestamp": 0}
CACHE_TTL = 15  # seconds

@router.get("/status", dependencies=[Depends(get_current_admin)])
async def get_whatsapp_status():
    """
    Checks the status of the WhatsApp bridge with a 15s cache.
    """
    global _wa_status_cache
    now = time.time()
    
    if _wa_status_cache["data"] and (now - _wa_status_cache["timestamp"] < CACHE_TTL):
        return _wa_status_cache["data"]

    if not settings.WHATSAPP_BRIDGE_URL:
        raise HTTPException(status_code=503, detail="WhatsApp bridge URL not configured")
    
    qr_url = f"{settings.WHATSAPP_BRIDGE_URL}/qr"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{settings.WHATSAPP_BRIDGE_URL}/status", timeout=5.0)
            data = res.json()
            data["qrUrl"] = qr_url
            
            # Update cache
            _wa_status_cache = {"data": data, "timestamp": now}
            return data
    except Exception as e:
        logger.error(f"Error checking bridge status: {str(e)}")
        error_data = {"isReady": False, "error": str(e), "qrUrl": qr_url}
        # Don't cache errors for too long, but maybe a few seconds
        return error_data


@router.post("/logout", dependencies=[Depends(get_current_admin)])
async def logout_whatsapp():
    """
    Triggers a soft restart of the WhatsApp bridge (clears session).
    """
    if not settings.WHATSAPP_BRIDGE_URL:
        raise HTTPException(status_code=503, detail="WhatsApp bridge URL not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            # We use a longer timeout for logout/restart
            response = await client.post(f"{settings.WHATSAPP_BRIDGE_URL}/logout", timeout=30.0)
            return response.json()
    except Exception as e:
        logger.error(f"Error logging out WhatsApp: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error connecting to bridge: {str(e)}")

@router.post("/test-send", dependencies=[Depends(get_current_admin)])
async def test_send_whatsapp(phone: str, message: str):
    """
    Manually send a test message to a specific number.
    """
    from app.services.whatsapp import send_whatsapp_sync
    success, error = send_whatsapp_sync(phone, message)
    if not success:
        raise HTTPException(status_code=500, detail=f"Error: {error}")
    return {"ok": True, "message": "Test message sent successfully"}

@router.post("/retroactive-notify", dependencies=[Depends(get_current_admin)])
async def trigger_retroactive_notifications(days: int = 4, db: Session = Depends(get_db)):
    """
    Triggers retroactive creation notifications for future PENDING appointments.
    """
    from app.services.appointment_service import send_retro_notifications
    count = send_retro_notifications(db, days_back=days)
    return {"ok": True, "notifications_sent": count}

@router.get("/pending-notifs", dependencies=[Depends(get_current_admin)])
async def get_pending_notifications_endpoint(days: int = 7, db: Session = Depends(get_db)):
    """
    Returns a list of future appointments that haven't been notified yet.
    """
    from app.services.appointment_service import get_pending_notifications
    appts = get_pending_notifications(db, days_back=days)
    return [{
        "id": a.id,
        "client_name": a.client_name,
        "client_phone": a.client_phone,
        "date": a.date,
        "start_time": a.start_time,
        "status": a.status,
        "created_at": a.created_at,
        "notified_at": a.notified_at,
        "confirmation_sent_at": getattr(a, 'confirmation_sent_at', None),
        "reminder_sent_at": getattr(a, 'reminder_sent_at', None),
        "notification_error": a.notification_error,
        "last_notified_at": a.last_notified_at,
        "service_name": a.service.name if a.service else "N/A"
    } for a in appts]

@router.post("/send-single/{appt_id}", dependencies=[Depends(get_current_admin)])
async def send_single_notification_endpoint(appt_id: int, db: Session = Depends(get_db)):
    """
    Triggers notification for a single appointment.
    """
    from app.services.appointment_service import send_single_notification
    success = send_single_notification(db, appt_id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not send notification. Check bridge logs.")
    return {"ok": True}

@router.post("/reset-and-send/{appt_id}", dependencies=[Depends(get_current_admin)])
async def reset_and_send_notification(appt_id: int, db: Session = Depends(get_db)):
    """
    Resets notification status and force-sends regardless of previous notified_at.
    Used to recover appointments that were wrongly marked as notified.
    """
    from app.models.appointment import Appointment
    from app.services.appointment_service import send_single_notification
    from datetime import datetime

    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Clear notification state to force re-send
    appt.notified_at = None
    appt.notification_error = None
    db.commit()
    
    success = send_single_notification(db, appt_id)
    if not success:
        raise HTTPException(status_code=500, detail="Notification reset but send failed. Check bridge.")
    return {"ok": True, "message": "Notification reset and sent successfully"}

@router.get("/recent-confirmed", dependencies=[Depends(get_current_admin)])
async def get_recent_confirmed(days: int = 3, db: Session = Depends(get_db)):
    """
    Returns CONFIRMED and PENDING appointments from the last N days regardless of notified_at.
    Used to manually re-notify clients whose notification may have failed silently.
    """
    from app.models.appointment import Appointment, AppointmentStatus
    from datetime import date
    # Filter: From today onwards (all types of appointments in that range)
    today = date.today()
    appts = db.query(Appointment).filter(
        Appointment.date >= today,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    ).order_by(Appointment.date.asc(), Appointment.start_time.asc()).all()
    return [{
        "id": a.id,
        "client_name": a.client_name,
        "client_phone": a.client_phone,
        "date": a.date,
        "start_time": a.start_time,
        "status": a.status,
        "notified_at": a.notified_at,
        "confirmation_sent_at": getattr(a, 'confirmation_sent_at', None),
        "reminder_sent_at": getattr(a, 'reminder_sent_at', None),
        "notification_error": getattr(a, 'notification_error', None),
        "service_name": a.service.name if a.service else "N/A"
    } for a in appts]

@router.post("/send-custom/{appt_id}", dependencies=[Depends(get_current_admin)])
async def send_custom_notification_endpoint(appt_id: int, type: str, db: Session = Depends(get_db)):
    """
    Sends a specific message type (NOTIFICAR, CONFIRMAR, RECORDAR) manually.
    """
    from app.services.appointment_service import send_custom_notification
    success, error = send_custom_notification(db, appt_id, type)
    if not success:
        return {"ok": False, "error": error}
    return {"ok": True}

@router.post("/dismiss/{appt_id}", dependencies=[Depends(get_current_admin)])
async def dismiss_notification_endpoint(appt_id: int, db: Session = Depends(get_db)):
    """
    Marks an appointment as notified without sending a message.
    """
    from app.services.appointment_service import dismiss_notification
    success = dismiss_notification(db, appt_id)
    if not success:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"ok": True}
