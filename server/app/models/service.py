from sqlalchemy import Column, Integer, String, Boolean, Float
from app.db.session import Base

class Service(Base):
    __tablename__ = "service"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    duration_min = Column(Integer, default=45, nullable=False)
    price = Column(Float, nullable=True)
    active = Column(Boolean, default=True)
