from sqlalchemy import Column, Integer, Date, Boolean, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base

class AvailabilityDay(Base):
    __tablename__ = "availability_day"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    enabled = Column(Boolean, default=True)
    slot_size_min = Column(Integer, default=45)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    
    ranges = relationship("AvailabilityRange", back_populates="day", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('date', 'staff_id', name='uq_avail_date_staff'),
    )

class AvailabilityRange(Base):
    __tablename__ = "availability_range"

    id = Column(Integer, primary_key=True, index=True)
    availability_day_id = Column(Integer, ForeignKey("availability_day.id"), nullable=False)
    start_time = Column(String, nullable=False) # HH:MM
    end_time = Column(String, nullable=False)   # HH:MM

    day = relationship("AvailabilityDay", back_populates="ranges")
