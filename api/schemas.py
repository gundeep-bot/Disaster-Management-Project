from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class PredictionResponse(BaseModel):
    """Response returned after predicting damage on a satellite image tile."""
    id:                 Optional[int] = None
    image_name:         str
    prediction:         str        # "Damage" or "No Damage"
    confidence:         float      # 0.0 to 100.0
    is_damaged:         bool
    severity_level:     str
    triage_priority:    str
    affected_area_sqm:  str
    timestamp:          datetime
    latitude:           Optional[float] = None
    longitude:          Optional[float] = None
    heatmap_b64:        Optional[str] = None
    ai_advisory:        Optional[str] = None


class PredictionRecord(BaseModel):
    """Record stored in the database."""
    id:                 int
    image_name:         str
    prediction:         str
    confidence:         float
    is_damaged:         bool
    severity_level:     Optional[str] = "No Structural Damage"
    triage_priority:    Optional[str] = "P4 - Low Urgency"
    affected_area_sqm:  Optional[str] = "0 sq m"
    timestamp:          datetime
    latitude:           Optional[float] = None
    longitude:          Optional[float] = None
    heatmap_b64:        Optional[str] = None
    ai_advisory:        Optional[str] = None

    class Config:
        from_attributes = True


class BatchPredictionResponse(BaseModel):
    """Response returned for batch satellite tile uploads."""
    total_processed:   int
    total_damaged:     int
    total_undamaged:   int
    predictions:       List[PredictionResponse]


class StatsResponse(BaseModel):
    """Summary statistics of all predictions."""
    total_predictions:    int
    total_damaged:        int
    total_undamaged:      int
    damage_percentage:    float
    average_confidence:   float
    p1_critical_count:    int
    p2_urgent_count:      int