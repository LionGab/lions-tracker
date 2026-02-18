import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// ── UTILS ──────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const parseVal = (s) => parseFloat(String(s).replace(/[R$\s.]/g, "").replace(",", ".")) || 0;
const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
const MONTHS_PT = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
const COLORS = ["#67e8f9","#f59e0b","#34d399","#a78bfa","#f87171","#fb923c","#38bdf8","#e879f9"];

const SEED_DATA = {
  categories: [
    { id: "internet", label: "Internet", color: "#67e8f9" },
    { id: "energia",  label: "Energisa", color: "#f59e0b" },
    { id: "aguas",    label: "Águas",    color: "#34d399" },
    { id: "aluguel",  label: "Aluguel",  color: "#a78bfa" },
  ],
  entries: [
    { id: 1, catId: "internet", desc: "Fibra",         owner: "lion",  value: 156.63 },
    { id: 2, catId: "energia",  desc: "Unidade Lion",  owner: "lion",  value: 955.96 },
    { id: 3, catId: "energia",  desc: "Unidade Primo", owner: "primo", value: 540.16 },
    { id: 4, catId: "aguas",    desc: "Fatura 1",      owner: "lion",  value: 224.20 },
    { id: 5, catId: "aguas",    desc: "Fatura 2",      owner: "lion",  value: 224.20 },
    { id: 6, catId: "aguas",    desc: "Fatura 3",      owner: "primo", value: 232.39 },
    { id: 7, catId: "aluguel",  desc: "Imóvel 1",      owner: "lion",  value: 1612.13 },
    { id: 8, catId: "aluguel",  desc: "Imóvel 2",      owner: "primo", value: 1612.13 },
  ],
};

let _uid = 200;
const uid = () => ++_uid;
const clone = (x) => JSON.parse(JSON.stringify(x));

// ── HOOKS ──────────────────────────────────────────────────────────────────
function useAnimatedCounter(target, duration = 700) {
  const [value, setValue] = useState(target);
  const animRef = useRef(null);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prevTarget.current === target) return;
    const start = prevTarget.current;
    const end = target;
    const startTime = performance.now();
    cancelAnimationFrame(animRef.current);
    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
      setValue(start + (end - start) * eased);
      if (t < 1) animRef.current = requestAnimationFrame(animate);
      else { setValue(end); prevTarget.current = end; }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [target, duration]);

  return value;
}

function useTypingEffect(text, speed = 32, restartKey) {
  const [displayed, setDisplayed] = useState("");
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, ++i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, restartKey]);

  useEffect(() => {
    const iv = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(iv);
  }, []);

  return { displayed, blink };
}

// ── COMPONENTS ─────────────────────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString("pt-BR"));
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date().toLocaleTimeString("pt-BR")), 1000);
    return () => clearInterval(iv);
  }, []);
  return <span>{time}</span>;
}

function PixelBot({ glitch }) {
  return (
    <svg width="38" height="38" viewBox="0 0 10 10" style={{
      imageRendering: "pixelated", flexShrink: 0,
      filter: glitch
        ? "drop-shadow(0 0 10px #e879f9) hue-rotate(40deg)"
        : "drop-shadow(0 0 4px #e879f966)",
      transition: "filter 0.1s",
      transform: glitch ? "translate(1px,-1px) scaleX(-1)" : "none",
    }}>
      <rect x="3" y="0" width="4" height="1" fill="#e879f9"/>
      <rect x="2" y="1" width="6" height="1" fill="#e879f9"/>
      <rect x="1" y="2" width="8" height="5" fill="#e879f9"/>
      <rect x="0" y="3" width="1" height="3" fill="#e879f9"/>
      <rect x="9" y="3" width="1" height="3" fill="#e879f9"/>
      <rect x="2" y="3" width="2" height="2" fill="#0d1117"/>
      <rect x="6" y="3" width="2" height="2" fill="#0d1117"/>
      <rect x="2" y="3" width="1" height="1" fill="#67e8f9"/>
      <rect x="6" y="3" width="1" height="1" fill="#67e8f9"/>
      <rect x="3" y="6" width="4" height="1" fill="#e879f9"/>
      <rect x="2" y="7" width="2" height="2" fill="#e879f9"/>
      <rect x="6" y="7" width="2" height="2" fill="#e879f9"/>
    </svg>
  );
}

function InlineEdit({ value, onChange, wide = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef();
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => { setEditing(false); onChange(draft); };
  if (editing) return (
    <input ref={ref} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setEditing(false); setDraft(value); }
      }}
      style={{
        background:"rgba(103,232,249,0.08)", border:"1px solid rgba(103,232,249,0.5)",
        borderRadius:2, color:"#e6edf3", fontFamily:"inherit", fontSize:"inherit",
        padding:"0 5px", outline:"none", width:wide?150:82,
        boxShadow:"0 0 10px rgba(103,232,249,0.25)",
      }}
    />
  );
  return (
    <span onDoubleClick={() => setEditing(true)} title="Duplo-clique para editar"
      style={{ cursor:"text", borderBottom:"1px dashed rgba(255,255,255,0.12)", transition:"border-color 0.2s" }}>
      {value}
    </span>
  );
}

