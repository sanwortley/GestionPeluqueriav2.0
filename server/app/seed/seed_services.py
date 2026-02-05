from datetime import date
from app.db.session import SessionLocal
from app.models.service import Service
from app.models.availability import AvailabilityDay, AvailabilityRange

def seed_services():
    db = SessionLocal()
    
    # Check if services exist
    if db.query(Service).count() == 0:
        print("Seeding services...")
        services = [
            Service(name="Corte Mujer", duration_min=60, price=15000),
            Service(name="Corte Hombre", duration_min=30, price=10000),
            Service(name="Color", duration_min=120, price=35000),
            Service(name="Brushing", duration_min=45, price=8000),
             Service(name="Nutrición", duration_min=45, price=12000),
        ]
        db.add_all(services)
        db.commit()
    else:
        print("Services already exist.")

    # Check availability
    today = date.today()
    if db.query(AvailabilityDay).filter(AvailabilityDay.date == today).count() == 0:
        print(f"Seeding availability for today ({today})...")
        avail = AvailabilityDay(date=today, enabled=True, slot_size_min=30, staff_id=None) # 30 min slots
        # Ranges
        db.add(avail)
        db.commit() # get ID
        
        ranges = [
            AvailabilityRange(availability_day_id=avail.id, start_time="10:00", end_time="13:00"),
            AvailabilityRange(availability_day_id=avail.id, start_time="14:00", end_time="20:00")
        ]
        db.add_all(ranges)
        db.commit()
    else:
        print("Availability for today already exists.")

    db.close()

if __name__ == "__main__":
    seed_services()
