import os
import sys
import torch
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

# Add root directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.model import DamageClassifier
from api.database import get_db, create_tables, PredictionModel
from api.schemas import PredictionResponse, PredictionRecord, StatsResponse, BatchPredictionResponse
from api.utils import (
    preprocess_image, extract_coordinates, GradCAMEngine,
    determine_severity_and_triage, generate_ai_advisory
)

app = FastAPI(
    title="Disaster Damage AI Command Platform API",
    description="Advanced satellite imagery disaster damage detection, Grad-CAM explainability, and emergency triage platform",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE          = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH      = "models/best_model.pth"
CLASS_NAMES     = ["No Damage", "Damage"]
model           = None
grad_cam_engine = None


@app.on_event("startup")
async def startup_event():
    global model, grad_cam_engine
    create_tables()
    model = DamageClassifier(num_classes=2, pretrained=True)
    
    if os.path.exists(MODEL_PATH):
        try:
            model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
            print(f"Loaded trained model weights from {MODEL_PATH}")
        except Exception as e:
            print(f"Could not load weights ({e}), initializing backbone model.")
    else:
        print("Model checkpoint not found. Using pretrained backbone for inference.")

    model = model.to(DEVICE)
    model.eval()

    try:
        grad_cam_engine = GradCAMEngine(model, model.get_target_layer())
        print("Grad-CAM explainability engine attached.")
    except Exception as e:
        print(f"Grad-CAM attachment note: {e}")


@app.get("/")
def root():
    return {
        "title": "Disaster Damage AI Command Platform API",
        "version": "2.0.0",
        "status": "online",
        "device": str(DEVICE),
        "grad_cam": grad_cam_engine is not None
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "grad_cam_active": grad_cam_engine is not None
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(...),
    db:   Session    = Depends(get_db)
):
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        raise HTTPException(status_code=400, detail="Only JPG, PNG, or WEBP satellite imagery allowed.")

    image_bytes = await file.read()
    tensor, pil_img = preprocess_image(image_bytes)
    tensor = tensor.to(DEVICE)

    with torch.no_grad():
        output     = model(tensor)
        probs      = torch.softmax(output, dim=1)
        conf, pred = torch.max(probs, 1)

    class_name = CLASS_NAMES[pred.item()]
    confidence = float(conf.item() * 100)
    is_damaged = class_name == "Damage"

    severity, triage, area = determine_severity_and_triage(confidence, is_damaged)
    latitude, longitude = extract_coordinates(file.filename)

    heatmap_b64 = None
    if grad_cam_engine:
        heatmap_b64 = grad_cam_engine.generate_heatmap(tensor, pil_img, target_class=pred.item())

    ai_text = generate_ai_advisory(class_name, confidence, severity, triage, latitude, longitude)

    record = PredictionModel(
        image_name         = file.filename,
        prediction         = class_name,
        confidence         = round(confidence, 2),
        is_damaged         = is_damaged,
        severity_level     = severity,
        triage_priority    = triage,
        affected_area_sqm  = area,
        timestamp          = datetime.utcnow(),
        latitude           = latitude,
        longitude          = longitude,
        heatmap_b64        = heatmap_b64,
        ai_advisory        = ai_text
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return PredictionResponse(
        id                 = record.id,
        image_name         = record.image_name,
        prediction         = record.prediction,
        confidence         = record.confidence,
        is_damaged         = record.is_damaged,
        severity_level     = record.severity_level,
        triage_priority    = record.triage_priority,
        affected_area_sqm  = record.affected_area_sqm,
        timestamp          = record.timestamp,
        latitude           = record.latitude,
        longitude          = record.longitude,
        heatmap_b64        = record.heatmap_b64,
        ai_advisory        = record.ai_advisory
    )


@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(
    files: List[UploadFile] = File(...),
    db:    Session          = Depends(get_db)
):
    """
    High-throughput batch endpoint designed for large multi-thousand image sets.
    Performs fast GPU inference and single bulk database commit.
    """
    results = []
    db_records = []
    damaged_count = 0

    for file in files:
        if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue

        try:
            image_bytes = await file.read()
            tensor, pil_img = preprocess_image(image_bytes)
            tensor = tensor.to(DEVICE)

            with torch.no_grad():
                output     = model(tensor)
                probs      = torch.softmax(output, dim=1)
                conf, pred = torch.max(probs, 1)

            class_name = CLASS_NAMES[pred.item()]
            confidence = float(conf.item() * 100)
            is_damaged = class_name == "Damage"
            if is_damaged:
                damaged_count += 1

            severity, triage, area = determine_severity_and_triage(confidence, is_damaged)
            latitude, longitude = extract_coordinates(file.filename)

            record = PredictionModel(
                image_name         = file.filename,
                prediction         = class_name,
                confidence         = round(confidence, 2),
                is_damaged         = is_damaged,
                severity_level     = severity,
                triage_priority    = triage,
                affected_area_sqm  = area,
                timestamp          = datetime.utcnow(),
                latitude           = latitude,
                longitude          = longitude,
                heatmap_b64        = None, # Exclude heavy base64 heatmaps for batch performance
                ai_advisory        = None
            )
            db_records.append(record)

            results.append(PredictionResponse(
                id                 = None,
                image_name         = file.filename,
                prediction         = class_name,
                confidence         = round(confidence, 2),
                is_damaged         = is_damaged,
                severity_level     = severity,
                triage_priority    = triage,
                affected_area_sqm  = area,
                timestamp          = datetime.utcnow(),
                latitude           = latitude,
                longitude          = longitude,
                heatmap_b64        = None,
                ai_advisory        = None
            ))
        except Exception as e:
            print(f"Skipping tile {file.filename} due to: {e}")
            continue

    # Bulk insert all records in one atomic commit
    if db_records:
        try:
            db.bulk_save_objects(db_records)
            db.commit()
        except Exception as e:
            print(f"Bulk insert note: {e}")
            db.rollback()

    total = len(results)
    return BatchPredictionResponse(
        total_processed = total,
        total_damaged   = damaged_count,
        total_undamaged = total - damaged_count,
        predictions     = results
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
            average_confidence = 0.0,
            p1_critical_count  = 0,
            p2_urgent_count    = 0
        )
    total    = len(all_records)
    damaged  = sum(1 for r in all_records if r.is_damaged)
    avg_conf = sum(r.confidence for r in all_records) / total
    p1_count = sum(1 for r in all_records if r.triage_priority and "P1" in r.triage_priority)
    p2_count = sum(1 for r in all_records if r.triage_priority and "P2" in r.triage_priority)

    return StatsResponse(
        total_predictions  = total,
        total_damaged      = damaged,
        total_undamaged    = total - damaged,
        damage_percentage  = round(100 * damaged / total, 2),
        average_confidence = round(avg_conf, 2),
        p1_critical_count  = p1_count,
        p2_urgent_count    = p2_count
    )


@app.get("/export/geojson")
def export_geojson(db: Session = Depends(get_db)):
    records = db.query(PredictionModel).all()
    features = []

    for r in records:
        if r.latitude is not None and r.longitude is not None:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [r.longitude, r.latitude]
                },
                "properties": {
                    "id": r.id,
                    "image_name": r.image_name,
                    "prediction": r.prediction,
                    "confidence": r.confidence,
                    "severity_level": r.severity_level,
                    "triage_priority": r.triage_priority,
                    "timestamp": r.timestamp.isoformat() if r.timestamp else None
                }
            })

    return JSONResponse(content={
        "type": "FeatureCollection",
        "features": features
    })


