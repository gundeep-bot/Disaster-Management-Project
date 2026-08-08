from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PredictionResponse(BaseModel):
    """Response returned after predicting damage on an image."""
    image_name:   str
    prediction:   str        # "Damage" or "No Damage"
    confidence:   float      # 0.0 to 100.0
    is_damaged:   bool
    timestamp:    datetime
    latitude:     Optional[float] = None
    longitude:    Optional[float] = None


class PredictionRecord(BaseModel):
    """Record stored in the database."""
    id:           int
    image_name:   str
    prediction:   str
    confidence:   float
    is_damaged:   bool
    timestamp:    datetime
    latitude:     Optional[float] = None
    longitude:    Optional[float] = None

    class Config:
        from_attributes = True


class StatsResponse(BaseModel):
    """Summary statistics of all predictions."""
    total_predictions:    int
    total_damaged:        int
    total_undamaged:      int
    damage_percentage:    float
    average_confidence:   float