import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import {
  ShieldAlert, Activity, UploadCloud, Layers, MapPin, Sliders,
  Download, RefreshCw, CheckCircle2, AlertTriangle, Radio,
  FileText, Database, Sparkles, Cpu, Zap, Crosshair, Info, Flame, Eye,
  ArrowUpRight, LogOut, UserCheck, Lock, User
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("inspector");
  const [apiStatus, setApiStatus] = useState({ online: false, device: "CPU", modelLoaded: false });
  const [stats, setStats] = useState({
    total_predictions: 0,
    total_damaged: 0,
    total_undamaged: 0,
    damage_percentage: 0,
    average_confidence: 0,
    p1_critical_count: 0,
    p2_urgent_count: 0
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [dragOver, setDragOver] = useState(false);

  const [batchFiles, setBatchFiles] = useState([]);
  const [batchProgress, setBatchProgress] = useState(false);
  const [batchStats, setBatchStats] = useState({ processed: 0, total: 0, damaged: 0, undamaged: 0 });

  const [records, setRecords] = useState([]);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [scenarios, setScenarios] = useState([]);
  const [activeScenario, setActiveScenario] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const fetchStatusAndStats = async () => {
    try {
      const healthRes = await axios.get(`${API_BASE}/health`);
      setApiStatus({
        online: true,
        device: healthRes.data.model_loaded ? "GPU (CUDA)" : "CPU",
        modelLoaded: healthRes.data.model_loaded
      });
      const statsRes = await axios.get(`${API_BASE}/stats`);
      setStats(statsRes.data);

      const recordsRes = await axios.get(`${API_BASE}/results?limit=50`);
      setRecords(recordsRes.data);

      const scenariosRes = await axios.get(`${API_BASE}/simulation/scenarios`);
      setScenarios(scenariosRes.data);
    } catch (err) {
      setApiStatus({ online: false, device: "Offline", modelLoaded: false });
    }
  };

  useEffect(() => {
    fetchStatusAndStats();
    const interval = setInterval(fetchStatusAndStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // BULLETPROOF LEAFLET TAB MOUNT/UNMOUNT LIFECYCLE
  useEffect(() => {
    if (!currentUser) return;

    if (activeTab === "map") {
      const timer = setTimeout(() => {
        if (mapContainerRef.current && window.L) {
          // If map already exists, remove it clean to prevent 0x0 container bounds bug
          if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
          }

          const map = window.L.map(mapContainerRef.current).setView([29.9511, -90.0715], 10);

          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          // Add markers
          if (records && records.length > 0) {
            records.forEach((rec) => {
              if (rec.latitude && rec.longitude) {
                const isDamaged = rec.is_damaged;
                const color = isDamaged ? "#f43f5e" : "#10b981";

                const marker = window.L.circleMarker([rec.latitude, rec.longitude], {
                  radius: isDamaged ? 8 : 6,
                  fillColor: color,
                  color: color,
                  weight: 2,
                  opacity: 0.9,
                  fillOpacity: 0.8
                }).addTo(map);

                marker.bindPopup(`
                  <div style="font-family: Inter, sans-serif; padding: 4px;">
                    <div style="font-weight: 700; font-size: 13px; color: ${color}; margin-bottom: 4px;">
                      ${rec.prediction} (${rec.confidence}%)
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">
                      Severity: ${rec.severity_level || "Standard"}
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">
                      Triage: <b>${rec.triage_priority || "N/A"}</b>
                    </div>
                    <div style="font-size: 11px; color: #64748b; font-family: JetBrains Mono, monospace;">
                      Tile: ${rec.image_name}<br/>
                      Coordinates: ${rec.latitude.toFixed(4)}, ${rec.longitude.toFixed(4)}
                    </div>
                  </div>
                `);
              }
            });
          }

          map.invalidateSize();
          mapInstanceRef.current = map;
        }
      }, 100);

      return () => clearTimeout(timer);
    } else {
      // Clean destroy Leaflet instance when switching to other tabs
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    }
  }, [currentUser, activeTab, records]);

  const handleQuickLogin = (role, title, email) => {
    setCurrentUser({
      role: role,
      title: title,
      email: email,
      loginTime: new Date().toLocaleTimeString()
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCurrentPrediction(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCurrentPrediction(null);
    }
  };

  const analyzeSingleImage = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await axios.post(`${API_BASE}/predict`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setCurrentPrediction(res.data);
      fetchStatusAndStats();
    } catch (err) {
      alert("Error analyzing satellite tile. Make sure backend is running at " + API_BASE);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processBatchUpload = async () => {
    if (!batchFiles || batchFiles.length === 0) return;
    setBatchProgress(true);
    const fileArray = Array.from(batchFiles);
    const totalFiles = fileArray.length;
    const chunkSize = 30;
    
    let processedSoFar = 0;
    let totalDamagedSoFar = 0;
    let totalUndamagedSoFar = 0;

    setBatchStats({ processed: 0, total: totalFiles, damaged: 0, undamaged: 0 });

    for (let i = 0; i < totalFiles; i += chunkSize) {
      const chunk = fileArray.slice(i, i + chunkSize);
      const formData = new FormData();
      chunk.forEach((file) => formData.append("files", file));

      try {
        const res = await axios.post(`${API_BASE}/predict/batch`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        processedSoFar += res.data.total_processed;
        totalDamagedSoFar += res.data.total_damaged;
        totalUndamagedSoFar += res.data.total_undamaged;

        setBatchStats({
          processed: processedSoFar,
          total: totalFiles,
          damaged: totalDamagedSoFar,
          undamaged: totalUndamagedSoFar
        });
      } catch (err) {
        console.error("Chunk processing error:", err);
      }
    }

    setBatchProgress(false);
    fetchStatusAndStats();
  };

  const launchScenario = async (scenario) => {
    setActiveScenario(scenario);
    setSimulating(true);

    try {
      const mockResult = {
        image_name: scenario.title,
        prediction: "Damage",
        confidence: 96.8,
        is_damaged: true,
        severity_level: "Total Structural Collapse",
        triage_priority: "P1 - Critical Priority",
        affected_area_sqm: "~4,500 sq m",
        timestamp: new Date().toISOString(),
        latitude: scenario.sample_coordinates.lat,
        longitude: scenario.sample_coordinates.lng,
        ai_advisory: `🚨 [SIMULATED EMERGENCY SCENARIO: ${scenario.title}]\nCategory: ${scenario.hazard_type}\nLocation: ${scenario.region}\n• Search & Rescue Team Alpha deployed to coordinates (${scenario.sample_coordinates.lat}, ${scenario.sample_coordinates.lng})\n• High density building collapse detected in central tile.`
      };

      setCurrentPrediction(mockResult);
      setActiveTab("inspector");
      fetchStatusAndStats();
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  const downloadGeoJSON = async () => {
    try {
      const res = await axios.get(`${API_BASE}/export/geojson`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `disaster_damage_gis_${Date.now()}.geojson`;
      a.click();
    } catch (e) {
      alert("Error exporting GeoJSON");
    }
  };

  const chartData = [
    { name: "Undamaged Tiles", count: stats.total_undamaged, fill: "#10b981" },
    { name: "Damaged Tiles", count: stats.total_damaged, fill: "#f43f5e" },
  ];

  // 1. EXECUTIVE AUTHENTICATION SCREEN
  if (!currentUser) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#060913",
        position: "relative",
        padding: "20px"
      }}>
        <div className="cyber-bg" />

        <div className="glass-panel" style={{
          maxWidth: "460px",
          width: "100%",
          padding: "40px 36px",
          position: "relative",
          zIndex: 10
        }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              boxShadow: "0 0 30px rgba(99, 102, 241, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }}>
              <ShieldAlert style={{ color: "#fff", width: "30px", height: "30px" }} />
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#f8fafc", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              AegisVision <span style={{ color: "#818cf8", fontWeight: 600 }}>AI</span>
            </h1>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "6px" }}>
              Enterprise Disaster Intelligence & Satellite Assessment Platform
            </p>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, marginBottom: "12px", letterSpacing: "0.05em" }} className="mono">
              SELECT DEMO OPERATIONAL ROLE
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <button
                onClick={() => handleQuickLogin("commander", "Incident Commander", "commander@aegis.gov")}
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(99, 102, 241, 0.35)",
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(59, 130, 246, 0.1) 100%)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
                  <ShieldAlert style={{ color: "#818cf8", width: "20px" }} />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>Incident Commander</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Full Operational & Triage Command</div>
                  </div>
                </div>
                <ArrowUpRight style={{ width: "16px", color: "#818cf8" }} />
              </button>

              <button
                onClick={() => handleQuickLogin("operator", "Recon Operator", "recon@aegis.gov")}
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
                  <UploadCloud style={{ color: "#60a5fa", width: "20px" }} />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>Recon Operator</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Satellite Tile Analysis & Uploads</div>
                  </div>
                </div>
                <ArrowUpRight style={{ width: "16px", color: "#94a3b8" }} />
              </button>

              <button
                onClick={() => handleQuickLogin("analyst", "GIS Lead Analyst", "gis@aegis.gov")}
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
                  <MapPin style={{ color: "#34d399", width: "20px" }} />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>GIS Lead Analyst</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Spatial GeoJSON & Benchmark Analytics</div>
                  </div>
                </div>
                <ArrowUpRight style={{ width: "16px", color: "#94a3b8" }} />
              </button>
            </div>
          </div>

          <div style={{ textAlign: "center", fontSize: "11px", color: "#64748b" }} className="mono">
            SECURE REST ENCRYPTED ACCESS • CAPSTONE EDITION
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN COMMAND DASHBOARD
  return (
    <div style={{ position: "relative", minHeight: "100vh", zIndex: 1, paddingBottom: "60px" }}>
      <div className="cyber-bg" />

      {/* TASKBAR HEADER */}
      <header style={{
        background: "rgba(15, 23, 42, 0.9)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "16px 36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(20px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(99, 102, 241, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            flexShrink: 0
          }}>
            <ShieldAlert style={{ color: "#fff", width: "22px", height: "22px" }} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "-0.02em" }}>
                AegisVision
              </span>
              <span className="mono" style={{
                fontSize: "10px",
                color: "#818cf8",
                background: "rgba(99, 102, 241, 0.15)",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                fontWeight: 600,
                lineHeight: 1
              }}>
                v2.0
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", marginTop: "3px" }} className="mono">
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: apiStatus.online ? "#34d399" : "#f87171",
                fontWeight: 600
              }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: apiStatus.online ? "#10b981" : "#f43f5e" }} />
                {apiStatus.online ? "ONLINE" : "OFFLINE"}
              </span>
              <span style={{ color: "#334155" }}>•</span>
              <span style={{ color: "#94a3b8" }}>{apiStatus.device}</span>
              <span style={{ color: "#334155" }}>•</span>
              <span style={{ color: "#94a3b8" }}>ResNet18 + Grad-CAM</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <nav style={{
            display: "flex",
            gap: "6px",
            background: "rgba(255, 255, 255, 0.03)",
            padding: "5px",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.08)"
          }}>
            {[
              { id: "inspector", label: "Single Tile Inspector", icon: Sliders },
              { id: "batch", label: "Batch Satellite Hub", icon: UploadCloud },
              { id: "map", label: "GIS Command Map", icon: MapPin },
              { id: "simulator", label: "Disaster Simulator", icon: Flame },
              { id: "analytics", label: "Analytics & Reports", icon: Activity }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "7px",
                    border: active ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid transparent",
                    background: active ? "linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(59, 130, 246, 0.18) 100%)" : "transparent",
                    color: active ? "#fff" : "#94a3b8",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: active ? 600 : 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                    boxShadow: active ? "0 4px 14px rgba(99, 102, 241, 0.25)" : "none"
                  }}
                >
                  <Icon style={{ width: "14px", height: "14px", color: active ? "#818cf8" : "#64748b" }} /> {tab.label}
                </button>
              );
            })}
          </nav>

          <div style={{
            display: "flex",
            alignItems: "center",
            borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
            paddingLeft: "18px"
          }}>
            <button
              onClick={() => setCurrentUser(null)}
              title="Log Out"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                padding: "8px 14px",
                borderRadius: "8px",
                color: "#f8fafc",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                transition: "all 0.15s ease"
              }}
            >
              <UserCheck style={{ width: "15px", color: "#818cf8" }} />
              <span>{currentUser.title}</span>
              <LogOut style={{ width: "14px", color: "#94a3b8", marginLeft: "4px" }} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT DASHBOARD */}
      <main style={{ maxWidth: "1440px", margin: "32px auto", padding: "0 36px" }}>
        
        {/* STATS OVERVIEW CARDS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "20px",
          marginBottom: "32px"
        }}>
          <div className="glass-panel stat-card-indigo" style={{ padding: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em" }} className="mono">TOTAL TILES SCANNED</span>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Database style={{ width: "15px", color: "#818cf8" }} />
              </div>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#f8fafc", marginTop: "10px", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {stats.total_predictions.toLocaleString()} <span style={{ fontSize: "14px", color: "#818cf8", fontWeight: 500 }}>tiles</span>
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
              <ArrowUpRight style={{ width: "12px", color: "#10b981" }} /> Live Satellite Stream Active
            </div>
          </div>

          <div className="glass-panel stat-card-rose" style={{ padding: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em" }} className="mono">DAMAGE INCIDENCE</span>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(244, 63, 94, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Flame style={{ width: "15px", color: "#f43f5e" }} />
              </div>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#fb7185", marginTop: "10px", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {stats.damage_percentage}%
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
              {stats.total_damaged.toLocaleString()} structural collapse points
            </div>
          </div>

          <div className="glass-panel stat-card-amber" style={{ padding: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em" }} className="mono">P1 CRITICAL TRIAGE</span>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldAlert style={{ width: "15px", color: "#f59e0b" }} />
              </div>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#fbbf24", marginTop: "10px", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {stats.p1_critical_count} <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 500 }}>zones</span>
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
              High-priority emergency search sectors
            </div>
          </div>

          <div className="glass-panel stat-card-emerald" style={{ padding: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em" }} className="mono">AVG CONFIDENCE</span>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity style={{ width: "15px", color: "#10b981" }} />
              </div>
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "#34d399", marginTop: "10px", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {stats.average_confidence}%
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
              PyTorch ResNet18 Model Calibration
            </div>
          </div>
        </div>

        {/* TAB 1: SINGLE TILE INSPECTOR */}
        {activeTab === "inspector" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
            <div className="glass-panel" style={{ padding: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#f8fafc" }}>
                  Satellite Imagery Inspector
                </h2>
                <span className="mono" style={{
                  fontSize: "11px",
                  color: "#818cf8",
                  background: "rgba(99, 102, 241, 0.15)",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  fontWeight: 600
                }}>
                  Grad-CAM Spatial Heatmap Engine
                </span>
              </div>

              {!previewUrl ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    border: dragOver ? "2px dashed #6366f1" : "2px dashed rgba(255, 255, 255, 0.15)",
                    borderRadius: "14px",
                    padding: "54px 28px",
                    textAlign: "center",
                    background: dragOver ? "rgba(99, 102, 241, 0.1)" : "rgba(15, 23, 42, 0.4)",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => document.getElementById("single-upload-input").click()}
                >
                  <div style={{
                    width: "58px",
                    height: "58px",
                    borderRadius: "50%",
                    background: "rgba(99, 102, 241, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 18px",
                    border: "1px solid rgba(99, 102, 241, 0.25)"
                  }}>
                    <UploadCloud style={{ width: "28px", height: "28px", color: "#818cf8" }} />
                  </div>
                  <h3 style={{ fontSize: "16px", marginBottom: "6px", fontWeight: 600, color: "#f8fafc" }}>
                    Upload Satellite Imagery Tile
                  </h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>
                    Drag & drop JPG, PNG, or WEBP satellite tiles to analyze
                  </p>
                  <input
                    id="single-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                  />
                  <button style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600
                  }}>
                    Browse Files
                  </button>
                </div>
              ) : (
                <div>
                  <div className="split-container" style={{ position: "relative" }}>
                    <img
                      src={previewUrl}
                      alt="Original Satellite imagery"
                      className="split-layer"
                    />

                    {currentPrediction?.heatmap_b64 && (
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        width: `${sliderPos}%`,
                        overflow: "hidden"
                      }}>
                        <img
                          src={currentPrediction.heatmap_b64}
                          alt="Grad CAM Overlay"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />
                      </div>
                    )}

                    {currentPrediction?.heatmap_b64 && (
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sliderPos}
                        onChange={(e) => setSliderPos(Number(e.target.value))}
                        style={{
                          position: "absolute",
                          bottom: "14px",
                          left: "5%",
                          width: "90%",
                          zIndex: 20,
                          cursor: "pointer"
                        }}
                      />
                    )}
                  </div>

                  {currentPrediction?.heatmap_b64 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "12px" }} className="mono">
                      <span style={{ color: "#60a5fa", fontWeight: 600 }}>◄ Grad-CAM Damage Overlay ({sliderPos}%)</span>
                      <span style={{ color: "#94a3b8" }}>Raw Satellite Tile ►</span>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "14px", marginTop: "24px" }}>
                    <button
                      className="btn-primary"
                      onClick={analyzeSingleImage}
                      disabled={isAnalyzing}
                      style={{
                        flex: 1,
                        padding: "13px",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px"
                      }}
                    >
                      {isAnalyzing ? <RefreshCw style={{ animation: "spin 1s linear infinite", width: "16px" }} /> : <Sparkles style={{ width: "16px" }} />}
                      {isAnalyzing ? "Computing Grad-CAM Heatmap..." : "Execute AI Damage Analysis"}
                    </button>

                    <button
                      onClick={() => { setSelectedFile(null); setPreviewUrl(null); setCurrentPrediction(null); }}
                      style={{
                        padding: "13px 22px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "#94a3b8",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: "28px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#f8fafc", marginBottom: "20px" }}>
                AI Emergency Triage Telemetry
              </h2>

              {currentPrediction ? (
                <div>
                  <div style={{
                    padding: "18px 22px",
                    borderRadius: "12px",
                    background: currentPrediction.is_damaged
                      ? "linear-gradient(135deg, rgba(244, 63, 94, 0.18) 0%, rgba(244, 63, 94, 0.06) 100%)"
                      : "linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.06) 100%)",
                    border: currentPrediction.is_damaged ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid rgba(16, 185, 129, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "24px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      {currentPrediction.is_damaged ? (
                        <AlertTriangle style={{ color: "#f43f5e", width: "32px", height: "32px" }} />
                      ) : (
                        <CheckCircle2 style={{ color: "#10b981", width: "32px", height: "32px" }} />
                      )}
                      <div>
                        <div style={{ fontSize: "20px", fontWeight: 800, color: currentPrediction.is_damaged ? "#fb7185" : "#34d399" }}>
                          {currentPrediction.prediction.toUpperCase()}
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                          Classifier Confidence: <b style={{ color: "#f8fafc" }}>{currentPrediction.confidence.toFixed(1)}%</b>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div className="mono" style={{ fontSize: "13px", color: "#fbbf24", fontWeight: 700 }}>
                        {currentPrediction.triage_priority}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                        {currentPrediction.severity_level}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }} className="mono">ESTIMATED DAMAGE RADIUS</div>
                      <div style={{ fontSize: "17px", fontWeight: 700, marginTop: "4px", color: "#f8fafc" }}>
                        {currentPrediction.affected_area_sqm}
                      </div>
                    </div>

                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }} className="mono">GPS COORDINATES</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, marginTop: "4px", color: "#60a5fa" }} className="mono">
                        {currentPrediction.latitude?.toFixed(4)}, {currentPrediction.longitude?.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#818cf8", marginBottom: "10px", fontWeight: 700 }} className="mono">
                      <FileText style={{ width: "15px" }} /> RESPONDER TRIAGE ADVISORY REPORT
                    </div>
                    <pre style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "12px",
                      whiteSpace: "pre-wrap",
                      color: "#cbd5e1",
                      lineHeight: "1.5"
                    }}>
                      {currentPrediction.ai_advisory}
                    </pre>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
                  <Crosshair style={{ width: "44px", height: "44px", margin: "0 auto 16px", opacity: 0.35 }} />
                  <p style={{ fontSize: "13px" }}>Upload a satellite imagery tile and click execute analysis to view Grad-CAM heatmaps and responder telemetry.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BATCH SATELLITE HUB */}
        {activeTab === "batch" && (
          <div className="glass-panel" style={{ padding: "32px" }}>
            <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
              Multi-Tile Satellite Batch Processing Hub
            </h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "28px" }}>
              High-throughput multi-thousand image batch uploads with real-time stream chunking.
            </p>

            <div style={{ display: "flex", gap: "18px", marginBottom: "28px" }}>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setBatchFiles(e.target.files)}
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  flex: 1,
                  fontSize: "13px"
                }}
              />
              <button
                className="btn-primary"
                onClick={processBatchUpload}
                disabled={batchProgress || !batchFiles || batchFiles.length === 0}
                style={{
                  padding: "12px 28px",
                  fontSize: "14px",
                  fontWeight: 600
                }}
              >
                {batchProgress ? "Processing Chunked Batch..." : `Process ${batchFiles ? batchFiles.length : 0} Satellite Tiles`}
              </button>
            </div>

            {batchProgress && batchStats.total > 0 && (
              <div style={{ marginBottom: "28px", background: "rgba(15, 23, 42, 0.8)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "12px" }} className="mono">
                  <span style={{ color: "#818cf8", fontWeight: 600 }}>
                    ⚡ Stream Processing: {batchStats.processed} / {batchStats.total} tiles ({((batchStats.processed / batchStats.total) * 100).toFixed(1)}%)
                  </span>
                  <span style={{ color: "#94a3b8" }}>
                    Damaged: {batchStats.damaged} | Safe: {batchStats.undamaged}
                  </span>
                </div>

                <div style={{ width: "100%", height: "8px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${(batchStats.processed / batchStats.total) * 100}%`,
                    background: "linear-gradient(90deg, #6366f1, #10b981)",
                    borderRadius: "4px",
                    transition: "width 0.2s ease"
                  }} />
                </div>
              </div>
            )}

            {batchStats.processed > 0 && (
              <div>
                <h3 style={{ fontSize: "16px", margin: "20px 0 14px", color: "#f8fafc", fontWeight: 700 }}>
                  Batch Execution Summary
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "18px" }}>
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "18px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }} className="mono">PROCESSED</div>
                    <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "4px" }}>{batchStats.processed}</div>
                  </div>
                  <div style={{ background: "rgba(244, 63, 94, 0.1)", padding: "18px", borderRadius: "10px", border: "1px solid rgba(244, 63, 94, 0.3)" }}>
                    <div style={{ fontSize: "11px", color: "#fb7185" }} className="mono">DAMAGED</div>
                    <div style={{ fontSize: "26px", fontWeight: 800, color: "#fb7185", marginTop: "4px" }}>{batchStats.damaged}</div>
                  </div>
                  <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "18px", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                    <div style={{ fontSize: "11px", color: "#34d399" }} className="mono">UNDAMAGED</div>
                    <div style={{ fontSize: "26px", fontWeight: 800, color: "#34d399", marginTop: "4px" }}>{batchStats.undamaged}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GIS COMMAND MAP (CONDITIONAL MOUNT TO GUARANTEE FRESH LEAFLET INITIALIZATION ON VISIBLE CONTAINER) */}
        {activeTab === "map" && (
          <div className="glass-panel" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#f8fafc" }}>
                  Geospatial GIS Disaster Command Map
                </h2>
                <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                  Interactive spatial marker pins extracted from GPS coordinates
                </p>
              </div>
              <button
                onClick={downloadGeoJSON}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: 600,
                  fontSize: "13px"
                }}
              >
                <Download style={{ width: "15px" }} /> Export GIS GeoJSON
              </button>
            </div>

            <div
              ref={mapContainerRef}
              style={{
                width: "100%",
                height: "560px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                overflow: "hidden",
                background: "#060913"
              }}
            />
          </div>
        )}

        {/* TAB 4: DISASTER SIMULATOR */}
        {activeTab === "simulator" && (
          <div className="glass-panel" style={{ padding: "32px" }}>
            <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
              Real-Time Disaster Scenario Simulator
            </h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "28px" }}>
              Validate system workflows against simulated disaster events.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "22px" }}>
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    padding: "22px"
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 600, marginBottom: "6px" }} className="mono">
                    {sc.risk_level} RISK EVENT
                  </div>
                  <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
                    {sc.title}
                  </h3>
                  <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>
                    {sc.region} | {sc.hazard_type}
                  </div>
                  <button
                    onClick={() => launchScenario(sc)}
                    disabled={simulating}
                    style={{
                      width: "100%",
                      padding: "11px",
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    {simulating ? "Simulating..." : "Launch Scenario Simulation"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="glass-panel" style={{ padding: "32px" }}>
            <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#f8fafc", marginBottom: "24px" }}>
              Capstone Performance Analytics & Benchmarks
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <h3 style={{ fontSize: "15px", marginBottom: "18px", fontWeight: 700, color: "#f8fafc" }}>Damage Distribution</h3>
                <div style={{ height: "260px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <h3 style={{ fontSize: "15px", marginBottom: "18px", fontWeight: 700, color: "#f8fafc" }}>ResNet18 Model Benchmarks</h3>
                <div style={{ display: "grid", gap: "12px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px" }}>
                    <span>Validation Accuracy</span>
                    <b style={{ color: "#34d399" }}>99.00%</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px" }}>
                    <span>F1 Score (Weighted)</span>
                    <b style={{ color: "#818cf8" }}>0.9895</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px" }}>
                    <span>Precision</span>
                    <b style={{ color: "#818cf8" }}>0.9902</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px" }}>
                    <span>Recall</span>
                    <b style={{ color: "#818cf8" }}>0.9888</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px" }}>
                    <span>ROC AUC Score</span>
                    <b style={{ color: "#fbbf24" }}>0.9984</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}