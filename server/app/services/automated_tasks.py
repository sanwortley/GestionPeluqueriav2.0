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
    db = SessionLocal()
    try:
        now = datetime.now()
        logger.info(f"--- INICIO CHEQUEO V2 ({now.strftime('%H:%M:%S')}) ---")
        
        limit_date = (now + timedelta(days=3)).date()
        today = now.date()
        
        q = db.query(Appointment.id).filter(
            Appointment.status == AppointmentStatus.PENDING,
            Appointment.confirmation_sent_at.is_(None),
            Appointment.date >= today,
            Appointment.date <= limit_date
        )
        ids = [r[0] for r in q.all()]
        logger.info(f"Turnos candidatos encontrados: {ids}")

        for aid in ids:
            row = db.query(
                Appointment.id, Appointment.client_name, Appointment.client_phone, 
                Appointment.service_id, Appointment.date, Appointment.start_time, 
                Appointment.created_at
            ).filter(Appointment.id == aid).first()
            if not row: continue

            try:
                # 1. Nombre servicio
                service_name = "el servicio"
                if row.service_id:
                    svc = db.query(Service.name).filter(Service.id == row.service_id).first()
                    if svc: service_name = svc[0]

                # 2. Parsing tiempos
                appt_time_obj = datetime.strptime(row.start_time, "%H:%M").time()
                appt_dt = datetime.combine(row.date, appt_time_obj)
                
                # Normalizar lead time (quitar TZs)
                created_at = row.created_at.replace(tzinfo=None) if row.created_at else (appt_dt - timedelta(days=2))
                
                lead_time = appt_dt - created_at
                time_until = appt_dt - now

                logger.info(f"ID {aid} ({row.client_name}): Lead={lead_time}, Until={time_until}")

                should_send = False
                if lead_time >= timedelta(hours=24):
                    if time_until <= timedelta(hours=25): 
                        should_send = True
                        logger.info(f"  > Cumple REGLA 24H")
                else:
                    if time_until <= timedelta(minutes=75): 
                        should_send = True
                        logger.info(f"  > Cumple REGLA 1H")

                if should_send:
                    msg = (f"👋 Hola {row.client_name}\n\n"
                           f"Confirmación de tu turno en *Roma Cabello*:\n"
                           f"📅 *{row.date.strftime('%d/%m')}*\n"
                           f"⏰ *{row.start_time} hs*\n"
                           f"💇‍♀️ {service_name}\n\n"
                           f"⚠️ Respondé con un 1 para confirmar o un 2 para cancelar.")
                    
                    logger.info(f"  > Intentando enviar WhatsApp a {row.client_phone}...")
                    sent_ok = send_whatsapp_sync(row.client_phone, msg)
                    
                    if sent_ok:
                        db.query(Appointment).filter(Appointment.id == aid).update({
                            "confirmation_sent_at": datetime.now()
                        })
                        db.commit()
                        logger.info(f"  > EXITOSO ✅")
                    else:
                        logger.error(f"  > FALLÓ EL ENVÍO (Bridge desconectado o error) ❌")

            except Exception as e:
                logger.error(f"  > ERROR EN PROCESO ID {aid}: {e}")
                db.rollback()
                
    except Exception as e:
        logger.error(f"Error Crítico: {e}")
    finally:
        db.close()

def start_scheduler():
    if not scheduler.get_jobs():
        scheduler.add_job(check_confirmations_v2, trigger=IntervalTrigger(minutes=15), id="check_confirmations", replace_existing=True)
        scheduler.start()
