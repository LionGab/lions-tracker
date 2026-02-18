import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const PixelBot = () => (
  <svg width="38" height="38" viewBox="0 0 10 10" style={{ imageRendering: "pixelated", flexShrink: 0 }}>
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

function InlineEdit({ value, onChange, wide = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const ref = useRef();
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => { setEditing(false); onChange(draft); };
  if (editing) return (
    <input ref={ref} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key==="Enter") commit(); if (e.key==="Escape"){ setEditing(false); setDraft(value); } }}
      style={{
        background:"rgba(103,232,249,0.08)",border:"1px solid rgba(103,232,249,0.5)",
        borderRadius:2,color:"#e6edf3",fontFamily:"inherit",fontSize:"inherit",
        padding:"0 5px",outline:"none",width:wide?150:82,
      }}
    />
  );
  return (
    <span onDoubleClick={() => setEditing(true)} title="Duplo-clique para editar"
      style={{ cursor:"text", borderBottom:"1px dashed rgba(255,255,255,0.1)" }}>
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
      fontSize:9,fontWeight:700,
      color:up?"#f87171":"#34d399",
      background:up?"rgba(248,113,113,0.1)":"rgba(52,211,153,0.1)",
      border:`1px solid ${up?"rgba(248,113,113,0.25)":"rgba(52,211,153,0.25)"}`,
      borderRadius:3,padding:"1px 5px",
    }}>{up?"▲":"▼"}{Math.abs(pct)}%</span>
  );
}

function Sparkline({ values, color }) {
  if (values.length < 2) return <span style={{color:"#30363d",fontSize:10}}>─</span>;
  const max=Math.max(...values,1), min=Math.min(...values);
  const W=64,H=22;
  const pts = values.map((v,i)=>`${(i/(values.length-1))*W},${H-((v-min)/(max-min||1))*H}`).join(" ");
  const last = pts.trim().split(" ").pop().split(",");
  return (
    <svg width={W} height={H} style={{verticalAlign:"middle"}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.7"/>
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color}/>
    </svg>
  );
}

