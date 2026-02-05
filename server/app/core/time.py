from datetime import datetime, date, time
import pytz
from app.core.config import settings

tz = pytz.timezone(settings.TIMEZONE)

def get_current_time():
    """Get current time in the application timezone."""
    return datetime.now(tz)

def to_local(dt: datetime):
    """Convert UTC or naive datetime to local timezone."""
    if dt.tzinfo is None:
        return tz.localize(dt)
    return dt.astimezone(tz)

def get_today():
    """Get today's date in local timezone."""
    return get_current_time().date()