function Delta({ cur, prev }) {
  if (prev == null || prev === 0) return null;
  const d = cur - prev, pct = ((d/prev)*100).toFixed(1);
  const up = d > 0;
  return (
    <span style={{
      fontSize:9, fontWeight:700,
      color: up?"#f87171":"#34d399",
      background: up?"rgba(248,113,113,0.1)":"rgba(52,211,153,0.1)",
      border:`1px solid ${up?"rgba(248,113,113,0.25)":"rgba(52,211,153,0.25)"}`,
      borderRadius:3, padding:"1px 5px",
      animation:"fadeIn 0.3s ease",
    }}>{up?"▲":"▼"}{Math.abs(pct)}%</span>
  );
}

function Sparkline({ values, color }) {
  if (values.length < 2) return <span style={{color:"#30363d",fontSize:10}}>─</span>;
  const max = Math.max(...values,1), min = Math.min(...values);
  const W = 64, H = 22;
  const pts = values.map((v,i) => `${(i/(values.length-1))*W},${H-((v-min)/(max-min||1))*H}`).join(" ");
  const last = pts.trim().split(" ").pop().split(",");
  return (
    <svg width={W} height={H} style={{verticalAlign:"middle", overflow:"visible"}}>
      <defs>
        <filter id={`sglow-${color.replace("#","")}`}>
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.75"
        filter={`url(#sglow-${color.replace("#","")})`}/>
      <circle cx={last[0]} cy={last[1]} r="3" fill={color}
        filter={`url(#sglow-${color.replace("#","")})`}/>
    </svg>
  );
}

function DonutChart({ categories, byCat, grand }) {
  const size = 96, cx = 48, cy = 48, r = 34, stroke = 10;
  const circum = 2 * Math.PI * r;
  let offset = 0;
  const slices = categories.map(cat => {
    const val = byCat[cat.id] || 0;
    const pct = grand > 0 ? val / grand : 0;
    const dash = pct * circum;
    const slice = { cat, pct, dashArray:`${dash} ${circum - dash}`, offset };
    offset += dash;
    return slice;
  });

  return (
    <svg width={size} height={size} style={{overflow:"visible"}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#161b22" strokeWidth={stroke+2}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#21262d" strokeWidth={stroke}/>
      {slices.map(({ cat, dashArray, offset: off }) => (
        <circle key={cat.id} cx={cx} cy={cy} r={r} fill="none"
          stroke={cat.color} strokeWidth={stroke}
          strokeDasharray={dashArray} strokeDashoffset={-off}
          strokeLinecap="butt"
          style={{
            transformOrigin:`${cx}px ${cy}px`, transform:"rotate(-90deg)",
            transition:"stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)",
            filter:`drop-shadow(0 0 4px ${cat.color}88)`,
          }}
        />
      ))}
      <text x={cx} y={cy-6} textAnchor="middle" fill="#6e7681" fontSize="7"
        fontFamily="JetBrains Mono,monospace" letterSpacing="1">TOTAL</text>
      <text x={cx} y={cy+7} textAnchor="middle" fill="#f59e0b" fontSize="11"
        fontWeight="700" fontFamily="JetBrains Mono,monospace"
        style={{filter:"drop-shadow(0 0 6px #f59e0b88)"}}>
        {(grand/1000).toFixed(1)}k
      </text>
    </svg>
  );
}

function StatCard({ label, value, prev, color, icon }) {
  const animated = useAnimatedCounter(value);
  const [pulse, setPulse] = useState(false);
  const prevVal = useRef(value);

  useEffect(() => {
    if (prevVal.current === value) return;
    prevVal.current = value;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 700);
    return () => clearTimeout(t);
  }, [value]);

  const rgb = color === "#67e8f9" ? "103,232,249"
            : color === "#a78bfa" ? "167,139,250"
            : "245,158,11";

  return (
    <div style={{
      background: pulse ? `rgba(${rgb},0.06)` : "rgba(255,255,255,0.02)",
      border:`1px solid ${color}${pulse?"44":"18"}`,
      borderRadius:4, padding:"7px 10px", marginBottom:5,
      transition:"all 0.35s ease",
      boxShadow: pulse ? `0 0 16px rgba(${rgb},0.2), inset 0 0 8px rgba(${rgb},0.05)` : "none",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:9,color:"#6e7681"}}>{icon} {label}</span>
        <Delta cur={value} prev={prev}/>
      </div>
      <div style={{
        fontSize:13, fontWeight:700, color, marginTop:2,
        textShadow: pulse ? `0 0 14px ${color}` : `0 0 6px ${color}44`,
        transition:"text-shadow 0.35s",
      }}>
        {fmt(animated)}
      </div>
      {prev != null && (
        <div style={{fontSize:9,color:"#30363d",marginTop:1}}>
          ant: {fmt(prev)}
        </div>
      )}
    </div>
  );
}