export default function App() {
  const now = new Date();
  const [curYear,  setCurYear]  = useState(now.getFullYear());
  const [curMonth, setCurMonth] = useState(now.getMonth());
  const [allData,  setAllData]  = useState(() => {
    const k = monthKey(now.getFullYear(), now.getMonth());
    return { [k]: clone(SEED_DATA) };
  });
  const [log,       setLog]      = useState([{ ts: new Date(), msg: "Sistema iniciado · Lion's Technologies v2.0" }]);
  const [flash,     setFlash]    = useState(null);
  const [activeTab, setActiveTab]= useState("expenses");
  const [addingCat, setAddingCat]= useState(false);
  const [newCatName,setNewCatName]= useState("");
  const logRef    = useRef();
  const catInpRef = useRef();

  const key     = monthKey(curYear, curMonth);
  const prevKey = curMonth === 0 ? monthKey(curYear-1,11) : monthKey(curYear,curMonth-1);
  const monthData = allData[key] || null;

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);
  useEffect(() => { if (addingCat) catInpRef.current?.focus(); }, [addingCat]);

  const addLog = useCallback((msg) => {
    setLog(p => [...p.slice(-30), { ts: new Date(), msg }]);
    setFlash(msg);
    setTimeout(() => setFlash(null), 2000);
  }, []);

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
    mutate(d => { const e=d.entries.find(e=>e.id===entId); if(e){ e[field]=val; addLog(`✎ [${field}] → ${raw}`); } });
  };
  const addEntry = (catId) => {
    const cat = monthData?.categories.find(c=>c.id===catId);
    mutate(d => d.entries.push({ id:uid(), catId, desc:"Nova entrada", owner:"lion", value:0 }));
    addLog(`+ ${cat?.label} · nova linha`);
  };
  const removeEntry = (entId) => {
    const entry = monthData.entries.find(e=>e.id===entId);
    if (!entry) return;
    const siblings = monthData.entries.filter(e=>e.catId===entry.catId);
    if (siblings.length <= 1) return;
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

  const prevData = allData[prevKey];
  const prevTotals = useMemo(() => {
    if (!prevData) return null;
    let lion=0,primo=0;
    for (const e of prevData.entries) { if(e.owner==="lion") lion+=e.value; else primo+=e.value; }
    return { lion, primo, grand:lion+primo };
  }, [prevData]);

  const histKeys = Object.keys(allData).sort();
  const hist = {
    lion:  histKeys.map(k => allData[k]?.entries.filter(e=>e.owner==="lion").reduce((s,e)=>s+e.value,0)||0),
    primo: histKeys.map(k => allData[k]?.entries.filter(e=>e.owner==="primo").reduce((s,e)=>s+e.value,0)||0),
    grand: histKeys.map(k => allData[k]?.entries.reduce((s,e)=>s+e.value,0)||0),
  };

  const ts = new Date().toLocaleTimeString("pt-BR");

  return (
    <div style={{
      background:"#0d1117", minHeight:"100vh",
      fontFamily:"'JetBrains Mono','Fira Code','Cascadia Code',monospace",
      fontSize:13, color:"#e6edf3",
      display:"flex", flexDirection:"column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#0d1117;}
        ::-webkit-scrollbar-thumb{background:#30363d;border-radius:2px;}
        .rh:hover{background:rgba(255,255,255,0.025);}
        .cb .btn-add{opacity:0;transition:opacity .15s;}
        .cb:hover .btn-add{opacity:1;}
        .bg{background:none;border:none;color:#6e7681;cursor:pointer;font-family:inherit;font-size:inherit;padding:0;}
        .bg:hover{color:#c9d1d9;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes si{from{transform:translateY(4px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fi{from{opacity:0}to{opacity:1}}
        .si{animation:si .18s ease;}
        .fi{animation:fi .22s ease;}
        .tb{background:none;border:none;font-family:inherit;font-size:10px;cursor:pointer;padding:3px 11px;border-radius:3px;letter-spacing:.8px;text-transform:uppercase;transition:all .15s;}
        .ta{background:rgba(103,232,249,0.08);color:#67e8f9;border:1px solid rgba(103,232,249,0.3);}
        .ti{color:#6e7681;border:1px solid transparent;}
        .ti:hover{color:#c9d1d9;}
        .mb{background:none;border:1px solid #21262d;color:#6e7681;cursor:pointer;font-family:inherit;font-size:10px;padding:3px 9px;border-radius:3px;transition:all .12s;}
        .mb:hover{border-color:#30363d;color:#e6edf3;}
      `}</style>

      {/* HEADER */}
      <div style={{ padding:"16px 22px 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <PixelBot/>
          <div>
            <div style={{ fontSize:13, fontWeight:700, letterSpacing:.3 }}>
              Lion's Technologies <span style={{ color:"#6e7681", fontWeight:400 }}>· Expense Tracker</span>
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

      {/* PROMPT */}
      <div style={{ padding:"10px 22px 0", display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
        <span style={{ color:"#6e7681" }}>$</span>
        <span>finance --month {MONTHS_PT[curMonth]}/{curYear} --watch --shared</span>
        <span style={{ color:"#6e7681", animation:"pulse 1.1s infinite" }}>█</span>
      </div>

      {/* FLASH */}
      <div style={{ height:20, padding:"3px 22px 0" }}>
        {flash && <div className="si" style={{ fontSize:10, color:"#67e8f9" }}>▶▶ {flash}</div>}
      </div>

      {/* MONTH NAVIGATOR */}
      <div style={{
        margin:"0 22px 0",padding:"10px 14px",
        background:"#161b22",border:"1px solid #21262d",borderRadius:6,
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
        flexWrap:"wrap",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button className="mb" onClick={prevMonth}>‹ PREV</button>
          <div style={{ textAlign:"center", minWidth:110 }}>
            <div style={{ fontSize:15, fontWeight:700, letterSpacing:2 }}>{MONTHS_PT[curMonth]} {curYear}</div>
            <div style={{ fontSize:9, color:"#6e7681", letterSpacing:1, textTransform:"uppercase", marginTop:1 }}>
              {monthData ? "✓ carregado" : "○ vazio"}
            </div>
          </div>
          <button className="mb" onClick={nextMonth}>NEXT ›</button>
        </div>

        <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
          {MONTHS_PT.map((m,i) => {
            const k = monthKey(curYear, i);
            const has = !!allData[k];
            const act = i === curMonth;
            return (
              <button key={m} onClick={()=>setCurMonth(i)} style={{
                background: act?"rgba(103,232,249,0.1)":has?"rgba(255,255,255,0.03)":"none",
                border:`1px solid ${act?"rgba(103,232,249,0.4)":has?"#21262d":"transparent"}`,
                color:act?"#67e8f9":has?"#c9d1d9":"#30363d",
                borderRadius:3,cursor:"pointer",fontFamily:"inherit",
                fontSize:9,letterSpacing:.5,padding:"2px 6px",
                fontWeight:act?700:400,transition:"all .12s",
              }}>{m}{has&&!act&&<span style={{color:"#30363d",fontSize:7,marginLeft:2}}>●</span>}</button>
            );
          })}
        </div>

        <div style={{ display:"flex", gap:6 }}>
          {!monthData && allData[prevKey] && (
            <button onClick={()=>initMonth(true)} style={{
              background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.3)",
              color:"#a78bfa",borderRadius:4,cursor:"pointer",fontFamily:"inherit",
              fontSize:10,padding:"4px 10px",
            }}>
              📋 Copiar {MONTHS_PT[curMonth===0?11:curMonth-1]}
            </button>
          )}
          {!monthData && (
            <button onClick={()=>initMonth(false)} style={{
              background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.3)",
              color:"#34d399",borderRadius:4,cursor:"pointer",fontFamily:"inherit",
              fontSize:10,padding:"4px 10px",
            }}>✦ Novo Mês</button>
          )}
        </div>
      </div>

      {/* EXPENSES TAB */}
      {activeTab==="expenses" && (
        <div style={{ flex:1, padding:"10px 22px", display:"flex", gap:12, minHeight:0 }} className="fi">
          {!monthData ? (
            <div style={{
              flex:1,display:"flex",alignItems:"center",justifyContent:"center",
              flexDirection:"column",gap:10,color:"#6e7681",
            }}>
              <div style={{ fontSize:32, opacity:.3 }}>◌</div>
              <div style={{ fontSize:12 }}>Nenhum dado para {MONTHS_PT[curMonth]}/{curYear}</div>
              <div style={{ fontSize:10 }}>Use os botões acima para iniciar</div>
            </div>
          ) : (
            <>
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

                {monthData.categories.map(cat => {
                  const ents = monthData.entries.filter(e=>e.catId===cat.id);
                  const sub  = ents.reduce((s,e)=>s+e.value,0);
                  return (
                    <div key={cat.id} className="cb" style={{ marginBottom:2 }}>
                      {ents.map((entry,i) => (
                        <div key={entry.id} className="rh" style={{
                          display:"grid",gridTemplateColumns:"130px 1fr 68px 90px 90px 18px",
                          gap:4,padding:"4px 8px",alignItems:"center",borderRadius:3,
                        }}>
                          <span style={{
                            color:i===0?cat.color:"transparent",
                            fontSize:11,fontWeight:i===0?700:400,
                            display:"flex",alignItems:"center",gap:4,
                          }}>
                            {i===0 && <>
                              <span>›</span>
                              <InlineEdit value={cat.label} wide onChange={v=>updateCatLabel(cat.id,v)}/>
                              <button className="bg btn-add" onClick={()=>removeCategory(cat.id)} style={{fontSize:9,opacity:.5}}>✕</button>
                            </>}
                          </span>

                          <InlineEdit value={entry.desc} wide onChange={v=>updateEntry(entry.id,"desc",v)}/>

                          <span onClick={()=>updateEntry(entry.id,"owner",entry.owner==="lion"?"primo":"lion")}
                            style={{
                              cursor:"pointer",fontSize:9,padding:"1px 5px",borderRadius:10,textAlign:"center",
                              background:entry.owner==="lion"?"rgba(103,232,249,0.1)":"rgba(167,139,250,0.1)",
                              color:entry.owner==="lion"?"#67e8f9":"#a78bfa",
                              border:`1px solid ${entry.owner==="lion"?"rgba(103,232,249,0.3)":"rgba(167,139,250,0.3)"}`,
                              userSelect:"none",transition:"all .1s",
                            }} title="Clique p/ alternar">
                            {entry.owner==="lion"?"Lion":"Primo"}
                          </span>

                          <div style={{textAlign:"right"}}>
                            <InlineEdit value={entry.value.toFixed(2).replace(".",",")} onChange={v=>updateEntry(entry.id,"value",v)}/>
                          </div>

                          <div style={{textAlign:"right",fontSize:11}}>
                            {i===ents.length-1 && <span style={{color:cat.color,fontWeight:700}}>{fmt(sub)}</span>}
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
                      <div style={{height:1,background:"#21262d",margin:"4px 0"}}/>
                    </div>
                  );
                })}

                {addingCat ? (
                  <div style={{display:"flex",gap:6,padding:"4px 8px",alignItems:"center"}}>
                    <input ref={catInpRef} value={newCatName} onChange={e=>setNewCatName(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter")addCategory();if(e.key==="Escape")setAddingCat(false);}}
                      placeholder="Nome da categoria..."
                      style={{
                        background:"rgba(103,232,249,0.06)",border:"1px solid rgba(103,232,249,0.35)",
                        borderRadius:3,color:"#e6edf3",fontFamily:"inherit",fontSize:11,
                        padding:"3px 8px",outline:"none",width:190,
                      }}
                    />
                    <button onClick={addCategory} style={{
                      background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.3)",
                      color:"#34d399",borderRadius:3,cursor:"pointer",fontFamily:"inherit",fontSize:10,padding:"3px 8px",
                    }}>✓</button>
                    <button className="bg" onClick={()=>setAddingCat(false)} style={{fontSize:10}}>esc</button>
                  </div>
                ) : (
                  <button onClick={()=>setAddingCat(true)} style={{
                    background:"none",border:"1px dashed #21262d",borderRadius:4,
                    color:"#6e7681",cursor:"pointer",fontFamily:"inherit",
                    fontSize:10,padding:"5px 12px",margin:"4px 8px",letterSpacing:.5,transition:"all .15s",
                  }}
                    onMouseEnter={e=>e.target.style.borderColor="#30363d"}
                    onMouseLeave={e=>e.target.style.borderColor="#21262d"}
                  >+ nova categoria</button>
                )}

                <div style={{
                  marginTop:10,padding:"10px 8px",borderTop:"1px solid #30363d",
                  display:"grid",gridTemplateColumns:"130px 1fr 68px 90px 90px 18px",
                  gap:4,alignItems:"center",
                }}>
                  <span style={{fontSize:9,color:"#6e7681",textTransform:"uppercase",letterSpacing:1}}>Total Mês</span>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:10,color:"#67e8f9"}}>🦁 {fmt(totals.lion)}</span>
                    <Delta cur={totals.lion}  prev={prevTotals?.lion}/>
                    <span style={{fontSize:10,color:"#a78bfa"}}>👤 {fmt(totals.primo)}</span>
                    <Delta cur={totals.primo} prev={prevTotals?.primo}/>
                  </div>
                  <span/><span/>
                  <span style={{textAlign:"right",color:"#f59e0b",fontWeight:700,fontSize:14}}>
                    {fmt(totals.grand)}
                  </span>
                  <span/>
                </div>
              </div>

              <div style={{
                width:206,borderLeft:"1px solid #21262d",paddingLeft:13,
                display:"flex",flexDirection:"column",gap:0,overflowY:"auto",
              }}>
                <div style={{fontSize:9,color:"#6e7681",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
                  Activity Log
                </div>
                <div ref={logRef} style={{maxHeight:160,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
                  {log.map((l,i) => (
                    <div key={i} style={{fontSize:9,lineHeight:1.6}}>
                      <span style={{color:"#30363d"}}>
                        {l.ts.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
                      </span><br/>
                      <span style={{color:i===log.length-1?"#c9d1d9":"#6e7681"}}>{l.msg}</span>
                    </div>
                  ))}
                </div>

                <div style={{height:1,background:"#21262d",margin:"10px 0"}}/>

                {[
                  { label:"🦁 Lion",  val:totals.lion,  prev:prevTotals?.lion,  color:"#67e8f9" },
                  { label:"👤 Primo", val:totals.primo, prev:prevTotals?.primo, color:"#a78bfa" },
                  { label:"⚡ Total", val:totals.grand, prev:prevTotals?.grand, color:"#f59e0b" },
                ].map(s => (
                  <div key={s.label} style={{
                    background:"rgba(255,255,255,0.02)",border:`1px solid ${s.color}18`,
                    borderRadius:4,padding:"7px 10px",marginBottom:5,
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:9,color:"#6e7681"}}>{s.label}</span>
                      <Delta cur={s.val} prev={s.prev}/>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:s.color,marginTop:2}}>{fmt(s.val)}</div>
                    {s.prev!=null && (
                      <div style={{fontSize:9,color:"#30363d",marginTop:1}}>
                        {MONTHS_PT[curMonth===0?11:curMonth-1]}: {fmt(s.prev)}
                      </div>
                    )}
                  </div>
                ))}

                <div style={{height:1,background:"#21262d",margin:"6px 0"}}/>

                <div style={{fontSize:9,color:"#6e7681",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
                  Por Categoria
                </div>
                {monthData.categories.map(cat => {
                  const sub = totals.byCat[cat.id]||0;
                  const pct = totals.grand>0?(sub/totals.grand)*100:0;
                  return (
                    <div key={cat.id} style={{marginBottom:7}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:2}}>
                        <span style={{color:cat.color}}>{cat.label}</span>
                        <span style={{color:"#6e7681"}}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{height:3,background:"#21262d",borderRadius:2}}>
                        <div style={{height:"100%",width:`${pct}%`,borderRadius:2,background:cat.color,transition:"width .3s"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab==="history" && (
        <div style={{ flex:1, padding:"14px 22px", overflowY:"auto" }} className="fi">
          <div style={{
            background:"#161b22",border:"1px solid #21262d",borderRadius:6,
            padding:"14px 20px",marginBottom:14,
            display:"flex",gap:36,alignItems:"center",flexWrap:"wrap",
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
                <span style={{fontSize:12,fontWeight:700,color:s.color}}>
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
            <span>Mês</span><span>🦁 Lion</span><span>👤 Primo</span><span>⚡ Total</span><span style={{textAlign:"right"}}>Ação</span>
          </div>

          {histKeys.slice().reverse().map((k,idx,arr) => {
            const d = allData[k]; if(!d) return null;
            const [yr,mo] = k.split("-").map(Number);
            const mIdx = mo-1;
            const lion  = d.entries.filter(e=>e.owner==="lion").reduce((s,e)=>s+e.value,0);
            const primo = d.entries.filter(e=>e.owner==="primo").reduce((s,e)=>s+e.value,0);
            const grand = lion+primo;
            const prevK = arr[arr.length-1-idx-1];
            const prevG = prevK ? allData[prevK]?.entries.reduce((s,e)=>s+e.value,0) : null;
            const isActive = k===key;
            return (
              <div key={k} style={{
                display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 70px",
                gap:4,padding:"7px 10px",borderRadius:4,alignItems:"center",
                background:isActive?"rgba(103,232,249,0.04)":"none",
                border:isActive?"1px solid rgba(103,232,249,0.12)":"1px solid transparent",
                marginBottom:3,cursor:"pointer",transition:"background .1s",
              }}
                onClick={()=>{setCurYear(yr);setCurMonth(mIdx);setActiveTab("expenses");}}
                onMouseEnter={e=>!isActive&&(e.currentTarget.style.background="rgba(255,255,255,0.02)")}
                onMouseLeave={e=>!isActive&&(e.currentTarget.style.background="none")}
              >
                <span style={{color:isActive?"#67e8f9":"#c9d1d9",fontWeight:isActive?700:400,fontSize:11}}>
                  {MONTHS_PT[mIdx]}/{yr}
                  {isActive&&<span style={{fontSize:8,color:"#67e8f9",marginLeft:4}}>◉</span>}
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
        fontSize:9,color:"#6e7681",
      }}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{
            background:"rgba(245,158,11,0.1)",color:"#f59e0b",
            border:"1px solid rgba(245,158,11,0.3)",borderRadius:3,padding:"1px 7px",
          }}>▶▶ bypass permissions on</span>
          <span style={{animation:"pulse 2s infinite"}}>◉ live</span>
          <span style={{color:"#30363d"}}>·</span>
          <span>{histKeys.length} {histKeys.length===1?"mês":"meses"} · duplo-clique → editar</span>
        </div>
        <div style={{display:"flex",gap:10}}>
          <span>current: 2.0.0 · stable: 1.0.0</span>
          <span style={{color:"#30363d"}}>·</span>
          <span>{ts}</span>
        </div>
      </div>
    </div>
  );
}
