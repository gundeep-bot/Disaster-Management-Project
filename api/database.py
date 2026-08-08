import os
from sqlalchemy import (
    create_engine, Column, Integer,
    String, Float, Boolean, DateTime, Text
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

    id                 = Column(Integer, primary_key=True, index=True)
    image_name         = Column(String, index=True)
    prediction         = Column(String)            # "Damage" or "No Damage"
    confidence         = Column(Float)             # 0.0 to 100.0
    is_damaged         = Column(Boolean)
    severity_level     = Column(String, default="No Structural Damage")
    triage_priority    = Column(String, default="P4 - Low Urgency")
    affected_area_sqm  = Column(String, default="0 sq m")
    timestamp          = Column(DateTime, default=datetime.utcnow)
    latitude           = Column(Float, nullable=True)
    longitude          = Column(Float, nullable=True)
    heatmap_b64        = Column(Text, nullable=True)   # Base64 Grad-CAM overlay
    ai_advisory        = Column(Text, nullable=True)   # Generated responder text


def create_tables():
    """Safely creates database tables, handling existing schemas gracefully."""
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
    except Exception as e:
        print(f"Database schema setup note: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()