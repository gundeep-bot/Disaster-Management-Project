import os
import sys
import torch
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.model import DamageClassifier
from api.database import get_db, create_tables, PredictionModel
from api.schemas import PredictionResponse, PredictionRecord, StatsResponse
from api.utils import preprocess_image, extract_coordinates

app = FastAPI(
    title="Disaster Damage Detection API",
    description="AI-powered satellite image damage detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH  = "models/best_model.pth"
CLASS_NAMES = ["No Damage", "Damage"]
model       = None


@app.on_event("startup")
async def startup_event():
    global model
    create_tables()
    model = DamageClassifier(num_classes=2)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model = model.to(DEVICE)
    model.eval()
    print(f"Model loaded on {DEVICE}")


@app.get("/")
def root():
    return {
        "message": "Disaster Damage Detection API",
        "status":  "running",
        "device":  str(DEVICE)
    }


@app.get("/health")
def health():
    return {
        "status":       "healthy",
        "model_loaded": model is not None
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(...),
    db:   Session    = Depends(get_db)
):
    if not file.filename.endswith(('.jpg', '.jpeg', '.png')):
        raise HTTPException(status_code=400, detail="Only JPG/PNG images allowed")

    image_bytes = await file.read()
    tensor      = preprocess_image(image_bytes).to(DEVICE)

    with torch.no_grad():
        output     = model(tensor)
        probs      = torch.softmax(output, dim=1)
        conf, pred = torch.max(probs, 1)

    class_name = CLASS_NAMES[pred.item()]
    confidence = conf.item() * 100
    is_damaged = class_name == "Damage"
    latitude, longitude = extract_coordinates(file.filename)

    record = PredictionModel(
        image_name  = file.filename,
        prediction  = class_name,
        confidence  = confidence,
        is_damaged  = is_damaged,
        timestamp   = datetime.utcnow(),
        latitude    = latitude,
        longitude   = longitude
    )
    db.add(record)
    db.commit()

    return PredictionResponse(
        image_name  = file.filename,
        prediction  = class_name,
        confidence  = round(confidence, 2),
        is_damaged  = is_damaged,
        timestamp   = datetime.utcnow(),
        latitude    = latitude,
        longitude   = longitude
    )


@app.get("/results", response_model=List[PredictionRecord])
def get_results(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(PredictionModel)\
             .order_by(PredictionModel.timestamp.desc())\
             .limit(limit).all()


@app.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    all_records = db.query(PredictionModel).all()
    if not all_records:
        return StatsResponse(
            total_predictions  = 0,
            total_damaged      = 0,
            total_undamaged    = 0,
            damage_percentage  = 0.0,
            average_confidence = 0.0
        )
    total      = len(all_records)
    damaged    = sum(1 for r in all_records if r.is_damaged)
    avg_conf   = sum(r.confidence for r in all_records) / total
    return StatsResponse(
        total_predictions  = total,
        total_damaged      = damaged,
        total_undamaged    = total - damaged,
        damage_percentage  = round(100 * damaged / total, 2),
        average_confidence = round(avg_conf, 2)
    )


@app.delete("/results/clear")
def clear_results(db: Session = Depends(get_db)):
    db.query(PredictionModel).delete()
    db.commit()
    return {"message": "All records cleared"}