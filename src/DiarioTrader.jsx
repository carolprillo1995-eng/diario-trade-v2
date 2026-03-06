import { useState, useMemo, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { supabase } from "./supabaseClient";

const ATIVOS = {
  "🇧🇷 Futuros BR": ["WINFUT","WDOFUT"],
  "🇺🇸 Índices EUA": ["US30","US100","US500","US2000"],
  "🇩🇪 Europa": ["GER40","FR40","UK100","EU50","SPA35","ITA40"],
  "🌏 Ásia": ["JPN225","HK50","CN50","AUS200"],
  "💱 Forex Major": ["EURUSD","USDJPY","GBPUSD","USDCHF","AUDUSD","USDCAD","NZDUSD"],
  "💱 Forex Minor": ["EURGBP","EURJPY","GBPJPY","EURCHF","AUDJPY","CADJPY","CHFJPY","EURCAD","GBPAUD","EURAUD","NZDJPY"],
  "🪙 Cripto": ["BTCUSD","ETHUSD","LTCUSD","XRPUSD","SOLUSD"],
  "🥇 Metais": ["XAUUSD","XAGUSD","XPTUSD"],
  "🛢️ Energia": ["USOIL","UKOIL","NATGAS"],
};
const ATIVOS_FUTUROS_BR = ["WINFUT","WDOFUT"];
const TIMEFRAMES = ["2min","5min","15min","60min","Diário","Semanal"];
const TIMEFRAMES_ENTRADA = ["1min","2min","5min"];
const MEDIAS_OPCOES = ["9","21","50","200"];
const IMPEDIMENTOS_BASE = [
  {v:"resistencia_anterior",label:"🔴 Resistência Anterior",hasTF:true,hasRet:false},
  {v:"fundo_anterior",label:"🟢 Fundo Anterior",hasTF:true,hasRet:false},
  {v:"media_9",label:"📊 Média 9",hasTF:true,hasRet:false},
  {v:"media_21",label:"📊 Média 21",hasTF:true,hasRet:false},
  {v:"media_50",label:"📊 Média 50",hasTF:true,hasRet:false},
  {v:"media_200",label:"📊 Média 200",hasTF:true,hasRet:false},
  {v:"retracao",label:"↩️ Retração",hasTF:true,hasRet:true},
  {v:"contra_tendencia",label:"🔄 Contra Tendência Principal (Correção)",hasTF:false,hasRet:false},
  {v:"mercado_lateral",label:"➡️ Mercado Lateral",hasTF:false,hasRet:false},
  {v:"outro",label:"📝 Outro",hasTF:false,hasRet:false,hasCustom:true},
];
const NIVEIS_FIB = ["38.2","50","61.8","76.4"];
const SENTIMENTOS = [
  {v:"confiante",label:"😎 Confiante",color:"#22c55e"},{v:"ansioso",label:"😰 Ansioso",color:"#f97316"},
  {v:"medo",label:"😨 Medo",color:"#ef4444"},{v:"neutro",label:"😐 Neutro",color:"#94a3b8"},
  {v:"eufórico",label:"🤩 Eufórico",color:"#a855f7"},{v:"frustrado",label:"😤 Frustrado",color:"#f43f5e"},
  {v:"paciente",label:"🧘 Paciente",color:"#06b6d4"},{v:"disciplinado",label:"🎯 Disciplinado",color:"#3b82f6"},
  {v:"vingativo",label:"😡 Vingativo",color:"#dc2626"},
];
const ERROS_OPERACAO = [
  {v:"entrar_antes_confirmar",label:"⏰ Entrar Antes de Confirmar",color:"#f59e0b"},
  {v:"entrar_atrasado",label:"🐢 Entrar Atrasado",color:"#f97316"},
  {v:"entrada_fora_setup",label:"🚫 Entrada Fora do Setup",color:"#ef4444"},
  {v:"stop_mal_posicionado",label:"📍 Stop Mal Posicionado",color:"#ec4899"},
  {v:"nao_respeitar_stop",label:"🛑 Não Respeitar o Stop Loss",color:"#dc2626"},
  {v:"mover_stop_sem_motivo",label:"🔀 Mover Stop sem Motivo",color:"#a855f7"},
  {v:"sair_antes_alvo",label:"🏃 Sair Antes do Alvo",color:"#8b5cf6"},
  {v:"operar_vinganca",label:"😡 Operar por Vingança",color:"#f43f5e"},
  {v:"medo_ficar_fora",label:"😰 Medo de Ficar de Fora",color:"#06b6d4"},
  {v:"risco_maior_planejado",label:"📈 Risco Maior que o Planejado",color:"#f97316"},
  {v:"rr_ruim",label:"⚠️ Risco Retorno Ruim",color:"#eab308"},
  {v:"aumentar_lote_sem_estrategia",label:"🎲 Aumentar Lote sem Estratégia",color:"#84cc16"},
];
const REGIOES = [
  {v:"suporte_Norte",label:"🟦 Suporte Norte",color:"#3b82f6"},
  {v:"suporte",label:"🔵 Suporte",color:"#60a5fa"},
  {v:"resistencia_Norte",label:"🟥 Resistência Norte",color:"#ef4444"},
  {v:"resistencia",label:"🔴 Resistência",color:"#f87171"},
  {v:"troca_polaridade",label:"🔄 Troca de Polaridade",color:"#a855f7"},
];
const RR_OPCOES = ["1x1","2x1","Mais"];
const PARCIAL_RR_OPCOES = ["Menos que 1x1","1x1","2x1","Mais"];
const WEEKDAYS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const DARK = {bg:"#070e1a",card:"#0d1f3c",border:"#1e3a5f",text:"#e2e8f0",muted:"#475569",accent:"#60a5fa",input:"#070e1a",header:"#0a1628"};
const LIGHT = {bg:"#f1f5f9",card:"#ffffff",border:"#cbd5e1",text:"#0f172a",muted:"#64748b",accent:"#2563eb",input:"#f8fafc",header:"#ffffff"};

function isFuturosBR(ativo) { return ATIVOS_FUTUROS_BR.includes(ativo); }
function getWeekday(d) { if(!d) return ""; const [y,m,dd]=d.split("-").map(Number); return WEEKDAYS[new Date(y,m-1,dd).getDay()]; }
function getWeekRange(date) {
  const d=new Date(date); const day=d.getDay();
  const diff=d.getDate()-day+(day===0?-6:1); const mon=new Date(d.setDate(diff));
  const sun=new Date(mon); sun.setDate(mon.getDate()+6);
  return {start:mon.toISOString().slice(0,10),end:sun.toISOString().slice(0,10)};
}
function hojeStr() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

function rowToOp(row) {
  return {
    id:String(row.id), data:row.data, ativo:row.ativo, mercadoMacro:row.mercado_macro,
    direcao:row.direcao,
    resultadoPontos:row.resultado_pontos!=null?String(row.resultado_pontos):"",
    resultadoReais:row.resultado_reais!=null?String(row.resultado_reais):"",
    resultadoDolar:row.resultado_dolar!=null?String(row.resultado_dolar):"",
    cotacaoDolar:row.cotacao_dolar!=null?String(row.cotacao_dolar):"",
    sentimento:row.sentimento, descricao:row.descricao, medias:row.medias||[],
    tipoEntrada:row.tipo_entrada, retracao:row.retracao, nivelRetracao:row.nivel_retracao,
    movimento:row.movimento, mercadoEsticado:row.mercado_esticado, pegouLiquidez:row.pegou_liquidez,
    regiaoPreco:row.regiao_preco, foto:row.foto, errosOperacao:row.erros_operacao||[],
    impedimentos:(row.impedimentos||[]).map(i=>typeof i==='string'?{impedimento:i,timeframes:[],niveisFib:[],custom:''}:{...i,niveisFib:i.niveisFib||[],custom:i.custom||''}),
    timeframeEntrada:row.timeframe_entrada||"",
    seguiuOperacional:row.seguiu_operacional!=null?row.seguiu_operacional:null,
    seguiuGerenciamento:row.seguiu_gerenciamento!=null?row.seguiu_gerenciamento:null,
    resultadoGainStop:row.resultado_gain_stop||"",
    riscoRetorno:row.risco_retorno||"",
    riscoRetornoCustom:row.risco_retorno_custom||"",
    fezParcial:row.fez_parcial!=null?row.fez_parcial:null,
    parcialRR:row.parcial_rr||"",
    parcialRRCustom:row.parcial_rr_custom||"",
    parcialMotivoMenos:row.parcial_motivo_menos||"",
  };
}
function opToRow(op, userId) {
  return {
    user_id:userId, data:op.data, ativo:op.ativo, mercado_macro:op.mercadoMacro, direcao:op.direcao,
    resultado_pontos:op.resultadoPontos!==""?parseFloat(op.resultadoPontos):null,
    resultado_reais:op.resultadoReais!==""?parseFloat(op.resultadoReais):null,
    resultado_dolar:op.resultadoDolar!==""?parseFloat(op.resultadoDolar):null,
    cotacao_dolar:op.cotacaoDolar!==""?parseFloat(op.cotacaoDolar):null,
    sentimento:op.sentimento, descricao:op.descricao, medias:op.medias||[],
    tipo_entrada:op.tipoEntrada, retracao:op.retracao, nivel_retracao:op.nivelRetracao,
    movimento:op.movimento, mercado_esticado:op.mercadoEsticado, pegou_liquidez:op.pegouLiquidez,
    regiao_preco:op.regiaoPreco, foto:op.foto, erros_operacao:op.errosOperacao||[],
    impedimentos:op.impedimentos||[],
    timeframe_entrada:op.timeframeEntrada||null,
    seguiu_operacional:op.seguiuOperacional,
    seguiu_gerenciamento:op.seguiuGerenciamento,
    resultado_gain_stop:op.resultadoGainStop||null,
    risco_retorno:op.riscoRetorno||null,
    risco_retorno_custom:op.riscoRetornoCustom||null,
    fez_parcial:op.fezParcial,
    parcial_rr:op.parcialRR||null,
    parcial_rr_custom:op.parcialRRCustom||null,
    parcial_motivo_menos:op.parcialMotivoMenos||null,
  };
}
const EMPTY_FORM = {
  data:hojeStr(), ativo:"", mercadoMacro:"", direcao:"", resultadoPontos:"", resultadoReais:"",
  resultadoDolar:"", cotacaoDolar:"",
  sentimento:"", descricao:"", medias:[], tipoEntrada:"", retracao:false, nivelRetracao:"",
  movimento:"", mercadoEsticado:null, pegouLiquidez:null, regiaoPreco:"", foto:null,
  errosOperacao:[], impedimentos:[],
  timeframeEntrada:"", seguiuOperacional:null, seguiuGerenciamento:null,
  resultadoGainStop:"", riscoRetorno:"", riscoRetornoCustom:"",
  fezParcial:null, parcialRR:"", parcialRRCustom:"", parcialMotivoMenos:"",
};

function useCotacaoDolar() {
  const [cotacao, setCotacao] = useState(null);
  const [loading, setLoading] = useState(false);
  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
      const data = await res.json();
      const valor = parseFloat(data?.USDBRL?.bid);
      if (!isNaN(valor)) setCotacao(valor.toFixed(2));
    } catch { }
    setLoading(false);
  }, []);
  useEffect(() => { buscar(); }, [buscar]);
  return { cotacao, loading, buscar };
}

