import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const ATIVOS = {
  "🇧🇷 Futuros BR": ["WINFUT", "DOLFUT", "INDFUT"],
  "🇺🇸 Índices EUA": ["US30", "US100", "US500", "US2000"],
  "🇩🇪 Europa": ["GER40", "FR40", "UK100", "EU50", "SPA35", "ITA40"],
  "🌏 Ásia": ["JPN225", "HK50", "CN50", "AUS200"],
  "💱 Forex Major": ["EURUSD","USDJPY","GBPUSD","USDCHF","AUDUSD","USDCAD","NZDUSD"],
  "💱 Forex Minor": ["EURGBP","EURJPY","GBPJPY","EURCHF","AUDJPY","CADJPY","CHFJPY","EURCAD","GBPAUD","EURAUD","NZDJPY"],
  "🪙 Cripto": ["BTCUSD","ETHUSD","LTCUSD","XRPUSD","SOLUSD"],
  "🥇 Metais": ["XAUUSD","XAGUSD","XPTUSD"],
  "🛢️ Energia": ["USOIL","UKOIL","NATGAS"],
};

const SENTIMENTOS = [
  { v: "confiante", label: "😎 Confiante", color: "#22c55e" },
  { v: "ansioso", label: "😰 Ansioso", color: "#f97316" },
  { v: "medo", label: "😨 Medo", color: "#ef4444" },
  { v: "neutro", label: "😐 Neutro", color: "#94a3b8" },
  { v: "eufórico", label: "🤩 Eufórico", color: "#a855f7" },
  { v: "frustrado", label: "😤 Frustrado", color: "#f43f5e" },
  { v: "paciente", label: "🧘 Paciente", color: "#06b6d4" },
  { v: "disciplinado", label: "🎯 Disciplinado", color: "#3b82f6" },
];

const WEEKDAYS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

function getWeekday(dateStr) {
  if (!dateStr) return "";
  const [y,m,d] = dateStr.split("-").map(Number);
  return WEEKDAYS[new Date(y, m-1, d).getDay()];
}

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().slice(0,10), end: sun.toISOString().slice(0,10) };
}

const EMPTY_FORM = {
  data: new Date().toISOString().slice(0,10),
  ativo: "", mercadoMacro: "", direcao: "",
  resultadoPontos: "", resultadoReais: "",
  sentimento: "", descricao: "", medias: [],
  tipoEntrada: "", retracao: false, nivelRetracao: "", movimento: "",
};

// ─── THEME ────────────────────────────────────────────────────────────────────
const DARK = {
  bg: "#070e1a", card: "#0d1f3c", border: "#1e3a5f",
  text: "#e2e8f0", muted: "#475569", accent: "#60a5fa",
  input: "#070e1a", header: "#0a1628",
};
const LIGHT = {
  bg: "#f1f5f9", card: "#ffffff", border: "#cbd5e1",
  text: "#0f172a", muted: "#64748b", accent: "#2563eb",
  input: "#f8fafc", header: "#ffffff",
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, t }) {
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16
    }}>
      <div style={{
        background:t.card,border:`1px solid ${t.border}`,borderRadius:16,
        width:"100%",maxWidth:700,maxHeight:"90vh",overflowY:"auto",
        boxShadow:"0 25px 60px rgba(0,0,0,0.5)"
      }}>
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"18px 24px",borderBottom:`1px solid ${t.border}`,background:t.header
        }}>
          <h2 style={{color:t.accent,fontSize:17,fontWeight:700,margin:0}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:t.muted,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}

function Pill({ label, selected, onClick, color, t }) {
  const c = color || (t ? t.accent : "#60a5fa");
  return (
    <button onClick={onClick} style={{
      padding:"7px 14px",borderRadius:999,
      border:`1.5px solid ${selected ? c : (t ? t.border : "#1e3a5f")}`,
      background: selected ? c+"22" : "transparent",
      color: selected ? c : (t ? t.muted : "#64748b"),
      fontWeight: selected?700:400, fontSize:13, cursor:"pointer",
      transition:"all .15s", whiteSpace:"nowrap"
    }}>{label}</button>
  );
}

