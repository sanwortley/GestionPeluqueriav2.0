import enum
from sqlalchemy import Column, Integer, Date, String, ForeignKey, Enum, DateTime, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class AppointmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    FINISHED = "FINISHED"

class Appointment(Base):
    __tablename__ = "appointment"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(String, nullable=False) # HH:MM
    end_time = Column(String, nullable=False)   # HH:MM
    
    service_id = Column(Integer, ForeignKey("service.id"), nullable=False)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    
    client_name = Column(String, nullable=False)
    client_phone = Column(String, nullable=False)
    client_id = Column(Integer, ForeignKey("client.id"), nullable=True)
    note = Column(String, nullable=True)
    
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.CONFIRMED, nullable=False)
    is_paid = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    service = relationship("Service")
    staff = relationship("Staff")
    client = relationship("Client", back_populates="appointments")

    # Constraint to prevent double booking on same day/time/staff (if staff exists)
    # Logic in service layer may be more complex, but this basic one helps.
    # We won't enforce unique constraint on DB strictly if staff is nullable because multiple appts could happen if we have generic slots?
    # Actually, if staff is null, that means ANYONE can take it, or it's a single-person salon. 
    # For now, let's rely on application logic for complex collision checks.
