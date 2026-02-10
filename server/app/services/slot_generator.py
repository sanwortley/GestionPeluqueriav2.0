from datetime import datetime, date, timedelta, time
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.models.availability import AvailabilityDay, AvailabilityRange
from app.models.block import Block
from app.models.appointment import Appointment, AppointmentStatus
from app.models.service import Service
from app.core.time import get_current_time, tz
import pytz

# Defaults
DEFAULT_RANGES = [
    ("10:00", "13:00"),
    ("14:45", "21:30")
]
DEFAULT_SLOT_SIZE = 45

def parse_time(t_str: str) -> time:
    h, m = map(int, t_str.split(':'))
    return time(h, m)

def time_to_min(t: time) -> int:
    return t.hour * 60 + t.minute

def min_to_time(m: int) -> str:
    h = m // 60
    mm = m % 60
    return f"{h:02d}:{mm:02d}"

def is_overlapping(start1, end1, start2, end2):
    # (StartA < EndB) and (EndA > StartB)
    return max(start1, start2) < min(end1, end2)

def generate_slots(
    db: Session,
    target_date: date,
    service_id: int,
    staff_id: Optional[int] = None
) -> List[dict]:
    # 1. Get Service Duration
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        return []
    duration = service.duration_min


    # 2. Get Availability
    # Check if date is in the past
    current_time = get_current_time()
    if target_date < current_time.date():
        return []
        
    # Check if specific day config exists
    query = db.query(AvailabilityDay).filter(AvailabilityDay.date == target_date)
    if staff_id:
        query = query.filter(AvailabilityDay.staff_id == staff_id)
    else:
        query = query.filter(AvailabilityDay.staff_id.is_(None))
    
    avail_day = query.first()

    # If looking at today, we must filter out passed time
    is_today = (target_date == current_time.date())
    now_minutes = time_to_min(current_time.time()) if is_today else -1

    ranges = []
    slot_size = DEFAULT_SLOT_SIZE
    
    if avail_day:
        if not avail_day.enabled:
            return []
        slot_size = avail_day.slot_size_min
        for r in avail_day.ranges:
            ranges.append((r.start_time, r.end_time))
    else:
        # If no config found, the day is considered closed
        return []

    # 3. Generate Candidate Slots
    candidates = []
    
    for r_start, r_end in ranges:
        start_min = time_to_min(parse_time(r_start))
        end_min = time_to_min(parse_time(r_end))
        
        curr = start_min
        while curr + duration <= end_min:
            s_start = curr
            s_end = curr + duration
            
            # Check past
            if is_today and s_start < now_minutes:
                curr += slot_size
                continue

            candidates.append({"start": s_start, "end": s_end})
            curr += slot_size

    if not candidates:
        return []

    # 4. Fetch Blocks and Appointments to filter
    blocks_query = db.query(Block).filter(Block.start_date <= target_date, Block.end_date >= target_date)
    if staff_id:
        blocks_query = blocks_query.filter(or_(Block.staff_id == staff_id, Block.staff_id.is_(None)))
    else:
        blocks_query = blocks_query.filter(Block.staff_id.is_(None))
    blocks = blocks_query.all()

    # Appointments
    appts_query = db.query(Appointment).filter(
        Appointment.date == target_date,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.FINISHED])
    )
    if staff_id:
        appts_query = appts_query.filter(Appointment.staff_id == staff_id)
    else:
        appts_query = appts_query.filter(Appointment.staff_id.is_(None))
    appts = appts_query.all()

    final_slots = []
    for slot in candidates:
        conflict = False
        s_s = slot["start"]
        s_e = slot["end"]

        # Check Blocks
        for b in blocks:
            b_s = time_to_min(parse_time(b.start_time))
            b_e = time_to_min(parse_time(b.end_time))
            if is_overlapping(s_s, s_e, b_s, b_e):
                conflict = True
                break
        
        if conflict: continue

        # Check Appts
        for a in appts:
            a_s = time_to_min(parse_time(a.start_time))
            a_e = time_to_min(parse_time(a.end_time))
            if is_overlapping(s_s, s_e, a_s, a_e):
                conflict = True
                break
        
        if not conflict:
            final_slots.append({
                "start_time": min_to_time(s_s),
                "end_time": min_to_time(s_e)
            })

    return final_slots