function Toast({ id, message, onDone }) {
  const [width, setWidth] = useState(100);
  useEffect(() => {
    const t0 = performance.now();
    const dur = 2200;
    const go = (now) => {
      const p = (now - t0) / dur;
      setWidth(Math.max(0, 100 - p * 100));
      if (p < 1) requestAnimationFrame(go);
      else onDone(id);
    };
    requestAnimationFrame(go);
  }, []);

  return (
    <div style={{
      position:"fixed", bottom:44, right:18, zIndex:9000,
      background:"#161b22", border:"1px solid rgba(103,232,249,0.35)",
      borderRadius:6, padding:"8px 14px", minWidth:230,
      boxShadow:"0 4px 24px rgba(0,0,0,0.6), 0 0 12px rgba(103,232,249,0.1)",
      animation:"toastIn 0.2s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <div style={{fontSize:11,color:"#c9d1d9",marginBottom:6}}>▶▶ {message}</div>
      <div style={{height:2,background:"#21262d",borderRadius:1}}>
        <div style={{
          height:"100%", width:`${width}%`, borderRadius:1,
          background:"linear-gradient(90deg,#67e8f9aa,#67e8f9)",
          boxShadow:"0 0 6px #67e8f966",
          transition:"width 0.05s linear",
        }}/>
      </div>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function App() {
  const now = new Date();
  const [curYear,   setCurYear]   = useState(now.getFullYear());
  const [curMonth,  setCurMonth]  = useState(now.getMonth());
  const [allData,   setAllData]   = useState(() => {
    const k = monthKey(now.getFullYear(), now.getMonth());
    return { [k]: clone(SEED_DATA) };
  });
  const [log,        setLog]       = useState([{ ts: new Date(), msg: "Sistema iniciado · Lion's Technologies v2.0" }]);
  const [toasts,     setToasts]    = useState([]);
  const [activeTab,  setActiveTab] = useState("expenses");
  const [addingCat,  setAddingCat] = useState(false);
  const [newCatName, setNewCatName]= useState("");
  const [glitch,     setGlitch]    = useState(false);
  const [flashed,    setFlashed]   = useState(new Set());
  const logRef    = useRef();
  const catInpRef = useRef();

  const key     = monthKey(curYear, curMonth);
  const prevKey = curMonth === 0 ? monthKey(curYear-1,11) : monthKey(curYear,curMonth-1);
  const monthData = allData[key] || null;

  const promptText = `finance --month ${MONTHS_PT[curMonth]}/${curYear} --watch --shared --owner lion`;
  const { displayed: typed, blink } = useTypingEffect(promptText, 32, key);

  // Periodic glitch
  useEffect(() => {
    const iv = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 130);
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);
  useEffect(() => { if (addingCat) catInpRef.current?.focus(); }, [addingCat]);

  const addLog = useCallback((msg) => {
    setLog(p => [...p.slice(-30), { ts: new Date(), msg }]);
    const id = uid();
    setToasts(t => [...t.slice(-1), { id, msg }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const flashRow = (entId) => {
    setFlashed(s => new Set([...s, entId]));
    setTimeout(() => setFlashed(s => { const n = new Set(s); n.delete(entId); return n; }), 750);
  };

  const prevMonth = () => { if(curMonth===0){setCurYear(y=>y-1);setCurMonth(11);}else setCurMonth(m=>m-1); };
  const nextMonth = () => { if(curMonth===11){setCurYear(y=>y+1);setCurMonth(0);}else setCurMonth(m=>m+1); };

  const initMonth = (fromPrev=false) => {
    const prev = allData[prevKey];
    const src  = fromPrev && prev ? clone(prev) : clone(SEED_DATA);
    src.entries = src.entries.map(e => ({ ...e, id: uid() }));
    setAllData(d => ({ ...d, [key]: src }));
    addLog(fromPrev
      ? `📋 ${MONTHS_PT[curMonth]}/${curYear} copiado de ${MONTHS_PT[curMonth===0?11:curMonth-1]}`
      : `✦ ${MONTHS_PT[curMonth]}/${curYear} iniciado`
    );
  };

  const mutate = useCallback((fn) => {
    setAllData(prev => { const c = clone(prev); if(!c[key]) return prev; fn(c[key]); return c; });
  }, [key]);

  const updateEntry = (entId, field, raw) => {
    const val = field==="value" ? parseVal(raw) : raw;
    mutate(d => { const e=d.entries.find(e=>e.id===entId); if(e) e[field]=val; });
    flashRow(entId);
    addLog(`✎ [${field}] → ${raw}`);
  };
  const addEntry = (catId) => {
    const newId = uid();
    const cat = monthData?.categories.find(c=>c.id===catId);
    mutate(d => d.entries.push({ id:newId, catId, desc:"Nova entrada", owner:"lion", value:0 }));
    addLog(`+ ${cat?.label} · nova linha`);
  };
  const removeEntry = (entId) => {
    const entry = monthData.entries.find(e=>e.id===entId);
    if (!entry) return;
    if (monthData.entries.filter(e=>e.catId===entry.catId).length <= 1) return;
    mutate(d => { d.entries = d.entries.filter(e=>e.id!==entId); });
    addLog(`✕ linha removida`);
  };
  const updateCatLabel = (catId, label) => {
    mutate(d => { const c=d.categories.find(c=>c.id===catId); if(c) c.label=label; });
    addLog(`✎ Categoria → ${label}`);
  };
  const addCategory = () => {
    const name = newCatName.trim(); if (!name) return;
    const id    = `cat_${uid()}`;
    const color = COLORS[monthData.categories.length % COLORS.length];
    mutate(d => {
      d.categories.push({ id, label:name, color });
      d.entries.push({ id:uid(), catId:id, desc:"Entrada 1", owner:"lion", value:0 });
    });
    addLog(`+ Categoria "${name}"`);
    setNewCatName(""); setAddingCat(false);
  };
  const removeCategory = (catId) => {
    if (monthData.categories.length <= 1) return;
    mutate(d => { d.categories=d.categories.filter(c=>c.id!==catId); d.entries=d.entries.filter(e=>e.catId!==catId); });
    addLog(`✕ Categoria removida`);
  };

  const totals = useMemo(() => {
    if (!monthData) return { lion:0, primo:0, grand:0, byCat:{} };
    const byCat = {};
    let lion=0, primo=0;
    for (const e of monthData.entries) {
      byCat[e.catId] = (byCat[e.catId]||0) + e.value;
      if (e.owner==="lion") lion+=e.value; else primo+=e.value;
    }
    return { lion, primo, grand:lion+primo, byCat };
  }, [monthData]);

  const prevData   = allData[prevKey];
  const prevTotals = useMemo(() => {
    if (!prevData) return null;
    let lion=0, primo=0;
    for (const e of prevData.entries) { if(e.owner==="lion") lion+=e.value; else primo+=e.value; }
    return { lion, primo, grand:lion+primo };
  }, [prevData]);

  const histKeys = Object.keys(allData).sort();
  const hist = {
    lion:  histKeys.map(k => allData[k]?.entries.filter(e=>e.owner==="lion").reduce((s,e)=>s+e.value,0)||0),
    primo: histKeys.map(k => allData[k]?.entries.filter(e=>e.owner==="primo").reduce((s,e)=>s+e.value,0)||0),
    grand: histKeys.map(k => allData[k]?.entries.reduce((s,e)=>s+e.value,0)||0),
  };

  const animLion  = useAnimatedCounter(totals.lion);
  const animPrimo = useAnimatedCounter(totals.primo);
  const animGrand = useAnimatedCounter(totals.grand);

  return (
    <div style={{
      background:"#0d1117", minHeight:"100vh",
      fontFamily:"'JetBrains Mono','Fira Code','Cascadia Code',monospace",
      fontSize:13, color:"#e6edf3",
      display:"flex", flexDirection:"column",
      position:"relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#0d1117;}
        ::-webkit-scrollbar-thumb{background:#30363d;border-radius:2px;}

        /* Scan lines */
        #root::after {
          content:'';
          position:fixed;inset:0;pointer-events:none;z-index:9999;
          background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.025) 2px,rgba(0,0,0,0.025) 4px);
        }

        .rh { transition: background 0.12s, box-shadow 0.12s; border-radius:3px; }
        .rh:hover {
          background:rgba(103,232,249,0.05) !important;
          box-shadow:inset 0 0 0 1px rgba(103,232,249,0.08);
        }

        .row-flash { animation: rowFlash 0.75s ease forwards; }
        @keyframes rowFlash {
          0%   { background:rgba(103,232,249,0.18); box-shadow:0 0 18px rgba(103,232,249,0.25); }
          100% { background:transparent; box-shadow:none; }
        }

        .cb .btn-add { opacity:0; transition:opacity .15s; }
        .cb:hover .btn-add { opacity:1; }

        .bg { background:none;border:none;color:#6e7681;cursor:pointer;font-family:inherit;font-size:inherit;padding:0;transition:color 0.15s; }
        .bg:hover { color:#c9d1d9; }

        .owner-badge { transition: all 0.18s cubic-bezier(0.4,0,0.2,1); }
        .owner-badge:hover { transform:scale(1.06); filter:brightness(1.25); }
        .owner-badge:active { transform:scale(0.94); }

        @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes si         { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fi         { from{opacity:0} to{opacity:1} }
        @keyframes fadeIn     { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        @keyframes toastIn    { from{transform:translateY(10px) scale(0.97);opacity:0} to{transform:none;opacity:1} }
        @keyframes staggerIn  { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:none} }
        @keyframes barGrow    { from{width:0} to{} }
        @keyframes glitchClip {
          0%,90%,100% { clip-path:inset(0 0 100% 0); opacity:0; }
          92%  { clip-path:inset(10% 0 70% 0); opacity:0.7; transform:translate(-3px,0); }
          94%  { clip-path:inset(55% 0 20% 0); opacity:0.6; transform:translate(3px,0); }
          96%  { clip-path:inset(80% 0 5%  0); opacity:0.5; transform:translate(-1px,0); }
        }

        .si  { animation:si .22s ease; }
        .fi  { animation:fi .25s ease; }
        .stagger-row { animation:staggerIn 0.2s ease backwards; }
        .cat-bar { transition:width 0.75s cubic-bezier(0.4,0,0.2,1); }

        .tb { background:none;border:none;font-family:inherit;font-size:10px;cursor:pointer;padding:3px 11px;border-radius:3px;letter-spacing:.8px;text-transform:uppercase;transition:all .2s; }
        .ta { background:rgba(103,232,249,0.08);color:#67e8f9;border:1px solid rgba(103,232,249,0.35);box-shadow:0 0 8px rgba(103,232,249,0.18); }
        .ti { color:#6e7681;border:1px solid transparent; }
        .ti:hover { color:#c9d1d9;border-color:#30363d; }

        .mb { background:none;border:1px solid #21262d;color:#6e7681;cursor:pointer;font-family:inherit;font-size:10px;padding:3px 9px;border-radius:3px;transition:all .15s; }
        .mb:hover { border-color:#67e8f9;color:#67e8f9;box-shadow:0 0 8px rgba(103,232,249,0.2); }

        .add-cat-btn { background:none;border:1px dashed #21262d;border-radius:4px;color:#6e7681;cursor:pointer;font-family:inherit;font-size:10px;padding:5px 12px;margin:4px 8px;letter-spacing:.5px;transition:all .2s; }
        .add-cat-btn:hover { border-color:#67e8f9;color:#67e8f9;box-shadow:0 0 10px rgba(103,232,249,0.18); }
      `}</style>

      {/* Toasts */}
      {toasts.map(t => <Toast key={t.id} id={t.id} message={t.msg} onDone={removeToast}/>)}

      {/* HEADER */}
      <div style={{ padding:"16px 22px 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <PixelBot glitch={glitch}/>
          <div>
            <div style={{ fontSize:13, fontWeight:700, letterSpacing:.3, position:"relative" }}>
              <span style={{ filter:glitch?"hue-rotate(80deg)":"none", transition:"filter 0.05s" }}>
                Lion's Technologies
              </span>
              {/* Glitch overlay */}
              <span style={{
                position:"absolute", left:0, top:0, color:"#67e8f9", pointerEvents:"none",
                animation: glitch ? "none" : "glitchClip 8s linear infinite",
                opacity:0,
              }}>Lion's Technologies</span>
              <span style={{ color:"#6e7681", fontWeight:400 }}> · Expense Tracker</span>
            </div>
            <div style={{ fontSize:10, color:"#6e7681", marginTop:2 }}>
              v2.0.0 · Claude Max · ~/lions-technologies/finances
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          <button className={`tb ${activeTab==="expenses"?"ta":"ti"}`} onClick={()=>setActiveTab("expenses")}>Despesas</button>
          <button className={`tb ${activeTab==="history"?"ta":"ti"}`}  onClick={()=>setActiveTab("history")}>Histórico</button>
        </div>
      </div>

      {/* PROMPT — typing effect */}
      <div style={{ padding:"10px 22px 0", display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
        <span style={{ color:"#6e7681" }}>$</span>
        <span style={{ color:"#c9d1d9" }}>{typed}</span>
        <span style={{
          color:"#67e8f9", opacity:blink?1:0, transition:"opacity 0.1s",
          textShadow:"0 0 8px #67e8f9",
        }}>█</span>
      </div>

      {/* MONTH NAVIGATOR */}
      <div style={{
        margin:"10px 22px 0", padding:"10px 14px",
        background:"#161b22", border:"1px solid #21262d", borderRadius:6,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap",
        boxShadow:"inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button className="mb" onClick={prevMonth}>‹ PREV</button>
          <div style={{ textAlign:"center", minWidth:110 }}>
            <div style={{
              fontSize:15, fontWeight:700, letterSpacing:2,
              textShadow: monthData?"0 0 14px rgba(103,232,249,0.3)":"none",
              transition:"text-shadow 0.4s",
            }}>{MONTHS_PT[curMonth]} {curYear}</div>
            <div style={{ fontSize:9, color:monthData?"#34d399":"#6e7681", letterSpacing:1, textTransform:"uppercase", marginTop:1 }}>
              {monthData ? "✓ carregado" : "○ vazio"}
            </div>
          </div>
          <button className="mb" onClick={nextMonth}>NEXT ›</button>
        </div>

        <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
          {MONTHS_PT.map((m,i) => {
            const k   = monthKey(curYear, i);
            const has = !!allData[k];
            const act = i === curMonth;
            return (
              <button key={m} onClick={()=>setCurMonth(i)} style={{
                background: act?"rgba(103,232,249,0.1)":has?"rgba(255,255,255,0.03)":"none",
                border:`1px solid ${act?"rgba(103,232,249,0.45)":has?"#21262d":"transparent"}`,
                color: act?"#67e8f9":has?"#c9d1d9":"#30363d",
                borderRadius:3, cursor:"pointer", fontFamily:"inherit",
                fontSize:9, letterSpacing:.5, padding:"2px 6px", fontWeight:act?700:400,
                transition:"all .15s",
                boxShadow:act?"0 0 8px rgba(103,232,249,0.28)":"none",
              }}>{m}{has&&!act&&<span style={{color:"#30363d",fontSize:7,marginLeft:2}}>●</span>}</button>
            );
          })}
        </div>

        <div style={{ display:"flex", gap:6 }}>
          {!monthData && allData[prevKey] && (
            <button onClick={()=>initMonth(true)} className="si" style={{
              background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.3)",
              color:"#a78bfa",borderRadius:4,cursor:"pointer",fontFamily:"inherit",
              fontSize:10,padding:"4px 10px",transition:"all 0.2s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 0 12px rgba(167,139,250,0.3)";}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";}}
            >📋 Copiar {MONTHS_PT[curMonth===0?11:curMonth-1]}</button>
          )}
          {!monthData && (
            <button onClick={()=>initMonth(false)} style={{
              background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.3)",
              color:"#34d399",borderRadius:4,cursor:"pointer",fontFamily:"inherit",
              fontSize:10,padding:"4px 10px",transition:"all 0.2s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 0 12px rgba(52,211,153,0.3)";}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";}}
            >✦ Novo Mês</button>
          )}
        </div>
      </div>

      {/* ── EXPENSES TAB ── */}
      {activeTab==="expenses" && (
        <div style={{ flex:1, padding:"10px 22px", display:"flex", gap:12, minHeight:0 }} className="fi">
          {!monthData ? (
            <div style={{
              flex:1,display:"flex",alignItems:"center",justifyContent:"center",
              flexDirection:"column",gap:10,color:"#6e7681",
            }}>
              <div style={{ fontSize:32, opacity:.3, animation:"pulse 2s infinite" }}>◌</div>
              <div style={{ fontSize:12 }}>Nenhum dado para {MONTHS_PT[curMonth]}/{curYear}</div>
              <div style={{ fontSize:10 }}>Use os botões acima para iniciar</div>
            </div>
          ) : (
            <>
              {/* TABLE */}
              <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflowY:"auto" }}>
                <div style={{
                  display:"grid",gridTemplateColumns:"130px 1fr 68px 90px 90px 18px",
                  gap:4,padding:"4px 8px 8px",fontSize:9,color:"#6e7681",
                  textTransform:"uppercase",letterSpacing:1,
                  borderBottom:"1px solid #21262d",marginBottom:6,
                }}>
                  <span>Categoria</span><span>Descrição</span><span>Resp.</span>
                  <span style={{textAlign:"right"}}>Valor</span>
                  <span style={{textAlign:"right"}}>Subtotal</span>
                  <span/>
                </div>

                {monthData.categories.map((cat, ci) => {
                  const ents = monthData.entries.filter(e=>e.catId===cat.id);
                  const sub  = ents.reduce((s,e)=>s+e.value,0);
                  return (
                    <div key={cat.id} className="cb" style={{ marginBottom:2 }}>
                      {ents.map((entry, i) => (
                        <div key={entry.id}
                          className={`rh stagger-row ${flashed.has(entry.id)?"row-flash":""}`}
                          style={{
                            display:"grid",gridTemplateColumns:"130px 1fr 68px 90px 90px 18px",
                            gap:4,padding:"4px 8px",alignItems:"center",
                            animationDelay:`${(ci*0.06 + i*0.03)}s`,
                          }}>
                          <span style={{
                            color:i===0?cat.color:"transparent",
                            fontSize:11,fontWeight:i===0?700:400,
                            display:"flex",alignItems:"center",gap:4,
                          }}>
                            {i===0 && <>
                              <span style={{ filter:`drop-shadow(0 0 5px ${cat.color}aa)` }}>›</span>
                              <InlineEdit value={cat.label} wide onChange={v=>updateCatLabel(cat.id,v)}/>
                              <button className="bg btn-add" onClick={()=>removeCategory(cat.id)} style={{fontSize:9,opacity:.5}}>✕</button>
                            </>}
                          </span>

                          <InlineEdit value={entry.desc} wide onChange={v=>updateEntry(entry.id,"desc",v)}/>

                          <span className="owner-badge"
                            onClick={()=>updateEntry(entry.id,"owner",entry.owner==="lion"?"primo":"lion")}
                            style={{
                              cursor:"pointer",fontSize:9,padding:"1px 5px",borderRadius:10,textAlign:"center",
                              background:entry.owner==="lion"?"rgba(103,232,249,0.1)":"rgba(167,139,250,0.1)",
                              color:entry.owner==="lion"?"#67e8f9":"#a78bfa",
                              border:`1px solid ${entry.owner==="lion"?"rgba(103,232,249,0.3)":"rgba(167,139,250,0.3)"}`,
                              userSelect:"none",
                              boxShadow:entry.owner==="lion"?"0 0 5px rgba(103,232,249,0.18)":"0 0 5px rgba(167,139,250,0.18)",
                            }} title="Clique p/ alternar">
                            {entry.owner==="lion"?"Lion":"Primo"}
                          </span>

                          <div style={{textAlign:"right"}}>
                            <InlineEdit value={entry.value.toFixed(2).replace(".",",")} onChange={v=>updateEntry(entry.id,"value",v)}/>
                          </div>

                          <div style={{textAlign:"right",fontSize:11}}>
                            {i===ents.length-1 && (
                              <span style={{
                                color:cat.color, fontWeight:700,
                                textShadow:`0 0 8px ${cat.color}66`,
                              }}>{fmt(sub)}</span>
                            )}
                          </div>

                          <button className="bg" onClick={()=>removeEntry(entry.id)}
                            style={{fontSize:10,opacity:ents.length>1?.45:.1}} title="Remover">✕</button>
                        </div>
                      ))}

                      <div style={{padding:"1px 8px"}}>
                        <button className="btn-add bg" onClick={()=>addEntry(cat.id)}
                          style={{fontSize:9,color:cat.color,opacity:.7,letterSpacing:.5}}>
                          + nova linha
                        </button>
                      </div>
                      <div style={{
                        height:1,
                        background:`linear-gradient(90deg, transparent, ${cat.color}22 30%, ${cat.color}22 70%, transparent)`,
                        margin:"4px 0",
                      }}/>
                    </div>
                  );
                })}

                {/* Add category */}
                {addingCat ? (
                  <div style={{display:"flex",gap:6,padding:"4px 8px",alignItems:"center"}} className="si">
                    <input ref={catInpRef} value={newCatName} onChange={e=>setNewCatName(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter")addCategory();if(e.key==="Escape")setAddingCat(false);}}
                      placeholder="Nome da categoria..."
                      style={{
                        background:"rgba(103,232,249,0.06)",border:"1px solid rgba(103,232,249,0.4)",
                        borderRadius:3,color:"#e6edf3",fontFamily:"inherit",fontSize:11,
                        padding:"3px 8px",outline:"none",width:190,
                        boxShadow:"0 0 10px rgba(103,232,249,0.2)",
                      }}
                    />
                    <button onClick={addCategory} style={{
                      background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.3)",
                      color:"#34d399",borderRadius:3,cursor:"pointer",fontFamily:"inherit",fontSize:10,padding:"3px 8px",
                    }}>✓</button>
                    <button className="bg" onClick={()=>setAddingCat(false)} style={{fontSize:10}}>esc</button>
                  </div>
                ) : (
                  <button className="add-cat-btn" onClick={()=>setAddingCat(true)}>
                    + nova categoria
                  </button>
                )}

                {/* Totals */}
                <div style={{
                  marginTop:10,padding:"10px 8px",
                  borderTop:"1px solid #30363d",
                  background:"linear-gradient(0deg,rgba(103,232,249,0.025),transparent)",
                  display:"grid",gridTemplateColumns:"130px 1fr 68px 90px 90px 18px",
                  gap:4,alignItems:"center",
                }}>
                  <span style={{fontSize:9,color:"#6e7681",textTransform:"uppercase",letterSpacing:1}}>Total Mês</span>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:10,color:"#67e8f9"}}>🦁 {fmt(animLion)}</span>
                    <Delta cur={totals.lion}  prev={prevTotals?.lion}/>
                    <span style={{fontSize:10,color:"#a78bfa"}}>👤 {fmt(animPrimo)}</span>
                    <Delta cur={totals.primo} prev={prevTotals?.primo}/>
                  </div>
                  <span/><span/>
                  <span style={{
                    textAlign:"right",color:"#f59e0b",fontWeight:700,fontSize:14,
                    textShadow:"0 0 14px rgba(245,158,11,0.45)",
                  }}>{fmt(animGrand)}</span>
                  <span/>
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div style={{
                width:220,borderLeft:"1px solid #21262d",paddingLeft:14,
                display:"flex",flexDirection:"column",gap:0,overflowY:"auto",
              }}>
                {/* Donut */}
                <div style={{display:"flex",justifyContent:"center",margin:"4px 0 8px"}}>
                  <DonutChart categories={monthData.categories} byCat={totals.byCat} grand={totals.grand}/>
                </div>

                <div style={{height:1,background:"#21262d",margin:"0 0 8px"}}/>

                {/* Stat cards */}
                <StatCard label="Lion"  value={totals.lion}  prev={prevTotals?.lion}  color="#67e8f9" icon="🦁"/>
                <StatCard label="Primo" value={totals.primo} prev={prevTotals?.primo} color="#a78bfa" icon="👤"/>
                <StatCard label="Total" value={totals.grand} prev={prevTotals?.grand} color="#f59e0b" icon="⚡"/>

                <div style={{height:1,background:"#21262d",margin:"6px 0"}}/>

                {/* Category bars */}
                <div style={{fontSize:9,color:"#6e7681",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
                  Por Categoria
                </div>
                {monthData.categories.map(cat => {
                  const sub = totals.byCat[cat.id]||0;
                  const pct = totals.grand>0?(sub/totals.grand)*100:0;
                  return (
                    <div key={cat.id} style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:3}}>
                        <span style={{color:cat.color,textShadow:`0 0 6px ${cat.color}55`}}>{cat.label}</span>
                        <span style={{color:"#6e7681"}}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{height:3,background:"#21262d",borderRadius:2}}>
                        <div className="cat-bar" style={{
                          height:"100%",width:`${pct}%`,borderRadius:2,
                          background:`linear-gradient(90deg,${cat.color}88,${cat.color})`,
                          boxShadow:`0 0 6px ${cat.color}55`,
                        }}/>
                      </div>
                    </div>
                  );
                })}

                <div style={{height:1,background:"#21262d",margin:"6px 0"}}/>

                {/* Log */}
                <div style={{fontSize:9,color:"#6e7681",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
                  Activity Log
                </div>
                <div ref={logRef} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
                  {log.map((l,i) => (
                    <div key={i} style={{
                      fontSize:9,lineHeight:1.6,
                      animation:i===log.length-1?"si 0.2s ease":"none",
                    }}>
                      <span style={{color:"#30363d"}}>
                        {l.ts.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
                      </span><br/>
                      <span style={{color:i===log.length-1?"#c9d1d9":"#6e7681"}}>{l.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab==="history" && (
        <div style={{ flex:1, padding:"14px 22px", overflowY:"auto" }} className="fi">
          <div style={{
            background:"#161b22",border:"1px solid #21262d",borderRadius:6,
            padding:"14px 20px",marginBottom:14,
            display:"flex",gap:36,alignItems:"center",flexWrap:"wrap",
            boxShadow:"inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
            <div style={{fontSize:9,color:"#6e7681",textTransform:"uppercase",letterSpacing:1,width:"100%",marginBottom:2}}>
              Tendência · {histKeys.length} {histKeys.length===1?"mês":"meses"} registrados
            </div>
            {[
              { label:"🦁 Lion",  vals:hist.lion,  color:"#67e8f9" },
              { label:"👤 Primo", vals:hist.primo, color:"#a78bfa" },
              { label:"⚡ Total", vals:hist.grand, color:"#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{display:"flex",flexDirection:"column",gap:3}}>
                <span style={{fontSize:9,color:"#6e7681",textTransform:"uppercase",letterSpacing:1}}>{s.label}</span>
                <Sparkline values={s.vals} color={s.color}/>
                <span style={{fontSize:12,fontWeight:700,color:s.color,textShadow:`0 0 8px ${s.color}55`}}>
                  {fmt(s.vals[s.vals.length-1]||0)}
                </span>
                <span style={{fontSize:9,color:"#30363d"}}>último mês</span>
              </div>
            ))}
          </div>

          <div style={{fontSize:9,color:"#6e7681",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
            Histórico Mensal
          </div>
          <div style={{
            display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 70px",
            gap:4,fontSize:9,color:"#6e7681",
            padding:"4px 10px",borderBottom:"1px solid #21262d",marginBottom:4,
          }}>
            <span>Mês</span><span>🦁 Lion</span><span>👤 Primo</span><span>⚡ Total</span>
            <span style={{textAlign:"right"}}>Ação</span>
          </div>

          {histKeys.slice().reverse().map((k, idx, arr) => {
            const d = allData[k]; if (!d) return null;
            const [yr,mo] = k.split("-").map(Number);
            const mIdx = mo-1;
            const lion  = d.entries.filter(e=>e.owner==="lion").reduce((s,e)=>s+e.value,0);
            const primo = d.entries.filter(e=>e.owner==="primo").reduce((s,e)=>s+e.value,0);
            const grand = lion+primo;
            const prevK = arr[arr.length-1-idx-1];
            const prevG = prevK ? allData[prevK]?.entries.reduce((s,e)=>s+e.value,0) : null;
            const isActive = k===key;
            return (
              <div key={k} className="stagger-row" style={{
                display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 70px",
                gap:4,padding:"7px 10px",borderRadius:4,alignItems:"center",
                background:isActive?"rgba(103,232,249,0.04)":"none",
                border:isActive?"1px solid rgba(103,232,249,0.15)":"1px solid transparent",
                marginBottom:3,cursor:"pointer",transition:"all .15s",
                boxShadow:isActive?"0 0 14px rgba(103,232,249,0.08) inset":"none",
                animationDelay:`${idx*0.04}s`,
              }}
                onClick={()=>{setCurYear(yr);setCurMonth(mIdx);setActiveTab("expenses");}}
                onMouseEnter={e=>{if(!isActive) e.currentTarget.style.background="rgba(255,255,255,0.025)";}}
                onMouseLeave={e=>{if(!isActive) e.currentTarget.style.background="none";}}
              >
                <span style={{
                  color:isActive?"#67e8f9":"#c9d1d9",fontWeight:isActive?700:400,fontSize:11,
                  textShadow:isActive?"0 0 8px rgba(103,232,249,0.4)":"none",
                }}>
                  {MONTHS_PT[mIdx]}/{yr}
                  {isActive&&<span style={{fontSize:8,color:"#67e8f9",marginLeft:4,animation:"pulse 1.5s infinite"}}>◉</span>}
                </span>
                <span style={{fontSize:11,color:"#67e8f9"}}>{fmt(lion)}</span>
                <span style={{fontSize:11,color:"#a78bfa"}}>{fmt(primo)}</span>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:"#f59e0b",fontWeight:700}}>{fmt(grand)}</span>
                  {prevG!=null && <Delta cur={grand} prev={prevG}/>}
                </div>
                <div style={{textAlign:"right"}}>
                  <button className="bg" style={{fontSize:9,opacity:.3}}
                    onClick={e=>{e.stopPropagation();
                      if(window.confirm(`Deletar dados de ${MONTHS_PT[mIdx]}/${yr}?`)){
                        setAllData(p=>{const n={...p};delete n[k];return n;});
                        addLog(`✕ ${MONTHS_PT[mIdx]}/${yr} deletado`);
                      }
                    }}>✕</button>
                </div>
              </div>
            );
          })}

          {histKeys.length===0 && (
            <div style={{color:"#6e7681",textAlign:"center",marginTop:40,fontSize:11}}>
              Nenhum histórico disponível ainda
            </div>
          )}
        </div>
      )}

      {/* STATUS BAR */}
      <div style={{
        borderTop:"1px solid #21262d",padding:"5px 22px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        fontSize:9,color:"#6e7681",background:"#0d1117",
      }}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{
            background:"rgba(245,158,11,0.1)",color:"#f59e0b",
            border:"1px solid rgba(245,158,11,0.3)",borderRadius:3,padding:"1px 7px",
            boxShadow:"0 0 6px rgba(245,158,11,0.18)",
          }}>▶▶ bypass permissions on</span>
          <span style={{animation:"pulse 2s infinite",color:"#34d399"}}>◉ live</span>
          <span style={{color:"#30363d"}}>·</span>
          <span>{histKeys.length} {histKeys.length===1?"mês":"meses"} · duplo-clique → editar</span>
        </div>
        <div style={{display:"flex",gap:10}}>
          <span>current: 2.0.0 · stable: 1.0.0</span>
          <span style={{color:"#30363d"}}>·</span>
          <Clock/>
        </div>
      </div>
    </div>
  );
}
