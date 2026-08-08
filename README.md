# 🛡️ AegisVision | Disaster Intelligence System

AegisVision is an enterprise-grade post-disaster satellite imagery assessment and emergency response triage platform powered by PyTorch ResNet18, Grad-CAM spatial explainability, FastAPI, and React.

---

## 🌟 Key Features

- **🛰️ AI Damage Assessment (ResNet18)**: Trained binary classification model achieving **99.00% validation accuracy** and **0.9984 ROC-AUC**.
- **🔥 Grad-CAM Visual Explainability**: Real-time convolutional spatial heatmaps highlighting structural collapse zones overlaying raw satellite tiles.
- **🚨 Automated Emergency Triage**: Calculates 5-tier damage severity levels, P1-P4 triage priority indices, and automated multi-modal responder advisories.
- **🗺️ Geospatial GIS Command Map**: Interactive Leaflet map plotting scanned satellite tiles at exact GPS coordinates with color-coded damage pins and `.geojson` export support.
- **⚡ Stream-Chunked Batch Uploader**: Handles multi-thousand image tile batch processing (5,000+ tiles) with client-side chunking (30 tiles/chunk) and atomic bulk database commits.
- **🌊 Disaster Scenario Simulator**: Pre-configured event simulation engine (*Category 5 Hurricane Katrina*, *Wilmington Storm Surge*, *California Wildfire Collapse*).
- **🔒 Executive Auth Gateway**: Role-Based Access Control (RBAC) with quick-login personas for Incident Commanders, Recon Operators, and GIS Analysts.

---

## 🚀 Quick Start Guide

### 1. Backend Setup (FastAPI)
```bash
# Activate Virtual Environment
& "E:\Capstone Project\Code\venv\Scripts\Activate.ps1"

# Launch FastAPI REST Server
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup (React + Vite)
```bash
# Navigate to frontend folder
cd frontend

# Install Dependencies & Start Dev Server
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 📊 System Architecture

```
Disaster-Management-Project/
├── api/                    # FastAPI Backend REST Service
│   ├── database.py         # SQLAlchemy ORM Models & SQLite Engine
│   ├── main.py             # REST API Endpoints (/predict, /batch, /export/geojson)
│   ├── schemas.py          # Pydantic Schemas
│   └── utils.py            # Grad-CAM Engine & Triage Calculators
├── frontend/               # React Dashboard Command Center
│   ├── src/
│   │   ├── App.jsx         # Executive Command Center Dashboard
│   │   └── index.css       # Glassmorphism Theme Design System
├── models/                 # PyTorch Checkpoints (best_model.pth)
├── src/                    # ML Model & Evaluation Scripts
│   ├── model.py            # ResNet18 Backbone & Grad-CAM Hooks
│   ├── evaluate.py         # Confusion Matrix & ROC Curve Suite
│   └── predict.py          # Grid Visualizer
└── README.md
```