@app.get("/simulation/scenarios")
def get_simulation_scenarios():
    return [
        {
            "id": "scenario_hurricane_katrina",
            "title": "Hurricane Katrina Inundation Sector",
            "region": "New Orleans Coastal Basin, LA",
            "hazard_type": "Category 5 Hurricane & Levee Failure",
            "sample_coordinates": {"lat": 29.9511, "lng": -90.0715},
            "estimated_tiles": 24,
            "risk_level": "CRITICAL"
        },
        {
            "id": "scenario_florence_coastal",
            "title": "Coastal Storm Surge Inspection",
            "region": "Wilmington Coast, NC",
            "hazard_type": "Storm Surge & Flood Inundation",
            "sample_coordinates": {"lat": 34.2257, "lng": -77.9447},
            "estimated_tiles": 18,
            "risk_level": "HIGH"
        },
        {
            "id": "scenario_california_fire",
            "title": "Wildfire Structure Collapse Scan",
            "region": "Paradise Valley, CA",
            "hazard_type": "Wildfire Thermal Destruction",
            "sample_coordinates": {"lat": 39.7596, "lng": -121.6219},
            "estimated_tiles": 30,
            "risk_level": "CRITICAL"
        }
    ]


@app.delete("/results/clear")
def clear_results(db: Session = Depends(get_db)):
    db.query(PredictionModel).delete()
    db.commit()
    return {"message": "All database records successfully reset."}