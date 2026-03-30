import os
import sys
from datetime import datetime, timedelta

# Add current directory to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.db.session import SessionLocal
from app.models.appointment import Appointment, AppointmentStatus
from app.models.service import Service
from app.services.whatsapp import send_whatsapp_sync
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_retroactive_notifications(dry_run=True):
    db = SessionLocal()
    try:
        now = datetime.now()
        today = now.date()
        # Buscamos turnos futuros creados en los últimos 4 días
        # (Ajustable según necesidad)
        days_back = 4
        start_created_at = now - timedelta(days=days_back)
        
        logger.info(f"--- INICIO RETROACTIVAS (Dry Run: {dry_run}) ---")
        logger.info(f"Buscando turnos PENDING para fecha >= {today} creados desde {start_created_at}")

        query = db.query(Appointment).filter(
            Appointment.status == AppointmentStatus.PENDING,
            Appointment.date >= today,
            Appointment.created_at >= start_created_at
        )

        appts = query.all()
        print(f"--- TURNOS ENCONTRADOS: {len(appts)} ---")
        logger.info(f"Encontrados {len(appts)} turnos potenciales.")

        for appt in appts:
            # Re-verificar datos
            date_formatted = appt.date.strftime("%d/%m") if hasattr(appt.date, 'strftime') else str(appt.date)
            service_name = "tu servicio"
            if appt.service_id:
                svc = db.query(Service.name).filter(Service.id == appt.service_id).first()
                if svc: service_name = svc[0]

            msg = (f"¡Hola {appt.client_name}! 💇‍♀️ Reservaste un turno en Roma Cabello:\n"
                   f"📅 Fecha: {date_formatted}\n"
                   f"🕒 Hora: {appt.start_time} hs\n"
                   f"✨ Servicio: {service_name}\n\n"
                   f"✅ *Tu turno ha sido registrado correctamente.*\n"
                   f"Te enviaremos un mensaje más cerca de la fecha para confirmar tu asistencia.")

            if dry_run:
                logger.info(f"[DRY-RUN] Enviaría a {appt.client_name} ({appt.client_phone}): {date_formatted} {appt.start_time}")
            else:
                logger.info(f"[REAL] Enviando a {appt.client_name} ({appt.client_phone})...")
                send_whatsapp_sync(appt.client_phone, msg)

        if not dry_run:
            logger.info("--- FIN ENVÍO REAL ---")
        else:
            logger.info("--- FIN DRY RUN ---")

    except Exception as e:
        logger.error(f"Error en script: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Por defecto hacemos Dry Run para seguridad
    mode = sys.argv[1] if len(sys.argv) > 1 else "dry"
    is_dry = (mode != "real")
    run_retroactive_notifications(dry_run=is_dry)
