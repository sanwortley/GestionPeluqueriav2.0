from sqlalchemy import Column, Integer, Date, String, ForeignKey
from app.db.session import Base

class Block(Base):
    __tablename__ = "block"

    id = Column(Integer, primary_key=True, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    start_time = Column(String, nullable=False) # HH:MM
    end_time = Column(String, nullable=False)   # HH:MM
    reason = Column(String, nullable=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
