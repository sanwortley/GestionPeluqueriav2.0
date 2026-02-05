from sqlalchemy import Column, Integer, String, Boolean
from app.db.session import Base

class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    active = Column(Boolean, default=True)
