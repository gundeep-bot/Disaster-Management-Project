import os
from sqlalchemy import (
    create_engine, Column, Integer,
    String, Float, Boolean, DateTime
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./disaster_damage.db"

engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()


class PredictionModel(Base):
    __tablename__ = "predictions"

    id         = Column(Integer, primary_key=True, index=True)
    image_name = Column(String, index=True)
    prediction = Column(String)
    confidence = Column(Float)
    is_damaged = Column(Boolean)
    timestamp  = Column(DateTime, default=datetime.utcnow)
    latitude   = Column(Float, nullable=True)
    longitude  = Column(Float, nullable=True)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()