function Section({ icon, title, children, t }) {
  return (
    <div style={{marginBottom:22}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:16}}>{icon}</span>
        <span style={{color:t.accent,fontWeight:600,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Tag({ children, color }) {
  const c = color || "#60a5fa";
  return (
    <span style={{
      background:c+"18",border:`1px solid ${c}44`,color:c,
      padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600
    }}>{children}</span>
  );
}

function StatCard({ icon, label, value, color, t }) {
  return (
    <div style={{
      background:t.card,border:`1px solid ${t.border}`,borderRadius:12,
      padding:"14px 18px",flex:1,minWidth:130
    }}>
      <div style={{fontSize:20,marginBottom:3}}>{icon}</div>
      <div style={{color:t.muted,fontSize:11,marginBottom:3}}>{label}</div>
      <div style={{color:color||t.text,fontWeight:700,fontSize:18}}>{value}</div>
    </div>
  );
}

// ─── ADD FORM ─────────────────────────────────────────────────────────────────
function AddOpForm({ initial, onSave, onClose, t }) {
  const [f, setF] = useState(initial || EMPTY_FORM);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const toggleMedia = m => setF(p=>({
    ...p, medias: p.medias.includes(m)?p.medias.filter(x=>x!==m):[...p.medias,m]
  }));
  const valid = f.data && f.ativo && f.direcao && f.resultadoPontos !== "";

  const inputStyle = {
    background:t.input, border:`1px solid ${t.border}`, borderRadius:8,
    color:t.text, padding:"10px 14px", fontSize:14, outline:"none"
  };

  return (
    <div>
      <Section icon="📅" title="Data da Operação" t={t}>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <input type="date" value={f.data} onChange={e=>set("data",e.target.value)} style={inputStyle}/>
          {f.data && (
            <div style={{
              background:t.border+"44",border:`1px solid ${t.border}`,
              borderRadius:8,padding:"10px 16px",color:t.accent,fontWeight:700,fontSize:14
            }}>{getWeekday(f.data)}</div>
          )}
        </div>
      </Section>

      <Section icon="📊" title="Ativo" t={t}>
        <div style={{
          background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,
          maxHeight:200,overflowY:"auto",padding:"6px 0"
        }}>
          {Object.entries(ATIVOS).map(([cat,ativos])=>(
            <div key={cat}>
              <div style={{
                padding:"5px 14px",fontSize:10,color:t.muted,fontWeight:700,
                letterSpacing:1,textTransform:"uppercase",borderBottom:`1px solid ${t.border}`,marginBottom:2
              }}>{cat}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:"5px 12px 8px"}}>
                {ativos.map(a=>(
                  <Pill key={a} label={a} selected={f.ativo===a} onClick={()=>set("ativo",a)} t={t}/>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon="🌐" title="Mercado Macro" t={t}>
        <div style={{display:"flex",gap:8}}>
          <Pill label="📈 Alta" selected={f.mercadoMacro==="Alta"} onClick={()=>set("mercadoMacro","Alta")} color="#22c55e" t={t}/>
          <Pill label="📉 Baixa" selected={f.mercadoMacro==="Baixa"} onClick={()=>set("mercadoMacro","Baixa")} color="#ef4444" t={t}/>
        </div>
      </Section>

      <Section icon="🎯" title="Direção" t={t}>
        <div style={{display:"flex",gap:8}}>
          <Pill label="🟢 Compra" selected={f.direcao==="Compra"} onClick={()=>set("direcao","Compra")} color="#22c55e" t={t}/>
          <Pill label="🔴 Venda" selected={f.direcao==="Venda"} onClick={()=>set("direcao","Venda")} color="#ef4444" t={t}/>
        </div>
      </Section>

      <Section icon="💰" title="Resultado" t={t}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <div>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:5}}>Pontos</label>
            <input type="number" placeholder="ex: 150" value={f.resultadoPontos}
              onChange={e=>set("resultadoPontos",e.target.value)} style={{...inputStyle,width:130}}/>
          </div>
          <div>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:5}}>Resultado (R$)</label>
            <input type="number" placeholder="ex: 300.00" value={f.resultadoReais}
              onChange={e=>set("resultadoReais",e.target.value)} style={{...inputStyle,width:150}}/>
          </div>
        </div>
      </Section>

      <Section icon="🧠" title="Sentimento" t={t}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {SENTIMENTOS.map(s=>(
            <Pill key={s.v} label={s.label} selected={f.sentimento===s.v}
              onClick={()=>set("sentimento",s.v)} color={s.color} t={t}/>
          ))}
        </div>
      </Section>

      <Section icon="✍️" title="Descrição da Entrada" t={t}>
        <textarea placeholder="Descreva sua análise, setup, motivo da entrada..."
          value={f.descricao} onChange={e=>set("descricao",e.target.value)} rows={3}
          style={{...inputStyle,width:"100%",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
      </Section>

      <Section icon="📉" title="Médias a Favor" t={t}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["9","21","50","200"].map(m=>(
            <Pill key={m} label={`MM ${m}`} selected={f.medias.includes(m)}
              onClick={()=>toggleMedia(m)} color="#a78bfa" t={t}/>
          ))}
        </div>
      </Section>

      <Section icon="🔢" title="Tipo de Entrada" t={t}>
        <div style={{display:"flex",gap:8}}>
          {["NV1","NV2","NV3"].map(tp=>(
            <Pill key={tp} label={tp} selected={f.tipoEntrada===tp}
              onClick={()=>set("tipoEntrada",tp)} color="#f59e0b" t={t}/>
          ))}
        </div>
      </Section>

      <Section icon="↩️" title="Estava em Retração?" t={t}>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <Pill label="✅ Sim" selected={f.retracao===true} onClick={()=>set("retracao",true)} color="#22c55e" t={t}/>
          <Pill label="❌ Não" selected={f.retracao===false} onClick={()=>set("retracao",false)} color="#ef4444" t={t}/>
        </div>
        {f.retracao && (
          <div>
            <div style={{color:t.muted,fontSize:12,marginBottom:8}}>Nível de Fibonacci:</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["38.2","50","61.8","76.4"].map(n=>(
                <Pill key={n} label={`${n}%`} selected={f.nivelRetracao===n}
                  onClick={()=>set("nivelRetracao",n)} color="#06b6d4" t={t}/>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section icon="📐" title="Tipo de Movimento" t={t}>
        <div style={{display:"flex",gap:8}}>
          <Pill label="📈 Expansão" selected={f.movimento==="Expansão"} onClick={()=>set("movimento","Expansão")} color="#22c55e" t={t}/>
          <Pill label="↩️ Retração" selected={f.movimento==="Retração"} onClick={()=>set("movimento","Retração")} color="#f97316" t={t}/>
        </div>
      </Section>

      <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:8}}>
        <button onClick={onClose} style={{
          padding:"11px 22px",borderRadius:8,border:`1px solid ${t.border}`,
          background:"transparent",color:t.muted,fontSize:14,cursor:"pointer"
        }}>Cancelar</button>
        <button onClick={()=>valid&&onSave(f)} style={{
          padding:"11px 26px",borderRadius:8,border:"none",
          background:valid?"linear-gradient(135deg,#3b82f6,#1d4ed8)":t.border,
          color:valid?"#fff":t.muted,fontSize:14,fontWeight:700,
          cursor:valid?"pointer":"not-allowed",
          boxShadow:valid?"0 4px 15px rgba(59,130,246,0.4)":"none"
        }}>💾 Salvar Operação</button>
      </div>
    </div>
  );
}

// ─── OP CARD ──────────────────────────────────────────────────────────────────
function OpCard({ op, onEdit, onDelete, t }) {
  const reais = parseFloat(op.resultadoReais)||0;
  const pts = parseFloat(op.resultadoPontos)||0;
  const pos = reais >= 0;
  const sent = SENTIMENTOS.find(s=>s.v===op.sentimento);
  return (
    <div style={{
      background:t.card,border:`1px solid ${pos?"#166534":"#7f1d1d"}`,
      borderLeft:`4px solid ${pos?"#22c55e":"#ef4444"}`,
      borderRadius:12,padding:"14px 18px",marginBottom:10,
      boxShadow:"0 3px 10px rgba(0,0,0,0.2)"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{
            background:op.direcao==="Compra"?"#14532d":"#7f1d1d",
            color:op.direcao==="Compra"?"#4ade80":"#f87171",
            padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:700
          }}>{op.direcao==="Compra"?"▲ COMPRA":"▼ VENDA"}</span>
          <span style={{color:t.accent,fontWeight:700,fontSize:15}}>{op.ativo}</span>
          <span style={{color:t.muted,fontSize:12}}>
            {op.data} · <span style={{color:t.accent}}>{getWeekday(op.data)}</span>
          </span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{textAlign:"right"}}>
            <div style={{color:pos?"#4ade80":"#f87171",fontWeight:700,fontSize:17}}>
              {pos?"+":""}{reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
            </div>
            <div style={{color:t.muted,fontSize:11}}>{pos?"+":""}{pts} pts</div>
          </div>
          <button onClick={()=>onEdit(op)} style={{
            background:t.border,border:"none",borderRadius:6,color:t.accent,
            padding:"5px 9px",cursor:"pointer",fontSize:12
          }}>✏️</button>
          <button onClick={()=>onDelete(op.id)} style={{
            background:"#3b0f0f",border:"none",borderRadius:6,color:"#f87171",
            padding:"5px 9px",cursor:"pointer",fontSize:12
          }}>🗑️</button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10,alignItems:"center"}}>
        {op.mercadoMacro && <Tag>{op.mercadoMacro==="Alta"?"📈":"📉"} {op.mercadoMacro}</Tag>}
        {op.tipoEntrada && <Tag color="#f59e0b">🔢 {op.tipoEntrada}</Tag>}
        {op.movimento && <Tag color="#a78bfa">📐 {op.movimento}</Tag>}
        {op.retracao && op.nivelRetracao && <Tag color="#06b6d4">↩️ Fib {op.nivelRetracao}%</Tag>}
        {op.medias.length>0 && <Tag color="#8b5cf6">MM {op.medias.join(", ")}</Tag>}
        {sent && <Tag color={sent.color}>{sent.label}</Tag>}
      </div>
      {op.descricao && (
        <div style={{
          marginTop:8,color:t.muted,fontSize:12,lineHeight:1.6,
          borderTop:`1px solid ${t.border}`,paddingTop:8,fontStyle:"italic"
        }}>"{op.descricao}"</div>
      )}
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function AnalyticsTab({ ops, t }) {
  const [fg, setFg] = useState("Todos");
  const [fDia, setFDia] = useState("Todos");
  const [fTipo, setFTipo] = useState("Todos");
  const [fAtivo, setFAtivo] = useState("Todos");
  const [fMes, setFMes] = useState("Todos");
  const [fMov, setFMov] = useState("Todos");

  const GRUPOS = {
    "Todos": ()=>true,
    "WIN/IND": op=>["WINFUT","INDFUT"].includes(op.ativo),
    "DOL": op=>op.ativo==="DOLFUT",
    "Índices EUA": op=>["US30","US100","US500","US2000"].includes(op.ativo),
    "Europa": op=>["GER40","FR40","UK100","EU50","SPA35"].includes(op.ativo),
    "Ásia": op=>["JPN225","HK50","CN50","AUS200"].includes(op.ativo),
    "Forex": op=>[...ATIVOS["💱 Forex Major"],...ATIVOS["💱 Forex Minor"]].includes(op.ativo),
    "Metais/Cripto": op=>[...ATIVOS["🥇 Metais"],...ATIVOS["🪙 Cripto"]].includes(op.ativo),
  };

  const meses = useMemo(()=>{
    const s = new Set(ops.map(o=>o.data.slice(0,7)));
    return ["Todos",...[...s].sort().reverse()];
  },[ops]);

  const ativosUnicos = useMemo(()=>["Todos",...new Set(ops.map(o=>o.ativo))],[ops]);

  const filtered = useMemo(()=>{
    return ops.filter(op=>{
      if(!GRUPOS[fg](op)) return false;
      if(fDia!=="Todos" && getWeekday(op.data)!==fDia) return false;
      if(fTipo!=="Todos" && op.tipoEntrada!==fTipo) return false;
      if(fAtivo!=="Todos" && op.ativo!==fAtivo) return false;
      if(fMes!=="Todos" && !op.data.startsWith(fMes)) return false;
      if(fMov!=="Todos" && op.movimento!==fMov) return false;
      return true;
    });
  },[ops,fg,fDia,fTipo,fAtivo,fMes,fMov]);

  const totalReais = filtered.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const wins = filtered.filter(o=>(parseFloat(o.resultadoReais)||0)>0).length;
  const pct = filtered.length>0?Math.round(wins/filtered.length*100):0;

  const hoje = new Date();
  const {start:ws,end:we} = getWeekRange(hoje);
  const semanaReais = filtered.filter(o=>o.data>=ws&&o.data<=we).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const mesStr = hoje.toISOString().slice(0,7);
  const mesReais = filtered.filter(o=>o.data.startsWith(mesStr)).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);

  const byDay = useMemo(()=>{
    const acc = {};
    filtered.forEach(op=>{
      const d = getWeekday(op.data);
      if(!acc[d]) acc[d]={day:d,reais:0,count:0,wins:0};
      acc[d].reais+=parseFloat(op.resultadoReais)||0;
      acc[d].count++;
      if((parseFloat(op.resultadoReais)||0)>0) acc[d].wins++;
    });
    return Object.values(acc).sort((a,b)=>b.reais-a.reais);
  },[filtered]);

  const byTipo = useMemo(()=>{
    const acc = {};
    filtered.forEach(op=>{
      if(!op.tipoEntrada) return;
      if(!acc[op.tipoEntrada]) acc[op.tipoEntrada]={tipo:op.tipoEntrada,reais:0,count:0,wins:0};
      acc[op.tipoEntrada].reais+=parseFloat(op.resultadoReais)||0;
      acc[op.tipoEntrada].count++;
      if((parseFloat(op.resultadoReais)||0)>0) acc[op.tipoEntrada].wins++;
    });
    return Object.values(acc).sort((a,b)=>b.reais-a.reais);
  },[filtered]);

  const byAtivo = useMemo(()=>{
    const acc = {};
    filtered.forEach(op=>{
      if(!acc[op.ativo]) acc[op.ativo]={ativo:op.ativo,reais:0,count:0};
      acc[op.ativo].reais+=parseFloat(op.resultadoReais)||0;
      acc[op.ativo].count++;
    });
    return Object.values(acc).sort((a,b)=>b.reais-a.reais).slice(0,8);
  },[filtered]);

  const chartData = useMemo(()=>{
    const sorted = [...filtered].sort((a,b)=>a.data.localeCompare(b.data));
    let acc = 0;
    return sorted.map((op,i)=>{
      acc += parseFloat(op.resultadoReais)||0;
      return { name:`Op ${i+1}`, data:op.data, saldo:Math.round(acc*100)/100, op:op.ativo };
    });
  },[filtered]);

  const maxAbs = Math.max(...byDay.map(d=>Math.abs(d.reais)),1);

  const selectStyle = {
    background:t.input,border:`1px solid ${t.border}`,borderRadius:8,
    color:t.text,padding:"8px 12px",fontSize:13,outline:"none"
  };

  const FilterBar = () => (
    <div style={{
      background:t.card,border:`1px solid ${t.border}`,borderRadius:12,
      padding:16,marginBottom:20
    }}>
      <div style={{color:t.muted,fontSize:11,fontWeight:700,marginBottom:12,letterSpacing:1}}>🔍 FILTROS AVANÇADOS</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{color:t.muted,fontSize:11,marginBottom:4}}>Grupo</div>
          <select value={fg} onChange={e=>setFg(e.target.value)} style={selectStyle}>
            {Object.keys(GRUPOS).map(g=><option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:t.muted,fontSize:11,marginBottom:4}}>Dia da Semana</div>
          <select value={fDia} onChange={e=>setFDia(e.target.value)} style={selectStyle}>
            {["Todos",...WEEKDAYS.slice(1,6)].map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:t.muted,fontSize:11,marginBottom:4}}>Tipo de Entrada</div>
          <select value={fTipo} onChange={e=>setFTipo(e.target.value)} style={selectStyle}>
            {["Todos","NV1","NV2","NV3"].map(tp=><option key={tp}>{tp}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:t.muted,fontSize:11,marginBottom:4}}>Ativo</div>
          <select value={fAtivo} onChange={e=>setFAtivo(e.target.value)} style={selectStyle}>
            {ativosUnicos.map(a=><option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:t.muted,fontSize:11,marginBottom:4}}>Mês</div>
          <select value={fMes} onChange={e=>setFMes(e.target.value)} style={selectStyle}>
            {meses.map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:t.muted,fontSize:11,marginBottom:4}}>Movimento</div>
          <select value={fMov} onChange={e=>setFMov(e.target.value)} style={selectStyle}>
            {["Todos","Expansão","Retração"].map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
        <div style={{display:"flex",alignItems:"flex-end"}}>
          <button onClick={()=>{setFg("Todos");setFDia("Todos");setFTipo("Todos");setFAtivo("Todos");setFMes("Todos");setFMov("Todos");}} style={{
            background:"#7f1d1d33",border:"1px solid #991b1b",borderRadius:8,
            color:"#f87171",padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:600
          }}>✕ Limpar</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <FilterBar />
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
        <StatCard icon="📊" label="Operações" value={filtered.length} t={t}/>
        <StatCard icon="✅" label="Taxa Acerto" value={`${pct}%`} color={pct>=50?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="💰" label="Total" value={totalReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} color={totalReais>=0?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="📅" label="Esta Semana" value={semanaReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} color={semanaReais>=0?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="🗓️" label="Este Mês" value={mesReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} color={mesReais>=0?"#4ade80":"#f87171"} t={t}/>
      </div>

      {/* GRÁFICO EVOLUÇÃO */}
      {chartData.length > 0 && (
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:20,marginBottom:16}}>
          <h3 style={{color:t.accent,fontSize:14,fontWeight:700,marginBottom:16,margin:"0 0 16px"}}>📈 Evolução do Saldo</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border}/>
              <XAxis dataKey="name" tick={{fill:t.muted,fontSize:11}} axisLine={{stroke:t.border}}/>
              <YAxis tick={{fill:t.muted,fontSize:11}} axisLine={{stroke:t.border}}
                tickFormatter={v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/>
              <Tooltip
                contentStyle={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text}}
                formatter={v=>[v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"Saldo"]}
              />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4"/>
              <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2}
                dot={{fill:"#3b82f6",r:3}} activeDot={{r:5}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        {/* Por dia */}
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:18}}>
          <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>📅 Por Dia da Semana</h3>
          {byDay.length===0 && <div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
          {byDay.map((d,i)=>(
            <div key={d.day} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{color:t.text,fontSize:13,fontWeight:i===0?700:400}}>
                  {i===0?"🏆 ":""}{d.day}
                </span>
                <span style={{color:d.reais>=0?"#4ade80":"#f87171",fontSize:12,fontWeight:700}}>
                  {d.reais>=0?"+":""}{d.reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                  <span style={{color:t.muted,fontWeight:400,marginLeft:6,fontSize:10}}>
                    {d.count>0?Math.round(d.wins/d.count*100):0}%
                  </span>
                </span>
              </div>
              <div style={{background:t.bg,borderRadius:4,height:6,overflow:"hidden"}}>
                <div style={{
                  width:`${Math.abs(d.reais)/maxAbs*100}%`,height:"100%",
                  background:d.reais>=0?"#22c55e":"#ef4444",borderRadius:4
                }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Por tipo */}
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:18}}>
          <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>🔢 Por Tipo de Entrada</h3>
          {byTipo.length===0 && <div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
          {byTipo.map(tp=>(
            <div key={tp.tipo} style={{
              background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,
              padding:"10px 14px",marginBottom:8
            }}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#f59e0b",fontWeight:700,fontSize:15}}>{tp.tipo}</span>
                <span style={{color:tp.reais>=0?"#4ade80":"#f87171",fontWeight:700}}>
                  {tp.reais>=0?"+":""}{tp.reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                </span>
              </div>
              <div style={{color:t.muted,fontSize:11,marginTop:3}}>
                {tp.wins}/{tp.count} ops · {tp.count?Math.round(tp.wins/tp.count*100):0}% acerto
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Por ativo */}
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:18}}>
        <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>📊 Por Ativo</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {byAtivo.map(a=>(
            <div key={a.ativo} style={{
              background:(a.reais>=0?"#14532d":"#7f1d1d")+"33",
              border:`1px solid ${a.reais>=0?"#166534":"#991b1b"}`,
              borderRadius:10,padding:"10px 14px",minWidth:110,textAlign:"center"
            }}>
              <div style={{color:t.accent,fontWeight:700,fontSize:13}}>{a.ativo}</div>
              <div style={{color:a.reais>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:15,margin:"3px 0"}}>
                {a.reais>=0?"+":""}{a.reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
              </div>
              <div style={{color:t.muted,fontSize:11}}>{a.count} ops</div>
            </div>
          ))}
          {byAtivo.length===0 && <div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
        </div>
      </div>
    </div>
  );
}

// ─── JOURNAL TAB ──────────────────────────────────────────────────────────────
function JournalTab({ ops, onEdit, onDelete, t }) {
  const [fAtivo, setFAtivo] = useState("");
  const [fDir, setFDir] = useState("");
  const [fPeriodo, setFPeriodo] = useState("todos");
  const [fDia, setFDia] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [fMov, setFMov] = useState("");
  const [sortBy, setSortBy] = useState("data_desc");

  const hoje = new Date();
  const {start:ws,end:we} = getWeekRange(hoje);
  const mesStr = hoje.toISOString().slice(0,7);
  const ativosUnicos = [...new Set(ops.map(o=>o.ativo))];

  const filtered = useMemo(()=>{
    let arr = [...ops];
    if(fAtivo) arr = arr.filter(o=>o.ativo===fAtivo);
    if(fDir) arr = arr.filter(o=>o.direcao===fDir);
    if(fDia) arr = arr.filter(o=>getWeekday(o.data)===fDia);
    if(fTipo) arr = arr.filter(o=>o.tipoEntrada===fTipo);
    if(fMov) arr = arr.filter(o=>o.movimento===fMov);
    if(fPeriodo==="semana") arr = arr.filter(o=>o.data>=ws&&o.data<=we);
    if(fPeriodo==="mes") arr = arr.filter(o=>o.data.startsWith(mesStr));
    if(sortBy==="data_desc") arr.sort((a,b)=>b.data.localeCompare(a.data));
    if(sortBy==="data_asc") arr.sort((a,b)=>a.data.localeCompare(b.data));
    if(sortBy==="reais_desc") arr.sort((a,b)=>(parseFloat(b.resultadoReais)||0)-(parseFloat(a.resultadoReais)||0));
    if(sortBy==="reais_asc") arr.sort((a,b)=>(parseFloat(a.resultadoReais)||0)-(parseFloat(b.resultadoReais)||0));
    return arr;
  },[ops,fAtivo,fDir,fPeriodo,fDia,fTipo,fMov,sortBy]);

  const totalFiltrado = filtered.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);

  const selectStyle = {
    background:t.input,border:`1px solid ${t.border}`,borderRadius:8,
    color:t.text,padding:"7px 11px",fontSize:13,outline:"none"
  };

  return (
    <div>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:14,marginBottom:16}}>
        <div style={{color:t.muted,fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1}}>🔍 FILTROS</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"flex-end"}}>
          <select value={fAtivo} onChange={e=>setFAtivo(e.target.value)} style={selectStyle}>
            <option value="">Todos ativos</option>
            {ativosUnicos.map(a=><option key={a}>{a}</option>)}
          </select>
          <select value={fDir} onChange={e=>setFDir(e.target.value)} style={selectStyle}>
            <option value="">Compra e Venda</option>
            <option>Compra</option><option>Venda</option>
          </select>
          <select value={fDia} onChange={e=>setFDia(e.target.value)} style={selectStyle}>
            <option value="">Todos os dias</option>
            {["Segunda","Terça","Quarta","Quinta","Sexta"].map(d=><option key={d}>{d}</option>)}
          </select>
          <select value={fTipo} onChange={e=>setFTipo(e.target.value)} style={selectStyle}>
            <option value="">Todos os tipos</option>
            <option>NV1</option><option>NV2</option><option>NV3</option>
          </select>
          <select value={fMov} onChange={e=>setFMov(e.target.value)} style={selectStyle}>
            <option value="">Expansão e Retração</option>
            <option>Expansão</option><option>Retração</option>
          </select>
          <div style={{display:"flex",gap:5}}>
            {[["todos","📋 Tudo"],["semana","📅 Semana"],["mes","🗓️ Mês"]].map(([v,l])=>(
              <Pill key={v} label={l} selected={fPeriodo===v} onClick={()=>setFPeriodo(v)} t={t}/>
            ))}
          </div>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...selectStyle,marginLeft:"auto"}}>
            <option value="data_desc">📅 Mais recente</option>
            <option value="data_asc">📅 Mais antigo</option>
            <option value="reais_desc">💰 Maior lucro</option>
            <option value="reais_asc">💰 Maior perda</option>
          </select>
        </div>
      </div>

      <div style={{
        display:"flex",gap:14,alignItems:"center",marginBottom:14,
        padding:"9px 14px",background:t.card,borderRadius:8,border:`1px solid ${t.border}`
      }}>
        <span style={{color:t.muted,fontSize:13}}>{filtered.length} operações</span>
        <span style={{color:t.border}}>·</span>
        <span style={{color:totalFiltrado>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:14}}>
          {totalFiltrado>=0?"+":""}{totalFiltrado.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
        </span>
      </div>

      {filtered.length===0 && (
        <div style={{textAlign:"center",padding:60,color:t.muted,fontSize:15}}>
          Nenhuma operação encontrada 📭
        </div>
      )}
      {filtered.map(op=><OpCard key={op.id} op={op} onEdit={onEdit} onDelete={onDelete} t={t}/>)}
    </div>
  );
}

// ─── META MODAL ───────────────────────────────────────────────────────────────
function MetaModal({ meta, onSave, onClose, t }) {
  const [form, setForm] = useState(meta);
  const inputStyle = {
    background:t.input,border:`1px solid ${t.border}`,borderRadius:8,
    color:t.text,padding:"10px 14px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"
  };
  return (
    <Modal title="🎯 Definir Metas" onClose={onClose} t={t}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div>
          <label style={{color:t.muted,fontSize:13,display:"block",marginBottom:6}}>Meta Diária (R$)</label>
          <input type="number" value={form.diaria} placeholder="ex: 500"
            onChange={e=>setForm(p=>({...p,diaria:e.target.value}))} style={inputStyle}/>
        </div>
        <div>
          <label style={{color:t.muted,fontSize:13,display:"block",marginBottom:6}}>Meta Semanal (R$)</label>
          <input type="number" value={form.semanal} placeholder="ex: 2000"
            onChange={e=>setForm(p=>({...p,semanal:e.target.value}))} style={inputStyle}/>
        </div>
        <div>
          <label style={{color:t.muted,fontSize:13,display:"block",marginBottom:6}}>Meta Mensal (R$)</label>
          <input type="number" value={form.mensal} placeholder="ex: 8000"
            onChange={e=>setForm(p=>({...p,mensal:e.target.value}))} style={inputStyle}/>
        </div>
        <button onClick={()=>onSave(form)} style={{
          padding:"12px",borderRadius:8,border:"none",
          background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",
          color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"
        }}>💾 Salvar Metas</button>
      </div>
    </Modal>
  );
}

function ProgressBar({ label, value, meta, color, t }) {
  const pct = meta>0?Math.min(Math.round(value/meta*100),100):0;
  const pos = value>=0;
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{color:t.muted,fontSize:12}}>{label}</span>
        <span style={{fontSize:12}}>
          <span style={{color:pos?"#4ade80":"#f87171",fontWeight:700}}>
            {pos?"+":""}{value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
          </span>
          <span style={{color:t.muted}}> / {parseFloat(meta||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>
        </span>
      </div>
      <div style={{background:t.bg,borderRadius:999,height:8,overflow:"hidden"}}>
        <div style={{
          width:`${pct}%`,height:"100%",
          background:pct>=100?"#22c55e":color||"#3b82f6",
          borderRadius:999,transition:"width .5s"
        }}/>
      </div>
      <div style={{color:pct>=100?"#4ade80":t.muted,fontSize:11,marginTop:2,textAlign:"right"}}>
        {pct>=100?"✅ Meta atingida!":pct+"%"}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function DiarioTrader() {
  const [ops, setOps] = useState([]);
  const [tab, setTab] = useState("journal");
  const [modal, setModal] = useState(null);
  const [editOp, setEditOp] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [meta, setMeta] = useState({ diaria:"", semanal:"", mensal:"" });
  const [showMeta, setShowMeta] = useState(false);

  const t = darkMode ? DARK : LIGHT;

  const handleSave = form => {
    if(editOp) setOps(prev=>prev.map(o=>o.id===editOp.id?{...form,id:editOp.id}:o));
    else setOps(prev=>[{...form,id:Date.now()},...prev]);
    setModal(null); setEditOp(null);
  };

  const handleEdit = op => { setEditOp(op); setModal("edit"); };
  const handleDelete = id => setOps(prev=>prev.filter(o=>o.id!==id));

  const hoje = new Date();
  const {start:ws,end:we} = getWeekRange(hoje);
  const mesStr = hoje.toISOString().slice(0,7);
  const hojStr = hoje.toISOString().slice(0,10);

  const totalReais = ops.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const semanaReais = ops.filter(o=>o.data>=ws&&o.data<=we).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const mesReais = ops.filter(o=>o.data.startsWith(mesStr)).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const diariaReais = ops.filter(o=>o.data===hojStr).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);

  const showMetas = meta.diaria||meta.semanal||meta.mensal;

  return (
    <div style={{minHeight:"100vh",background:t.bg,fontFamily:"'Inter',system-ui,sans-serif",color:t.text}}>
      {/* HEADER */}
      <div style={{
        background:t.header,borderBottom:`1px solid ${t.border}`,padding:"18px 24px",
        position:"sticky",top:0,zIndex:100,
        boxShadow:darkMode?"0 4px 20px rgba(0,0,0,0.4)":"0 2px 8px rgba(0,0,0,0.08)"
      }}>
        <div style={{maxWidth:920,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{
                background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",
                borderRadius:10,padding:"8px 11px",fontSize:20
              }}>📒</div>
              <div>
                <h1 style={{
                  fontSize:22,fontWeight:800,margin:0,
                  background:"linear-gradient(135deg,#60a5fa,#93c5fd)",
                  WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"
                }}>Diário de Trader</h1>
                <div style={{color:t.muted,fontSize:12,marginTop:1}}>{ops.length} operações</div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              {/* Resumo rápido */}
              {[
                {label:"Hoje",val:diariaReais},
                {label:"Semana",val:semanaReais},
                {label:"Mês",val:mesReais},
              ].map(({label,val})=>(
                <div key={label} style={{textAlign:"right",minWidth:70}}>
                  <div style={{color:t.muted,fontSize:10}}>{label}</div>
                  <div style={{color:val>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:13}}>
                    {val>=0?"+":""}{val.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                  </div>
                </div>
              ))}
              <div style={{width:1,height:30,background:t.border}}/>
              <div style={{textAlign:"right"}}>
                <div style={{color:t.muted,fontSize:10}}>Total</div>
                <div style={{color:totalReais>=0?"#4ade80":"#f87171",fontWeight:800,fontSize:17}}>
                  {totalReais>=0?"+":""}{totalReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                </div>
              </div>
              <button onClick={()=>setShowMeta(true)} style={{
                background:t.card,border:`1px solid ${t.border}`,borderRadius:8,
                color:t.accent,padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:600
              }}>🎯 Metas</button>
              <button onClick={()=>setDarkMode(d=>!d)} style={{
                background:t.card,border:`1px solid ${t.border}`,borderRadius:8,
                color:t.text,padding:"8px 12px",cursor:"pointer",fontSize:16
              }}>{darkMode?"☀️":"🌙"}</button>
              <button onClick={()=>{setEditOp(null);setModal("add");}} style={{
                background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",border:"none",
                borderRadius:9,color:"#fff",padding:"10px 18px",fontSize:13,fontWeight:700,
                cursor:"pointer",boxShadow:"0 4px 12px rgba(59,130,246,0.4)",whiteSpace:"nowrap"
              }}>＋ Nova Operação</button>
            </div>
          </div>

          {/* Barra de metas */}
          {showMetas && (
            <div style={{
              marginTop:14,padding:"12px 16px",background:t.card,
              border:`1px solid ${t.border}`,borderRadius:10
            }}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
                {meta.diaria && <ProgressBar label="Meta Diária" value={diariaReais} meta={parseFloat(meta.diaria)} color="#3b82f6" t={t}/>}
                {meta.semanal && <ProgressBar label="Meta Semanal" value={semanaReais} meta={parseFloat(meta.semanal)} color="#8b5cf6" t={t}/>}
                {meta.mensal && <ProgressBar label="Meta Mensal" value={mesReais} meta={parseFloat(meta.mensal)} color="#f59e0b" t={t}/>}
              </div>
            </div>
          )}

          {/* TABS */}
          <div style={{display:"flex",gap:2,marginTop:14}}>
            {[{id:"journal",label:"📋 Diário"},{id:"analytics",label:"📊 Análises"}].map(tb=>(
              <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
                padding:"9px 18px",borderRadius:"8px 8px 0 0",border:"none",
                background:tab===tb.id?t.bg:"transparent",
                color:tab===tb.id?t.accent:t.muted,
                fontWeight:tab===tb.id?700:400,fontSize:14,cursor:"pointer",
                borderBottom:tab===tb.id?`2px solid ${t.accent}`:"2px solid transparent"
              }}>{tb.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:920,margin:"0 auto",padding:"22px 16px"}}>
        {tab==="journal" && <JournalTab ops={ops} onEdit={handleEdit} onDelete={handleDelete} t={t}/>}
        {tab==="analytics" && <AnalyticsTab ops={ops} t={t}/>}
      </div>

      {/* MODALS */}
      {(modal==="add"||modal==="edit") && (
        <Modal title={editOp?"✏️ Editar Operação":"＋ Nova Operação"} onClose={()=>{setModal(null);setEditOp(null);}} t={t}>
          <AddOpForm initial={editOp||undefined} onSave={handleSave} onClose={()=>{setModal(null);setEditOp(null);}} t={t}/>
        </Modal>
      )}
      {showMeta && (
        <MetaModal meta={meta} onSave={m=>{setMeta(m);setShowMeta(false);}} onClose={()=>setShowMeta(false)} t={t}/>
      )}
    </div>
  );
}