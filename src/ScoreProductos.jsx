// src/ScoreProductos.jsx — con historial localStorage + exportar CSV

import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, ADMIN_EMAIL } from "./lib/supabase";
import "./ScoreProductos.css";
import "./auth.css";

const COUNTRIES = [
  { code: "CO", name: "Colombia", flag: "🇨🇴", ml: "mercadolibre.com.co", cur: "COP" },
  { code: "MX", name: "México", flag: "🇲🇽", ml: "mercadolibre.com.mx", cur: "MXN" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", ml: "mercadolibre.com.ar", cur: "ARS" },
  { code: "CL", name: "Chile", flag: "🇨🇱", ml: "mercadolibre.cl", cur: "CLP" },
  { code: "PE", name: "Perú", flag: "🇵🇪", ml: "mercadolibre.com.pe", cur: "PEN" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", ml: "mercadolibre.com.ec", cur: "USD" },
];

const HISTORY_KEY = "dropi_historial";

async function callClaude(system, user) {
  // Obtener token de sesión actual para autenticar la llamada
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || ''

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ system, user }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data.text || "";
}

function parseJSON(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0].replace(/```json|```/g, "").trim()); } catch { return null; }
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch {}
}

function exportCSV(history) {
  const headers = ["Fecha","Producto","País","Score","Veredicto","Vendedores ML","Anuncios FB","Precio Promedio","Demanda","Recomendación"];
  const rows = history.map(h => [
    h.date,
    `"${h.name}"`,
    h.country,
    h.score,
    h.verdict,
    h.mlSellers || "",
    h.activeAds || "",
    h.avgPrice || "",
    h.demandSignal || "",
    `"${(h.recommendation || "").replace(/"/g, "'")}"`,
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dropi-historial-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Componentes ───────────────────────────────────────────────────────────────

function ScoreRing({ value, size = 60, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / 100, 1);
  const color = value >= 70 ? "#22c55e" : value >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="score-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <span className="score-ring-label" style={{ color }}>{Math.round(value)}</span>
    </div>
  );
}

function MiniBar({ value, color }) {
  return (
    <div className="mini-bar-bg">
      <div className="mini-bar-fill" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  );
}

function VerdictBadge({ score }) {
  if (score >= 70) return <span className="badge badge-success">🏆 Producto ganador</span>;
  if (score >= 45) return <span className="badge badge-warning">⚡ Oportunidad moderada</span>;
  return <span className="badge badge-danger">⚠️ Mercado saturado</span>;
}

function RankMedal({ rank }) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return (
    <div className={`rank-medal rank-${rank <= 3 ? rank : "other"}`}>
      {medals[rank] || rank}
    </div>
  );
}

function ProductCard({ item, rank, onRemove, onRetry, expanded, onToggle }) {
  const d = item.data;
  const score = d?.finalScore || 0;
  const borderClass = item.status === "done"
    ? score >= 70 ? "card-border-success" : score >= 45 ? "card-border-warning" : "card-border-danger"
    : "";
  return (
    <div className={`product-card ${borderClass}`}>
      <div className="product-card-header"
        style={{ cursor: item.status === "done" ? "pointer" : "default" }}
        onClick={() => item.status === "done" && onToggle()}>
        {item.status === "done" && <RankMedal rank={rank} />}
        {item.status === "analyzing" && <div className="spinner" />}
        {item.status === "pending" && <div className="rank-medal rank-other">⏳</div>}
        {item.status === "error" && <div className="rank-medal rank-other">❌</div>}
        <div className="product-card-info">
          <div className="product-card-name">{item.name}</div>
          <div className="product-card-sub">
            {item.status === "analyzing" && item.phase}
            {item.status === "pending" && "En cola..."}
            {item.status === "done" && d?.oneLiner}
            {item.status === "error" && (
              <span>Error — <button className="link-btn" onClick={(e) => { e.stopPropagation(); onRetry(); }}>reintentar</button></span>
            )}
          </div>
        </div>
        {item.status === "done" && <ScoreRing value={score} />}
        <button className="remove-btn" aria-label="Eliminar" onClick={(e) => { e.stopPropagation(); onRemove(); }}>✕</button>
      </div>
      {item.status === "done" && <div style={{ marginTop: 8 }}><VerdictBadge score={score} /></div>}
      {item.status === "done" && expanded && (
        <div className="product-card-detail">
          <div className="sub-scores-grid">
            {[
              { label: "Demanda", val: d.demandScore, color: "#6366f1" },
              { label: "Competencia", val: d.competitionScore, color: d.competitionScore > 60 ? "#ef4444" : "#22c55e" },
              { label: "Saturación ads", val: d.adSaturation, color: d.adSaturation > 60 ? "#ef4444" : "#22c55e" },
              { label: "Margen", val: d.marginScore, color: "#22c55e" },
            ].map(s => (
              <div key={s.label} className="sub-score-item">
                <div className="sub-score-row"><span>{s.label}</span><span className="sub-score-val">{s.val}/100</span></div>
                <MiniBar value={s.val} color={s.color} />
              </div>
            ))}
          </div>
          <div className="metrics-grid">
            {[
              { icon: "🏪", label: "Vendedores ML", val: d.mlSellers },
              { icon: "📢", label: "Anuncios activos", val: d.activeAds },
              { icon: "💰", label: "Precio promedio", val: d.avgPrice },
              { icon: "📈", label: "Señal demanda", val: d.demandSignal },
            ].map(m => (
              <div key={m.label} className="metric-box">
                <div className="metric-label">{m.icon} {m.label}</div>
                <div className="metric-val">{m.val}</div>
              </div>
            ))}
          </div>
          {d.recommendation && (
            <div className={`recommendation-box ${score >= 70 ? "rec-success" : score >= 45 ? "rec-warning" : "rec-danger"}`}>
              {score >= 70 ? "🚀" : score >= 45 ? "⚡" : "⚠️"} {d.recommendation}
            </div>
          )}
          <div className="card-actions">
            <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); onRetry(); }}>🔄 Volver a analizar</button>
            <button className="btn btn-danger-outline" onClick={(e) => { e.stopPropagation(); onRemove(); }}>🗑️ Quitar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel de historial ────────────────────────────────────────────────────────

function HistoryPanel({ history, onClear, onExport }) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;

  const verdictColor = (score) => score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
  const verdictLabel = (score) => score >= 70 ? "Ganador" : score >= 45 ? "Moderado" : "Saturado";

  return (
    <div className="history-panel">
      <button className="history-toggle" onClick={() => setOpen(o => !o)}>
        📋 Historial ({history.length} consultas) {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="history-body">
          <div className="history-actions">
            <button className="btn btn-secondary btn-sm" onClick={onExport}>
              ⬇️ Exportar CSV
            </button>
            <button className="btn btn-danger-outline btn-sm" onClick={onClear}>
              🗑️ Borrar historial
            </button>
          </div>

          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>País</th>
                  <th>Score</th>
                  <th>Veredicto</th>
                  <th>Vendedores</th>
                  <th>Ads FB</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h, i) => (
                  <tr key={i}>
                    <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{h.date}</td>
                    <td style={{ fontWeight: 500, color: "#f1f5f9" }}>{h.name}</td>
                    <td>{h.country}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: verdictColor(h.score) }}>{h.score}</span>
                    </td>
                    <td>
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 500,
                        background: h.score >= 70 ? "#14532d" : h.score >= 45 ? "#451a03" : "#450a0a",
                        color: verdictColor(h.score) }}>
                        {verdictLabel(h.score)}
                      </span>
                    </td>
                    <td style={{ color: "#94a3b8" }}>{h.mlSellers || "—"}</td>
                    <td style={{ color: "#94a3b8" }}>{h.activeAds || "—"}</td>
                    <td style={{ color: "#94a3b8" }}>{h.avgPrice || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ScoreProductos() {
  const navigate = useNavigate()
  const [input, setInput] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [items, setItems] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data?.session?.user?.email || ''
      setUserEmail(email)
      setIsAdmin(email === ADMIN_EMAIL)
    })
  }, [])

  // Guardar historial cuando cambia
  useEffect(() => { saveHistory(history); }, [history]);

  const addToHistory = (name, countryName, data) => {
    const entry = {
      date: new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      name,
      country: countryName,
      score: data.finalScore || 0,
      verdict: data.finalScore >= 70 ? "Ganador" : data.finalScore >= 45 ? "Moderado" : "Saturado",
      mlSellers: data.mlSellers || "",
      activeAds: data.activeAds || "",
      avgPrice: data.avgPrice || "",
      demandSignal: data.demandSignal || "",
      recommendation: data.recommendation || "",
    };
    setHistory(prev => [...prev, entry]);
  };

  const addProduct = () => {
    if (!input.trim() || items.length >= 8) return;
    setItems(prev => [...prev, { name: input.trim(), status: "pending", data: null, phase: "" }]);
    setInput("");
  };

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const clearAll = () => { setItems([]); setExpandedIdx(null); setInput(""); };

  const retryItem = (idx) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: "pending", data: null, phase: "" } : it));
  };

  const analyzeAll = useCallback(async () => {
    setAnalyzing(true);
    const pending = items.map((it, i) => ({ ...it, idx: i })).filter(it => it.status === "pending");

    for (const item of pending) {
      setItems(prev => prev.map((it, i) => i === item.idx
        ? { ...it, status: "analyzing", phase: "Buscando en Mercado Libre y FB Ads..." }
        : it));
      try {
        const raw = await callClaude(
          `Eres un analista experto en e-commerce y dropshipping en Latinoamérica. Busca datos REALES en la web. Responde SOLO JSON válido, sin texto extra, sin backticks, sin markdown.`,
          `Analiza el producto "${item.name}" para venta en ${country.name} (${country.ml}).
Busca en ${country.ml} y en la biblioteca de anuncios de Facebook datos reales sobre este producto.
Responde SOLO con este JSON:
{
  "mlSellers": "número de vendedores",
  "mlResults": número total resultados ML,
  "avgPrice": "precio promedio con símbolo",
  "priceRange": "rango de precios",
  "activeAds": "número de anuncios FB activos",
  "adAdvertisers": número anunciantes únicos,
  "demandSignal": "alta|media|baja",
  "demandScore": número 0-100,
  "competitionScore": número 0-100,
  "adSaturation": número 0-100,
  "marginScore": número 0-100,
  "finalScore": número 0-100,
  "oneLiner": "máximo 10 palabras resumiendo el veredicto",
  "recommendation": "2-3 frases con recomendación concreta"
}`
        );
        setItems(prev => prev.map((it, i) => i === item.idx ? { ...it, phase: "Calculando score..." } : it));
        const data = parseJSON(raw);
        setItems(prev => prev.map((it, i) => i === item.idx
          ? { ...it, status: data ? "done" : "error", data: data || null }
          : it));
        if (data) addToHistory(item.name, country.name, data);
      } catch {
        setItems(prev => prev.map((it, i) => i === item.idx ? { ...it, status: "error" } : it));
      }
    }
    setAnalyzing(false);
  }, [items, country]);

  const sorted = [...items]
    .map((it, idx) => ({ ...it, origIdx: idx }))
    .sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return -1;
      if (a.status !== "done" && b.status === "done") return 1;
      return (b.data?.finalScore || 0) - (a.data?.finalScore || 0);
    });

  const doneCount = items.filter(i => i.status === "done").length;
  const pendingCount = items.filter(i => i.status === "pending").length;
  const winner = sorted.find(i => i.status === "done");

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="page-wrapper">
      <div className="page-container">

        {/* Barra de usuario */}
        <div className="user-bar" style={{ marginBottom: 20 }}>
          <span className="user-bar-email">👤 {userEmail}</span>
          <div className="user-bar-actions">
            {isAdmin && (
              <Link to="/admin" className="btn-admin-link">⚙️ Panel admin</Link>
            )}
            <button onClick={cerrarSesion} className="btn-logout">Cerrar sesión</button>
          </div>
        </div>

        <div className="page-header">
          <div className="page-header-icon">🏆</div>
          <div>
            <h1 className="page-title">Score Final de Productos</h1>
            <p className="page-subtitle">Triangula Mercado Libre + Facebook Ads y encuentra tu producto ganador</p>
          </div>
        </div>

        <div className="input-row">
          <input type="text" className="product-input" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !analyzing && addProduct()}
            placeholder="Ej: faja reductora colombiana" disabled={analyzing} />
          <select className="country-select" value={country.code}
            onChange={e => setCountry(COUNTRIES.find(c => c.code === e.target.value))}
            disabled={analyzing}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
          <button className="btn btn-add" onClick={addProduct}
            disabled={!input.trim() || items.length >= 8 || analyzing}>+</button>
        </div>

        {items.length > 0 && (
          <div className="list-controls">
            <span className="list-count">
              {items.length} producto{items.length !== 1 ? "s" : ""} en la lista
              {items.length < 8 ? " — máximo 8" : " (máximo alcanzado)"}
            </span>
            <button className="btn btn-danger-outline btn-sm" onClick={clearAll} disabled={analyzing}>
              🗑️ Limpiar todo
            </button>
          </div>
        )}

        {pendingCount > 0 && !analyzing && (
          <button className="btn btn-primary btn-full" onClick={analyzeAll}>
            🔍 Analizar {pendingCount} producto{pendingCount !== 1 ? "s" : ""}
          </button>
        )}

        {analyzing && (
          <div className="analyzing-banner">
            <div className="spinner spinner-sm" />
            Analizando con IA en tiempo real... ~30s por producto
          </div>
        )}

        <div className="cards-list">
          {sorted.map((item) => {
            const rank = item.status === "done"
              ? sorted.filter(s => s.status === "done").indexOf(item) + 1 : null;
            return (
              <ProductCard key={item.origIdx} item={item} rank={rank}
                onRemove={() => removeItem(item.origIdx)}
                onRetry={() => retryItem(item.origIdx)}
                expanded={expandedIdx === item.origIdx}
                onToggle={() => setExpandedIdx(expandedIdx === item.origIdx ? null : item.origIdx)} />
            );
          })}
        </div>

        {doneCount >= 2 && pendingCount === 0 && !analyzing && winner && (
          <div className="winner-box">
            <div className="winner-title">🏆 Mejor oportunidad: {winner.name}</div>
            <div className="winner-body">
              <ScoreRing value={winner.data.finalScore} size={52} stroke={4} />
              <p className="winner-rec">{winner.data.recommendation}</p>
            </div>
            <p className="winner-hint">Toca cada producto para ver el desglose completo</p>
          </div>
        )}

        {doneCount > 0 && pendingCount === 0 && !analyzing && (
          <button className="btn btn-secondary btn-full" onClick={clearAll}>
            🔄 Nueva búsqueda desde cero
          </button>
        )}

        {items.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3>Agrega productos para comparar</h3>
            <p>Escribe hasta 8 productos de Dropi y descubre cuál tiene mejor oportunidad de mercado</p>
          </div>
        )}

        {/* Historial */}
        <HistoryPanel
          history={history}
          onClear={() => { setHistory([]); saveHistory([]); }}
          onExport={() => exportCSV(history)}
        />

      </div>
    </div>
  );
}
