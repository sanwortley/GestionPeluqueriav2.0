from datetime import date, timedelta
from app.db.session import SessionLocal
from app.models.availability import AvailabilityDay, AvailabilityRange

def seed_schedule():
    db = SessionLocal()
    start_date = date.today()
    days_to_seed = 90  # 3 months

    print(f"Seeding schedule from {start_date} for {days_to_seed} days...")

    count = 0
    for i in range(days_to_seed):
        current_date = start_date + timedelta(days=i)
        
        # Skip Sunday (6) and Monday (0) if desired, but let's enable monolithic logic for now to ensure availability
        # Actually, let's keep it simple: Tue-Sat open. Sun/Mon closed.
        if current_date.weekday() in [5, 6]: # 5=Sat, 6=Sun. Wait, usually Barber shops close Sun/Mon.
            # Let's say Sunday and Monday closed. 
            # 0=Mon, 1=Tue, ..., 5=Sat, 6=Sun
            pass # We can choose to not seed them OR seed them as disabled.
            # Ideally seed as disabled so the admin sees them.
            
        # Check if exists
        exists = db.query(AvailabilityDay).filter(AvailabilityDay.date == current_date).first()
        if not exists:
            # Default logic: Tue-Sat 10-20, Sun/Mon Closed
            is_weekend_off = current_date.weekday() in [0, 6] # Mon(0), Sun(6)
            
            avail = AvailabilityDay(
                date=current_date,
                enabled=not is_weekend_off,
                slot_size_min=30,
                staff_id=None
            )
            db.add(avail)
            db.commit()
            
            if not is_weekend_off:
                ranges = [
                    AvailabilityRange(availability_day_id=avail.id, start_time="10:00", end_time="13:00"),
                    AvailabilityRange(availability_day_id=avail.id, start_time="14:00", end_time="20:00")
                ]
                db.add_all(ranges)
                db.commit()
            
            count += 1
            
    print(f" seeded {count} new days.")
    db.close()

if __name__ == "__main__":
    seed_schedule()
