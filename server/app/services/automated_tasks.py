from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.appointment import Appointment, AppointmentStatus
from app.models.service import Service
from app.services.whatsapp import send_whatsapp_sync
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def check_appointments_for_confirmation():
    return check_confirmations_v2()

def check_confirmations_v2():
    """
    Desactivado a petición del usuario. 
    Las notificaciones ahora son 100% manuales desde el panel.
    """
    return

def start_scheduler():
    if not scheduler.get_jobs():
        # Mensajería automática desactivada a petición del usuario.
        # Los recordatorios y confirmaciones ahora son manuales desde el panel.
        """
        scheduler.add_job(
            check_confirmations_v2, 
            trigger=IntervalTrigger(minutes=1), 
            id="check_confirmations", 
            replace_existing=True,
            next_run_time=datetime.now()
        )
        """
        scheduler.start()
