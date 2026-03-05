import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const ATIVOS = {
  "🇧🇷 Futuros BR": ["WINFUT", "WDOFUT"],
  "🇺🇸 Índices EUA": ["US30", "US100", "US500", "US2000"],
  "🇩🇪 Europa": ["GER40", "FR40", "UK100", "EU50", "SPA35", "ITA40"],
  "🌏 Ásia": ["JPN225", "HK50", "CN50", "AUS200"],
  "💱 Forex Major": ["EURUSD","USDJPY","GBPUSD","USDCHF","AUDUSD","USDCAD","NZDUSD"],
  "💱 Forex Minor": ["EURGBP","EURJPY","GBPJPY","EURCHF","AUDJPY","CADJPY","CHFJPY","EURCAD","GBPAUD","EURAUD","NZDJPY"],
  "🪙 Cripto": ["BTCUSD","ETHUSD","LTCUSD","XRPUSD","SOLUSD"],
  "🥇 Metais": ["XAUUSD","XAGUSD","XPTUSD"],
  "🛢️ Energia": ["USOIL","UKOIL","NATGAS"],
};

const TIMEFRAMES = ["2min", "5min", "15min", "60min", "Diário", "Semanal"];
const MEDIAS_OPCOES = ["9", "21", "50", "200"];
const IMPEDIMENTOS = ["Topo Anterior", "Fundo Anterior", "Média 9", "Média 21", "Média 50", "Média 200"];

const SENTIMENTOS = [
  { v: "confiante", label: "😎 Confiante", color: "#22c55e" },
  { v: "ansioso", label: "😰 Ansioso", color: "#f97316" },
  { v: "medo", label: "😨 Medo", color: "#ef4444" },
  { v: "neutro", label: "😐 Neutro", color: "#94a3b8" },
  { v: "eufórico", label: "🤩 Eufórico", color: "#a855f7" },
  { v: "frustrado", label: "😤 Frustrado", color: "#f43f5e" },
  { v: "paciente", label: "🧘 Paciente", color: "#06b6d4" },
  { v: "disciplinado", label: "🎯 Disciplinado", color: "#3b82f6" },
  { v: "vingativo", label: "😡 Vingativo", color: "#dc2626" },
];

const ERROS_OPERACAO = [
  { v: "entrei_cedo", label: "⏰ Entrei Cedo", color: "#f59e0b" },
  { v: "entrei_atrasado", label: "🐢 Entrei Atrasado", color: "#f97316" },
  { v: "fora_operacional", label: "🚫 Entrada Fora do Operacional", color: "#ef4444" },
  { v: "stop_curto", label: "📉 Stop Curto", color: "#ec4899" },
  { v: "stop_longo", label: "📈 Stop Longo", color: "#8b5cf6" },
];

