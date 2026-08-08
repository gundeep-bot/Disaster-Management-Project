import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const API = "http://127.0.0.1:8000";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --bg:       #020b18;
    --bg2:      #041020;
    --panel:    rgba(4, 20, 40, 0.85);
    --border:   rgba(0, 200, 255, 0.15);
    --border2:  rgba(0, 200, 255, 0.35);
    --cyan:     #00c8ff;
    --green:    #00ff88;
    --red:      #ff3b3b;
    --amber:    #ffb800;
    --text:     #cce8ff;
    --muted:    #4a7a9b;
    --glow:     0 0 20px rgba(0,200,255,0.3);
    --glow-g:   0 0 20px rgba(0,255,136,0.3);
    --glow-r:   0 0 20px rgba(255,59,59,0.3);
  }

body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; overflow-x: hidden; }

  .orbitron { font-family: 'Syne', sans-serif; }
.mono     { font-family: 'DM Mono', monospace; }

  /* Animated grid background */
  .grid-bg {
    position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
    background-image:
      linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: gridMove 20s linear infinite;
  }
  @keyframes gridMove { 0%{background-position:0 0} 100%{background-position:40px 40px} }

  /* Scan line effect */
  .scan-line {
    position: fixed; left: 0; right: 0; height: 2px; z-index: 1; pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(0,200,255,0.4), transparent);
    animation: scan 8s linear infinite;
  }
  @keyframes scan { 0%{top:-2px} 100%{top:100vh} }

  /* Corner decorations */
  .corner { position: absolute; width: 16px; height: 16px; border-color: var(--cyan); border-style: solid; opacity: 0.6; }
  .corner-tl { top: 0; left: 0; border-width: 2px 0 0 2px; }
  .corner-tr { top: 0; right: 0; border-width: 2px 2px 0 0; }
  .corner-bl { bottom: 0; left: 0; border-width: 0 0 2px 2px; }
  .corner-br { bottom: 0; right: 0; border-width: 0 2px 2px 0; }

  /* Panel */
  .panel {
    background: var(--panel);
    border: 1px solid var(--border);
    backdrop-filter: blur(12px);
    position: relative;
    overflow: hidden;
  }
  .panel::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--cyan), transparent);
    opacity: 0.4;
  }

  /* Glow text */
  .glow-cyan { color: var(--cyan); text-shadow: 0 0 20px rgba(0,200,255,0.6); }
  .glow-green { color: var(--green); text-shadow: 0 0 20px rgba(0,255,136,0.6); }
  .glow-red   { color: var(--red);   text-shadow: 0 0 20px rgba(255,59,59,0.6); }
  .glow-amber { color: var(--amber); text-shadow: 0 0 20px rgba(255,184,0,0.6); }

  /* Stat card */
  .stat-card {
    padding: 20px 24px; border-radius: 12px; cursor: default;
    transition: all 0.3s ease;
    animation: fadeUp 0.6s ease both;
  }
  .stat-card:hover {
    border-color: var(--border2) !important;
    transform: translateY(-3px);
    box-shadow: var(--glow);
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

  /* Upload zone */
  .upload-zone {
    border: 2px dashed var(--border2); border-radius: 12px; padding: 40px;
    text-align: center; cursor: pointer; transition: all 0.3s ease;
    position: relative; overflow: hidden;
  }
  .upload-zone:hover, .upload-zone.drag-over {
    border-color: var(--cyan);
    background: rgba(0,200,255,0.05);
    box-shadow: inset 0 0 30px rgba(0,200,255,0.08);
  }
  .upload-zone::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, transparent 40%, rgba(0,200,255,0.03) 100%);
    pointer-events: none;
  }

  /* Analyse button */
  .analyse-btn {
    width: 100%; padding: 16px; border-radius: 10px; border: 1px solid var(--cyan);
    background: linear-gradient(135deg, rgba(0,200,255,0.15), rgba(0,200,255,0.05));
    color: var(--cyan); font-family: 'Syne', sans-serif; font-size: 13px;
    font-weight: 700; letter-spacing: 2px; cursor: pointer;
    transition: all 0.3s ease; position: relative; overflow: hidden;
  }
  .analyse-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(0,200,255,0.3), rgba(0,200,255,0.1));
    box-shadow: 0 0 30px rgba(0,200,255,0.4), inset 0 0 20px rgba(0,200,255,0.1);
    transform: translateY(-1px);
  }
  .analyse-btn:disabled { opacity: 0.4; cursor: not-allowed; border-color: var(--muted); color: var(--muted); }
  .analyse-btn::before {
    content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0,200,255,0.2), transparent);
    transition: left 0.5s ease;
  }
  .analyse-btn:hover:not(:disabled)::before { left: 100%; }

  /* Result badge */
  .result-badge {
    border-radius: 16px; padding: 32px; text-align: center;
    animation: pulseIn 0.5s ease;
  }
  @keyframes pulseIn { 0%{transform:scale(0.9);opacity:0} 100%{transform:scale(1);opacity:1} }

  /* Tab button */
  .tab-btn {
    padding: 10px 22px; border-radius: 8px; border: 1px solid transparent;
    cursor: pointer; font-family: 'Syne', sans-serif;font-size: 10px;
    letter-spacing: 1.5px; font-weight: 600; transition: all 0.3s ease;
  }
  .tab-btn.active {
    border-color: var(--cyan); background: rgba(0,200,255,0.1);
    color: var(--cyan); box-shadow: 0 0 15px rgba(0,200,255,0.2);
  }
  .tab-btn:not(.active) { color: var(--muted); background: transparent; }
  .tab-btn:not(.active):hover { color: var(--text); border-color: var(--border2); }

  /* Pulse dot */
  .pulse-dot {
    width: 8px; height: 8px; border-radius: 50%; background: var(--green);
    box-shadow: 0 0 8px var(--green);
    animation: pulse 2s ease infinite;
    display: inline-block;
  }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }

  /* Table row */
  .history-row { transition: background 0.2s ease; }
  .history-row:hover { background: rgba(0,200,255,0.05); }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg2); }
  ::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }

  /* Loading bar */
  .loading-bar {
    height: 2px; background: linear-gradient(90deg, transparent, var(--cyan), transparent);
    animation: loading 1.5s ease infinite;
  }
  @keyframes loading { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }

  /* Radar animation */
  .radar-ring {
    position: absolute; border-radius: 50%;
    border: 1px solid rgba(0,200,255,0.2);
    animation: radarPulse 3s ease-out infinite;
  }
  @keyframes radarPulse {
    0%   { transform: scale(0.3); opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  /* Confidence bar */
  .conf-bar-fill {
    height: 100%; border-radius: 4px;
    background: linear-gradient(90deg, var(--cyan), var(--green));
    transition: width 1s ease;
    box-shadow: 0 0 10px rgba(0,200,255,0.4);
  }

  /* Number counter animation */
  @keyframes countUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .count-anim { animation: countUp 0.6s ease both; }
`;

const TOOLTIP_STYLE = {
  background: "rgba(4,20,40,0.95)",
  border: "1px solid rgba(0,200,255,0.3)",
  borderRadius: "8px",
  color: "#cce8ff",
  fontFamily: "'Share Tech Mono', monospace",
  fontSize: "12px",
};

export default function App() {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [stats, setStats]         = useState(null);
  const [history, setHistory]     = useState([]);
  const [activeTab, setActiveTab] = useState("predict");
  const [dragOver, setDragOver]   = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [time, setTime]           = useState(new Date());
  const fileRef                   = useRef();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    checkHealth();
    fetchStats();
    fetchHistory();
    const interval = setInterval(() => { fetchStats(); fetchHistory(); }, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try { await axios.get(`${API}/health`); setApiOnline(true); } catch { setApiOnline(false); }
  };

  const fetchStats   = async () => { try { const r = await axios.get(`${API}/stats`);         setStats(r.data);   } catch {} };
  const fetchHistory = async () => { try { const r = await axios.get(`${API}/results?limit=20`); setHistory(r.data); } catch {} };

  const handleFile = (f) => {
    if (!f) return;
    setFile(f); setResult(null);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handlePredict = async () => {
    if (!file) return;
    setLoading(true); setResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await axios.post(`${API}/predict`, form);
      setResult(res.data);
      fetchStats(); fetchHistory();
    } catch { alert("Prediction failed. Make sure the API is running on port 8000."); }
    setLoading(false);
  };

  const pieData = stats ? [
    { name: "Damaged",   value: stats.total_damaged   || 0 },
    { name: "No Damage", value: stats.total_undamaged || 0 },
  ] : [];

  const areaData = history.slice().reverse().map((h, i) => ({
    id:         i + 1,
    confidence: parseFloat(h.confidence.toFixed(1)),
    damaged:    h.is_damaged ? 100 : 0,
  }));

  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour12: false });
  const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  return (
    <>
      <style>{css}</style>
      <div className="grid-bg" />
      <div className="scan-line" />

      <div style={{ position: "relative", zIndex: 2, minHeight: "100vh" }}>

        {/* ── HEADER ── */}
        <header style={{ borderBottom: "1px solid var(--border)", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(2,11,24,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, border: "1px solid var(--cyan)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div className="corner corner-tl" style={{ width: 8, height: 8 }} />
              <div className="corner corner-tr" style={{ width: 8, height: 8 }} />
              <div className="corner corner-bl" style={{ width: 8, height: 8 }} />
              <div className="corner corner-br" style={{ width: 8, height: 8 }} />
              <span style={{ fontSize: 18 }}>🛰️</span>
            </div>
            <div>
              <div className="orbitron glow-cyan" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2 }}>SENTINEL AI</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1 }}>DISASTER DAMAGE DETECTION SYSTEM</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {["predict", "stats", "history"].map(tab => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}>
                {tab === "predict" ? "⬡ ANALYSE" : tab === "stats" ? "◈ METRICS" : "≡ HISTORY"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "right" }}>
              <div className="mono glow-cyan" style={{ fontSize: 18, fontWeight: 600 }}>{formatTime(time)}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{formatDate(time)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 20 }}>
              <span className="pulse-dot" style={{ background: apiOnline ? "var(--green)" : "var(--red)", boxShadow: apiOnline ? "0 0 8px var(--green)" : "0 0 8px var(--red)" }} />
              <span className="mono" style={{ fontSize: 11, color: apiOnline ? "var(--green)" : "var(--red)" }}>
                {apiOnline ? "API ONLINE" : "API OFFLINE"}
              </span>
            </div>
          </div>
        </header>

        {/* ── STAT CARDS ── */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: "24px 32px 0" }}>
            {[
              { label: "TOTAL ANALYSED",  value: stats.total_predictions, suffix: "", icon: "◎", color: "var(--cyan)",  delay: "0s"    },
              { label: "DAMAGED ZONES",   value: stats.total_damaged,     suffix: "", icon: "⚠", color: "var(--red)",   delay: "0.1s"  },
              { label: "SAFE ZONES",      value: stats.total_undamaged,   suffix: "", icon: "✓", color: "var(--green)", delay: "0.2s"  },
              { label: "AVG CONFIDENCE",  value: stats.average_confidence.toFixed(1), suffix: "%", icon: "◈", color: "var(--amber)", delay: "0.3s" },
            ].map(card => (
              <div key={card.label} className="panel stat-card" style={{ borderRadius: 12, animationDelay: card.delay }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 2, marginBottom: 10 }}>{card.label}</div>
                    <div className="orbitron count-anim" style={{ fontSize: 36, fontWeight: 900, color: card.color, textShadow: `0 0 20px ${card.color}66` }}>
                      {card.value}{card.suffix}
                    </div>
                  </div>
                  <div style={{ fontSize: 28, color: card.color, opacity: 0.4 }}>{card.icon}</div>
                </div>
                <div style={{ marginTop: 14, height: 2, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (card.value / Math.max(stats.total_predictions, 1)) * 100)}%`, background: card.color, borderRadius: 2, boxShadow: `0 0 8px ${card.color}` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: "24px 32px 40px" }}>

          {/* ── PREDICT TAB ── */}
          {activeTab === "predict" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* Upload Panel */}
              <div className="panel" style={{ borderRadius: 16, padding: 28 }}>
                <div className="corner corner-tl" /><div className="corner corner-tr" />
                <div className="corner corner-bl" /><div className="corner corner-br" />

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 3, height: 20, background: "var(--cyan)", borderRadius: 2, boxShadow: "0 0 8px var(--cyan)" }} />
                  <span className="orbitron" style={{ fontSize: 12, letterSpacing: 2, color: "var(--cyan)" }}>IMAGE INPUT</span>
                </div>

                {/* Drop zone */}
                <div className={`upload-zone ${dragOver ? "drag-over" : ""}`}
                  onClick={() => fileRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{ marginBottom: 20, minHeight: 220 }}>
                  <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png" onChange={e => handleFile(e.target.files[0])} style={{ display: "none" }} />

                  {preview ? (
                    <div style={{ position: "relative" }}>
                      <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, display: "block" }} />
                      <div style={{ position: "absolute", inset: 0, border: "1px solid var(--cyan)", borderRadius: 8, pointerEvents: "none" }} />
                      {/* Corner decorations on image */}
                      {["tl","tr","bl","br"].map(c => (
                        <div key={c} className={`corner corner-${c}`} style={{ position: "absolute" }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "20px 0" }}>
                      {/* Radar animation */}
                      <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 20px" }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} className="radar-ring" style={{ inset: 0, animationDelay: `${i}s` }} />
                        ))}
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛰️</div>
                      </div>
                      <div className="orbitron" style={{ fontSize: 11, color: "var(--cyan)", letterSpacing: 2, marginBottom: 8 }}>DROP SATELLITE IMAGE</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>or click to browse • JPG PNG JPEG</div>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, padding: "8px 12px", background: "rgba(0,200,255,0.05)", borderRadius: 6, border: "1px solid var(--border)" }}>
                    📁 {file.name} — {(file.size / 1024).toFixed(1)} KB
                  </div>
                )}

                {loading && (
                  <div style={{ marginBottom: 12, overflow: "hidden", borderRadius: 2 }}>
                    <div className="loading-bar" />
                  </div>
                )}

                <button className="analyse-btn" onClick={handlePredict} disabled={!file || loading}>
                  {loading ? "⟳  PROCESSING..." : "▶  INITIATE ANALYSIS"}
                </button>

                {/* Quick stats below button */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
                  {[
                    { label: "MODEL", value: "ResNet18" },
                    { label: "ACCURACY", value: "99.25%" },
                    { label: "DEVICE", value: "CUDA" },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center", padding: "10px 8px", background: "rgba(0,200,255,0.04)", border: "1px solid var(--border)", borderRadius: 8 }}>
                      <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>{s.label}</div>
                      <div className="orbitron" style={{ fontSize: 11, color: "var(--cyan)" }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Result Panel */}
              <div className="panel" style={{ borderRadius: 16, padding: 28 }}>
                <div className="corner corner-tl" /><div className="corner corner-tr" />
                <div className="corner corner-bl" /><div className="corner corner-br" />

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 3, height: 20, background: "var(--green)", borderRadius: 2, boxShadow: "0 0 8px var(--green)" }} />
                  <span className="orbitron" style={{ fontSize: 12, letterSpacing: 2, color: "var(--green)" }}>DETECTION OUTPUT</span>
                </div>

                {!result && !loading && (
                  <div style={{ textAlign: "center", padding: "70px 0", color: "var(--muted)" }}>
                    <div style={{ fontSize: 52, marginBottom: 16, opacity: 0.3 }}>📡</div>
                    <div className="orbitron" style={{ fontSize: 11, letterSpacing: 2 }}>AWAITING INPUT</div>
                    <div className="mono" style={{ fontSize: 11, marginTop: 8 }}>Upload an image to begin analysis</div>
                  </div>
                )}

                {loading && (
                  <div style={{ textAlign: "center", padding: "70px 0" }}>
                    <div style={{ fontSize: 52, marginBottom: 16, animation: "pulse 1s ease infinite" }}>🛰️</div>
                    <div className="orbitron glow-cyan" style={{ fontSize: 13, letterSpacing: 3 }}>ANALYSING...</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Running AI inference on GPU</div>
                  </div>
                )}

                {result && !loading && (
                  <div>
                    {/* Main result */}
                    <div className="result-badge" style={{
                      background: result.is_damaged ? "rgba(255,59,59,0.08)" : "rgba(0,255,136,0.08)",
                      border: `1px solid ${result.is_damaged ? "var(--red)" : "var(--green)"}`,
                      boxShadow: result.is_damaged ? "var(--glow-r)" : "var(--glow-g)",
                      marginBottom: 20
                    }}>
                      <div style={{ fontSize: 52, marginBottom: 8 }}>{result.is_damaged ? "🔴" : "🟢"}</div>
                      <div className={`orbitron ${result.is_damaged ? "glow-red" : "glow-green"}`}
                        style={{ fontSize: 26, fontWeight: 900, letterSpacing: 3 }}>
                        {result.prediction.toUpperCase()}
                      </div>

                      {/* Confidence bar */}
                      <div style={{ margin: "16px 0 8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>CONFIDENCE</span>
                          <span className="orbitron" style={{ fontSize: 13, color: result.is_damaged ? "var(--red)" : "var(--green)" }}>
                            {result.confidence.toFixed(2)}%
                          </span>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                          <div className="conf-bar-fill" style={{
                            width: `${result.confidence}%`,
                            background: result.is_damaged
                              ? "linear-gradient(90deg, var(--amber), var(--red))"
                              : "linear-gradient(90deg, var(--cyan), var(--green))"
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div style={{ display: "grid", gap: 8 }}>
                      {[
                        ["CLASSIFICATION", result.prediction, result.is_damaged ? "var(--red)" : "var(--green)"],
                        ["CONFIDENCE",     `${result.confidence.toFixed(4)}%`, "var(--amber)"],
                        ["LATITUDE",       result.latitude  ? result.latitude.toFixed(6)  : "N/A", "var(--cyan)"],
                        ["LONGITUDE",      result.longitude ? result.longitude.toFixed(6) : "N/A", "var(--cyan)"],
                        ["TIMESTAMP",      new Date(result.timestamp).toLocaleString(), "var(--muted)"],
                        ["IMAGE FILE",     result.image_name, "var(--muted)"],
                      ].map(([label, value, color]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "rgba(0,200,255,0.03)", borderRadius: 8, border: "1px solid var(--border)" }}>
                          <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1 }}>{label}</span>
                          <span className="mono" style={{ fontSize: 11, color, maxWidth: "55%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STATS TAB ── */}
          {activeTab === "stats" && stats && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* Pie chart */}
              <div className="panel" style={{ borderRadius: 16, padding: 28 }}>
                <div className="corner corner-tl" /><div className="corner corner-tr" />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 3, height: 20, background: "var(--cyan)", borderRadius: 2, boxShadow: "0 0 8px var(--cyan)" }} />
                  <span className="orbitron" style={{ fontSize: 12, letterSpacing: 2, color: "var(--cyan)" }}>DAMAGE DISTRIBUTION</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "rgba(0,200,255,0.3)" }}>
                      <Cell fill="#ff3b3b" stroke="#ff3b3b33" />
                      <Cell fill="#00ff88" stroke="#00ff8833" />
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 8 }}>
                  {[["var(--red)", "Damaged"], ["var(--green)", "Safe"]].map(([c, l]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Area chart */}
              <div className="panel" style={{ borderRadius: 16, padding: 28 }}>
                <div className="corner corner-tl" /><div className="corner corner-tr" />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 3, height: 20, background: "var(--amber)", borderRadius: 2, boxShadow: "0 0 8px var(--amber)" }} />
                  <span className="orbitron" style={{ fontSize: 12, letterSpacing: 2, color: "var(--amber)" }}>CONFIDENCE TREND</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={areaData}>
                    <defs>
                      <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#00c8ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00c8ff" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,255,0.07)" />
                    <XAxis dataKey="id" stroke="var(--muted)" tick={{ fontFamily: "Share Tech Mono", fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="var(--muted)" tick={{ fontFamily: "Share Tech Mono", fontSize: 10 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="confidence" stroke="var(--cyan)" strokeWidth={2} fill="url(#confGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Model metrics */}
              <div className="panel" style={{ borderRadius: 16, padding: 28, gridColumn: "span 2" }}>
                <div className="corner corner-tl" /><div className="corner corner-tr" />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 3, height: 20, background: "var(--green)", borderRadius: 2, boxShadow: "0 0 8px var(--green)" }} />
                  <span className="orbitron" style={{ fontSize: 12, letterSpacing: 2, color: "var(--green)" }}>MODEL PERFORMANCE METRICS</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
                  {[
                    { label: "ACCURACY",   value: "99.25%",  color: "var(--green)" },
                    { label: "F1 SCORE",   value: "0.9925",  color: "var(--cyan)"  },
                    { label: "PRECISION",  value: "0.9925",  color: "var(--cyan)"  },
                    { label: "RECALL",     value: "0.9925",  color: "var(--cyan)"  },
                    { label: "ROC AUC",    value: "0.9999",  color: "var(--amber)" },
                    { label: "EPOCHS",     value: "20",      color: "var(--muted)" },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign: "center", padding: "16px 12px", background: "rgba(0,200,255,0.04)", border: "1px solid var(--border)", borderRadius: 10 }}>
                      <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 1.5, marginBottom: 10 }}>{m.label}</div>
                      <div className="orbitron" style={{ fontSize: 20, fontWeight: 700, color: m.color, textShadow: `0 0 15px ${m.color}66` }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === "history" && (
            <div className="panel" style={{ borderRadius: 16, padding: 28 }}>
              <div className="corner corner-tl" /><div className="corner corner-tr" />
              <div className="corner corner-bl" /><div className="corner corner-br" />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 3, height: 20, background: "var(--amber)", borderRadius: 2, boxShadow: "0 0 8px var(--amber)" }} />
                  <span className="orbitron" style={{ fontSize: 12, letterSpacing: 2, color: "var(--amber)" }}>PREDICTION LOG</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>[{history.length} RECORDS]</span>
                </div>
                <button onClick={fetchHistory}
                  style={{ padding: "8px 18px", border: "1px solid var(--border)", borderRadius: 8, background: "transparent", color: "var(--muted)", cursor: "pointer", fontFamily: "Orbitron", fontSize: 10, letterSpacing: 1.5, transition: "all 0.2s" }}
                  onMouseEnter={e => { e.target.style.borderColor = "var(--cyan)"; e.target.style.color = "var(--cyan)"; }}
                  onMouseLeave={e => { e.target.style.borderColor = "var(--border)"; e.target.style.color = "var(--muted)"; }}>
                  ⟳ REFRESH
                </button>
              </div>

              {history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
                  <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }}>📋</div>
                  <div className="orbitron" style={{ fontSize: 11, letterSpacing: 2 }}>NO RECORDS FOUND</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border2)" }}>
                        {["#", "IMAGE FILE", "CLASSIFICATION", "CONFIDENCE", "LATITUDE", "LONGITUDE", "TIMESTAMP"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left" }}>
                            <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1.5 }}>{h}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((row, i) => (
                        <tr key={row.id} className="history-row" style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "12px 14px" }}>
                            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{String(i + 1).padStart(3, "0")}</span>
                          </td>
                          <td style={{ padding: "12px 14px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <span className="mono" style={{ fontSize: 11 }}>{row.image_name}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span className="orbitron" style={{ fontSize: 10, padding: "5px 12px", borderRadius: 20, letterSpacing: 1,
                              background: row.is_damaged ? "rgba(255,59,59,0.12)" : "rgba(0,255,136,0.12)",
                              border: `1px solid ${row.is_damaged ? "var(--red)" : "var(--green)"}`,
                              color: row.is_damaged ? "var(--red)" : "var(--green)" }}>
                              {row.prediction.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span className="orbitron" style={{ fontSize: 13, color: "var(--amber)" }}>{row.confidence.toFixed(1)}%</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{row.latitude ? row.latitude.toFixed(4) : "—"}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{row.longitude ? row.longitude.toFixed(4) : "—"}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{new Date(row.timestamp).toLocaleString()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}