function Modal({title,onClose,children,t}) {
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,width:"100%",maxWidth:700,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${t.border}`,background:t.header,position:"sticky",top:0,zIndex:10,borderRadius:"16px 16px 0 0"}}>
          <h2 style={{color:t.accent,fontSize:17,fontWeight:700,margin:0}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:t.muted,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}
function Pill({label,selected,onClick,color,t}) {
  const c=color||(t?t.accent:"#60a5fa");
  return <button onClick={onClick} style={{padding:"7px 14px",borderRadius:999,border:`1.5px solid ${selected?c:(t?t.border:"#1e3a5f")}`,background:selected?c+"22":"transparent",color:selected?c:(t?t.muted:"#64748b"),fontWeight:selected?700:400,fontSize:13,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>{label}</button>;
}
function SimNao({value,onChange,t}) {
  return (
    <div style={{display:"flex",gap:8}}>
      <button onClick={()=>onChange(value===true?null:true)} style={{padding:"9px 20px",borderRadius:999,cursor:"pointer",fontWeight:700,fontSize:13,border:`1.5px solid ${value===true?"#22c55e":t.border}`,background:value===true?"#22c55e22":"transparent",color:value===true?"#22c55e":t.muted,transition:"all .15s"}}>✅ Sim</button>
      <button onClick={()=>onChange(value===false?null:false)} style={{padding:"9px 20px",borderRadius:999,cursor:"pointer",fontWeight:700,fontSize:13,border:`1.5px solid ${value===false?"#ef4444":t.border}`,background:value===false?"#ef444422":"transparent",color:value===false?"#ef4444":t.muted,transition:"all .15s"}}>❌ Não</button>
    </div>
  );
}
function Section({icon,title,children,t,accent}) {
  return (
    <div style={{marginBottom:22}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:16}}>{icon}</span>
        <span style={{color:accent||t.accent,fontWeight:600,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>{title}</span>
      </div>
      {children}
    </div>
  );
}
function Tag({children,color}) {
  const c=color||"#60a5fa";
  return <span style={{background:c+"18",border:`1px solid ${c}44`,color:c,padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600}}>{children}</span>;
}
function StatCard({icon,label,value,color,t}) {
  return (
    <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:"14px 18px",flex:1,minWidth:130}}>
      <div style={{fontSize:20,marginBottom:3}}>{icon}</div>
      <div style={{color:t.muted,fontSize:11,marginBottom:3}}>{label}</div>
      <div style={{color:color||t.text,fontWeight:700,fontSize:16,wordBreak:"break-word"}}>{value}</div>
    </div>
  );
}
function Toast({msg,type,onDone}) {
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[onDone]);
  return <div style={{position:"fixed",bottom:32,right:32,background:"#0d1f3c",border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`,borderLeft:`4px solid ${type==="error"?"#ef4444":"#22c55e"}`,padding:"14px 20px",borderRadius:10,color:"#e2e8f0",fontSize:13,zIndex:9999,boxShadow:"0 8px 30px rgba(0,0,0,0.4)",maxWidth:300}}>{msg}</div>;
}

function MediaComTimeframe({medias,onChange,t}) {
  const toggle=(media)=>{ const ex=medias.find(m=>m.media===media); if(ex) onChange(medias.filter(m=>m.media!==media)); else onChange([...medias,{media,timeframes:[]}]); };
  const toggleTF=(media,tf)=>onChange(medias.map(m=>{ if(m.media!==media) return m; const tfs=m.timeframes.includes(tf)?m.timeframes.filter(x=>x!==tf):[...m.timeframes,tf]; return {...m,timeframes:tfs}; }));
  return (
    <div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{MEDIAS_OPCOES.map(m=><Pill key={m} label={`MM ${m}`} selected={!!medias.find(x=>x.media===m)} onClick={()=>toggle(m)} color="#a78bfa" t={t}/>)}</div>
      {medias.map(item=>(
        <div key={item.media} style={{background:t.bg,border:"1px solid #a78bfa44",borderRadius:8,padding:"10px 14px",marginBottom:8}}>
          <div style={{color:"#a78bfa",fontWeight:700,fontSize:12,marginBottom:8}}>MM {item.media} — Tempo Gráfico:</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{TIMEFRAMES.map(tf=><Pill key={tf} label={tf} selected={item.timeframes.includes(tf)} onClick={()=>toggleTF(item.media,tf)} color="#06b6d4" t={t}/>)}</div>
        </div>
      ))}
    </div>
  );
}

