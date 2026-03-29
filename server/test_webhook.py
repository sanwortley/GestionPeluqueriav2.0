import httpx
from datetime import datetime
from app.db.session import SessionLocal
from app.models.appointment import Appointment

def run_test():
    db = SessionLocal()
    # Find the latest pending appointment
    appt = db.query(Appointment).order_by(Appointment.id.desc()).first()
    
    if not appt:
        print("No appointments found in DB.")
        db.close()
        return

    print(f"Testing with Appointment ID {appt.id} for client phone {appt.client_phone}")
    
    # 1. Simulate that the reminder was sent right now
    appt.confirmation_sent_at = datetime.now()
    appt.status = "PENDING"
    db.commit()
    
    phone = appt.client_phone.replace("+", "").replace(" ", "")
    
    # 2. Simulate the WhatsApp Webhook payload from bridge
    payload = {
        "data": {
            "body": "1",
            "from": f"{phone}@c.us"
        }
    }
    
    # 3. Hit the webhook endpoint
    url = "http://127.0.0.1:8001/api/webhooks/ultramsg"
    try:
        response = httpx.post(url, json=payload, timeout=10.0)
        print(f"Webhook Status Code: {response.status_code}")
        print(f"Webhook Response: {response.text}")
    except Exception as e:
        print(f"Failed to call webhook: {e}")
        
    db.refresh(appt)
    print(f"New Database Status: {appt.status}")

    db.close()

if __name__ == "__main__":
    run_test()
