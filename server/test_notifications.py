from datetime import datetime, timedelta
from app.db.session import SessionLocal
from app.models.appointment import Appointment, AppointmentStatus
from app.models.service import Service
from app.services.automated_tasks import check_confirmations_v2
import logging

logging.basicConfig(level=logging.INFO)

def run_test():
    db = SessionLocal()
    target_phone = "3517552167"
    
    try:
        service = db.query(Service).first()
        sid = service.id if service else 1
        
        # Limpieza
        db.query(Appointment).filter(Appointment.client_phone == target_phone, Appointment.client_name.like("TEST_%")).delete()
        db.commit()

        now = datetime.now()
        
        # Caso 1: 24h
        # Agregando end_time para cumplir el constraint
        a = Appointment(
            client_name="TEST_24HS", 
            client_phone=target_phone, 
            service_id=sid, 
            status=AppointmentStatus.PENDING,
            date=(now + timedelta(hours=24)).date(), 
            start_time=now.strftime("%H:%M"),
            end_time=(now + timedelta(hours=25)).strftime("%H:%M"),
            created_at=now - timedelta(days=2)
        )
        
        # Caso 2: 1h
        b = Appointment(
            client_name="TEST_1H", 
            client_phone=target_phone, 
            service_id=sid, 
            status=AppointmentStatus.PENDING,
            date=now.date(), 
            start_time=(now + timedelta(minutes=45)).strftime("%H:%M"),
            end_time=(now + timedelta(minutes=75)).strftime("%H:%M"),
            created_at=now - timedelta(minutes=5)
        )

        db.add_all([a, b])
        db.commit()
        ids = [a.id, b.id]
        print(f"IDs Creados para el test: {ids}")

        print("\nEjecutando check_confirmations_v2()...")
        check_confirmations_v2()

        # Verificar
        db.expire_all()
        results = db.query(Appointment).filter(Appointment.id.in_(ids)).order_by(Appointment.id).all()
        
        print("\n--- RESULTADOS ---")
        for r in results:
            sent = "SI ✅" if r.confirmation_sent_at else "NO ❌"
            print(f"ID {r.id} ({r.client_name}): Enviado? {sent}")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