function ImpedimentosComp({impedimentos,onChange,t}) {
  const getItem=(v)=>impedimentos.find(i=>i.impedimento===v);
  const isActive=(v)=>!!getItem(v);
  const toggle=(def)=>{
    if(isActive(def.v)) onChange(impedimentos.filter(i=>i.impedimento!==def.v));
    else onChange([...impedimentos,{impedimento:def.v,timeframes:[],niveisFib:[],custom:""}]);
  };
  const updateItem=(v,patch)=>onChange(impedimentos.map(i=>i.impedimento===v?{...i,...patch}:i));
  const toggleTF=(v,tf)=>{
    const item=getItem(v); if(!item) return;
    const tfs=item.timeframes.includes(tf)?item.timeframes.filter(x=>x!==tf):[...item.timeframes,tf];
    updateItem(v,{timeframes:tfs});
  };
  const toggleFib=(v,fib)=>{
    const item=getItem(v); if(!item) return;
    const fibs=(item.niveisFib||[]).includes(fib)?(item.niveisFib||[]).filter(x=>x!==fib):[...(item.niveisFib||[]),fib];
    updateItem(v,{niveisFib:fibs});
  };
  return (
    <div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        {IMPEDIMENTOS_BASE.map(def=>(
          <button key={def.v} onClick={()=>toggle(def)}
            style={{padding:"7px 13px",borderRadius:999,cursor:"pointer",fontWeight:isActive(def.v)?700:400,fontSize:12,
              border:`1.5px solid ${isActive(def.v)?"#f97316":t.border}`,
              background:isActive(def.v)?"#f9741622":"transparent",
              color:isActive(def.v)?"#f97316":t.muted,transition:"all .15s",whiteSpace:"nowrap"}}
          >{def.label}</button>
        ))}
      </div>
      {impedimentos.map(item=>{
        const def=IMPEDIMENTOS_BASE.find(d=>d.v===item.impedimento);
        if(!def) return null;
        return (
          <div key={item.impedimento} style={{background:t.bg,border:"1px solid #f9741644",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
            <div style={{color:"#f97316",fontWeight:700,fontSize:12,marginBottom:10}}>{def.label}</div>
            {def.hasRet&&(
              <div style={{marginBottom:10}}>
                <div style={{color:t.muted,fontSize:11,marginBottom:6,fontWeight:600}}>📐 Nível de Retração:</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {NIVEIS_FIB.map(fib=>(
                    <button key={fib} onClick={()=>toggleFib(item.impedimento,fib)}
                      style={{padding:"6px 14px",borderRadius:999,cursor:"pointer",fontWeight:700,fontSize:12,
                        border:`1.5px solid ${(item.niveisFib||[]).includes(fib)?"#06b6d4":t.border}`,
                        background:(item.niveisFib||[]).includes(fib)?"#06b6d422":"transparent",
                        color:(item.niveisFib||[]).includes(fib)?"#06b6d4":t.muted,transition:"all .15s"}}
                    >{fib}%</button>
                  ))}
                </div>
              </div>
            )}
            {def.hasTF&&(
              <div>
                <div style={{color:t.muted,fontSize:11,marginBottom:6,fontWeight:600}}>⏱️ Tempo Gráfico:</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {TIMEFRAMES.map(tf=>(
                    <Pill key={tf} label={tf} selected={item.timeframes.includes(tf)}
                      onClick={()=>toggleTF(item.impedimento,tf)} color="#f59e0b" t={t}/>
                  ))}
                </div>
              </div>
            )}
            {def.hasCustom&&(
              <div style={{marginTop:8}}>
                <input type="text" placeholder="Descreva o impedimento..."
                  value={item.custom||""}
                  onChange={e=>updateItem(item.impedimento,{custom:e.target.value})}
                  style={{background:t.input,border:`1px solid #f9741655`,borderRadius:8,color:t.text,
                    padding:"8px 12px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"}}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SaidaFinal({f,set,t,cotacaoApi,loadingCotacao,buscarCotacao}) {
  const ehFuturosBR=isFuturosBR(f.ativo);
  const inp={background:t.input,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"10px 14px",fontSize:14,outline:"none"};
  const calcReaisFromUSD=(dolar,cotacao)=>{
    const d=parseFloat(dolar); const c=parseFloat(cotacao);
    if(!isNaN(d)&&!isNaN(c)&&c>0) return (d*c).toFixed(2);
    return null;
  };
  const previewConversao=!ehFuturosBR&&f.resultadoDolar&&(f.cotacaoDolar||cotacaoApi)
    ?calcReaisFromUSD(f.resultadoDolar,f.cotacaoDolar||cotacaoApi):null;
  return (
    <div style={{background:t.bg,border:`2px solid #f59e0b44`,borderRadius:14,padding:"18px 20px"}}>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:ehFuturosBR?0:16}}>
        <div style={{flex:1,minWidth:140}}>
          <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📊 Resultado em Pontos</label>
          <input type="number" placeholder="ex: 150 ou -80" value={f.resultadoPontos} onChange={e=>set("resultadoPontos",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box"}}/>
        </div>
        <div style={{flex:1,minWidth:150}}>
          <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>💰 Resultado em R$</label>
          <input type="number" placeholder="ex: 300.00 ou -150.00" value={f.resultadoReais} onChange={e=>set("resultadoReais",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box"}}/>
          {!ehFuturosBR&&previewConversao&&f.resultadoReais===""&&(
            <div style={{color:"#a78bfa",fontSize:10,marginTop:3}}>
              💡 Sugestão via USD: R$ {previewConversao} —{" "}
              <span onClick={()=>set("resultadoReais",previewConversao)} style={{color:"#60a5fa",cursor:"pointer",textDecoration:"underline"}}>aplicar</span>
            </div>
          )}
        </div>
      </div>
      {!ehFuturosBR&&(
        <div style={{background:t.card,border:"1px solid #f59e0b44",borderRadius:10,padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <span style={{color:"#f59e0b",fontWeight:700,fontSize:12}}>💵 RESULTADO EM DÓLAR (USD)</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {cotacaoApi&&<div style={{background:"#f59e0b18",border:"1px solid #f59e0b44",borderRadius:8,padding:"5px 12px",display:"flex",gap:6,alignItems:"center"}}><span style={{color:t.muted,fontSize:10}}>USD/BRL ao vivo</span><span style={{color:"#f59e0b",fontWeight:800,fontSize:14}}>R$ {cotacaoApi}</span></div>}
              <button onClick={buscarCotacao} disabled={loadingCotacao} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,color:t.muted,padding:"5px 10px",cursor:"pointer",fontSize:11}}>{loadingCotacao?"⏳ ...":"🔄 Atualizar"}</button>
            </div>
          </div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:140}}>
              <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>💵 Resultado em USD</label>
              <input type="number" placeholder="ex: 58.50 ou -20.00" value={f.resultadoDolar}
                onChange={e=>{set("resultadoDolar",e.target.value);if(f.resultadoReais===""){const r=calcReaisFromUSD(e.target.value,f.cotacaoDolar||cotacaoApi);if(r!==null)set("resultadoReais",r);}}}
                style={{...inp,width:"100%",boxSizing:"border-box",border:"1px solid #f59e0b66"}}/>
            </div>
            <div style={{flex:1,minWidth:140}}>
              <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📈 Cotação USD/BRL utilizada</label>
              <input type="number" step="0.01" placeholder={cotacaoApi?`Atual: ${cotacaoApi}`:"ex: 5.25"} value={f.cotacaoDolar}
                onChange={e=>{set("cotacaoDolar",e.target.value);if(f.resultadoReais===""&&f.resultadoDolar){const r=calcReaisFromUSD(f.resultadoDolar,e.target.value);if(r!==null)set("resultadoReais",r);}}}
                style={{...inp,width:"100%",boxSizing:"border-box",border:"1px solid #f59e0b33"}}/>
              {cotacaoApi&&!f.cotacaoDolar&&(
                <button onClick={()=>{set("cotacaoDolar",cotacaoApi);if(f.resultadoReais===""&&f.resultadoDolar){const r=calcReaisFromUSD(f.resultadoDolar,cotacaoApi);if(r!==null)set("resultadoReais",r);}}}
                  style={{marginTop:6,background:"#f59e0b18",border:"1px solid #f59e0b44",borderRadius:6,color:"#f59e0b",padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600,width:"100%"}}>
                  ✅ Usar cotação atual (R$ {cotacaoApi})
                </button>
              )}
            </div>
          </div>
          {f.resultadoDolar&&(f.cotacaoDolar||cotacaoApi)&&(()=>{
            const d=parseFloat(f.resultadoDolar||0); const c=parseFloat(f.cotacaoDolar||cotacaoApi||0); const r=d*c; const pos=d>=0;
            return <div style={{marginTop:12,background:pos?"#22c55e0a":"#ef44440a",border:`1px solid ${pos?"#22c55e33":"#ef444433"}`,borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>💵 {pos?"+":""}{d.toFixed(2)} USD</span>
              <span style={{color:t.muted,fontSize:12}}>×</span>
              <span style={{color:t.text,fontSize:13}}>R$ {c.toFixed(2)}</span>
              <span style={{color:t.muted,fontSize:12}}>=</span>
              <span style={{color:pos?"#4ade80":"#f87171",fontWeight:800,fontSize:15}}>{pos?"+":""}{r.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>
            </div>;
          })()}
        </div>
      )}
    </div>
  );
}

function AddOpForm({initial,onSave,onClose,t}) {
  const [f,setF]=useState(()=>initial?{...EMPTY_FORM,...initial,medias:initial.medias||[],impedimentos:initial.impedimentos||[],errosOperacao:initial.errosOperacao||[]}:{...EMPTY_FORM});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const toggleErro=(v)=>setF(p=>({...p,errosOperacao:p.errosOperacao.includes(v)?p.errosOperacao.filter(x=>x!==v):[...p.errosOperacao,v]}));
  const valid=f.data&&f.ativo&&f.direcao&&f.resultadoPontos!=="";
  const inp={background:t.input,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"10px 14px",fontSize:14,outline:"none"};
  const {cotacao:cotacaoApi,loading:loadingCotacao,buscar:buscarCotacao}=useCotacaoDolar();
  return (
    <div>
      <Section icon="📅" title="Data" t={t}>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <input type="date" value={f.data} onChange={e=>set("data",e.target.value)} style={inp}/>
          {f.data&&<div style={{background:t.border+"44",border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 16px",color:t.accent,fontWeight:700,fontSize:14}}>{getWeekday(f.data)}</div>}
        </div>
      </Section>
      <Section icon="📊" title="Ativo" t={t}>
        <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,maxHeight:200,overflowY:"auto",padding:"6px 0"}}>
          {Object.entries(ATIVOS).map(([cat,ativos])=>(
            <div key={cat}>
              <div style={{padding:"5px 14px",fontSize:10,color:t.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",borderBottom:`1px solid ${t.border}`,marginBottom:2}}>{cat}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:"5px 12px 8px"}}>{ativos.map(a=><Pill key={a} label={a} selected={f.ativo===a} onClick={()=>set("ativo",a)} t={t}/>)}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section icon="⏱️" title="Time Frame de Entrada" t={t} accent="#06b6d4">
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {TIMEFRAMES_ENTRADA.map(tf=>(
            <button key={tf} onClick={()=>set("timeframeEntrada",f.timeframeEntrada===tf?"":tf)}
              style={{padding:"11px 28px",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:15,
                border:`2px solid ${f.timeframeEntrada===tf?"#06b6d4":t.border}`,
                background:f.timeframeEntrada===tf?"#06b6d422":"transparent",
                color:f.timeframeEntrada===tf?"#06b6d4":t.muted,transition:"all .15s",minWidth:90,textAlign:"center"}}
            >{tf}</button>
          ))}
        </div>
      </Section>
      <Section icon="🌐" title="Mercado Macro" t={t}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Pill label="📈 Alta" selected={f.mercadoMacro==="Alta"} onClick={()=>set("mercadoMacro","Alta")} color="#22c55e" t={t}/>
          <Pill label="📉 Baixa" selected={f.mercadoMacro==="Baixa"} onClick={()=>set("mercadoMacro","Baixa")} color="#ef4444" t={t}/>
          <Pill label="➡️ Lateral" selected={f.mercadoMacro==="Lateral"} onClick={()=>set("mercadoMacro","Lateral")} color="#f59e0b" t={t}/>
        </div>
      </Section>
      <Section icon="📏" title="Mercado Esticado?" t={t}><SimNao value={f.mercadoEsticado} onChange={v=>set("mercadoEsticado",v)} t={t}/></Section>
      <Section icon="💧" title="Mercado Pegou Liquidez?" t={t}><SimNao value={f.pegouLiquidez} onChange={v=>set("pegouLiquidez",v)} t={t}/></Section>
      <Section icon="📍" title="Região do Preço" t={t}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{REGIOES.map(r=><Pill key={r.v} label={r.label} selected={f.regiaoPreco===r.v} onClick={()=>set("regiaoPreco",f.regiaoPreco===r.v?"":r.v)} color={r.color} t={t}/>)}</div>
      </Section>
      <Section icon="🎯" title="Direção" t={t}>
        <div style={{display:"flex",gap:8}}>
          <Pill label="🟢 Compra" selected={f.direcao==="Compra"} onClick={()=>set("direcao","Compra")} color="#22c55e" t={t}/>
          <Pill label="🔴 Venda" selected={f.direcao==="Venda"} onClick={()=>set("direcao","Venda")} color="#ef4444" t={t}/>
        </div>
      </Section>
      <Section icon="📋" title="Seguiu o Operacional?" t={t} accent="#22c55e">
        <SimNao value={f.seguiuOperacional} onChange={v=>set("seguiuOperacional",v)} t={t}/>
      </Section>
      <Section icon="⚖️" title="Seguiu o Gerenciamento?" t={t} accent="#3b82f6">
        <SimNao value={f.seguiuGerenciamento} onChange={v=>set("seguiuGerenciamento",v)} t={t}/>
      </Section>
      <Section icon="🏁" title="Resultado" t={t} accent={f.resultadoGainStop==="Gain"?"#22c55e":f.resultadoGainStop==="Stop"?"#ef4444":f.resultadoGainStop==="Zero"?"#f59e0b":t.accent}>
        <div style={{display:"flex",gap:10}}>
          {[["Gain","🏆 Gain","#22c55e"],["Zero","➡️ Zero","#f59e0b"],["Stop","🛑 Stop","#ef4444"]].map(([val,label,cor])=>(
            <button key={val} onClick={()=>set("resultadoGainStop",f.resultadoGainStop===val?"":val)}
              style={{flex:1,padding:"14px 0",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:16,
                border:`2px solid ${f.resultadoGainStop===val?cor:t.border}`,
                background:f.resultadoGainStop===val?cor+"22":"transparent",
                color:f.resultadoGainStop===val?cor:t.muted,transition:"all .15s"}}
            >{label}</button>
          ))}
        </div>
        {f.resultadoGainStop==="Gain"&&(
          <div style={{marginTop:14,background:t.bg,border:"1px solid #22c55e33",borderRadius:10,padding:"14px 16px"}}>
            <div style={{color:"#4ade80",fontWeight:700,fontSize:12,marginBottom:10}}>📐 RISCO RETORNO</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {RR_OPCOES.map(rr=>(
                <button key={rr} onClick={()=>set("riscoRetorno",f.riscoRetorno===rr?"":rr)}
                  style={{padding:"9px 18px",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:13,
                    border:`2px solid ${f.riscoRetorno===rr?"#22c55e":t.border}`,
                    background:f.riscoRetorno===rr?"#22c55e22":"transparent",
                    color:f.riscoRetorno===rr?"#22c55e":t.muted,transition:"all .15s"}}
                >{rr==="Mais"?"➕ Mais":rr==="1x1"?"🎯 RR 1x1":"🚀 RR 2x1"}</button>
              ))}
            </div>
            {f.riscoRetorno==="Mais"&&<input type="text" placeholder="Ex: RR 3x1, 4x1, 5x1..." value={f.riscoRetornoCustom} onChange={e=>set("riscoRetornoCustom",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box",marginTop:10,border:"1px solid #22c55e55"}}/>}
          </div>
        )}
      </Section>
      <Section icon="✂️" title="Fez Parcial?" t={t} accent="#a855f7">
        <SimNao value={f.fezParcial} onChange={v=>{set("fezParcial",v);if(!v){set("parcialRR","");set("parcialRRCustom","");set("parcialMotivoMenos","");}}} t={t}/>
        {f.fezParcial===true&&(
          <div style={{marginTop:14,background:t.bg,border:"1px solid #a855f733",borderRadius:10,padding:"14px 16px"}}>
            <div style={{color:"#c084fc",fontWeight:700,fontSize:12,marginBottom:10}}>📊 RISCO RETORNO DA PARCIAL</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {PARCIAL_RR_OPCOES.map(rr=>{
                const isSelected=f.parcialRR===rr; const col=rr==="Menos que 1x1"?"#f87171":"#a855f7";
                return <button key={rr} onClick={()=>{set("parcialRR",isSelected?"":rr);if(rr!=="Menos que 1x1")set("parcialMotivoMenos","");}}
                  style={{padding:"9px 14px",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12,
                    border:`2px solid ${isSelected?col:t.border}`,background:isSelected?col+"22":"transparent",
                    color:isSelected?col:t.muted,transition:"all .15s"}}
                >{rr==="Menos que 1x1"?"⚠️ Menos 1x1":rr==="1x1"?"🎯 1x1":rr==="2x1"?"🚀 2x1":"➕ Mais"}</button>;
              })}
            </div>
            {f.parcialRR==="Mais"&&<input type="text" placeholder="Ex: 3x1, 4x1..." value={f.parcialRRCustom} onChange={e=>set("parcialRRCustom",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box",marginTop:10,border:"1px solid #a855f755"}}/>}
            {f.parcialRR==="Menos que 1x1"&&(
              <div style={{marginTop:12,background:"#ef444410",border:"1px solid #ef444444",borderRadius:8,padding:"12px 14px"}}>
                <div style={{color:"#f87171",fontSize:11,fontWeight:700,marginBottom:8}}>⚠️ Por que saiu parcial abaixo de 1x1?</div>
                <textarea placeholder="Descreva o motivo..." value={f.parcialMotivoMenos} onChange={e=>set("parcialMotivoMenos",e.target.value)} rows={3}
                  style={{...inp,width:"100%",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box",border:"1px solid #ef444455",background:"#ef444408"}}/>
              </div>
            )}
          </div>
        )}
      </Section>
      <Section icon="🚪" title="Saída Final — Resultado" t={t} accent="#f59e0b">
        <SaidaFinal f={f} set={set} t={t} cotacaoApi={cotacaoApi} loadingCotacao={loadingCotacao} buscarCotacao={buscarCotacao}/>
      </Section>
      <Section icon="🧠" title="Sentimento" t={t}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{SENTIMENTOS.map(s=><Pill key={s.v} label={s.label} selected={f.sentimento===s.v} onClick={()=>set("sentimento",s.v)} color={s.color} t={t}/>)}</div>
      </Section>
      <Section icon="⚠️" title="Erros da Operação" t={t}>
        <div style={{background:t.bg,border:"1px solid #ef444433",borderRadius:10,padding:"12px 14px"}}>
          <div style={{color:"#f87171",fontSize:11,marginBottom:10,fontWeight:600}}>Selecione os erros cometidos:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{ERROS_OPERACAO.map(e=><Pill key={e.v} label={e.label} selected={f.errosOperacao.includes(e.v)} onClick={()=>toggleErro(e.v)} color={e.color} t={t}/>)}</div>
        </div>
      </Section>
      <Section icon="✍️" title="Descrição" t={t}>
        <textarea placeholder="Descreva sua análise, setup, motivo da entrada..." value={f.descricao} onChange={e=>set("descricao",e.target.value)} rows={3} style={{...inp,width:"100%",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
      </Section>
      <Section icon="📉" title="Médias a Favor" t={t}><MediaComTimeframe medias={f.medias} onChange={v=>set("medias",v)} t={t}/></Section>
      <Section icon="🚧" title="Impedimentos" t={t}><ImpedimentosComp impedimentos={f.impedimentos} onChange={v=>set("impedimentos",v)} t={t}/></Section>
      <Section icon="🔢" title="Tipo de Entrada" t={t}>
        <div style={{display:"flex",gap:8}}>{["NV1","NV2","NV3"].map(tp=><Pill key={tp} label={tp} selected={f.tipoEntrada===tp} onClick={()=>set("tipoEntrada",tp)} color="#f59e0b" t={t}/>)}</div>
      </Section>
      <Section icon="↩️" title="Estava em Retração?" t={t}>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <Pill label="✅ Sim" selected={f.retracao===true} onClick={()=>set("retracao",true)} color="#22c55e" t={t}/>
          <Pill label="❌ Não" selected={f.retracao===false} onClick={()=>set("retracao",false)} color="#ef4444" t={t}/>
        </div>
        {f.retracao&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["38.2","50","61.8","76.4"].map(n=><Pill key={n} label={`${n}%`} selected={f.nivelRetracao===n} onClick={()=>set("nivelRetracao",n)} color="#06b6d4" t={t}/>)}</div>}
      </Section>
      <Section icon="📐" title="Tipo de Movimento" t={t}>
        <div style={{display:"flex",gap:8}}>
          <Pill label="📈 Expansão" selected={f.movimento==="Expansão"} onClick={()=>set("movimento","Expansão")} color="#22c55e" t={t}/>
          <Pill label="🔄 Correção" selected={f.movimento==="Correção"} onClick={()=>set("movimento","Correção")} color="#f97316" t={t}/>
        </div>
      </Section>
      <Section icon="📸" title="Foto (opcional)" t={t}>
        <label style={{display:"flex",alignItems:"center",gap:10,background:t.bg,border:`2px dashed ${t.border}`,borderRadius:10,padding:"16px 20px",cursor:"pointer",color:t.muted,fontSize:14}}>
          <span style={{fontSize:24}}>📁</span>
          <span>{f.foto?"✅ Foto carregada — clique para trocar":"Clique para selecionar uma imagem"}</span>
          <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>set("foto",ev.target.result);reader.readAsDataURL(file);}}/>
        </label>
        {f.foto&&<div style={{position:"relative",display:"inline-block",marginTop:10}}><img src={f.foto} alt="op" style={{maxWidth:"100%",maxHeight:280,borderRadius:10,border:`1px solid ${t.border}`,display:"block"}}/><button onClick={()=>set("foto",null)} style={{position:"absolute",top:8,right:8,background:"#ef444488",border:"none",borderRadius:999,color:"#fff",width:28,height:28,cursor:"pointer",fontSize:14,fontWeight:700}}>✕</button></div>}
      </Section>
      <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:8}}>
        <button onClick={onClose} style={{padding:"11px 22px",borderRadius:8,border:`1px solid ${t.border}`,background:"transparent",color:t.muted,fontSize:14,cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>valid&&onSave(f)} style={{padding:"11px 26px",borderRadius:8,border:"none",background:valid?"linear-gradient(135deg,#3b82f6,#1d4ed8)":t.border,color:valid?"#fff":t.muted,fontSize:14,fontWeight:700,cursor:valid?"pointer":"not-allowed",boxShadow:valid?"0 4px 15px rgba(59,130,246,0.4)":"none"}}>💾 Salvar Operação</button>
      </div>
    </div>
  );
}

function OpCard({op,onEdit,onDelete,t}) {
  const reais=parseFloat(op.resultadoReais)||0; const dolar=parseFloat(op.resultadoDolar)||0;
  const pts=parseFloat(op.resultadoPontos)||0; const pos=reais>=0;
  const sent=SENTIMENTOS.find(s=>s.v===op.sentimento);
  const regiao=REGIOES.find(r=>r.v===op.regiaoPreco);
  const erros=(op.errosOperacao||[]).map(e=>ERROS_OPERACAO.find(x=>x.v===e)).filter(Boolean);
  const mediasNorm=(op.medias||[]).map(m=>typeof m==="string"?{media:m,timeframes:[]}:m);
  const ehFutBR=isFuturosBR(op.ativo);
  return (
    <div style={{background:t.card,border:`1px solid ${pos?"#166534":"#7f1d1d"}`,borderLeft:`4px solid ${pos?"#22c55e":"#ef4444"}`,borderRadius:12,padding:"14px 18px",marginBottom:10,boxShadow:"0 3px 10px rgba(0,0,0,0.2)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{background:op.direcao==="Compra"?"#14532d":"#7f1d1d",color:op.direcao==="Compra"?"#4ade80":"#f87171",padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:700}}>{op.direcao==="Compra"?"▲ COMPRA":"▼ VENDA"}</span>
          <span style={{color:t.accent,fontWeight:700,fontSize:15}}>{op.ativo}</span>
          <span style={{color:t.muted,fontSize:12}}>{op.data} · <span style={{color:t.accent}}>{getWeekday(op.data)}</span></span>
          {op.timeframeEntrada&&<Tag color="#06b6d4">⏱️ {op.timeframeEntrada}</Tag>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{textAlign:"right"}}>
            <div style={{color:pos?"#4ade80":"#f87171",fontWeight:700,fontSize:17}}>{pos?"+":""}{reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
            {!ehFutBR&&op.resultadoDolar&&<div style={{color:"#f59e0b",fontWeight:600,fontSize:12}}>{dolar>=0?"+":""}{dolar.toLocaleString("en-US",{style:"currency",currency:"USD"})}{op.cotacaoDolar&&<span style={{color:t.muted,fontSize:10,marginLeft:4}}>@ R${op.cotacaoDolar}</span>}</div>}
            <div style={{color:"#a78bfa",fontSize:11}}>{pts>=0?"+":""}{pts} pts</div>
          </div>
          <button onClick={()=>onEdit(op)} style={{background:t.border,border:"none",borderRadius:6,color:t.accent,padding:"5px 9px",cursor:"pointer",fontSize:12}}>✏️</button>
          <button onClick={()=>onDelete(op.id)} style={{background:"#3b0f0f",border:"none",borderRadius:6,color:"#f87171",padding:"5px 9px",cursor:"pointer",fontSize:12}}>🗑️</button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10,alignItems:"center"}}>
        {op.mercadoMacro&&<Tag color={op.mercadoMacro==="Alta"?"#22c55e":op.mercadoMacro==="Baixa"?"#ef4444":"#f59e0b"}>{op.mercadoMacro==="Alta"?"📈":op.mercadoMacro==="Baixa"?"📉":"➡️"} {op.mercadoMacro}</Tag>}
        {op.mercadoEsticado===true&&<Tag color="#f97316">📏 Esticado</Tag>}
        {op.mercadoEsticado===false&&<Tag color="#22c55e">📏 Não Esticado</Tag>}
        {op.pegouLiquidez===true&&<Tag color="#a855f7">💧 Liq.</Tag>}
        {regiao&&<Tag color={regiao.color}>{regiao.label}</Tag>}
        {op.tipoEntrada&&<Tag color="#f59e0b">🔢 {op.tipoEntrada}</Tag>}
        {op.movimento&&<Tag color="#a78bfa">📐 {op.movimento}</Tag>}
        {op.retracao&&op.nivelRetracao&&<Tag color="#06b6d4">↩️ Fib {op.nivelRetracao}%</Tag>}
        {mediasNorm.map(m=><Tag key={m.media} color="#8b5cf6">MM {m.media}{m.timeframes&&m.timeframes.length>0?` (${m.timeframes.join(", ")})`:""}</Tag>)}
        {sent&&<Tag color={sent.color}>{sent.label}</Tag>}
        {op.seguiuOperacional===true&&<Tag color="#22c55e">📋 Operacional ✅</Tag>}
        {op.seguiuOperacional===false&&<Tag color="#ef4444">📋 Operacional ❌</Tag>}
        {op.seguiuGerenciamento===true&&<Tag color="#3b82f6">⚖️ Gerenc. ✅</Tag>}
        {op.seguiuGerenciamento===false&&<Tag color="#ef4444">⚖️ Gerenc. ❌</Tag>}
        {op.resultadoGainStop&&<Tag color={op.resultadoGainStop==="Gain"?"#22c55e":op.resultadoGainStop==="Zero"?"#f59e0b":"#ef4444"}>{op.resultadoGainStop==="Gain"?"🏆 Gain":op.resultadoGainStop==="Zero"?"➡️ Zero":"🛑 Stop"}</Tag>}
        {op.riscoRetorno&&<Tag color="#4ade80">📐 RR {op.riscoRetorno==="Mais"?op.riscoRetornoCustom||"Mais+":op.riscoRetorno}</Tag>}
        {op.fezParcial===true&&<Tag color="#a855f7">✂️ Parcial {op.parcialRR==="Mais"?op.parcialRRCustom||"Mais+":op.parcialRR}</Tag>}
        {op.fezParcial===false&&<Tag color={t.muted}>✂️ Sem Parcial</Tag>}
      </div>
      {erros.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>{erros.map(e=><span key={e.v} style={{background:"#ef444418",border:"1px solid #ef444444",color:"#f87171",padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600}}>⚠️ {e.label}</span>)}</div>}
      {(op.impedimentos||[]).length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>{op.impedimentos.map(imp=>{
        const def=IMPEDIMENTOS_BASE.find(d=>d.v===imp.impedimento);
        const label=def?def.label:imp.impedimento;
        const extra=[];
        if(imp.niveisFib&&imp.niveisFib.length) extra.push(imp.niveisFib.map(f=>f+"%").join(", "));
        if(imp.timeframes&&imp.timeframes.length) extra.push(imp.timeframes.join(", "));
        if(imp.custom) extra.push(imp.custom);
        return <span key={imp.impedimento} style={{background:"#f9741618",border:"1px solid #f9741644",color:"#fb923c",padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600}}>🚧 {label}{extra.length?` (${extra.join(" · ")})`:""}</span>;
      })}</div>}
      {op.parcialMotivoMenos&&op.parcialRR==="Menos que 1x1"&&<div style={{marginTop:6,background:"#ef444410",border:"1px solid #ef444433",borderRadius:6,padding:"6px 10px",color:"#f87171",fontSize:11}}>⚠️ Motivo parcial &lt;1x1: {op.parcialMotivoMenos}</div>}
      {op.descricao&&<div style={{marginTop:8,color:t.muted,fontSize:12,lineHeight:1.6,borderTop:`1px solid ${t.border}`,paddingTop:8,fontStyle:"italic"}}>"{op.descricao}"</div>}
      {op.foto&&<div style={{marginTop:10}}><img src={op.foto} alt="op" style={{maxWidth:"100%",maxHeight:200,borderRadius:8,border:`1px solid ${t.border}`,display:"block",cursor:"pointer"}} onClick={()=>window.open(op.foto,"_blank")}/><div style={{color:t.muted,fontSize:10,marginTop:4}}>🔍 Clique para ampliar</div></div>}
    </div>
  );
}

function Grafico({ops,t}) {
  const dados=useMemo(()=>{const arr=[...ops].sort((a,b)=>a.data.localeCompare(b.data));let acc=0;return arr.map((op,i)=>{acc+=parseFloat(op.resultadoReais)||0;return{name:`Op ${i+1}`,saldo:Math.round(acc*100)/100};});},[ops]);
  if(dados.length===0) return <div style={{textAlign:"center",padding:"40px 0",color:t.muted,fontSize:14}}>📭 Sem operações para exibir</div>;
  const ultimo=dados[dados.length-1]?.saldo||0;
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div><div style={{color:t.muted,fontSize:12}}>Patrimônio acumulado (R$)</div><div style={{color:ultimo>=0?"#4ade80":"#f87171",fontWeight:800,fontSize:22}}>{ultimo>=0?"+":""}{ultimo.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div></div>
        <div style={{color:t.muted,fontSize:12}}>{dados.length} operações</div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={dados}><CartesianGrid strokeDasharray="3 3" stroke={t.border}/><XAxis dataKey="name" tick={{fill:t.muted,fontSize:10}} axisLine={{stroke:t.border}}/><YAxis tick={{fill:t.muted,fontSize:10}} axisLine={{stroke:t.border}} tickFormatter={v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/><Tooltip contentStyle={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,fontSize:12}} formatter={v=>[v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"Saldo R$"]}/><ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4"/><Line type="monotone" dataKey="saldo" stroke={ultimo>=0?"#22c55e":"#ef4444"} strokeWidth={2.5} dot={{fill:ultimo>=0?"#22c55e":"#ef4444",r:3}} activeDot={{r:6}}/></LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function GraficoDolar({ops,t}) {
  const opsComDolar=ops.filter(o=>o.resultadoDolar);
  const dados=useMemo(()=>{const arr=[...opsComDolar].sort((a,b)=>a.data.localeCompare(b.data));let acc=0;return arr.map((op,i)=>{acc+=parseFloat(op.resultadoDolar)||0;return{name:`Op ${i+1}`,saldo:Math.round(acc*100)/100};});},[opsComDolar]);
  if(dados.length===0) return null;
  const ultimo=dados[dados.length-1]?.saldo||0;
  return (
    <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${t.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div><div style={{color:t.muted,fontSize:12}}>Saldo Internacional (USD)</div><div style={{color:ultimo>=0?"#f59e0b":"#f87171",fontWeight:800,fontSize:20}}>{ultimo>=0?"+":""}{ultimo.toLocaleString("en-US",{style:"currency",currency:"USD"})}</div></div>
        <div style={{color:t.muted,fontSize:12}}>{dados.length} ops intl.</div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={dados}><CartesianGrid strokeDasharray="3 3" stroke={t.border}/><XAxis dataKey="name" tick={{fill:t.muted,fontSize:10}} axisLine={{stroke:t.border}}/><YAxis tick={{fill:t.muted,fontSize:10}} axisLine={{stroke:t.border}} tickFormatter={v=>"$"+v}/><Tooltip contentStyle={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,fontSize:12}} formatter={v=>[v.toLocaleString("en-US",{style:"currency",currency:"USD"}),"Saldo USD"]}/><ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4"/><Line type="monotone" dataKey="saldo" stroke="#f59e0b" strokeWidth={2.5} dot={{fill:"#f59e0b",r:3}} activeDot={{r:6}}/></LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── RELATÓRIO IA ─────────────────────────────────────────────────────────────
function RelatorioModal({ops,t,onClose}) {
  const [loading,setLoading]=useState(false);
  const [relatorio,setRelatorio]=useState(null);
  const [erro,setErro]=useState(null);
  const [offset,setOffset]=useState(0);
  const semana=useMemo(()=>{const b=new Date();b.setDate(b.getDate()+offset*7);return getWeekRange(b);},[offset]);
  const opsSemana=useMemo(()=>ops.filter(o=>o.data>=semana.start&&o.data<=semana.end),[ops,semana]);
  const totalSemana=opsSemana.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const totalSemanaUSD=opsSemana.reduce((s,o)=>s+(parseFloat(o.resultadoDolar)||0),0);
  const wins=opsSemana.filter(o=>(parseFloat(o.resultadoReais)||0)>0).length;

const gerar = async () => {
  if (opsSemana.length === 0) return;
  setLoading(true); setRelatorio(null); setErro(null);
  const pct = opsSemana.length > 0 ? Math.round(wins / opsSemana.length * 100) : 0;
  const resumo = opsSemana.map(op => ({
    data: op.data, dia: getWeekday(op.data), ativo: op.ativo, direcao: op.direcao,
    resultado: parseFloat(op.resultadoReais) || 0, pontos: parseFloat(op.resultadoPontos) || 0,
    resultadoUSD: op.resultadoDolar ? parseFloat(op.resultadoDolar) : null,
    tipo: op.tipoEntrada || "N/A", sentimento: op.sentimento || "N/A",
    erros: (op.errosOperacao || []).map(e => ERROS_OPERACAO.find(x => x.v === e)?.label || e).join(", ") || "Nenhum",
    descricao: op.descricao || "", gainStop: op.resultadoGainStop,
    riscoRetorno: op.riscoRetorno, seguiuOperacional: op.seguiuOperacional,
    seguiuGerenciamento: op.seguiuGerenciamento, fezParcial: op.fezParcial, parcialRR: op.parcialRR,
  }));
  const errosFrequentes = {};
  opsSemana.forEach(op => { (op.errosOperacao||[]).forEach(e => { errosFrequentes[e] = (errosFrequentes[e]||0)+1; }); });
  const errosOrdenados = Object.entries(errosFrequentes).sort((a,b)=>b[1]-a[1]).map(([v,c])=>{ const label=ERROS_OPERACAO.find(x=>x.v===v)?.label||v; return `${label}: ${c}x`; }).join(", ") || "Nenhum";
  const diasComErro = opsSemana.filter(o=>(o.errosOperacao||[]).length>0).length;
  const diasSeguiuOp = opsSemana.filter(o=>o.seguiuOperacional===true).length;
  const diasNaoSeguiuOp = opsSemana.filter(o=>o.seguiuOperacional===false).length;
  const diasSeguiuGer = opsSemana.filter(o=>o.seguiuGerenciamento===true).length;
  const diasNaoSeguiuGer = opsSemana.filter(o=>o.seguiuGerenciamento===false).length;
  const stops = opsSemana.filter(o=>o.resultadoGainStop==="Stop").length;
  const gains = opsSemana.filter(o=>o.resultadoGainStop==="Gain").length;
  const zeros = opsSemana.filter(o=>o.resultadoGainStop==="Zero").length;
  const maiorGain = Math.max(...opsSemana.map(o=>parseFloat(o.resultadoReais)||0), 0);
  const maiorStop = Math.min(...opsSemana.map(o=>parseFloat(o.resultadoReais)||0), 0);
  const prompt = `Você é o mentor de trading mais experiente e direto do Brasil. Tem 50 anos operando e ensinando traders — já viu tudo: fortunas feitas e destruídas, padrões de erro que se repetem por décadas, e o que realmente separa um trader amador de um profissional.

Sua missão agora é analisar o diário de operações desta semana com TOTAL honestidade. Sem passar a mão na cabeça. Sem elogios vazios. Sem suavizar erros. Você fala a verdade nua e crua porque se importa genuinamente com o desenvolvimento deste trader — e sabe que mentira bonita mata conta.

LINGUAGEM: Use português simples e direto. Fale como se estivesse na frente da pessoa, olho no olho. Sem jargão desnecessário — quando usar termo técnico, explique em uma frase o que significa. A pessoa precisa ENTENDER, não apenas ler.

═══════════════════════════════════
DADOS DA SEMANA: ${semana.start} a ${semana.end}
═══════════════════════════════════
📊 NÚMEROS GERAIS:
- Total de operações: ${opsSemana.length}
- Gains: ${gains} | Stops: ${stops} | Zeros: ${zeros}
- Taxa de acerto: ${pct}% (${wins} ganhos, ${opsSemana.length - wins} perdas)
- Resultado financeiro R$: ${totalSemana >= 0 ? "+" : ""}R$ ${totalSemana.toFixed(2)}
${totalSemanaUSD !== 0 ? `- Resultado USD: ${totalSemanaUSD >= 0 ? "+" : ""}$${totalSemanaUSD.toFixed(2)}` : ""}
- Maior gain da semana: R$ ${maiorGain.toFixed(2)}
- Maior stop da semana: R$ ${maiorStop.toFixed(2)}

🧠 COMPORTAMENTO:
- Seguiu o operacional: ${diasSeguiuOp}x sim / ${diasNaoSeguiuOp}x NÃO
- Seguiu o gerenciamento: ${diasSeguiuGer}x sim / ${diasNaoSeguiuGer}x NÃO
- Ops com erros cometidos: ${diasComErro} de ${opsSemana.length}
- Erros mais frequentes: ${errosOrdenados}

📋 OPERAÇÕES DETALHADAS:
${JSON.stringify(resumo, null, 2)}
═══════════════════════════════════

Gere o relatório com ESTAS seções obrigatórias — seja brutal, específico e cite os dados reais:

## 📊 RETRATO DA SEMANA
Resumo direto: o que aconteceu de verdade nessa semana em números e comportamento. Não enfeite.

## 🏆 O QUE VOCÊ FEZ CERTO
Só cite se realmente aconteceu. Se não fez nada certo, diga isso. Se fez algo bem, explique POR QUE foi certo e como repetir.

## 💀 ONDE VOCÊ SANGROU DINHEIRO
Vá a fundo. Cite cada erro pelo nome, explique o que aconteceu, qual foi o custo real (em R$ se possível) e por que é destrutivo para uma conta. Não pule nenhum. Se cometeu o mesmo erro várias vezes, bata nessa tecla.

## 🔁 PADRÕES QUE ESTÃO TE DESTRUINDO
O que se repete semana após semana? Quais comportamentos estão gravados no seu cérebro que precisam ser reescritos? Seja específico: "Você entra antes de confirmar — isso apareceu X vezes essa semana e custou R$ Y".

## 🧠 SUA CABEÇA DURANTE A SEMANA
Analise o lado emocional e psicológico com base nos sentimentos registrados e nos erros cometidos. O medo, a ganância, a vingança — onde apareceram? Como afetaram as decisões? Fale como um psicólogo que entende de mercado.

## ⚔️ A VERDADE QUE VOCÊ PRECISA OUVIR
Uma ou duas frases sem filtro. O que você precisa escutar mas talvez não queira. O que está entre você e se tornar um trader profissional.

## 🛠️ PLANO DE AÇÃO — PRÓXIMA SEMANA
5 ações concretas e específicas. Não generalidades como "seja mais disciplinado". Ações reais: "Antes de entrar em qualquer operação, espere a vela fechar no seu timeframe de entrada. Se entrar antes, pare de operar no dia."

## 🎯 OS 3 FOCOS DA SEMANA QUE VEM
Três prioridades absolutas. O que trabalhar primeiro para evoluir mais rápido rumo ao trading profissional.`;
  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke("claude-relatorio", {
      body: { prompt },
    });
    if (fnError) throw new Error(fnError.message || JSON.stringify(fnError));
    if (fnData?.error) throw new Error(fnData.error);
    setRelatorio(fnData?.text || "Relatório vazio.");
  } catch (err) {
    setErro("❌ " + (err?.message || "Erro desconhecido."));
    console.error("Relatorio error:", err);
  }
  setLoading(false);
};

  const renderMd=(text)=>text.split("\n").map((line,i)=>{
    if(line.startsWith("## ")) return <div key={i} style={{color:"#fff",fontWeight:800,fontSize:15,marginTop:28,marginBottom:10,background:`linear-gradient(90deg,${t.accent}18,transparent)`,padding:"10px 12px",borderRadius:"8px 8px 0 0",borderBottom:`2px solid ${t.accent}`}}>{line.replace("## ","")}</div>;
    if(line.startsWith("- ")||line.startsWith("• ")) return <div key={i} style={{display:"flex",gap:8,marginBottom:5,paddingLeft:8}}><span style={{color:t.accent,fontSize:13,marginTop:2}}>▸</span><span style={{color:t.text,fontSize:13,lineHeight:1.7}}>{line.replace(/^[-•] /,"")}</span></div>;
    if(/^\d+\.\s/.test(line)){const m=line.match(/^(\d+)\.\s(.*)/);return m?<div key={i} style={{display:"flex",gap:10,marginBottom:6,paddingLeft:4}}><span style={{color:t.accent,fontWeight:800,fontSize:13,minWidth:20}}>{m[1]}.</span><span style={{color:t.text,fontSize:13,lineHeight:1.7}}>{m[2]}</span></div>:null;}
    if(line.trim()==="") return <div key={i} style={{height:8}}/>;
    const parts=line.split(/(\*\*[^*]+\*\*)/g);
    return <div key={i} style={{color:t.text,fontSize:13,lineHeight:1.8,marginBottom:4}}>{parts.map((p,j)=>p.startsWith("**")&&p.endsWith("**")?<strong key={j} style={{color:"#f0f9ff",fontWeight:700}}>{p.slice(2,-2)}</strong>:p)}</div>;
  });

  const temUSD=totalSemanaUSD!==0;
  return (
    <Modal title="🤖 Relatório & Análise com IA" onClose={onClose} t={t}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,padding:"12px 16px"}}>
        <button onClick={()=>{setOffset(o=>o-1);setRelatorio(null);setErro(null);}} style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"8px 14px",cursor:"pointer",fontSize:16,fontWeight:700}}>◀</button>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{color:t.accent,fontWeight:700,fontSize:14}}>{semana.start} → {semana.end}</div>
          <div style={{color:t.muted,fontSize:12,marginTop:2}}>{opsSemana.length} ops · {opsSemana.length>0?Math.round(wins/opsSemana.length*100):0}% acerto</div>
        </div>
        <button onClick={()=>{setOffset(o=>o+1);setRelatorio(null);setErro(null);}} disabled={offset>=0} style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:offset>=0?t.muted:t.text,padding:"8px 14px",cursor:offset>=0?"not-allowed":"pointer",fontSize:16,fontWeight:700}}>▶</button>
      </div>
      {opsSemana.length>0&&(
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {[["Ops",opsSemana.length,t.text],["Acerto",`${Math.round(wins/opsSemana.length*100)}%`,wins/opsSemana.length>=0.5?"#4ade80":"#f87171"],["R$",`${totalSemana>=0?"+":""}${totalSemana.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`,totalSemana>=0?"#4ade80":"#f87171"],...(temUSD?[["USD",`${totalSemanaUSD>=0?"+":""}${totalSemanaUSD.toLocaleString("en-US",{style:"currency",currency:"USD"})}`,"#f59e0b"]]:[])]
            .map(([l,v,c])=>(
              <div key={l} style={{flex:1,minWidth:80,background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px",textAlign:"center"}}>
                <div style={{color:t.muted,fontSize:10}}>{l}</div>
                <div style={{color:c,fontWeight:700,fontSize:15}}>{v}</div>
              </div>
          ))}
        </div>
      )}
      {opsSemana.length===0?(
        <div style={{textAlign:"center",padding:"40px 0",color:t.muted}}><div style={{fontSize:40,marginBottom:12}}>📭</div><div>Sem operações nesta semana.</div></div>
      ):(
        <>
          <button onClick={gerar} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:loading?"#1e3a5f":"linear-gradient(135deg,#7c3aed,#4f46e5)",color:"#fff",fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 4px 20px rgba(124,58,237,0.4)",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {loading?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⏳</span> Gerando análise...</>:<>🤖 Gerar Relatório com IA</>}
          </button>
          {erro&&(
            <div style={{background:"#ef444415",border:"1px solid #ef444455",borderRadius:10,padding:"14px 16px",marginBottom:16}}>
              <div style={{color:"#f87171",fontWeight:700,fontSize:13,marginBottom:6}}>❌ Erro ao gerar relatório</div>
              <div style={{color:"#fca5a5",fontSize:12,lineHeight:1.6}}>{erro}</div>
              <div style={{color:t.muted,fontSize:11,marginTop:8}}>Verifique: 1) Edge Function "claude-relatorio" deployada? 2) Secret ANTHROPIC_API_KEY configurado no Supabase?</div>
            </div>
          )}
          {relatorio&&<div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:12,padding:"20px",maxHeight:500,overflowY:"auto"}}>{renderMd(relatorio)}</div>}
        </>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </Modal>
  );
}

function HomeTab({ops,t}) {
  const hoje=new Date(); const {start:ws,end:we}=getWeekRange(hoje); const mesStr=hoje.toISOString().slice(0,7); const hj=hojeStr();
  const totalReais=ops.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const totalDolar=ops.filter(o=>o.resultadoDolar).reduce((s,o)=>s+(parseFloat(o.resultadoDolar)||0),0);
  const semanaReais=ops.filter(o=>o.data>=ws&&o.data<=we).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const mesReais=ops.filter(o=>o.data.startsWith(mesStr)).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const diariaReais=ops.filter(o=>o.data===hj).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const wins=ops.filter(o=>(parseFloat(o.resultadoReais)||0)>0).length;
  const pct=ops.length>0?Math.round(wins/ops.length*100):0;
  const temDolar=ops.some(o=>o.resultadoDolar);
  return (
    <div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
        <StatCard icon="📅" label="Hoje" value={`${diariaReais>=0?"+":""}${diariaReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`} color={diariaReais>=0?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="📆" label="Esta Semana" value={`${semanaReais>=0?"+":""}${semanaReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`} color={semanaReais>=0?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="🗓️" label="Este Mês" value={`${mesReais>=0?"+":""}${mesReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`} color={mesReais>=0?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="💰" label="Total R$" value={`${totalReais>=0?"+":""}${totalReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`} color={totalReais>=0?"#4ade80":"#f87171"} t={t}/>
        {temDolar&&<StatCard icon="💵" label="Total USD" value={`${totalDolar>=0?"+":""}${totalDolar.toLocaleString("en-US",{style:"currency",currency:"USD"})}`} color={totalDolar>=0?"#f59e0b":"#f87171"} t={t}/>}
        <StatCard icon="✅" label="Taxa de Acerto" value={`${pct}%`} color={pct>=50?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="📊" label="Total de Ops" value={`${ops.length} ops`} t={t}/>
      </div>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:20,marginBottom:16}}>
        <h3 style={{color:t.accent,fontSize:15,fontWeight:700,margin:"0 0 16px"}}>📈 Gráfico de Patrimônio</h3>
        <Grafico ops={ops} t={t}/>
        {temDolar&&<GraficoDolar ops={ops} t={t}/>}
      </div>
      {ops.length>0&&(
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:20}}>
          <h3 style={{color:t.accent,fontSize:14,fontWeight:700,margin:"0 0 14px"}}>🕐 Últimas Operações</h3>
          {[...ops].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,5).map(op=>{
            const r=parseFloat(op.resultadoReais)||0; const p=parseFloat(op.resultadoPontos)||0; const pos=r>=0; const d=parseFloat(op.resultadoDolar)||0;
            return <div key={op.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderRadius:8,marginBottom:6,background:t.bg,border:`1px solid ${t.border}`,borderLeft:`3px solid ${pos?"#22c55e":"#ef4444"}`}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{color:t.accent,fontWeight:700,fontSize:14}}>{op.ativo}</span><span style={{color:t.muted,fontSize:12}}>{op.data} · {getWeekday(op.data)}</span><span style={{color:op.direcao==="Compra"?"#4ade80":"#f87171",fontSize:11,fontWeight:600}}>{op.direcao==="Compra"?"▲":"▼"} {op.direcao}</span></div>
              <div style={{textAlign:"right"}}>
                <div style={{color:pos?"#4ade80":"#f87171",fontWeight:700,fontSize:15}}>{pos?"+":""}{r.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                {op.resultadoDolar&&<div style={{color:"#f59e0b",fontSize:12}}>{d>=0?"+":""}{d.toLocaleString("en-US",{style:"currency",currency:"USD"})}</div>}
                <div style={{color:"#a78bfa",fontSize:11}}>{p>=0?"+":""}{p} pts</div>
              </div>
            </div>;
          })}
        </div>
      )}
    </div>
  );
}

function JournalTab({ops,onEdit,onDelete,t}) {
  const [fAtivo,setFAtivo]=useState(""); const [fDir,setFDir]=useState(""); const [fPer,setFPer]=useState("todos"); const [sort,setSort]=useState("data_desc");
  const hoje=new Date(); const {start:ws,end:we}=getWeekRange(hoje); const mesStr=hoje.toISOString().slice(0,7);
  const ativosUnicos=[...new Set(ops.map(o=>o.ativo))];
  const filtered=useMemo(()=>{
    let arr=[...ops];
    if(fAtivo) arr=arr.filter(o=>o.ativo===fAtivo);
    if(fDir) arr=arr.filter(o=>o.direcao===fDir);
    if(fPer==="semana") arr=arr.filter(o=>o.data>=ws&&o.data<=we);
    if(fPer==="mes") arr=arr.filter(o=>o.data.startsWith(mesStr));
    if(sort==="data_desc") arr.sort((a,b)=>b.data.localeCompare(a.data));
    if(sort==="data_asc") arr.sort((a,b)=>a.data.localeCompare(b.data));
    if(sort==="reais_desc") arr.sort((a,b)=>(parseFloat(b.resultadoReais)||0)-(parseFloat(a.resultadoReais)||0));
    if(sort==="reais_asc") arr.sort((a,b)=>(parseFloat(a.resultadoReais)||0)-(parseFloat(b.resultadoReais)||0));
    return arr;
  },[ops,fAtivo,fDir,fPer,sort,ws,we,mesStr]);
  const total=filtered.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const totalUSD=filtered.filter(o=>o.resultadoDolar).reduce((s,o)=>s+(parseFloat(o.resultadoDolar)||0),0);
  const sel={background:t.input,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"7px 11px",fontSize:13,outline:"none"};
  return (
    <div>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:14,marginBottom:16}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"flex-end"}}>
          <select value={fAtivo} onChange={e=>setFAtivo(e.target.value)} style={sel}><option value="">Todos ativos</option>{ativosUnicos.map(a=><option key={a}>{a}</option>)}</select>
          <select value={fDir} onChange={e=>setFDir(e.target.value)} style={sel}><option value="">Compra e Venda</option><option>Compra</option><option>Venda</option></select>
          <div style={{display:"flex",gap:5}}>{[["todos","📋 Tudo"],["semana","📅 Semana"],["mes","🗓️ Mês"]].map(([v,l])=><Pill key={v} label={l} selected={fPer===v} onClick={()=>setFPer(v)} t={t}/>)}</div>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{...sel,marginLeft:"auto"}}><option value="data_desc">📅 Mais recente</option><option value="data_asc">📅 Mais antigo</option><option value="reais_desc">💰 Maior lucro</option><option value="reais_asc">💰 Maior perda</option></select>
        </div>
      </div>
      <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:14,padding:"9px 14px",background:t.card,borderRadius:8,border:`1px solid ${t.border}`,flexWrap:"wrap"}}>
        <span style={{color:t.muted,fontSize:13}}>{filtered.length} operações</span>
        <span style={{color:total>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:14}}>{total>=0?"+":""}{total.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>
        {totalUSD!==0&&<span style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>{totalUSD>=0?"+":""}{totalUSD.toLocaleString("en-US",{style:"currency",currency:"USD"})} USD</span>}
      </div>
      {filtered.length===0&&<div style={{textAlign:"center",padding:60,color:t.muted,fontSize:15}}>Nenhuma operação encontrada 📭</div>}
      {filtered.map(op=><OpCard key={op.id} op={op} onEdit={onEdit} onDelete={onDelete} t={t}/>)}
    </div>
  );
}

function AnalyticsTab({ops,t}) {
  const hoje=new Date(); const {start:ws,end:we}=getWeekRange(hoje); const mesStr=hoje.toISOString().slice(0,7);
  const totalReais=ops.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const totalDolar=ops.filter(o=>o.resultadoDolar).reduce((s,o)=>s+(parseFloat(o.resultadoDolar)||0),0);
  const wins=ops.filter(o=>(parseFloat(o.resultadoReais)||0)>0).length;
  const pct=ops.length>0?Math.round(wins/ops.length*100):0;
  const semanaR=ops.filter(o=>o.data>=ws&&o.data<=we).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const mesR=ops.filter(o=>o.data.startsWith(mesStr)).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const temDolar=ops.some(o=>o.resultadoDolar);
  const opSegOp=ops.filter(o=>o.seguiuOperacional!=null);
  const pctSegOp=opSegOp.length>0?Math.round(opSegOp.filter(o=>o.seguiuOperacional).length/opSegOp.length*100):null;
  const opSegGer=ops.filter(o=>o.seguiuGerenciamento!=null);
  const pctSegGer=opSegGer.length>0?Math.round(opSegGer.filter(o=>o.seguiuGerenciamento).length/opSegGer.length*100):null;
  const byDay=useMemo(()=>{const acc={};ops.forEach(op=>{const d=getWeekday(op.data);if(!acc[d])acc[d]={day:d,reais:0,count:0,wins:0};acc[d].reais+=parseFloat(op.resultadoReais)||0;acc[d].count++;if((parseFloat(op.resultadoReais)||0)>0)acc[d].wins++;});return Object.values(acc).sort((a,b)=>b.reais-a.reais);},[ops]);
  const byTipo=useMemo(()=>{const acc={};ops.forEach(op=>{if(!op.tipoEntrada)return;if(!acc[op.tipoEntrada])acc[op.tipoEntrada]={tipo:op.tipoEntrada,reais:0,count:0,wins:0};acc[op.tipoEntrada].reais+=parseFloat(op.resultadoReais)||0;acc[op.tipoEntrada].count++;if((parseFloat(op.resultadoReais)||0)>0)acc[op.tipoEntrada].wins++;});return Object.values(acc).sort((a,b)=>b.reais-a.reais);},[ops]);
  const byErro=useMemo(()=>{const acc={};ops.forEach(op=>{(op.errosOperacao||[]).forEach(e=>{if(!acc[e])acc[e]={v:e,count:0};acc[e].count++;});});return Object.values(acc).sort((a,b)=>b.count-a.count);},[ops]);
  const byAtivo=useMemo(()=>{const acc={};ops.forEach(op=>{if(!acc[op.ativo])acc[op.ativo]={ativo:op.ativo,reais:0,count:0};acc[op.ativo].reais+=parseFloat(op.resultadoReais)||0;acc[op.ativo].count++;});return Object.values(acc).sort((a,b)=>b.reais-a.reais).slice(0,8);},[ops]);
  const chartData=useMemo(()=>{const s=[...ops].sort((a,b)=>a.data.localeCompare(b.data));let acc=0;return s.map((op,i)=>{acc+=parseFloat(op.resultadoReais)||0;return{name:`Op ${i+1}`,saldo:Math.round(acc*100)/100};});},[ops]);
  const maxAbs=Math.max(...byDay.map(d=>Math.abs(d.reais)),1);
  return (
    <div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
        <StatCard icon="📊" label="Total Ops" value={ops.length} t={t}/>
        <StatCard icon="✅" label="Taxa Acerto" value={`${pct}%`} color={pct>=50?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="💰" label="Total R$" value={totalReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} color={totalReais>=0?"#4ade80":"#f87171"} t={t}/>
        {temDolar&&<StatCard icon="💵" label="Total USD" value={totalDolar.toLocaleString("en-US",{style:"currency",currency:"USD"})} color={totalDolar>=0?"#f59e0b":"#f87171"} t={t}/>}
        <StatCard icon="📅" label="Esta Semana" value={semanaR.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} color={semanaR>=0?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="🗓️" label="Este Mês" value={mesR.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} color={mesR>=0?"#4ade80":"#f87171"} t={t}/>
        {pctSegOp!==null&&<StatCard icon="📋" label="Seguiu Operacional" value={`${pctSegOp}%`} color={pctSegOp>=70?"#4ade80":"#f97316"} t={t}/>}
        {pctSegGer!==null&&<StatCard icon="⚖️" label="Seguiu Gerenciamento" value={`${pctSegGer}%`} color={pctSegGer>=70?"#4ade80":"#f97316"} t={t}/>}
      </div>
      {chartData.length>0&&<div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:20,marginBottom:16}}>
        <h3 style={{color:t.accent,fontSize:14,fontWeight:700,margin:"0 0 16px"}}>📈 Evolução do Saldo</h3>
        <ResponsiveContainer width="100%" height={200}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={t.border}/><XAxis dataKey="name" tick={{fill:t.muted,fontSize:11}} axisLine={{stroke:t.border}}/><YAxis tick={{fill:t.muted,fontSize:11}} axisLine={{stroke:t.border}} tickFormatter={v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/><Tooltip contentStyle={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text}} formatter={v=>[v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"Saldo"]}/><ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4"/><Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} dot={{fill:"#3b82f6",r:3}} activeDot={{r:5}}/></LineChart></ResponsiveContainer>
        {temDolar&&<GraficoDolar ops={ops} t={t}/>}
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:18}}>
          <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>📅 Por Dia da Semana</h3>
          {byDay.length===0&&<div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
          {byDay.map((d,i)=>(
            <div key={d.day} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:t.text,fontSize:13,fontWeight:i===0?700:400}}>{i===0?"🏆 ":""}{d.day}</span><span style={{color:d.reais>=0?"#4ade80":"#f87171",fontSize:12,fontWeight:700}}>{d.reais>=0?"+":""}{d.reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} <span style={{color:t.muted,fontWeight:400,fontSize:10}}>{d.count>0?Math.round(d.wins/d.count*100):0}%</span></span></div>
              <div style={{background:t.bg,borderRadius:4,height:6,overflow:"hidden"}}><div style={{width:`${Math.abs(d.reais)/maxAbs*100}%`,height:"100%",background:d.reais>=0?"#22c55e":"#ef4444",borderRadius:4}}/></div>
            </div>
          ))}
        </div>
        <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:18}}>
          <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>🔢 Por Tipo de Entrada</h3>
          {byTipo.length===0&&<div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
          {byTipo.map(tp=>(
            <div key={tp.tipo} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#f59e0b",fontWeight:700,fontSize:15}}>{tp.tipo}</span><div style={{textAlign:"right"}}><div style={{color:tp.reais>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:14}}>{tp.reais>=0?"+":""}{tp.reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div></div></div>
              <div style={{color:t.muted,fontSize:11,marginTop:3}}>{tp.wins}/{tp.count} ops · {tp.count?Math.round(tp.wins/tp.count*100):0}% acerto</div>
            </div>
          ))}
        </div>
      </div>
      {byErro.length>0&&<div style={{background:t.card,border:"1px solid #ef444433",borderRadius:12,padding:18,marginBottom:14}}>
        <h3 style={{color:"#f87171",fontSize:13,fontWeight:700,margin:"0 0 14px"}}>⚠️ Erros Mais Frequentes</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>{byErro.map(e=>{const err=ERROS_OPERACAO.find(x=>x.v===e.v);return <div key={e.v} style={{background:"#ef444410",border:"1px solid #ef444433",borderRadius:10,padding:"10px 14px",minWidth:130,textAlign:"center"}}><div style={{color:"#f87171",fontWeight:700,fontSize:12}}>{err?.label||e.v}</div><div style={{color:t.text,fontWeight:800,fontSize:22,margin:"4px 0"}}>{e.count}x</div></div>;})}</div>
      </div>}
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:18}}>
        <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>📊 Por Ativo</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {byAtivo.map(a=><div key={a.ativo} style={{background:(a.reais>=0?"#14532d":"#7f1d1d")+"33",border:`1px solid ${a.reais>=0?"#166534":"#991b1b"}`,borderRadius:10,padding:"10px 14px",minWidth:110,textAlign:"center"}}><div style={{color:t.accent,fontWeight:700,fontSize:13}}>{a.ativo}</div><div style={{color:a.reais>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:15,margin:"3px 0"}}>{a.reais>=0?"+":""}{a.reais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div><div style={{color:t.muted,fontSize:11}}>{a.count} ops</div></div>)}
          {byAtivo.length===0&&<div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
        </div>
      </div>
    </div>
  );
}

export default function DiarioTrader({user,onLogout}) {
  const [ops,setOps]=useState([]);
  const [loadingOps,setLoadingOps]=useState(true);
  const [tab,setTab]=useState("home");
  const [modal,setModal]=useState(null);
  const [editOp,setEditOp]=useState(null);
  const [darkMode,setDarkMode]=useState(true);
  const [showRelatorio,setShowRelatorio]=useState(false);
  const [toast,setToast]=useState(null);
  const t=darkMode?DARK:LIGHT;
  const showToast=useCallback((msg,type="success")=>setToast({msg,type}),[]);

  useEffect(()=>{
    const load=async()=>{
      setLoadingOps(true);
      const {data,error}=await supabase.from("operacoes").select("*").eq("user_id",user.id).order("data",{ascending:false});
      if(error) showToast("Erro ao carregar: "+error.message,"error");
      else setOps((data||[]).map(rowToOp));
      setLoadingOps(false);
    };
    load();
  },[user.id,showToast]);

  const handleSave=async(form)=>{
    const row=opToRow(form,user.id);
    if(editOp){
      const {error}=await supabase.from("operacoes").update(row).eq("id",editOp.id);
      if(error){showToast("Erro ao salvar: "+error.message,"error");return;}
      setOps(prev=>prev.map(o=>o.id===editOp.id?{...form,id:editOp.id}:o));
      showToast("Operação atualizada! ✅");
    } else {
      const {data,error}=await supabase.from("operacoes").insert([row]).select().single();
      if(error){showToast("Erro ao salvar: "+error.message,"error");return;}
      setOps(prev=>[rowToOp(data),...prev]);
      showToast("Operação salva! ✅");
    }
    setModal(null); setEditOp(null);
  };

  const handleDelete=async(id)=>{
    if(!window.confirm("Remover esta operação?")) return;
    const {error}=await supabase.from("operacoes").delete().eq("id",id);
    if(error){showToast("Erro ao remover: "+error.message,"error");return;}
    setOps(prev=>prev.filter(o=>o.id!==id));
    showToast("Operação removida.");
  };

  const handleEdit=(op)=>{setEditOp(op);setModal("edit");};
  const hoje=new Date(); const {start:ws,end:we}=getWeekRange(hoje); const mesStr=hoje.toISOString().slice(0,7);
  const totalReais=ops.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const semanaReais=ops.filter(o=>o.data>=ws&&o.data<=we).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const mesReais=ops.filter(o=>o.data.startsWith(mesStr)).reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const totalDolar=ops.filter(o=>o.resultadoDolar).reduce((s,o)=>s+(parseFloat(o.resultadoDolar)||0),0);
  const temDolar=ops.some(o=>o.resultadoDolar);

  return (
    <div style={{minHeight:"100vh",background:t.bg,fontFamily:"system-ui,sans-serif",color:t.text}}>
      <div style={{background:t.header,borderBottom:`1px solid ${t.border}`,padding:"16px 24px",position:"sticky",top:0,zIndex:100,boxShadow:darkMode?"0 4px 20px rgba(0,0,0,0.4)":"0 2px 8px rgba(0,0,0,0.08)"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",borderRadius:10,padding:"8px 11px",fontSize:20}}>📒</div>
              <div>
                <h1 style={{fontSize:20,fontWeight:800,margin:0,background:"linear-gradient(135deg,#60a5fa,#93c5fd)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Diário de Trade</h1>
                <div style={{color:t.muted,fontSize:11,marginTop:1}}>{user.email}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              {[["Semana",semanaReais],["Mês",mesReais],["Total",totalReais]].map(([l,v])=>(
                <div key={l} style={{textAlign:"right"}}>
                  <div style={{color:t.muted,fontSize:10}}>{l} R$</div>
                  <div style={{color:v>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:13}}>{v>=0?"+":""}{v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                </div>
              ))}
              {temDolar&&<div style={{textAlign:"right"}}><div style={{color:t.muted,fontSize:10}}>Total USD</div><div style={{color:totalDolar>=0?"#f59e0b":"#f87171",fontWeight:700,fontSize:13}}>{totalDolar>=0?"+":""}{totalDolar.toLocaleString("en-US",{style:"currency",currency:"USD"})}</div></div>}
              <div style={{width:1,height:30,background:t.border}}/>
              <button onClick={()=>setShowRelatorio(true)} style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",border:"none",borderRadius:8,color:"#fff",padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:600}}>🤖 IA</button>
              <button onClick={()=>setDarkMode(d=>!d)} style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"8px 12px",cursor:"pointer",fontSize:16}}>{darkMode?"☀️":"🌙"}</button>
              <button onClick={onLogout} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,color:t.muted,padding:"8px 12px",cursor:"pointer",fontSize:12}}>Sair</button>
              <button onClick={()=>{setEditOp(null);setModal("add");}} style={{background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",border:"none",borderRadius:9,color:"#fff",padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 12px rgba(59,130,246,0.4)",whiteSpace:"nowrap"}}>＋ Nova Operação</button>
            </div>
          </div>
          <div style={{display:"flex",gap:2,marginTop:14}}>
            {[{id:"home",label:"🏠 Início"},{id:"journal",label:"📋 Diário"},{id:"analytics",label:"📊 Análises"}].map(tb=>(
              <button key={tb.id} onClick={()=>setTab(tb.id)} style={{padding:"9px 18px",borderRadius:"8px 8px 0 0",border:"none",background:tab===tb.id?t.bg:"transparent",color:tab===tb.id?t.accent:t.muted,fontWeight:tab===tb.id?700:400,fontSize:14,cursor:"pointer",borderBottom:tab===tb.id?`2px solid ${t.accent}`:"2px solid transparent"}}>{tb.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:960,margin:"0 auto",padding:"22px 16px"}}>
        {loadingOps?(
          <div style={{textAlign:"center",padding:60,color:t.muted,fontSize:15}}>⏳ Carregando operações...</div>
        ):(
          <>
            {tab==="home"&&<HomeTab ops={ops} t={t}/>}
            {tab==="journal"&&<JournalTab ops={ops} onEdit={handleEdit} onDelete={handleDelete} t={t}/>}
            {tab==="analytics"&&<AnalyticsTab ops={ops} t={t}/>}
          </>
        )}
      </div>
      {(modal==="add"||modal==="edit")&&(
        <Modal title={editOp?"✏️ Editar Operação":"＋ Nova Operação"} onClose={()=>{setModal(null);setEditOp(null);}} t={t}>
          <AddOpForm initial={editOp||undefined} onSave={handleSave} onClose={()=>{setModal(null);setEditOp(null);}} t={t}/>
        </Modal>
      )}
      {showRelatorio&&<RelatorioModal ops={ops} t={t} onClose={()=>setShowRelatorio(false)}/>}
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}