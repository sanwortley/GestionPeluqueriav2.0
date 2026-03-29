from app.db.session import SessionLocal
from app.models.appointment import Appointment
from datetime import datetime

def check_db():
    db = SessionLocal()
    last_appt = db.query(Appointment).order_by(Appointment.id.desc()).first()
    if last_appt:
        print(f"ID: {last_appt.id}")
        print(f"Date: {last_appt.date}, Time: {last_appt.start_time}")
        print(f"Status: {last_appt.status}")
        print(f"Confirmation Sent At: {last_appt.confirmation_sent_at}")
    else:
        print("No appointments found.")
    db.close()

if __name__ == "__main__":
    check_db()