const REGIOES = [
  { v: "suporte_forte", label: "🟦 Suporte Norte", color: "#3b82f6" },
  { v: "suporte", label: "🔵 Suporte", color: "#60a5fa" },
  { v: "resistencia_forte", label: "🟥 Resistência Norte", color: "#ef4444" },
  { v: "resistencia", label: "🔴 Resistência", color: "#f87171" },
  { v: "troca_polaridade", label: "🔄 Troca de Polaridade", color: "#a855f7" },
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

function hojeStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const EMPTY_FORM = {
  data: hojeStr(),
  ativo: "", mercadoMacro: "", direcao: "",
  resultadoPontos: "", resultadoReais: "",
  sentimento: "", descricao: "", 
  medias: [], // [{media: "9", timeframes: ["15min"]}]
  tipoEntrada: "", retracao: false, nivelRetracao: "", movimento: "",
  mercadoEsticado: null, pegouLiquidez: null, regiaoPreco: "", foto: null,
  errosOperacao: [],
  impedimentos: [], // [{impedimento: "Topo Anterior", timeframes: ["15min"]}]
};

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

function SimNao({ value, onChange, t }) {
  return (
    <div style={{display:"flex",gap:8}}>
      <button onClick={()=>onChange(true)} style={{
        padding:"9px 20px",borderRadius:999,cursor:"pointer",fontWeight:700,fontSize:13,
        border:`1.5px solid ${value===true?"#22c55e":t.border}`,
        background:value===true?"#22c55e22":"transparent",
        color:value===true?"#22c55e":t.muted,transition:"all .15s"
      }}>✅ Sim</button>
      <button onClick={()=>onChange(false)} style={{
        padding:"9px 20px",borderRadius:999,cursor:"pointer",fontWeight:700,fontSize:13,
        border:`1.5px solid ${value===false?"#ef4444":t.border}`,
        background:value===false?"#ef444422":"transparent",
        color:value===false?"#ef4444":t.muted,transition:"all .15s"
      }}>❌ Não</button>
    </div>
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
      <div style={{color:color||t.text,fontWeight:700,fontSize:16,wordBreak:"break-word"}}>{value}</div>
    </div>
  );
}

// Component for selecting media + timeframes
function MediaComTimeframe({ medias, onChange, t }) {
  const toggleMedia = (media) => {
    const exists = medias.find(m => m.media === media);
    if (exists) {
      onChange(medias.filter(m => m.media !== media));
    } else {
      onChange([...medias, { media, timeframes: [] }]);
    }
  };

  const toggleTimeframe = (media, tf) => {
    onChange(medias.map(m => {
      if (m.media !== media) return m;
      const tfs = m.timeframes.includes(tf)
        ? m.timeframes.filter(t => t !== tf)
        : [...m.timeframes, tf];
      return { ...m, timeframes: tfs };
    }));
  };

  return (
    <div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {MEDIAS_OPCOES.map(m => (
          <Pill key={m} label={`MM ${m}`}
            selected={!!medias.find(x => x.media === m)}
            onClick={() => toggleMedia(m)}
            color="#a78bfa" t={t}/>
        ))}
      </div>
      {medias.map(item => (
        <div key={item.media} style={{
          background:t.bg,border:`1px solid #a78bfa44`,borderRadius:8,
          padding:"10px 14px",marginBottom:8
        }}>
          <div style={{color:"#a78bfa",fontWeight:700,fontSize:12,marginBottom:8}}>
            MM {item.media} — Tempo Gráfico:
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {TIMEFRAMES.map(tf => (
              <Pill key={tf} label={tf}
                selected={item.timeframes.includes(tf)}
                onClick={() => toggleTimeframe(item.media, tf)}
                color="#06b6d4" t={t}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Component for impedimentos com timeframe
function ImpedimentosComTimeframe({ impedimentos, onChange, t }) {
  const toggleImpedimento = (imp) => {
    const exists = impedimentos.find(i => i.impedimento === imp);
    if (exists) {
      onChange(impedimentos.filter(i => i.impedimento !== imp));
    } else {
      onChange([...impedimentos, { impedimento: imp, timeframes: [] }]);
    }
  };

  const toggleTimeframe = (imp, tf) => {
    onChange(impedimentos.map(i => {
      if (i.impedimento !== imp) return i;
      const tfs = i.timeframes.includes(tf)
        ? i.timeframes.filter(t => t !== tf)
        : [...i.timeframes, tf];
      return { ...i, timeframes: tfs };
    }));
  };

  return (
    <div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {IMPEDIMENTOS.map(imp => (
          <Pill key={imp} label={imp}
            selected={!!impedimentos.find(x => x.impedimento === imp)}
            onClick={() => toggleImpedimento(imp)}
            color="#f97316" t={t}/>
        ))}
      </div>
      {impedimentos.map(item => (
        <div key={item.impedimento} style={{
          background:t.bg,border:`1px solid #f9741644`,borderRadius:8,
          padding:"10px 14px",marginBottom:8
        }}>
          <div style={{color:"#f97316",fontWeight:700,fontSize:12,marginBottom:8}}>
            {item.impedimento} — Tempo Gráfico:
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {TIMEFRAMES.map(tf => (
              <Pill key={tf} label={tf}
                selected={item.timeframes.includes(tf)}
                onClick={() => toggleTimeframe(item.impedimento, tf)}
                color="#f59e0b" t={t}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddOpForm({ initial, onSave, onClose, t }) {
  const [f, setF] = useState(() => {
    if (initial) {
      return {
        ...EMPTY_FORM,
        ...initial,
        medias: initial.medias
          ? (typeof initial.medias[0] === 'string'
              ? initial.medias.map(m => ({ media: m, timeframes: [] }))
              : initial.medias)
          : [],
        impedimentos: initial.impedimentos || [],
        errosOperacao: initial.errosOperacao || [],
      };
    }
    return { ...EMPTY_FORM };
  });

  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const toggleErro = (v) => setF(p => ({
    ...p,
    errosOperacao: p.errosOperacao.includes(v)
      ? p.errosOperacao.filter(x => x !== v)
      : [...p.errosOperacao, v]
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
            <div style={{background:t.border+"44",border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 16px",color:t.accent,fontWeight:700,fontSize:14}}>
              {getWeekday(f.data)}
            </div>
          )}
        </div>
      </Section>

      <Section icon="📊" title="Ativo" t={t}>
        <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,maxHeight:200,overflowY:"auto",padding:"6px 0"}}>
          {Object.entries(ATIVOS).map(([cat,ativos])=>(
            <div key={cat}>
              <div style={{padding:"5px 14px",fontSize:10,color:t.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",borderBottom:`1px solid ${t.border}`,marginBottom:2}}>{cat}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:"5px 12px 8px"}}>
                {ativos.map(a=>(<Pill key={a} label={a} selected={f.ativo===a} onClick={()=>set("ativo",a)} t={t}/>))}
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

      <Section icon="📏" title="Mercado Esticado?" t={t}>
        <SimNao value={f.mercadoEsticado} onChange={v=>set("mercadoEsticado",v)} t={t}/>
      </Section>

      <Section icon="💧" title="Mercado Pegou Liquidez Antes do Gatilho?" t={t}>
        <SimNao value={f.pegouLiquidez} onChange={v=>set("pegouLiquidez",v)} t={t}/>
      </Section>

      <Section icon="📍" title="Região do Preço" t={t}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {REGIOES.map(r=>(
            <Pill key={r.v} label={r.label} selected={f.regiaoPreco===r.v}
              onClick={()=>set("regiaoPreco", f.regiaoPreco===r.v?"":r.v)}
              color={r.color} t={t}/>
          ))}
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
          {SENTIMENTOS.map(s=>(<Pill key={s.v} label={s.label} selected={f.sentimento===s.v} onClick={()=>set("sentimento",s.v)} color={s.color} t={t}/>))}
        </div>
      </Section>

      {/* ERROS DA OPERAÇÃO */}
      <Section icon="⚠️" title="Erros da Operação" t={t}>
        <div style={{
          background:t.bg,border:`1px solid #ef444433`,borderRadius:10,padding:"12px 14px"
        }}>
          <div style={{color:"#f87171",fontSize:11,marginBottom:10,fontWeight:600}}>
            Selecione os erros cometidos nesta operação:
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {ERROS_OPERACAO.map(e => (
              <Pill key={e.v} label={e.label}
                selected={f.errosOperacao.includes(e.v)}
                onClick={() => toggleErro(e.v)}
                color={e.color} t={t}/>
            ))}
          </div>
        </div>
      </Section>

      <Section icon="✍️" title="Descrição da Entrada" t={t}>
        <textarea placeholder="Descreva sua análise, setup, motivo da entrada..."
          value={f.descricao} onChange={e=>set("descricao",e.target.value)} rows={3}
          style={{...inputStyle,width:"100%",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
      </Section>

      <Section icon="📉" title="Médias a Favor (com Tempo Gráfico)" t={t}>
        <MediaComTimeframe
          medias={f.medias}
          onChange={v => set("medias", v)}
          t={t}
        />
      </Section>

      {/* IMPEDIMENTOS */}
      <Section icon="🚧" title="Algum Impedimento que Deixou na Dúvida?" t={t}>
        <ImpedimentosComTimeframe
          impedimentos={f.impedimentos}
          onChange={v => set("impedimentos", v)}
          t={t}
        />
      </Section>

      <Section icon="🔢" title="Tipo de Entrada" t={t}>
        <div style={{display:"flex",gap:8}}>
          {["NV1","NV2","NV3"].map(tp=>(<Pill key={tp} label={tp} selected={f.tipoEntrada===tp} onClick={()=>set("tipoEntrada",tp)} color="#f59e0b" t={t}/>))}
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
              {["38.2","50","61.8","76.4"].map(n=>(<Pill key={n} label={`${n}%`} selected={f.nivelRetracao===n} onClick={()=>set("nivelRetracao",n)} color="#06b6d4" t={t}/>))}
            </div>
          </div>
        )}
      </Section>

      <Section icon="📐" title="Tipo de Movimento" t={t}>
        <div style={{display:"flex",gap:8}}>
          <Pill label="📈 Expansão" selected={f.movimento==="Expansão"} onClick={()=>set("movimento","Expansão")} color="#22c55e" t={t}/>
          <Pill label="🔄 Correção" selected={f.movimento==="Correção"} onClick={()=>set("movimento","Correção")} color="#f97316" t={t}/>
        </div>
      </Section>

      <Section icon="📸" title="Foto da Operação (opcional)" t={t}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <label style={{
            display:"flex",alignItems:"center",gap:10,
            background:t.bg,border:`2px dashed ${t.border}`,borderRadius:10,
            padding:"16px 20px",cursor:"pointer",color:t.muted,fontSize:14,
            transition:"border-color .2s"
          }}>
            <span style={{fontSize:24}}>📁</span>
            <span>{f.foto ? "✅ Foto carregada — clique para trocar" : "Clique para selecionar uma imagem"}</span>
            <input type="file" accept="image/*" style={{display:"none"}}
              onChange={e=>{
                const file = e.target.files[0];
                if(!file) return;
                const reader = new FileReader();
                reader.onload = ev => set("foto", ev.target.result);
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {f.foto && (
            <div style={{position:"relative",display:"inline-block"}}>
              <img src={f.foto} alt="operação" style={{
                maxWidth:"100%",maxHeight:280,borderRadius:10,
                border:`1px solid ${t.border}`,display:"block"
              }}/>
              <button onClick={()=>set("foto",null)} style={{
                position:"absolute",top:8,right:8,
                background:"#ef444488",border:"none",borderRadius:999,
                color:"#fff",width:28,height:28,cursor:"pointer",
                fontSize:14,fontWeight:700,lineHeight:"28px",textAlign:"center"
              }}>✕</button>
            </div>
          )}
        </div>
      </Section>

      <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:8}}>
        <button onClick={onClose} style={{padding:"11px 22px",borderRadius:8,border:`1px solid ${t.border}`,background:"transparent",color:t.muted,fontSize:14,cursor:"pointer"}}>Cancelar</button>
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

function OpCard({ op, onEdit, onDelete, t }) {
  const reais = parseFloat(op.resultadoReais)||0;
  const pts = parseFloat(op.resultadoPontos)||0;
  const pos = reais >= 0;
  const sent = SENTIMENTOS.find(s=>s.v===op.sentimento);
  const regiao = REGIOES.find(r=>r.v===op.regiaoPreco);
  const erros = (op.errosOperacao||[]).map(e => ERROS_OPERACAO.find(x=>x.v===e)).filter(Boolean);

  // normalize medias
  const mediasNorm = (op.medias||[]).map(m => typeof m === 'string' ? {media:m,timeframes:[]} : m);

  return (
    <div style={{
      background:t.card,border:`1px solid ${pos?"#166534":"#7f1d1d"}`,
      borderLeft:`4px solid ${pos?"#22c55e":"#ef4444"}`,
      borderRadius:12,padding:"14px 18px",marginBottom:10,
      boxShadow:"0 3px 10px rgba(0,0,0,0.2)"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{background:op.direcao==="Compra"?"#14532d":"#7f1d1d",color:op.direcao==="Compra"?"#4ade80":"#f87171",padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:700}}>{op.direcao==="Compra"?"▲ COMPRA":"▼ VENDA"}</span>
          <span style={{color:t.accent,fontWeight:700,fontSize:15}}>{op.ativo}</span>
          <span style={{color:t.muted,fontSize:12}}>{op.data} · <span style={{color:t.accent}}>{getWeekday(op.data)}</span></span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{textAlign:"right"}}>
            <div style={{color:pos?"#4ade80":"#f87171",fontWeight:700,fontSize:17}}>{pos?"+":""}{reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
            <div style={{color:t.muted,fontSize:11}}>{pts>=0?"+":""}{pts} pts</div>
          </div>
          <button onClick={()=>onEdit(op)} style={{background:t.border,border:"none",borderRadius:6,color:t.accent,padding:"5px 9px",cursor:"pointer",fontSize:12}}>✏️</button>
          <button onClick={()=>onDelete(op.id)} style={{background:"#3b0f0f",border:"none",borderRadius:6,color:"#f87171",padding:"5px 9px",cursor:"pointer",fontSize:12}}>🗑️</button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10,alignItems:"center"}}>
        {op.mercadoMacro && <Tag>{op.mercadoMacro==="Alta"?"📈":"📉"} {op.mercadoMacro}</Tag>}
        {op.mercadoEsticado===true && <Tag color="#f97316">📏 Esticado</Tag>}
        {op.mercadoEsticado===false && <Tag color="#22c55e">📏 Não Esticado</Tag>}
        {op.pegouLiquidez===true && <Tag color="#a855f7">💧 Pegou Liq.</Tag>}
        {op.pegouLiquidez===false && <Tag color="#64748b">💧 Sem Liq.</Tag>}
        {regiao && <Tag color={regiao.color}>{regiao.label}</Tag>}
        {op.tipoEntrada && <Tag color="#f59e0b">🔢 {op.tipoEntrada}</Tag>}
        {op.movimento && <Tag color="#a78bfa">📐 {op.movimento}</Tag>}
        {op.retracao && op.nivelRetracao && <Tag color="#06b6d4">↩️ Fib {op.nivelRetracao}%</Tag>}
        {mediasNorm.length>0 && mediasNorm.map(m=>(
          <Tag key={m.media} color="#8b5cf6">
            MM {m.media}{m.timeframes&&m.timeframes.length>0 ? ` (${m.timeframes.join(", ")})` : ""}
          </Tag>
        ))}
        {sent && <Tag color={sent.color}>{sent.label}</Tag>}
      </div>
      {erros.length > 0 && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
          {erros.map(e=>(
            <span key={e.v} style={{background:"#ef444418",border:"1px solid #ef444444",color:"#f87171",padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600}}>
              ⚠️ {e.label}
            </span>
          ))}
        </div>
      )}
      {(op.impedimentos||[]).length > 0 && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
          {op.impedimentos.map(imp=>(
            <span key={imp.impedimento} style={{background:"#f9741618",border:"1px solid #f9741644",color:"#fb923c",padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600}}>
              🚧 {imp.impedimento}{imp.timeframes&&imp.timeframes.length>0?` (${imp.timeframes.join(", ")})` :""}
            </span>
          ))}
        </div>
      )}
      {op.descricao && (
        <div style={{marginTop:8,color:t.muted,fontSize:12,lineHeight:1.6,borderTop:`1px solid ${t.border}`,paddingTop:8,fontStyle:"italic"}}>"{op.descricao}"</div>
      )}
      {op.foto && (
        <div style={{marginTop:10}}>
          <img src={op.foto} alt="operação" style={{maxWidth:"100%",maxHeight:200,borderRadius:8,border:`1px solid ${t.border}`,display:"block",cursor:"pointer"}} onClick={()=>window.open(op.foto,"_blank")}/>
          <div style={{color:t.muted,fontSize:10,marginTop:4}}>🔍 Clique para ampliar</div>
        </div>
      )}
    </div>
  );
}

function GraficoPatrimonio({ ops, t, filtro }) {
  const hoje = new Date();
  const {start:ws, end:we} = getWeekRange(hoje);
  const mesStr = hoje.toISOString().slice(0,7);

  const dadosFiltrados = useMemo(()=>{
    let arr = [...ops];
    if(filtro==="semana") arr = arr.filter(o=>o.data>=ws&&o.data<=we);
    if(filtro==="mes") arr = arr.filter(o=>o.data.startsWith(mesStr));
    arr.sort((a,b)=>a.data.localeCompare(b.data));
    let acc = 0;
    return arr.map((op,i)=>{
      acc += parseFloat(op.resultadoReais)||0;
      return { name:`Op ${i+1}`, data: op.data, saldo: Math.round(acc*100)/100, ativo: op.ativo };
    });
  },[ops, filtro]);

  if(dadosFiltrados.length === 0) return (
    <div style={{textAlign:"center",padding:"40px 0",color:t.muted,fontSize:14}}>
      📭 Nenhuma operação para exibir no gráfico
    </div>
  );

  const ultimo = dadosFiltrados[dadosFiltrados.length-1]?.saldo || 0;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <div style={{color:t.muted,fontSize:12}}>Patrimônio acumulado</div>
          <div style={{color:ultimo>=0?"#4ade80":"#f87171",fontWeight:800,fontSize:24}}>
            {ultimo>=0?"+":""}{ultimo.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
          </div>
        </div>
        <div style={{color:t.muted,fontSize:12,textAlign:"right"}}>
          <div>{dadosFiltrados.length} operações</div>
          <div style={{color:t.muted,fontSize:11}}>{filtro==="semana"?"Esta semana":filtro==="mes"?"Este mês":"Todo período"}</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={dadosFiltrados}>
          <CartesianGrid strokeDasharray="3 3" stroke={t.border}/>
          <XAxis dataKey="name" tick={{fill:t.muted,fontSize:10}} axisLine={{stroke:t.border}}/>
          <YAxis tick={{fill:t.muted,fontSize:10}} axisLine={{stroke:t.border}} tickFormatter={v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/>
          <Tooltip
            contentStyle={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,fontSize:12}}
            formatter={(v)=>[v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"Saldo"]}
            labelFormatter={(l,payload)=>payload&&payload[0]?`${payload[0].payload.data} · ${payload[0].payload.ativo}`:l}
          />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4"/>
          <Line type="monotone" dataKey="saldo" stroke={ultimo>=0?"#22c55e":"#ef4444"} strokeWidth={2.5}
            dot={{fill:ultimo>=0?"#22c55e":"#ef4444",r:3}} activeDot={{r:6}}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== RELATÓRIO SEMANAL COM IA =====
function RelatorioSemanalModal({ ops, t, onClose }) {
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState(null);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [modo, setModo] = useState("semana"); // "semana" | "custom"
  const [dataInicio, setDataInicio] = useState(() => {
    const { start } = getWeekRange(new Date());
    return start;
  });
  const [dataFim, setDataFim] = useState(() => {
    const { end } = getWeekRange(new Date());
    return end;
  });

  const semana = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + semanaOffset * 7);
    return getWeekRange(base);
  }, [semanaOffset]);

  const periodoAtivo = modo === "semana"
    ? { start: semana.start, end: semana.end }
    : { start: dataInicio, end: dataFim };

  const opsSemana = useMemo(() =>
    ops.filter(o => o.data >= periodoAtivo.start && o.data <= periodoAtivo.end),
    [ops, periodoAtivo.start, periodoAtivo.end]
  );

  const gerarRelatorio = async () => {
    if (opsSemana.length === 0) return;
    setLoading(true);
    setRelatorio(null);

    const resumo = opsSemana.map(op => ({
      data: op.data,
      diaSemana: getWeekday(op.data),
      ativo: op.ativo,
      direcao: op.direcao,
      resultado: parseFloat(op.resultadoReais) || 0,
      pontos: parseFloat(op.resultadoPontos) || 0,
      tipoEntrada: op.tipoEntrada || "Não informado",
      movimento: op.movimento || "Não informado",
      sentimento: op.sentimento || "Não informado",
      mercadoMacro: op.mercadoMacro || "Não informado",
      mercadoEsticado: op.mercadoEsticado,
      pegouLiquidez: op.pegouLiquidez,
      regiaoPreco: op.regiaoPreco || "Não informado",
      medias: (op.medias||[]).map(m => typeof m === 'string' ? `MM${m}` : `MM${m.media}(${(m.timeframes||[]).join(",")})`).join(", ") || "Nenhuma",
      errosOperacao: (op.errosOperacao||[]).map(e => ERROS_OPERACAO.find(x=>x.v===e)?.label||e).join(", ") || "Nenhum",
      impedimentos: (op.impedimentos||[]).map(i => `${i.impedimento}${i.timeframes&&i.timeframes.length?`(${i.timeframes.join(",")})`:""}`).join(", ") || "Nenhum",
      retracao: op.retracao ? `Sim - Fib ${op.nivelRetracao}%` : "Não",
      descricao: op.descricao || "",
    }));

    const totalSemana = opsSemana.reduce((s,o) => s+(parseFloat(o.resultadoReais)||0), 0);
    const wins = opsSemana.filter(o => (parseFloat(o.resultadoReais)||0) > 0).length;
    const pct = opsSemana.length > 0 ? Math.round(wins/opsSemana.length*100) : 0;

    const prompt = `Você é um especialista sênior em mercado financeiro, trader profissional com mais de 20 anos de experiência e coach de traders. Você vai analisar as operações do período de ${periodoAtivo.start} a ${periodoAtivo.end} e gerar um relatório COMPLETO, DIRETO E SEM FILTRO — como se estivesse sentando na frente do trader e falando a verdade nua e crua, mas com didática para que mesmo um leigo consiga entender tudo.

REGRAS DO RELATÓRIO:
- Escreva em português brasileiro simples, claro e direto
- Explique termos técnicos sempre que usá-los (ex: "stop — que é o limite de perda que você define antes de entrar")
- Seja honesto e sem papas na língua, mas construtivo
- Use dados reais das operações para embasar CADA afirmação
- Quando identificar um erro, explique O QUE aconteceu, POR QUE é um problema e COMO corrigir
- Seja específico: cite o ativo, o dia, o valor quando relevante
- Máximo de objetividade: o trader precisa saber exatamente o que fazer diferente

DADOS DO PERÍODO (${periodoAtivo.start} a ${periodoAtivo.end}):
- Total de operações: ${opsSemana.length}
- Resultado financeiro total: R$ ${totalSemana.toFixed(2)}
- Taxa de acerto: ${pct}% (${wins} ganhos, ${opsSemana.length - wins} perdas)

OPERAÇÕES DETALHADAS:
${JSON.stringify(resumo, null, 2)}

Gere o relatório completo com TODAS as seções abaixo. Não pule nenhuma. Seja extenso e detalhado:

## 📊 VISÃO GERAL DA SEMANA
Explique como foi a semana de forma simples: o trader ganhou ou perdeu? Qual foi o placar? O resultado reflete o nível de habilidade demonstrado nas operações? Dê um contexto geral em linguagem acessível — como se explicasse para alguém que nunca operou na vida.

## 🏆 O QUE VOCÊ FEZ BEM (Pontos Positivos)
Analise as operações vencedoras e identifique O QUE exatamente foi feito certo. Cite: tipo de entrada usado, condições de mercado favoráveis, sentimento adequado, respeito ao setup. Explique por que cada acerto foi um acerto — não apenas "deu certo", mas POR QUE a decisão foi tecnicamente correta. Se não houve acertos, diga isso claramente.

## ❌ O QUE TE FEZ PERDER DINHEIRO (Diagnóstico Honesto)
Esta é a seção mais importante. Para cada operação perdedora, ou padrão de perdas, explique:
1. O que aconteceu nessa operação (em linguagem simples)
2. Qual foi o erro técnico ou emocional cometido
3. Por que isso causa perda (a lógica por trás)
4. O que deveria ter sido feito no lugar
Seja cirúrgico. Se o trader entrou cedo, explique o que "entrar cedo" significa na prática e por que destrói o resultado. Se o stop estava curto, explique o que isso significa e por que é perigoso.

## 🔍 PADRÕES DE ERRO IDENTIFICADOS
Olhe para todas as operações e identifique padrões que se repetem. O trader comete os mesmos erros? Em quais dias da semana erra mais? Em qual ativo erra mais? Em qual sentimento emocional erra mais? Liste cada padrão encontrado com dados concretos. Explique cada padrão de forma simples.

## 🧠 ANÁLISE EMOCIONAL E PSICOLÓGICA
Baseado nos sentimentos registrados em cada operação, faça uma leitura psicológica do trader nesta semana. Houve operações com sentimento "vingativo", "ansioso" ou "eufórico"? Explique o que cada um desses estados emocionais faz com a tomada de decisão de um trader — e como isso se refletiu nos resultados. Seja direto: emoção e dinheiro não combinam, e o trader precisa entender isso.

## 🛠️ COMO CORRIGIR SEUS ERROS (Plano de Ação)
Para cada erro identificado, dê uma solução prática e específica. Não basta dizer "melhore a disciplina" — diga COMO. Exemplo: "Antes de entrar, espere a confirmação do candle fechar acima da MM9 no gráfico de 15 minutos." Dê pelo menos 5 ações concretas com instruções claras de como executar.

## 📅 ANÁLISE POR DIA E POR ATIVO
Quais dias da semana foram lucrativos e quais foram destrutivos? Há algum dia que o trader consistentemente perde? Qual ativo gerou mais resultado positivo e qual gerou mais prejuízo? O trader deveria considerar não operar em algum dia ou ativo específico com base nos dados?

## 💡 REFLEXÕES FINAIS (A Verdade Sem Filtro)
Escreva aqui como um mentor experiente falaria para o trader olho no olho. Sem suavizar. Qual é o maior risco que esse trader corre se continuar como está? Qual é o maior potencial que ele tem se corrigir os erros identificados? O que separa um trader amador de um profissional — e em qual lado desta linha o trader está agora? Termine com uma reflexão motivadora, mas realista.

## 🎯 OS 3 FOCOS DA PRÓXIMA SEMANA
Escolha as 3 coisas mais importantes que o trader deve focar NA PRÓXIMA SEMANA. Apenas 3 — as mais críticas. Para cada uma, escreva: o que é, por que é prioritário, e como implementar na prática.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      const text = data.content?.map(i => i.text || "").join("\n") || "Erro ao gerar relatório.";
      setRelatorio(text);
    } catch (e) {
      setRelatorio("❌ Erro ao conectar com a IA. Verifique sua conexão e tente novamente.");
    }
    setLoading(false);
  };

  const totalSemana = opsSemana.reduce((s,o) => s+(parseFloat(o.resultadoReais)||0), 0);
  const wins = opsSemana.filter(o => (parseFloat(o.resultadoReais)||0) > 0).length;

  // Markdown renderer aprimorado para relatório detalhado
  const renderMarkdown = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('## ')) {
        return (
          <div key={i} style={{
            color:"#fff", fontWeight:800, fontSize:15, marginTop:28, marginBottom:10,
            borderBottom:`2px solid ${t.accent}`, paddingBottom:8,
            display:"flex", alignItems:"center", gap:8,
            background:`linear-gradient(90deg,${t.accent}18,transparent)`,
            padding:"10px 12px", borderRadius:"8px 8px 0 0"
          }}>{line.replace('## ','')}</div>
        );
      }
      if (line.startsWith('### ')) {
        return <div key={i} style={{color:"#a78bfa",fontWeight:700,fontSize:13,marginTop:14,marginBottom:6,paddingLeft:4}}>{line.replace('### ','')}</div>;
      }
      if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\.\s(.*)/);
        if (num) return (
          <div key={i} style={{display:"flex",gap:10,marginBottom:6,paddingLeft:4}}>
            <span style={{color:t.accent,fontWeight:800,fontSize:13,minWidth:20}}>{num[1]}.</span>
            <span style={{color:t.text,fontSize:13,lineHeight:1.7}}>{num[2]}</span>
          </div>
        );
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <div key={i} style={{display:"flex",gap:8,marginBottom:5,paddingLeft:8}}>
            <span style={{color:t.accent,fontSize:13,marginTop:2}}>▸</span>
            <span style={{color:t.text,fontSize:13,lineHeight:1.7}}>{line.replace(/^[-•] /,'')}</span>
          </div>
        );
      }
      if (line.trim() === '') return <div key={i} style={{height:8}}/>;
      // Bold text **...**
      const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
      if (boldParts.length > 1) {
        return (
          <div key={i} style={{color:t.text,fontSize:13,lineHeight:1.8,marginBottom:4}}>
            {boldParts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j} style={{color:"#f0f9ff",fontWeight:700}}>{part.slice(2,-2)}</strong>
                : part
            )}
          </div>
        );
      }
      return <div key={i} style={{color:t.text,fontSize:13,lineHeight:1.8,marginBottom:4}}>{line}</div>;
    });
  };

  return (
    <Modal title="📋 Relatório & Análise com IA" onClose={onClose} t={t}>
      <div>
        {/* Tabs modo */}
        <div style={{display:"flex",gap:4,marginBottom:16,background:t.bg,borderRadius:10,padding:4,border:`1px solid ${t.border}`}}>
          {[["semana","📅 Por Semana"],["custom","📆 Período Personalizado"]].map(([v,l])=>(
            <button key={v} onClick={()=>{setModo(v);setRelatorio(null);}} style={{
              flex:1,padding:"9px 0",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,
              background:modo===v?"linear-gradient(135deg,#3b82f6,#1d4ed8)":"transparent",
              color:modo===v?"#fff":t.muted,transition:"all .15s"
            }}>{l}</button>
          ))}
        </div>

        {/* Seletor de semana */}
        {modo === "semana" && (
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,padding:"12px 16px"}}>
            <button onClick={()=>{setSemanaOffset(o=>o-1);setRelatorio(null);}} style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"8px 14px",cursor:"pointer",fontSize:16,fontWeight:700}}>◀</button>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{color:t.accent,fontWeight:700,fontSize:14}}>
                {semana.start} → {semana.end}
              </div>
              <div style={{color:t.muted,fontSize:12,marginTop:2}}>
                {opsSemana.length} operações
                {opsSemana.length > 0 ? ` · ${Math.round(opsSemana.filter(o=>(parseFloat(o.resultadoReais)||0)>0).length/opsSemana.length*100)}% acerto` : " · sem dados"}
              </div>
            </div>
            <button onClick={()=>{setSemanaOffset(o=>o+1);setRelatorio(null);}} disabled={semanaOffset >= 0} style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:semanaOffset>=0?t.muted:t.text,padding:"8px 14px",cursor:semanaOffset>=0?"not-allowed":"pointer",fontSize:16,fontWeight:700}}>▶</button>
          </div>
        )}

        {/* Seletor de período personalizado */}
        {modo === "custom" && (
          <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,padding:"16px",marginBottom:16}}>
            <div style={{color:t.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:12}}>SELECIONE O PERÍODO</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div style={{flex:1,minWidth:140}}>
                <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6}}>📅 Data Início</label>
                <input
                  type="date" value={dataInicio}
                  onChange={e=>{setDataInicio(e.target.value);setRelatorio(null);}}
                  style={{width:"100%",background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"10px 12px",fontSize:14,outline:"none",boxSizing:"border-box"}}
                />
              </div>
              <div style={{flex:1,minWidth:140}}>
                <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6}}>📅 Data Fim</label>
                <input
                  type="date" value={dataFim}
                  onChange={e=>{setDataFim(e.target.value);setRelatorio(null);}}
                  min={dataInicio}
                  style={{width:"100%",background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"10px 12px",fontSize:14,outline:"none",boxSizing:"border-box"}}
                />
              </div>
              {/* Atalhos rápidos */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[
                  ["Este Mês", ()=>{ const h=new Date(); const m=h.toISOString().slice(0,7); setDataInicio(`${m}-01`); const last=new Date(h.getFullYear(),h.getMonth()+1,0); setDataFim(last.toISOString().slice(0,10)); setRelatorio(null); }],
                  ["Mês Passado", ()=>{ const h=new Date(); const m=new Date(h.getFullYear(),h.getMonth()-1,1); const mf=new Date(h.getFullYear(),h.getMonth(),0); setDataInicio(m.toISOString().slice(0,10)); setDataFim(mf.toISOString().slice(0,10)); setRelatorio(null); }],
                  ["Últimos 30d", ()=>{ const h=new Date(); const i=new Date(h); i.setDate(h.getDate()-30); setDataInicio(i.toISOString().slice(0,10)); setDataFim(h.toISOString().slice(0,10)); setRelatorio(null); }],
                  ["Todo Período", ()=>{ const datas=ops.map(o=>o.data).sort(); if(datas.length){ setDataInicio(datas[0]); setDataFim(datas[datas.length-1]); } setRelatorio(null); }],
                ].map(([label, fn])=>(
                  <button key={label} onClick={fn} style={{
                    padding:"7px 12px",borderRadius:8,border:`1px solid ${t.border}`,
                    background:t.card,color:t.accent,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"
                  }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{marginTop:10,color:t.muted,fontSize:12}}>
              <span style={{color:t.accent,fontWeight:700}}>{opsSemana.length} operações</span> encontradas neste período
              {opsSemana.length > 0 && (
                <span style={{marginLeft:8}}>
                  · <span style={{color:opsSemana.filter(o=>(parseFloat(o.resultadoReais)||0)>0).length/opsSemana.length>=0.5?"#4ade80":"#f87171",fontWeight:700}}>
                    {Math.round(opsSemana.filter(o=>(parseFloat(o.resultadoReais)||0)>0).length/opsSemana.length*100)}% acerto
                  </span>
                  · <span style={{color:totalSemana>=0?"#4ade80":"#f87171",fontWeight:700}}>
                    {totalSemana>=0?"+":""}{totalSemana.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                  </span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats rápidos */}
        {opsSemana.length > 0 && (
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:80,background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
              <div style={{color:t.muted,fontSize:10}}>Operações</div>
              <div style={{color:t.text,fontWeight:700,fontSize:20}}>{opsSemana.length}</div>
            </div>
            <div style={{flex:1,minWidth:80,background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
              <div style={{color:t.muted,fontSize:10}}>Acerto</div>
              <div style={{color:wins/opsSemana.length>=0.5?"#4ade80":"#f87171",fontWeight:700,fontSize:20}}>{Math.round(wins/opsSemana.length*100)}%</div>
            </div>
            <div style={{flex:1,minWidth:80,background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
              <div style={{color:t.muted,fontSize:10}}>Ganhos</div>
              <div style={{color:"#4ade80",fontWeight:700,fontSize:20}}>{wins}</div>
            </div>
            <div style={{flex:1,minWidth:80,background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
              <div style={{color:t.muted,fontSize:10}}>Perdas</div>
              <div style={{color:"#f87171",fontWeight:700,fontSize:20}}>{opsSemana.length-wins}</div>
            </div>
            <div style={{flex:2,minWidth:130,background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
              <div style={{color:t.muted,fontSize:10}}>Resultado</div>
              <div style={{color:totalSemana>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:20}}>{totalSemana>=0?"+":""}{totalSemana.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
            </div>
          </div>
        )}

        {opsSemana.length === 0 ? (
          <div style={{textAlign:"center",padding:"40px 0",color:t.muted}}>
            <div style={{fontSize:40,marginBottom:12}}>📭</div>
            <div>Nenhuma operação nesta semana.</div>
            <div style={{fontSize:12,marginTop:4}}>Navegue para uma semana com operações.</div>
          </div>
        ) : (
          <>
            <button
              onClick={gerarRelatorio}
              disabled={loading}
              style={{
                width:"100%",padding:"14px",borderRadius:10,border:"none",
                background:loading?"#1e3a5f":"linear-gradient(135deg,#7c3aed,#4f46e5)",
                color:"#fff",fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer",
                boxShadow:loading?"none":"0 4px 20px rgba(124,58,237,0.4)",
                marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:10
              }}
            >
              {loading ? (
                <>
                  <span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⏳</span>
                  Gerando análise com IA...
                </>
              ) : (
                <>🤖 Gerar Relatório & Análise com IA</>
              )}
            </button>

            {relatorio && (
              <div style={{
                background:t.bg,border:`1px solid ${t.border}`,borderRadius:12,
                padding:"20px",maxHeight:500,overflowY:"auto"
              }}>
                {renderMarkdown(relatorio)}
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}

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
    "WDO": op=>op.ativo==="WDOFUT",
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
  const ptsPorAtivoAnalytics = (lista) => {
    const acc = {};
    lista.forEach(o => { const a = o.ativo||"?"; acc[a]=(acc[a]||0)+(parseFloat(o.resultadoPontos)||0); });
    const entries = Object.entries(acc).filter(([,v])=>v!==0);
    if(entries.length===0) return { texto:"0 pts", valor:0 };
    if(entries.length===1) { const v=entries[0][1]; return { texto:`${v>=0?"+":""}${v} pts`, valor:v }; }
    return { texto: entries.map(([a,v])=>`${a}: ${v>=0?"+":""}${v}`).join(" | "), valor:null };
  };
  const totalPtsInfo = ptsPorAtivoAnalytics(filtered);
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
      if(!acc[d]) acc[d]={day:d,reais:0,pts:0,count:0,wins:0};
      acc[d].reais+=parseFloat(op.resultadoReais)||0;
      acc[d].pts+=parseFloat(op.resultadoPontos)||0;
      acc[d].count++;
      if((parseFloat(op.resultadoReais)||0)>0) acc[d].wins++;
    });
    return Object.values(acc).sort((a,b)=>b.reais-a.reais);
  },[filtered]);

  const byTipo = useMemo(()=>{
    const acc = {};
    filtered.forEach(op=>{
      if(!op.tipoEntrada) return;
      if(!acc[op.tipoEntrada]) acc[op.tipoEntrada]={tipo:op.tipoEntrada,reais:0,pts:0,count:0,wins:0};
      acc[op.tipoEntrada].reais+=parseFloat(op.resultadoReais)||0;
      acc[op.tipoEntrada].pts+=parseFloat(op.resultadoPontos)||0;
      acc[op.tipoEntrada].count++;
      if((parseFloat(op.resultadoReais)||0)>0) acc[op.tipoEntrada].wins++;
    });
    return Object.values(acc).sort((a,b)=>b.reais-a.reais);
  },[filtered]);

  const byAtivo = useMemo(()=>{
    const acc = {};
    filtered.forEach(op=>{
      if(!acc[op.ativo]) acc[op.ativo]={ativo:op.ativo,reais:0,pts:0,count:0};
      acc[op.ativo].reais+=parseFloat(op.resultadoReais)||0;
      acc[op.ativo].pts+=parseFloat(op.resultadoPontos)||0;
      acc[op.ativo].count++;
    });
    return Object.values(acc).sort((a,b)=>b.reais-a.reais).slice(0,8);
  },[filtered]);

  // Análise de erros
  const byErro = useMemo(()=>{
    const acc = {};
    filtered.forEach(op=>{
      (op.errosOperacao||[]).forEach(e=>{
        if(!acc[e]) acc[e]={v:e,count:0,reais:0};
        acc[e].count++;
        acc[e].reais+=parseFloat(op.resultadoReais)||0;
      });
    });
    return Object.values(acc).sort((a,b)=>b.count-a.count);
  },[filtered]);

  const chartData = useMemo(()=>{
    const sorted = [...filtered].sort((a,b)=>a.data.localeCompare(b.data));
    let acc = 0;
    return sorted.map((op,i)=>{
      acc += parseFloat(op.resultadoReais)||0;
      return { name:`Op ${i+1}`, saldo:Math.round(acc*100)/100 };
    });
  },[filtered]);

  const maxAbs = Math.max(...byDay.map(d=>Math.abs(d.reais)),1);
  const selectStyle = {background:t.input,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"8px 12px",fontSize:13,outline:"none"};

  return (
    <div>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:16,marginBottom:20}}>
        <div style={{color:t.muted,fontSize:11,fontWeight:700,marginBottom:12,letterSpacing:1}}>🔍 FILTROS AVANÇADOS</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
          <div><div style={{color:t.muted,fontSize:11,marginBottom:4}}>Grupo</div>
            <select value={fg} onChange={e=>setFg(e.target.value)} style={selectStyle}>{Object.keys(GRUPOS).map(g=><option key={g}>{g}</option>)}</select></div>
          <div><div style={{color:t.muted,fontSize:11,marginBottom:4}}>Dia da Semana</div>
            <select value={fDia} onChange={e=>setFDia(e.target.value)} style={selectStyle}>{["Todos","Segunda","Terça","Quarta","Quinta","Sexta"].map(d=><option key={d}>{d}</option>)}</select></div>
          <div><div style={{color:t.muted,fontSize:11,marginBottom:4}}>Tipo Entrada</div>
            <select value={fTipo} onChange={e=>setFTipo(e.target.value)} style={selectStyle}>{["Todos","NV1","NV2","NV3"].map(tp=><option key={tp}>{tp}</option>)}</select></div>
          <div><div style={{color:t.muted,fontSize:11,marginBottom:4}}>Ativo</div>
            <select value={fAtivo} onChange={e=>setFAtivo(e.target.value)} style={selectStyle}>{ativosUnicos.map(a=><option key={a}>{a}</option>)}</select></div>
          <div><div style={{color:t.muted,fontSize:11,marginBottom:4}}>Mês</div>
            <select value={fMes} onChange={e=>setFMes(e.target.value)} style={selectStyle}>{meses.map(m=><option key={m}>{m}</option>)}</select></div>
          <div><div style={{color:t.muted,fontSize:11,marginBottom:4}}>Movimento</div>
            <select value={fMov} onChange={e=>setFMov(e.target.value)} style={selectStyle}>{["Todos","Expansão","Correção"].map(m=><option key={m}>{m}</option>)}</select></div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <button onClick={()=>{setFg("Todos");setFDia("Todos");setFTipo("Todos");setFAtivo("Todos");setFMes("Todos");setFMov("Todos");}} style={{background:"#7f1d1d33",border:"1px solid #991b1b",borderRadius:8,color:"#f87171",padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>✕ Limpar</button>
          </div>
        </div>
      </div>

      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
        <StatCard icon="📊" label="Operações" value={filtered.length} t={t}/>
        <StatCard icon="✅" label="Taxa Acerto" value={`${pct}%`} color={pct>=50?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="💰" label="Total R$" value={totalReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} color={totalReais>=0?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="🎯" label="Total Pontos" value={totalPtsInfo.texto} color={totalPtsInfo.valor!=null?(totalPtsInfo.valor>=0?"#4ade80":"#f87171"):"#a78bfa"} t={t}/>
        <StatCard icon="📅" label="Esta Semana" value={semanaReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} color={semanaReais>=0?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="🗓️" label="Este Mês" value={mesReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} color={mesReais>=0?"#4ade80":"#f87171"} t={t}/>
      </div>

      {chartData.length > 0 && (
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:20,marginBottom:16}}>
          <h3 style={{color:t.accent,fontSize:14,fontWeight:700,margin:"0 0 16px"}}>📈 Evolução do Saldo (filtrado)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border}/>
              <XAxis dataKey="name" tick={{fill:t.muted,fontSize:11}} axisLine={{stroke:t.border}}/>
              <YAxis tick={{fill:t.muted,fontSize:11}} axisLine={{stroke:t.border}} tickFormatter={v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/>
              <Tooltip contentStyle={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text}} formatter={v=>[v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"Saldo"]}/>
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4"/>
              <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} dot={{fill:"#3b82f6",r:3}} activeDot={{r:5}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:18}}>
          <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>📅 Por Dia da Semana</h3>
          {byDay.length===0 && <div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
          {byDay.map((d,i)=>(
            <div key={d.day} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{color:t.text,fontSize:13,fontWeight:i===0?700:400}}>{i===0?"🏆 ":""}{d.day}</span>
                <span style={{color:d.reais>=0?"#4ade80":"#f87171",fontSize:12,fontWeight:700}}>
                  {d.reais>=0?"+":""}{d.reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                  <span style={{color:"#a78bfa",marginLeft:6,fontSize:10}}>{d.pts>=0?"+":""}{d.pts}pts</span>
                  <span style={{color:t.muted,fontWeight:400,marginLeft:6,fontSize:10}}>{d.count>0?Math.round(d.wins/d.count*100):0}%</span>
                </span>
              </div>
              <div style={{background:t.bg,borderRadius:4,height:6,overflow:"hidden"}}>
                <div style={{width:`${Math.abs(d.reais)/maxAbs*100}%`,height:"100%",background:d.reais>=0?"#22c55e":"#ef4444",borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>

        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:18}}>
          <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>🔢 Por Tipo de Entrada</h3>
          {byTipo.length===0 && <div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
          {byTipo.map(tp=>(
            <div key={tp.tipo} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#f59e0b",fontWeight:700,fontSize:15}}>{tp.tipo}</span>
                <div style={{textAlign:"right"}}>
                  <div style={{color:tp.reais>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:14}}>{tp.reais>=0?"+":""}{tp.reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                  <div style={{color:"#a78bfa",fontSize:11}}>{tp.pts>=0?"+":""}{tp.pts} pts</div>
                </div>
              </div>
              <div style={{color:t.muted,fontSize:11,marginTop:3}}>{tp.wins}/{tp.count} ops · {tp.count?Math.round(tp.wins/tp.count*100):0}% acerto</div>
            </div>
          ))}
        </div>
      </div>

      {/* Análise de Erros */}
      {byErro.length > 0 && (
        <div style={{background:t.card,border:`1px solid #ef444433`,borderRadius:12,padding:18,marginBottom:14}}>
          <h3 style={{color:"#f87171",fontSize:13,fontWeight:700,margin:"0 0 14px"}}>⚠️ Erros Mais Frequentes</h3>
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            {byErro.map(e => {
              const err = ERROS_OPERACAO.find(x=>x.v===e.v);
              return (
                <div key={e.v} style={{background:"#ef444410",border:"1px solid #ef444433",borderRadius:10,padding:"10px 14px",minWidth:130,textAlign:"center"}}>
                  <div style={{color:"#f87171",fontWeight:700,fontSize:12}}>{err?.label||e.v}</div>
                  <div style={{color:t.text,fontWeight:800,fontSize:22,margin:"4px 0"}}>{e.count}x</div>
                  <div style={{color:e.reais>=0?"#4ade80":"#f87171",fontSize:11}}>{e.reais>=0?"+":""}{e.reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:18}}>
        <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>📊 Por Ativo</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {byAtivo.map(a=>(
            <div key={a.ativo} style={{background:(a.reais>=0?"#14532d":"#7f1d1d")+"33",border:`1px solid ${a.reais>=0?"#166534":"#991b1b"}`,borderRadius:10,padding:"10px 14px",minWidth:110,textAlign:"center"}}>
              <div style={{color:t.accent,fontWeight:700,fontSize:13}}>{a.ativo}</div>
              <div style={{color:a.reais>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:15,margin:"3px 0"}}>{a.reais>=0?"+":""}{a.reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
              <div style={{color:"#a78bfa",fontSize:11,marginBottom:2}}>{a.pts>=0?"+":""}{a.pts} pts</div>
              <div style={{color:t.muted,fontSize:11}}>{a.count} ops</div>
            </div>
          ))}
          {byAtivo.length===0 && <div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
        </div>
      </div>
    </div>
  );
}

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
  const ptsPorAtivoFiltrado = (lista) => {
    const acc = {};
    lista.forEach(o => { const a = o.ativo||"?"; acc[a]=(acc[a]||0)+(parseFloat(o.resultadoPontos)||0); });
    const entries = Object.entries(acc).filter(([,v])=>v!==0);
    if(entries.length===0) return "0 pts";
    if(entries.length===1) { const v=entries[0][1]; return `${v>=0?"+":""}${v} pts`; }
    return entries.map(([a,v])=>`${a}: ${v>=0?"+":""}${v}`).join(" | ");
  };
  const totalPtsTextoFiltrado = ptsPorAtivoFiltrado(filtered);
  const selectStyle = {background:t.input,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"7px 11px",fontSize:13,outline:"none"};

  return (
    <div>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:14,marginBottom:16}}>
        <div style={{color:t.muted,fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1}}>🔍 FILTROS</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"flex-end"}}>
          <select value={fAtivo} onChange={e=>setFAtivo(e.target.value)} style={selectStyle}>
            <option value="">Todos ativos</option>{ativosUnicos.map(a=><option key={a}>{a}</option>)}
          </select>
          <select value={fDir} onChange={e=>setFDir(e.target.value)} style={selectStyle}>
            <option value="">Compra e Venda</option><option>Compra</option><option>Venda</option>
          </select>
          <select value={fDia} onChange={e=>setFDia(e.target.value)} style={selectStyle}>
            <option value="">Todos os dias</option>{["Segunda","Terça","Quarta","Quinta","Sexta"].map(d=><option key={d}>{d}</option>)}
          </select>
          <select value={fTipo} onChange={e=>setFTipo(e.target.value)} style={selectStyle}>
            <option value="">Todos os tipos</option><option>NV1</option><option>NV2</option><option>NV3</option>
          </select>
          <select value={fMov} onChange={e=>setFMov(e.target.value)} style={selectStyle}>
            <option value="">Expansão e Correção</option><option>Expansão</option><option>Correção</option>
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
      <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:14,padding:"9px 14px",background:t.card,borderRadius:8,border:`1px solid ${t.border}`}}>
        <span style={{color:t.muted,fontSize:13}}>{filtered.length} operações</span>
        <span style={{color:t.border}}>·</span>
        <span style={{color:totalFiltrado>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:14}}>
          {totalFiltrado>=0?"+":""}{totalFiltrado.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
        </span>
        <span style={{color:t.border}}>·</span>
        <span style={{color:"#a78bfa",fontWeight:700,fontSize:14}}>
          {totalPtsTextoFiltrado}
        </span>
      </div>
      {filtered.length===0 && <div style={{textAlign:"center",padding:60,color:t.muted,fontSize:15}}>Nenhuma operação encontrada 📭</div>}
      {filtered.map(op=><OpCard key={op.id} op={op} onEdit={onEdit} onDelete={onDelete} t={t}/>)}
    </div>
  );
}

function MetaModal({ meta, onSave, onClose, t }) {
  const [form, setForm] = useState(meta);
  const inputStyle = {background:t.input,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"10px 14px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};
  return (
    <Modal title="🎯 Definir Metas" onClose={onClose} t={t}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div><label style={{color:t.muted,fontSize:13,display:"block",marginBottom:6}}>Meta Diária (R$)</label>
          <input type="number" value={form.diaria} placeholder="ex: 500" onChange={e=>setForm(p=>({...p,diaria:e.target.value}))} style={inputStyle}/></div>
        <div><label style={{color:t.muted,fontSize:13,display:"block",marginBottom:6}}>Meta Semanal (R$)</label>
          <input type="number" value={form.semanal} placeholder="ex: 2000" onChange={e=>setForm(p=>({...p,semanal:e.target.value}))} style={inputStyle}/></div>
        <div><label style={{color:t.muted,fontSize:13,display:"block",marginBottom:6}}>Meta Mensal (R$)</label>
          <input type="number" value={form.mensal} placeholder="ex: 8000" onChange={e=>setForm(p=>({...p,mensal:e.target.value}))} style={inputStyle}/></div>
        <button onClick={()=>onSave(form)} style={{padding:"12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>💾 Salvar Metas</button>
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
          <span style={{color:pos?"#4ade80":"#f87171",fontWeight:700}}>{pos?"+":""}{value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>
          <span style={{color:t.muted}}> / {parseFloat(meta||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>
        </span>
      </div>
      <div style={{background:t.bg,borderRadius:999,height:8,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:pct>=100?"#22c55e":color||"#3b82f6",borderRadius:999,transition:"width .5s"}}/>
      </div>
      <div style={{color:pct>=100?"#4ade80":t.muted,fontSize:11,marginTop:2,textAlign:"right"}}>{pct>=100?"✅ Meta atingida!":pct+"%"}</div>
    </div>
  );
}

function HomeTab({ ops, t }) {
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [customInicio, setCustomInicio] = useState(hojeStr);
  const [customFim, setCustomFim] = useState(hojeStr);

  const hoje = new Date();
  const {start:ws,end:we} = getWeekRange(hoje);
  const mesStr = hoje.toISOString().slice(0,7);
  const hj = hojeStr();

  // Pontos agrupados por ativo — não soma pontos de ativos diferentes
  const ptsPorAtivo = (lista) => {
    const acc = {};
    lista.forEach(o => { const a = o.ativo||"?"; acc[a]=(acc[a]||0)+(parseFloat(o.resultadoPontos)||0); });
    const entries = Object.entries(acc).filter(([,v])=>v!==0);
    if(entries.length===0) return "0 pts";
    if(entries.length===1) { const v=entries[0][1]; return `${v>=0?"+":""}${v} pts`; }
    return entries.map(([a,v])=>`${a}: ${v>=0?"+":""}${v}`).join(" | ");
  };

  // Agrupa reais E pontos por ativo para um período
  const resumoPorAtivo = (lista) => {
    const acc = {};
    lista.forEach(o => {
      const a = o.ativo || "?";
      if (!acc[a]) acc[a] = { reais: 0, pts: 0 };
      acc[a].reais += parseFloat(o.resultadoReais) || 0;
      acc[a].pts   += parseFloat(o.resultadoPontos) || 0;
    });
    return Object.entries(acc);
  };

  // Filtra ops pelo período selecionado no gráfico/stats customizados
  const opsFiltradas = useMemo(() => {
    if (filtroPeriodo === "semana") return ops.filter(o => o.data >= ws && o.data <= we);
    if (filtroPeriodo === "mes") return ops.filter(o => o.data.startsWith(mesStr));
    if (filtroPeriodo === "custom") return ops.filter(o => o.data >= customInicio && o.data <= customFim);
    return ops;
  }, [ops, filtroPeriodo, ws, we, mesStr, customInicio, customFim]);

  const diariaAtivos  = resumoPorAtivo(ops.filter(o => o.data === hj));
  const semanaAtivos  = resumoPorAtivo(ops.filter(o => o.data >= ws && o.data <= we));
  const totalReais    = ops.reduce((s,o) => s + (parseFloat(o.resultadoReais)||0), 0);
  const mesReais      = ops.filter(o => o.data.startsWith(mesStr)).reduce((s,o) => s + (parseFloat(o.resultadoReais)||0), 0);
  const totalPtsTexto = ptsPorAtivo(ops);
  const wins = ops.filter(o=>(parseFloat(o.resultadoReais)||0)>0).length;
  const pct = ops.length>0?Math.round(wins/ops.length*100):0;

  // Stats do período filtrado (para exibir abaixo do gráfico)
  const customReais  = opsFiltradas.reduce((s,o) => s+(parseFloat(o.resultadoReais)||0), 0);
  const customWins   = opsFiltradas.filter(o=>(parseFloat(o.resultadoReais)||0)>0).length;
  const customPct    = opsFiltradas.length>0?Math.round(customWins/opsFiltradas.length*100):0;
  const customAtivos = resumoPorAtivo(opsFiltradas);

  // Renderiza linhas por ativo dentro do card
  const renderAtivoLinhas = (entries) => {
    if (entries.length === 0) return (
      <div style={{color:"#475569",fontSize:12}}>Sem operações</div>
    );
    return entries.map(([ativo, {reais, pts}]) => (
      <div key={ativo} style={{marginTop:4}}>
        <span style={{color:"#94a3b8",fontSize:11,fontWeight:600}}>{ativo} </span>
        <span style={{color:reais>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:13}}>
          {reais>=0?"+":""}{reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
        </span>
        <span style={{color:"#a78bfa",fontSize:11,marginLeft:5}}>
          {pts>=0?"+":""}{pts} pts
        </span>
      </div>
    ));
  };

  const inputStyle = {
    background:t.input, border:`1px solid ${t.border}`, borderRadius:8,
    color:t.text, padding:"7px 10px", fontSize:13, outline:"none"
  };

  return (
    <div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:"14px 18px",flex:1,minWidth:150}}>
          <div style={{fontSize:20,marginBottom:3}}>📅</div>
          <div style={{color:t.muted,fontSize:11,marginBottom:6}}>Hoje</div>
          {renderAtivoLinhas(diariaAtivos)}
        </div>
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:"14px 18px",flex:1,minWidth:150}}>
          <div style={{fontSize:20,marginBottom:3}}>📆</div>
          <div style={{color:t.muted,fontSize:11,marginBottom:6}}>Esta Semana</div>
          {renderAtivoLinhas(semanaAtivos)}
        </div>
        <StatCard icon="🗓️" label="Este Mês" value={mesReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} color={mesReais>=0?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="💰" label="Total Geral" value={totalReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} color={totalReais>=0?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="✅" label="Taxa de Acerto" value={`${pct}%`} color={pct>=50?"#4ade80":"#f87171"} t={t}/>
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:"14px 18px",flex:1,minWidth:130}}>
          <div style={{fontSize:20,marginBottom:3}}>📊</div>
          <div style={{color:t.muted,fontSize:11,marginBottom:3}}>Total de Ops</div>
          <div style={{color:t.text,fontWeight:700,fontSize:16}}>{ops.length} ops</div>
          <div style={{color:"#a78bfa",fontSize:12,marginTop:2}}>{totalPtsTexto}</div>
        </div>
      </div>

      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:20,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <h3 style={{color:t.accent,fontSize:15,fontWeight:700,margin:0}}>📈 Gráfico de Patrimônio</h3>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {[["todos","📋 Tudo"],["semana","📅 Semana"],["mes","🗓️ Mês"],["custom","📆 Período"]].map(([v,l])=>(
              <Pill key={v} label={l} selected={filtroPeriodo===v} onClick={()=>setFiltroPeriodo(v)} t={t}/>
            ))}
          </div>
        </div>

        {/* Filtro de período personalizado */}
        {filtroPeriodo === "custom" && (
          <div style={{
            background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,
            padding:"14px 16px",marginBottom:16
          }}>
            <div style={{color:t.muted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:10}}>PERÍODO PERSONALIZADO</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div>
                <label style={{display:"block",color:t.muted,fontSize:11,marginBottom:5}}>De</label>
                <input type="date" value={customInicio} onChange={e=>setCustomInicio(e.target.value)} style={inputStyle}/>
              </div>
              <div>
                <label style={{display:"block",color:t.muted,fontSize:11,marginBottom:5}}>Até</label>
                <input type="date" value={customFim} min={customInicio} onChange={e=>setCustomFim(e.target.value)} style={inputStyle}/>
              </div>
              {/* Atalhos */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[
                  ["Esta semana", ()=>{ setCustomInicio(ws); setCustomFim(we); }],
                  ["Este mês", ()=>{ const h=new Date(); const m=h.toISOString().slice(0,7); setCustomInicio(`${m}-01`); const last=new Date(h.getFullYear(),h.getMonth()+1,0); setCustomFim(last.toISOString().slice(0,10)); }],
                  ["Mês passado", ()=>{ const h=new Date(); const s=new Date(h.getFullYear(),h.getMonth()-1,1); const e=new Date(h.getFullYear(),h.getMonth(),0); setCustomInicio(s.toISOString().slice(0,10)); setCustomFim(e.toISOString().slice(0,10)); }],
                  ["Últimos 30d", ()=>{ const h=new Date(); const i=new Date(h); i.setDate(h.getDate()-30); setCustomInicio(i.toISOString().slice(0,10)); setCustomFim(h.toISOString().slice(0,10)); }],
                  ["Tudo", ()=>{ const datas=ops.map(o=>o.data).sort(); if(datas.length){ setCustomInicio(datas[0]); setCustomFim(datas[datas.length-1]); } }],
                ].map(([label, fn])=>(
                  <button key={label} onClick={fn} style={{
                    padding:"6px 10px",borderRadius:8,border:`1px solid ${t.border}`,
                    background:t.card,color:t.accent,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Stats do período */}
            {opsFiltradas.length > 0 && (
              <div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap"}}>
                <div style={{background:t.card,borderRadius:8,padding:"8px 14px",border:`1px solid ${t.border}`,textAlign:"center",minWidth:70}}>
                  <div style={{color:t.muted,fontSize:10}}>Operações</div>
                  <div style={{color:t.text,fontWeight:700,fontSize:16}}>{opsFiltradas.length}</div>
                </div>
                <div style={{background:t.card,borderRadius:8,padding:"8px 14px",border:`1px solid ${t.border}`,textAlign:"center",minWidth:70}}>
                  <div style={{color:t.muted,fontSize:10}}>Acerto</div>
                  <div style={{color:customPct>=50?"#4ade80":"#f87171",fontWeight:700,fontSize:16}}>{customPct}%</div>
                </div>
                <div style={{background:t.card,borderRadius:8,padding:"8px 14px",border:`1px solid ${t.border}`,textAlign:"center",minWidth:100}}>
                  <div style={{color:t.muted,fontSize:10}}>Resultado R$</div>
                  <div style={{color:customReais>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:16}}>{customReais>=0?"+":""}{customReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                </div>
                <div style={{background:t.card,borderRadius:8,padding:"8px 14px",border:`1px solid ${t.border}`,flex:1,minWidth:160}}>
                  <div style={{color:t.muted,fontSize:10,marginBottom:4}}>Por Ativo</div>
                  {renderAtivoLinhas(customAtivos)}
                </div>
              </div>
            )}
            {opsFiltradas.length === 0 && (
              <div style={{marginTop:10,color:t.muted,fontSize:13}}>📭 Nenhuma operação no período selecionado.</div>
            )}
          </div>
        )}

        <GraficoPatrimonio ops={opsFiltradas} t={t} filtro="todos"/>
      </div>

      {ops.length>0 && (
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:20}}>
          <h3 style={{color:t.accent,fontSize:14,fontWeight:700,margin:"0 0 14px"}}>🕐 Últimas Operações</h3>
          {[...ops].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,5).map(op=>{
            const r = parseFloat(op.resultadoReais)||0;
            const p = parseFloat(op.resultadoPontos)||0;
            const pos = r>=0;
            return (
              <div key={op.id} style={{
                display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"10px 14px",borderRadius:8,marginBottom:6,
                background:t.bg,border:`1px solid ${t.border}`,
                borderLeft:`3px solid ${pos?"#22c55e":"#ef4444"}`
              }}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{color:t.accent,fontWeight:700,fontSize:14}}>{op.ativo}</span>
                  <span style={{color:t.muted,fontSize:12}}>{op.data} · {getWeekday(op.data)}</span>
                  <span style={{color:op.direcao==="Compra"?"#4ade80":"#f87171",fontSize:11,fontWeight:600}}>
                    {op.direcao==="Compra"?"▲":"▼"} {op.direcao}
                  </span>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:pos?"#4ade80":"#f87171",fontWeight:700,fontSize:15}}>
                    {pos?"+":""}{r.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                  </div>
                  <div style={{color:"#a78bfa",fontSize:11}}>{p>=0?"+":""}{p} pts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DiarioTrader() {
  const [ops, setOps] = useState(()=>{
    try {
      const saved = localStorage.getItem("diario-trader-ops");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [editOp, setEditOp] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [meta, setMeta] = useState(()=>{
    try { const s = localStorage.getItem("diario-trader-meta"); return s?JSON.parse(s):{diaria:"",semanal:"",mensal:""}; } catch { return {diaria:"",semanal:"",mensal:""}; }
  });
  const [showMeta, setShowMeta] = useState(false);
  const [showRelatorio, setShowRelatorio] = useState(false);

  const t = darkMode ? DARK : LIGHT;

  const saveOps = (newOps) => {
    setOps(newOps);
    try { localStorage.setItem("diario-trader-ops", JSON.stringify(newOps)); } catch {}
  };

  const handleSave = form => {
    if(editOp) saveOps(ops.map(o=>o.id===editOp.id?{...form,id:editOp.id}:o));
    else saveOps([{...form,id:Date.now()},...ops]);
    setModal(null); setEditOp(null);
  };

  const handleDelete = id => saveOps(ops.filter(o=>o.id!==id));
  const handleEdit = op => { setEditOp(op); setModal("edit"); };

  const saveMeta = (m) => {
    setMeta(m);
    try { localStorage.setItem("diario-trader-meta", JSON.stringify(m)); } catch {}
    setShowMeta(false);
  };

  const hoje = new Date();
  const {start:ws,end:we} = getWeekRange(hoje);
  const mesStr = hoje.toISOString().slice(0,7);
  const hj = hojeStr();

  const totalReais = ops.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const semanaReais = ops.filter(o=>o.data>=ws&&o.data<=we).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const mesReais = ops.filter(o=>o.data.startsWith(mesStr)).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const diariaReais = ops.filter(o=>o.data===hj).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const showMetas = meta.diaria||meta.semanal||meta.mensal;

  // Helper para agrupar reais+pts por ativo no header
  const resumoHeaderAtivo = (lista) => {
    const acc = {};
    lista.forEach(o => {
      const a = o.ativo||"?";
      if(!acc[a]) acc[a]=0;
      acc[a] += parseFloat(o.resultadoReais)||0;
    });
    return Object.entries(acc);
  };
  const hojeAtivosHeader  = resumoHeaderAtivo(ops.filter(o=>o.data===hj));
  const semanaAtivosHeader = resumoHeaderAtivo(ops.filter(o=>o.data>=ws&&o.data<=we));

  return (
    <div style={{minHeight:"100vh",background:t.bg,fontFamily:"'Inter',system-ui,sans-serif",color:t.text}}>
      <div style={{background:t.header,borderBottom:`1px solid ${t.border}`,padding:"18px 24px",position:"sticky",top:0,zIndex:100,boxShadow:darkMode?"0 4px 20px rgba(0,0,0,0.4)":"0 2px 8px rgba(0,0,0,0.08)"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",borderRadius:10,padding:"8px 11px",fontSize:20}}>📒</div>
              <div>
                <h1 style={{fontSize:22,fontWeight:800,margin:0,background:"linear-gradient(135deg,#60a5fa,#93c5fd)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Diário de Trader</h1>
                <div style={{color:t.muted,fontSize:12,marginTop:1}}>{ops.length} operações registradas</div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              {/* Hoje — por ativo */}
              <div style={{textAlign:"right",minWidth:80}}>
                <div style={{color:t.muted,fontSize:10,marginBottom:2}}>Hoje</div>
                {hojeAtivosHeader.length===0
                  ? <div style={{color:t.muted,fontSize:12}}>—</div>
                  : hojeAtivosHeader.map(([a,v])=>(
                    <div key={a} style={{fontSize:12,fontWeight:700}}>
                      <span style={{color:"#94a3b8",fontSize:10}}>{a} </span>
                      <span style={{color:v>=0?"#4ade80":"#f87171"}}>{v>=0?"+":""}{v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>
                    </div>
                  ))
                }
              </div>
              {/* Semana — por ativo */}
              <div style={{textAlign:"right",minWidth:90}}>
                <div style={{color:t.muted,fontSize:10,marginBottom:2}}>Semana</div>
                {semanaAtivosHeader.length===0
                  ? <div style={{color:t.muted,fontSize:12}}>—</div>
                  : semanaAtivosHeader.map(([a,v])=>(
                    <div key={a} style={{fontSize:12,fontWeight:700}}>
                      <span style={{color:"#94a3b8",fontSize:10}}>{a} </span>
                      <span style={{color:v>=0?"#4ade80":"#f87171"}}>{v>=0?"+":""}{v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>
                    </div>
                  ))
                }
              </div>
              {/* Mês — total somado R$ (sem pts) */}
              <div style={{textAlign:"right",minWidth:70}}>
                <div style={{color:t.muted,fontSize:10}}>Mês</div>
                <div style={{color:mesReais>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:13}}>{mesReais>=0?"+":""}{mesReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
              </div>
              <div style={{width:1,height:30,background:t.border}}/>
              <div style={{textAlign:"right"}}>
                <div style={{color:t.muted,fontSize:10}}>Total</div>
                <div style={{color:totalReais>=0?"#4ade80":"#f87171",fontWeight:800,fontSize:17}}>{totalReais>=0?"+":""}{totalReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
              </div>
              <button onClick={()=>setShowRelatorio(true)} style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",border:"none",borderRadius:8,color:"#fff",padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:600,boxShadow:"0 3px 10px rgba(124,58,237,0.3)"}}>🤖 Relatório IA</button>
              <button onClick={()=>setShowMeta(true)} style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.accent,padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:600}}>🎯 Metas</button>
              <button onClick={()=>setDarkMode(d=>!d)} style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"8px 12px",cursor:"pointer",fontSize:16}}>{darkMode?"☀️":"🌙"}</button>
              <button onClick={()=>{setEditOp(null);setModal("add");}} style={{background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",border:"none",borderRadius:9,color:"#fff",padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 12px rgba(59,130,246,0.4)",whiteSpace:"nowrap"}}>＋ Nova Operação</button>
            </div>
          </div>

          {showMetas && (
            <div style={{marginTop:14,padding:"12px 16px",background:t.card,border:`1px solid ${t.border}`,borderRadius:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
                {meta.diaria && <ProgressBar label="Meta Diária" value={diariaReais} meta={parseFloat(meta.diaria)} color="#3b82f6" t={t}/>}
                {meta.semanal && <ProgressBar label="Meta Semanal" value={semanaReais} meta={parseFloat(meta.semanal)} color="#8b5cf6" t={t}/>}
                {meta.mensal && <ProgressBar label="Meta Mensal" value={mesReais} meta={parseFloat(meta.mensal)} color="#f59e0b" t={t}/>}
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:2,marginTop:14}}>
            {[{id:"home",label:"🏠 Início"},{id:"journal",label:"📋 Diário"},{id:"analytics",label:"📊 Análises"}].map(tb=>(
              <button key={tb.id} onClick={()=>setTab(tb.id)} style={{padding:"9px 18px",borderRadius:"8px 8px 0 0",border:"none",background:tab===tb.id?t.bg:"transparent",color:tab===tb.id?t.accent:t.muted,fontWeight:tab===tb.id?700:400,fontSize:14,cursor:"pointer",borderBottom:tab===tb.id?`2px solid ${t.accent}`:"2px solid transparent"}}>{tb.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"22px 16px"}}>
        {tab==="home" && <HomeTab ops={ops} t={t}/>}
        {tab==="journal" && <JournalTab ops={ops} onEdit={handleEdit} onDelete={handleDelete} t={t}/>}
        {tab==="analytics" && <AnalyticsTab ops={ops} t={t}/>}
      </div>

      {(modal==="add"||modal==="edit") && (
        <Modal title={editOp?"✏️ Editar Operação":"＋ Nova Operação"} onClose={()=>{setModal(null);setEditOp(null);}} t={t}>
          <AddOpForm initial={editOp||undefined} onSave={handleSave} onClose={()=>{setModal(null);setEditOp(null);}} t={t}/>
        </Modal>
      )}
      {showMeta && (
        <MetaModal meta={meta} onSave={saveMeta} onClose={()=>setShowMeta(false)} t={t}/>
      )}
      {showRelatorio && (
        <RelatorioSemanalModal ops={ops} t={t} onClose={()=>setShowRelatorio(false)}/>
      )}
    </div>
  );
}
