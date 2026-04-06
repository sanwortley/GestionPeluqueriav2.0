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
            Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
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
                Appointment.created_at, Appointment.status
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

                is_today = (appt_dt.date() == now.date())

                should_send = False
                if not is_today:
                    # Regla Futura: 24 horas antes del turno (o menos si queda poco para mañana)
                    if time_until <= timedelta(hours=24): 
                        should_send = True
                        logger.info(f"  > Cumple REGLA 24H (Turno a futuro, falta menos de un día)")
                else:
                    # Regla del Día: 3 horas antes o en el momento si ya estamos cerca
                    if time_until <= timedelta(hours=3): 
                        should_send = True
                        logger.info(f"  > Cumple REGLA 3H (Turno para hoy mismo)")

                if should_send:
                    date_formatted = row.date.strftime("%d/%m") if hasattr(row.date, 'strftime') else str(row.date)
                    
                    if row.status == AppointmentStatus.PENDING:
                        # Request Confirmation
                        msg = (f"👋 Hola {row.client_name}\n\n"
                               f"Confirmación de tu turno en *Roma Cabello*:\n"
                               f"📅 *{date_formatted}*\n"
                               f"⏰ *{row.start_time} hs*\n"
                               f"💇‍♀️ {service_name}\n\n"
                               f"⚠️ Respondé con un 1 para confirmar o un 2 para cancelar.")
                    else:
                        # Simple Reminder for already CONFIRMED
                        msg = (f"👋 ¡Hola {row.client_name}!\n\n"
                               f"Te recordamos tu turno hoy en *Roma Cabello*:\n"
                               f"📅 *{date_formatted}*\n"
                               f"⏰ *{row.start_time} hs*\n"
                               f"💇‍♀️ {service_name}\n\n"
                               f"¡Te esperamos!")
                    
                    logger.info(f"  > Intentando enviar WhatsApp a {row.client_phone}...")
                    sent_ok = send_whatsapp_sync(row.client_phone, msg)
                    
                    if sent_ok:
                        update_fields = {}
                        if row.status == AppointmentStatus.PENDING:
                            update_fields["confirmation_sent_at"] = datetime.now()
                        else:
                            update_fields["reminder_sent_at"] = datetime.now()
                            
                        db.query(Appointment).filter(Appointment.id == aid).update(update_fields)
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
        # Usamos next_run_time=datetime.now() para que la primera ejecución sea inmediata
        # pero gestionada por el scheduler, evitando doble ejecución manual.
        scheduler.add_job(
            check_confirmations_v2, 
            trigger=IntervalTrigger(minutes=1), 
            id="check_confirmations", 
            replace_existing=True,
            next_run_time=datetime.now()
        )
        scheduler.start()
