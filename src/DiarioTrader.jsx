/* eslint-disable no-unused-vars */

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { supabase } from "./supabaseClient";
// xlsx, jspdf e jspdf-autotable são carregados dinamicamente apenas quando usados
import { CotacoesPainel } from "./components/CotacoesPainel";
import BannerCarousel from "./components/BannerCarousel";

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
const ESTRATEGIAS = [
  {v:"trade_abertura",    label:"🔔 Trade de Abertura"},
  {v:"order_block",       label:"🟦 Order Block"},
  {v:"fv_order_block",    label:"🔷 Fair Value Order Block"},
  {v:"pullback_raso",     label:"〰️ Pullback Raso"},
  {v:"pullback_complexo", label:"🔁 Pullback Complexo"},
  {v:"pullback_profundo", label:"📉 Pullback Profundo"},
  {v:"trm",               label:"📊 TRM — Retorno às Médias"},
  {v:"fqe",               label:"⚡ FQE (Falha e Quebra de Estrutura)"},
  {v:"tc_supertrend",     label:"🚀 TC SuperTrend"},
  {v:"outro",             label:"✏️ Outro"},
];
const REGIOES = [
  {v:"suporte_Norte",label:"🟦 Suporte Norte",color:"#3b82f6"},
  {v:"suporte",label:"🔵 Suporte",color:"#60a5fa"},
  {v:"resistencia_Norte",label:"🟥 Resistência Norte",color:"#ef4444"},
  {v:"resistencia",label:"🔴 Resistência",color:"#f87171"},
  {v:"troca_polaridade",label:"🔄 Troca de Polaridade",color:"#a855f7"},
];

const WEEKDAYS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const DARK = {bg:"#090b10",card:"#0f1117",border:"#1c2035",text:"#e4e8f5",muted:"#4e5674",accent:"#5b8af5",input:"#0c0e16",header:"#07090e"};
const LIGHT = {bg:"#f4f6fb",card:"#ffffff",border:"#dde3f0",text:"#0d1224",muted:"#5c6480",accent:"#3b5fe2",input:"#ffffff",header:"#ffffff"};

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
    regiaoPreco:row.regiao_preco, fotos:(()=>{const f=row.foto;if(!f)return[];try{const p=JSON.parse(f);return Array.isArray(p)?p:[f];}catch{return f.startsWith("data:")?[f]:[];}})(), errosOperacao:row.erros_operacao||[],
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
    horaEntrada:row.hora_entrada||"",
    quantidadeContratos:row.quantidade_contratos!=null?String(row.quantidade_contratos):"",
    precoCompra:row.preco_compra!=null?String(row.preco_compra):"",
    precoVenda:row.preco_venda!=null?String(row.preco_venda):"",
    stopPontos:row.stop_pontos!=null?String(row.stop_pontos):"",
    parcialContratos:row.parcial_contratos!=null?String(row.parcial_contratos):"",
    parcialPontosMenos:(()=>{if(!row.parciais)return "";try{const a=JSON.parse(row.parciais);const p1=a.find(x=>x.p1Pontos!==undefined||x.saidaTotal!==undefined||x.saidaTotalMenos!==undefined);return p1&&p1.p1Pontos!=null?String(p1.p1Pontos):"";}catch{return "";}})(),
    parcialSaidaTotal:(()=>{if(!row.parciais)return null;try{const a=JSON.parse(row.parciais);const p1=a.find(x=>x.saidaTotal!==undefined);return p1!=null?p1.saidaTotal:null;}catch{return null;}})(),
    parcialSaidaTotalMenos:(()=>{if(!row.parciais)return null;try{const a=JSON.parse(row.parciais);const p1=a.find(x=>x.saidaTotalMenos!==undefined);return p1!=null?p1.saidaTotalMenos:null;}catch{return null;}})(),
    parciais:(()=>{if(!row.parciais)return [];try{const a=JSON.parse(row.parciais);return a.filter(x=>x.p1Pontos===undefined&&x.saidaTotal===undefined&&x.saidaTotalMenos===undefined);}catch{return [];}})(),
    saidaFinalTipo:row.saida_final_tipo||"",
    saidaFinalContratos:row.saida_final_contratos!=null?String(row.saida_final_contratos):"",
    saidaFinalPontos:row.saida_final_pontos!=null?String(row.saida_final_pontos):"",
    estrategia:row.estrategia||"",
    estrategiaOutro:row.estrategia_outro||"",
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
    regiao_preco:op.regiaoPreco, foto:(op.fotos&&op.fotos.length)?JSON.stringify(op.fotos):null, erros_operacao:op.errosOperacao||[],
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
    hora_entrada:op.horaEntrada||null,
    quantidade_contratos:op.quantidadeContratos!==""?parseFloat(op.quantidadeContratos):null,
    preco_compra:op.precoCompra!==""?parseFloat(op.precoCompra):null,
    preco_venda:op.precoVenda!==""?parseFloat(op.precoVenda):null,
    stop_pontos:op.stopPontos!==""?parseFloat(op.stopPontos):null,
    parcial_contratos:op.parcialContratos!==""?parseFloat(op.parcialContratos):null,
    saida_final_tipo:op.saidaFinalTipo||null,
    saida_final_contratos:op.saidaFinalContratos!==""?parseFloat(op.saidaFinalContratos):null,
    saida_final_pontos:op.saidaFinalPontos!==""?parseFloat(op.saidaFinalPontos):null,
    estrategia:op.estrategia||null,
    estrategia_outro:op.estrategiaOutro||null,
    parciais:(()=>{const extras=op.parciais||[];const p1={};if(op.parcialPontosMenos)p1.p1Pontos=op.parcialPontosMenos;if(op.parcialSaidaTotal!=null)p1.saidaTotal=op.parcialSaidaTotal;if(op.parcialSaidaTotalMenos!=null)p1.saidaTotalMenos=op.parcialSaidaTotalMenos;const arr=Object.keys(p1).length>0?[p1,...extras]:extras;return arr.length>0?JSON.stringify(arr):null;})(),
  };
}
const EMPTY_FORM = {
  data:hojeStr(), ativo:"", mercadoMacro:"", direcao:"", resultadoPontos:"", resultadoReais:"",
  resultadoDolar:"", cotacaoDolar:"",
  sentimento:"", descricao:"", medias:[], tipoEntrada:"", retracao:false, nivelRetracao:"",
  movimento:"", mercadoEsticado:null, pegouLiquidez:null, regiaoPreco:"", fotos:[],
  errosOperacao:[], impedimentos:[],
  timeframeEntrada:"", seguiuOperacional:null, seguiuGerenciamento:null,
  resultadoGainStop:"", riscoRetorno:"", riscoRetornoCustom:"",
  fezParcial:null, parcialRR:"", parcialRRCustom:"", parcialMotivoMenos:"", parcialPontosMenos:"",
  parcialSaidaTotal:null, parcialSaidaTotalMenos:null,
  // Múltiplas parciais (array de até 3 objetos {contratos, pontos})
  parciais:[],
  // Novos campos
  horaEntrada:"", quantidadeContratos:"", precoCompra:"", precoVenda:"",
  stopPontos:"",
  parcialContratos:"",
  saidaFinalTipo:"", saidaFinalContratos:"", saidaFinalPontos:"",
  saidaFinalStopTipo:"inicial", saidaFinalStopCustom:"",
  estrategia:"", estrategiaOutro:"",
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
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
    <div style={{background:"#0a0a0a",border:`1px solid #1a1a1a`,borderRadius:12,padding:"16px 20px",flex:1,minWidth:140,transition:"border .2s"}}>
      <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
      <div style={{color:"#444",fontSize:12,fontWeight:600,marginBottom:4,letterSpacing:"0.3px"}}>{label}</div>
      <div style={{color:color||t.text,fontWeight:800,fontSize:18,wordBreak:"break-word"}}>{value}</div>
    </div>
  );
}
function Toast({msg,type,onDone}) {
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[onDone]);
  return <div style={{position:"fixed",bottom:32,right:32,background:"#0a0a0a",border:`1px solid ${type==="error"?"#ff4d4d":"#00ff88"}`,borderLeft:`4px solid ${type==="error"?"#ff4d4d":"#00ff88"}`,padding:"14px 20px",borderRadius:10,color:"#e8eaf0",fontSize:14,zIndex:9999,boxShadow:"0 8px 30px rgba(0,0,0,0.8)",maxWidth:320}}>{msg}</div>;
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
      {!ehFuturosBR&&(
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:16}}>
          <div style={{flex:1,minWidth:140}}>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📊 Resultado em Pontos</label>
            <input type="number" placeholder="ex: 150 ou -80" value={f.resultadoPontos} onChange={e=>set("resultadoPontos",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box"}}/>
          </div>
          <div style={{flex:1,minWidth:150}}>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>💰 Resultado em R$</label>
            <input type="number" placeholder="ex: 300.00 ou -150.00" value={f.resultadoReais} onChange={e=>set("resultadoReais",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box"}}/>
            {previewConversao&&f.resultadoReais===""&&(
              <div style={{color:"#a78bfa",fontSize:10,marginTop:3}}>
                💡 Sugestão via USD: R$ {previewConversao} —{" "}
                <span onClick={()=>set("resultadoReais",previewConversao)} style={{color:"#60a5fa",cursor:"pointer",textDecoration:"underline"}}>aplicar</span>
              </div>
            )}
          </div>
        </div>
      )}
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
  const [numParciaisExtras, setNumParciaisExtras] = useState(()=>initial?.parciais?.length||0);
  const [showAddEst, setShowAddEst] = useState(false);
  const [novaEst, setNovaEst] = useState("");
  const [estrategiasCustom, setEstrategiasCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem("estrategias_custom") || "[]"); } catch { return []; }
  });
  const [f,setF]=useState(()=>initial?{
    ...EMPTY_FORM,...initial,
    medias:initial.medias||[],
    impedimentos:initial.impedimentos||[],
    errosOperacao:initial.errosOperacao||[],
    parciais:initial.parciais||[],
    parcialSaidaTotal: initial.parcialSaidaTotal ?? ((initial.parciais||[]).length>0 ? false : null),
    parcialSaidaTotalMenos: initial.parcialSaidaTotalMenos ?? ((initial.parciais||[]).length>0 && initial.parcialRR==="Menos que 1x1" ? false : null),
  }:{...EMPTY_FORM,parciais:[]});

  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const toggleErro=(v)=>setF(p=>({...p,errosOperacao:p.errosOperacao.includes(v)?p.errosOperacao.filter(x=>x!==v):[...p.errosOperacao,v]}));
  const isFutBRForm = isFuturosBR(f.ativo);
  const valid=f.data&&f.ativo&&f.direcao&&(isFutBRForm?f.resultadoGainStop!=="":f.resultadoPontos!==""||f.resultadoDolar!=="");
  const inp={background:t.input,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"10px 14px",fontSize:14,outline:"none"};
  const {cotacao:cotacaoApi,loading:loadingCotacao,buscar:buscarCotacao}=useCotacaoDolar();

  return (
    <div>
      <Section icon="📅" title="Data e Hora" t={t}>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <input type="date" value={f.data} onChange={e=>set("data",e.target.value)} style={inp}/>
          {f.data&&<div style={{background:t.border+"44",border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 16px",color:t.accent,fontWeight:700,fontSize:14}}>{getWeekday(f.data)}</div>}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <label style={{color:t.muted,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>⏰ Hora entrada:</label>
            <input type="time" value={f.horaEntrada} onChange={e=>set("horaEntrada",e.target.value)} style={{...inp,width:120}}/>
          </div>
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

      {/* ── OPERAÇÃO ── */}
      <Section icon="🎯" title="Operação" t={t} accent={f.direcao==="Compra"?"#22c55e":f.direcao==="Venda"?"#ef4444":t.accent}>
        <div style={{marginBottom:14}}>
          <div style={{color:t.muted,fontSize:11,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>A operação foi?</div>
          <div style={{display:"flex",gap:10}}>
            {[["Compra","🟢 COMPRA","#22c55e"],["Venda","🔴 VENDA","#ef4444"]].map(([val,label,cor])=>(
              <button key={val} onClick={()=>set("direcao",f.direcao===val?"":val)}
                style={{flex:1,padding:"16px 0",borderRadius:12,cursor:"pointer",fontWeight:900,fontSize:18,
                  border:`2px solid ${f.direcao===val?cor:t.border}`,
                  background:f.direcao===val?cor+"22":"transparent",
                  color:f.direcao===val?cor:t.muted,transition:"all .15s",letterSpacing:0.5}}
              >{label}</button>
            ))}
          </div>
        </div>
        {f.direcao&&(
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
            <div style={{flex:"0 0 130px"}}>
              <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📦 Contratos</label>
              <input type="number" min="1" placeholder="ex: 10" value={f.quantidadeContratos} onChange={e=>set("quantidadeContratos",e.target.value)}
                style={{...inp,width:"100%",boxSizing:"border-box",border:`1px solid ${f.direcao==="Compra"?"#22c55e55":"#ef444455"}`}}/>
            </div>
            <div style={{flex:1,minWidth:160}}>
                <label style={{display:"block",fontSize:12,marginBottom:6,fontWeight:600,color:f.direcao==="Compra"?"#4ade80":"#f87171"}}>
                  {f.direcao==="Compra"?"💚 Preço de Entrada (Compra)":"🔴 Preço de Entrada (Venda)"}
                </label>
                <input type="number" step={isFuturosBR(f.ativo)?"0.5":"0.01"} placeholder={isFuturosBR(f.ativo)?"ex: 135450":"ex: 2075.50"} value={f.direcao==="Compra"?f.precoCompra:f.precoVenda}
                  onChange={e=>set(f.direcao==="Compra"?"precoCompra":"precoVenda",e.target.value)}
                  style={{...inp,width:"100%",boxSizing:"border-box",border:`1px solid ${f.direcao==="Compra"?"#22c55e55":"#ef444455"}`}}/>
              </div>
          </div>
        )}
        {f.direcao&&isFuturosBR(f.ativo)&&(()=>{
          const cts=parseFloat(f.quantidadeContratos)||1;
          const pts=parseFloat(f.stopPontos)||0;
          const isWDO=f.ativo==="WDOFUT";
          const vlrPorPonto=isWDO?10:0.20;
          const vlrStop=pts*vlrPorPonto*cts;
          return (
            <div style={{borderTop:`1px solid ${t.border}`,paddingTop:14}}>
              <div style={{color:"#f87171",fontSize:11,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>🛑 Stop da Operação</div>
              <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
                <div style={{flex:"0 0 160px"}}>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>Pontos de Stop</label>
                  <input type="number" step={isWDO?0.5:1} placeholder={isWDO?"ex: 50":"ex: 300"} value={f.stopPontos}
                    onChange={e=>set("stopPontos",e.target.value)}
                    style={{...inp,width:"100%",boxSizing:"border-box",border:"1px solid #ef444455"}}/>
                </div>
                {pts>0&&(
                  <div style={{background:"#ef444410",border:"1px solid #ef444433",borderRadius:10,padding:"10px 14px",flex:1,minWidth:160}}>
                    <div style={{color:"#f87171",fontSize:10,fontWeight:700,marginBottom:3}}>💸 RISCO CALCULADO</div>
                    <div style={{color:"#ef4444",fontWeight:800,fontSize:16}}>-R$ {vlrStop.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                    <div style={{color:t.muted,fontSize:10,marginTop:2}}>{pts} pts × R${vlrPorPonto.toFixed(2)}/pt × {cts} ct{cts>1?"s":""}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Section>

      {/* ── ESTRATÉGIA — logo abaixo de Compra/Venda ── */}
      <Section icon="🎯" title="Estratégia da Operação" t={t} accent="#f59e0b">
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
          {/* Fixas */}
          {[
            {v:"trade_abertura", label:"🔔 Trade de Abertura"},
            {v:"pullback_raso",  label:"〰️ Pullback Raso"},
            {v:"fqe",            label:"⚡ FQE (Falha e Quebra de Estrutura)"},
          ].map(op=>(
            <Pill key={op.v} label={op.label}
              selected={f.estrategia===op.v}
              onClick={()=>set("estrategia",f.estrategia===op.v?"":op.v)}
              color="#f59e0b" t={t}/>
          ))}
          {/* Estratégias customizadas salvas */}
          {estrategiasCustom.map(est=>{
            const sel=f.estrategia===est;
            return (
              <div key={est} style={{position:"relative",display:"inline-flex"}}>
                <Pill label={est}
                  selected={sel}
                  onClick={()=>set("estrategia",sel?"":est)}
                  color="#f59e0b" t={t}/>
                <button
                  onClick={e=>{
                    e.stopPropagation();
                    const atualizado=estrategiasCustom.filter(e=>e!==est);
                    setEstrategiasCustom(atualizado);
                    localStorage.setItem("estrategias_custom",JSON.stringify(atualizado));
                    if(f.estrategia===est) set("estrategia","");
                  }}
                  title="Remover estratégia"
                  style={{position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",fontSize:9,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,padding:0}}>
                  ✕
                </button>
              </div>
            );
          })}
          {/* Botão adicionar */}
          <button onClick={()=>setShowAddEst(v=>!v)}
            style={{padding:"6px 14px",borderRadius:20,border:`1.5px dashed #f59e0b88`,background:"transparent",color:"#f59e0b",fontWeight:700,fontSize:12,cursor:"pointer",letterSpacing:"0.3px"}}>
            {showAddEst ? "✕ Cancelar" : "+ Adicionar Estratégia"}
          </button>
        </div>
        {showAddEst&&(
          <div style={{background:t.card,border:`1px solid #f59e0b44`,borderRadius:10,padding:12,marginTop:4}}>
            <div style={{color:"#f59e0b",fontSize:11,fontWeight:700,marginBottom:8}}>
              ✏️ Nova Estratégia
            </div>
            <div style={{color:t.muted,fontSize:11,marginBottom:8,fontStyle:"italic"}}>
              * Escreva sempre da mesma forma — funciona na análise de operações
            </div>
            <div style={{display:"flex",gap:8}}>
              <input
                type="text"
                placeholder="Ex: Rompimento de Máxima..."
                value={novaEst}
                onChange={e=>setNovaEst(e.target.value)}
                onKeyDown={e=>{
                  if(e.key==="Enter"&&novaEst.trim()){
                    const nova=novaEst.trim();
                    if(!estrategiasCustom.includes(nova)){
                      const atualizado=[...estrategiasCustom,nova];
                      setEstrategiasCustom(atualizado);
                      localStorage.setItem("estrategias_custom",JSON.stringify(atualizado));
                    }
                    set("estrategia",nova);
                    setNovaEst("");
                    setShowAddEst(false);
                  }
                }}
                style={{...inp,flex:1,fontSize:13}}
                autoFocus
              />
              <button
                onClick={()=>{
                  const nova=novaEst.trim();
                  if(!nova) return;
                  if(!estrategiasCustom.includes(nova)){
                    const atualizado=[...estrategiasCustom,nova];
                    setEstrategiasCustom(atualizado);
                    localStorage.setItem("estrategias_custom",JSON.stringify(atualizado));
                  }
                  set("estrategia",nova);
                  setNovaEst("");
                  setShowAddEst(false);
                }}
                style={{padding:"10px 20px",borderRadius:8,border:"none",background:"#f59e0b",color:"#000",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                Adicionar
              </button>
            </div>
          </div>
        )}
      </Section>
      <div style={{display:"flex",alignItems:"center",gap:10,margin:"20px 0 10px 0"}}>
        <div style={{flex:1,height:1,background:t.border}}/>
        <div style={{color:t.muted,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",whiteSpace:"nowrap",padding:"4px 16px",border:`1px solid ${t.border}`,borderRadius:999,background:t.card}}>⚙️ FILTROS</div>
        <div style={{flex:1,height:1,background:t.border}}/>
      </div>

      <Section icon="🌐" title="Tendência Macro" t={t}>
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
      <Section icon="📋" title="Seguiu o Operacional?" t={t} accent="#22c55e">
        <SimNao value={f.seguiuOperacional} onChange={v=>set("seguiuOperacional",v)} t={t}/>
      </Section>
      <Section icon="⚖️" title="Seguiu o Gerenciamento?" t={t} accent="#3b82f6">
        <SimNao value={f.seguiuGerenciamento} onChange={v=>set("seguiuGerenciamento",v)} t={t}/>
      </Section>

      <Section icon="🏁" title="Resultado" t={t} accent={f.resultadoGainStop==="Gain"?"#22c55e":f.resultadoGainStop==="Stop"?"#ef4444":f.resultadoGainStop==="Zero"?"#f59e0b":t.accent}>
        <div style={{display:"flex",gap:10}}>
          {[["Gain","🏆 Gain","#22c55e"],["Zero","➡️ Zero","#f59e0b"],["Stop","🛑 Stop","#ef4444"]].map(([val,label,cor])=>(
            <button key={val} onClick={()=>{
              const novoVal=f.resultadoGainStop===val?"":val;
              set("resultadoGainStop",novoVal);
              if(novoVal==="Zero"){ set("resultadoReais","0"); set("resultadoPontos","0"); set("resultadoDolar","0"); }
            }}
              style={{flex:1,padding:"14px 0",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:16,
                border:`2px solid ${f.resultadoGainStop===val?cor:t.border}`,
                background:f.resultadoGainStop===val?cor+"22":"transparent",
                color:f.resultadoGainStop===val?cor:t.muted,transition:"all .15s"}}
            >{label}</button>
          ))}
        </div>
        {f.resultadoGainStop==="Gain"&&isFutBRForm&&(
          <div style={{marginTop:14,background:t.bg,border:"1px solid #22c55e33",borderRadius:10,padding:"14px 16px"}}>
            <label style={{display:"block",color:"#4ade80",fontSize:12,marginBottom:6,fontWeight:600}}>📐 Risco Retorno — Quantos pontos a operação pagou?</label>
            <input type="number" step={f.ativo==="WDOFUT"?0.5:1} min="0" placeholder={f.ativo==="WDOFUT"?"ex: 50":"ex: 250"}
              value={f.riscoRetornoCustom||""}
              onChange={e=>set("riscoRetornoCustom",e.target.value)}
              style={{...inp,width:"100%",boxSizing:"border-box",border:"1px solid #22c55e55"}}/>
            <div style={{color:t.muted,fontSize:10,marginTop:4}}>📊 Apenas para base de análise — Risco Retorno da operação</div>
          </div>
        )}
        {f.resultadoGainStop==="Zero"&&isFutBRForm&&(
          <div style={{marginTop:14,background:t.bg,border:"1px solid #f59e0b33",borderRadius:10,padding:"14px 16px"}}>
            <div style={{color:"#f59e0b",fontWeight:700,fontSize:12,marginBottom:2}}>➡️ Resultado: ZERO</div>
            <div style={{color:t.muted,fontSize:10,marginBottom:10}}>Resultado financeiro: R$ 0,00</div>
            <div style={{color:"#f59e0b",fontWeight:700,fontSize:12,marginBottom:6}}>📐 Risco Retorno — Quantos pontos a operação pagou?</div>
            <input type="number" step={f.ativo==="WDOFUT"?0.5:1} min="0" placeholder="ex: 150"
              value={f.riscoRetornoCustom||""}
              onChange={e=>set("riscoRetornoCustom",e.target.value)}
              style={{...inp,width:"100%",boxSizing:"border-box",border:"1px solid #f59e0b55"}}/>
            <div style={{color:t.muted,fontSize:10,marginTop:6}}>📊 Apenas para base de análise posterior</div>
          </div>
        )}
        {f.resultadoGainStop==="Stop"&&isFutBRForm&&(
          <div style={{marginTop:14,background:"#ef444408",border:"1px solid #ef444433",borderRadius:10,padding:"12px 16px"}}>
            <div style={{color:"#f87171",fontWeight:700,fontSize:12}}>🛑 Stop registrado — o resultado será calculado pela Saída Final ou Parciais abaixo</div>
          </div>
        )}
        {(f.resultadoGainStop==="Gain"||f.resultadoGainStop==="Stop")&&!isFutBRForm&&(()=>{
          const isGain=f.resultadoGainStop==="Gain";
          const cor=isGain?"#22c55e":"#ef4444";
          const taxa=parseFloat(f.cotacaoDolar||cotacaoApi||0);
          const usd=parseFloat(f.resultadoDolar||"");
          const reaisCalc=taxa>0&&!isNaN(usd)&&f.resultadoDolar!==""?(usd*taxa):null;
          return (
            <div style={{marginTop:14,background:t.bg,border:`1px solid ${cor}33`,borderRadius:10,padding:"14px 16px"}}>
              <div style={{color:isGain?"#4ade80":"#f87171",fontWeight:700,fontSize:12,marginBottom:10}}>{isGain?"🏆 Gain registrado":"🛑 Stop registrado"}</div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
                <div style={{flex:1,minWidth:140}}>
                  <label style={{display:"block",color:t.muted,fontSize:11,marginBottom:5,fontWeight:600}}>💵 Resultado em USD</label>
                  <input type="number" step="0.01" placeholder={isGain?"ex: 150.00":"ex: -150.00"}
                    value={f.resultadoDolar||""}
                    onChange={e=>{
                      set("resultadoDolar",e.target.value);
                      const taxa2=parseFloat(cotacaoApi||0);
                      const v=parseFloat(e.target.value)||0;
                      if(taxa2>0){ set("cotacaoDolar",String(taxa2)); set("resultadoReais",(v*taxa2).toFixed(2)); }
                    }}
                    style={{...inp,width:"100%",boxSizing:"border-box",border:`1px solid ${cor}55`}}/>
                </div>
                <div style={{flex:"0 0 160px"}}>
                  <label style={{display:"block",color:t.muted,fontSize:11,marginBottom:5,fontWeight:600}}>📐 Total de Pontos</label>
                  <input type="number" placeholder="ex: 150 ou -80"
                    value={f.resultadoPontos||""}
                    onChange={e=>set("resultadoPontos",e.target.value)}
                    style={{...inp,width:"100%",boxSizing:"border-box",border:`1px solid ${cor}55`}}/>
                </div>
                <div style={{minWidth:120,background:"#f59e0b10",border:"1px solid #f59e0b33",borderRadius:8,padding:"8px 12px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
                  <div style={{color:t.muted,fontSize:9,fontWeight:700}}>📈 USD/BRL AO VIVO</div>
                  {cotacaoApi
                    ? <div style={{color:"#f59e0b",fontWeight:900,fontSize:18}}>R$ {cotacaoApi}</div>
                    : <button onClick={buscarCotacao} style={{background:"transparent",border:"1px solid #f59e0b44",borderRadius:6,color:"#f59e0b",padding:"4px 8px",cursor:"pointer",fontSize:11}}>🔄 Buscar</button>
                  }
                  <div style={{color:t.muted,fontSize:9}}>cotação atual</div>
                </div>
                {reaisCalc!==null&&(
                  <div style={{flex:1,minWidth:140,background:isGain?"#22c55e10":"#ef444410",border:`1px solid ${cor}33`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                    <div style={{color:t.muted,fontSize:9,fontWeight:700,marginBottom:2}}>RESULTADO EM R$</div>
                    <div style={{color:isGain?"#4ade80":"#f87171",fontWeight:900,fontSize:20}}>{reaisCalc>=0?"+":"-"}R$ {Math.abs(reaisCalc).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                    <div style={{color:t.muted,fontSize:9,marginTop:1}}>$ {Math.abs(usd).toFixed(2)} × {taxa.toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {f.resultadoGainStop==="Zero"&&!isFutBRForm&&(
          <div style={{marginTop:14,background:t.bg,border:"1px solid #f59e0b33",borderRadius:10,padding:"14px 16px"}}>
            <div style={{color:"#f59e0b",fontWeight:700,fontSize:12,marginBottom:2}}>➡️ Resultado: ZERO</div>
            <div style={{color:t.muted,fontSize:10}}>Resultado financeiro: $ 0,00 / R$ 0,00</div>
          </div>
        )}
      </Section>

      {/* ══════════════════════════ FEZ PARCIAL? ══════════════════════════ */}
      {f.resultadoGainStop!=="Zero"&&isFutBRForm&&<Section icon="✂️" title="Fez Parcial?" t={t} accent="#a855f7">
        <SimNao value={f.fezParcial} onChange={v=>{
          set("fezParcial",v);
          if(!v){
            set("parcialRR",""); set("parcialMotivoMenos",""); set("parcialContratos","");
            set("parcialPontosMenos",""); set("parcialSaidaTotal",null); set("parcialSaidaTotalMenos",null);
            set("parciais",[]); setNumParciaisExtras(0);
          }
        }} t={t}/>

        {f.fezParcial===true&&(()=>{
          const stopPts   = parseFloat(f.stopPontos)||0;
          const totalCts  = parseFloat(f.quantidadeContratos)||0;
          const isWDO     = f.ativo==="WDOFUT";
          const vlr       = isWDO?10:0.20;
          const isFutBR   = isFuturosBR(f.ativo);

          // contratos já usados na P1 (depende do tipo)
          const cts1 = parseFloat(f.parcialContratos)||0;
          // para calcular restante das extras
          const ctsRestantes = totalCts - cts1;
          const ctsUsadosExtras = (f.parciais||[]).reduce((s,p)=>s+(parseFloat(p.contratos)||0),0);

          const calcVlr=(cts,pts)=>(parseFloat(cts)||0)*(parseFloat(pts)||0)*vlr;

          // Bloco de parciais extras (compartilhado entre 1x1, 2x1, Menos)
          const renderParciaisExtras = (corAcento, ptosP1Auto) => {
            return (
              <div style={{marginTop:14}}>
                {/* Selector +1 +2 +3 */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                  <div style={{color:corAcento,fontSize:12,fontWeight:700}}>Parciais extras:</div>
                  {[1,2,3].map(n=>(
                    <button key={n}
                      onClick={()=>{
                        setNumParciaisExtras(n);
                        const novo=[];
                        for(let i=0;i<n;i++) novo.push({contratos:"",pontos:""});
                        set("parciais",novo);
                      }}
                      style={{padding:"7px 18px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,
                        border:`2px solid ${numParciaisExtras===n?corAcento:t.border}`,
                        background:numParciaisExtras===n?corAcento+"22":"transparent",
                        color:numParciaisExtras===n?corAcento:t.muted}}
                    >+{n}</button>
                  ))}
                </div>

                {/* Cards extras */}
                {(f.parciais||[]).map((p,idx)=>{
                  const ctsUsadosAntes=(f.parciais||[]).slice(0,idx).reduce((s,x)=>s+(parseFloat(x.contratos)||0),0);
                  const ctsMax = ctsRestantes - ctsUsadosAntes;
                  const vlrCard = calcVlr(p.contratos, p.pontos);
                  return (
                    <div key={idx} style={{background:t.bg,border:`1px solid ${corAcento}44`,borderRadius:10,padding:14,marginBottom:10}}>
                      <div style={{color:corAcento,fontWeight:700,fontSize:12,marginBottom:10}}>✂️ PARCIAL {idx+2}</div>
                      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
                        <div>
                          <label style={{display:"block",color:corAcento,fontSize:12,marginBottom:5,fontWeight:600}}>
                            Contratos <span style={{color:t.muted,fontWeight:400}}>(máx: {ctsMax})</span>
                          </label>
                          <input type="number" min="1" max={ctsMax} placeholder={`máx ${ctsMax}`}
                            value={p.contratos}
                            onChange={e=>{
                              const v=Math.min(parseFloat(e.target.value)||0,ctsMax);
                              const novo=[...(f.parciais||[])];
                              novo[idx]={...novo[idx],contratos:String(v)};
                              set("parciais",novo);
                            }}
                            style={{...inp,width:110,border:`1px solid ${corAcento}55`}}/>
                        </div>
                        <div>
                          <label style={{display:"block",color:corAcento,fontSize:12,marginBottom:5,fontWeight:600}}>Pontos realizados</label>
                          <input type="number" step={isWDO?0.5:1} placeholder="ex: -250 (stop) ou 200"
                            value={p.pontos}
                            onChange={e=>{
                              const novo=[...(f.parciais||[])];
                              novo[idx]={...novo[idx],pontos:e.target.value};
                              set("parciais",novo);
                            }}
                            style={{...inp,width:130,border:`1px solid ${corAcento}55`}}/>
                        </div>
                        {vlrCard!==0&&(
                          <div style={{background:corAcento+"10",border:`1px solid ${corAcento}33`,borderRadius:8,padding:"8px 12px",flex:1}}>
                            <div style={{color:corAcento,fontSize:10,fontWeight:700}}>💰 P{idx+2}</div>
                            <div style={{color:vlrCard>=0?"#4ade80":"#f87171",fontWeight:800,fontSize:15}}>{vlrCard>=0?"+R$ ":"-R$ "}{Math.abs(vlrCard).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                            <div style={{color:t.muted,fontSize:10}}>{p.pontos} pts × {p.contratos} ct</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Total geral */}
                {(()=>{
                  const vlrP1 = ptosP1Auto>0&&cts1>0 ? calcVlr(cts1,ptosP1Auto) : 0;
                  const vlrExtras=(f.parciais||[]).reduce((s,p)=>s+calcVlr(p.contratos,p.pontos),0);
                  const total=vlrP1+vlrExtras;
                  if(vlrP1===0&&vlrExtras===0) return null;
                  return (
                    <div style={{background:corAcento+"15",border:`2px solid ${corAcento}55`,borderRadius:10,padding:"12px 16px",marginTop:8}}>
                      <div style={{color:corAcento,fontSize:11,fontWeight:700,marginBottom:6}}>🏆 TOTAL PARCIAIS</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:4}}>
                        {cts1>0&&ptosP1Auto>0&&<span style={{color:vlrP1>=0?corAcento:"#f87171",fontSize:12}}>P1: {vlrP1>=0?"+R$ ":"-R$ "}{Math.abs(vlrP1).toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>}
                        {(f.parciais||[]).map((p,idx)=>{const v=calcVlr(p.contratos,p.pontos);return v!==0?<span key={idx} style={{color:v>=0?corAcento:"#f87171",fontSize:12}}>P{idx+2}: {v>=0?"+R$ ":"-R$ "}{Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>:null;})}
                      </div>
                      <div style={{color:total>=0?"#4ade80":"#f87171",fontWeight:900,fontSize:20}}>{total>=0?"+R$ ":"-R$ "}{Math.abs(total).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                    </div>
                  );
                })()}
              </div>
            );
          };

          return (
            <div style={{marginTop:12}}>

              {/* ── BOTÕES TIPO PARCIAL ── */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                {[
                  {val:"Menos que 1x1",label:"⚠️ Menos 1x1",color:"#f87171"},
                  {val:"1x1",          label:"🎯 1x1",        color:"#a855f7"},
                  {val:"2x1",          label:"🚀 2x1",        color:"#a855f7"},
                ].map(({val,label,color})=>{
                  const sel=f.parcialRR===val;
                  return (
                    <button key={val} onClick={()=>{
                      set("parcialRR",sel?"":val);
                      set("parcialSaidaTotal",null);
                      set("parcialSaidaTotalMenos",null);
                      set("parcialMotivoMenos","");
                      set("parcialContratos","");
                      set("parcialPontosMenos","");
                      set("parciais",[]);
                      setNumParciaisExtras(0);
                    }}
                    style={{flex:1,padding:"12px 0",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14,
                      border:`2px solid ${sel?color:t.border}`,
                      background:sel?color+"22":"transparent",
                      color:sel?color:t.muted,transition:"all .15s"}}
                    >{label}</button>
                  );
                })}
              </div>

              {/* ══════════ MENOS QUE 1x1 ══════════ */}
              {f.parcialRR==="Menos que 1x1"&&(
                <div style={{background:"#ef444410",border:"1px solid #ef444433",borderRadius:10,padding:16,marginBottom:8}}>

                  {/* Motivo */}
                  <div style={{color:"#f87171",fontWeight:700,fontSize:13,marginBottom:10}}>⚠️ Por que saiu abaixo de 1x1?</div>
                  <textarea placeholder="Descreva o motivo..." value={f.parcialMotivoMenos||""}
                    onChange={e=>set("parcialMotivoMenos",e.target.value)} rows={2}
                    style={{...inp,width:"100%",boxSizing:"border-box",marginBottom:14,border:"1px solid #ef444455",background:"#ef444408",fontFamily:"inherit"}}/>

                  {/* Dois botões */}
                  <div style={{display:"flex",gap:10,marginBottom:f.parcialSaidaTotalMenos!=null?14:0}}>
                    {[[true,"✅ Sim, saída total","#22c55e"],[false,"➕ Adicionar mais parciais","#f87171"]].map(([val,label,color])=>(
                      <button key={String(val)}
                        onClick={()=>{
                          set("parcialSaidaTotalMenos",f.parcialSaidaTotalMenos===val?null:val);
                          set("parcialContratos",""); set("parciais",[]); setNumParciaisExtras(0);
                        }}
                        style={{flex:1,padding:"12px 8px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
                          border:`2px solid ${f.parcialSaidaTotalMenos===val?color:t.border}`,
                          background:f.parcialSaidaTotalMenos===val?color+"22":"transparent",
                          color:f.parcialSaidaTotalMenos===val?color:t.muted}}
                      >{label}</button>
                    ))}
                  </div>

                  {/* MENOS → Sim saída total */}
                  {f.parcialSaidaTotalMenos===true&&isFutBR&&(()=>{
                    const pts = parseFloat(f.parcialPontosMenos)||0;
                    const vlrCalc = pts>0 ? pts*vlr*totalCts : 0;
                    return (
                      <div style={{marginTop:4}}>
                        <label style={{display:"block",color:"#f87171",fontSize:12,marginBottom:6,fontWeight:600}}>Pontos realizados</label>
                        <input type="number" step={isWDO?0.5:1} min="0" placeholder="ex: 50"
                          value={f.parcialPontosMenos||""}
                          onChange={e=>set("parcialPontosMenos",e.target.value)}
                          style={{...inp,width:180,border:"1px solid #ef444455",marginBottom:10}}/>
                        <div style={{background:"#ef444415",border:"1px solid #ef444444",borderRadius:10,padding:"14px 16px"}}>
                          <div style={{color:"#f87171",fontSize:11,fontWeight:700,marginBottom:4}}>📦 CONTRATOS (bloqueado)</div>
                          <div style={{color:t.text,fontWeight:800,fontSize:18,marginBottom:pts>0?10:0}}>{totalCts} contratos</div>
                          {pts>0&&(
                            <>
                              <div style={{color:"#f87171",fontSize:11,fontWeight:700,marginBottom:2}}>💰 RESULTADO</div>
                              <div style={{color:"#f87171",fontWeight:800,fontSize:20}}>+R$ {vlrCalc.toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                              <div style={{color:t.muted,fontSize:10,marginTop:4}}>{pts} pts × R${vlr}/pt × {totalCts} ct</div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* MENOS → Adicionar mais parciais */}
                  {f.parcialSaidaTotalMenos===false&&isFutBR&&(
                    <div style={{marginTop:4}}>
                      {/* Contratos e pontos da P1 (Menos) */}
                      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:10}}>
                        <div>
                          <label style={{display:"block",color:"#f87171",fontSize:12,marginBottom:6,fontWeight:600}}>
                            Contratos P1 <span style={{color:t.muted,fontWeight:400}}>(máx: {totalCts})</span>
                          </label>
                          <input type="number" min="1" max={totalCts}
                            value={f.parcialContratos||""}
                            onChange={e=>{const v=Math.min(parseFloat(e.target.value)||0,totalCts);set("parcialContratos",String(v));}}
                            style={{...inp,width:120,border:"1px solid #ef444455"}}/>
                        </div>
                        <div>
                          <label style={{display:"block",color:"#f87171",fontSize:12,marginBottom:6,fontWeight:600}}>Pontos realizados P1</label>
                          <input type="number" step={isWDO?0.5:1} min="0" placeholder="ex: 50"
                            value={f.parcialPontosMenos||""}
                            onChange={e=>set("parcialPontosMenos",e.target.value)}
                            style={{...inp,width:140,border:"1px solid #ef444455"}}/>
                        </div>
                      </div>
                      {cts1>0&&(parseFloat(f.parcialPontosMenos)||0)>0&&(
                        <div style={{background:"#f8717110",border:"1px solid #f8717133",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                          <div style={{color:"#f87171",fontSize:10,fontWeight:700}}>💰 P1 Menos 1x1</div>
                          <div style={{color:"#f87171",fontWeight:800,fontSize:16}}>+R$ {calcVlr(cts1,f.parcialPontosMenos).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                          <div style={{color:t.muted,fontSize:10}}>{f.parcialPontosMenos} pts × {cts1} ct · Restam: {ctsRestantes} ct</div>
                        </div>
                      )}
                      {renderParciaisExtras("#f87171", parseFloat(f.parcialPontosMenos)||0)}
                    </div>
                  )}
                </div>
              )}

              {/* ══════════ 1x1 ══════════ */}
              {f.parcialRR==="1x1"&&(
                <div style={{background:"#a855f710",border:"1px solid #a855f733",borderRadius:10,padding:16,marginBottom:8}}>

                  {/* Dois botões */}
                  <div style={{display:"flex",gap:10,marginBottom:f.parcialSaidaTotal!=null?14:0}}>
                    {[[true,"✅ Sim, saída total","#22c55e"],[false,"➕ Adicionar mais parciais","#a855f7"]].map(([val,label,color])=>(
                      <button key={String(val)}
                        onClick={()=>{
                          set("parcialSaidaTotal",f.parcialSaidaTotal===val?null:val);
                          set("parcialContratos",""); set("parciais",[]); setNumParciaisExtras(0);
                        }}
                        style={{flex:1,padding:"12px 8px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
                          border:`2px solid ${f.parcialSaidaTotal===val?color:t.border}`,
                          background:f.parcialSaidaTotal===val?color+"22":"transparent",
                          color:f.parcialSaidaTotal===val?color:t.muted}}
                      >{label}</button>
                    ))}
                  </div>

                  {/* 1x1 → Sim saída total */}
                  {f.parcialSaidaTotal===true&&isFutBR&&(
                    <div style={{background:"#a855f715",border:"1px solid #a855f744",borderRadius:10,padding:"14px 16px"}}>
                      {stopPts>0?(
                        <>
                          <div style={{color:"#c084fc",fontSize:11,fontWeight:700,marginBottom:8}}>📦 CONTRATOS (bloqueado)</div>
                          <div style={{color:t.text,fontWeight:800,fontSize:18,marginBottom:10}}>{totalCts} contratos</div>
                          <div style={{color:"#c084fc",fontSize:11,fontWeight:700,marginBottom:4}}>🎯 RESULTADO 1x1 (alvo = stop)</div>
                          <div style={{color:"#4ade80",fontWeight:800,fontSize:22}}>+R$ {calcVlr(totalCts,stopPts).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                          <div style={{color:t.muted,fontSize:10,marginTop:4}}>{stopPts} pts × R${vlr}/pt × {totalCts} ct</div>
                        </>
                      ):(
                        <div style={{color:"#f59e0b",fontSize:12,fontWeight:600}}>⚠️ Preencha o Stop da Operação acima para calcular</div>
                      )}
                    </div>
                  )}

                  {/* 1x1 → Mais parciais */}
                  {f.parcialSaidaTotal===false&&isFutBR&&(
                    <div>
                      <div style={{marginBottom:12}}>
                        <label style={{display:"block",color:"#c084fc",fontSize:12,marginBottom:6,fontWeight:600}}>
                          Contratos na P1 (1x1) <span style={{color:t.muted,fontWeight:400}}>(máx: {totalCts})</span>
                        </label>
                        <input type="number" min="1" max={totalCts}
                          value={f.parcialContratos||""}
                          onChange={e=>{const v=Math.min(parseFloat(e.target.value)||0,totalCts);set("parcialContratos",String(v));}}
                          style={{...inp,width:130,border:"1px solid #a855f755"}}/>
                      </div>
                      {cts1>0&&stopPts>0&&(
                        <div style={{background:"#a855f715",border:"1px solid #a855f744",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                          <div style={{color:"#c084fc",fontSize:10,fontWeight:700}}>💰 P1 (1x1)</div>
                          <div style={{color:"#4ade80",fontWeight:800,fontSize:16}}>+R$ {calcVlr(cts1,stopPts).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                          <div style={{color:t.muted,fontSize:10}}>{stopPts} pts × {cts1} ct · Restam: {ctsRestantes} ct</div>
                        </div>
                      )}
                      {renderParciaisExtras("#a855f7", stopPts)}
                    </div>
                  )}
                </div>
              )}

              {/* ══════════ 2x1 ══════════ */}
              {f.parcialRR==="2x1"&&(
                <div style={{background:"#a855f710",border:"1px solid #a855f733",borderRadius:10,padding:16,marginBottom:8}}>

                  {/* Dois botões */}
                  <div style={{display:"flex",gap:10,marginBottom:f.parcialSaidaTotal!=null?14:0}}>
                    {[[true,"✅ Sim, saída total","#22c55e"],[false,"➕ Adicionar mais parciais","#a855f7"]].map(([val,label,color])=>(
                      <button key={String(val)}
                        onClick={()=>{
                          set("parcialSaidaTotal",f.parcialSaidaTotal===val?null:val);
                          set("parcialContratos",""); set("parciais",[]); setNumParciaisExtras(0);
                        }}
                        style={{flex:1,padding:"12px 8px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
                          border:`2px solid ${f.parcialSaidaTotal===val?color:t.border}`,
                          background:f.parcialSaidaTotal===val?color+"22":"transparent",
                          color:f.parcialSaidaTotal===val?color:t.muted}}
                      >{label}</button>
                    ))}
                  </div>

                  {/* 2x1 → Sim saída total */}
                  {f.parcialSaidaTotal===true&&isFutBR&&(
                    <div style={{background:"#a855f715",border:"1px solid #a855f744",borderRadius:10,padding:"14px 16px"}}>
                      {stopPts>0?(
                        <>
                          <div style={{color:"#c084fc",fontSize:11,fontWeight:700,marginBottom:8}}>📦 CONTRATOS (bloqueado)</div>
                          <div style={{color:t.text,fontWeight:800,fontSize:18,marginBottom:10}}>{totalCts} contratos</div>
                          <div style={{color:"#c084fc",fontSize:11,fontWeight:700,marginBottom:4}}>🚀 RESULTADO 2x1 (alvo = 2× stop)</div>
                          <div style={{color:"#4ade80",fontWeight:800,fontSize:22}}>+R$ {calcVlr(totalCts,stopPts*2).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                          <div style={{color:t.muted,fontSize:10,marginTop:4}}>{stopPts*2} pts (2×{stopPts}) × R${vlr}/pt × {totalCts} ct</div>
                        </>
                      ):(
                        <div style={{color:"#f59e0b",fontSize:12,fontWeight:600}}>⚠️ Preencha o Stop da Operação acima para calcular</div>
                      )}
                    </div>
                  )}

                  {/* 2x1 → Mais parciais */}
                  {f.parcialSaidaTotal===false&&isFutBR&&(
                    <div>
                      <div style={{marginBottom:12}}>
                        <label style={{display:"block",color:"#c084fc",fontSize:12,marginBottom:6,fontWeight:600}}>
                          Contratos na P1 (2x1) <span style={{color:t.muted,fontWeight:400}}>(máx: {totalCts})</span>
                        </label>
                        <input type="number" min="1" max={totalCts}
                          value={f.parcialContratos||""}
                          onChange={e=>{const v=Math.min(parseFloat(e.target.value)||0,totalCts);set("parcialContratos",String(v));}}
                          style={{...inp,width:130,border:"1px solid #a855f755"}}/>
                      </div>
                      {cts1>0&&stopPts>0&&(
                        <div style={{background:"#a855f715",border:"1px solid #a855f744",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                          <div style={{color:"#c084fc",fontSize:10,fontWeight:700}}>💰 P1 (2x1)</div>
                          <div style={{color:"#4ade80",fontWeight:800,fontSize:16}}>+R$ {calcVlr(cts1,stopPts*2).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                          <div style={{color:t.muted,fontSize:10}}>{stopPts*2} pts × {cts1} ct · Restam: {ctsRestantes} ct</div>
                        </div>
                      )}
                      {renderParciaisExtras("#a855f7", stopPts*2)}
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })()}
      </Section>}

      {/* Saída Final — só se NÃO fez parcial E resultado NÃO é Zero */}
      {f.fezParcial===false&&f.resultadoGainStop!=="Zero"&&isFuturosBR(f.ativo)&&(
        <Section icon="🚪" title="Saída Final — Resultado" t={t} accent="#f59e0b">
          <div style={{marginBottom:14}}>
            <div style={{color:"#f59e0b",fontWeight:700,fontSize:12,marginBottom:10}}>🎯 TIPO DE SAÍDA FINAL</div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {[["alvo","🎯 Alvo","#22c55e"],["zero","⚪ Zero","#94a3b8"],["stop","🛑 Stop","#ef4444"]].map(([val,label,cor])=>(
                <button key={val} onClick={()=>{
                  set("saidaFinalTipo",f.saidaFinalTipo===val?"":val);
                  if(val==="alvo") set("saidaFinalPontos","");
                  if(val==="stop"){set("saidaFinalStopTipo","inicial");set("saidaFinalStopCustom","");}
                }}
                style={{flex:1,padding:"12px 0",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14,
                  border:`2px solid ${f.saidaFinalTipo===val?cor:t.border}`,
                  background:f.saidaFinalTipo===val?cor+"22":"transparent",
                  color:f.saidaFinalTipo===val?cor:t.muted,transition:"all .15s"}}
                >{label}</button>
              ))}
            </div>
            {f.saidaFinalTipo==="alvo"&&(()=>{
              const vlrPt=f.ativo==="WDOFUT"?10:0.20;
              const cts=parseFloat(f.quantidadeContratos)||0;
              const pts=parseFloat(f.saidaFinalPontos)||0;
              const res=pts*vlrPt*cts;
              return (
                <div style={{background:t.bg,border:`1px solid #22c55e33`,borderRadius:10,padding:"16px"}}>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
                    <div style={{flex:2,minWidth:200}}>
                      <label style={{display:"block",color:"#22c55e",fontSize:12,marginBottom:6,fontWeight:600}}>📈 Resultado da operação em pontos</label>
                      <input type="number" step={f.ativo==="WDOFUT"?0.5:1} min="0" placeholder="ex: 200"
                        value={f.saidaFinalPontos} onChange={e=>{
                          set("saidaFinalPontos",e.target.value);
                          set("resultadoPontos",e.target.value);
                          const p=parseFloat(e.target.value)||0;
                          set("resultadoReais",(p*vlrPt*cts).toFixed(2));
                        }}
                        style={{...inp,width:"100%",border:"1px solid #22c55e55"}}/>
                    </div>
                    {pts>0&&(
                      <div style={{flex:1,background:"#22c55e10",border:"1px solid #22c55e33",borderRadius:8,padding:"12px"}}>
                        <div style={{color:"#22c55e",fontSize:11,fontWeight:700}}>💰 RESULTADO FINAL</div>
                        <div style={{color:"#4ade80",fontWeight:800,fontSize:20}}>
                          +R$ {res.toLocaleString("pt-BR",{minimumFractionDigits:2})}
                        </div>
                        <div style={{color:t.muted,fontSize:10,marginTop:2}}>{pts}pts × R${vlrPt}/pt × {cts}ct</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            {f.saidaFinalTipo==="zero"&&(()=>{
              if(f.resultadoReais!=="0") { setTimeout(()=>{ set("resultadoReais","0"); set("resultadoPontos","0"); },0); }
              return (
                <div style={{background:t.bg,border:`1px solid #94a3b833`,borderRadius:10,padding:"16px",textAlign:"center"}}>
                  <div style={{color:"#94a3b8",fontSize:16,fontWeight:700}}>⚪ OPERAÇÃO ZERADA</div>
                  <div style={{color:"#94a3b8",fontWeight:800,fontSize:24,marginTop:8}}>R$ 0,00</div>
                </div>
              );
            })()}
            {f.saidaFinalTipo==="stop"&&(
              <div style={{background:t.bg,border:`1px solid #ef444433`,borderRadius:10,padding:"16px"}}>
                <div style={{display:"flex",gap:10,marginBottom:16}}>
                  {[["inicial","🔒 Stop Inicial","#ef4444"],["outro","✏️ Stop Alterado","#f59e0b"]].map(([v,label,cor])=>(
                    <button key={v} onClick={()=>{
                      set("saidaFinalStopTipo",f.saidaFinalStopTipo===v?"inicial":v);
                      if(v==="inicial"){
                        const vlrPt=f.ativo==="WDOFUT"?10:0.20;
                        const cts=parseFloat(f.quantidadeContratos)||0;
                        const pts=parseFloat(f.stopPontos)||0;
                        set("resultadoPontos",String(pts));
                        set("resultadoReais",(-(pts*vlrPt*cts)).toFixed(2));
                      }
                    }}
                      style={{flex:1,padding:"12px 8px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,
                        border:`2px solid ${(f.saidaFinalStopTipo||"inicial")===v?cor:t.border}`,
                        background:(f.saidaFinalStopTipo||"inicial")===v?cor+"22":"transparent",
                        color:(f.saidaFinalStopTipo||"inicial")===v?cor:t.muted}}
                    >{label}</button>
                  ))}
                </div>
                {(f.saidaFinalStopTipo||"inicial")==="inicial"&&(()=>{
                  const vlrPt=f.ativo==="WDOFUT"?10:0.20;
                  const cts=parseFloat(f.quantidadeContratos)||0;
                  const pts=parseFloat(f.stopPontos)||0;
                  const res=-(pts*vlrPt*cts);
                  return (
                    <div style={{background:"#ef444410",border:"1px solid #ef444433",borderRadius:8,padding:"12px"}}>
                      <div style={{color:"#f87171",fontSize:11,fontWeight:700}}>🛑 STOP INICIAL</div>
                      <div style={{color:"#ef4444",fontWeight:800,fontSize:20}}>
                        -R$ {Math.abs(res).toLocaleString("pt-BR",{minimumFractionDigits:2})}
                      </div>
                      <div style={{color:t.muted,fontSize:10,marginTop:2}}>{pts}pts × R${vlrPt}/pt × {cts}ct</div>
                    </div>
                  );
                })()}
                {(f.saidaFinalStopTipo||"inicial")==="outro"&&(
                  <div>
                    <label style={{display:"block",color:"#f59e0b",fontSize:12,marginBottom:6,fontWeight:600}}>✏️ Resultado da operação em pontos (stop alterado)</label>
                    <input type="number" step={f.ativo==="WDOFUT"?0.5:1} min="0"
                      value={f.saidaFinalStopCustom} onChange={e=>{
                        set("saidaFinalStopCustom",e.target.value);
                        const vlrPt=f.ativo==="WDOFUT"?10:0.20;
                        const cts=parseFloat(f.quantidadeContratos)||0;
                        const p=parseFloat(e.target.value)||0;
                        set("resultadoPontos",e.target.value);
                        set("resultadoReais",(-(p*vlrPt*cts)).toFixed(2));
                      }}
                      style={{...inp,width:"100%",border:"1px solid #f59e0b55",marginBottom:10}}/>
                    {f.saidaFinalStopCustom&&(()=>{
                      const vlrPt=f.ativo==="WDOFUT"?10:0.20;
                      const cts=parseFloat(f.quantidadeContratos)||0;
                      const p=parseFloat(f.saidaFinalStopCustom)||0;
                      return (
                        <div style={{background:"#f59e0b10",border:"1px solid #f59e0b33",borderRadius:8,padding:"12px"}}>
                          <div style={{color:"#f59e0b",fontSize:11,fontWeight:700}}>💰 RESULTADO COM STOP ALTERADO</div>
                          <div style={{color:"#ef4444",fontWeight:800,fontSize:20}}>
                            -R$ {Math.abs(p*vlrPt*cts).toLocaleString("pt-BR",{minimumFractionDigits:2})}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
          <SaidaFinal f={f} set={set} t={t} cotacaoApi={cotacaoApi} loadingCotacao={loadingCotacao} buscarCotacao={buscarCotacao}/>
        </Section>
      )}

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
        <textarea placeholder="Descreva sua análise, setup, motivo da entrada..." value={f.descricao} onChange={e=>set("descricao",e.target.value)} rows={3}
          style={{...inp,width:"100%",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
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
      <Section icon="📸" title="Fotos (opcional)" t={t}>
        <label style={{display:"flex",alignItems:"center",gap:10,background:t.bg,border:`2px dashed ${t.border}`,borderRadius:10,padding:"14px 20px",cursor:"pointer",color:t.muted,fontSize:14}}>
          <span style={{fontSize:22}}>➕</span>
          <span>Adicionar foto{(f.fotos||[]).length>0?` (${(f.fotos||[]).length} adicionada${(f.fotos||[]).length>1?"s":""})`:" — pode adicionar várias"}</span>
          <input type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{
            const files=Array.from(e.target.files);
            files.forEach(file=>{
              const reader=new FileReader();
              reader.onload=ev=>set("fotos",[...(f.fotos||[]),ev.target.result]);
              reader.readAsDataURL(file);
            });
            e.target.value="";
          }}/>
        </label>
        {(f.fotos||[]).length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:10}}>
            {(f.fotos||[]).map((src,i)=>(
              <div key={i} style={{position:"relative",display:"inline-block"}}>
                <img src={src} alt={`foto ${i+1}`} style={{width:120,height:90,objectFit:"cover",borderRadius:8,border:`1px solid ${t.border}`,display:"block"}}/>
                <button onClick={()=>set("fotos",(f.fotos||[]).filter((_,j)=>j!==i))} style={{position:"absolute",top:4,right:4,background:"#ef444488",border:"none",borderRadius:999,color:"#fff",width:22,height:22,cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                <div style={{textAlign:"center",color:t.muted,fontSize:9,marginTop:2}}>Foto {i+1}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:8}}>
        <button onClick={onClose} style={{padding:"11px 22px",borderRadius:8,border:`1px solid ${t.border}`,background:"transparent",color:t.muted,fontSize:14,cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>{
          if(!valid) return;
          const vlrPt=f.ativo==="WDOFUT"?10:0.20;
          const cts=parseFloat(f.quantidadeContratos)||1;
          const isBR=isFuturosBR(f.ativo);
          let finalForm={...f};
          if(isBR){
            const cv=(contratos,pontos)=>(parseFloat(contratos)||0)*(parseFloat(pontos)||0)*vlrPt;
            const stopPts=parseFloat(f.stopPontos)||0;
            const cts1=parseFloat(f.parcialContratos)||0;
            if(f.fezParcial===true){
              const ptsExtras=(f.parciais||[]).reduce((s,p)=>s+(parseFloat(p.contratos)||0)*(parseFloat(p.pontos)||0),0);
              const vlrExtras=(f.parciais||[]).reduce((s,p)=>s+cv(p.contratos,p.pontos),0);
              let vlrP1=0, ptsP1=0;
              if(f.parcialRR==="1x1"){
                // saída total = todos contratos × stop; mais parciais = cts1 × stop
                vlrP1=f.parcialSaidaTotal===true ? cv(cts,stopPts) : cv(cts1,stopPts);
                ptsP1=f.parcialSaidaTotal===true ? cts*stopPts : cts1*stopPts;
              } else if(f.parcialRR==="Menos que 1x1"){
                const pts=parseFloat(f.parcialPontosMenos)||0;
                // saída total = todos contratos; mais parciais = cts1
                vlrP1=f.parcialSaidaTotalMenos===true ? cv(cts,pts) : cv(cts1,pts);
                ptsP1=f.parcialSaidaTotalMenos===true ? cts*pts : cts1*pts;
              } else if(f.parcialRR==="2x1"){
                // saída total = todos contratos × 2×stop; mais parciais = cts1 × 2×stop
                vlrP1=f.parcialSaidaTotal===true ? cv(cts,stopPts*2) : cv(cts1,stopPts*2);
                ptsP1=f.parcialSaidaTotal===true ? cts*stopPts*2 : cts1*stopPts*2;
              }
              const total=vlrP1+vlrExtras;
              const totalPts=cts>0 ? Math.round((ptsP1+ptsExtras)/cts) : 0;
              if(total!==0) finalForm={...finalForm,resultadoReais:total.toFixed(2),resultadoPontos:String(totalPts)};
            } else if(f.fezParcial===false){
              // Sem parcial: resultado vem da saída final
              if(f.saidaFinalTipo==="alvo"&&f.saidaFinalPontos){
                const pts=parseFloat(f.saidaFinalPontos)||0;
                finalForm={...finalForm,resultadoReais:(pts*vlrPt*cts).toFixed(2),resultadoPontos:f.saidaFinalPontos};
              } else if(f.saidaFinalTipo==="zero"){
                finalForm={...finalForm,resultadoReais:"0",resultadoPontos:"0"};
              } else if(f.saidaFinalTipo==="stop"){
                const pts=(f.saidaFinalStopTipo||"inicial")==="outro"
                  ? parseFloat(f.saidaFinalStopCustom)||0 : stopPts;
                finalForm={...finalForm,resultadoReais:(-(pts*vlrPt*cts)).toFixed(2),resultadoPontos:String(pts)};
              }
            }
          }
          onSave(finalForm);
        }} style={{padding:"11px 26px",borderRadius:8,border:"none",background:valid?"linear-gradient(135deg,#3b82f6,#1d4ed8)":t.border,color:valid?"#fff":t.muted,fontSize:14,fontWeight:700,cursor:valid?"pointer":"not-allowed",boxShadow:valid?"0 4px 15px rgba(59,130,246,0.4)":"none"}}>💾 Salvar Operação</button>
      </div>
    </div>
  );
}

function OpCard({op,onEdit,onDelete,t}) {
  const [zoomFoto, setZoomFoto] = React.useState(null);
  const reais=parseFloat(op.resultadoReais)||0; const dolar=parseFloat(op.resultadoDolar)||0;
  const pts=parseFloat(op.resultadoPontos)||0; const pos=reais>=0;
  const sent=SENTIMENTOS.find(s=>s.v===op.sentimento);
  const regiao=REGIOES.find(r=>r.v===op.regiaoPreco);
  const estrategiaLabel = op.estrategia ? (op.estrategia==="outro" ? (op.estrategiaOutro||"Outro") : (ESTRATEGIAS.find(e=>e.v===op.estrategia)?.label||op.estrategia)) : null;
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
            {op.fezParcial===true&&(()=>{
              const p1Pts=op.parcialPontosMenos?parseFloat(op.parcialPontosMenos):op.parcialRR==="2x1"?parseFloat(op.stopPontos||0)*2:parseFloat(op.stopPontos||0);
              const extras=(op.parciais||[]);
              const andou=op.riscoRetornoCustom?parseFloat(op.riscoRetornoCustom):0;
              return(<div style={{textAlign:"right"}}>
                <div style={{color:"#a78bfa",fontSize:11}}>{pts>=0?"+":""}{pts} pts</div>
                {p1Pts>0&&<div style={{color:"#c4b5fd",fontSize:10,marginTop:1}}>Parcial 1: {p1Pts} pts</div>}
                {extras.map((p,i)=>p.pontos>0?<div key={i} style={{color:"#c4b5fd",fontSize:10,marginTop:1}}>Parcial {i+2}: {p.pontos} pts</div>:null)}
                {andou>0&&op.resultadoGainStop==="Gain"&&<div style={{color:"#4ade80",fontSize:10,marginTop:2,fontWeight:600}}>Operação Andou {andou} pts</div>}
              </div>);
            })()}
            {op.fezParcial!==true&&<div style={{color:"#a78bfa",fontSize:11}}>{pts>=0?"+":""}{pts} pts</div>}
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
        {estrategiaLabel&&<Tag color="#f59e0b">🎯 {estrategiaLabel}</Tag>}
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
      {op.descricao&&<div style={{marginTop:8,color:t.bg===DARK.bg?"#ffffff":"#000000",fontSize:12,lineHeight:1.6,borderTop:`1px solid ${t.border}`,paddingTop:8,fontStyle:"italic"}}>"{op.descricao}"</div>}
      {(op.fotos||[]).length>0&&(
        <div style={{marginTop:10}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {(op.fotos||[]).map((src,i)=>(
              <div key={i} style={{position:"relative",cursor:"pointer"}} onClick={()=>setZoomFoto(src)}>
                <img src={src} alt={`foto ${i+1}`} style={{width:110,height:80,objectFit:"cover",borderRadius:7,border:`1px solid ${t.border}`,display:"block",transition:"opacity .15s"}}
                  onMouseOver={e=>e.currentTarget.style.opacity=".8"} onMouseOut={e=>e.currentTarget.style.opacity="1"}/>
                <div style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,0.6)",borderRadius:4,padding:"1px 5px",color:"#fff",fontSize:9}}>🔍</div>
              </div>
            ))}
          </div>
          <div style={{color:t.muted,fontSize:10,marginTop:4}}>🔍 Clique na foto para ampliar</div>
        </div>
      )}
      {zoomFoto&&<FotoLightbox src={zoomFoto} onClose={()=>setZoomFoto(null)}/>}
    </div>
  );
}

function FotoLightbox({ src, onClose }) {
  React.useEffect(() => {
    const esc = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
      <img src={src} alt="ampliar" onClick={e=>e.stopPropagation()} style={{maxWidth:"94vw",maxHeight:"92vh",borderRadius:10,boxShadow:"0 8px 60px rgba(0,0,0,0.8)",objectFit:"contain",cursor:"default"}}/>
      <button onClick={onClose} style={{position:"fixed",top:18,right:22,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:999,color:"#fff",fontSize:20,width:38,height:38,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      <div style={{position:"fixed",bottom:18,color:"rgba(255,255,255,0.4)",fontSize:11}}>Clique fora ou ESC para fechar</div>
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


// ─── VIX CARD — /api/macro (TradingView → Investing.com) ─────────────────────
function VixCard({ t, tvData }) {
  const d    = tvData?.vix;
  const vix  = d?.preco ? { value: d.preco, chg: d.variacao, pct: d.percent } : null;
  const isUp = vix ? vix.chg >= 0 : null;
  const cor  = isUp === null ? "#94a3b8" : (isUp ? "#22c55e" : "#ef4444");
  const fonte= d?.fonte?.startsWith("INV") ? "Investing" : "Mercado";
  return (
    <div style={{ background: t.bg, border: `1px solid ${cor}28`, borderRadius: 10, padding: "10px 12px", minWidth: 0, minHeight: 78 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
        <div>
          <div style={{ color: cor, fontWeight: 800, fontSize: 12 }}>VIX</div>
          <div style={{ color: t.muted, fontSize: 8 }}>CBOE Volatility · {vix ? fonte : "—"}</div>
        </div>
        <span style={{ background: "#ef444418", border: "1px solid #ef444433", borderRadius: 3, padding: "1px 4px", color: "#f87171", fontSize: 7, fontWeight: 700 }}>CBOE</span>
      </div>
      {vix ? (
        <>
          <div style={{ fontSize: 20, fontWeight: 900, color: cor, lineHeight: 1.1 }}>{vix.value.toFixed(2)}</div>
          <div style={{ fontSize: 10, color: cor, fontWeight: 700, marginTop: 3 }}>
            {isUp ? "▲ +" : "▼ "}{Math.abs(vix.chg).toFixed(2)}
          </div>
          <div style={{ fontSize: 13, color: cor, fontWeight: 900 }}>
            {isUp ? "+" : ""}{vix.pct.toFixed(2)}%
          </div>
        </>
      ) : (
        <div style={{ fontSize: 11, color: t.muted, marginTop: 8 }}>⏳ carregando...</div>
      )}
    </div>
  );
}

// ─── ADRs BRASILEIRAS — cards nativos via Yahoo Finance ──────────────────────
function ADRBrasileiras({ t }) {
  const [dados, setDados] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [erro, setErro] = React.useState(null);
  const [ultima, setUltima] = React.useState(null);
  const [vw, setVw] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  React.useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const buscar = React.useCallback(async () => {
    try {
      const r = await fetch("/api/adr-quotes");
      const json = await r.json();
      if (json.ok) { setDados(json.data); setErro(null); setUltima(new Date()); }
      else setErro(json.error);
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    buscar();
    const iv = setInterval(buscar, 15000); // atualiza a cada 15s
    return () => clearInterval(iv);
  }, [buscar]);

  const fmt2 = (v) => v != null ? v.toFixed(2) : "—";
  const fmt3 = (v) => v != null ? v.toFixed(3) : "—";
  const isMobile = vw <= 900;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 7px" }}>
        <div style={{ flex: 1, height: 1, background: t.border }} />
        <span style={{ color: "#4ade80", fontWeight: 800, fontSize: 10, letterSpacing: 1.2, whiteSpace: "nowrap" }}>🇧🇷 ADRs BRASILEIRAS — NYSE / OTC</span>
        <div style={{ flex: 1, height: 1, background: t.border }} />
      </div>

      {loading ? (
        <div style={{ color: t.muted, fontSize: 11, textAlign: "center", padding: "16px 0" }}>Carregando ADRs...</div>
      ) : erro ? (
        <div style={{ color: "#f87171", fontSize: 11, textAlign: "center", padding: "8px 0" }}>⚠️ {erro}</div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
          gap: 7,
        }}>
          {dados.map(r => {
            const positivo = r.varPct >= 0;
            const cor = positivo ? "#4ade80" : "#f87171";
            const bgCor = positivo ? "#4ade8012" : "#f8717112";
            const borderCor = positivo ? "#4ade8030" : "#f8717130";
            return (
              <div key={r.symbol} style={{
                background: t.card,
                border: `1px solid ${borderCor}`,
                borderRadius: 10,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Fundo colorido sutil */}
                <div style={{ position: "absolute", inset: 0, background: bgCor, pointerEvents: "none" }} />
                {/* Ticker */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                  <span style={{ color: t.accent, fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>{r.symbol}</span>
                  <span style={{ fontSize: 9, color: t.muted }}>🇺🇸</span>
                </div>
                {/* Nome */}
                <div style={{ color: t.muted, fontSize: 9, lineHeight: 1.2, position: "relative" }}>{r.nome}</div>
                {/* Preço */}
                <div style={{ color: t.text, fontWeight: 900, fontSize: 18, lineHeight: 1, position: "relative", marginTop: 2 }}>
                  {fmt3(r.ultimo)}
                </div>
                {/* Variação + Var% */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, position: "relative" }}>
                  <span style={{ color: cor, fontSize: 11, fontWeight: 700 }}>
                    {r.variacao != null ? (positivo ? "▲ +" : "▼ ") + fmt2(r.variacao) : "—"}
                  </span>
                  <span style={{
                    background: cor + "22",
                    border: `1px solid ${cor}44`,
                    borderRadius: 4,
                    padding: "1px 5px",
                    color: cor,
                    fontSize: 10,
                    fontWeight: 800,
                  }}>
                    {r.varPct != null ? (positivo ? "+" : "") + fmt2(r.varPct) + "%" : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 5, color: t.muted, fontSize: 8, textAlign: "right" }}>
        ⚡ Cotações em tempo real{ultima ? ` · atualizado ${ultima.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
      </div>
    </div>
  );
}

// ─── HELPERS DI FUTURO ──────────────────────────────────────────────────────
const DI_CONFIG = [
  { nome: "DI1F27", desc: "Jan/2027", tvSym: "BMFBOVESPA:DI1F2027", cor: "#818cf8" },
  { nome: "DI1F28", desc: "Jan/2028", tvSym: "BMFBOVESPA:DI1F2028", cor: "#a78bfa" },
  { nome: "DI1F29", desc: "Jan/2029", tvSym: "BMFBOVESPA:DI1F2029", cor: "#c084fc" },
];

function countBizDays(from, to) {
  let count = 0;
  const cur = new Date(from); cur.setHours(0,0,0,0);
  const end = new Date(to);   end.setHours(0,0,0,0);
  while (cur < end) { cur.setDate(cur.getDate() + 1); const d = cur.getDay(); if (d !== 0 && d !== 6) count++; }
  return count;
}
function puToTaxa(pu, expiry) {
  const du = countBizDays(new Date(), expiry);
  if (du <= 0 || pu <= 0) return null;
  const taxa = (Math.pow(100000 / pu, 252 / du) - 1) * 100;
  return (taxa > 0 && taxa < 50) ? taxa : null;
}
function extractDIQuote(json) {
  // Retorna { pu, prevPu } com múltiplos caminhos possíveis da API B3
  let pu = 0, prevPu = 0;
  try {
    const s = json?.Tkt?.scty;
    const q = Array.isArray(s) ? s[0]?.SctyQtn : s?.SctyQtn;
    if (q) {
      pu     = parseFloat(q.curPrc  || q.lastPrc  || 0);
      prevPu = parseFloat(q.closPrc || q.prevCls  || q.lastClosPric || 0);
    }
  } catch(_) {}
  if (!pu) { try { pu = parseFloat(json?.curPrc || json?.lastPrc || 0); } catch(_) {} }
  if (!prevPu) { try { prevPu = parseFloat(json?.closPrc || json?.prevCls || 0); } catch(_) {} }
  return { pu, prevPu };
}

// ─── PAINEL MERCADOS GLOBAIS (VERSÃO CORRETA) ────────────────────────────
function PainelMercados({t, tvData}) {
  const [open, setOpen] = React.useState(true);
  const [vw, setVw] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const isMobile = vw <= 900;
  const isSmallMobile = vw <= 640;
  const DI_CACHE = "painelMercados_di_v1";
  const [diData, setDiData] = React.useState(() => {
    try { return JSON.parse(sessionStorage.getItem(DI_CACHE) || "null"); } catch(_) { return null; }
  });
  const [diLoading, setDiLoading] = React.useState(false);
  const [diUpdate, setDiUpdate]   = React.useState(null);
  const [diDebug, setDiDebug]     = React.useState([]);
  const [showDebug, setShowDebug] = React.useState(false);

  const fetchDI = React.useCallback(async () => {
    setDiLoading(true);
    const result = {};
    const logs   = [];

    // Gera todos os alvos a tentar para cada símbolo
    const makeTargets = (nome) => [
      // ── Endpoint 1: cotacao.b3.com.br derivativeQuotation ──────────────
      { label: "B3/cotacao",    url: `https://cotacao.b3.com.br/mds/api/v1/derivativeQuotation/${nome}`,             wrap: false },
      // ── Endpoint 2: sistemaswebb3-listados nftProxy ─────────────────────
      { label: "B3/sist-list",  url: `https://sistemaswebb3-listados.b3.com.br/nftProxy/nft/getNftDetailsForMercado?language=pt-br&mercado=4&codigoNft=${nome}`, wrap: false },
      // ── Endpoint 3: sistemaswebb3-derivativos ───────────────────────────
      { label: "B3/sist-deriv", url: `https://sistemaswebb3-derivativos.b3.com.br/timeseries/derivatives?symbol=${nome}&assetType=FUT`, wrap: false },
    ];

    const PROXIES = [
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    ];

    // Extrai PU a partir de vários formatos possíveis (sistemaswebb3 + cotacao)
    const extractAny = (json) => {
      // sistemaswebb3-listados formato
      const sist = json?.trade || json?.lastTrade || json?.quotation;
      if (sist) {
        const pu     = parseFloat(sist.lastPrice   || sist.price      || sist.tradePrice || 0);
        const prevPu = parseFloat(sist.closePrice  || sist.prevClose  || sist.settlPrice || 0);
        if (pu > 50000) return { pu, prevPu };
      }
      // sistemaswebb3-derivativos formato
      if (json?.data?.length > 0) {
        const d = json.data[json.data.length - 1];
        const pu     = parseFloat(d.closPrice || d.price || d.lastPrice || 0);
        const prevPu = parseFloat(d.openPrice || 0);
        if (pu > 50000) return { pu, prevPu };
      }
      // cotacao.b3.com.br formato
      return extractDIQuote(json);
    };

    for (const di of DI_CONFIG) {
      let resolved = false;
      const targets = makeTargets(di.nome);

      outer:
      for (const target of targets) {
        for (const makeProxy of PROXIES) {
          const proxyUrl = makeProxy(target.url);
          const logKey   = `${di.nome} | ${target.label} | ${makeProxy(target.url).split("?")[0].slice(-30)}`;
          try {
            const res  = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
            let   json = await res.json();
            if (json?.contents) { try { json = JSON.parse(json.contents); } catch(_) {} }

            const { pu, prevPu } = extractAny(json);
            if (pu > 50000 && pu < 100000) {
              const taxa = puToTaxa(pu, di.expiry);
              if (taxa !== null) {
                const prev  = (prevPu > 50000 && prevPu < 100000) ? puToTaxa(prevPu, di.expiry) : null;
                const varBp = prev !== null ? (taxa - prev).toFixed(2) : null;
                result[di.nome] = { taxa: taxa.toFixed(2).replace(".", ","), var: varBp };
                logs.push({ sym: di.nome, status: "✅", info: `PU=${pu.toFixed(0)} → ${taxa.toFixed(2)}% | ${target.label}` });
                resolved = true;
                break outer;
              } else {
                logs.push({ sym: di.nome, status: "⚠️", info: `PU=${pu.toFixed(0)} inválido | ${target.label}` });
              }
            } else {
              logs.push({ sym: di.nome, status: "⚠️", info: `PU=${pu} fora do range | ${target.label} | keys: ${Object.keys(json).slice(0,4).join(",")}` });
            }
          } catch(e) {
            logs.push({ sym: di.nome, status: "❌", info: `${target.label}: ${e.message?.slice(0,40)}` });
          }
        }
      }
      if (!resolved) logs.push({ sym: di.nome, status: "💀", info: "Todos os endpoints falharam — usando fallback" });
    }

    setDiDebug(logs);
    if (Object.keys(result).length > 0) {
      const ts    = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const cache = { data: result, ts };
      setDiData(cache);
      setDiUpdate(ts);
      try { sessionStorage.setItem(DI_CACHE, JSON.stringify(cache)); } catch(_) {}
    }
    setDiLoading(false);
  }, []);

  React.useEffect(() => {
    fetchDI();
    const iv = setInterval(fetchDI, 5 * 60 * 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // TradingView Mini Widget — funciona via iframe embed, sem CORS, completamente gratuito
  // Cada card é um iframe com widget do TradingView
  // Grupo 1 e 2 usam Yahoo Finance (YF) via proxy — TradingView bloqueia SP:SPX, DJ:DJI, TVC:DXY etc em embed gratuito
  const widgets = [
    // Linha 1: Dólar/Índices
    { tvMacro: "dxy",    nome: "DXY",        cor: "#f59e0b", grupo: 1 },
    { tvMacro: "sp500",  nome: "S&P 500",    cor: "#60a5fa", grupo: 1 },
    { tvMacro: "us30",   nome: "US30",       cor: "#60a5fa", grupo: 1 },
    { tvMacro: "ewz",    nome: "EWZ",        cor: "#4ade80", grupo: 1 },
    { tvMacro: "nasdaq", nome: "Nasdaq 100", cor: "#60a5fa", grupo: 1 },
    // Linha 2: Commodities/Cripto
    { tvMacro: "ouro",   nome: "Ouro",       cor: "#f59e0b", grupo: 2 },
    { tvMacro: "petroleo",               nome: "WTI CL1!",   cor: "#94a3b8", grupo: 2 },
    { tvMacro: "minerio", nome: "Minério FEF1!", cor: "#fb923c", grupo: 2 },
    { sym: "BITSTAMP:BTCUSD",            nome: "BTC/USD",    cor: "#f59e0b", grupo: 2 },
    // ADRs
    { sym: "NYSE:VALE",    nome: "VALE",      cor: "#4ade80", grupo: 3 },
    { sym: "NYSE:PBR",     nome: "PBR",       cor: "#4ade80", grupo: 3 },
    { sym: "NYSE:ITUB",    nome: "ITUB",      cor: "#4ade80", grupo: 3 },
    { sym: "NYSE:BBD",     nome: "BBD",       cor: "#4ade80", grupo: 3 },
  ];

  const theme = "dark";
  const locale = "br";

  const TVCard = ({ sym, nome, cor }) => {
    // single-ticker widget: funciona com TODOS os tipos (índices, forex, stocks, crypto)
    const config = JSON.stringify({
      symbol: sym,
      width: "100%",
      colorTheme: "dark",
      isTransparent: true,
      locale: "br",
    });
    const src = `https://s.tradingview.com/embed-widget/single-quote/?locale=br#${encodeURIComponent(config)}`;
    return (
      <div style={{ background: t.bg, border: `1px solid ${cor}28`, borderRadius: 10, overflow: "hidden", minWidth: 0, minHeight: 80, position: "relative" }}>
        <iframe
          src={src}
          style={{ width: "100%", height: 78, border: "none", display: "block" }}
          scrolling="no"
          allowTransparency={true}
          title={nome}
        />
        <div style={{ position: "absolute", inset: 0, background: "transparent", cursor: "default" }} aria-hidden="true" />
      </div>
    );
  };

  const Titulo = ({ icon, label, cor }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 7px" }}>
      <div style={{ flex: 1, height: 1, background: t.border }} />
      <span style={{ color: cor || t.accent, fontWeight: 800, fontSize: 10, letterSpacing: 1.2, whiteSpace: "nowrap" }}>{icon} {label}</span>
      <div style={{ flex: 1, height: 1, background: t.border }} />
    </div>
  );

  // Card genérico com Yahoo Finance (funciona para índices, futuros, forex)
  // yf pode ser string ou array de símbolos Yahoo Finance (tenta na ordem)
  const QuoteCard = ({ yf, nome, cor }) => {
    const [q, setQ] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [yfUsed, setYfUsed] = React.useState(null);
    const syms = Array.isArray(yf) ? yf : [yf];
    const doFetch = React.useCallback(async () => {
      setLoading(true);
      const proxies = [
        s => `https://corsproxy.io/?${encodeURIComponent(s)}`,
        s => `https://api.allorigins.win/raw?url=${encodeURIComponent(s)}`,
        s => `https://api.allorigins.win/get?url=${encodeURIComponent(s)}`,
      ];
      for (const sym of syms) {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
        for (const mkProxy of proxies) {
          try {
            const r = await fetch(mkProxy(url), { signal: AbortSignal.timeout(8000) });
            let data;
            if (mkProxy(url).includes("/get?url=")) { const j = await r.json(); data = JSON.parse(j.contents); }
            else { data = await r.json(); }
            const meta = data?.chart?.result?.[0]?.meta;
            if (meta?.regularMarketPrice) {
              const price = meta.regularMarketPrice;
              const prev  = meta.chartPreviousClose || meta.previousClose || price;
              const chg   = price - prev;
              const pct   = prev ? (chg / prev) * 100 : 0;
              const fmt   = v => v >= 10000 ? v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
                                : v >= 100   ? v.toFixed(2)
                                : v.toFixed(4);
              setQ({ price: fmt(price), chg: (chg >= 0 ? "+" : "") + chg.toFixed(2), pct: (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%", up: chg >= 0 });
              setYfUsed(sym);
              setLoading(false);
              return;
            }
          } catch (_) {}
        }
      }
      setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syms.join(",")]);
    React.useEffect(() => { doFetch(); }, [doFetch]);
    return (
      <div style={{ background: t.bg, border: `1px solid ${cor}28`, borderRadius: 10, padding: "10px 12px", minWidth: 0, minHeight: 78 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ color: cor, fontWeight: 800, fontSize: 12 }}>{nome}</div>
            <div style={{ color: t.muted, fontSize: 9 }}>{yfUsed || (Array.isArray(yf) ? yf[0] : yf)}</div>
          </div>
          <span style={{ background: "#1e3a5f", borderRadius: 3, padding: "1px 4px", color: "#60a5fa", fontSize: 8, fontWeight: 700 }}>YF</span>
        </div>
        {loading ? (
          <div style={{ fontSize: 12, color: t.muted, marginTop: 6 }}>⏳ buscando...</div>
        ) : q ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 900, color: q.up ? "#4ade80" : "#f87171" }}>{q.price}</div>
            <div style={{ fontSize: 10, color: q.up ? "#4ade80" : "#f87171", fontWeight: 600 }}>{q.chg} ({q.pct})</div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: t.muted, marginTop: 6 }}>N/D</div>
        )}
      </div>
    );
  };

  // Card multi-fonte: tenta TV API → Yahoo Finance → Stooq CSV
  const TVFetchCard = ({ tvSym, yfSyms, stooqSyms, nasdaqSym, barchartSym, nome, cor }) => {
    const [q, setQ] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [fonte, setFonte] = React.useState(null);
    const fmt = p => p >= 10000 ? p.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : p.toFixed(2);
    const mkQ = (price, prev, label) => {
      const chg = price - prev;
      const pct = prev ? (chg / prev) * 100 : 0;
      setQ({ price: fmt(price), chg: (chg >= 0 ? "+" : "") + chg.toFixed(2), pct: (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%", up: chg >= 0 });
      setFonte(label);
    };
    const doFetch = React.useCallback(async () => {
      setLoading(true);
      const cproxies = [u => `https://corsproxy.io/?${encodeURIComponent(u)}`, u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`];
      const tryFetch = async (url, isAllOriginsGet) => {
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        return isAllOriginsGet ? JSON.parse((await r.json()).contents) : await r.json();
      };
      // 1) TradingView quotes API
      if (tvSym) {
        const url = `https://query1.tradingview.com/quotes?symbols=${encodeURIComponent(tvSym)}&fields=ch,chp,lp,prev_close_price`;
        for (const mk of cproxies) {
          try {
            const d = await tryFetch(mk(url), mk(url).includes("/get?url="));
            const v = d?.d?.[0]?.v;
            if (v?.lp) { mkQ(v.lp, v.lp - (v.ch || 0), "TV"); setLoading(false); return; }
          } catch (_) {}
        }
      }
      // 2) Yahoo Finance
      for (const sym of (yfSyms || [])) {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
        for (const mk of cproxies) {
          try {
            const d = await tryFetch(mk(url), mk(url).includes("/get?url="));
            const meta = d?.chart?.result?.[0]?.meta;
            if (meta?.regularMarketPrice) { mkQ(meta.regularMarketPrice, meta.chartPreviousClose || meta.regularMarketPrice, `YF:${sym}`); setLoading(false); return; }
          } catch (_) {}
        }
      }
      // 3) Stooq CSV
      for (const sym of (stooqSyms || [])) {
        const url = `https://stooq.com/q/l/?s=${sym}&f=sd2t2ohlcvp&h&e=csv`;
        for (const mk of cproxies) {
          try {
            const d = await tryFetch(mk(url), mk(url).includes("/get?url="));
            const text = typeof d === "string" ? d : d?.contents || "";
            const lines = text.trim().split("\n");
            if (lines.length >= 2) {
              const cols = lines[1].split(",");
              const close = parseFloat(cols[6]), prev = parseFloat(cols[8]);
              if (close && close > 0) { mkQ(close, prev || close, `Stooq:${sym}`); setLoading(false); return; }
            }
          } catch (_) {}
        }
      }
      // 4) Nasdaq Data Link CHRIS (sem API key — rate limit generoso)
      if (nasdaqSym) {
        const url = `https://data.nasdaq.com/api/v3/datasets/${nasdaqSym}/data.json?rows=1`;
        for (const mk of cproxies) {
          try {
            const d = await tryFetch(mk(url), mk(url).includes("/get?url="));
            const row = d?.dataset_data?.data?.[0];
            if (row) {
              const settle = parseFloat(row[4]), change = parseFloat(row[5]);
              if (settle > 0) { mkQ(settle, settle - change, "NDL"); setLoading(false); return; }
            }
          } catch (_) {}
        }
      }
      // 5) Barchart proxy público (delayed)
      if (barchartSym) {
        const url = `https://www.barchart.com/proxies/core-api/v1/quotes/get?symbols=${encodeURIComponent(barchartSym)}&fields=lastPrice,priceChange,percentChange&groupBy=none&raw=1`;
        for (const mk of cproxies) {
          try {
            const d = await tryFetch(mk(url), mk(url).includes("/get?url="));
            const q0 = d?.data?.[0];
            if (q0?.lastPrice) {
              const price = parseFloat(q0.lastPrice), chg = parseFloat(q0.priceChange || 0), pct = parseFloat(q0.percentChange || 0);
              setQ({ price: fmt(price), chg: (chg >= 0 ? "+" : "") + chg.toFixed(2), pct: (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%", up: chg >= 0 });
              setFonte("BCH"); setLoading(false); return;
            }
          } catch (_) {}
        }
      }
      // 6) CME Group API — Iron Ore 62% Fe produto 401 (delayed 10min, sem auth)
      {
        const url = "https://www.cmegroup.com/CmeWS/mvc/Quotes/Future/401/G";
        for (const mk of cproxies) {
          try {
            const d = await tryFetch(mk(url), mk(url).includes("/get?url="));
            const q0 = d?.quotes?.[0];
            if (q0?.last && q0.last !== "-") {
              const price = parseFloat(q0.last.replace(",", "")), chg = parseFloat(q0.change || 0);
              const prev = price - chg;
              if (price > 0) { mkQ(price, prev, "CME"); setLoading(false); return; }
            }
          } catch (_) {}
        }
      }
      setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tvSym, (yfSyms||[]).join(","), (stooqSyms||[]).join(","), nasdaqSym, barchartSym]);
    React.useEffect(() => { doFetch(); }, [doFetch]);
    return (
      <div style={{ background: t.bg, border: `1px solid ${cor}28`, borderRadius: 10, padding: "10px 12px", minWidth: 0, minHeight: 78 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ color: cor, fontWeight: 800, fontSize: 12 }}>{nome}</div>
            <div style={{ color: t.muted, fontSize: 9 }}>{fonte || tvSym || (yfSyms||[])[0] || ""}</div>
          </div>
          <span style={{ background: "#1a2a1a", borderRadius: 3, padding: "1px 4px", color: "#4ade80", fontSize: 8, fontWeight: 700 }}>●</span>
        </div>
        {loading ? (
          <div style={{ fontSize: 12, color: t.muted, marginTop: 6 }}>⏳ buscando...</div>
        ) : q ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 900, color: q.up ? "#4ade80" : "#f87171" }}>{q.price}</div>
            <div style={{ fontSize: 10, color: q.up ? "#4ade80" : "#f87171", fontWeight: 600 }}>{q.chg} ({q.pct})</div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: t.muted, marginTop: 6 }}>N/D</div>
        )}
      </div>
    );
  };

  // Card genérico para qualquer ativo do /macro (petroleo, sp500, etc.)
  const MacroCard = ({ chave, nome, cor }) => {
    const d    = tvData?.[chave];
    const isUp = d ? d.percent >= 0 : null;
    const clr  = isUp === null ? cor : (isUp ? "#4ade80" : "#f87171");
    return (
      <div style={{ background: t.bg, border: `1px solid ${cor}28`, borderRadius: 10, padding: "10px 12px", minWidth: 0, minHeight: 78 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ color: cor, fontWeight: 800, fontSize: 12 }}>{nome}</div>
            <div style={{ color: t.muted, fontSize: 9 }}>{d?.fonte ? d.fonte.split(":")[0] : "Mercado"}</div>
          </div>
          <span style={{ background: "#1a2a1a", borderRadius: 3, padding: "1px 4px", color: "#4ade80", fontSize: 8, fontWeight: 700 }}>LIVE</span>
        </div>
        {d && d.preco != null ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 900, color: clr }}>{d.preco.toFixed(2)}</div>
            <div style={{ fontSize: 10, color: clr, fontWeight: 600 }}>
              {isUp ? "+" : ""}{(d.variacao ?? 0).toFixed(2)} ({isUp ? "+" : ""}{(d.percent ?? 0).toFixed(2)}%)
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: t.muted, marginTop: 6 }}>⏳ carregando...</div>
        )}
      </div>
    );
  };

  // Card do Minério FEF1! — usa tvData.minerio do polling principal
  const MinerioCard = ({ nome, cor }) => {
    const d  = tvData?.minerio;
    const up = d ? d.percent >= 0 : null;
    const clr = up === null ? cor : (up ? "#4ade80" : "#f87171");
    return (
      <div style={{ background: t.bg, border: `1px solid ${cor}28`, borderRadius: 10, padding: "10px 12px", minWidth: 0, minHeight: 78 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ color: cor, fontWeight: 800, fontSize: 12 }}>{nome}</div>
            <div style={{ color: t.muted, fontSize: 9 }}>SGX:FEF1!</div>
          </div>
          <span style={{ background: "#1a2a1a", borderRadius: 3, padding: "1px 4px", color: "#4ade80", fontSize: 8, fontWeight: 700 }}>LIVE</span>
        </div>
        {d && d.preco != null ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 900, color: clr }}>
              {d.preco.toFixed(2)} <span style={{ fontSize: 9, color: t.muted, fontWeight: 400 }}>USD</span>
            </div>
            <div style={{ fontSize: 10, color: clr, fontWeight: 600 }}>
              {up ? "+" : ""}{(d.variacao ?? 0).toFixed(2)} ({up ? "+" : ""}{(d.percent ?? 0).toFixed(2)}%)
            </div>
          </>
        ) : (
          <div style={{ fontSize: 10, color: t.muted, marginTop: 6 }}>⏳ aguardando servidor...</div>
        )}
      </div>
    );
  };

  const OtcCard = ({ ticker, nome }) => {
    const [cotacao, setCotacao] = React.useState(null);
    React.useEffect(() => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      fetch(proxy, { signal: AbortSignal.timeout(8000) })
        .then(r => r.json())
        .then(j => {
          const meta = JSON.parse(j.contents)?.chart?.result?.[0]?.meta;
          if (meta?.regularMarketPrice) {
            const price = meta.regularMarketPrice;
            const prev  = meta.chartPreviousClose || meta.previousClose || price;
            const chg   = price - prev;
            const pct   = prev ? (chg/prev)*100 : 0;
            setCotacao({ price: price.toFixed(2), chg: (chg>=0?"+":"")+chg.toFixed(2), pct: (pct>=0?"+":"")+pct.toFixed(2)+"%", up: chg>=0 });
          }
        }).catch(() => {});
    }, [ticker]);
    const cor = "#4ade80";
    return (
      <div style={{ background: t.bg, border: `1px solid ${cor}28`, borderRadius: 10, padding: "10px 12px", minWidth: 0, minHeight: 78 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ color: cor, fontWeight: 800, fontSize: 12 }}>{ticker}</div>
            <div style={{ color: t.muted, fontSize: 9 }}>{nome}</div>
          </div>
          <span style={{ background: "#1e3a5f", borderRadius: 3, padding: "1px 4px", color: "#60a5fa", fontSize: 8, fontWeight: 700 }}>OTC</span>
        </div>
        {cotacao ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 900, color: cotacao.up ? "#4ade80" : "#f87171" }}>{cotacao.price}</div>
            <div style={{ fontSize: 10, color: cotacao.up ? "#4ade80" : "#f87171", fontWeight: 600 }}>{cotacao.chg} ({cotacao.pct})</div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: t.muted, marginTop: 6 }}>⏳ buscando...</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
      <div onClick={() => setOpen(!open)} style={{ background: t.header, borderBottom: open ? `1px solid ${t.border}` : "none", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>🌍</span>
          <span style={{ color: t.accent, fontWeight: 800, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Mercados Globais</span>
          <span style={{ background: "#3b82f618", border: "1px solid #3b82f633", borderRadius: 999, padding: "2px 8px", color: "#60a5fa", fontSize: 9, fontWeight: 700 }}>VIX · DXY · Ouro · BTC · DI · ADRs</span>
        </div>
        <span style={{ color: t.muted, fontSize: 12, transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform .2s", display: "inline-block" }}>▲</span>
      </div>
      {open && (
        <div style={{ padding: "10px 14px" }}>
          {/* Linha: VIX + Índices + DI lado a lado */}
          <Titulo icon="📊" label="VOLATILIDADE · DÓLAR · ÍNDICES · DI FUTURO" cor="#60a5fa" />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 220px", gap: 10, alignItems: "start" }}>

            {/* Esquerda: índices + commodities empilhados */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Linha 1: VIX + grupo 1 */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isSmallMobile ? "repeat(2,minmax(0,1fr))" : isMobile ? "repeat(3,minmax(0,1fr))" : "repeat(6, 1fr)",
                gap: isSmallMobile ? 6 : 8
              }}>
                <VixCard t={t} tvData={tvData} />
                {widgets.filter(w => w.grupo === 1).map(w =>
                  w.tvMacro ? <MacroCard key={w.tvMacro} chave={w.tvMacro} nome={w.nome} cor={w.cor} />
                            : <QuoteCard key={w.yf}      yf={w.yf}         nome={w.nome} cor={w.cor} />
                )}
              </div>

              {/* Linha 2: Commodities · Cripto */}
              <div>
                <Titulo icon="🛢️" label="COMMODITIES · CRIPTO" cor="#f59e0b" />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isSmallMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4, 1fr)",
                  gap: isSmallMobile ? 6 : 8
                }}>
                  {widgets.filter(w => w.grupo === 2).map(w =>
                    w.tvMacro ? <MacroCard   key={w.tvMacro} chave={w.tvMacro} nome={w.nome} cor={w.cor} />
                  : w.yf      ? <QuoteCard   key={w.yf}      yf={w.yf}         nome={w.nome} cor={w.cor} />
                  : w.tvFetch ? <MinerioCard key={w.tvSym||w.nome}             nome={w.nome} cor={w.cor} />
                  :              <TVCard     key={w.sym}      sym={w.sym}       nome={w.nome} cor={w.cor} />
                  )}
                </div>
              </div>
            </div>

            {/* Direita: DI Futuro B3 */}
            <div style={{ alignSelf: "start", marginTop: isMobile ? 6 : 0 }}>
              <div style={{ color: "#a855f7", fontWeight: 800, fontSize: 9, letterSpacing: 1, marginBottom: 6, whiteSpace: "nowrap" }}>🏦 DI FUTURO B3</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {DI_CONFIG.map(di => {
                  const cfg = JSON.stringify({ symbol: di.tvSym, width: "100%", colorTheme: "dark", isTransparent: true, locale: "br" });
                  const src = `https://s.tradingview.com/embed-widget/single-quote/?locale=br#${encodeURIComponent(cfg)}`;
                  return (
                    <div key={di.nome} style={{ background: t.bg, border: `1px solid ${di.cor}28`, borderRadius: 8, overflow: "hidden", position: "relative" }}>
                      <iframe src={src} style={{ width: "100%", height: 78, border: "none", display: "block" }} scrolling="no" allowTransparency={true} title={di.nome} />
                      <div style={{ position: "absolute", inset: 0, background: "transparent", cursor: "default" }} aria-hidden="true" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <ADRBrasileiras t={t} />
        </div>
      )}
    </div>
  );
}


// ─── MERCADO HOJE — REGISTRO DO DIA ─────────────────────────────────────────
function MercadoHojeCard({ t, registros, onRegistrar, onIrAnalise }) {
  const hoje = hojeStr();
  const existente = registros.find(r => r.data === hoje);
  const [correlacao, setCorrelacao] = React.useState(existente?.correlacao || "");
  const [noticia,    setNoticia]    = React.useState(existente?.noticia    ?? false);
  const [abertura,   setAbertura]   = React.useState(existente?.abertura   || "");
  const [movimento,  setMovimento]  = React.useState(existente?.movimento  || "");
  const [trava,      setTrava]      = React.useState(existente?.trava      ?? false);
  const [obs,        setObs]        = React.useState(existente?.obs        || "");
  const [open,       setOpen]       = React.useState(true);
  const [salvo,      setSalvo]      = React.useState(false);

  React.useEffect(() => {
    const r = registros.find(r => r.data === hoje);
    if (r) {
      setCorrelacao(r.correlacao || "");
      setNoticia(r.noticia ?? false);
      setAbertura(r.abertura || "");
      setMovimento(r.movimento || "");
      setTrava(r.trava ?? false);
      setObs(r.obs || "");
    }
  }, [registros, hoje]);

  function handleRegistrar() {
    onRegistrar({ data: hoje, correlacao, noticia, abertura, movimento, trava, obs });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  const btnStyle = (ativo, cor) => ({
    padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700,
    border: `1px solid ${ativo ? cor : "#555"}`,
    background: ativo ? cor + "22" : "transparent",
    color: ativo ? cor : "#94a3b8",
    transition: "all .15s",
  });

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
      <div onClick={() => setOpen(o => !o)} style={{ background: t.header, borderBottom: open ? `1px solid ${t.border}` : "none", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>📋</span>
          <span style={{ color: "#38bdf8", fontWeight: 800, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>O que o mercado fez Hoje?</span>
          {existente && <span style={{ background: "#22c55e22", border: "1px solid #22c55e44", borderRadius: 999, padding: "1px 7px", color: "#22c55e", fontSize: 9, fontWeight: 700 }}>✓ Registrado</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={e => { e.stopPropagation(); onIrAnalise(); }} style={{ background: "transparent", border: "1px solid #38bdf855", borderRadius: 5, color: "#38bdf8", fontSize: 9, fontWeight: 700, padding: "2px 8px", cursor: "pointer" }}>
            Ver histórico →
          </button>
          <span style={{ color: t.muted, fontSize: 12, transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform .2s", display: "inline-block" }}>▲</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Correlação */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: t.muted, fontSize: 10, minWidth: 110 }}>Correlação:</span>
            {[["positiva","Positiva ↑","#4ade80"],["negativa","Negativa ↓","#f87171"],["neutro","Neutro →","#f59e0b"]].map(([v,l,c]) => (
              <button key={v} onClick={() => setCorrelacao(v)} style={btnStyle(correlacao===v, c)}>{l}</button>
            ))}
          </div>

          {/* Notícia */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: t.muted, fontSize: 10, minWidth: 110 }}>Notícia alto impacto?</span>
            {[[true,"SIM","#f87171"],[false,"NÃO","#94a3b8"]].map(([v,l,c]) => (
              <button key={String(v)} onClick={() => setNoticia(v)} style={btnStyle(noticia===v, c)}>{l}</button>
            ))}
          </div>

          {/* Abertura */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: t.muted, fontSize: 10, minWidth: 110 }}>Como abriu?</span>
            {[["gap_alta","GAP ↑","#4ade80"],["sem_gap","Sem GAP","#f59e0b"],["gap_baixa","GAP ↓","#f87171"]].map(([v,l,c]) => (
              <button key={v} onClick={() => setAbertura(v)} style={btnStyle(abertura===v, c)}>{l}</button>
            ))}
          </div>

          {/* Movimento */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: t.muted, fontSize: 10, minWidth: 110 }}>Fez o que depois?</span>
            {[["subiu","Subiu ↑","#4ade80"],["caiu","Caiu ↓","#f87171"],["lateralizou","Lateralizou ↔","#f59e0b"]].map(([v,l,c]) => (
              <button key={v} onClick={() => setMovimento(v)} style={btnStyle(movimento===v, c)}>{l}</button>
            ))}
          </div>

          {/* Trava */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: t.muted, fontSize: 10, minWidth: 110 }}>Tinha trava na abertura?</span>
            {[[true,"SIM","#a78bfa"],[false,"NÃO","#94a3b8"]].map(([v,l,c]) => (
              <button key={String(v)} onClick={() => setTrava(v)} style={btnStyle(trava===v, c)}>{l}</button>
            ))}
          </div>

          {/* Observação */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color: t.muted, fontSize: 10, minWidth: 110, paddingTop: 4 }}>Observação:</span>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Escreva algo sobre o dia..."
              rows={2}
              style={{ flex: 1, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontSize: 11, padding: "5px 8px", resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {/* Botão */}
          <button
            onClick={handleRegistrar}
            style={{ alignSelf: "flex-end", background: salvo ? "#22c55e22" : "#38bdf822", border: `1px solid ${salvo ? "#22c55e" : "#38bdf8"}`, borderRadius: 7, color: salvo ? "#22c55e" : "#38bdf8", fontWeight: 700, fontSize: 11, padding: "6px 18px", cursor: "pointer", transition: "all .2s" }}
          >
            {salvo ? "✓ Registrado!" : "Registrar Informação"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ABA ANÁLISE DE MERCADO ──────────────────────────────────────────────────
function MercadoAnaliseTab({ t, registros, onDelete }) {
  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0, 7);
  const [mesSel, setMesSel] = React.useState(mesAtual);

  const meses = React.useMemo(() => {
    const set = new Set(registros.map(r => r.data.slice(0, 7)));
    set.add(mesAtual);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [registros, mesAtual]);

  const registrosMes = registros
    .filter(r => r.data.startsWith(mesSel))
    .sort((a, b) => a.data.localeCompare(b.data));

  const labelCorrelacao = v => v === "positiva" ? { txt: "Positiva ↑", cor: "#4ade80" } : v === "negativa" ? { txt: "Negativa ↓", cor: "#f87171" } : v === "neutro" ? { txt: "Neutro →", cor: "#f59e0b" } : { txt: "—", cor: "#94a3b8" };
  const labelAbertura   = v => v === "gap_alta" ? { txt: "GAP ↑", cor: "#4ade80" } : v === "gap_baixa" ? { txt: "GAP ↓", cor: "#f87171" } : v === "sem_gap" ? { txt: "Sem GAP", cor: "#f59e0b" } : { txt: "—", cor: "#94a3b8" };
  const labelMovimento  = v => v === "subiu" ? { txt: "Subiu ↑", cor: "#4ade80" } : v === "caiu" ? { txt: "Caiu ↓", cor: "#f87171" } : v === "corrigiu" ? { txt: "Corrigiu ↔", cor: "#f59e0b" } : { txt: "—", cor: "#94a3b8" };

  const nomeMesFmt = m => { const [y, mo] = m.split("-"); return `${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][parseInt(mo)-1]}/${y}`; };

  const badge = (txt, cor) => (
    <span style={{ background: cor + "22", border: `1px solid ${cor}66`, borderRadius: 6, padding: "4px 11px", color: cor, fontSize: 12, fontWeight: 800, display:"inline-block", letterSpacing:"0.2px" }}>{txt}</span>
  );

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap:"wrap" }}>
        <span style={{ color: "#38bdf8", fontWeight: 800, fontSize: 18 }}>📊 Correlação Dia</span>
        <select value={mesSel} onChange={e => setMesSel(e.target.value)} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 7, color: t.text, fontSize: 13, padding: "5px 10px" }}>
          {meses.map(m => <option key={m} value={m}>{nomeMesFmt(m)}</option>)}
        </select>
        <span style={{ background:"#38bdf822", border:"1px solid #38bdf844", borderRadius:999, padding:"3px 12px", color:"#38bdf8", fontSize:12, fontWeight:700 }}>
          {registrosMes.length} {registrosMes.length === 1 ? "dia registrado" : "dias registrados"}
        </span>
      </div>

      {registrosMes.length === 0 ? (
        <div style={{ color: t.muted, textAlign: "center", padding: "60px 0", fontSize: 14 }}>
          Nenhum registro para este mês.<br/>
          <span style={{fontSize:12, marginTop:6, display:"block"}}>Use o card "O que o mercado fez Hoje?" na aba Início.</span>
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${t.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: t.header }}>
                {[
                  { l:"Data",       w:100 },
                  { l:"Correlação", w:130 },
                  { l:"Notícia",    w:90  },
                  { l:"Como abriu", w:110 },
                  { l:"Movimento",  w:120 },
                  { l:"Trava",      w:80  },
                  { l:"Observação", w:null},
                  { l:"",           w:50  },
                ].map(h => (
                  <th key={h.l} style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 700, fontSize: 11, textAlign: "left", borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap", width: h.w || undefined, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h.l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registrosMes.map((r, i) => {
                const [y, m, d] = r.data.split("-");
                const dataFmt = `${d}/${m}/${y}`;
                const co = labelCorrelacao(r.correlacao);
                const ab = labelAbertura(r.abertura);
                const mv = labelMovimento(r.movimento);
                const isHoje = r.data === new Date().toISOString().slice(0,10);
                return (
                  <tr key={r.data} style={{ background: isHoje ? "#38bdf808" : i % 2 === 0 ? t.bg : t.card, borderBottom: `1px solid ${t.border}33`, transition:"background .15s" }}>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ color: isHoje ? "#38bdf8" : t.text, fontWeight: 800, fontSize: 13 }}>{dataFmt}</span>
                      {isHoje && <span style={{ marginLeft:6, background:"#38bdf822", border:"1px solid #38bdf844", borderRadius:4, padding:"1px 6px", color:"#38bdf8", fontSize:9, fontWeight:700 }}>HOJE</span>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>{badge(co.txt, co.cor)}</td>
                    <td style={{ padding: "12px 14px" }}>{r.noticia ? badge("SIM ⚠️", "#f87171") : badge("NÃO", "#64748b")}</td>
                    <td style={{ padding: "12px 14px" }}>{badge(ab.txt, ab.cor)}</td>
                    <td style={{ padding: "12px 14px" }}>{badge(mv.txt, mv.cor)}</td>
                    <td style={{ padding: "12px 14px" }}>{r.trava ? badge("SIM", "#a78bfa") : badge("NÃO", "#64748b")}</td>
                    <td style={{ padding: "12px 14px", color: r.obs ? t.text : t.muted, fontSize: 12, maxWidth: 260, lineHeight:1.5 }}>{r.obs || "—"}</td>
                    <td style={{ padding: "12px 14px", textAlign:"center" }}>
                      <button onClick={() => onDelete(r.data)} title="Excluir" style={{ background: "#f8717111", border: "1px solid #f8717144", borderRadius: 6, color: "#f87171", fontSize: 11, fontWeight: 700, padding: "4px 10px", cursor: "pointer" }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── MAPEAMENTO ATIVO → SÍMBOLO TRADINGVIEW ──────────────────────────────────
const TV_SYMBOLS = {
  WINFUT:  "BMFBOVESPA:WIN1!",
  WDOFUT:  "BMFBOVESPA:WDO1!",
  AUDUSD:  "OANDA:AUDUSD",
  BCHUSD:  "BITSTAMP:BCHUSD",
  BTCUSD:  "BITSTAMP:BTCUSD",
  CN50:    "OANDA:CN50USD",
  EURGBP:  "OANDA:EURGBP",
  EURJPY:  "OANDA:EURJPY",
  EURUSD:  "OANDA:EURUSD",
  FR40:    "OANDA:FR40EUR",
  GBPJPY:  "OANDA:GBPJPY",
  GBPUSD:  "OANDA:GBPUSD",
  GER40:   "OANDA:DE40EUR",
  HK50:    "OANDA:HK33HKD",
  JP225:   "OANDA:JP225USD",
  UK100:   "OANDA:UK100GBP",
  US100:   "OANDA:NAS100USD",
  US30:    "OANDA:US30USD",
  US500:   "OANDA:SPX500USD",
  USDJPY:  "OANDA:USDJPY",
  XAGUSD:  "OANDA:XAGUSD",
  XAUUSD:  "OANDA:XAUUSD",
  ETHUSD:  "BITSTAMP:ETHUSD",
  SOLUSD:  "CRYPTO:SOLUSD",
  XRPUSD:  "BITSTAMP:XRPUSD",
  USOIL:   "TVC:USOIL",
  UKOIL:   "TVC:UKOIL",
  NATGAS:  "TVC:NATURAL_GAS",
};

// ─── GRÁFICO TRADINGVIEW (EMBED WIDGET) ─────────────────────────────────────
const TV_STUDIES_VWAP  = [{ id: "VWAP@tv-basicstudies" }];
const TV_STUDIES_MEDIAS = [
  { id: "VWAP@tv-basicstudies" },
  { id: "MAExp@tv-basicstudies",    inputs: { length: 9,   source: "close" } },
  { id: "MASimple@tv-basicstudies", inputs: { length: 21,  source: "close" } },
  { id: "MASimple@tv-basicstudies", inputs: { length: 50,  source: "close" } },
  { id: "MASimple@tv-basicstudies", inputs: { length: 200, source: "close" } },
  { id: "MAExp@tv-basicstudies",    inputs: { length: 400, source: "close" } },
];

function TradingViewChart({ ativo, interval, darkMode, studies }) {
  const containerRef = React.useRef(null);
  const symbol     = TV_SYMBOLS[ativo] || "BMFBOVESPA:WIN1!";
  const studiesKey = JSON.stringify(studies);

  React.useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.cssText = "height:100%;width:100%";
    containerRef.current.appendChild(widget);
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: interval || "5",
      timezone: "America/Sao_Paulo",
      theme: "light",
      style: "1",
      locale: "br",
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      studies: studies || [],
    });
    containerRef.current.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval, darkMode, studiesKey]);

  return (
    <div ref={containerRef} className="tradingview-widget-container"
      style={{ width:"100%", height:"100%" }}/>
  );
}


// ─── PLANO DE TRADE ─────────────────────────────────────────────────────────
function PlanoTradeTab({ t, user }) {
  const [subTab, setSubTab] = React.useState(null);
  const [registrosPre, setRegistrosPre] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("plano_pre") || "[]"); } catch { return []; }
  });
  const [registrosOp, setRegistrosOp] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("plano_oportunidades") || "[]"); } catch { return []; }
  });

  // ── Helpers de conversão ──
  const rowToReg = r => ({
    id: r.id, data: r.data, ativo: r.ativo || "", texto: r.texto || "",
    fotos: r.fotos || [], regioes: r.regioes || [],
    tf: r.tf || "", candle: r.candle || "", retracao: r.retracao || "",
    tfs: r.tfs || [], mediasPerTf: r.medias_per_tf || {}, filtros: r.filtros || [],
    stop: r.stop || "", pontos: r.pontos || "", travas: r.travas || [], observacoes: r.observacoes || "",
  });
  const regToRow = (r, tipo) => ({
    id: r.id, user_id: user.id, tipo,
    data: r.data, ativo: r.ativo || "", texto: r.texto || "",
    fotos: r.fotos || [], regioes: r.regioes || [],
    tf: r.tf || "", candle: r.candle || "", retracao: r.retracao || "",
    tfs: r.tfs || [], medias_per_tf: r.mediasPerTf || {}, filtros: r.filtros || [],
    stop: r.stop || "", pontos: r.pontos || "", travas: r.travas || [], observacoes: r.observacoes || "",
  });

  // ── Carrega do Supabase ao montar + migra localStorage se ainda não migrou ──
  React.useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: rows, error } = await supabase
        .from("plano_estudos").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return;
      if (rows.length === 0) {
        // Migra localStorage → Supabase (primeira vez)
        const localPre = (() => { try { return JSON.parse(localStorage.getItem("plano_pre") || "[]"); } catch { return []; } })();
        const localOp  = (() => { try { return JSON.parse(localStorage.getItem("plano_oportunidades") || "[]"); } catch { return []; } })();
        if (localPre.length > 0 || localOp.length > 0) {
          const migracao = [
            ...localPre.map(r => regToRow(r, "pre")),
            ...localOp.map(r => regToRow(r, "oportunidades")),
          ];
          await supabase.from("plano_estudos").upsert(migracao, { onConflict: "id" });
        }
      }
      const pre = rows.filter(r => r.tipo === "pre").map(rowToReg);
      const op  = rows.filter(r => r.tipo === "oportunidades").map(rowToReg);
      setRegistrosPre(pre);
      setRegistrosOp(op);
      localStorage.setItem("plano_pre", JSON.stringify(pre));
      localStorage.setItem("plano_oportunidades", JSON.stringify(op));
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const [data, setData] = React.useState(new Date().toISOString().slice(0, 10));
  const [texto, setTexto] = React.useState("");
  const [ativo, setAtivo] = React.useState("");
  // Gráfico TradingView
  const [chartAberto, setChartAberto] = React.useState(false);
  const [chartInterval, setChartInterval] = React.useState("5");
  const chartHeightRef = React.useRef(600);
  const [chartMontado, setChartMontado] = React.useState(false);
  const [mediasAtivas, setMediasAtivas] = React.useState(false);
  const [printando, setPrintando] = React.useState(false);
  const [estudoImportado, setEstudoImportado] = React.useState(null); // { fotos, data, ativo }
  const [modalImport, setModalImport] = React.useState(null); // registro pré candidato
  const darkMode = t.bg === DARK.bg;
  const chartDrag = React.useRef({ active: false, startY: 0, startH: 0 });
  const chartWrapperRef = React.useRef(null);
  const printChart = async () => {
    if (!chartWrapperRef.current) return;
    setPrintando(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, preferCurrentTab: true, selfBrowserSurface: "include" });
      const video = document.createElement("video");
      video.srcObject = stream;
      await new Promise(r => { video.onloadedmetadata = r; });
      video.play();
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 200));
      const rect = chartWrapperRef.current.getBoundingClientRect();
      const vw = video.videoWidth, vh = video.videoHeight;
      const ww = window.innerWidth, wh = window.innerHeight;
      const sx = (rect.left / ww) * vw, sy = (rect.top / wh) * vh;
      const sw = (rect.width / ww) * vw, sh = (rect.height / wh) * vh;
      const canvas = document.createElement("canvas");
      canvas.width = sw; canvas.height = sh;
      canvas.getContext("2d").drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
      stream.getTracks().forEach(t => t.stop());
      const dataUrl = canvas.toDataURL("image/png");
      setFotos(p => p.length < 5 ? [...p, dataUrl] : p);
    } catch (err) {
      if (err.name !== "AbortError") alert("Não foi possível capturar. Use Ctrl+PrintScreen e adicione a foto manualmente.");
    } finally {
      setPrintando(false);
    }
  };
  // Fotos
  const [fotos, setFotos] = React.useState([]);
  const [fotoZoom, setFotoZoom] = React.useState(null);
  // Regiões de compra (Pré Mercado)
  const [regioes, setRegioes] = React.useState([]);
  const [addingRegiao, setAddingRegiao] = React.useState(false);
  const [rf, setRf] = React.useState({ categoria:"compra", preco:"", tipo:"", tfs:[], mediasPerTf:{}, infos:[], novaInfo:"" });
  const [editandoId, setEditandoId] = React.useState(null);
  const [filtroData, setFiltroData] = React.useState("");
  const [filtroAtivo, setFiltroAtivo] = React.useState("");
  // Oportunidades do Dia — campos específicos
  const [opTf, setOpTf] = React.useState("");
  const [opCandle, setOpCandle] = React.useState("");
  const [opRetracao, setOpRetracao] = React.useState("");
  const [opTfs, setOpTfs] = React.useState([]);
  const [opMediasPerTf, setOpMediasPerTf] = React.useState({});
  const [opFiltros, setOpFiltros] = React.useState([]);
  const [opNovoFiltro, setOpNovoFiltro] = React.useState("");
  const [opStop, setOpStop] = React.useState("");
  const [opPontos, setOpPontos] = React.useState("");
  const [opTravas, setOpTravas] = React.useState([]);
  const [opNovaTrava, setOpNovaTrava] = React.useState("");
  const [opObservacoes, setOpObservacoes] = React.useState("");
  const setRfField = (k, v) => setRf(p => ({ ...p, [k]: v }));

  const onAtivoChange = (novoAtivo, isPre) => {
    setAtivo(novoAtivo);
    if (!isPre && novoAtivo) {
      const hoje = new Date().toISOString().slice(0, 10);
      const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const candidato = registrosPre.find(r =>
        r.ativo === novoAtivo && (r.data === hoje || r.data === ontem) && (r.fotos || []).length > 0
      );
      if (candidato) setModalImport(candidato);
    }
  };

  const toggleTf = (tf) => setRf(p => ({
    ...p, tfs: p.tfs.includes(tf) ? p.tfs.filter(x => x !== tf) : [...p.tfs, tf]
  }));
  const toggleMa = (tf, ma) => setRf(p => {
    const cur = p.mediasPerTf[tf] || [];
    return { ...p, mediasPerTf: { ...p.mediasPerTf, [tf]: cur.includes(ma) ? cur.filter(x => x !== ma) : [...cur, ma] } };
  });
  const addInfo = () => {
    if (!rf.novaInfo.trim()) return;
    setRf(p => ({ ...p, infos: [...p.infos, p.novaInfo.trim()], novaInfo: "" }));
  };
  const contarFiltros = (reg) => {
    let n = 0;
    if (reg.tipo) n++;
    (reg.tfs || []).forEach(tf => { n += (reg.mediasPerTf?.[tf]?.length || 0); });
    n += (reg.infos?.length || 0);
    return n;
  };
  const adicionarRegiao = () => {
    if (!rf.preco) return;
    setRegioes(p => [...p, { ...rf, id: Date.now(), novaInfo: undefined }]);
    setRf({ categoria:"compra", preco:"", tipo:"", tfs:[], mediasPerTf:{}, infos:[], novaInfo:"" });
    setAddingRegiao(false);
  };

  const onFotoUpload = (e) => {
    Array.from(e.target.files).forEach(file => {
      if (fotos.length >= 5) return;
      const reader = new FileReader();
      reader.onload = ev => setFotos(p => p.length < 5 ? [...p, ev.target.result] : p);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // Ctrl+V: cola imagem da área de transferência direto nas fotos
  React.useEffect(() => {
    const onPaste = (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find(it => it.type.startsWith("image/"));
      if (!imgItem) return;
      const file = imgItem.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => setFotos(p => p.length < 5 ? [...p, ev.target.result] : p);
      reader.readAsDataURL(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const resetOpForm = () => {
    setOpTf(""); setOpCandle(""); setOpRetracao("");
    setOpTfs([]); setOpMediasPerTf({}); setOpFiltros([]); setOpNovoFiltro("");
    setOpStop(""); setOpPontos(""); setOpTravas([]); setOpNovaTrava(""); setOpObservacoes("");
  };

  const salvar = async (tipo) => {
    const isPre = tipo === "pre";
    if (!ativo && !texto.trim() && fotos.length === 0 && (isPre ? regioes.length === 0 : opFiltros.length === 0 && !opTf && !opCandle && !opRetracao)) return;
    const opExtra = isPre ? {} : { tf:opTf, candle:opCandle, retracao:opRetracao, mediasPerTf:opMediasPerTf, tfs:opTfs, filtros:opFiltros, stop:opStop, pontos:opPontos, travas:opTravas, observacoes:opObservacoes };
    if (editandoId) {
      const reg = { id: editandoId, data, texto, ativo, fotos, regioes, ...opExtra };
      const atualizar = (lista) => lista.map(r => r.id === editandoId ? reg : r);
      if (isPre) { const n = atualizar(registrosPre); setRegistrosPre(n); localStorage.setItem("plano_pre", JSON.stringify(n)); }
      else        { const n = atualizar(registrosOp);  setRegistrosOp(n);  localStorage.setItem("plano_oportunidades", JSON.stringify(n)); }
      await supabase.from("plano_estudos").upsert([regToRow(reg, tipo)], { onConflict: "id" });
      setEditandoId(null);
    } else {
      const reg = { id: Date.now(), data, texto, ativo, fotos, regioes, ...opExtra };
      if (isPre) { const n = [reg, ...registrosPre]; setRegistrosPre(n); localStorage.setItem("plano_pre", JSON.stringify(n)); }
      else        { const n = [reg, ...registrosOp];  setRegistrosOp(n);  localStorage.setItem("plano_oportunidades", JSON.stringify(n)); }
      await supabase.from("plano_estudos").insert([regToRow(reg, tipo)]);
    }
    setTexto(""); setAtivo(""); setFotos([]); setRegioes([]);
    setAddingRegiao(false); resetOpForm();
  };

  const iniciarEdicao = (r) => {
    setData(r.data); setTexto(r.texto || ""); setAtivo(r.ativo || "");
    setFotos(r.fotos || []); setRegioes(r.regioes || []);
    setOpTf(r.tf || ""); setOpCandle(r.candle || ""); setOpRetracao(r.retracao || "");
    setOpTfs(r.tfs || []); setOpMediasPerTf(r.mediasPerTf || {}); setOpFiltros(r.filtros || []);
    setOpStop(r.stop || ""); setOpPontos(r.pontos || ""); setOpTravas(r.travas || []); setOpObservacoes(r.observacoes || "");
    setEditandoId(r.id); setAddingRegiao(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const excluir = async (tipo, id) => {
    if (tipo === "pre") {
      const novos = registrosPre.filter(r => r.id !== id);
      setRegistrosPre(novos);
      localStorage.setItem("plano_pre", JSON.stringify(novos));
    } else {
      const novos = registrosOp.filter(r => r.id !== id);
      setRegistrosOp(novos);
      localStorage.setItem("plano_oportunidades", JSON.stringify(novos));
    }
    await supabase.from("plano_estudos").delete().eq("id", id).eq("user_id", user.id);
  };

  const TFS = ["5","15","60","Diário"];
  const MAS = ["9","21","50","200"];
  const TIPOS_REGIAO = [
    { v:"suporte", label:"🟢 Suporte" },
    { v:"resistencia", label:"🔴 Resistência" },
    { v:"troca_polaridade", label:"🔄 Troca de Polaridade" },
  ];

  const btnPill = (active, onClick, label, cor) => (
    <button onClick={onClick} style={{
      padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer",
      border:`1.5px solid ${active ? cor : t.border}`,
      background: active ? cor+"22" : "transparent",
      color: active ? cor : t.muted, transition:"all .12s"
    }}>{label}</button>
  );

  const renderSubView = (tipo) => {
    const isPre = tipo === "pre";
    const cor = isPre ? "#38bdf8" : "#f59e0b";
    const titulo = isPre ? "📋 Pré Mercado" : "🎯 Oportunidades do Dia";
    const registros = isPre ? registrosPre : registrosOp;
    const placeholder = isPre
      ? "Contexto geral do mercado, cenários esperados, regras para o pregão..."
      : "Registre os melhores setups e oportunidades identificados hoje...";
    const inpSt = { background: t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"8px 12px", fontSize:13, outline:"none" };
    const hoje = new Date().toISOString().slice(0,10);
    const registrosHoje = registros.filter(r => r.data === hoje);
    const registrosOutros = registros.filter(r => r.data !== hoje);
    const ativosUnicos = [...new Set(registros.map(r => r.ativo).filter(Boolean))];
    const registrosFiltrados = registros.filter(r =>
      (!filtroData || r.data === filtroData) &&
      (!filtroAtivo || r.ativo === filtroAtivo)
    );
    const inpFiltro = { background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"8px 12px", fontSize:13, outline:"none" };
    const CATS_H = [
      { v:"compra",       label:"🟢 Melhor Compra",    cor:"#22c55e" },
      { v:"venda",        label:"🔴 Melhor Venda",     cor:"#ef4444" },
      { v:"outra_compra", label:"🔵 Outra Compradora", cor:"#60a5fa" },
      { v:"outra_venda",  label:"🟠 Outra Vendedora",  cor:"#f97316" },
    ];
    const renderCard = (r) => {
      const [y, m, d] = r.data.split("-");
      const n = (r.fotos||[]).length;
      return (
        <div key={r.id} style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontWeight:800, color:cor, fontSize:14 }}>{`${d}/${m}/${y}`}</span>
              {r.ativo && <span style={{ background:cor+"22", border:`1px solid ${cor}44`, borderRadius:6, padding:"3px 12px", color:cor, fontSize:12, fontWeight:700 }}>{r.ativo}</span>}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => iniciarEdicao(r)}
                style={{ background:"#60a5fa11", border:"1px solid #60a5fa44", borderRadius:6, color:"#60a5fa", fontSize:12, fontWeight:700, padding:"4px 12px", cursor:"pointer" }}>✏️ Editar</button>
              <button onClick={() => excluir(tipo, r.id)}
                style={{ background:"#f8717111", border:"1px solid #f8717144", borderRadius:6, color:"#f87171", fontSize:12, fontWeight:700, padding:"4px 12px", cursor:"pointer" }}>✕</button>
            </div>
          </div>
          {/* Fotos grandes */}
          {n > 0 && (
            <div style={{ display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap", marginBottom:16 }}>
              {r.fotos.map((f, i) => (
                <div key={i} onClick={() => setFotoZoom(f)} style={{
                  width: n===1 ? "50%" : n===2 ? "calc(50% - 6px)" : "calc(33% - 8px)",
                  flexShrink:0, cursor:"zoom-in", borderRadius:12,
                  border:`2px solid ${cor}44`, boxShadow:"0 4px 20px #0006",
                  overflow:"hidden",
                }}>
                  <img src={f} alt="" style={{ width:"100%", height:"auto", display:"block", borderRadius:10 }}/>
                </div>
              ))}
            </div>
          )}
          {/* Texto */}
          {r.texto && <div style={{ color:t.text, fontSize:13, lineHeight:1.8, whiteSpace:"pre-wrap", marginBottom:12 }}>{r.texto}</div>}
          {/* Campos de Oportunidades do Dia */}
          {!isPre && (r.tf||r.candle||r.retracao||(r.tfs||[]).length>0||(r.filtros||[]).length>0) && (
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12, background:t.bg, borderRadius:10, padding:12, border:`1px solid ${cor}33` }}>
              {r.tf && (
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ color:t.muted, fontSize:11, fontWeight:700, minWidth:100 }}>⏱️ TF Entrada:</span>
                  <span style={{ background:cor+"22", border:`1px solid ${cor}44`, borderRadius:20, padding:"2px 10px", color:cor, fontSize:12, fontWeight:700 }}>{r.tf}</span>
                </div>
              )}
              {r.candle && (
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ color:t.muted, fontSize:11, fontWeight:700, minWidth:100 }}>🕯️ Candle:</span>
                  <span style={{ color:t.text, fontSize:13, fontWeight:700 }}>#{r.candle}</span>
                </div>
              )}
              {r.retracao && (
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ color:t.muted, fontSize:11, fontWeight:700, minWidth:100 }}>📐 Retração:</span>
                  <span style={{ background:"#a78bfa22", border:"1px solid #a78bfa44", borderRadius:20, padding:"2px 10px", color:"#a78bfa", fontSize:12, fontWeight:700 }}>{r.retracao}</span>
                </div>
              )}
              {(r.tfs||[]).filter(tf=>(r.mediasPerTf?.[tf]||[]).length>0).length>0 && (
                <div>
                  <span style={{ color:t.muted, fontSize:11, fontWeight:700 }}>📊 Médias a Favor:</span>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
                    {(r.tfs||[]).filter(tf=>(r.mediasPerTf?.[tf]||[]).length>0).map(tf=>(
                      <span key={tf} style={{ fontSize:11, color:"#60a5fa" }}>
                        {tf==="Diário"?"Diário":tf+"min"}: {(r.mediasPerTf[tf]||[]).map(ma=>"MME "+ma).join(", ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(r.filtros||[]).length>0 && (
                <div>
                  <span style={{ color:t.muted, fontSize:11, fontWeight:700 }}>🏷️ Filtros:</span>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
                    {r.filtros.map((f,i)=>(
                      <span key={i} style={{ background:cor+"22", border:`1px solid ${cor}44`, borderRadius:20, padding:"2px 10px", color:cor, fontSize:12, fontWeight:700 }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {(r.stop||r.pontos) && (
                <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                  {r.stop && (
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <span style={{ color:t.muted, fontSize:11, fontWeight:700 }}>🛑 Stop:</span>
                      <span style={{ background:"#ef444422", border:"1px solid #ef444444", borderRadius:20, padding:"2px 10px", color:"#f87171", fontSize:12, fontWeight:800 }}>{r.stop} pts</span>
                    </div>
                  )}
                  {r.pontos && (
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <span style={{ color:t.muted, fontSize:11, fontWeight:700 }}>✅ Pagou:</span>
                      <span style={{ background:"#22c55e22", border:"1px solid #22c55e44", borderRadius:20, padding:"2px 10px", color:"#4ade80", fontSize:12, fontWeight:800 }}>{r.pontos} pts</span>
                    </div>
                  )}
                </div>
              )}
              {(r.travas||[]).length>0 && (
                <div>
                  <span style={{ color:t.muted, fontSize:11, fontWeight:700 }}>🚧 Travas no caminho:</span>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
                    {r.travas.map((tr,i)=>(
                      <span key={i} style={{ background:"#ef444422", border:"1px solid #ef444444", borderRadius:20, padding:"2px 10px", color:"#f87171", fontSize:12, fontWeight:700 }}>{tr}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {r.observacoes && (
            <div style={{ color:t.muted, fontSize:12, lineHeight:1.7, whiteSpace:"pre-wrap", borderTop:`1px solid ${t.border}`, paddingTop:10, marginTop:8 }}>
              <span style={{ fontWeight:700, color:t.text }}>📝 Obs: </span>{r.observacoes}
            </div>
          )}
          {/* Regiões */}
          {(r.regioes||[]).length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {CATS_H.filter(c => r.regioes.some(rg=>rg.categoria===c.v)).map(c => (
                <div key={c.v}>
                  <div style={{ color:c.cor, fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>{c.label}</div>
                  {r.regioes.filter(rg=>rg.categoria===c.v).map((reg, ri) => {
                    const nF = contarFiltros(reg);
                    return (
                      <div key={ri} style={{ background:t.bg, border:`1.5px solid ${nF>=3?"#22c55e44":t.border}`, borderRadius:10, padding:12, marginBottom:6 }}>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:4 }}>
                          <span style={{ color:c.cor, fontWeight:900 }}>📍 {reg.preco}</span>
                          {reg.tipo && <span style={{ background:c.cor+"22", border:`1px solid ${c.cor}44`, borderRadius:20, padding:"1px 8px", color:c.cor, fontSize:11, fontWeight:700 }}>{TIPOS_REGIAO.find(x=>x.v===reg.tipo)?.label}</span>}
                          {nF>=3
                            ? <span style={{ background:"#22c55e22", border:"1px solid #22c55e44", borderRadius:999, padding:"2px 10px", color:"#22c55e", fontSize:11, fontWeight:800 }}>✅ Alta Prob. ({nF})</span>
                            : <span style={{ color:t.muted, fontSize:11 }}>{nF} filtro{nF!==1?"s":""}</span>}
                        </div>
                        {(reg.tfs||[]).filter(tf=>(reg.mediasPerTf?.[tf]||[]).length>0).map(tf=>(
                          <div key={tf} style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:3 }}>
                            <span style={{ color:"#60a5fa", fontSize:11, fontWeight:700 }}>{tf==="Diário"?"Diário":tf+"min"}:</span>
                            {(reg.mediasPerTf[tf]||[]).map(ma=><span key={ma} style={{ color:"#a78bfa", fontSize:11 }}>MME {ma}</span>)}
                          </div>
                        ))}
                        {(reg.infos||[]).length>0 && (
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
                            {reg.infos.map((info,i)=><span key={i} style={{ background:c.cor+"22", borderRadius:20, padding:"1px 8px", color:c.cor, fontSize:11 }}>{info}</span>)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div style={{ width:"100%" }}>
        {/* Modal importar estudo do Pré Mercado */}
        {modalImport && (
          <div style={{ position:"fixed", inset:0, background:"#000b", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:28, maxWidth:400, width:"90%", boxShadow:"0 8px 40px #000a" }}>
              <div style={{ fontSize:20, marginBottom:8 }}>📋 Estudo Encontrado</div>
              <div style={{ color:t.text, fontSize:14, marginBottom:6 }}>
                Existe um estudo de <strong style={{ color:"#38bdf8" }}>{modalImport.ativo}</strong> salvo em Pré Mercado ({modalImport.data}).
              </div>
              <div style={{ color:t.muted, fontSize:12, marginBottom:18 }}>
                {(modalImport.fotos||[]).length} foto{(modalImport.fotos||[]).length!==1?"s":""} disponível{(modalImport.fotos||[]).length!==1?"s":""}. Deseja importar para visualizar ao lado do gráfico?
              </div>
              {(modalImport.fotos||[]).length > 0 && (
                <img src={modalImport.fotos[0]} alt="preview" style={{ width:"100%", maxHeight:160, objectFit:"cover", borderRadius:10, marginBottom:16, border:`1px solid ${t.border}` }}/>
              )}
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button onClick={() => setModalImport(null)}
                  style={{ padding:"9px 20px", borderRadius:8, border:`1px solid ${t.border}`, background:"transparent", color:t.muted, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  Não
                </button>
                <button onClick={() => { setEstudoImportado(modalImport); setModalImport(null); setChartAberto(true); setChartMontado(true); }}
                  style={{ padding:"9px 20px", borderRadius:8, border:"none", background:"#38bdf8", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  ✅ Sim, importar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Zoom modal */}
        {fotoZoom && (
          <div onClick={() => setFotoZoom(null)} style={{
            position:"fixed", inset:0, background:"#000c", zIndex:9999,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"zoom-out"
          }}>
            <img src={fotoZoom} alt="zoom" style={{ maxWidth:"95vw", maxHeight:"95vh", borderRadius:12, boxShadow:"0 8px 40px #000a" }}/>
          </div>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
          <button onClick={() => { setSubTab(null); setTexto(""); setAtivo(""); setFotos([]); setRegioes([]); setAddingRegiao(false); setFiltroData(""); setFiltroAtivo(""); }}
            style={{ background:"transparent", border:"none", color:t.muted, cursor:"pointer", fontSize:20, padding:0, lineHeight:1 }}>←</button>
          <span style={{ color:cor, fontWeight:800, fontSize:18 }}>{titulo}</span>
        </div>

        {/* ── GRÁFICO TRADINGVIEW ── */}
        <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:14, marginBottom:24, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", cursor:"pointer", borderBottom: chartAberto ? `1px solid ${t.border}` : "none" }}
            onClick={() => { setChartAberto(v => !v); setChartMontado(true); }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>📈</span>
              <span style={{ fontWeight:700, color:t.text, fontSize:15 }}>Gráfico TradingView</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {chartAberto && (
                <div style={{ display:"flex", gap:4, alignItems:"center" }} onClick={e => e.stopPropagation()}>
                  {["1","2","5","15","60","D"].map(iv => (
                    <button key={iv} onClick={() => setChartInterval(iv)}
                      style={{ padding:"3px 10px", borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer",
                        border:"none", background: chartInterval===iv ? "#3b82f6" : t.border, color: chartInterval===iv ? "#fff" : t.muted }}>
                      {iv==="D"?"Dia":iv+"m"}
                    </button>
                  ))}
                  <button onClick={() => { if (!chartWrapperRef.current) return; const h = Math.max(100, chartHeightRef.current - 50); chartHeightRef.current = h; chartWrapperRef.current.style.height = h + "px"; }} style={{ padding:"3px 10px", borderRadius:6, fontSize:13, fontWeight:900, cursor:"pointer", border:"none", background:t.bg, color:t.muted }}>−</button>
                  <button onClick={() => { if (!chartWrapperRef.current) return; const h = chartHeightRef.current + 50; chartHeightRef.current = h; chartWrapperRef.current.style.height = h + "px"; }} style={{ padding:"3px 10px", borderRadius:6, fontSize:13, fontWeight:900, cursor:"pointer", border:"none", background:t.bg, color:t.muted }}>+</button>
                </div>
              )}
              <span style={{ color:t.muted, fontSize:18, lineHeight:1 }}>{chartAberto ? "▲" : "▼"}</span>
            </div>
          </div>
          {chartMontado && (
            <div style={{ display: chartAberto ? "flex" : "none", alignItems:"stretch" }}>
              {/* Gráfico (esquerda) */}
              <div style={{ flex:2, minWidth:0, overflow:"hidden" }}>
                <div ref={chartWrapperRef} style={{ height:"600px" }}>
                  <TradingViewChart ativo={ativo} interval={chartInterval} darkMode={darkMode} studies={mediasAtivas ? TV_STUDIES_MEDIAS : TV_STUDIES_VWAP}/>
                </div>
                <div
                  onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); chartDrag.current = { active:true, startY:e.clientY, startH:chartHeightRef.current }; }}
                  onPointerMove={e => { if (!chartDrag.current.active) return; const nh = Math.max(100, chartDrag.current.startH + e.clientY - chartDrag.current.startY); chartHeightRef.current = nh; if(chartWrapperRef.current) chartWrapperRef.current.style.height = nh+"px"; }}
                  onPointerUp={e => { chartDrag.current.active = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
                  onPointerCancel={() => { chartDrag.current.active = false; }}
                  style={{ height:18, background:t.border, cursor:"ns-resize", display:"flex", alignItems:"center", justifyContent:"center", userSelect:"none", touchAction:"none" }}>
                  <div style={{ width:56, height:4, background:t.muted, borderRadius:999, opacity:0.5 }}/>
                </div>
              </div>
              {/* Painel estudo importado do Pré Mercado */}
              {estudoImportado && (
                <div style={{ flex:"0 0 33%", minWidth:240, borderLeft:`2px solid #38bdf8`, background:t.card, display:"flex", flexDirection:"column", overflow:"hidden" }}>
                  <div style={{ padding:"8px 12px", borderBottom:`1px solid #38bdf833`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
                    <span style={{ color:"#38bdf8", fontWeight:800, fontSize:11 }}>📋 PRÉ MERCADO — {estudoImportado.ativo} ({estudoImportado.data})</span>
                    <button onClick={() => setEstudoImportado(null)} style={{ background:"none", border:"none", color:t.muted, cursor:"pointer", fontSize:14, lineHeight:1 }}>✕</button>
                  </div>
                  <div style={{ flex:1, overflowY:"auto", padding:10, display:"flex", flexDirection:"column", gap:8 }}>
                    {(estudoImportado.fotos||[]).map((f, i) => (
                      <img key={i} src={f} alt={`estudo ${i+1}`} onClick={() => setFotoZoom(f)}
                        style={{ width:"100%", borderRadius:8, border:`1px solid #38bdf844`, cursor:"zoom-in", display:"block" }}/>
                    ))}
                    {estudoImportado.texto && (
                      <div style={{ color:t.muted, fontSize:11, lineHeight:1.6, whiteSpace:"pre-wrap", marginTop:4 }}>{estudoImportado.texto}</div>
                    )}
                  </div>
                </div>
              )}
              {/* Botões (direita, coluna vertical, ~130px) */}
              <div style={{ width:130, display:"flex", flexDirection:"column", gap:8, padding:"10px 10px", borderLeft:`1px solid ${t.border}`, justifyContent:"flex-start", alignItems:"stretch", flexShrink:0 }}>
                <button onClick={printChart} disabled={printando}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"12px 6px", borderRadius:10, border:"none",
                    background: printando ? t.border : cor, color: printando ? t.muted : "#fff",
                    fontWeight:800, fontSize:11, cursor: printando ? "not-allowed" : "pointer",
                    boxShadow: printando ? "none" : `0 4px 16px ${cor}55`, transition:"all .15s", textAlign:"center" }}>
                  <span style={{fontSize:18}}>📸</span>
                  {printando ? "Capturando..." : "Print Gráfico"}
                </button>
                <button onClick={() => setMediasAtivas(v => !v)}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"12px 6px", borderRadius:10,
                    border:`2px solid ${mediasAtivas ? "#3b82f6" : t.border}`,
                    background: mediasAtivas ? "#3b82f622" : "transparent", color: mediasAtivas ? "#3b82f6" : t.muted,
                    fontWeight:800, fontSize:11, cursor:"pointer", transition:"all .15s", textAlign:"center" }}>
                  <span style={{fontSize:18}}>📊</span>
                  {mediasAtivas ? "Médias Ativas" : "Médias"}
                </button>
                {fotos.length > 0 && (
                  <span style={{ color:"#22c55e", fontSize:10, fontWeight:700, textAlign:"center" }}>
                    ✅ {fotos.length} foto{fotos.length>1?"s":""}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FORM */}
        <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:14, padding:20, marginBottom:24 }}>
          {/* Data + Ativo */}
          <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap" }}>
            <div>
              <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:4 }}>DATA</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} style={inpSt}/>
            </div>
            <div style={{ flex:1, minWidth:160 }}>
              <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:4 }}>ATIVO (opcional)</label>
              <select value={ativo} onChange={e => onAtivoChange(e.target.value, isPre)}
                style={{ ...inpSt, width:"100%", boxSizing:"border-box" }}>
                <option value="">Selecione...</option>
                <optgroup label="─── Futuros BR ───">
                  <option>WDOFUT</option>
                  <option>WINFUT</option>
                </optgroup>
                <optgroup label="─── Índices Globais ───">
                  <option>AU200</option>
                  <option>CN50</option>
                  <option>FR40</option>
                  <option>GER40</option>
                  <option>HK50</option>
                  <option>JP225</option>
                  <option>UK100</option>
                  <option>US100</option>
                  <option>US30</option>
                  <option>US500</option>
                </optgroup>
                <optgroup label="─── Forex ───">
                  <option>AUDUSD</option>
                  <option>EURGBP</option>
                  <option>EURJPY</option>
                  <option>EURUSD</option>
                  <option>GBPJPY</option>
                  <option>GBPUSD</option>
                  <option>USDJPY</option>
                </optgroup>
                <optgroup label="─── Cripto ───">
                  <option>BCHUSD</option>
                  <option>BTCUSD</option>
                </optgroup>
                <optgroup label="─── Commodities ───">
                  <option>XAGUSD</option>
                  <option>XAUUSD</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Texto livre */}
          <textarea placeholder={placeholder} value={texto} onChange={e => setTexto(e.target.value)} rows={2}
            style={{ width:"100%", background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text,
              padding:"10px 12px", fontSize:13, resize:"vertical", boxSizing:"border-box", lineHeight:1.5, fontFamily:"inherit", marginBottom:14 }}/>

          {/* ── FOTOS ── */}
          <div style={{ marginBottom:16 }}>
              <div style={{ color:t.muted, fontSize:11, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>📸 Fotos do Gráfico (máx. 5) <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>— ou <kbd style={{background:t.border,borderRadius:4,padding:"1px 5px",fontSize:10}}>Ctrl+V</kbd> para colar</span></div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                {fotos.map((f, i) => (
                  <div key={i} style={{ position:"relative" }}>
                    <img src={f} alt="" onClick={() => setFotoZoom(f)}
                      style={{ width:90, height:66, objectFit:"cover", borderRadius:8, cursor:"zoom-in", border:`2px solid ${cor}44` }}/>
                    <button onClick={() => setFotos(p => p.filter((_,j) => j !== i))}
                      style={{ position:"absolute", top:-6, right:-6, width:18, height:18, borderRadius:"50%", background:"#ef4444", border:"none", color:"#fff", fontSize:10, fontWeight:900, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>✕</button>
                  </div>
                ))}
                {fotos.length < 5 && (
                  <label style={{ width:90, height:66, border:`2px dashed ${cor}55`, borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", color:cor, fontSize:11, fontWeight:700, gap:4 }}>
                    <span style={{ fontSize:20 }}>+</span>
                    <span>Foto</span>
                    <input type="file" accept="image/*" multiple style={{ display:"none" }} onChange={onFotoUpload}/>
                  </label>
                )}
              </div>
            </div>

          {/* ── REGIÕES ── */}
          {isPre && (()=>{
            const CATS = [
              { v:"compra",       label:"🟢 Melhor Compra",  cor:"#22c55e" },
              { v:"venda",        label:"🔴 Melhor Venda",   cor:"#ef4444" },
              { v:"outra_compra", label:"🔵 Outra Compradora", cor:"#60a5fa" },
              { v:"outra_venda",  label:"🟠 Outra Vendedora",  cor:"#f97316" },
            ];
            const catInfo = c => CATS.find(x=>x.v===c) || CATS[0];
            const renderRegiao = (reg, ri) => {
              const nFiltros = contarFiltros(reg);
              const alta = nFiltros >= 3;
              const ci = catInfo(reg.categoria);
              return (
                <div key={reg.id} style={{ background:t.bg, border:`1.5px solid ${alta?"#22c55e44":t.border}`, borderRadius:12, padding:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ background:ci.cor+"22", border:`1px solid ${ci.cor}44`, borderRadius:20, padding:"2px 10px", color:ci.cor, fontSize:11, fontWeight:800 }}>{ci.label}</span>
                      <span style={{ color:ci.cor, fontWeight:900, fontSize:15 }}>📍 {reg.preco}</span>
                      {reg.tipo && <span style={{ background: reg.tipo==="suporte"?"#22c55e22":reg.tipo==="resistencia"?"#ef444422":"#f59e0b22", border:`1px solid ${reg.tipo==="suporte"?"#22c55e44":reg.tipo==="resistencia"?"#ef444444":"#f59e0b44"}`, borderRadius:20, padding:"2px 10px", color: reg.tipo==="suporte"?"#22c55e":reg.tipo==="resistencia"?"#ef4444":"#f59e0b", fontSize:11, fontWeight:700 }}>
                        {TIPOS_REGIAO.find(x=>x.v===reg.tipo)?.label}
                      </span>}
                    </div>
                    <button onClick={() => setRegioes(p => p.filter((_,i)=>i!==ri))}
                      style={{ background:"#f8717111", border:"1px solid #f8717144", borderRadius:6, color:"#f87171", fontSize:11, fontWeight:700, padding:"3px 8px", cursor:"pointer" }}>✕</button>
                  </div>
                  {(reg.tfs||[]).filter(tf => (reg.mediasPerTf?.[tf]||[]).length > 0).map(tf => (
                    <div key={tf} style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:4 }}>
                      <span style={{ color:"#60a5fa", fontSize:11, fontWeight:700 }}>{tf==="Diário"?"Diário":tf+"min"}:</span>
                      {(reg.mediasPerTf[tf]||[]).map(ma => (
                        <span key={ma} style={{ background:"#a78bfa22", border:"1px solid #a78bfa44", borderRadius:6, padding:"1px 8px", color:"#a78bfa", fontSize:11, fontWeight:700 }}>MME {ma}</span>
                      ))}
                    </div>
                  ))}
                  {(reg.infos||[]).length > 0 && (
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
                      {reg.infos.map((info,i) => (
                        <span key={i} style={{ background:ci.cor+"22", border:`1px solid ${ci.cor}44`, borderRadius:20, padding:"2px 10px", color:ci.cor, fontSize:11, fontWeight:700 }}>{info}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ color:t.muted, fontSize:11 }}>Filtros: <strong style={{ color:t.text }}>{nFiltros}</strong></span>
                    {alta
                      ? <span style={{ background:"#22c55e22", border:"1px solid #22c55e44", borderRadius:999, padding:"3px 14px", color:"#22c55e", fontSize:11, fontWeight:800 }}>✅ Alta Probabilidade ({nFiltros} filtros)</span>
                      : <span style={{ background:"#f59e0b22", border:"1px solid #f59e0b44", borderRadius:999, padding:"3px 14px", color:"#f59e0b", fontSize:11, fontWeight:700 }}>⚠️ Adicione mais filtros ({nFiltros}/3)</span>
                    }
                  </div>
                </div>
              );
            };
            return (
              <div style={{ marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ color:t.muted, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>📍 Regiões de Mercado</div>
                  <button onClick={() => setAddingRegiao(v => !v)}
                    style={{ padding:"5px 14px", borderRadius:20, border:`1.5px dashed ${cor}88`, background:"transparent", color:cor, fontWeight:700, fontSize:12, cursor:"pointer" }}>
                    {addingRegiao ? "✕ Cancelar" : "+ Adicionar Região"}
                  </button>
                </div>

                {/* Form nova região */}
                {addingRegiao && (
                  <div style={{ background:t.bg, border:`1px solid ${cor}44`, borderRadius:12, padding:16, marginBottom:12 }}>
                    {/* Categoria */}
                    <div style={{ marginBottom:12 }}>
                      <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6 }}>🏷️ TIPO DE REGIÃO</label>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {CATS.map(c => btnPill(rf.categoria===c.v, () => setRfField("categoria", c.v), c.label, c.cor))}
                      </div>
                    </div>
                    {/* Preço */}
                    <div style={{ marginBottom:12 }}>
                      <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6 }}>💰 PREÇO DA REGIÃO</label>
                      <input placeholder="ex: 127.500" value={rf.preco} onChange={e => setRfField("preco", e.target.value)}
                        style={{ ...inpSt, width:180 }}/>
                    </div>
                    {/* Médias */}
                    <div style={{ marginBottom:12 }}>
                      <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6 }}>📊 MÉDIAS MÓVEIS — tempo gráfico + médias presentes</label>
                      {TFS.map(tf => (
                        <div key={tf} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                          {btnPill(rf.tfs.includes(tf), () => toggleTf(tf), tf==="Diário"?"Diário":tf+" min", "#60a5fa")}
                          {rf.tfs.includes(tf) && MAS.map(ma => (
                            <React.Fragment key={ma}>
                              {btnPill((rf.mediasPerTf[tf]||[]).includes(ma), () => toggleMa(tf, ma), "MME "+ma, "#a78bfa")}
                            </React.Fragment>
                          ))}
                        </div>
                      ))}
                    </div>
                    {/* Tipo */}
                    <div style={{ marginBottom:12 }}>
                      <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6 }}>📌 ESTA REGIÃO É</label>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {TIPOS_REGIAO.map(op => btnPill(rf.tipo===op.v, () => setRfField("tipo", rf.tipo===op.v?"":op.v), op.label, op.v==="suporte"?"#22c55e":op.v==="resistencia"?"#ef4444":"#f59e0b"))}
                      </div>
                    </div>
                    {/* Infos */}
                    <div style={{ marginBottom:12 }}>
                      <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6 }}>
                        ➕ INFORMAÇÕES SOBRE A REGIÃO
                        <span style={{ color:t.muted, fontWeight:400, marginLeft:6 }}>(ex: Fibo 50%, Topo anterior, POC, VWAP...)</span>
                      </label>
                      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                        <input placeholder="Descreva a informação..." value={rf.novaInfo} onChange={e => setRfField("novaInfo", e.target.value)}
                          onKeyDown={e => { if(e.key==="Enter"){ e.preventDefault(); addInfo(); }}}
                          style={{ ...inpSt, flex:1 }}/>
                        <button onClick={addInfo}
                          style={{ padding:"8px 16px", borderRadius:8, border:"none", background:cor, color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>Adicionar</button>
                      </div>
                      {rf.infos.length > 0 && (
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {rf.infos.map((info, i) => (
                            <span key={i} style={{ background:cor+"22", border:`1px solid ${cor}44`, borderRadius:20, padding:"3px 10px", color:cor, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
                              {info}
                              <button onClick={() => setRf(p => ({ ...p, infos: p.infos.filter((_,j)=>j!==i) }))}
                                style={{ background:"none", border:"none", color:cor, cursor:"pointer", fontSize:12, padding:0, lineHeight:1, fontWeight:900 }}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={adicionarRegiao} disabled={!rf.preco}
                      style={{ padding:"10px 24px", borderRadius:8, border:"none", background:rf.preco?cor:t.border, color:rf.preco?"#fff":"#888", fontWeight:700, fontSize:13, cursor:rf.preco?"pointer":"not-allowed" }}>
                      ✅ Adicionar Região
                    </button>
                  </div>
                )}

                {/* Regiões agrupadas por categoria */}
                {regioes.length > 0 && CATS.filter(c => regioes.some(r=>r.categoria===c.v)).map(c => (
                  <div key={c.v} style={{ marginBottom:12 }}>
                    <div style={{ color:c.cor, fontSize:11, fontWeight:800, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>{c.label}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {regioes.map((reg, ri) => reg.categoria===c.v ? renderRegiao(reg, ri) : null)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── FORMULÁRIO OPORTUNIDADES DO DIA ── */}
          {!isPre && (
            <div style={{ marginBottom:14 }}>
              {/* TF da entrada */}
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>⏱️ Time Frame da Entrada</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {["1min","2min","5min","15min"].map(tf => btnPill(opTf===tf, ()=>setOpTf(opTf===tf?"":tf), tf, cor))}
                </div>
              </div>
              {/* Número do candle */}
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>🕯️ Número do Candle</label>
                <select value={opCandle} onChange={e=>setOpCandle(e.target.value)}
                  style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"8px 12px", fontSize:13, outline:"none", minWidth:120 }}>
                  <option value="">Selecione</option>
                  {Array.from({length:565},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {/* Retração */}
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>📐 Retração do Movimento</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {["Não teve","76.4","61.8","50","38.2"].map(r => btnPill(opRetracao===r, ()=>setOpRetracao(opRetracao===r?"":r), r, "#a78bfa"))}
                </div>
              </div>
              {/* Médias a favor */}
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>📊 Médias a Favor</label>
                {TFS.map(tf => (
                  <div key={tf} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                    {btnPill(opTfs.includes(tf), ()=>setOpTfs(p=>p.includes(tf)?p.filter(x=>x!==tf):[...p,tf]), tf==="Diário"?"Diário":tf+" min", "#60a5fa")}
                    {opTfs.includes(tf) && MAS.map(ma => (
                      <React.Fragment key={ma}>
                        {btnPill((opMediasPerTf[tf]||[]).includes(ma), ()=>setOpMediasPerTf(p=>{const c=p[tf]||[];return{...p,[tf]:c.includes(ma)?c.filter(x=>x!==ma):[...c,ma]};}), "MME "+ma, "#a78bfa")}
                      </React.Fragment>
                    ))}
                  </div>
                ))}
              </div>
              {/* Filtros customizados */}
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>
                  🏷️ Filtros da Operação <span style={{ color:t.muted, fontWeight:400, textTransform:"none", fontSize:10 }}>(escreva sempre da mesma forma para a análise funcionar)</span>
                </label>
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <input placeholder="Ex: Mercado esticado, Fibo 50%, Topo anterior..." value={opNovoFiltro}
                    onChange={e=>setOpNovoFiltro(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&opNovoFiltro.trim()){e.preventDefault();setOpFiltros(p=>[...p,opNovoFiltro.trim()]);setOpNovoFiltro("");}}}
                    style={{ flex:1, background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"8px 12px", fontSize:13, outline:"none" }}/>
                  <button onClick={()=>{if(opNovoFiltro.trim()){setOpFiltros(p=>[...p,opNovoFiltro.trim()]);setOpNovoFiltro("");}}}
                    style={{ padding:"8px 16px", borderRadius:8, border:"none", background:cor, color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                    + Adicionar
                  </button>
                </div>
                {opFiltros.length > 0 && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {opFiltros.map((f,i)=>(
                      <span key={i} style={{ background:cor+"22", border:`1px solid ${cor}44`, borderRadius:20, padding:"3px 10px", color:cor, fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
                        {f}
                        <button onClick={()=>setOpFiltros(p=>p.filter((_,j)=>j!==i))}
                          style={{ background:"none", border:"none", color:cor, cursor:"pointer", fontSize:13, padding:0, lineHeight:1, fontWeight:900 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Stop e Pontos */}
              <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:12 }}>
                <div>
                  <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>🛑 Stop (pontos)</label>
                  <input type="number" placeholder="ex: 150" value={opStop} onChange={e=>setOpStop(e.target.value)}
                    style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"8px 12px", fontSize:13, outline:"none", width:140 }}/>
                </div>
                <div>
                  <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>✅ Operação pagou (pontos)</label>
                  <input type="number" placeholder="ex: 300" value={opPontos} onChange={e=>setOpPontos(e.target.value)}
                    style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"8px 12px", fontSize:13, outline:"none", width:140 }}/>
                </div>
              </div>
              {/* Travas no caminho */}
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>
                  🚧 Travas no Caminho <span style={{ color:t.muted, fontWeight:400, textTransform:"none", fontSize:10 }}>(resistências, suportes, gaps...)</span>
                </label>
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <input placeholder="Ex: Topo anterior, VWAP, Gap 127.500..." value={opNovaTrava}
                    onChange={e=>setOpNovaTrava(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&opNovaTrava.trim()){e.preventDefault();setOpTravas(p=>[...p,opNovaTrava.trim()]);setOpNovaTrava("");}}}
                    style={{ flex:1, background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"8px 12px", fontSize:13, outline:"none" }}/>
                  <button onClick={()=>{if(opNovaTrava.trim()){setOpTravas(p=>[...p,opNovaTrava.trim()]);setOpNovaTrava("");}}}
                    style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#ef4444", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                    + Adicionar
                  </button>
                </div>
                {opTravas.length > 0 && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {opTravas.map((tr,i)=>(
                      <span key={i} style={{ background:"#ef444422", border:"1px solid #ef444444", borderRadius:20, padding:"3px 10px", color:"#f87171", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
                        {tr}
                        <button onClick={()=>setOpTravas(p=>p.filter((_,j)=>j!==i))}
                          style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:13, padding:0, lineHeight:1, fontWeight:900 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Observações */}
              <div style={{ marginBottom:4 }}>
                <label style={{ display:"block", color:t.muted, fontSize:11, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>📝 Observações</label>
                <textarea placeholder="Anote qualquer observação relevante sobre a operação..." value={opObservacoes}
                  onChange={e=>setOpObservacoes(e.target.value)} rows={3}
                  style={{ width:"100%", background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"10px 12px", fontSize:13, resize:"vertical", boxSizing:"border-box", lineHeight:1.5, fontFamily:"inherit" }}/>
              </div>
            </div>
          )}

          <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
            {editandoId && (
              <button onClick={() => { setEditandoId(null); setTexto(""); setAtivo(""); setFotos([]); setRegioes([]); setAddingRegiao(false); resetOpForm(); }}
                style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:8, color:t.muted, fontWeight:700, fontSize:13, padding:"10px 18px", cursor:"pointer" }}>
                Cancelar
              </button>
            )}
            <button onClick={() => salvar(tipo)}
              style={{ background:cor, border:"none", borderRadius:8, color:"#fff", fontWeight:700, fontSize:13, padding:"10px 24px", cursor:"pointer" }}>
              {editandoId ? "💾 Salvar Edição" : "💾 Salvar"}
            </button>
          </div>
        </div>

        {/* ── FILTRO ── */}
        {registros.length > 0 && (
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:20, background:t.card, border:`1.5px solid ${cor}44`, borderRadius:12, padding:"14px 18px" }}>
            <span style={{ color:cor, fontSize:13, fontWeight:800 }}>🔍 Filtrar:</span>
            <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} style={inpFiltro}/>
            <select value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value)} style={inpFiltro}>
              <option value="">Todos os ativos</option>
              {ativosUnicos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {(filtroData || filtroAtivo) ? (
              <button onClick={() => { setFiltroData(""); setFiltroAtivo(""); }}
                style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:8, color:t.muted, fontSize:12, fontWeight:700, padding:"7px 14px", cursor:"pointer" }}>
                ✕ Limpar
              </button>
            ) : (
              <span style={{ color:t.muted, fontSize:12, marginLeft:4 }}>Filtre por data ou ativo</span>
            )}
          </div>
        )}

        {/* ── ANÁLISE DE HOJE ── */}
        {registrosHoje.length > 0 && !filtroData && !filtroAtivo && (
          <div style={{ marginBottom:32 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ flex:1, height:1, background:t.border }}/>
              <span style={{ color:cor, fontWeight:800, fontSize:13, letterSpacing:1, textTransform:"uppercase" }}>📅 Análise de Hoje</span>
              <div style={{ flex:1, height:1, background:t.border }}/>
            </div>
            {registrosHoje.map(r => renderCard(r))}
          </div>
        )}

        {/* ── HISTÓRICO (resultado do filtro) ── */}
        {(filtroData || filtroAtivo) && (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ flex:1, height:1, background:t.border }}/>
              <span style={{ color:t.muted, fontWeight:800, fontSize:13, letterSpacing:1, textTransform:"uppercase" }}>
                🗂️ {registrosFiltrados.length} resultado{registrosFiltrados.length !== 1 ? "s" : ""}
              </span>
              <div style={{ flex:1, height:1, background:t.border }}/>
            </div>
            {registrosFiltrados.length === 0
              ? <div style={{ color:t.muted, textAlign:"center", padding:"30px 0", fontSize:13 }}>Nenhum registro encontrado.</div>
              : registrosFiltrados.map(r => renderCard(r))
            }
          </div>
        )}

        {registros.length === 0 && (
          <div style={{ color:t.muted, textAlign:"center", padding:"60px 0", fontSize:14 }}>Nenhum registro ainda. Salve sua primeira análise acima.</div>
        )}

        {/* ── ENTRADAS MAIS ASSERTIVAS (apenas Oportunidades) ── */}
        {!isPre && registrosOp.length > 0 && (() => {
          const contagem = {};
          registrosOp.forEach(r => {
            (r.filtros||[]).forEach(f => { contagem[f] = (contagem[f]||0)+1; });
          });
          const sorted = Object.entries(contagem).sort((a,b)=>b[1]-a[1]);
          if (sorted.length === 0) return null;
          const total = registrosOp.length;
          return (
            <div style={{ marginTop:32 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <div style={{ flex:1, height:1, background:t.border }}/>
                <span style={{ color:cor, fontWeight:800, fontSize:13, letterSpacing:1, textTransform:"uppercase" }}>📊 Entradas mais assertivas</span>
                <div style={{ flex:1, height:1, background:t.border }}/>
              </div>
              <div style={{ background:t.card, border:`1.5px solid ${cor}44`, borderRadius:14, padding:20 }}>
                <div style={{ color:t.muted, fontSize:12, marginBottom:14 }}>Análise de <strong style={{ color:t.text }}>{total}</strong> operações registradas</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {sorted.map(([filtro, qtd]) => {
                    const pct = Math.round((qtd/total)*100);
                    const barCor = pct>=60?"#22c55e":pct>=40?"#f59e0b":"#60a5fa";
                    return (
                      <div key={filtro} style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:10, padding:"10px 14px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <span style={{ color:t.text, fontSize:13, fontWeight:700 }}>{filtro}</span>
                          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <span style={{ color:barCor, fontWeight:800, fontSize:13 }}>{qtd}x</span>
                            <span style={{ background:barCor+"22", border:`1px solid ${barCor}44`, borderRadius:999, padding:"2px 10px", color:barCor, fontSize:11, fontWeight:800 }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ height:6, background:t.border, borderRadius:999, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:barCor, borderRadius:999, transition:"width .3s" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  if (subTab) return renderSubView(subTab);

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <span style={{ color:"#a78bfa", fontWeight:800, fontSize:20 }}>📈 Plano de Trade</span>
        <div style={{ color:t.muted, fontSize:13, marginTop:4 }}>Organize seu planejamento e registre as melhores oportunidades do dia.</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, maxWidth:700 }}>
        {[
          { id:"pre", icon:"📋", titulo:"Pré Mercado", desc:"Planejamento antes de operar. Fotos do gráfico, regiões de compra com análise de filtros e probabilidade.", cor:"#38bdf8", count:registrosPre.length },
          { id:"oportunidades", icon:"🎯", titulo:"Oportunidades do Dia", desc:"Melhores setups identificados. Registre as oportunidades mais relevantes observadas durante o dia.", cor:"#f59e0b", count:registrosOp.length },
        ].map(item => (
          <button key={item.id} onClick={() => { setSubTab(item.id); setData(new Date().toISOString().slice(0,10)); setFotos([]); setRegioes([]); setAddingRegiao(false); }}
            style={{ background:t.card, border:`2px solid ${item.cor}44`, borderRadius:16, padding:28, cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
            <div style={{ fontSize:36, marginBottom:12 }}>{item.icon}</div>
            <div style={{ color:item.cor, fontWeight:800, fontSize:16, marginBottom:8 }}>{item.titulo}</div>
            <div style={{ color:t.muted, fontSize:12, lineHeight:1.6, marginBottom:12 }}>{item.desc}</div>
            {item.count > 0 && (
              <span style={{ background:item.cor+"22", border:`1px solid ${item.cor}44`, borderRadius:999, padding:"3px 12px", color:item.cor, fontSize:11, fontWeight:700 }}>
                {item.count} {item.count===1?"registro":"registros"}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PROBABILIDADE DA ABERTURA ──────────────────────────────────────────────
function ProbabilidadeCard({ t, tvData }) {
  const [open, setOpen] = React.useState(true);
  // ── Estado do calendário automático ──
  const [eventos,      setEventos]      = React.useState([]);   // todos eventos do dia
  const [eventoAtivo,  setEventoAtivo]  = React.useState(null); // evento principal
  const [newsSignal,   setNewsSignal]   = React.useState(null); // "compra"|"venda"|null
  const [temNoticia,   setTemNoticia]   = React.useState(false);
  const [pollingAtivo, setPollingAtivo] = React.useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = React.useState(null);
  const [erroApi,      setErroApi]      = React.useState(null);
  const pollingRef = React.useRef(null);

  // ── Hora Brasil (GMT-3) ───────────────────────────────────────────────────
  const horaBrasil = () => {
    const agora = new Date();
    const br = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
    return { h: br.getUTCHours(), m: br.getUTCMinutes() };
  };
  const minutoBrasil = () => { const { h, m } = horaBrasil(); return h * 60 + m; };

  // ── Buscar calendário ─────────────────────────────────────────────────────
  const buscarCalendario = React.useCallback(async () => {
    try {
      const resp = await fetch("/api/economic-calendar");
      const json = await resp.json();
      if (!json.ok) { setErroApi(json.error); return; }
      setErroApi(null);
      const evs = json.eventos || [];
      setEventos(evs);
      setUltimaAtualizacao(new Date());

      // Prioridade: Brasil primeiro, depois EUA
      const brEvs  = evs.filter(e => { const p = (e.pais || "").toUpperCase(); return p === "BRL" || p === "BRAZIL"; });
      const usaEvs = evs.filter(e => { const p = (e.pais || "").toUpperCase(); return p === "USD" || p === "UNITED STATES"; });
      const principal = brEvs[0] || usaEvs[0] || null;

      setEventoAtivo(principal);
      setTemNoticia(evs.length > 0);

      if (principal) {
        // Atualizar news_signal se actual disponível
        if (principal.news_signal) setNewsSignal(principal.news_signal);
      } else {
        setNewsSignal(null);
      }
    } catch (e) {
      setErroApi("Falha na conexão");
    }
  }, []);

  // ── Polling: busca ao montar, a cada 5min das 06:00–10:00, a cada 5s das 08:55–10:00
  React.useEffect(() => {
    const ABERTURA   = 6 * 60;        // 06:00 — primeira busca do dia
    const PRE_NEWS   = 8 * 60 + 55;   // 08:55 — polling intensivo
    const FIM        = 10 * 60;       // 10:00
    const getMin = () => { const agora = new Date(); const br = new Date(agora.getTime() - 3*60*60*1000); return br.getUTCHours()*60 + br.getUTCMinutes(); };

    let ultimaBusca = 0;

    // Busca inicial sempre
    buscarCalendario();
    ultimaBusca = Date.now();

    const tick = () => {
      const min = getMin();
      const agora = Date.now();

      if (min >= PRE_NEWS && min <= FIM) {
        // 08:55–10:00: polling a cada 5s
        setPollingAtivo(true);
        buscarCalendario();
      } else if (min >= ABERTURA && min <= FIM) {
        // 06:00–08:55: atualiza a cada 5 minutos
        setPollingAtivo(false);
        if (agora - ultimaBusca >= 5 * 60 * 1000) {
          buscarCalendario();
          ultimaBusca = agora;
        }
      } else {
        setPollingAtivo(false);
      }
    };

    pollingRef.current = setInterval(tick, 5000);
    return () => clearInterval(pollingRef.current);
  }, [buscarCalendario]);

  // ── Cotações ──────────────────────────────────────────────────────────────
  const vix  = tvData?.vix?.percent  ?? null;
  const cl1  = tvData?.petroleo?.percent ?? null;
  const fef1 = tvData?.minerio?.percent  ?? null;
  const calculado = vix != null || cl1 != null || fef1 != null;

  // ── Análise de correlação + notícia ──────────────────────────────────────
  const analise = React.useMemo(() => {
    if (vix == null || cl1 == null || fef1 == null) return null;
    const vixAdj    = -vix;
    const resultado = fef1 + cl1 + vixAdj;
    const descorrelado = (fef1 > 0 && cl1 < 0) || (fef1 < 0 && cl1 > 0);

    let tendencia, corTendencia, zona;
    if (resultado > 2)       { tendencia = "POSITIVO ▲"; corTendencia = "#4ade80"; zona = "alta"; }
    else if (resultado < -2) { tendencia = "NEGATIVO ▼"; corTendencia = "#f87171"; zona = "baixa"; }
    else                     { tendencia = "NEUTRO →";   corTendencia = "#f59e0b"; zona = "neutro"; }

    // ── Integração notícia + correlação ──
    let sinalIntegrado = null; // null | "GRANDE_ALTA" | "GRANDE_QUEDA" | "DESCORRELACIONADO"
    if (newsSignal && zona !== "neutro") {
      const corrPos = resultado > 0;
      if (corrPos  && newsSignal === "compra") sinalIntegrado = "GRANDE_ALTA";
      if (corrPos  && newsSignal === "venda")  sinalIntegrado = "DESCORRELACIONADO";
      if (!corrPos && newsSignal === "venda")  sinalIntegrado = "GRANDE_QUEDA";
      if (!corrPos && newsSignal === "compra") sinalIntegrado = "DESCORRELACIONADO";
    }

    let cenarios = [];
    if (zona === "neutro") {
      cenarios = [{ prob:"alta", dir:"neutro", texto:"Mercado sugere lateralidade — sem direção definida" }];
    } else if (zona === "alta") {
      if (temNoticia) {
        cenarios = [
          { prob:"alta",  dir:"up",   texto:"Abre com GAP de alta → se houver trava no preço, tende a esticar para CIMA antes de corrigir ou reverter" },
          { prob:"media", dir:"down", texto:"Abre SEM GAP → mercado pode fazer movimento contrário antes de retomar a alta" },
        ];
      } else {
        cenarios = [
          { prob:"alta", dir:"up", texto:"Abre com GAP de alta → tende a sustentar a alta. Se houver trava, pode corrigir ou reverter" },
          { prob:"alta", dir:"up", texto:`Abre SEM GAP → mercado sobe acompanhando a variação positiva (+${resultado.toFixed(1)}%)` },
        ];
      }
    } else {
      if (temNoticia) {
        cenarios = [
          { prob:"alta",  dir:"down", texto:"Abre com GAP de baixa → se houver trava no preço, tende a esticar para BAIXO antes de corrigir ou reverter" },
          { prob:"media", dir:"up",   texto:"Abre SEM GAP → mercado pode fazer movimento contrário antes de retomar a queda" },
        ];
      } else {
        cenarios = [
          { prob:"alta", dir:"down", texto:"Abre com GAP de baixa → tende a sustentar a queda ou faz leve correção antes de continuar caindo" },
          { prob:"alta", dir:"down", texto:`Abre SEM GAP → mercado cai acompanhando a variação negativa (${resultado.toFixed(1)}%)` },
        ];
      }
    }

    const gapLabel = zona === "alta" ? "GAP DE ALTA provável" : zona === "baixa" ? "GAP DE BAIXA provável" : "Abertura SEM GAP";
    return { resultado, tendencia, corTendencia, zona, gapLabel, descorrelado, cenarios, vix, cl1, fef1, sinalIntegrado };
  }, [vix, cl1, fef1, temNoticia, newsSignal]);

  const labelCor = "#a78bfa";
  const { h, m } = horaBrasil();
  const horaStr  = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{ background: t.header, borderBottom: open ? `1px solid ${t.border}` : "none", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>📈</span>
          <span style={{ color: labelCor, fontWeight: 800, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Probabilidade abertura Índice hoje</span>
          {analise && (
            <span style={{ background: analise.corTendencia + "22", border: `1px solid ${analise.corTendencia}44`, borderRadius: 999, padding: "2px 8px", color: analise.corTendencia, fontSize: 9, fontWeight: 700 }}>
              {analise.tendencia} ({analise.resultado >= 0 ? "+" : ""}{analise.resultado.toFixed(2)}%)
            </span>
          )}
          {temNoticia && (
            <span style={{ background:"#7c3aed22", border:"1px solid #7c3aed55", borderRadius:999, padding:"2px 8px", color:"#c084fc", fontSize:9, fontWeight:700 }}>
              ⚡ NOTÍCIA DETECTADA
            </span>
          )}
        </div>
        <span style={{ color: t.muted, fontSize: 12, transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform .2s", display: "inline-block" }}>▲</span>
      </div>

      {open && (
        <div style={{ padding: "12px 16px" }}>

          {/* ── Painel de notícia automática ── */}
          {eventoAtivo ? (
            <div style={{ background:"#0d0d1f", border:"1px solid #7c3aed44", borderRadius:10, padding:"10px 14px", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                <span style={{ background:"#7c3aed", borderRadius:999, padding:"2px 10px", fontSize:9, fontWeight:900, color:"#fff", letterSpacing:1 }}>
                  {eventoAtivo.impacto === "alto" ? "⚠️ ALTO IMPACTO" : "📅 EVENTO"}
                </span>
                <span style={{ color:"#c084fc", fontWeight:800, fontSize:12 }}>{eventoAtivo.evento}</span>
                <span style={{ color:"#666", fontSize:10 }}>
                  {eventoAtivo.pais === "Brazil" ? "🇧🇷" : "🇺🇸"} {eventoAtivo.pais}
                </span>
                {eventoAtivo.horario && (
                  <span style={{ color:"#555", fontSize:10 }}>
                    🕐 {new Date(eventoAtivo.horario).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"})}
                  </span>
                )}
              </div>
              {/* Dados actual / previous / forecast */}
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                {eventoAtivo.previous != null && (
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:"#555", fontSize:9 }}>ANTERIOR</div>
                    <div style={{ color:"#94a3b8", fontWeight:700, fontSize:13 }}>{eventoAtivo.previous}</div>
                  </div>
                )}
                {eventoAtivo.forecast != null && (
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:"#555", fontSize:9 }}>PROJEÇÃO</div>
                    <div style={{ color:"#f59e0b", fontWeight:700, fontSize:13 }}>{eventoAtivo.forecast}</div>
                  </div>
                )}
                {eventoAtivo.actual != null && (
                  <div style={{ textAlign:"center" }}>
                    <div style={{ color:"#555", fontSize:9 }}>ATUAL</div>
                    <div style={{ color: newsSignal === "compra" ? "#4ade80" : newsSignal === "venda" ? "#f87171" : "#fff", fontWeight:900, fontSize:15 }}>{eventoAtivo.actual}</div>
                  </div>
                )}
                {/* news_signal */}
                {newsSignal && (
                  <div style={{ display:"flex", alignItems:"center" }}>
                    <span style={{
                      background: newsSignal === "compra" ? "#22c55e22" : "#ef444422",
                      border: `1px solid ${newsSignal === "compra" ? "#22c55e66" : "#ef444466"}`,
                      borderRadius:8, padding:"4px 12px",
                      color: newsSignal === "compra" ? "#4ade80" : "#f87171",
                      fontWeight:900, fontSize:11,
                    }}>
                      {newsSignal === "compra" ? "↑ SINAL DE COMPRA" : "↓ SINAL DE VENDA"}
                    </span>
                  </div>
                )}
              </div>
              {/* Outros eventos do dia */}
              {eventos.length > 1 && (
                <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #1e1e1e" }}>
                  <div style={{ color:"#444", fontSize:9, marginBottom:4 }}>OUTROS EVENTOS HOJE:</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {eventos.slice(1).map((ev, i) => (
                      <span key={i} style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:4, padding:"1px 8px", color:"#666", fontSize:9 }}>
                        {ev.pais === "Brazil" ? "🇧🇷" : "🇺🇸"} {ev.evento}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              {erroApi
                ? <span style={{ color:"#f87171", fontSize:10 }}>⚠️ Calendário: {erroApi}</span>
                : <span style={{ color:"#555", fontSize:10 }}>📅 Sem notícias relevantes hoje</span>
              }
              {pollingAtivo && <span style={{ color:"#4ade80", fontSize:9 }}>● monitorando</span>}
            </div>
          )}

          {/* ── Sinal integrado (correlação + notícia) ── */}
          {analise?.sinalIntegrado && (
            <div style={{
              background: analise.sinalIntegrado === "GRANDE_ALTA"  ? "#052010" :
                          analise.sinalIntegrado === "GRANDE_QUEDA" ? "#200505" : "#1a1a0a",
              border: `1px solid ${analise.sinalIntegrado === "GRANDE_ALTA"  ? "#22c55e55" :
                                    analise.sinalIntegrado === "GRANDE_QUEDA" ? "#ef444455" : "#f59e0b55"}`,
              borderRadius: 10, padding: "10px 14px", marginBottom: 10,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>
                {analise.sinalIntegrado === "GRANDE_ALTA"        ? "🚀" :
                 analise.sinalIntegrado === "GRANDE_QUEDA"       ? "🔻" : "⚠️"}
              </span>
              <div>
                <div style={{
                  fontWeight: 900, fontSize: 13,
                  color: analise.sinalIntegrado === "GRANDE_ALTA"  ? "#4ade80" :
                         analise.sinalIntegrado === "GRANDE_QUEDA" ? "#f87171" : "#f59e0b",
                }}>
                  {analise.sinalIntegrado === "GRANDE_ALTA"        ? "GRANDE PROBABILIDADE DE ALTA" :
                   analise.sinalIntegrado === "GRANDE_QUEDA"       ? "GRANDE PROBABILIDADE DE QUEDA" :
                   "MERCADO DESCORRELACIONADO COM A NOTÍCIA"}
                </div>
                <div style={{ color:"#555", fontSize:9, marginTop:2 }}>
                  Correlação {analise.resultado >= 0 ? "positiva" : "negativa"} ({analise.resultado >= 0 ? "+" : ""}{analise.resultado.toFixed(2)}%)
                  {newsSignal ? ` · Notícia: ${newsSignal === "compra" ? "bullish" : "bearish"}` : ""}
                </div>
              </div>
            </div>
          )}

          {/* ── Status + valores usados ── */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            {calculado && <span style={{ color: "#4ade80", fontSize: 9 }}>✅ Dados do painel</span>}
            {pollingAtivo && <span style={{ color:"#7c3aed", fontSize:9 }}>🔄 Monitorando ({horaStr})</span>}
            {ultimaAtualizacao && <span style={{ color:"#333", fontSize:9 }}>Atualizado {ultimaAtualizacao.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
            {analise && (
              <>
                <span style={{ color: t.muted, fontSize: 10 }}>VIX <span style={{ color: analise.vix >= 0 ? "#f87171" : "#4ade80" }}>{analise.vix >= 0 ? "+" : ""}{analise.vix.toFixed(2)}%</span></span>
                <span style={{ color: t.muted, fontSize: 10 }}>OIL <span style={{ color: analise.cl1 >= 0 ? "#4ade80" : "#f87171" }}>{analise.cl1 >= 0 ? "+" : ""}{analise.cl1.toFixed(2)}%</span></span>
                <span style={{ color: t.muted, fontSize: 10 }}>FEF1! <span style={{ color: analise.fef1 >= 0 ? "#4ade80" : "#f87171" }}>{analise.fef1 >= 0 ? "+" : ""}{analise.fef1.toFixed(2)}%</span></span>
              </>
            )}
          </div>

          {/* ── Cenários ── */}
          {analise ? (
            <div style={{ background: t.bg, border: `1px solid ${analise.corTendencia}44`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: analise.corTendencia, fontWeight: 900, fontSize: 16 }}>{analise.tendencia}</span>
                <span style={{ color: analise.corTendencia, fontWeight: 700, fontSize: 13 }}>
                  {analise.resultado >= 0 ? "+" : ""}{analise.resultado.toFixed(2)}%
                </span>
                <span style={{ background: analise.corTendencia+"22", border:`1px solid ${analise.corTendencia}55`, borderRadius:999, padding:"2px 8px", color: analise.corTendencia, fontSize:9, fontWeight:700 }}>
                  {analise.gapLabel}
                </span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {analise.cenarios.map((c, i) => {
                  const probCor = c.prob==="alta" ? "#22c55e" : c.prob==="media" ? "#f59e0b" : "#94a3b8";
                  const dirIcon = c.dir==="up" ? "↑" : c.dir==="down" ? "↓" : "→";
                  const dirCor  = c.dir==="up" ? "#4ade80" : c.dir==="down" ? "#f87171" : "#f59e0b";
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, background: t.card, borderRadius:7, padding:"7px 10px", border:`1px solid ${probCor}33` }}>
                      <span style={{ background:probCor+"22", border:`1px solid ${probCor}55`, borderRadius:4, padding:"1px 6px", fontSize:9, fontWeight:800, color:probCor, whiteSpace:"nowrap", marginTop:1 }}>
                        {c.prob.toUpperCase()}
                      </span>
                      <span style={{ color:dirCor, fontWeight:800, fontSize:13 }}>{dirIcon}</span>
                      <span style={{ color:t.text, fontSize:11, lineHeight:1.4 }}>{c.texto}</span>
                    </div>
                  );
                })}
              </div>
              {temNoticia && <div style={{ color:"#f87171", fontSize:9, marginTop:6 }}>⚠️ Notícia detectada — atenção ao movimento inicial contrário</div>}
              {analise.descorrelado && <div style={{ color:"#f59e0b", fontSize:9, marginTop:4 }}>⚠️ Petróleo e minério descorrelacionados — menor confiabilidade do sinal</div>}
            </div>
          ) : (
            <div style={{ color: t.muted, fontSize: 10, textAlign: "center", padding: "16px 0" }}>
              Aguardando cotações do painel...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RegoesDolar({t}) {
  const CACHE_KEY = "regoesDolar_cme_v2";
  const loadCache = () => { try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null"); } catch(e) { return null; } };
  const saveCache = (d) => { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch(e) {} };
  const cached = loadCache();

  const [open, setOpen]       = React.useState(true);
  const [vals, setVals]       = React.useState(cached);
  const [loading, setLoading] = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState(cached?.ts || null);

  // Busca CME Group BRL futures (produto 43 = 6L Brazilian Real)
  // Fallback: Stooq → AwesomeAPI
  const buscar = React.useCallback(async () => {
    setLoading(true);

    const salvar = (last, high, low, fonte) => {
      const ts  = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const novo = { last, high, low, fonte, ts };
      setVals(novo);
      saveCache(novo);
      setLastUpdate(ts);
    };

    // TradingCharts — CME L6 BRL Futures via Edge Function Supabase
    // Contrato cotado em USD/BRL (ex: 0.1890) → fmtBrl exibe R$/USD via 1/v
    try {
      const r = await fetch("https://qqgoojzlhczfexqlgvpe.supabase.co/functions/v1/busca-dolar", {
        headers: {
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxZ29vanpsaGN6ZmV4cWxndnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODM0ODQsImV4cCI6MjA4ODI1OTQ4NH0.C_rElTl676HaMHzkrJMPAkcm58edODGSJzvpu4xaDa0",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxZ29vanpsaGN6ZmV4cWxndnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODM0ODQsImV4cCI6MjA4ODI1OTQ4NH0.C_rElTl676HaMHzkrJMPAkcm58edODGSJzvpu4xaDa0",
        },
        signal: AbortSignal.timeout(10000),
      });
      const json = await r.json();
      if (json?.ok && json.last && json.high && json.low) {
        salvar(json.last, json.high, json.low, json.fonte || "TradingCharts");
        setLoading(false);
        return;
      }
    } catch(_) {}

    setLoading(false);
  }, []);

  const liberado800 = true;

  React.useEffect(() => {
    buscar();
    const iv = setInterval(buscar, 2 * 60 * 1000); // atualiza a cada 2 min
    return () => clearInterval(iv);
  }, [buscar]);

  // Converte BRL/USD → R$ por dólar
  const fmtBrl = v => v && v > 0 ? `R$ ${(1 / v).toFixed(3).replace(".", ",")}` : "—";

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
      <div onClick={() => { setOpen(v => !v); if (!loading) buscar(); }} style={{ background: t.header, borderBottom: open ? `1px solid ${t.border}` : "none", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>💵</span>
          <span style={{ color: t.accent, fontWeight: 800, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Regiões do Dólar</span>
          <button
            onClick={e => { e.stopPropagation(); if (!loading && liberado800) buscar(); }}
            disabled={loading || !liberado800}
            title={!liberado800 ? "Disponível a partir das 08:00" : ""}
            style={{ background: !liberado800 ? t.header : "#22c55e18", border: `1px solid ${!liberado800 ? t.border : "#22c55e55"}`, borderRadius: 6, color: !liberado800 ? t.muted : "#4ade80", padding: "2px 10px", cursor: (!liberado800 || loading) ? "not-allowed" : "pointer", fontSize: 10, fontWeight: 700 }}>
            {loading ? "⏳" : !liberado800 ? "🔒 Libera às 08:00" : "Regiões do Dólar"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {lastUpdate && <span style={{ color: t.muted, fontSize: 9 }}>atualizado {lastUpdate}{vals?.fonte ? ` · ${vals.fonte}` : ""}</span>}
          <span style={{ color: t.muted, fontSize: 12, transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform .2s", display: "inline-block" }}>▲</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: "12px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { label: "💵 Cotação Atual",   valor: fmtBrl(vals?.last), cor: "#60a5fa" },
              { label: "🟢 Mínima do Dia", valor: fmtBrl(vals?.high), cor: "#22c55e" },
              { label: "🔴 Máxima do Dia", valor: fmtBrl(vals?.low),  cor: "#ef4444" },
            ].map(c => (
              <div key={c.label} style={{ background: t.bg, border: `1px solid ${c.cor}28`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ color: t.muted, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{c.label}</div>
                <div style={{ color: c.cor, fontWeight: 900, fontSize: 28, letterSpacing: -0.5 }}>{loading ? "⏳" : c.valor}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── CALENDÁRIO ECONÔMICO ──────────────────────────────────────────────────
function CalendarioEconomico({t}) {
  const [open, setOpen] = React.useState(true);
  const src = "https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone,filters&countries=32,5&calType=week&timeZone=12&lang=12";
  return (
    <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,overflow:"hidden",marginBottom:16}}>
      <div onClick={()=>setOpen(v=>!v)} style={{background:t.header,borderBottom:open?`1px solid ${t.border}`:"none",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span>📰</span>
          <span style={{color:t.accent,fontWeight:800,fontSize:11,letterSpacing:1,textTransform:"uppercase"}}>Calendário Econômico</span>
          <span style={{background:"#3b82f618",border:"1px solid #3b82f633",borderRadius:999,padding:"2px 8px",color:"#60a5fa",fontSize:10,fontWeight:700}}>🇧🇷 BRL · 🇺🇸 USD</span>
        </div>
        <span style={{color:t.muted,fontSize:13,fontWeight:700,display:"inline-block",transform:open?"rotate(0deg)":"rotate(180deg)",transition:"transform .2s"}}>▲</span>
      </div>
      {open&&(
        <div style={{padding:0}}>
          <iframe
            src={src}
            width="100%"
            height="600"
            frameBorder="0"
            allowTransparency="true"
            marginWidth="0"
            marginHeight="0"
            title="Calendário Econômico"
            style={{display:"block",border:"none"}}
          />
          <div style={{textAlign:"right",padding:"4px 10px",background:t.card2}}>
            <a href="https://br.investing.com/economic-calendar/" rel="noopener noreferrer" target="_blank" style={{color:"#475569",fontSize:9}}>Investing.com — Calendário Econômico</a>
          </div>
        </div>
      )}
    </div>
  );
}



// ─── GESTÃO DE RISCO ──────────────────────────────────────────────────────────

const PERFIS_RISCO = {
  conservador: {
    label:"🛡️ Conservador", color:"#22c55e", bg:"#22c55e10", border:"#22c55e40",
    margemSugerida:3000, maxOps:3, stopPts:200, alvoPts:275, payoutMinimo:"1.5:1",
    lema:"Preservar é ganhar",
    descricao:"Opera com cautela máxima. 1 gain = dia encerrado. 2 perdas = dia encerrado. O capital é sagrado.",
    acertividade:"55-65%",
    regras:[
      "✅ Ganhou a 1ª → DIA ENCERRADO (+R$ 50)",
      "❌ Perdeu a 1ª → Vai para 2ª",
      "✅ Ganhou a 2ª → DIA ENCERRADO (saldo ~zero a positivo)",
      "❌ Perdeu a 2ª → DIA ENCERRADO (stop diário)",
      "🚫 NÃO EXISTE 3ª operação após 2 perdas",
    ],
    stopDiario:"2 perdas consecutivas = PAROU",
    sugestao:"Payout mín. 1.5:1 — Alvo mín. 275 pts para cada 200 pts de stop",
  },
  moderado: {
    label:"⚖️ Moderado", color:"#f59e0b", bg:"#f59e0b10", border:"#f59e0b40",
    margemSugerida:2000, maxOps:3, stopPts:200, alvoPts:400, payoutMinimo:"2:1",
    lema:"Consistência é meu nome",
    descricao:"Equilibra risco e retorno. Tem mais balas, mas não é metralhadora. Stop diário após 3 perdas.",
    acertividade:"60-70%",
    regras:[
      "✅ Acertou a 1ª → Vai para 2ª",
      "❌ Errou a 2ª → Vai para 3ª",
      "❌ Errou a 3ª → DIA ENCERRADO (saldo R$ 0)",
      "✅ Acertou a 3ª → DIA ENCERRADO (+R$ 120)",
      "❌ Errou a 1ª → Vai para 2ª (ainda pode recuperar)",
    ],
    stopDiario:"3 perdas seguidas = -R$ 120 → PAROU",
    sugestao:"Payout mín. 2:1 — Alvo mín. 400 pts para cada 200 pts de stop",
  },
  arrojado: {
    label:"🚀 Arrojado", color:"#ef4444", bg:"#ef444410", border:"#ef444440",
    margemSugerida:1000, maxOps:2, stopPts:200, alvoPts:400, payoutMinimo:"2:1",
    lema:"Vivo pela primeira. A segunda é lucro garantido.",
    descricao:"Vai para o ataque com disciplina máxima. Erra a 1ª = dia encerrado. Alto risco exige alto controle.",
    acertividade:"70%+",
    regras:[
      "✅ Acertou a 1ª → Vai para 2ª",
      "❌ Errou a 1ª → DIA ENCERRADO",
      "✅✅ Acertou 1ª e 2ª → DIA ENCERRADO (+R$ 160)",
      "✅❌ Acertou 1ª e errou 2ª → DIA ENCERRADO (+R$ 40)",
      "1 perda = dia acabou",
    ],
    stopDiario:"Perdeu 1ª = -R$ 40 → PAROU",
    sugestao:"Payout mín. 2:1 — Acertividade mínima 70% para ser lucrativo",
  },
};

const MESA_INTERNACIONAL_PRESETS = {
  apex: {
    avaliacao: {
      "EOD": {
        "25K": { metaAprovacao: 1500, perdaMaxima: 1000, perdaDiaria: 500, contratosMax: 4, drawdownTipo: "EOD", minDias: 0, prazoDias: 30, consistenciaPct: "", overnightPermitido: "Não", ativosPermitidos: "Futuros" },
        "50K": { metaAprovacao: 3000, perdaMaxima: 2000, perdaDiaria: 1000, contratosMax: 6, drawdownTipo: "EOD", minDias: 0, prazoDias: 30, consistenciaPct: "", overnightPermitido: "Não", ativosPermitidos: "Futuros" },
        "100K": { metaAprovacao: 6000, perdaMaxima: 3000, perdaDiaria: 1500, contratosMax: 8, drawdownTipo: "EOD", minDias: 0, prazoDias: 30, consistenciaPct: "", overnightPermitido: "Não", ativosPermitidos: "Futuros" },
        "150K": { metaAprovacao: 9000, perdaMaxima: 4000, perdaDiaria: 2000, contratosMax: 12, drawdownTipo: "EOD", minDias: 0, prazoDias: 30, consistenciaPct: "", overnightPermitido: "Não", ativosPermitidos: "Futuros" },
      },
      "Intraday": {
        "25K": { metaAprovacao: 1500, perdaMaxima: 1000, perdaDiaria: null, contratosMax: 4, drawdownTipo: "Intraday Trailing", minDias: 0, prazoDias: 30, consistenciaPct: "", overnightPermitido: "Não", ativosPermitidos: "Futuros" },
        "50K": { metaAprovacao: 3000, perdaMaxima: 2000, perdaDiaria: null, contratosMax: 6, drawdownTipo: "Intraday Trailing", minDias: 0, prazoDias: 30, consistenciaPct: "", overnightPermitido: "Não", ativosPermitidos: "Futuros" },
        "100K": { metaAprovacao: 6000, perdaMaxima: 3000, perdaDiaria: null, contratosMax: 8, drawdownTipo: "Intraday Trailing", minDias: 0, prazoDias: 30, consistenciaPct: "", overnightPermitido: "Não", ativosPermitidos: "Futuros" },
        "150K": { metaAprovacao: 9000, perdaMaxima: 4000, perdaDiaria: null, contratosMax: 12, drawdownTipo: "Intraday Trailing", minDias: 0, prazoDias: 30, consistenciaPct: "", overnightPermitido: "Não", ativosPermitidos: "Futuros" },
      },
    },
  },
  earn2trade: {
    avaliacao: {
      "Gauntlet Mini": {
        "50K": { metaAprovacao: 3000, perdaMaxima: 2000, perdaDiaria: 1100, contratosMax: 6, drawdownTipo: "EOD", minDias: 10, prazoDias: "Sem prazo fixo", consistenciaPct: "Manter consistência", overnightPermitido: "Não", ativosPermitidos: "Futuros CME/COMEX/NYMEX/CBOT" },
        "100K": { metaAprovacao: 6000, perdaMaxima: 3500, perdaDiaria: 2200, contratosMax: 12, drawdownTipo: "EOD", minDias: 10, prazoDias: "Sem prazo fixo", consistenciaPct: "Manter consistência", overnightPermitido: "Não", ativosPermitidos: "Futuros CME/COMEX/NYMEX/CBOT" },
        "150K": { metaAprovacao: 9000, perdaMaxima: 4500, perdaDiaria: 3300, contratosMax: 15, drawdownTipo: "EOD", minDias: 10, prazoDias: "Sem prazo fixo", consistenciaPct: "Manter consistência", overnightPermitido: "Não", ativosPermitidos: "Futuros CME/COMEX/NYMEX/CBOT" },
        "200K": { metaAprovacao: 11000, perdaMaxima: 6000, perdaDiaria: 4400, contratosMax: 16, drawdownTipo: "EOD", minDias: 10, prazoDias: "Sem prazo fixo", consistenciaPct: "Manter consistência", overnightPermitido: "Não", ativosPermitidos: "Futuros CME/COMEX/NYMEX/CBOT" },
      },
      "Trader Career Path": {
        "25K": { metaAprovacao: 1750, perdaMaxima: 1500, perdaDiaria: 550, contratosMax: 3, drawdownTipo: "EOD", minDias: 10, prazoDias: "Sem prazo fixo", consistenciaPct: "Manter consistência", overnightPermitido: "Não", ativosPermitidos: "Futuros CME/COMEX/NYMEX/CBOT" },
        "50K": { metaAprovacao: 3000, perdaMaxima: 2000, perdaDiaria: 1100, contratosMax: 6, drawdownTipo: "EOD", minDias: 10, prazoDias: "Sem prazo fixo", consistenciaPct: "Manter consistência", overnightPermitido: "Não", ativosPermitidos: "Futuros CME/COMEX/NYMEX/CBOT" },
        "100K": { metaAprovacao: 6000, perdaMaxima: 3500, perdaDiaria: 2200, contratosMax: 12, drawdownTipo: "EOD", minDias: 10, prazoDias: "Sem prazo fixo", consistenciaPct: "Manter consistência", overnightPermitido: "Não", ativosPermitidos: "Futuros CME/COMEX/NYMEX/CBOT" },
      },
    },
  },
  bulenox: {
    avaliacao: {
      "No Scaling": {
        "25K": { metaAprovacao: 1500, perdaMaxima: 1500, perdaDiaria: null, contratosMax: 3, drawdownTipo: "Drawdown", minDias: "", prazoDias: "", consistenciaPct: "", overnightPermitido: "Depende da regra vigente", ativosPermitidos: "Futuros" },
        "50K": { metaAprovacao: 3000, perdaMaxima: 2500, perdaDiaria: null, contratosMax: 7, drawdownTipo: "Drawdown", minDias: "", prazoDias: "", consistenciaPct: "", overnightPermitido: "Depende da regra vigente", ativosPermitidos: "Futuros" },
        "100K": { metaAprovacao: 6000, perdaMaxima: 3000, perdaDiaria: null, contratosMax: 12, drawdownTipo: "Drawdown", minDias: "", prazoDias: "", consistenciaPct: "", overnightPermitido: "Depende da regra vigente", ativosPermitidos: "Futuros" },
        "150K": { metaAprovacao: 9000, perdaMaxima: 4500, perdaDiaria: null, contratosMax: 15, drawdownTipo: "Drawdown", minDias: "", prazoDias: "", consistenciaPct: "", overnightPermitido: "Depende da regra vigente", ativosPermitidos: "Futuros" },
        "250K": { metaAprovacao: 15000, perdaMaxima: 5500, perdaDiaria: null, contratosMax: 25, drawdownTipo: "Drawdown", minDias: "", prazoDias: "", consistenciaPct: "", overnightPermitido: "Depende da regra vigente", ativosPermitidos: "Futuros" },
      },
      "EOD Account": {
        "25K": { metaAprovacao: 1500, perdaMaxima: 1500, perdaDiaria: null, contratosMax: 3, drawdownTipo: "EOD", minDias: "", prazoDias: "", consistenciaPct: "", overnightPermitido: "Depende da regra vigente", ativosPermitidos: "Futuros" },
        "50K": { metaAprovacao: 3000, perdaMaxima: 2500, perdaDiaria: null, contratosMax: 7, drawdownTipo: "EOD", minDias: "", prazoDias: "", consistenciaPct: "", overnightPermitido: "Depende da regra vigente", ativosPermitidos: "Futuros" },
        "100K": { metaAprovacao: 6000, perdaMaxima: 3000, perdaDiaria: null, contratosMax: 12, drawdownTipo: "EOD", minDias: "", prazoDias: "", consistenciaPct: "", overnightPermitido: "Depende da regra vigente", ativosPermitidos: "Futuros" },
        "150K": { metaAprovacao: 9000, perdaMaxima: 4500, perdaDiaria: null, contratosMax: 15, drawdownTipo: "EOD", minDias: "", prazoDias: "", consistenciaPct: "", overnightPermitido: "Depende da regra vigente", ativosPermitidos: "Futuros" },
        "250K": { metaAprovacao: 15000, perdaMaxima: 5500, perdaDiaria: null, contratosMax: 25, drawdownTipo: "EOD", minDias: "", prazoDias: "", consistenciaPct: "", overnightPermitido: "Depende da regra vigente", ativosPermitidos: "Futuros" },
      },
    },
  },
  topstep: {
    avaliacao: {
      "Trading Combine": {
        "50K": { metaAprovacao: 3000, perdaMaxima: 2000, perdaDiaria: 1000, contratosMax: 5, drawdownTipo: "Trailing", minDias: 0, prazoDias: "Sem prazo fixo", consistenciaPct: 50, overnightPermitido: "Não", ativosPermitidos: "Futuros CME" },
        "100K": { metaAprovacao: 6000, perdaMaxima: 3000, perdaDiaria: 2000, contratosMax: 10, drawdownTipo: "Trailing", minDias: 0, prazoDias: "Sem prazo fixo", consistenciaPct: 50, overnightPermitido: "Não", ativosPermitidos: "Futuros CME" },
        "150K": { metaAprovacao: 9000, perdaMaxima: 4500, perdaDiaria: 3000, contratosMax: 15, drawdownTipo: "Trailing", minDias: 0, prazoDias: "Sem prazo fixo", consistenciaPct: 50, overnightPermitido: "Não", ativosPermitidos: "Futuros CME" },
      },
    },
  },
};

const MESA_INTERNACIONAL_TAMANHOS = ["$25,000", "$50,000", "$100,000", "$150,000", "$250,000", "$300,000"];
const MESA_INTERNACIONAL_DRAWDOWN_OPCOES = ["Static Drawdown", "Trailing Drawdown", "End of Day Drawdown"];
const MESA_INTERNACIONAL_PLATAFORMAS = ["BlackArrow", "NinjaTrader", "Tradovate", "Rithmic", "Quantower", "TradingView", "Meta Trader"];
const MESA_INTERNACIONAL_CONSISTENCIA_OPCOES = ["Não tem", "30%", "40%", "50%"];
const MESA_INTERNACIONAL_PAGAMENTO_OPCOES = ["80%", "90%", "100%"];
const MESA_INTERNACIONAL_SAQUE_OPCOES = ["Semanal", "Quinzenal", "Mensal"];

const EMPTY_GERENCIAMENTO = {
  dataCriacao: hojeStr(),
  nome: "",
  tipoCapital: "",
  perfil: "",
  modoGerenciamento: "", // "perfil" ou "proprio"
  capital: "",
  contratos: "",
  usaStopDiario: false, stopDiario: "",
  usaStopPorOp: false, stopPorOp: "",
  usaLimiteGanho: false, limiteGanho: "",
  usaMaxOps: false, maxOps: "",
  horarioInicio: "",
  horarioFim: "",
  regras: "",
  // Mesa proprietária — REGRAS DA MESA
  mesaRegiao: "brasileira", // "brasileira" | "internacional"
  mesaInternacionalEmpresa: "", // apex | earn2trade | bulenox | topstep | outra
  mesaInternacionalStep: "1 Step",
  mesaInternacionalOutra: "",
  mesaInternacionalFase: "avaliacao",
  mesaInternacionalPrograma: "",
  mesaInternacionalTamanhoConta: "",
  mesaInternacionalTamanhoContaOutra: "",
  mesaInternacionalDrawdownTipo: "",
  mesaInternacionalMinDias: "",
  mesaInternacionalPrazoDias: "",
  mesaInternacionalConsistenciaPct: "",
  mesaInternacionalOvernight: "",
  mesaInternacionalAtivos: "",
  mesaInternacionalMetaTipo: "usd",
  mesaInternacionalMetaValor: "",
  mesaInternacionalMetaLucroStep2: "",
  mesaInternacionalNumeroContratos: "",
  mesaInternacionalConsistenciaRegra: "Não tem",
  mesaInternacionalPlataforma: "",
  mesaInternacionalAtivosLista: [],
  mesaInternacionalAtivoInput: "",
  mesaInternacionalTaxaAtivacao: "",
  mesaInternacionalReset: "não",
  mesaInternacionalResetValor: "",
  mesaInternacionalMaxTrailingDrawdown: "",
  mesaInternacionalMaxStopDiario: "",
  mesaInternacionalBufferRequired: "",
  mesaInternacionalPagamentoPct: "",
  mesaInternacionalObservacao: "",
  mesaInternacionalFrequenciaSaque: "",
  mesaNome: "",
  mesaContratosMaxWin: "", mesaContratosMaxWdo: "",
  usaMesaPerdaDiaria: false, mesaPerdaDiaria: "",
  usaMesaPerdaMaxima: false, mesaPerdaMaxima: "",
  usaMesaMetaAprovacao: false, mesaMetaAprovacao: "",
  mesaDiasContrato: "",
  mesaDiasValor: "",
  mesaCustoPlataforma: "", mesaCustoValor: "",
  mesaRepasse: "",
  // Mesa proprietária — MEU PLANEJAMENTO
  usaCustoPlataforma: false,
  mesaDiasCustom: "",
  planUsaMetaPct: false,
  planUsaMetaPontos: false,
  planUsaMetaReais: false,
  planQtdContratosWin: "",
  planQtdContratosWdo: "",
  planMesmoNumCt: null,
  planStopMaxDia: "",
  planStopPorOp: "",
  planMetaDiaPontos: "",
  planMetaDiaReais: "",
  planMetaDiaPct: "",
};

function GerenciamentoForm({onSave, onClose, t, initial, submitLabel}) {
  const [f, setF] = useState(()=>({ ...EMPTY_GERENCIAMENTO, ...(initial || {}) }));
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const inp = {background:t.input,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"10px 14px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};

  useEffect(() => {
    if (!initial) {
      setF({ ...EMPTY_GERENCIAMENTO });
      return;
    }
    setF({ ...EMPTY_GERENCIAMENTO, ...initial });
  }, [initial]);

  const adicionarAtivoAmericano = () => {
    const ativo = String(f.mesaInternacionalAtivoInput || "").trim();
    if (!ativo) return;
    if ((f.mesaInternacionalAtivosLista || []).length >= 10) return;
    if ((f.mesaInternacionalAtivosLista || []).some(a => String(a).toLowerCase() === ativo.toLowerCase())) return;
    setF(prev => ({
      ...prev,
      mesaInternacionalAtivosLista: [...(prev.mesaInternacionalAtivosLista || []), ativo],
      mesaInternacionalAtivoInput: "",
      mesaInternacionalAtivos: [...(prev.mesaInternacionalAtivosLista || []), ativo].join(", "),
    }));
  };

  const removerAtivoAmericano = (ativoRemover) => {
    setF(prev => {
      const lista = (prev.mesaInternacionalAtivosLista || []).filter(a => a !== ativoRemover);
      return {
        ...prev,
        mesaInternacionalAtivosLista: lista,
        mesaInternacionalAtivos: lista.join(", "),
      };
    });
  };

  const programasInternacional = useMemo(() => {
    if ((f.mesaRegiao || "brasileira") !== "internacional") return [];
    if (!f.mesaInternacionalEmpresa || f.mesaInternacionalEmpresa === "outra") return [];
    return Object.keys(MESA_INTERNACIONAL_PRESETS?.[f.mesaInternacionalEmpresa]?.[f.mesaInternacionalFase] || {});
  }, [f.mesaRegiao, f.mesaInternacionalEmpresa, f.mesaInternacionalFase]);

  const tamanhosInternacional = useMemo(() => {
    if (!f.mesaInternacionalPrograma) return [];
    return Object.keys(MESA_INTERNACIONAL_PRESETS?.[f.mesaInternacionalEmpresa]?.[f.mesaInternacionalFase]?.[f.mesaInternacionalPrograma] || {});
  }, [f.mesaInternacionalEmpresa, f.mesaInternacionalFase, f.mesaInternacionalPrograma]);

  useEffect(()=>{
    const mapaMesasInternacionais = {
      apex: "Apex",
      earn2trade: "Earn2Trade",
      bulenox: "Bulenox",
      topstep: "Topstep",
    };

    if (f.tipoCapital !== "mesa") return;
    if ((f.mesaRegiao || "brasileira") !== "internacional") return;
    if (!f.mesaInternacionalEmpresa) return;

    if (f.mesaInternacionalEmpresa === "outra") {
      set("mesaNome", f.mesaInternacionalOutra || "");
      return;
    }

    const nomeMesa = mapaMesasInternacionais[f.mesaInternacionalEmpresa] || "";
    set("mesaNome", nomeMesa);
  },[f.tipoCapital,f.mesaRegiao,f.mesaInternacionalEmpresa,f.mesaInternacionalOutra]);

  useEffect(() => {
    if ((f.mesaRegiao || "brasileira") !== "internacional") return;
    if (!programasInternacional.length) return;
    if (!programasInternacional.includes(f.mesaInternacionalPrograma)) {
      set("mesaInternacionalPrograma", programasInternacional[0]);
    }
  }, [f.mesaRegiao, f.mesaInternacionalPrograma, programasInternacional]);

  useEffect(() => {
    if ((f.mesaRegiao || "brasileira") !== "internacional") return;
    if (!tamanhosInternacional.length) return;
    const tamanhoAtual = f.mesaInternacionalTamanhoConta;
    if (tamanhoAtual && tamanhoAtual !== "outra" && tamanhosInternacional.includes(tamanhoAtual)) return;
    set("mesaInternacionalTamanhoConta", tamanhosInternacional[0]);
  }, [f.mesaRegiao, f.mesaInternacionalTamanhoConta, tamanhosInternacional]);

  useEffect(() => {
    if (f.tipoCapital !== "mesa") return;
    if ((f.mesaRegiao || "brasileira") !== "internacional") return;
    if (!f.mesaInternacionalEmpresa || f.mesaInternacionalEmpresa === "outra") return;
    if (!f.mesaInternacionalPrograma || !f.mesaInternacionalTamanhoConta || f.mesaInternacionalTamanhoConta === "outra") return;

    const preset =
      MESA_INTERNACIONAL_PRESETS?.[f.mesaInternacionalEmpresa]?.[f.mesaInternacionalFase]?.[f.mesaInternacionalPrograma]?.[f.mesaInternacionalTamanhoConta];

    if (!preset) return;

    setF(prev => ({
      ...prev,
      usaMesaMetaAprovacao: preset.metaAprovacao != null,
      mesaMetaAprovacao: preset.metaAprovacao != null ? String(preset.metaAprovacao) : "",
      usaMesaPerdaMaxima: preset.perdaMaxima != null,
      mesaPerdaMaxima: preset.perdaMaxima != null ? String(preset.perdaMaxima) : "",
      usaMesaPerdaDiaria: preset.perdaDiaria != null,
      mesaPerdaDiaria: preset.perdaDiaria != null ? String(preset.perdaDiaria) : "",
      mesaContratosMaxWin: preset.contratosMax != null ? String(preset.contratosMax) : prev.mesaContratosMaxWin,
      mesaContratosMaxWdo: preset.contratosMax != null ? String(preset.contratosMax) : prev.mesaContratosMaxWdo,
      mesaInternacionalNumeroContratos: preset.contratosMax != null ? String(preset.contratosMax) : prev.mesaInternacionalNumeroContratos,
      mesaInternacionalMetaTipo: "usd",
      mesaInternacionalMetaValor: preset.metaAprovacao != null ? String(preset.metaAprovacao) : prev.mesaInternacionalMetaValor,
      mesaInternacionalDrawdownTipo: preset.drawdownTipo != null ? String(preset.drawdownTipo) : prev.mesaInternacionalDrawdownTipo,
      mesaInternacionalMinDias: preset.minDias != null ? String(preset.minDias) : prev.mesaInternacionalMinDias,
      mesaInternacionalPrazoDias: preset.prazoDias != null ? String(preset.prazoDias) : prev.mesaInternacionalPrazoDias,
      mesaInternacionalConsistenciaPct: preset.consistenciaPct != null ? String(preset.consistenciaPct) : prev.mesaInternacionalConsistenciaPct,
      mesaInternacionalOvernight: preset.overnightPermitido != null ? String(preset.overnightPermitido) : prev.mesaInternacionalOvernight,
      mesaInternacionalAtivos: preset.ativosPermitidos != null ? String(preset.ativosPermitidos) : prev.mesaInternacionalAtivos,
    }));
  }, [
    f.tipoCapital,
    f.mesaRegiao,
    f.mesaInternacionalEmpresa,
    f.mesaInternacionalFase,
    f.mesaInternacionalPrograma,
    f.mesaInternacionalTamanhoConta,
  ]);

  const perfil = f.perfil ? PERFIS_RISCO[f.perfil] : null;
  const capital = parseFloat(f.capital)||0;
  const vlrPorPt = f.tipoCapital==="mesa" ? 10 : 0.20;

  // Sugestões automáticas baseadas no perfil
  const contratosSugeridos = perfil && capital > 0 ? Math.floor(capital / perfil.margemSugerida) : null;
  const capitalInsuficiente = perfil && capital > 0 && contratosSugeridos === 0;
  const cts = f.modoGerenciamento==="perfil" ? (contratosSugeridos||0) : (parseFloat(f.contratos)||0);
  const riscoPorOp = perfil && cts > 0 ? cts * perfil.stopPts * vlrPorPt : null;
  const alvoP1     = perfil && cts > 0 ? cts * perfil.alvoPts  * vlrPorPt : null;
  const stopDiarioSug = riscoPorOp && perfil ? riscoPorOp * (f.perfil==="arrojado"?1:f.perfil==="moderado"?3:2) : null;
  // Cálculo payout conservador: alvo = stop * 1.5
  const alvoConservador = perfil && f.perfil==="conservador" && cts>0 ? cts * perfil.stopPts * 1.5 * vlrPorPt : null;

  const validMesaInternacional =
    (f.mesaRegiao || "brasileira") !== "internacional" ||
    (
      !!String(f.mesaNome || "").trim() &&
      !!String(f.mesaInternacionalTamanhoConta || "").trim()
    );

  const validMesa = f.tipoCapital==="mesa" && f.dataCriacao && f.mesaNome && validMesaInternacional && (f.mesaContratosMaxWin || f.mesaContratosMaxWdo);
  const valid = f.tipoCapital==="mesa" ? validMesa :
    (f.dataCriacao && f.tipoCapital && f.modoGerenciamento && capital>0 &&
    (f.modoGerenciamento==="perfil" ? !!f.perfil : f.contratos!==""));

  const btnToggle = (ativo, label, icon, cor) => ({
    padding:"11px 16px", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13,
    border:`2px solid ${ativo?cor:t.border}`,
    background:ativo?cor+"18":"transparent",
    color:ativo?cor:t.muted, transition:"all .15s",
    display:"flex", alignItems:"center", gap:8,
  });

  return (
    <div>

      {/* 1 — Identificação */}
      <Section icon="📋" title="Identificação" t={t}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:2,minWidth:200}}>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>✏️ Nome do Plano</label>
            <input placeholder="ex: Plano Março 2026" value={f.nome} onChange={e=>set("nome",e.target.value)} style={inp}/>
          </div>
          <div style={{flex:1,minWidth:140}}>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📅 Data de Início</label>
            <input type="date" value={f.dataCriacao} onChange={e=>set("dataCriacao",e.target.value)} style={inp}/>
          </div>
        </div>
      </Section>

      {/* 2 — Tipo de Capital */}
      <Section icon="🏦" title="Tipo de Capital" t={t} accent="#60a5fa">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[
            {v:"proprio", label:"💰 Capital Próprio", desc:"Opera com seu próprio dinheiro.", cor:"#60a5fa"},
            {v:"mesa",    label:"🏢 Mesa Proprietária", desc:"Capital da mesa. Regras mais rígidas.", cor:"#a855f7"},
          ].map(({v,label,desc,cor})=>(
            <button key={v} onClick={()=>set("tipoCapital",v)}
              style={{padding:"16px 14px",borderRadius:12,cursor:"pointer",textAlign:"left",
                border:`2px solid ${f.tipoCapital===v?cor:t.border}`,
                background:f.tipoCapital===v?cor+"18":"transparent", transition:"all .15s"}}>
              <div style={{color:f.tipoCapital===v?cor:t.text,fontWeight:800,fontSize:14,marginBottom:4}}>{label}</div>
              <div style={{color:t.muted,fontSize:11,lineHeight:1.5}}>{desc}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* 3 — Perfil Operacional (Capital Próprio) OU Mesa Proprietária */}
      {f.tipoCapital==="proprio"&&(
        <Section icon="🎯" title="Perfil Operacional" t={t} accent={perfil?perfil.color:t.accent}>

          {/* Header: botões de perfil + botão Criar próprio */}
          <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"stretch"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,flex:3,minWidth:260}}>
              {Object.entries(PERFIS_RISCO).map(([key,pf])=>(
                <button key={key}
                  onClick={()=>{set("perfil",key); set("modoGerenciamento","perfil");}}
                  style={{padding:"12px 8px",borderRadius:12,cursor:"pointer",textAlign:"center",
                    border:`2px solid ${f.perfil===key&&f.modoGerenciamento==="perfil"?pf.color:t.border}`,
                    background:f.perfil===key&&f.modoGerenciamento==="perfil"?pf.bg:"transparent",
                    transition:"all .15s"}}>
                  <div style={{color:f.perfil===key&&f.modoGerenciamento==="perfil"?pf.color:t.text,fontWeight:800,fontSize:12}}>{pf.label}</div>
                  <div style={{color:t.muted,fontSize:9,marginTop:3}}>R${pf.margemSugerida.toLocaleString()}/ct</div>
                  <div style={{color:t.muted,fontSize:9}}>Máx. {pf.maxOps} ops/dia</div>
                  <div style={{color:pf.color,fontSize:9,marginTop:2,fontWeight:700}}>💡 {pf.sugestao.split("—")[0].trim()}</div>
                </button>
              ))}
            </div>
            <button
              onClick={()=>{set("modoGerenciamento","proprio"); set("perfil","");}}
              style={{flex:1,minWidth:140,padding:"12px 14px",borderRadius:12,cursor:"pointer",textAlign:"center",
                border:`2px solid ${f.modoGerenciamento==="proprio"?"#a855f7":t.border}`,
                background:f.modoGerenciamento==="proprio"?"#a855f718":"transparent",
                transition:"all .15s"}}>
              <div style={{color:f.modoGerenciamento==="proprio"?"#a855f7":t.text,fontWeight:800,fontSize:12,marginBottom:4}}>⚙️ Criar meu próprio</div>
              <div style={{color:t.muted,fontSize:10,lineHeight:1.4}}>Defina suas regras manualmente</div>
            </button>
          </div>

          {/* Card descritivo do perfil selecionado */}
          {perfil&&f.modoGerenciamento==="perfil"&&(
            <div style={{background:perfil.bg,border:`1px solid ${perfil.border}`,borderRadius:14,padding:"18px 20px",marginTop:4}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:12}}>
                <div>
                  <div style={{color:perfil.color,fontWeight:800,fontSize:16}}>{perfil.label}</div>
                  <div style={{color:t.muted,fontSize:12,marginTop:4,fontStyle:"italic"}}>"{perfil.lema}"</div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{background:perfil.color+"22",border:`1px solid ${perfil.color}55`,color:perfil.color,padding:"4px 10px",borderRadius:999,fontSize:11,fontWeight:700}}>Acert. {perfil.acertividade}</span>
                  <span style={{background:perfil.color+"22",border:`1px solid ${perfil.color}55`,color:perfil.color,padding:"4px 10px",borderRadius:999,fontSize:11,fontWeight:700}}>Payout mín. {perfil.payoutMinimo}</span>
                </div>
              </div>
              {/* Sugestão destacada */}
              <div style={{background:perfil.color+"15",border:`1px solid ${perfil.color}44`,borderRadius:10,padding:"10px 14px",marginBottom:12}}>
                <span style={{color:perfil.color,fontWeight:700,fontSize:12}}>💡 Sugestão: </span>
                <span style={{color:t.text,fontSize:12}}>{perfil.sugestao}</span>
              </div>
              <div style={{color:t.text,fontSize:13,marginBottom:12,lineHeight:1.6}}>{perfil.descricao}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                {[
                  ["📍 Stop/op",`${perfil.stopPts} pts`],
                  ["🎯 Alvo/op",`${perfil.alvoPts} pts (${perfil.payoutMinimo})`],
                  ["🔢 Máx. ops/dia",`${perfil.maxOps} operações`],
                  ["💵 Margem sugerida",`R$ ${perfil.margemSugerida.toLocaleString()}/contrato`],
                ].map(([label,val])=>(
                  <div key={label} style={{background:t.card,border:`1px solid ${perfil.border}`,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{color:t.muted,fontSize:10,fontWeight:700}}>{label}</div>
                    <div style={{color:perfil.color,fontWeight:800,fontSize:13,marginTop:3}}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:6}}>
                <div style={{color:t.muted,fontSize:11,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>📋 Regras do Perfil</div>
                {perfil.regras.map((r,i)=>(
                  <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:6}}>
                    <span style={{color:perfil.color,fontWeight:700,fontSize:12,minWidth:18}}>{i+1}.</span>
                    <span style={{color:t.text,fontSize:12,lineHeight:1.5}}>{r}</span>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10,background:t.card,border:`1px solid ${perfil.border}`,borderRadius:8,padding:"10px 14px"}}>
                <span style={{color:perfil.color,fontWeight:700,fontSize:12}}>🛑 Stop Diário: </span>
                <span style={{color:t.text,fontSize:12}}>{perfil.stopDiario}</span>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* 3b — Mesa Proprietária */}
      {f.tipoCapital==="mesa"&&(
        <Section icon="🏢" title={f.mesaRegiao==="internacional"?"Mesa Proprietária Internacional":"Mesa Proprietária Brasileira"} t={t} accent="#a855f7">

          {/* Tipo de mesa */}
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:8,fontWeight:600}}>🌎 Tipo de Mesa</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {v:"brasileira",label:"🇧🇷 Mesa Proprietária Brasileira",desc:"Usa o formulário atual"},
                {v:"internacional",label:"🌎 Mesa Proprietária Internacional",desc:"Apex, Earn2Trade, Bulenox, Topstep"},
              ].map(op=>{
                const ativo = (f.mesaRegiao || "brasileira") === op.v;
                return (
                  <button key={op.v} onClick={()=>set("mesaRegiao",op.v)}
                    style={{padding:"12px 12px",borderRadius:10,cursor:"pointer",textAlign:"left",
                      border:`2px solid ${ativo?"#a855f7":t.border}`,
                      background:ativo?"#a855f718":"transparent",transition:"all .15s"}}>
                    <div style={{color:ativo?"#a855f7":t.text,fontWeight:800,fontSize:12,marginBottom:3}}>{op.label}</div>
                    <div style={{color:t.muted,fontSize:10}}>{op.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {(f.mesaRegiao || "brasileira") === "internacional" && (
            <div style={{marginBottom:16}}>
              <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🧩 Modelo de avaliação</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["1 Step", "2 Step", "Instant Funding"].map(op=>{
                  const ativo = (f.mesaAmericanaStep || "1 Step") === op;
                  return (
                    <button key={op} onClick={()=>set("mesaAmericanaStep",op)}
                      style={{padding:"8px 12px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,
                        border:`2px solid ${ativo?"#a855f7":t.border}`,
                        background:ativo?"#a855f718":"transparent",
                        color:ativo?"#a855f7":t.text}}>
                      {op}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(f.mesaRegiao || "brasileira") === "brasileira" ? (
            <div style={{marginBottom:16}}>
              <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🏷️ Nome da Mesa</label>
              <input placeholder="ex: TopstepTrader, Apex, FTMO, Clear..." value={f.mesaNome}
                onChange={e=>set("mesaNome",e.target.value)} style={inp}/>
            </div>
          ) : (
            <div style={{marginBottom:16,padding:"12px 14px",border:`1px solid ${t.border}`,borderRadius:10,background:t.bg}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{gridColumn:"1 / span 2"}}>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🏷️ Nome da mesa</label>
                  <input
                    placeholder="Ex: Apex Trader Funding"
                    value={f.mesaNome}
                    onChange={e=>set("mesaNome",e.target.value)}
                    style={inp}
                  />
                </div>

                <div style={{gridColumn:"1 / span 2"}}>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>💼 Tamanho da conta</label>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {MESA_INTERNACIONAL_TAMANHOS.map(tam=>{
                      const ativo = f.mesaAmericanaTamanhoConta === tam;
                      return (
                        <button key={tam} onClick={()=>set("mesaAmericanaTamanhoConta",tam)}
                          style={{padding:"8px 12px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,
                            border:`2px solid ${ativo?"#22c55e":t.border}`,
                            background:ativo?"#22c55e18":"transparent",
                            color:ativo?"#22c55e":t.text,transition:"all .15s"}}>
                          {tam}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{gridColumn:"1 / span 2"}}>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🎯 Meta de Lucro (US$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Digite o valor em US$"
                    value={f.mesaAmericanaMetaValor}
                    onChange={e=>{set("mesaAmericanaMetaTipo","usd");set("mesaAmericanaMetaValor",e.target.value);}}
                    style={inp}
                  />
                </div>

                {(f.mesaAmericanaStep || "1 Step") === "2 Step" && (
                  <div style={{gridColumn:"1 / span 2"}}>
                    <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🎯 Meta de Lucro Step 2 (US$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Digite a meta do Step 2 em US$"
                      value={f.mesaAmericanaMetaLucroStep2}
                      onChange={e=>set("mesaAmericanaMetaLucroStep2",e.target.value)}
                      style={inp}
                    />
                  </div>
                )}

                <div style={{gridColumn:"1 / span 2"}}>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📉 Drawdown</label>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {MESA_INTERNACIONAL_DRAWDOWN_OPCOES.map(op=>{
                      const ativo = f.mesaAmericanaDrawdownTipo === op;
                      return (
                        <button key={op} onClick={()=>set("mesaAmericanaDrawdownTipo",op)}
                          style={{padding:"8px 12px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,
                            border:`2px solid ${ativo?"#ef4444":t.border}`,
                            background:ativo?"#ef444418":"transparent",
                            color:ativo?"#ef4444":t.text}}>
                          {op}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📉 Max Trailing Drawdown (US$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 2500"
                    value={f.mesaAmericanaMaxTrailingDrawdown}
                    onChange={e=>set("mesaAmericanaMaxTrailingDrawdown",e.target.value)}
                    style={inp}
                  />
                </div>

                <div>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🛑 Máximo Stop Diário (US$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 1000"
                    value={f.mesaAmericanaMaxStopDiario}
                    onChange={e=>set("mesaAmericanaMaxStopDiario",e.target.value)}
                    style={inp}
                  />
                </div>

                <div>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🧱 Buffer Required (colchão) (US$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 100"
                    value={f.mesaAmericanaBufferRequired}
                    onChange={e=>set("mesaAmericanaBufferRequired",e.target.value)}
                    style={inp}
                  />
                </div>

                <div>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🔢 Número de Contratos</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Ex: 5"
                    value={f.mesaAmericanaNumeroContratos}
                    onChange={e=>{
                      set("mesaAmericanaNumeroContratos",e.target.value);
                      set("mesaContratosMaxWin",e.target.value);
                      set("mesaContratosMaxWdo",e.target.value);
                    }}
                    style={inp}
                  />
                </div>

                <div>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📆 Dias mínimos operados</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ex: 10"
                    value={f.mesaAmericanaMinDias}
                    onChange={e=>set("mesaAmericanaMinDias",e.target.value)}
                    style={inp}
                  />
                </div>

                <div style={{gridColumn:"1 / span 2"}}>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📏 Regra de Consistência</label>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {MESA_INTERNACIONAL_CONSISTENCIA_OPCOES.map(op=>{
                      const ativo = f.mesaAmericanaConsistenciaRegra === op;
                      return (
                        <button key={op} onClick={()=>{
                          set("mesaAmericanaConsistenciaRegra",op);
                          set("mesaAmericanaConsistenciaPct", op === "Não tem" ? "" : op.replace("%", ""));
                        }}
                          style={{padding:"8px 12px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,
                            border:`2px solid ${ativo?"#a855f7":t.border}`,
                            background:ativo?"#a855f718":"transparent",
                            color:ativo?"#a855f7":t.text}}>
                          {op}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{gridColumn:"1 / span 2"}}>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🖥️ Plataforma</label>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {MESA_INTERNACIONAL_PLATAFORMAS.map(op=>{
                      const ativo = f.mesaInternacionalPlataforma === op;
                      return (
                        <button key={op} onClick={()=>set("mesaInternacionalPlataforma",op)}
                          style={{padding:"8px 12px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,
                            border:`2px solid ${ativo?"#60a5fa":t.border}`,
                            background:ativo?"#60a5fa18":"transparent",
                            color:ativo?"#60a5fa":t.text}}>
                          {op}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{gridColumn:"1 / span 2"}}>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📈 Mercado / Ativos Permitidos (máx. 10)</label>
                  <div style={{display:"flex",gap:8}}>
                    <input
                      placeholder="Digite um ativo (ex: NQ, ES, CL...)"
                      value={f.mesaAmericanaAtivoInput}
                      onChange={e=>set("mesaAmericanaAtivoInput",e.target.value)}
                      onKeyDown={e=>{ if (e.key === "Enter") { e.preventDefault(); adicionarAtivoAmericano(); } }}
                      style={inp}
                    />
                    <button
                      onClick={adicionarAtivoAmericano}
                      disabled={(f.mesaAmericanaAtivosLista||[]).length >= 10}
                      style={{padding:"0 14px",borderRadius:8,border:`1px solid ${t.border}`,background:t.card,color:t.text,cursor:"pointer",fontWeight:700}}
                    >
                      +
                    </button>
                  </div>
                  {(f.mesaAmericanaAtivosLista||[]).length > 0 && (
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                      {(f.mesaAmericanaAtivosLista||[]).map(ativo=>(
                        <span key={ativo} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 9px",borderRadius:999,background:"#06b6d418",border:"1px solid #06b6d455",color:"#22d3ee",fontSize:11,fontWeight:700}}>
                          {ativo}
                          <button onClick={()=>removerAtivoAmericano(ativo)} style={{background:"transparent",border:"none",color:"#22d3ee",cursor:"pointer",fontWeight:800}}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>💳 Taxa de Ativação (US$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 149"
                    value={f.mesaAmericanaTaxaAtivacao}
                    onChange={e=>set("mesaAmericanaTaxaAtivacao",e.target.value)}
                    style={inp}
                  />
                </div>

                <div>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🔁 Reset</label>
                  <div style={{display:"flex",gap:8,marginBottom:8}}>
                    {["não", "sim"].map(op=>{
                      const ativo = f.mesaAmericanaReset === op;
                      return (
                        <button key={op} onClick={()=>set("mesaAmericanaReset",op)}
                          style={{padding:"8px 12px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,
                            border:`2px solid ${ativo?"#f59e0b":t.border}`,
                            background:ativo?"#f59e0b18":"transparent",
                            color:ativo?"#f59e0b":t.text}}>
                          {op === "sim" ? "Sim" : "Não"}
                        </button>
                      );
                    })}
                  </div>
                  {f.mesaAmericanaReset === "sim" && (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Valor do reset em US$"
                      value={f.mesaAmericanaResetValor}
                      onChange={e=>set("mesaAmericanaResetValor",e.target.value)}
                      style={inp}
                    />
                  )}
                </div>

                <div style={{gridColumn:"1 / span 2"}}>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>💰 Pagamento %</label>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {MESA_INTERNACIONAL_PAGAMENTO_OPCOES.map(op=>{
                      const ativo = f.mesaAmericanaPagamentoPct === op;
                      return (
                        <button key={op} onClick={()=>set("mesaAmericanaPagamentoPct",op)}
                          style={{padding:"8px 12px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,
                            border:`2px solid ${ativo?"#22c55e":t.border}`,
                            background:ativo?"#22c55e18":"transparent",
                            color:ativo?"#22c55e":t.text}}>
                          {op}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{gridColumn:"1 / span 2"}}>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📝 Observação</label>
                  <textarea
                    rows={3}
                    placeholder="Digite observações importantes da mesa"
                    value={f.mesaAmericanaObservacao}
                    onChange={e=>set("mesaAmericanaObservacao",e.target.value)}
                    style={{...inp,resize:"vertical",fontFamily:"inherit"}}
                  />
                </div>

                <div style={{gridColumn:"1 / span 2"}}>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🏦 Frequência de Saque</label>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {MESA_INTERNACIONAL_SAQUE_OPCOES.map(op=>{
                      const ativo = f.mesaAmericanaFrequenciaSaque === op;
                      return (
                        <button key={op} onClick={()=>set("mesaAmericanaFrequenciaSaque",op)}
                          style={{padding:"8px 12px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,
                            border:`2px solid ${ativo?"#a855f7":t.border}`,
                            background:ativo?"#a855f718":"transparent",
                            color:ativo?"#a855f7":t.text}}>
                          {op}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(f.mesaRegiao || "brasileira") !== "internacional" && (
          <>
          {/* Contratos máximos WIN e WDO */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div>
              <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📊 Contratos máx. permitidos — WIN</label>
              <input type="number" min="1" step="1" placeholder="ex: 5"
                value={f.mesaContratosMaxWin} onChange={e=>set("mesaContratosMaxWin",e.target.value)} style={inp}/>
            </div>
            <div>
              <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>💱 Contratos máx. permitidos — WDO</label>
              <input type="number" min="1" step="1" placeholder="ex: 3"
                value={f.mesaContratosMaxWdo} onChange={e=>set("mesaContratosMaxWdo",e.target.value)} style={inp}/>
            </div>
          </div>

          {/* Toggles de regras */}
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>

            {/* Limite de Perda Diária */}
            {[
              {k:"usaMesaPerdaDiaria",   vk:"mesaPerdaDiaria",   icon:"🛑", label:"Limite de Perda Diária",   cor:"#ef4444", ph:"ex: 300",  msg:(v)=>`Ao atingir -R$ ${parseFloat(v).toLocaleString("pt-BR",{minimumFractionDigits:2})} → PARE de operar`},
              {k:"usaMesaPerdaMaxima",   vk:"mesaPerdaMaxima",   icon:"💀", label:"Limite de Perda Máxima",   cor:"#dc2626", ph:"ex: 1000", msg:(v)=>`Ao atingir -R$ ${parseFloat(v).toLocaleString("pt-BR",{minimumFractionDigits:2})} → CONTA ENCERRADA`},
              {k:"usaMesaMetaAprovacao", vk:"mesaMetaAprovacao", icon:"🏆", label:"Meta para Aprovação",       cor:"#22c55e", ph:"ex: 2000", msg:(v)=>`Precisa atingir +R$ ${parseFloat(v).toLocaleString("pt-BR",{minimumFractionDigits:2})} para aprovar`},
            ].map(({k,vk,icon,label,cor,ph,msg})=>(
              <div key={k}>
                <button onClick={()=>set(k,!f[k])}
                  style={{width:"100%",padding:"12px 16px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
                    border:`2px solid ${f[k]?cor:t.border}`,background:f[k]?cor+"18":"transparent",
                    color:f[k]?cor:t.muted,display:"flex",alignItems:"center",gap:8,transition:"all .15s"}}>
                  <span>{icon}</span><span>{label}</span>
                  <span style={{marginLeft:"auto",fontSize:11}}>{f[k]?"✅ Ativo":"○ Inativo"}</span>
                </button>
                {f[k]&&(
                  <div style={{marginTop:8,padding:"12px 16px",background:cor+"10",border:`1px solid ${cor}33`,borderRadius:10}}>
                    <label style={{display:"block",color:cor,fontSize:12,marginBottom:6,fontWeight:600}}>Valor em R$</label>
                    <input type="number" min="0" step="10" placeholder={ph}
                      value={f[vk]} onChange={e=>set(vk,e.target.value)}
                      style={{...inp,border:`1px solid ${cor}55`}}/>
                    {f[vk]&&<div style={{color:cor,fontSize:11,marginTop:4,fontWeight:700}}>{msg(f[vk])}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Custo de Plataforma — toggle */}
          <div style={{marginBottom:16}}>
            <button onClick={()=>set("usaCustoPlataforma",!f.usaCustoPlataforma)}
              style={{width:"100%",padding:"12px 16px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
                border:`2px solid ${f.usaCustoPlataforma?"#a855f7":t.border}`,
                background:f.usaCustoPlataforma?"#a855f718":"transparent",
                color:f.usaCustoPlataforma?"#a855f7":t.muted,
                display:"flex",alignItems:"center",gap:8,transition:"all .15s"}}>
              <span>🖥️</span><span>Você tem algum custo com a plataforma?</span>
              <span style={{marginLeft:"auto",fontSize:11}}>{f.usaCustoPlataforma?"✅ Sim":"○ Não"}</span>
            </button>
            {f.usaCustoPlataforma&&(
              <div style={{marginTop:10,padding:"14px 16px",background:"#a855f710",border:"1px solid #a855f733",borderRadius:10}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🖥️ Qual plataforma?</label>
                    <input placeholder="ex: Profit One, Nelogica..." value={f.mesaCustoPlataforma}
                      onChange={e=>set("mesaCustoPlataforma",e.target.value)} style={inp}/>
                  </div>
                  <div>
                    <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>💵 Qual o custo? (R$)</label>
                    <input type="number" min="0" step="1" placeholder="ex: 150"
                      value={f.mesaCustoValor} onChange={e=>set("mesaCustoValor",e.target.value)} style={inp}/>
                  </div>
                </div>
                <div>
                  <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:8,fontWeight:600}}>📆 Esse custo é cobrado a cada...</label>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:f.mesaDiasContrato==="outro"?10:0}}>
                    {[["30","30 dias"],["60","60 dias"],["outro","Outro"]].map(([v,label])=>(
                      <button key={v} onClick={()=>set("mesaDiasContrato",v)}
                        style={{flex:1,minWidth:80,padding:"9px 8px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12,
                          border:`2px solid ${f.mesaDiasContrato===v?"#a855f7":t.border}`,
                          background:f.mesaDiasContrato===v?"#a855f718":"transparent",
                          color:f.mesaDiasContrato===v?"#a855f7":t.muted,transition:"all .15s"}}>{label}</button>
                    ))}
                  </div>
                  {f.mesaDiasContrato==="outro"&&(
                    <input type="number" min="1" step="1" placeholder="Número de dias (ex: 45)"
                      value={f.mesaDiasCustom||""} onChange={e=>set("mesaDiasCustom",e.target.value)}
                      style={{...inp,marginTop:8}}/>
                  )}
                  {f.mesaCustoValor&&f.mesaDiasContrato&&(
                    <div style={{color:t.muted,fontSize:11,marginTop:6}}>
                      💡 Custo/dia: R$ {(parseFloat(f.mesaCustoValor)/(parseInt(f.mesaDiasContrato==="outro"?f.mesaDiasCustom||30:f.mesaDiasContrato)||30)).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Repasse */}
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📊 Repasse da Mesa (%)</label>
            <input type="number" min="0" max="100" step="1" placeholder="ex: 70 (você fica com 70% do lucro)"
              value={f.mesaRepasse} onChange={e=>set("mesaRepasse",e.target.value)} style={inp}/>
            {f.mesaRepasse&&(
              <div style={{color:"#a855f7",fontSize:11,marginTop:4,fontWeight:700}}>
                Você fica com {f.mesaRepasse}% · Mesa fica com {100-parseFloat(f.mesaRepasse)}%
              </div>
            )}
          </div>

          {/* ══ DIVISOR MEU PLANEJAMENTO ══ */}
          <div style={{display:"flex",alignItems:"center",gap:10,margin:"20px 0 16px 0"}}>
            <div style={{flex:1,height:1,background:t.border}}/>
            <div style={{color:"#a855f7",fontSize:11,fontWeight:800,letterSpacing:2,textTransform:"uppercase",
              whiteSpace:"nowrap",padding:"4px 16px",border:`1px solid #a855f733`,borderRadius:999,background:"#a855f710"}}>
              ⚙️ MEU PLANEJAMENTO
            </div>
            <div style={{flex:1,height:1,background:t.border}}/>
          </div>

          {(()=>{
            const VPT = {WIN:0.20, WDO:10.0};
            const WDO_STEP = 0.5;
            const mesmoNum = f.planMesmoNumCt === true;
            const ctWin = mesmoNum ? parseInt(f.planQtdContratos||0)||0 : parseInt(f.planQtdContratosWin||0)||0;
            const ctWdo = mesmoNum ? parseInt(f.planQtdContratos||0)||0 : parseInt(f.planQtdContratosWdo||0)||0;
            const metaAprov = f.usaMesaMetaAprovacao&&f.mesaMetaAprovacao ? parseFloat(f.mesaMetaAprovacao)||0 : 0;
            const maxWin = parseInt(f.mesaContratosMaxWin||0)||0;
            const maxWdo = parseInt(f.mesaContratosMaxWdo||0)||0;
            const perdaDiariaLimite = f.usaMesaPerdaDiaria&&f.mesaPerdaDiaria ? parseFloat(f.mesaPerdaDiaria)||0 : 0;
            const stopMaxDia = parseFloat(f.planStopMaxDia||0)||0;

            // Arredonda para múltiplo de 0.5 (WDO)
            const roundWdo = (pts) => Math.ceil(pts / WDO_STEP) * WDO_STEP;

            // Dias exatos WDO: dias inteiros + possível dia parcial
            const calcDiasExatosWdo = (metaTotal, ptsDia, cts) => {
              if(!metaTotal||!ptsDia||!cts) return null;
              const ptsFinal = roundWdo(ptsDia);
              const reaisDia = ptsFinal * cts * VPT.WDO;
              if(reaisDia<=0) return null;
              const diasInt = Math.floor(metaTotal / reaisDia);
              const resto = metaTotal - diasInt * reaisDia;
              if(resto<=0.001) return {total:diasInt, parcial:null};
              const ptsParcial = roundWdo(resto / cts / VPT.WDO);
              return {total:diasInt+1, parcial:{pts:ptsParcial, reais:ptsParcial*cts*VPT.WDO}};
            };

            // Tabela 1-10 contratos genérica
            const Tabela = ({cor, icon, ativo, titulo, calcPts, calcReais, ctSel}) => (
              <div style={{background:cor+"08",border:`1px solid ${cor}33`,borderRadius:10,overflow:"hidden",marginTop:8}}>
                <div style={{background:cor+"18",padding:"8px 14px",borderBottom:`1px solid ${cor}33`}}>
                  <span style={{color:cor,fontWeight:800,fontSize:11}}>{icon} {titulo}</span>
                  <span style={{color:t.muted,fontSize:9,marginLeft:8}}>{ativo==="WDO"?"min 0,5pt · R$5/0,5pt/ct":"R$0,20/pt/ct"}</span>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:t.bg}}>
                    <th style={{padding:"6px 10px",color:t.muted,fontWeight:700,fontSize:10,textAlign:"left",borderBottom:`1px solid ${t.border}`}}>Contratos</th>
                    <th style={{padding:"6px 10px",color:cor,fontWeight:700,fontSize:10,textAlign:"center",borderBottom:`1px solid ${t.border}`}}>Pontos/dia</th>
                    <th style={{padding:"6px 10px",color:t.muted,fontWeight:700,fontSize:10,textAlign:"right",borderBottom:`1px solid ${t.border}`}}>R$/dia</th>
                  </tr></thead>
                  <tbody>
                    {Array.from({length:10},(_,i)=>i+1).map(ct=>{
                      const pts = calcPts(ct);
                      const reais = calcReais(ct, pts);
                      const sel = ct===ctSel;
                      return (
                        <tr key={ct} style={{background:sel?cor+"18":ct%2===0?t.bg+"88":"transparent"}}>
                          <td style={{padding:"6px 10px",color:sel?cor:t.text,fontWeight:sel?800:500,borderBottom:`1px solid ${t.border}22`}}>
                            {ct}ct{sel&&<span style={{marginLeft:4,fontSize:9,color:cor,fontWeight:700}}>← você</span>}
                          </td>
                          <td style={{padding:"6px 10px",color:sel?cor:"#4ade80",fontWeight:800,fontSize:13,textAlign:"center",borderBottom:`1px solid ${t.border}22`}}>
                            {ativo==="WDO" ? pts.toLocaleString("pt-BR",{minimumFractionDigits:1}) : pts.toLocaleString("pt-BR")} pts
                          </td>
                          <td style={{padding:"6px 10px",color:t.muted,fontSize:11,textAlign:"right",borderBottom:`1px solid ${t.border}22`}}>
                            R$ {reais.toLocaleString("pt-BR",{minimumFractionDigits:2})}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );

            return (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>

                {/* ── QTD Contratos ── */}
                <div>
                  <button onClick={()=>set("planMesmoNumCt", mesmoNum ? null : true)}
                    style={{width:"100%",padding:"11px 16px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,marginBottom:10,
                      border:`2px solid ${mesmoNum?"#60a5fa":t.border}`,background:mesmoNum?"#60a5fa18":"transparent",
                      color:mesmoNum?"#60a5fa":t.muted,display:"flex",alignItems:"center",gap:8,transition:"all .15s"}}>
                    <span>🔗</span><span>Usarei o mesmo número de contratos para WIN e WDO</span>
                    <span style={{marginLeft:"auto",fontSize:11}}>{mesmoNum?"✅ Sim — mesmo número":"○ Não — separar WIN/WDO"}</span>
                  </button>
                  {mesmoNum ? (
                    /* MESMO número para WIN e WDO */
                    <div>
                      <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📊 QTD Contratos (WIN e WDO)</label>
                      <input type="number" min="1" step="1" placeholder="ex: 2"
                        value={f.planQtdContratos} onChange={e=>set("planQtdContratos",e.target.value)}
                        style={{...inp,border:`1px solid ${(maxWin>0&&parseInt(f.planQtdContratos||0)>maxWin)||(maxWdo>0&&parseInt(f.planQtdContratos||0)>maxWdo)?"#ef4444":"#60a5fa"}55`}}/>
                      {f.planQtdContratos&&maxWin>0&&parseInt(f.planQtdContratos)>maxWin&&(
                        <div style={{color:"#ef4444",fontSize:11,marginTop:3,fontWeight:700}}>⚠️ Acima do máx. WIN da mesa ({maxWin}ct)</div>
                      )}
                      {f.planQtdContratos&&maxWdo>0&&parseInt(f.planQtdContratos)>maxWdo&&(
                        <div style={{color:"#ef4444",fontSize:11,marginTop:2,fontWeight:700}}>⚠️ Acima do máx. WDO da mesa ({maxWdo}ct)</div>
                      )}
                    </div>
                  ) : (
                    /* SEPARADO: WIN e WDO independentes */
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div>
                        <label style={{display:"block",color:"#4ade80",fontSize:12,marginBottom:6,fontWeight:600}}>
                          🟢 QTD Contratos — WIN {maxWin>0&&<span style={{color:t.muted,fontWeight:400}}>(máx {maxWin}ct)</span>}
                        </label>
                        <input type="number" min="1" step="1" placeholder="ex: 2"
                          value={f.planQtdContratosWin} onChange={e=>set("planQtdContratosWin",e.target.value)}
                          style={{...inp,border:`1px solid ${maxWin>0&&parseInt(f.planQtdContratosWin||0)>maxWin?"#ef4444":"#22c55e"}55`}}/>
                        {f.planQtdContratosWin&&maxWin>0&&parseInt(f.planQtdContratosWin)>maxWin&&(
                          <div style={{color:"#ef4444",fontSize:11,marginTop:3,fontWeight:700}}>⚠️ Máx. {maxWin}ct WIN</div>
                        )}
                      </div>
                      <div>
                        <label style={{display:"block",color:"#06b6d4",fontSize:12,marginBottom:6,fontWeight:600}}>
                          💱 QTD Contratos — WDO {maxWdo>0&&<span style={{color:t.muted,fontWeight:400}}>(máx {maxWdo}ct)</span>}
                        </label>
                        <input type="number" min="1" step="1" placeholder="ex: 1"
                          value={f.planQtdContratosWdo} onChange={e=>set("planQtdContratosWdo",e.target.value)}
                          style={{...inp,border:`1px solid ${maxWdo>0&&parseInt(f.planQtdContratosWdo||0)>maxWdo?"#ef4444":"#06b6d4"}55`}}/>
                        {f.planQtdContratosWdo&&maxWdo>0&&parseInt(f.planQtdContratosWdo)>maxWdo&&(
                          <div style={{color:"#ef4444",fontSize:11,marginTop:3,fontWeight:700}}>⚠️ Máx. {maxWdo}ct WDO</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Stop Máx Dia (só após contratos) ── */}
                {(ctWin>0||ctWdo>0)&&(
                  <div>
                    <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>
                      🛑 Stop Máx. Arriscado/Dia (R$)
                      {perdaDiariaLimite>0&&<span style={{color:"#f87171",marginLeft:8,fontWeight:400}}>(máx R$ {perdaDiariaLimite.toLocaleString("pt-BR",{minimumFractionDigits:2})})</span>}
                    </label>
                    <input type="number" min="0" step="10"
                      placeholder={perdaDiariaLimite>0?`ex: ${perdaDiariaLimite} (limite da mesa)`:"ex: 200"}
                      value={f.planStopMaxDia} onChange={e=>set("planStopMaxDia",e.target.value)}
                      style={{...inp,border:`1px solid ${stopMaxDia>0&&perdaDiariaLimite>0&&stopMaxDia>perdaDiariaLimite?"#ef4444":"#ef4444"}44`}}/>
                    {stopMaxDia>0&&perdaDiariaLimite>0&&stopMaxDia>perdaDiariaLimite&&(
                      <div style={{color:"#ef4444",fontSize:11,marginTop:4,fontWeight:700,padding:"6px 10px",background:"#ef444415",borderRadius:6,border:"1px solid #ef444433"}}>
                        ⚠️ Stop (R$ {stopMaxDia.toLocaleString("pt-BR",{minimumFractionDigits:2})}) ultrapassa o limite de perda diária da mesa (R$ {perdaDiariaLimite.toLocaleString("pt-BR",{minimumFractionDigits:2})})
                      </div>
                    )}
                    {stopMaxDia>0&&(!(perdaDiariaLimite>0&&stopMaxDia>perdaDiariaLimite))&&(
                      <div style={{color:"#f87171",fontSize:10,marginTop:3,fontWeight:700}}>-R$ {stopMaxDia.toLocaleString("pt-BR",{minimumFractionDigits:2})}/dia</div>
                    )}
                  </div>
                )}

                {/* ── 3 TIPOS DE META — toggles (só após stop dia) ── */}
                {f.planStopMaxDia&&parseFloat(f.planStopMaxDia)>0&&(
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{color:t.muted,fontSize:11,fontWeight:700,letterSpacing:0.5}}>🎯 TIPO DE META DIÁRIA — escolha uma ou mais</div>

                    {/* ── META POR % ── */}
                    <div>
                      <button onClick={()=>set("planUsaMetaPct",!f.planUsaMetaPct)}
                        style={{width:"100%",padding:"11px 16px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
                          border:`2px solid ${f.planUsaMetaPct?"#a855f7":t.border}`,background:f.planUsaMetaPct?"#a855f718":"transparent",
                          color:f.planUsaMetaPct?"#a855f7":t.muted,display:"flex",alignItems:"center",gap:8,transition:"all .15s"}}>
                        <span>📈</span><span>Meta por % ao dia</span>
                        <span style={{marginLeft:"auto",fontSize:11}}>{f.planUsaMetaPct?"✅ Ativo":"○ Inativo"}</span>
                      </button>
                      {f.planUsaMetaPct&&metaAprov>0&&(
                        <div style={{marginTop:8,padding:"14px",background:"#a855f70a",border:"1px solid #a855f733",borderRadius:10}}>
                          <input type="number" min="0.1" max="100" step="0.1" placeholder="ex: 5"
                            value={f.planMetaDiaPct} onChange={e=>set("planMetaDiaPct",e.target.value)}
                            style={{...inp,border:"1px solid #a855f755",marginBottom:8}}/>
                          {f.planMetaDiaPct&&parseFloat(f.planMetaDiaPct)>0&&(()=>{
                            const pct = parseFloat(f.planMetaDiaPct);
                            const metaDia = metaAprov * pct / 100;
                            const dias = Math.ceil(metaAprov / metaDia);
                            return (
                              <div>
                                <div style={{background:"#a855f715",border:"1px solid #a855f744",borderRadius:8,padding:"10px 14px",marginBottom:10}}>
                                  <span style={{color:"#a855f7",fontWeight:800,fontSize:16}}>{pct}% de R$ {metaAprov.toLocaleString("pt-BR",{minimumFractionDigits:2})} = </span>
                                  <span style={{color:"#c084fc",fontWeight:900,fontSize:18}}>R$ {metaDia.toLocaleString("pt-BR",{minimumFractionDigits:2})}/dia</span>
                                  <span style={{color:"#c084fc",fontSize:16,fontWeight:800,marginLeft:12}}>→ <strong style={{color:"#a855f7",fontSize:17}}>{dias} dias</strong> para aprovação</span>
                                </div>
                                {/* Tabelas WIN e WDO */}
                                {ctWin>0&&<Tabela cor="#22c55e" icon="🟢" ativo="WIN" ctSel={ctWin}
                                  titulo={`WIN — ${pct}% = R$ ${metaDia.toLocaleString("pt-BR",{minimumFractionDigits:2})}/dia`}
                                  calcPts={ct=>Math.ceil(metaDia/ct/VPT.WIN)}
                                  calcReais={(ct,pts)=>pts*ct*VPT.WIN}/>}
                                {ctWdo>0&&<Tabela cor="#06b6d4" icon="💱" ativo="WDO" ctSel={ctWdo}
                                  titulo={`WDO — ${pct}% = R$ ${metaDia.toLocaleString("pt-BR",{minimumFractionDigits:2})}/dia`}
                                  calcPts={ct=>roundWdo(metaDia/ct/VPT.WDO)}
                                  calcReais={(ct,pts)=>pts*ct*VPT.WDO}/>}
                              </div>
                            );
                          })()}
                          {f.planMetaDiaPct&&!metaAprov&&<div style={{color:"#f87171",fontSize:11,marginTop:4}}>⚠️ Defina a Meta de Aprovação acima para calcular</div>}
                        </div>
                      )}
                      {f.planUsaMetaPct&&!metaAprov&&<div style={{color:"#f87171",fontSize:11,marginTop:6,padding:"8px 12px",background:"#ef444410",border:"1px solid #ef444433",borderRadius:8}}>⚠️ Ative "Meta para Aprovação" acima para usar meta por %</div>}
                    </div>

                    {/* ── META POR PONTOS ── */}
                    <div>
                      <button onClick={()=>set("planUsaMetaPontos",!f.planUsaMetaPontos)}
                        style={{width:"100%",padding:"11px 16px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
                          border:`2px solid ${f.planUsaMetaPontos?"#4ade80":t.border}`,background:f.planUsaMetaPontos?"#22c55e18":"transparent",
                          color:f.planUsaMetaPontos?"#4ade80":t.muted,display:"flex",alignItems:"center",gap:8,transition:"all .15s"}}>
                        <span>🎯</span><span>Meta por Pontos</span>
                        <span style={{marginLeft:"auto",fontSize:11}}>{f.planUsaMetaPontos?"✅ Ativo":"○ Inativo"}</span>
                      </button>
                      {f.planUsaMetaPontos&&(
                        <div style={{marginTop:8,padding:"14px",background:"#22c55e0a",border:"1px solid #22c55e33",borderRadius:10}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
                            <div>
                              <label style={{display:"block",color:"#4ade80",fontSize:12,marginBottom:6,fontWeight:600}}>🟢 Pontos/dia — WIN</label>
                              <input type="number" min="1" step="1" placeholder="ex: 200 pts"
                                value={f.planMetaDiaPontosWin||""} onChange={e=>set("planMetaDiaPontosWin",e.target.value)}
                                style={{...inp,border:"1px solid #22c55e55"}}/>
                            </div>
                            <div>
                              <label style={{display:"block",color:"#06b6d4",fontSize:12,marginBottom:6,fontWeight:600}}>💱 Pontos/dia — WDO (mín 0,5)</label>
                              <input type="number" min="0.5" step="0.5" placeholder="ex: 10 pts"
                                value={f.planMetaDiaPontosWdo||""} onChange={e=>set("planMetaDiaPontosWdo",e.target.value)}
                                style={{...inp,border:"1px solid #06b6d455"}}/>
                            </div>
                          </div>
                          {(f.planMetaDiaPontosWin||f.planMetaDiaPontosWdo)&&(()=>{
                            const ptsWin = parseFloat(f.planMetaDiaPontosWin)||0;
                            const ptsWdo = roundWdo(parseFloat(f.planMetaDiaPontosWdo)||0);
                            const diasWin = metaAprov>0&&ctWin>0&&ptsWin>0 ? Math.ceil(metaAprov/(ptsWin*ctWin*VPT.WIN)) : null;
                            const diasExWdo = metaAprov>0&&ctWdo>0&&ptsWdo>0 ? calcDiasExatosWdo(metaAprov, ptsWdo, ctWdo) : null;
                            return (
                              <div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                                  {ctWin>0&&ptsWin>0&&<div style={{background:"#22c55e15",border:"1px solid #22c55e33",borderRadius:8,padding:"8px 12px"}}>
                                    <div style={{color:"#4ade80",fontSize:10,fontWeight:700}}>🟢 WIN · {ctWin}ct</div>
                                    <div style={{color:"#22c55e",fontWeight:900,fontSize:16}}>{ptsWin} pts/dia</div>
                                    <div style={{color:t.muted,fontSize:10}}>= R$ {(ptsWin*ctWin*VPT.WIN).toLocaleString("pt-BR",{minimumFractionDigits:2})}/dia</div>
                                    {diasWin&&<div style={{color:"#4ade80",fontSize:11,fontWeight:700,marginTop:2}}>📅 ~{diasWin} dias p/ aprovação</div>}
                                  </div>}
                                  {ctWdo>0&&ptsWdo>0&&<div style={{background:"#06b6d415",border:"1px solid #06b6d433",borderRadius:8,padding:"8px 12px"}}>
                                    <div style={{color:"#22d3ee",fontSize:10,fontWeight:700}}>💱 WDO · {ctWdo}ct</div>
                                    <div style={{color:"#06b6d4",fontWeight:900,fontSize:16}}>{ptsWdo.toLocaleString("pt-BR",{minimumFractionDigits:1})} pts/dia</div>
                                    <div style={{color:t.muted,fontSize:10}}>= R$ {(ptsWdo*ctWdo*VPT.WDO).toLocaleString("pt-BR",{minimumFractionDigits:2})}/dia</div>
                                    {diasExWdo&&(
                                      <div style={{color:"#06b6d4",fontSize:11,fontWeight:700,marginTop:2}}>
                                        {diasExWdo.parcial ? (
                                          <>📅 {diasExWdo.total-1}d + 1d ({diasExWdo.parcial.pts}pts) = <strong>{diasExWdo.total} dias</strong></>
                                        ) : (
                                          <>📅 {diasExWdo.total} dias exatos</>
                                        )}
                                      </div>
                                    )}
                                  </div>}
                                </div>
                                {ctWin>0&&ptsWin>0&&<Tabela cor="#22c55e" icon="🟢" ativo="WIN" ctSel={ctWin}
                                  titulo={`WIN — ${ptsWin} pts/dia${diasWin?` · ~${diasWin} dias`:""}`}
                                  calcPts={()=>ptsWin} calcReais={(ct)=>ptsWin*ct*VPT.WIN}/>}
                                {ctWdo>0&&ptsWdo>0&&<Tabela cor="#06b6d4" icon="💱" ativo="WDO" ctSel={ctWdo}
                                  titulo={`WDO — ${ptsWdo.toLocaleString("pt-BR",{minimumFractionDigits:1})} pts/dia${diasExWdo?(diasExWdo.parcial?` · ${diasExWdo.total-1}d+1d(${diasExWdo.parcial.pts}pts)`:` · ${diasExWdo.total}d exatos`):""}`}
                                  calcPts={()=>ptsWdo} calcReais={(ct)=>ptsWdo*ct*VPT.WDO}/>}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* ── META POR VALOR FINANCEIRO ── */}
                    <div>
                      <button onClick={()=>set("planUsaMetaReais",!f.planUsaMetaReais)}
                        style={{width:"100%",padding:"11px 16px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
                          border:`2px solid ${f.planUsaMetaReais?"#f59e0b":t.border}`,background:f.planUsaMetaReais?"#f59e0b18":"transparent",
                          color:f.planUsaMetaReais?"#f59e0b":t.muted,display:"flex",alignItems:"center",gap:8,transition:"all .15s"}}>
                        <span>💰</span><span>Meta por Valor (R$)</span>
                        <span style={{marginLeft:"auto",fontSize:11}}>{f.planUsaMetaReais?"✅ Ativo":"○ Inativo"}</span>
                      </button>
                      {f.planUsaMetaReais&&(
                        <div style={{marginTop:8,padding:"14px",background:"#f59e0b0a",border:"1px solid #f59e0b33",borderRadius:10}}>
                          <input type="number" min="1" step="10" placeholder="ex: 50 (R$/dia)"
                            value={f.planMetaDiaReais} onChange={e=>set("planMetaDiaReais",e.target.value)}
                            style={{...inp,border:"1px solid #f59e0b55",marginBottom:8}}/>
                          {f.planMetaDiaReais&&parseFloat(f.planMetaDiaReais)>0&&(()=>{
                            const metaDia = parseFloat(f.planMetaDiaReais);
                            // WIN: dias simples (pontos inteiros)
                            const diasWin = metaAprov>0&&ctWin>0 ? Math.ceil(metaAprov/metaDia) : null;
                            // WDO: pts arredondados → reais reais por dia → dias exatos + parcial
                            const ptsWdoSel = ctWdo>0 ? roundWdo(metaDia/ctWdo/VPT.WDO) : 0;
                            const reaisWdoDia = ptsWdoSel * ctWdo * VPT.WDO; // pode ser > metaDia por causa do arredondamento
                            const diasExWdo = metaAprov>0&&ctWdo>0&&ptsWdoSel>0 ? calcDiasExatosWdo(metaAprov, ptsWdoSel, ctWdo) : null;
                            return (
                              <div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                                  {ctWin>0&&<div style={{background:"#22c55e15",border:"1px solid #22c55e33",borderRadius:8,padding:"8px 12px"}}>
                                    <div style={{color:"#4ade80",fontSize:10,fontWeight:700}}>🟢 WIN · {ctWin}ct</div>
                                    <div style={{color:"#22c55e",fontWeight:900,fontSize:16}}>{Math.ceil(metaDia/ctWin/VPT.WIN)} pts</div>
                                    <div style={{color:t.muted,fontSize:10}}>R$ {metaDia.toLocaleString("pt-BR",{minimumFractionDigits:2})}/dia</div>
                                    {diasWin&&<div style={{color:"#4ade80",fontSize:11,fontWeight:700,marginTop:2}}>📅 {diasWin} dias</div>}
                                  </div>}
                                  {ctWdo>0&&<div style={{background:"#06b6d415",border:"1px solid #06b6d433",borderRadius:8,padding:"8px 12px"}}>
                                    <div style={{color:"#22d3ee",fontSize:10,fontWeight:700}}>💱 WDO · {ctWdo}ct</div>
                                    <div style={{color:"#06b6d4",fontWeight:900,fontSize:16}}>{ptsWdoSel.toLocaleString("pt-BR",{minimumFractionDigits:1})} pts/dia</div>
                                    <div style={{color:t.muted,fontSize:10}}>R$ {reaisWdoDia.toLocaleString("pt-BR",{minimumFractionDigits:2})}/dia real</div>
                                    {diasExWdo&&(
                                      <div style={{color:"#06b6d4",fontSize:11,fontWeight:700,marginTop:2}}>
                                        {diasExWdo.parcial ? (
                                          <>📅 {diasExWdo.total-1}d + 1d ({diasExWdo.parcial.pts}pts = R$ {diasExWdo.parcial.reais.toLocaleString("pt-BR",{minimumFractionDigits:2})}) = <strong>{diasExWdo.total} dias</strong></>
                                        ) : (
                                          <>📅 {diasExWdo.total} dias exatos</>
                                        )}
                                      </div>
                                    )}
                                  </div>}
                                </div>
                                {ctWin>0&&<Tabela cor="#22c55e" icon="🟢" ativo="WIN" ctSel={ctWin}
                                  titulo={`WIN — R$ ${metaDia.toLocaleString("pt-BR",{minimumFractionDigits:2})}/dia${diasWin?` · ${diasWin} dias`:""}`}
                                  calcPts={ct=>Math.ceil(metaDia/ct/VPT.WIN)}
                                  calcReais={(ct,pts)=>pts*ct*VPT.WIN}/>}
                                {ctWdo>0&&(()=>{
                                  const diasExCtSel = calcDiasExatosWdo(metaAprov, roundWdo(metaDia/ctWdo/VPT.WDO), ctWdo);
                                  const labelDias = diasExCtSel ? (diasExCtSel.parcial ? `${diasExCtSel.total-1}d+1d(${diasExCtSel.parcial.pts}pts)` : `${diasExCtSel.total}d`) : "";
                                  return <Tabela cor="#06b6d4" icon="💱" ativo="WDO" ctSel={ctWdo}
                                    titulo={`WDO — R$ ${metaDia.toLocaleString("pt-BR",{minimumFractionDigits:2})}/dia${labelDias?` · ${labelDias}`:""}`}
                                    calcPts={ct=>roundWdo(metaDia/ct/VPT.WDO)}
                                    calcReais={(ct,pts)=>pts*ct*VPT.WDO}/>;
                                })()}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            );
          })()}

          </>
          )}

        </Section>
      )}

      {/* 4 — Capital (perfil selecionado) */}
      {f.modoGerenciamento==="perfil"&&f.perfil&&(
        <Section icon="💰" title="Capital Disponível" t={t} accent="#60a5fa">
          <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>
            💵 Seu Capital (R$)
          </label>
          <input type="number" min="0" step="100" placeholder={`ex: ${perfil?.margemSugerida||1000}`}
            value={f.capital} onChange={e=>set("capital",e.target.value)}
            style={{...inp,border:`1px solid ${capitalInsuficiente?"#ef444455":"#60a5fa55"}`}}/>
          {capital>0&&perfil&&(
            capitalInsuficiente ? (
              <div style={{marginTop:10,background:"#ef444410",border:"1px solid #ef444433",borderRadius:10,padding:"14px 16px"}}>
                <div style={{color:"#ef4444",fontWeight:800,fontSize:14,marginBottom:4}}>⚠️ Capital insuficiente para este perfil</div>
                <div style={{color:t.muted,fontSize:12}}>Mínimo: <strong style={{color:"#f87171"}}>R$ {perfil.margemSugerida.toLocaleString()}</strong> por contrato</div>
                <div style={{color:t.muted,fontSize:12,marginTop:4}}>💡 Considere o perfil Conservador ou aumente o capital.</div>
              </div>
            ) : (
              <div style={{marginTop:10,background:"#10b98110",border:"1px solid #10b98133",borderRadius:10,padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
                  <div style={{color:"#10b981",fontWeight:800,fontSize:14}}>✅ {contratosSugeridos} contrato{contratosSugeridos!==1?"s":""} sugerido{contratosSugeridos!==1?"s":""}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[
                    ["⚠️ Risco/op", riscoPorOp!=null?`-R$ ${riscoPorOp.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—", "#f59e0b"],
                    ["🎯 Alvo/op",  f.perfil==="conservador"&&alvoConservador!=null?`+R$ ${alvoConservador.toLocaleString("pt-BR",{minimumFractionDigits:2})} (1.5:1)`:alvoP1!=null?`+R$ ${alvoP1.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—", "#22c55e"],
                    ["🛑 Stop diário", stopDiarioSug!=null?`-R$ ${stopDiarioSug.toLocaleString("pt-BR",{minimumFractionDigits:2})}`:"—", "#ef4444"],
                  ].map(([label,val,cor])=>(
                    <div key={label} style={{background:t.card,border:`1px solid ${cor}33`,borderRadius:8,padding:"10px 12px"}}>
                      <div style={{color:t.muted,fontSize:10,fontWeight:700}}>{label}</div>
                      <div style={{color:cor,fontWeight:800,fontSize:13,marginTop:3}}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{color:t.muted,fontSize:10,marginTop:8}}>
                  {contratosSugeridos} ct × {f.perfil==="conservador"?`${perfil.stopPts} pts stop × 1.5 = ${perfil.alvoPts} pts alvo`:`${perfil.stopPts} pts stop`} × R${vlrPorPt.toFixed(2)}/pt
                </div>
              </div>
            )
          )}
        </Section>
      )}

      {/* 4b — Gerenciamento próprio */}
      {f.modoGerenciamento==="proprio"&&(
        <Section icon="⚙️" title="Meu Próprio Gerenciamento" t={t} accent="#a855f7">
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>💵 Capital que estou operando (R$)</label>
            <input type="number" min="0" step="100" placeholder="ex: 5000"
              value={f.capital} onChange={e=>set("capital",e.target.value)} style={inp}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>📊 Quantidade de contratos que utilizarei</label>
            <input type="number" min="1" step="1" placeholder="ex: 2"
              value={f.contratos} onChange={e=>set("contratos",e.target.value)} style={inp}/>
            {f.capital&&f.contratos&&(
              <div style={{color:t.muted,fontSize:11,marginTop:4}}>
                Margem por contrato: R$ {(parseFloat(f.capital)/parseFloat(f.contratos)).toLocaleString("pt-BR",{minimumFractionDigits:2})}
              </div>
            )}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[
              {uk:"usaStopDiario",   vk:"stopDiario",   icon:"🛑", label:"Limite de Stop Diário",   cor:"#ef4444", ph:"ex: 200", msg:(v)=>`Se atingir -R$ ${parseFloat(v).toLocaleString("pt-BR",{minimumFractionDigits:2})} → PARE de operar`},
              {uk:"usaStopPorOp",    vk:"stopPorOp",    icon:"📍", label:"Stop por Operação",        cor:"#f59e0b", ph:"ex: 80",  msg:(v)=>`-R$ ${parseFloat(v).toLocaleString("pt-BR",{minimumFractionDigits:2})} por op`},
              {uk:"usaLimiteGanho",  vk:"limiteGanho",  icon:"🎯", label:"Limite de Ganho Diário",   cor:"#22c55e", ph:"ex: 300", msg:(v)=>`Ao atingir +R$ ${parseFloat(v).toLocaleString("pt-BR",{minimumFractionDigits:2})} → DIA ENCERRADO`},
              {uk:"usaMaxOps",       vk:"maxOps",       icon:"🔢", label:"Qtd. Operações no Dia",    cor:"#60a5fa", ph:"ex: 3",   msg:(v)=>`Máximo de ${v} operação${v!=="1"?"s":""} por dia`},
            ].map(({uk,vk,icon,label,cor,ph,msg})=>(
              <div key={uk}>
                <button onClick={()=>set(uk,!f[uk])}
                  style={{width:"100%",padding:"11px 16px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,
                    border:`2px solid ${f[uk]?cor:t.border}`,background:f[uk]?cor+"18":"transparent",
                    color:f[uk]?cor:t.muted,display:"flex",alignItems:"center",gap:8,transition:"all .15s"}}>
                  <span>{icon}</span><span>{label}</span>
                  <span style={{marginLeft:"auto",fontSize:11}}>{f[uk]?"✅ Ativo":"○ Inativo"}</span>
                </button>
                {f[uk]&&(
                  <div style={{marginTop:8,padding:"12px 16px",background:cor+"10",border:`1px solid ${cor}33`,borderRadius:10}}>
                    <label style={{display:"block",color:cor,fontSize:12,marginBottom:6,fontWeight:600}}>Valor</label>
                    <input type="number" min="0" step="10" placeholder={ph}
                      value={f[vk]} onChange={e=>set(vk,e.target.value)}
                      style={{...inp,border:`1px solid ${cor}55`}}/>
                    {f[vk]&&<div style={{color:cor,fontSize:11,marginTop:4,fontWeight:700}}>{msg(f[vk])}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 5 — Horários */}
      {(f.tipoCapital==="mesa"||(f.modoGerenciamento==="proprio")||(f.modoGerenciamento==="perfil"&&f.perfil&&!capitalInsuficiente))&&(
        <Section icon="⏰" title="Horários Permitidos" t={t}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:140}}>
              <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🟢 Início</label>
              <input type="time" value={f.horarioInicio} onChange={e=>set("horarioInicio",e.target.value)} style={inp}/>
            </div>
            <div style={{flex:1,minWidth:140}}>
              <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🔴 Fim</label>
              <input type="time" value={f.horarioFim} onChange={e=>set("horarioFim",e.target.value)} style={inp}/>
            </div>
          </div>
          {f.horarioInicio&&f.horarioFim&&(
            <div style={{marginTop:8,color:t.muted,fontSize:12}}>⏱️ Janela: {f.horarioInicio} → {f.horarioFim}</div>
          )}
        </Section>
      )}

      {/* 6 — Regras pessoais */}
      {(f.tipoCapital==="mesa"||(f.modoGerenciamento==="proprio")||(f.modoGerenciamento==="perfil"&&f.perfil&&!capitalInsuficiente))&&(
        <Section icon="📝" title="Regras Pessoais Adicionais" t={t}>
          <textarea rows={4} placeholder={"Adicione suas regras pessoais...\nEx:\n- Não operar na primeira meia hora\n- Parar após 2 stops consecutivos"}
            value={f.regras} onChange={e=>set("regras",e.target.value)}
            style={{...inp,resize:"vertical",fontFamily:"inherit",lineHeight:1.6}}/>
        </Section>
      )}

      {/* Botões */}
      <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:16}}>
        <button onClick={onClose} style={{padding:"11px 22px",borderRadius:8,border:`1px solid ${t.border}`,background:"transparent",color:t.muted,fontSize:14,cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>valid&&onSave(f)}
          style={{padding:"11px 26px",borderRadius:8,border:"none",
            background:valid?"linear-gradient(135deg,#10b981,#059669)":t.border,
            color:valid?"#fff":t.muted,fontSize:14,fontWeight:700,
            cursor:valid?"pointer":"not-allowed",
            boxShadow:valid?"0 4px 15px rgba(16,185,129,0.4)":"none"}}>
          {submitLabel || "💾 Salvar Gerenciamento"}
        </button>
      </div>
    </div>
  );
}

function GestaoRiscoTab({ gerenciamentos, onSave, onDelete, onToggleAtivo, t }) {
  const [editando, setEditando] = React.useState(null);
  const [colapsados, setColapsados] = React.useState({});
  const toggleColapso = (id) => setColapsados(prev => ({ ...prev, [id]: !prev[id] }));

  const ativos = gerenciamentos.filter(g => g.ativo !== false);
  const inativos = gerenciamentos.filter(g => g.ativo === false);

  const formatMoney = (value, sign = "") => {
    const number = parseFloat(value || 0);
    return `${sign}R$ ${number.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const parseRegras = (rawValue) => {
    if (!rawValue) return { extra: {}, texto: "" };
    const raw = String(rawValue);
    if (!raw.trim().startsWith("{")) return { extra: {}, texto: raw };
    try {
      const sep = raw.indexOf("\n---\n");
      const jsonPart = sep >= 0 ? raw.slice(0, sep) : raw;
      const texto = sep >= 0 ? raw.slice(sep + 5).trim() : "";
      return { extra: JSON.parse(jsonPart) || {}, texto };
    } catch {
      return { extra: {}, texto: raw };
    }
  };

  const renderMiniCard = (label, value, color, minWidth = 150) => {
    if (value === null || value === undefined || value === "") return null;
    return (
      <div key={`${label}-${String(value)}`} style={{ background: t.bg, border: `1px solid ${color}33`, borderRadius: 10, padding: "10px 12px", minWidth }}>
        <div style={{ color: t.muted, fontSize: 10, fontWeight: 700, marginBottom: 3 }}>{label}</div>
        <div style={{ color, fontWeight: 800, fontSize: 13 }}>{value}</div>
      </div>
    );
  };

  const renderMesaDetalhes = (g) => {
    const { extra, texto } = parseRegras(g.regras);
    const isMesaInternacional = (extra.mesaRegiao || "brasileira") === "internacional";
    const ativosAmericana = Array.isArray(extra.mesaAmericanaAtivosLista)
      ? extra.mesaAmericanaAtivosLista.join(", ")
      : (extra.mesaAmericanaAtivos || "");
    const metaAmericana = extra.mesaAmericanaMetaValor
      ? `US$ ${extra.mesaAmericanaMetaValor}`
      : null;
    const cicloPlataforma = g.mesa_dias_contrato === "outro" ? extra.mesaDiasCustom : g.mesa_dias_contrato;
    const custoPlataforma = parseFloat(extra.mesaCustoValor || 0);
    const custoPorDia = cicloPlataforma && custoPlataforma ? custoPlataforma / parseFloat(cicloPlataforma) : 0;
    const metaAprovacao = parseFloat(g.mesa_meta_aprovacao || 0);
    const metaPercentual = parseFloat(extra.planMetaDiaPct || 0);
    const metaPercentualDia = metaAprovacao && metaPercentual ? metaAprovacao * metaPercentual / 100 : 0;
    const diasMetaPercentual = metaPercentualDia > 0 ? Math.ceil(metaAprovacao / metaPercentualDia) : 0;
    const contratosPlanejados = extra.planMesmoNumCt
      ? `${extra.planQtdContratos || 0} ct em WIN e WDO`
      : [
          extra.planQtdContratosWin ? `${extra.planQtdContratosWin} ct WIN` : null,
          extra.planQtdContratosWdo ? `${extra.planQtdContratosWdo} ct WDO` : null,
        ].filter(Boolean).join(" · ");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!isMesaInternacional && (
          <div style={{ background: "#a855f70c", border: "1px solid #a855f733", borderRadius: 14, padding: 12 }}>
            <div style={{ color: "#c084fc", fontWeight: 800, fontSize: 12, marginBottom: 10, letterSpacing: 0.5 }}>REGRAS DA MESA</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
              {[
                renderMiniCard("Máximo WIN", g.mesa_contratos_max_win ? `${g.mesa_contratos_max_win} ct` : null, "#22c55e"),
                renderMiniCard("Máximo WDO", g.mesa_contratos_max_wdo ? `${g.mesa_contratos_max_wdo} ct` : null, "#06b6d4"),
                renderMiniCard("Perda diária", g.usa_mesa_perda_diaria ? `-${formatMoney(g.mesa_perda_diaria).replace("R$ ", "R$ ")}` : null, "#ef4444"),
                renderMiniCard("Perda máxima", g.usa_mesa_perda_maxima ? `-${formatMoney(g.mesa_perda_maxima).replace("R$ ", "R$ ")}` : null, "#ef4444"),
                renderMiniCard("Meta de aprovação", g.usa_mesa_meta_aprovacao ? `+${formatMoney(g.mesa_meta_aprovacao).replace("R$ ", "R$ ")}` : null, "#22c55e"),
                renderMiniCard("Repasse", extra.mesaRepasse ? `${extra.mesaRepasse}% para você` : null, "#a855f7"),
                renderMiniCard("Ciclo da plataforma", cicloPlataforma ? `${cicloPlataforma} dias` : null, "#94a3b8"),
              ].filter(Boolean)}
            </div>
          </div>
        )}

        <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 12 }}>
          <div style={{ color: t.text, fontWeight: 800, fontSize: 12, marginBottom: 10, letterSpacing: 0.5 }}>DETALHES DA MESA</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
            {[
              renderMiniCard("Tipo de mesa", (extra.mesaRegiao||"brasileira") === "internacional" ? "🌎 Internacional" : "🇧🇷 Brasileira", "#a855f7"),
              renderMiniCard("Mesa Internacional", extra.mesaRegiao === "internacional" ? (g.mesa_nome || extra.mesaAmericanaOutra || null) : null, "#a855f7"),
              renderMiniCard("Modelo", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaStep || "1 Step") : null, "#a855f7"),
              renderMiniCard("Fase", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaFase === "funded" ? "💼 Funded" : "🎯 Avaliação") : null, "#a855f7"),
              renderMiniCard("Programa", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaPrograma || null) : null, "#a855f7"),
              renderMiniCard("Conta", extra.mesaRegiao === "internacional" ? ((extra.mesaAmericanaTamanhoConta === "outra" ? extra.mesaAmericanaTamanhoContaOutra : extra.mesaAmericanaTamanhoConta) || null) : null, "#22c55e"),
              renderMiniCard("Meta de Lucro", extra.mesaRegiao === "internacional" ? metaAmericana : null, "#22c55e"),
              renderMiniCard("Meta de Lucro Step 2", extra.mesaRegiao === "internacional" && (extra.mesaAmericanaStep === "2 Step") ? (extra.mesaAmericanaMetaLucroStep2 ? `US$ ${extra.mesaAmericanaMetaLucroStep2}` : null) : null, "#22c55e"),
              renderMiniCard("Drawdown", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaDrawdownTipo || null) : null, "#ef4444"),
              renderMiniCard("Buffer Required", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaBufferRequired ? `US$ ${extra.mesaAmericanaBufferRequired}` : null) : null, "#f59e0b"),
              renderMiniCard("Nº contratos", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaNumeroContratos || null) : null, "#22c55e"),
              renderMiniCard("Mín. dias", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaMinDias || null) : null, "#60a5fa"),
              renderMiniCard("Prazo", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaPrazoDias || null) : null, "#60a5fa"),
              renderMiniCard("Consistência", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaConsistenciaRegra || (extra.mesaAmericanaConsistenciaPct ? `${extra.mesaAmericanaConsistenciaPct}%` : null)) : null, "#a855f7"),
              renderMiniCard("Overnight", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaOvernight || null) : null, "#f59e0b"),
              renderMiniCard("Plataforma", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaPlataforma || null) : null, "#60a5fa"),
              renderMiniCard("Ativos permitidos", extra.mesaRegiao === "internacional" ? (ativosAmericana || null) : null, "#94a3b8", 220),
              renderMiniCard("Max Trailing Drawdown", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaMaxTrailingDrawdown ? `US$ ${extra.mesaAmericanaMaxTrailingDrawdown}` : null) : null, "#ef4444"),
              renderMiniCard("Máx. Stop Diário", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaMaxStopDiario ? `US$ ${extra.mesaAmericanaMaxStopDiario}` : null) : null, "#ef4444"),
              renderMiniCard("Taxa de ativação", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaTaxaAtivacao ? `US$ ${extra.mesaAmericanaTaxaAtivacao}` : null) : null, "#f59e0b"),
              renderMiniCard("Reset", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaReset === "sim" ? `Sim${extra.mesaAmericanaResetValor ? ` · US$ ${extra.mesaAmericanaResetValor}` : ""}` : "Não") : null, "#f59e0b"),
              renderMiniCard("Pagamento", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaPagamentoPct || null) : null, "#22c55e"),
              renderMiniCard("Frequência saque", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaFrequenciaSaque || null) : null, "#a855f7"),
              renderMiniCard("Observação", extra.mesaRegiao === "internacional" ? (extra.mesaAmericanaObservacao || null) : null, "#94a3b8", 260),
              renderMiniCard("Nome da mesa", g.mesa_nome, "#a855f7"),
              renderMiniCard("Contratos máximos WIN", extra.mesaRegiao === "internacional" ? null : (g.mesa_contratos_max_win ? `${g.mesa_contratos_max_win} ct` : null), "#22c55e"),
              renderMiniCard("Contratos máximos WDO", extra.mesaRegiao === "internacional" ? null : (g.mesa_contratos_max_wdo ? `${g.mesa_contratos_max_wdo} ct` : null), "#06b6d4"),
              renderMiniCard("Limite de perda diária", g.usa_mesa_perda_diaria ? formatMoney(g.mesa_perda_diaria) : null, "#ef4444"),
              renderMiniCard("Limite de perda máxima", g.usa_mesa_perda_maxima ? formatMoney(g.mesa_perda_maxima) : null, "#ef4444"),
              renderMiniCard("Meta para aprovação", g.usa_mesa_meta_aprovacao ? formatMoney(g.mesa_meta_aprovacao) : null, "#22c55e"),
              renderMiniCard("Repasse da mesa", extra.mesaRepasse ? `${extra.mesaRepasse}% para você` : null, "#a855f7"),
              renderMiniCard("Plataforma", extra.mesaCustoPlataforma || null, "#94a3b8"),
              renderMiniCard("Custo da plataforma", custoPlataforma ? formatMoney(custoPlataforma) : null, "#94a3b8"),
              renderMiniCard("Cobrança da plataforma", cicloPlataforma ? `${cicloPlataforma} dias` : null, "#94a3b8"),
              renderMiniCard("Custo por dia", custoPorDia ? formatMoney(custoPorDia) : null, "#94a3b8"),
            ].filter(Boolean)}
          </div>
        </div>

        {(contratosPlanejados || extra.planStopMaxDia || extra.planUsaMetaPct || extra.planUsaMetaPontos || extra.planUsaMetaReais) && (
          <div style={{ background: "#a855f70c", border: "1px solid #a855f733", borderRadius: 14, padding: 12 }}>
            <div style={{ color: "#c084fc", fontWeight: 800, fontSize: 12, marginBottom: 10, letterSpacing: 0.5 }}>⚙️ MEU PLANEJAMENTO</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              {renderMiniCard("Contratos planejados", contratosPlanejados, "#a855f7")}
              {renderMiniCard("Stop máximo por dia", extra.planStopMaxDia ? `-${formatMoney(extra.planStopMaxDia).replace("R$ ", "R$ ")}` : null, "#f59e0b")}
              {renderMiniCard("Meta % ao dia", extra.planUsaMetaPct && extra.planMetaDiaPct ? `${extra.planMetaDiaPct}%` : null, "#a855f7")}
              {renderMiniCard(
                "Meta por pontos",
                extra.planUsaMetaPontos
                  ? [
                      extra.planMetaDiaPontosWin ? `WIN ${extra.planMetaDiaPontosWin} pts` : null,
                      extra.planMetaDiaPontosWdo ? `WDO ${extra.planMetaDiaPontosWdo} pts` : null,
                    ].filter(Boolean).join(" · ")
                  : null,
                "#22c55e"
              )}
              {renderMiniCard("Meta por valor", extra.planUsaMetaReais && extra.planMetaDiaReais ? formatMoney(extra.planMetaDiaReais) : null, "#f59e0b")}
            </div>

            {extra.planUsaMetaPct && metaPercentualDia > 0 && (
              <div style={{ background: "#a855f712", border: "1px solid #a855f733", borderRadius: 10, padding: "12px 14px", color: "#c084fc", fontWeight: 800, fontSize: 14 }}>
                {metaPercentual}% de {formatMoney(metaAprovacao)} = {formatMoney(metaPercentualDia)}/dia → {diasMetaPercentual} dias para aprovação
              </div>
            )}

            <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 12, marginTop: 10 }}>
              <div style={{ color: t.text, fontWeight: 800, fontSize: 12, marginBottom: 10, letterSpacing: 0.5 }}>DETALHES DO PLANEJAMENTO</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                {[
                  renderMiniCard(
                    "Mesmo número de contratos",
                    extra.planMesmoNumCt
                      ? `Sim · ${extra.planQtdContratos || 0} ct para WIN e WDO`
                      : contratosPlanejados || null,
                    "#a855f7",
                    220
                  ),
                  renderMiniCard("Stop máximo arriscado por dia", extra.planStopMaxDia ? formatMoney(extra.planStopMaxDia) : null, "#f59e0b", 220),
                  renderMiniCard("Meta percentual ao dia", extra.planUsaMetaPct && extra.planMetaDiaPct ? `${extra.planMetaDiaPct}%` : null, "#a855f7", 220),
                  renderMiniCard(
                    "Meta por pontos",
                    extra.planUsaMetaPontos
                      ? [
                          extra.planMetaDiaPontosWin ? `WIN ${extra.planMetaDiaPontosWin} pts` : null,
                          extra.planMetaDiaPontosWdo ? `WDO ${extra.planMetaDiaPontosWdo} pts` : null,
                        ].filter(Boolean).join(" · ")
                      : null,
                    "#22c55e",
                    220
                  ),
                  renderMiniCard("Meta por valor ao dia", extra.planUsaMetaReais && extra.planMetaDiaReais ? formatMoney(extra.planMetaDiaReais) : null, "#f59e0b", 220),
                ].filter(Boolean)}
              </div>
            </div>
          </div>
        )}

        {texto && (
          <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 16px" }}>
            <div style={{ color: t.text, fontWeight: 800, fontSize: 12, marginBottom: 8, letterSpacing: 0.5 }}>REGRAS PESSOAIS</div>
            <pre style={{ color: t.text, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>{texto}</pre>
          </div>
        )}
      </div>
    );
  };

  const renderDefaultDetalhes = (g, pf) => {
    const { texto } = parseRegras(g.regras);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
          {[
            g.capital ? renderMiniCard("Capital", formatMoney(g.capital), "#60a5fa") : null,
            g.contratos ? renderMiniCard("Contratos", `${g.contratos} ct`, pf ? pf.color : "#60a5fa") : null,
            g.horario_inicio && g.horario_fim ? renderMiniCard("Horário", `${g.horario_inicio} → ${g.horario_fim}`, "#06b6d4") : null,
          ].filter(Boolean)}
        </div>

        {pf && (
          <div style={{ background: pf.bg, border: `1px solid ${pf.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ color: pf.color, fontWeight: 800, fontSize: 12, marginBottom: 8 }}>REGRAS DO PERFIL</div>
            {pf.regras.map((regra, index) => (
              <div key={index} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ color: pf.color, fontWeight: 700, fontSize: 11, minWidth: 18 }}>{index + 1}.</span>
                <span style={{ color: t.text, fontSize: 12, lineHeight: 1.5 }}>{regra}</span>
              </div>
            ))}
          </div>
        )}

        {texto && (
          <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 16px" }}>
            <div style={{ color: t.text, fontWeight: 800, fontSize: 12, marginBottom: 8 }}>REGRAS PESSOAIS</div>
            <pre style={{ color: t.text, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>{texto}</pre>
          </div>
        )}
      </div>
    );
  };

  const renderCard = (g) => {
    const colapsado = !!colapsados[g.id];
    const pf = g.perfil ? PERFIS_RISCO[g.perfil] : null;
    const cor = pf ? pf.color : (g.tipo_capital === "mesa" ? "#a855f7" : "#60a5fa");
    const isAtivo = g.ativo !== false;

    return (
      <div
        key={g.id}
        style={{
          background: t.card,
          border: `2px solid ${isAtivo ? cor + "66" : t.border}`,
          borderRadius: 16,
          padding: "20px 22px",
          marginBottom: 16,
          opacity: isAtivo ? 1 : 0.55,
          position: "relative"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: colapsado ? 0 : 14 }}>
          <div style={{ cursor: "pointer", flex: 1 }} onClick={() => toggleColapso(g.id)}>
            {isAtivo && <div style={{ color: "#10b981", fontWeight: 800, fontSize: 11, marginBottom: 4, letterSpacing: 1 }}>✅ PLANO ATIVO</div>}
            {!isAtivo && <div style={{ color: t.muted, fontWeight: 700, fontSize: 11, marginBottom: 4, letterSpacing: 1 }}>⏸️ DESATIVADO</div>}

            <div style={{ color: t.text, fontWeight: 800, fontSize: 17 }}>{g.nome || g.mesa_nome || "Sem nome"}</div>

            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
              {pf && <span style={{ background: pf.bg, border: `1px solid ${pf.border}`, color: pf.color, padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{pf.label}</span>}
              {g.tipo_capital && <span style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.muted, padding: "3px 12px", borderRadius: 999, fontSize: 11 }}>{g.tipo_capital === "mesa" ? "🏢 Mesa Proprietária" : "💰 Capital Próprio"}</span>}
              <span style={{ color: t.muted, fontSize: 11 }}>📅 {g.data_criacao || g.created_at?.slice(0, 10)}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => toggleColapso(g.id)}
              title={colapsado ? "Expandir" : "Minimizar"}
              style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, color: t.muted, padding: "7px 12px", cursor: "pointer", fontSize: 13, fontWeight: 700, lineHeight: 1 }}
            >
              {colapsado ? "▼" : "▲"}
            </button>

            <button
              onClick={() => setEditando(g)}
              style={{ background: "transparent", border: "1px solid #60a5fa55", borderRadius: 8, color: "#60a5fa", padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              ✏️ Editar
            </button>

            <button
              onClick={() => onToggleAtivo && onToggleAtivo(g.id, !isAtivo)}
              style={{ background: "transparent", border: `1px solid ${isAtivo ? "#f59e0b55" : "#22c55e55"}`, borderRadius: 8, color: isAtivo ? "#f59e0b" : "#22c55e", padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              {isAtivo ? "⏸️ Desativar" : "▶️ Ativar"}
            </button>

            <button
              onClick={() => onDelete(g.id)}
              style={{ background: "transparent", border: "1px solid #ef444455", borderRadius: 8, color: "#f87171", padding: "7px 12px", cursor: "pointer", fontSize: 12 }}
            >
              🗑️ Excluir
            </button>
          </div>
        </div>

        {!colapsado && (g.tipo_capital === "mesa" ? renderMesaDetalhes(g) : renderDefaultDetalhes(g, pf))}
      </div>
    );
  };

  const toFormState = (g) => {
    const { extra, texto } = parseRegras(g.regras);
    const ativosLista = Array.isArray(extra.mesaAmericanaAtivosLista)
      ? extra.mesaAmericanaAtivosLista
      : String(extra.mesaAmericanaAtivos || "").split(",").map(s => s.trim()).filter(Boolean);

    return {
      ...EMPTY_GERENCIAMENTO,
      dataCriacao: g.data_criacao || (g.created_at ? String(g.created_at).slice(0, 10) : hojeStr()),
      nome: g.nome || "",
      tipoCapital: g.tipo_capital || "",
      perfil: g.perfil || "",
      modoGerenciamento: g.modo_gerenciamento || "",
      capital: g.capital || "",
      contratos: g.contratos || "",
      horarioInicio: g.horario_inicio || "",
      horarioFim: g.horario_fim || "",
      mesaNome: g.mesa_nome || "",
      mesaContratosMaxWin: g.mesa_contratos_max_win || "",
      mesaContratosMaxWdo: g.mesa_contratos_max_wdo || "",
      usaMesaPerdaDiaria: !!g.usa_mesa_perda_diaria,
      mesaPerdaDiaria: g.mesa_perda_diaria || "",
      usaMesaPerdaMaxima: !!g.usa_mesa_perda_maxima,
      mesaPerdaMaxima: g.mesa_perda_maxima || "",
      usaMesaMetaAprovacao: !!g.usa_mesa_meta_aprovacao,
      mesaMetaAprovacao: g.mesa_meta_aprovacao || "",
      mesaDiasContrato: g.mesa_dias_contrato || "",
      regras: texto || "",
      ...extra,
      mesaAmericanaAtivosLista: ativosLista,
      mesaAmericanaAtivos: extra.mesaAmericanaAtivos || ativosLista.join(", "),
      mesaAmericanaAtivoInput: "",
    };
  };

  return (
    <>
    <div>
      {ativos.length === 0 && (
        <div style={{ background: t.card, border: `2px dashed ${t.border}`, borderRadius: 16, padding: "40px 20px", textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <div style={{ color: t.text, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Nenhum gerenciamento ativo</div>
          <div style={{ color: t.muted, fontSize: 13 }}>Clique em "🛡️ Criar Gerenciamento" no topo para definir seu plano de risco</div>
        </div>
      )}

      {ativos.map(g => renderCard(g))}

      {inativos.length > 0 && (
        <div>
          <div style={{ color: t.muted, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", margin: "20px 0 12px" }}>📂 Gerenciamentos Desativados</div>
          {inativos.map(g => renderCard(g))}
        </div>
      )}
    </div>
    {editando && (
      <Modal title="✏️ Editar Gerenciamento de Risco" onClose={() => setEditando(null)} t={t}>
        <GerenciamentoForm
          initial={toFormState(editando)}
          submitLabel="💾 Atualizar Gerenciamento"
          onSave={(form) => onSave(form, editando)}
          onClose={() => setEditando(null)}
          t={t}
        />
      </Modal>
    )}
    </>
  );
}


function RelatorioModal({ops,t,onClose,userId,userEmail}) {
  const [loading,setLoading]=useState(false);
  const [relatorio,setRelatorio]=useState(null);
  const [erro,setErro]=useState(null);
  const [offset,setOffset]=useState(0);
  const [creditosExtra,setCreditosExtra]=useState(0);
  const semana=useMemo(()=>{const b=new Date();b.setDate(b.getDate()+offset*7);return getWeekRange(b);},[offset]);
  const opsSemana=useMemo(()=>ops.filter(o=>o.data>=semana.start&&o.data<=semana.end),[ops,semana]);
  const totalSemana=opsSemana.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const totalSemanaUSD=opsSemana.reduce((s,o)=>s+(parseFloat(o.resultadoDolar)||0),0);
  const wins=opsSemana.filter(o=>(parseFloat(o.resultadoReais)||0)>0).length;

  // Busca créditos extras do Supabase
  useEffect(()=>{
    if(!userEmail) return;
    supabase.from("planos").select("creditos_relatorio_extra").eq("email",userEmail).maybeSingle()
      .then(({data})=>{ if(data) setCreditosExtra(data.creditos_relatorio_extra||0); });
  },[userEmail]);

  const LIMITE_SEMANA = 2;
  const getWeekKey = () => {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return `relatorio_${userId}_${now.getFullYear()}_W${week}`;
  };
  const geracoesUsadas = () => { try { return parseInt(localStorage.getItem(getWeekKey()) || "0"); } catch(_) { return 0; } };
  const registrarGeracao = () => { try { localStorage.setItem(getWeekKey(), String(geracoesUsadas() + 1)); } catch(_) {} };
  const usadas = geracoesUsadas();
  const restantes = Math.max(0, LIMITE_SEMANA + creditosExtra - usadas);

  const gerar = async () => {
    if (opsSemana.length === 0) return;
    if (restantes <= 0) { setErro("⚠️ Você já usou suas 2 gerações de relatório desta semana. Novo limite disponível na próxima semana."); return; }
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
    const prompt = `Você é um trader analista certificado, mentor profissional com ampla experiência no mercado de Mini Índice (WIN) e Mini Dólar (WDO) da B3, e nos mercados internacionais. Você conhece profundamente a metodologia operacional utilizada por este trader e vai agir como mentor comprometido em ajudar este trader a evoluir de trader sem resultado para trader consistente e profissional.

## METODOLOGIA BASE

CONCEITO CENTRAL: O mercado é uma máquina de indução ao erro. Toda operação válida exige um EVENTO na LOCALIZAÇÃO correta.

TENDÊNCIA: Alta = topos e fundos ascendentes | Baixa = topos e fundos descendentes | Lateral = indefinida. Nunca operar contra o TGM (Tempo Gráfico Maior) sem critério técnico claro.

MÉDIAS OPERACIONAIS:
- MME9: GPS rápido, aciona gatilhos e conduz o trade
- MMA21: tendência de curto prazo, melhores entradas em regressão a ela
- MMA50: tendência macro, paraquedas da tendência
- MMA200: suporte/resistência dinâmico macro
FATOR PROXIMIDADE: Médias próximas dos preços = maior assertividade. Médias afastadas = aguardar regressão antes de entrar. Entrar em movimento esticado é erro grave de iniciante.

FIBONACCI: Azul (movimento macro) e Vermelha (movimento micro/fractal). No 61,8% da Fibo Vermelha decide-se: candles de convicção = continuação | candles de rejeição = reversão. Correção até 38,2% = tendência forte | até 50% = moderada | até 61,8% = dificuldade.

PULLBACKS: Raso (teste MME9, poucos candles) | Profundo (MMA21 obrigatória, máx 61,8% Fibo) | Plano (lateral estreita, mercado forte) | Complexo (congestão, aguardar confirmação, pode testar MMA50).

SETUPS: 9.1 (virada da MME9), 9.2 (deslocamento de gatilho com MME9 ascendente), Ponto Contínuo/PC (recuo à MMA21 ascendente), Agulhada (alinhamento MMA3 > MME9 > MMA21 no diário | MME9 > MMA21 > MMA50 no intraday).

CANDLES GATILHO: Retomada (suporte, sombras inferiores) | Rejeição (resistência, sombras superiores) | Convicção (Twin Towers, Engolfo de Alta, Barra Elefante/Ignição). Sinal de Clímax = cansaço em extremidades, quanto mais afastado da MMA21 mais relevante.

ESTRUTURAS: Bear Trap e Bull Trap (caçadores de liquidez), falha de estrutura contra o macro = entrada de alta confiabilidade. FIBO GAP = retração sobre última barra do pregão anterior.

TEMPOS GRÁFICOS (5 obrigatórios): MENSAL > SEMANAL > DIÁRIO > 60min > 15min. Gráficos de 5min e 2min apenas para posicionamento fino, NÃO para decisão. Sempre analisar do "alto da floresta" antes de entrar no micro.

MINI ÍNDICE — 3 ESTÁGIOS DO VIÉS DO DIA:
1. Humor do mercado internacional (S&P500 futuro)
2. Abertura do mercado à vista às 10:00 (direção das blue chips e BR20)
3. Abertura do mercado americano às 10:30

MINI DÓLAR: Mais técnico que o índice. Correlação positiva com DI1FUT e DXY. Barras de força têm relevância especial — evitar operar contra elas.

GERENCIAMENTO:
- Semana de Ouro: 1ª semana do mês = acumular caixa. Só operar trade perfeito graficamente, a favor do TGM, próximo de suporte/resistência
- Stop técnico: posicionar além de números redondos, em topos/fundos ou confluência de médias. Não alterar após posicionado
- Risco 1x1: ao atingir primeiro alvo com 50% da posição, zerar o risco da parte restante. Conduzir o restante sem medo
- Stop diário: dividir por 2 ou 3 operações. Nunca queimar o stop diário em uma única operação
- Gestão por volatilidade: ajustar número de contratos conforme tamanho do stop para manter risco financeiro constante
- Toda operação precisa de pelo menos 3 motivos técnicos olhando os 5 tempos gráficos

PSICOLOGIA E MINDSET:
- FQ (Ficar Quieto): observar mais, operar menos. Às vezes não operar é a melhor decisão
- Sem overtrading: qualidade acima de quantidade. Trader consistente não opera com alta frequência
- Aceitar perdas como custo do negócio, não como fracasso
- Não existe "dia de fúria" para trader profissional — isso é falta de técnica + gestão + mindset
- Meta é de PERDA (controlável), não de ganho (imprevisível)
- Tratar o trading como empresário, não como funcionário esperando salário

---

## DADOS DA SEMANA ${semana.start} a ${semana.end}

- Total de operações: ${opsSemana.length}
- Resultado R$: ${totalSemana.toFixed(2)}${totalSemanaUSD !== 0 ? `\n- Resultado USD: ${totalSemanaUSD.toFixed(2)}` : ""}
- Taxa de acerto: ${pct}% (${wins} ganhos / ${opsSemana.length - wins} perdas)

## OPERAÇÕES DETALHADAS:
${JSON.stringify(resumo, null, 2)}

---

## SUA ANÁLISE COMO MENTOR

Analise a semana completa com base nos dados acima e no metodologia operacional. Seja direto, cite números e operações reais. Fale como um mentor experiente que quer ver este trader evoluir de verdade. Use linguagem clara, sem enrolação.

Responda OBRIGATORIAMENTE nestas seções, nesta ordem:

## 📊 1. VISÃO GERAL DA SEMANA
Panorama objetivo da semana: resultado, contexto, ritmo operacional.

## 🎯 2. DESEMPENHO
Como foi o desempenho? Taxa de acerto, resultado financeiro, gestão de risco. Compare com o que o método espera de um trader em evolução.

## 🔧 3. ESTRATÉGIAS UTILIZADAS
Analise os tipos de entrada, direções operadas, ativos. As estratégias estão alinhadas com os setups do metodologia operacional? O trader operou com ou contra o TGM? Usou fator proximidade?

## 📈 4. O QUE PODE MELHORAR
Pontos concretos de melhoria com base nas operações registradas e nos princípios do método. Seja específico.

## ✅ 5. PONTOS POSITIVOS
O que o trader fez certo essa semana. Reconheça os acertos com base no método — isso reforça o comportamento correto.

## ❌ 6. O QUE FEZ PERDER OU DEIXAR DE GANHAR
Identifique as operações ou comportamentos que geraram perda ou oportunidade desperdiçada. Cite dados reais.

## 🛠️ 7. COMO CORRIGIR OS ERROS
Para cada ponto levantado na seção anterior, dê uma ação corretiva concreta baseada no metodologia operacional.

## 🔍 8. PADRÕES DE ERRO
Existe algum erro que se repete? Identifique padrões comportamentais ou técnicos recorrentes — esses são os que mais prejudicam a consistência.

## 🧠 9. ANÁLISE EMOCIONAL
Avalie o estado emocional com base nos dados: houve overtrading? Revenge trade? Não seguiu o operacional ou gerenciamento? Em qual das 5 fases do trader este profissional parece estar?

## 💬 10. REFLEXÕES DO MENTOR
Reflexões livres e honestas. O que este trader precisa ouvir agora para dar o próximo passo rumo à consistência? Inclua 3 focos concretos para a próxima semana.`;
    try {
      const res = await fetch(
        "https://qqgoojzlhczfexqlgvpe.supabase.co/functions/v1/claude-relatorio",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxZ29vanpsaGN6ZmV4cWxndnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODM0ODQsImV4cCI6MjA4ODI1OTQ4NH0.C_rElTl676HaMHzkrJMPAkcm58edODGSJzvpu4xaDa0",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxZ29vanpsaGN6ZmV4cWxndnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODM0ODQsImV4cCI6MjA4ODI1OTQ4NH0.C_rElTl676HaMHzkrJMPAkcm58edODGSJzvpu4xaDa0",
          },
          body: JSON.stringify({ prompt }),
        }
      );
      const data = await res.json();
      if (data.relatorio?.startsWith("Erro:")) throw new Error(data.relatorio);
      registrarGeracao();
      // Se usou crédito extra, decrementa no Supabase
      if (usadas >= LIMITE_SEMANA && creditosExtra > 0 && userEmail) {
        const novoExtra = creditosExtra - 1;
        await supabase.from("planos").update({ creditos_relatorio_extra: novoExtra }).eq("email", userEmail);
        setCreditosExtra(novoExtra);
      }
      setRelatorio(data.relatorio);
    } catch (err) {
      setErro("❌ " + (err?.message || "Erro desconhecido."));
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
    <Modal title="Relatório de Operações" onClose={onClose} t={t}>
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
          <div style={{marginBottom:8,textAlign:"right"}}>
            <span style={{fontSize:11,color:restantes>0?"#a78bfa":"#f87171",fontWeight:700}}>
              {restantes>0?`${restantes} geração${restantes===1?"":"ões"} restante${restantes===1?"":"s"} esta semana`:"Limite semanal atingido"}
            </span>
          </div>
          <button onClick={gerar} disabled={loading||restantes<=0} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:loading||restantes<=0?"#1e3a5f":"linear-gradient(135deg,#7c3aed,#4f46e5)",color:restantes<=0?"#64748b":"#fff",fontSize:15,fontWeight:700,cursor:loading||restantes<=0?"not-allowed":"pointer",boxShadow:loading||restantes<=0?"none":"0 4px 20px rgba(124,58,237,0.4)",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {loading?"Gerando análise...":restantes<=0?"Limite semanal atingido":"Gerar Relatório"}
          </button>
          {erro&&(
            <div style={{background:"#ef444415",border:"1px solid #ef444455",borderRadius:10,padding:"14px 16px",marginBottom:16}}>
              <div style={{color:"#f87171",fontWeight:700,fontSize:13,marginBottom:6}}>❌ Erro ao gerar relatório</div>
              <div style={{color:"#fca5a5",fontSize:12,lineHeight:1.6}}>{erro}</div>
              <div style={{color:t.muted,fontSize:11,marginTop:8}}>Verifique: 1) Edge Function "claude-relatorio" deployada? 2) Secret GROQ_API_KEY configurado no Supabase?</div>
            </div>
          )}
          {relatorio&&<div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:12,padding:"20px",maxHeight:500,overflowY:"auto"}}>{renderMd(relatorio)}</div>}
        </>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 8px #5b8af544}50%{box-shadow:0 0 18px #5b8af577}}
      `}</style>
    </Modal>
  );
}

const AUDIO_BASE = "https://qqgoojzlhczfexqlgvpe.supabase.co/storage/v1/object/public/audio/mercado-hoje.mp3";

function MercadoHojeAudio({t}) {
  const [audioUrl, setAudioUrl] = React.useState(null);
  const blobRef = React.useRef(null);
  const hoje = new Date().toLocaleDateString("pt-BR", {weekday:"long",day:"2-digit",month:"long"});
  const audioRef = React.useRef(null);
  const [playing, setPlaying] = React.useState(false);

  // Busca o áudio com cache: 'no-store' para sempre pegar o arquivo mais recente do Supabase
  const carregarAudio = React.useCallback(async () => {
    try {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      // Adiciona timestamp para bustar CDN do Supabase (Cloudflare ignora cache: no-store)
      const res = await fetch(`${AUDIO_BASE}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobRef.current = url;
      setAudioUrl(url);
    } catch (_) {}
  }, []);

  React.useEffect(() => {
    carregarAudio();
    // Recarrega quando virar o dia
    const dataHoje = new Date().toISOString().slice(0, 10);
    const iv = setInterval(() => {
      if (new Date().toISOString().slice(0, 10) !== dataHoje) carregarAudio();
    }, 60 * 1000);
    return () => { clearInterval(iv); if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  }, [carregarAudio]);
  const [progress, setProgress] = React.useState(0);
  const [current, setCurrent] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [muted, setMuted] = React.useState(false);

  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

  const togglePlay = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const onTimeUpdate = () => {
    const a = audioRef.current; if (!a) return;
    setCurrent(a.currentTime);
    setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
  };

  const onSeek = e => {
    const a = audioRef.current; if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    a.currentTime = pct * a.duration;
  };

  const toggleMute = () => {
    const a = audioRef.current; if (!a) return;
    a.muted = !a.muted; setMuted(a.muted);
  };

  return (
    <div style={{
      background:"linear-gradient(135deg,#080d1a 0%,#0b1220 100%)",
      border:"1px solid #1a2f50",
      borderLeft:"3px solid #5b8af5",
      borderRadius:10,
      padding:"8px 14px",
      marginBottom:14,
      display:"flex",
      alignItems:"center",
      gap:12,
      boxShadow:"0 0 20px rgba(91,138,245,0.07)",
    }}>
      <audio ref={audioRef} src={audioUrl} preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
      />

      {/* Ícone */}
      <div style={{position:"relative",flexShrink:0}}>
        <div style={{width:30,height:30,borderRadius:"50%",background:"#0f1e38",border:"1px solid #5b8af533",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🎙️</div>
        <div style={{position:"absolute",top:-1,right:-1,width:8,height:8,borderRadius:"50%",background:"#5b8af5",boxShadow:"0 0 5px #5b8af5",animation:"pulseAudio 2s ease-in-out infinite"}}/>
      </div>

      {/* Label */}
      <div style={{flexShrink:0,lineHeight:1.3}}>
        <div style={{color:"#e4e8f5",fontWeight:800,fontSize:11,letterSpacing:"0.8px"}}>MERCADO HOJE</div>
        <div style={{color:"#4a6fa5",fontSize:9,fontWeight:600,textTransform:"capitalize"}}>@segueofelipe · {hoje}</div>
      </div>

      {/* Botão Play/Pause */}
      <button onClick={togglePlay} style={{
        flexShrink:0,width:28,height:28,borderRadius:"50%",
        background: playing ? "#5b8af522" : "linear-gradient(135deg,#3b5fe2,#5b8af5)",
        border:`1px solid ${playing?"#5b8af566":"transparent"}`,
        color:"#fff",fontSize:10,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"all .2s",boxShadow: playing?"none":"0 2px 8px #5b8af544",
      }}>
        {playing ? "⏸" : "▶"}
      </button>

      {/* Tempo atual */}
      <span style={{color:"#4a6fa5",fontSize:10,fontWeight:600,flexShrink:0,minWidth:30}}>{fmt(current)}</span>

      {/* Barra de progresso */}
      <div onClick={onSeek} style={{flex:1,height:3,background:"#1a2f50",borderRadius:99,cursor:"pointer",position:"relative",minWidth:0}}>
        <div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,#3b5fe2,#5b8af5)",borderRadius:99,transition:"width .1s linear",position:"relative"}}>
          <div style={{position:"absolute",right:-4,top:"50%",transform:"translateY(-50%)",width:8,height:8,borderRadius:"50%",background:"#5b8af5",boxShadow:"0 0 4px #5b8af5",display: progress>0?"block":"none"}}/>
        </div>
      </div>

      {/* Duração */}
      <span style={{color:"#2a3f60",fontSize:10,fontWeight:600,flexShrink:0,minWidth:30,textAlign:"right"}}>{fmt(duration)}</span>

      {/* Mute */}
      <button onClick={toggleMute} style={{flexShrink:0,background:"none",border:"none",color: muted?"#ef4444":"#4a6fa5",fontSize:13,cursor:"pointer",padding:0,lineHeight:1}}>
        {muted ? "🔇" : "🔊"}
      </button>

      {/* Recarregar áudio */}
      <button onClick={carregarAudio} title="Recarregar áudio" style={{flexShrink:0,background:"none",border:"none",color:"#4a6fa5",fontSize:12,cursor:"pointer",padding:0,lineHeight:1}}>
        🔄
      </button>

      <style>{`
        @keyframes pulseAudio{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.4)}}
      `}</style>
    </div>
  );
}

function HomeTab({ops,t,tvData,mercadoRegistros,onRegistrarMercado,onIrAnalise}) {
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
     {/* <CotacoesPainel t={t} darkMode={darkMode} /> */}
      {/* Player de Áudio — Mercado Hoje @segueofelipe */}
      <MercadoHojeAudio t={t}/>

      {/* Mercados no topo — largura total */}
      <PainelMercados t={t} tvData={tvData}/>

      {/* Layout de 2 colunas: conteúdo principal + calendário lateral */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 660px",gap:14,alignItems:"start"}}>

        {/* Coluna esquerda */}
        <div>
          <RegoesDolar t={t}/>
          <ProbabilidadeCard t={t} tvData={tvData}/>
          <MercadoHojeCard t={t} registros={mercadoRegistros} onRegistrar={onRegistrarMercado} onIrAnalise={onIrAnalise}/>

          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
            <StatCard icon="📅" label="Hoje" value={`${diariaReais>=0?"+":""}${diariaReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`} color={diariaReais>=0?"#4ade80":"#f87171"} t={t}/>
            <StatCard icon="📆" label="Esta Semana" value={`${semanaReais>=0?"+":""}${semanaReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`} color={semanaReais>=0?"#4ade80":"#f87171"} t={t}/>
            <StatCard icon="🗓️" label="Este Mês" value={`${mesReais>=0?"+":""}${mesReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`} color={mesReais>=0?"#4ade80":"#f87171"} t={t}/>
            <StatCard icon="💰" label="Total R$" value={`${totalReais>=0?"+":""}${totalReais.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`} color={totalReais>=0?"#4ade80":"#f87171"} t={t}/>
            {temDolar&&<StatCard icon="💵" label="Total USD" value={`${totalDolar>=0?"+":""}${totalDolar.toLocaleString("en-US",{style:"currency",currency:"USD"})}`} color={totalDolar>=0?"#f59e0b":"#f87171"} t={t}/>}
            <StatCard icon="✅" label="Taxa de Acerto" value={`${pct}%`} color={pct>=50?"#4ade80":"#f87171"} t={t}/>
            <StatCard icon="📊" label="Total de Ops" value={`${ops.length} ops`} t={t}/>
          </div>

          <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:20,marginBottom:14}}>
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

        {/* Coluna direita: Calendário Econômico */}
        <div style={{position:"sticky",top:80}}>
          <CalendarioEconomico t={t}/>
        </div>

      </div>
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
  const wins=filtered.filter(o=>(parseFloat(o.resultadoReais)||0)>0).length;
  const winRate=filtered.length>0?Math.round((wins/filtered.length)*100):0;

  const periodoLabel=fPer==="semana"?"Semana":fPer==="mes"?"Mês":"Todas as operações";
  const nomeArquivo=`TradeVision_${fAtivo||"Todos"}_${fPer==="mes"?mesStr:fPer==="semana"?"semana":"completo"}`;

  function buildRows(){
    return filtered.map((o,i)=>({
      "#":i+1,
      "Data":o.data,
      "Ativo":o.ativo||"",
      "Direção":o.direcao||"",
      "Contratos":o.quantidadeContratos||"",
      "Resultado":o.resultadoGainStop||"",
      "R$ (Reais)":parseFloat(o.resultadoReais)||0,
      "USD":o.resultadoDolar?parseFloat(o.resultadoDolar):"",
      "Pontos":o.resultadoPontos||"",
      "Estratégia":o.estrategia||"",
      "Sentimento":o.sentimento||"",
      "Seguiu Operacional":o.seguiuOperacional||"",
      "Seguiu Gerenciamento":o.seguiuGerenciamento||"",
      "Anotações":o.anotacoes||"",
    }));
  }

  async function exportExcel(){
    const XLSX = await import("xlsx");
    const rows=buildRows();
    const ws2=XLSX.utils.json_to_sheet(rows);
    // Largura das colunas
    ws2["!cols"]=[{wch:4},{wch:11},{wch:10},{wch:9},{wch:10},{wch:10},{wch:13},{wch:10},{wch:8},{wch:18},{wch:12},{wch:16},{wch:18},{wch:30}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws2,"Operações");
    // Resumo em segunda aba
    const resumo=[
      ["Relatório TradeVision",""],
      ["Período",periodoLabel],
      ["Ativo",fAtivo||"Todos"],
      ["Total de operações",filtered.length],
      ["Wins",wins],
      ["Win Rate",winRate+"%"],
      ["Resultado Total (R$)",total.toFixed(2)],
      ["Resultado Total (USD)",totalUSD!==0?totalUSD.toFixed(2):"—"],
    ];
    const wsRes=XLSX.utils.aoa_to_sheet(resumo);
    wsRes["!cols"]=[{wch:25},{wch:20}];
    XLSX.utils.book_append_sheet(wb,wsRes,"Resumo");
    XLSX.writeFile(wb,nomeArquivo+".xlsx");
  }

  async function exportPDF(){
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const dark=false; // PDF sempre claro para impressão

    // Cabeçalho
    doc.setFillColor(15,23,42);
    doc.rect(0,0,297,22,"F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(16);
    doc.setFont("helvetica","bold");
    doc.text("TradeVision — Relatório de Operações",14,14);
    doc.setFontSize(9);
    doc.setFont("helvetica","normal");
    doc.setTextColor(150,150,150);
    doc.text(`Período: ${periodoLabel}   |   Ativo: ${fAtivo||"Todos"}   |   Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,14,20);

    // Cards de resumo
    const cardY=26;
    const cards=[
      {label:"Operações",val:String(filtered.length),cor:[59,130,246]},
      {label:"Win Rate",val:winRate+"%",cor:winRate>=50?[34,197,94]:[239,68,68]},
      {label:"Resultado (R$)",val:(total>=0?"+":"")+total.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),cor:total>=0?[34,197,94]:[239,68,68]},
      ...(totalUSD!==0?[{label:"Resultado (USD)",val:(totalUSD>=0?"+":"")+totalUSD.toFixed(2)+" USD",cor:totalUSD>=0?[34,197,94]:[239,68,68]}]:[]),
    ];
    const cw=Math.min(60,260/cards.length);
    cards.forEach((c,i)=>{
      const x=14+i*(cw+4);
      doc.setFillColor(...c.cor,30);
      doc.roundedRect(x,cardY,cw,16,2,2,"F");
      doc.setDrawColor(...c.cor);
      doc.roundedRect(x,cardY,cw,16,2,2,"S");
      doc.setTextColor(100,100,100);
      doc.setFontSize(7);
      doc.setFont("helvetica","normal");
      doc.text(c.label,x+3,cardY+6);
      doc.setTextColor(...c.cor);
      doc.setFontSize(10);
      doc.setFont("helvetica","bold");
      doc.text(c.val,x+3,cardY+13);
    });

    // Tabela
    const rows=buildRows();
    const cols=["#","Data","Ativo","Direção","Contratos","Resultado","R$ (Reais)","USD","Pontos","Estratégia","Sentimento"];
    autoTable(doc,{
      startY:cardY+22,
      head:[cols],
      body:rows.map(r=>cols.map(c=>{
        if(c==="R$ (Reais)"){const v=r[c];return v===0?"R$ 0,00":(v>0?"+":"")+v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
        return r[c]??""
      })),
      theme:"grid",
      headStyles:{fillColor:[15,23,42],textColor:[148,163,184],fontStyle:"bold",fontSize:8},
      bodyStyles:{fontSize:8,textColor:[30,30,30]},
      alternateRowStyles:{fillColor:[245,247,250]},
      didParseCell:(data)=>{
        if(data.section==="body"&&data.column.index===5){
          const v=String(data.cell.raw);
          if(v==="Gain") data.cell.styles.textColor=[21,128,61];
          else if(v==="Stop") data.cell.styles.textColor=[185,28,28];
          else if(v==="Zero") data.cell.styles.textColor=[146,64,14];
        }
        if(data.section==="body"&&data.column.index===6){
          const v=parseFloat(String(data.cell.raw).replace(/[^\d.,-]/g,"").replace(",","."));
          if(!isNaN(v)) data.cell.styles.textColor=v>=0?[21,128,61]:[185,28,28];
        }
      },
      margin:{left:14,right:14},
    });

    // Rodapé
    const pageCount=doc.internal.getNumberOfPages();
    for(let p=1;p<=pageCount;p++){
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(150,150,150);
      doc.text(`TradeVision  |  Página ${p} de ${pageCount}`,14,doc.internal.pageSize.height-5);
    }

    doc.save(nomeArquivo+".pdf");
  }

  const sel={background:t.input,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"7px 11px",fontSize:13,outline:"none"};
  const btnExp={border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:5};
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
        {filtered.length>0&&(
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <button onClick={exportExcel} style={{...btnExp,background:"#16a34a",color:"#fff"}}>📊 Excel</button>
            <button onClick={exportPDF} style={{...btnExp,background:"#dc2626",color:"#fff"}}>📄 PDF</button>
          </div>
        )}
      </div>
      {filtered.length===0&&<div style={{textAlign:"center",padding:60,color:t.muted,fontSize:15}}>Nenhuma operação encontrada 📭</div>}
      {filtered.map(op=><OpCard key={op.id} op={op} onEdit={onEdit} onDelete={onDelete} t={t}/>)}
    </div>
  );
}

function AnalyticsTab({ops,t}) {
  const [periodo,setPeriodo] = useState("tudo");
  const [dataIni,setDataIni] = useState("");
  const [dataFim,setDataFim] = useState("");
  const [fMercado,setFMercado] = useState("todos");
  const [fAtivo,setFAtivo] = useState("todos");
  const [fDirecao,setFDirecao] = useState("todas");
  const [fEstrategia,setFEstrategia] = useState("todas");
  const [rankView,setRankView] = useState("ganhos"); // ganhos | perdas | acerto
  const [estrategiasCustom, setEstrategiasCustom] = useState(() => {
    try { return JSON.parse(localStorage.getItem("estrategias_custom") || "[]"); } catch { return []; }
  });
  // Atualiza quando outra aba/janela modifica o localStorage
  React.useEffect(() => {
    const onStorage = () => {
      try { setEstrategiasCustom(JSON.parse(localStorage.getItem("estrategias_custom") || "[]")); } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const hoje = new Date();
  const {start:ws,end:we} = getWeekRange(hoje);
  const mesStr = hoje.toISOString().slice(0,7);
  const hj = hojeStr();

  function getMercado(ativo) {
    if(!ativo) return "outros";
    if(["WINFUT","WDOFUT"].includes(ativo)) return "br";
    const forex = Object.values(ATIVOS).filter((_,i)=>Object.keys(ATIVOS)[i].includes("Forex")).flat();
    if(forex.includes(ativo)) return "forex";
    const indices = [...(ATIVOS["🇺🇸 Índices EUA"]||[]),...(ATIVOS["🇩🇪 Europa"]||[]),...(ATIVOS["🌏 Ásia"]||[])];
    if(indices.includes(ativo)) return "indices";
    return "outros";
  }

  const ativosUnicos = useMemo(()=>[...new Set(ops.map(o=>o.ativo).filter(Boolean))],[ops]);
  const estrategiasUnicas = useMemo(()=>[...new Set(ops.map(o=>o.estrategia).filter(Boolean))],[ops]);

  const opsFiltradas = useMemo(() => {
    return ops.filter(op => {
      if(periodo==="hoje" && op.data!==hj) return false;
      if(periodo==="semana" && (op.data<ws||op.data>we)) return false;
      if(periodo==="mes" && !op.data.startsWith(mesStr)) return false;
      if(periodo==="custom"){
        if(dataIni && op.data<dataIni) return false;
        if(dataFim && op.data>dataFim) return false;
      }
      if(fMercado!=="todos" && getMercado(op.ativo)!==fMercado) return false;
      if(fAtivo!=="todos" && op.ativo!==fAtivo) return false;
      if(fDirecao!=="todas" && op.direcao!==fDirecao) return false;
      if(fEstrategia!=="todas" && op.estrategia!==fEstrategia) return false;
      return true;
    });
  }, [ops,periodo,dataIni,dataFim,fMercado,fAtivo,fDirecao,fEstrategia,hj,ws,we,mesStr]);

  const brl = v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  const totalReais = opsFiltradas.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const wins = opsFiltradas.filter(o=>(parseFloat(o.resultadoReais)||0)>0);
  const losses = opsFiltradas.filter(o=>(parseFloat(o.resultadoReais)||0)<0);
  const pct = opsFiltradas.length>0?Math.round(wins.length/opsFiltradas.length*100):0;
  const mediaGanho = wins.length>0?wins.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0)/wins.length:0;
  const mediaPerda = losses.length>0?Math.abs(losses.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0)/losses.length):0;
  const fatorR = mediaPerda>0?(mediaGanho/mediaPerda).toFixed(2):"-";

  const diasUnicos = useMemo(()=>{
    const acc={};
    opsFiltradas.forEach(op=>{
      if(!acc[op.data]) acc[op.data]=0;
      acc[op.data]+=(parseFloat(op.resultadoReais)||0);
    });
    return Object.entries(acc).map(([data,res])=>({data,res}));
  },[opsFiltradas]);
  const diasPos = diasUnicos.filter(d=>d.res>0).length;
  const diasNeg = diasUnicos.filter(d=>d.res<0).length;

  // ── Ranking estratégias ──
  const byEstrategia = useMemo(()=>{
    const acc={};
    opsFiltradas.forEach(op=>{
      const k=op.estrategia||"Sem estratégia";
      if(!acc[k]) acc[k]={tipo:k,reais:0,count:0,wins:0,losses:0,ops:[]};
      const r=parseFloat(op.resultadoReais)||0;
      acc[k].reais+=r; acc[k].count++;
      if(r>0) acc[k].wins++; else if(r<0) acc[k].losses++;
      acc[k].ops.push(op);
    });
    return Object.values(acc);
  },[opsFiltradas]);

  const rankEstr = useMemo(()=>{
    const arr=[...byEstrategia];
    if(rankView==="ganhos") return arr.sort((a,b)=>b.reais-a.reais);
    if(rankView==="perdas") return arr.sort((a,b)=>a.reais-b.reais);
    return arr.sort((a,b)=>{
      const pa=a.count?a.wins/a.count:0;
      const pb=b.count?b.wins/b.count:0;
      return pb-pa;
    });
  },[byEstrategia,rankView]);

  const maxAbsEstr = Math.max(...rankEstr.map(e=>Math.abs(e.reais)),1);

  // Melhor e pior estratégia
  const melhor = byEstrategia.length>0?[...byEstrategia].sort((a,b)=>b.reais-a.reais)[0]:null;
  const pior   = byEstrategia.length>0?[...byEstrategia].sort((a,b)=>a.reais-b.reais)[0]:null;
  const maiorAcerto = byEstrategia.length>0?[...byEstrategia].filter(e=>e.count>=3).sort((a,b)=>(b.wins/b.count)-(a.wins/a.count))[0]:null;

  const byDay = useMemo(()=>{
    const acc={};
    opsFiltradas.forEach(op=>{
      const d=getWeekday(op.data);
      if(!acc[d]) acc[d]={day:d,reais:0,count:0,wins:0};
      acc[d].reais+=parseFloat(op.resultadoReais)||0;
      acc[d].count++;
      if((parseFloat(op.resultadoReais)||0)>0) acc[d].wins++;
    });
    return Object.values(acc).sort((a,b)=>b.reais-a.reais);
  },[opsFiltradas]);

  const byAtivo = useMemo(()=>{
    const acc={};
    opsFiltradas.forEach(op=>{
      if(!acc[op.ativo]) acc[op.ativo]={ativo:op.ativo,reais:0,count:0,wins:0};
      acc[op.ativo].reais+=parseFloat(op.resultadoReais)||0;
      acc[op.ativo].count++;
      if((parseFloat(op.resultadoReais)||0)>0) acc[op.ativo].wins++;
    });
    return Object.values(acc).sort((a,b)=>b.reais-a.reais);
  },[opsFiltradas]);

  const chartData = useMemo(()=>{
    const s=[...opsFiltradas].sort((a,b)=>a.data.localeCompare(b.data));
    let acc=0;
    return s.map((op,i)=>{acc+=parseFloat(op.resultadoReais)||0;return{name:`#${i+1}`,saldo:Math.round(acc*100)/100};});
  },[opsFiltradas]);

  const maxAbsDay = Math.max(...byDay.map(d=>Math.abs(d.reais)),1);

  // ── DNA das operações vencedoras ──
  const dnaWins = useMemo(()=>{
    const w = opsFiltradas.filter(o=>(parseFloat(o.resultadoReais)||0)>0);
    if(w.length<3) return null;
    const n = w.length;
    const freq = (arr, key) => {
      const acc={};
      arr.forEach(op=>{ const v=op[key]; if(v!=null&&v!=="") { const k=String(v); acc[k]=(acc[k]||0)+1; } });
      return Object.entries(acc).map(([label,count])=>({label,count,pct:Math.round(count/n*100)})).sort((a,b)=>b.count-a.count);
    };
    // Médias: campo é array
    const mediasAcc={};
    w.forEach(op=>(op.medias||[]).forEach(m=>{ mediasAcc[m]=(mediasAcc[m]||0)+1; }));
    const mediasFreq=Object.entries(mediasAcc).map(([label,count])=>({label:`MM ${label}`,count,pct:Math.round(count/n*100)})).sort((a,b)=>b.count-a.count);
    // Retração
    const retSim=w.filter(o=>o.retracao===true).length;
    const nivelAcc={};
    w.filter(o=>o.retracao&&o.nivelRetracao).forEach(op=>{ nivelAcc[op.nivelRetracao]=(nivelAcc[op.nivelRetracao]||0)+1; });
    const nivelFreq=Object.entries(nivelAcc).map(([label,count])=>({label:`${label}%`,count,pct:Math.round(count/n*100)})).sort((a,b)=>b.count-a.count);
    return {
      total:n,
      macro:freq(w,"mercadoMacro"),
      esticado:freq(w,"mercadoEsticado"),
      liquidez:freq(w,"pegouLiquidez"),
      medias:mediasFreq,
      retracao:{sim:retSim,pct:Math.round(retSim/n*100),niveis:nivelFreq},
    };
  },[opsFiltradas]);

  // ── DNA das operações perdedoras ──
  const dnaLosses = useMemo(()=>{
    const l = opsFiltradas.filter(o=>(parseFloat(o.resultadoReais)||0)<0);
    if(l.length<3) return null;
    const n = l.length;
    // Impedimentos
    const impAcc={};
    l.forEach(op=>(op.impedimentos||[]).forEach(imp=>{
      const k=imp.impedimento||imp;
      if(k) impAcc[k]=(impAcc[k]||0)+1;
    }));
    const impFreq=Object.entries(impAcc).map(([v,count])=>{
      const meta=IMPEDIMENTOS_BASE.find(i=>i.v===v);
      return {label:meta?meta.label:v,count,pct:Math.round(count/n*100)};
    }).sort((a,b)=>b.count-a.count);
    // Erros
    const errAcc={};
    l.forEach(op=>(op.errosOperacao||[]).forEach(e=>{ errAcc[e]=(errAcc[e]||0)+1; }));
    const errFreq=Object.entries(errAcc).map(([v,count])=>{
      const meta=ERROS_OPERACAO.find(e=>e.v===v);
      return {label:meta?meta.label:v,color:meta?meta.color:"#f59e0b",count,pct:Math.round(count/n*100)};
    }).sort((a,b)=>b.count-a.count);
    return {total:n, impedimentos:impFreq, erros:errFreq};
  },[opsFiltradas]);

  // ── Estilos ──
  const card = {background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:"20px 22px",marginBottom:16};
  const selSt = {background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"8px 12px",fontSize:12,fontWeight:600,cursor:"pointer",outline:"none"};
  const btnF = (ativo,onClick,label,cor="#60a5fa") => (
    <button onClick={onClick} style={{
      padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700,
      border:`1px solid ${ativo?cor+"88":t.border}`,
      background:ativo?cor+"18":"transparent",
      color:ativo?cor:t.muted,transition:"all .15s",whiteSpace:"nowrap"
    }}>{label}</button>
  );

  // ── Seção de insigt destacado ──
  const InsightBadge = ({icon,label,value,color,sub})=>(
    <div style={{background:color+"0d",border:`1px solid ${color}33`,borderRadius:14,padding:"16px 18px",display:"flex",flexDirection:"column",gap:4,flex:1,minWidth:130}}>
      <div style={{fontSize:20,marginBottom:2}}>{icon}</div>
      <div style={{color:color,fontWeight:900,fontSize:17,fontFamily:"monospace"}}>{value}</div>
      <div style={{color:t.text,fontWeight:700,fontSize:11,letterSpacing:.5}}>{label}</div>
      {sub&&<div style={{color:t.muted,fontSize:10}}>{sub}</div>}
    </div>
  );

  return (
    <div>

      {/* ══ FILTROS PREMIUM ══ */}
      <div style={{...card,background:"linear-gradient(135deg,"+t.card+" 0%,"+t.bg+" 100%)",border:`1px solid ${t.border}`,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:3,height:18,background:"#a78bfa",borderRadius:2}}/>
            <span style={{color:t.accent,fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>Filtros de Análise</span>
          </div>
          <button onClick={()=>{setPeriodo("tudo");setFMercado("todos");setFAtivo("todos");setFDirecao("todas");setFEstrategia("todas");setDataIni("");setDataFim("");}}
            style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,color:t.muted,padding:"4px 12px",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            ✕ Limpar
          </button>
        </div>

        {/* Linha 1: Período */}
        <div style={{marginBottom:12}}>
          <div style={{color:t.muted,fontSize:9,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1.5}}>Período</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["tudo","Tudo"],["hoje","Hoje"],["semana","Esta Semana"],["mes","Este Mês"],["custom","Personalizado"]].map(([v,l])=>
              btnF(periodo===v,()=>setPeriodo(v),l)
            )}
          </div>
          {periodo==="custom"&&(
            <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
              <input type="date" value={dataIni} onChange={e=>setDataIni(e.target.value)} style={selSt}/>
              <span style={{color:t.muted}}>→</span>
              <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} style={selSt}/>
            </div>
          )}
        </div>

        {/* Linha 2: Mercado + Ativo + Direção */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:12}}>
          <div>
            <div style={{color:t.muted,fontSize:9,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1.5}}>Mercado</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {[["todos","Todos"],["br","🇧🇷 BR"],["forex","Forex"],["indices","Índices"]].map(([v,l])=>
                btnF(fMercado===v,()=>{setFMercado(v);setFAtivo("todos");},l)
              )}
            </div>
          </div>
          <div>
            <div style={{color:t.muted,fontSize:9,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1.5}}>Ativo</div>
            <select value={fAtivo} onChange={e=>setFAtivo(e.target.value)} style={{...selSt,width:"100%"}}>
              <option value="todos">Todos os ativos</option>
              {ativosUnicos.filter(a=>fMercado==="todos"||getMercado(a)===fMercado).map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <div style={{color:t.muted,fontSize:9,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1.5}}>Direção</div>
            <div style={{display:"flex",gap:5}}>
              {[["todas","Todas"],["Compra","▲ Compra"],["Venda","▼ Venda"]].map(([v,l])=>
                btnF(fDirecao===v,()=>setFDirecao(v),l,v==="Compra"?"#22c55e":v==="Venda"?"#ef4444":"#60a5fa")
              )}
            </div>
          </div>
        </div>

        {/* Linha 3: Estratégia da Operação — dinâmico */}
        <div style={{background:t.bg,border:`1px solid #a78bfa33`,borderRadius:12,padding:"12px 16px"}}>
          <div style={{color:"#a78bfa",fontSize:9,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1.5,display:"flex",alignItems:"center",gap:6}}>
            <span>🎯</span> Estratégia da Operação
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {btnF(fEstrategia==="todas",()=>setFEstrategia("todas"),"Todas","#a78bfa")}
            {/* Estratégias usadas nas operações (fixas com label + custom como texto) */}
            {[...new Set(ops.map(o=>o.estrategia).filter(Boolean))].map(k=>{
              const label = ESTRATEGIAS.find(e=>e.v===k)?.label || k;
              return btnF(fEstrategia===k,()=>setFEstrategia(k),label,"#a78bfa");
            })}
            {/* Estratégias custom do localStorage ainda não usadas em operações */}
            {estrategiasCustom
              .filter(est=>!ops.some(o=>o.estrategia===est))
              .map(est=>btnF(fEstrategia===est,()=>setFEstrategia(est),est,"#a78bfa"))
            }
          </div>
        </div>

        <div style={{marginTop:10,color:t.muted,fontSize:10,textAlign:"right"}}>
          {opsFiltradas.length} operação{opsFiltradas.length!==1?"s":""} encontrada{opsFiltradas.length!==1?"s":""}
        </div>
      </div>

      {opsFiltradas.length===0&&(
        <div style={{...card,textAlign:"center",padding:48}}>
          <div style={{fontSize:40,marginBottom:10}}>🔍</div>
          <div style={{color:t.muted,fontSize:14}}>Nenhuma operação com os filtros selecionados.</div>
        </div>
      )}

      {opsFiltradas.length>0&&(<>

      {/* ══ KPIs TOPO ══ */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
        <InsightBadge icon="📊" label="Total de Ops" value={opsFiltradas.length} color="#60a5fa" sub={`${wins.length}W · ${losses.length}L`}/>
        <InsightBadge icon="✅" label="Taxa de Acerto" value={`${pct}%`} color={pct>=55?"#22c55e":pct>=40?"#f59e0b":"#ef4444"} sub={`${wins.length} wins de ${opsFiltradas.length}`}/>
        <InsightBadge icon="💰" label="Resultado Total" value={brl(totalReais)} color={totalReais>=0?"#22c55e":"#ef4444"} sub={totalReais>=0?"✅ Positivo":"⚠️ Negativo"}/>
        <InsightBadge icon="⚖️" label="Fator R" value={`${fatorR}x`} color={parseFloat(fatorR)>=1?"#22c55e":"#ef4444"} sub={`G:${brl(mediaGanho)} / P:${brl(mediaPerda)}`}/>
        <InsightBadge icon="📅" label="Dias Operados" value={diasUnicos.length} color="#a78bfa" sub={`${diasPos}✅ ${diasNeg}❌`}/>
      </div>

      {/* ══ DESTAQUES ESTRATÉGIA ══ */}
      {byEstrategia.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
          {melhor&&(
            <div style={{background:"linear-gradient(135deg,#052218,#000)",border:"1px solid #22c55e44",borderRadius:16,padding:"16px 18px"}}>
              <div style={{color:"#22c55e",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>🏆 Melhor Estratégia</div>
              <div style={{color:"#fff",fontWeight:900,fontSize:14,marginBottom:4}}>{melhor.tipo}</div>
              <div style={{color:"#22c55e",fontWeight:900,fontSize:22,fontFamily:"monospace"}}>+{brl(melhor.reais)}</div>
              <div style={{color:"#4a6a4a",fontSize:10,marginTop:4}}>{melhor.wins}/{melhor.count} ops · {melhor.count?Math.round(melhor.wins/melhor.count*100):0}% acerto</div>
            </div>
          )}
          {pior&&pior!==melhor&&(
            <div style={{background:"linear-gradient(135deg,#1a0505,#000)",border:"1px solid #ef444444",borderRadius:16,padding:"16px 18px"}}>
              <div style={{color:"#ef4444",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>📉 Pior Estratégia</div>
              <div style={{color:"#fff",fontWeight:900,fontSize:14,marginBottom:4}}>{pior.tipo}</div>
              <div style={{color:"#ef4444",fontWeight:900,fontSize:22,fontFamily:"monospace"}}>{brl(pior.reais)}</div>
              <div style={{color:"#6a4a4a",fontSize:10,marginTop:4}}>{pior.wins}/{pior.count} ops · {pior.count?Math.round(pior.wins/pior.count*100):0}% acerto</div>
            </div>
          )}
          {maiorAcerto&&(
            <div style={{background:"linear-gradient(135deg,#0a0818,#000)",border:"1px solid #a78bfa44",borderRadius:16,padding:"16px 18px"}}>
              <div style={{color:"#a78bfa",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>🎯 Maior % Acerto</div>
              <div style={{color:"#fff",fontWeight:900,fontSize:14,marginBottom:4}}>{maiorAcerto.tipo}</div>
              <div style={{color:"#a78bfa",fontWeight:900,fontSize:22,fontFamily:"monospace"}}>{Math.round(maiorAcerto.wins/maiorAcerto.count*100)}%</div>
              <div style={{color:"#4a4a6a",fontSize:10,marginTop:4}}>{maiorAcerto.wins}/{maiorAcerto.count} ops confirmadas</div>
            </div>
          )}
        </div>
      )}

      {/* ══ RANKING ══ */}
      <div style={{...card}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:3,height:18,background:"#a78bfa",borderRadius:2}}/>
            <span style={{color:"#a78bfa",fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>
              {rankView==="ganhos"?"Top Operações — Maiores Ganhos":rankView==="perdas"?"Top Operações — Maiores Perdas":"Ranking por Estratégia — % Acerto"}
            </span>
          </div>
          <div style={{display:"flex",gap:6}}>
            {[["ganhos","💰 Maiores Ganhos"],["perdas","📉 Maiores Perdas"],["acerto","🎯 % Acerto"]].map(([v,l])=>(
              <button key={v} onClick={()=>setRankView(v)} style={{
                padding:"5px 12px",borderRadius:8,fontSize:10,fontWeight:700,cursor:"pointer",border:"none",
                background:rankView===v?"#a78bfa22":"transparent",
                color:rankView===v?"#a78bfa":t.muted,
                borderBottom:`1px solid ${rankView===v?"#a78bfa":"transparent"}`,
                transition:"all .15s",
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Maiores Ganhos / Perdas — top operações individuais */}
        {(rankView==="ganhos"||rankView==="perdas")&&(()=>{
          const sorted=[...opsFiltradas].sort((a,b)=>{
            const ra=parseFloat(a.resultadoReais)||0;
            const rb=parseFloat(b.resultadoReais)||0;
            return rankView==="ganhos"?rb-ra:ra-rb;
          }).slice(0,10);
          if(sorted.length===0) return <div style={{color:t.muted,fontSize:13,textAlign:"center",padding:20}}>Nenhuma operação encontrada.</div>;
          const maxAbs=Math.max(...sorted.map(o=>Math.abs(parseFloat(o.resultadoReais)||0)),1);
          return (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {sorted.map((op,i)=>{
                const r=parseFloat(op.resultadoReais)||0;
                const pts=parseFloat(op.resultadoPontos)||0;
                const isPos=r>=0;
                const rank1=i===0;
                const barPct=Math.abs(r)/maxAbs*100;
                return (
                  <div key={op.id||i} style={{background:rank1?(isPos?"#052218":"#1a0505"):t.bg,border:`1px solid ${rank1?(isPos?"#22c55e44":"#ef444444"):t.border}`,borderRadius:12,padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:24,height:24,borderRadius:6,background:rank1?(isPos?"#22c55e33":"#ef444433"):"transparent",border:`1px solid ${rank1?(isPos?"#22c55e66":"#ef444466"):t.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:rank1?(isPos?"#4ade80":"#f87171"):t.muted,fontWeight:900,fontSize:10,flexShrink:0}}>#{i+1}</div>
                        <div>
                          <div style={{color:t.text,fontWeight:700,fontSize:12}}>{op.data} · {op.ativo||"—"} · {op.direcao||"—"}</div>
                          <div style={{color:t.muted,fontSize:10,marginTop:1}}>{op.estrategia||"Sem estratégia"}{pts!==0?` · ${pts>0?"+":""}${pts} pts`:""}</div>
                        </div>
                      </div>
                      <div style={{color:isPos?"#4ade80":"#f87171",fontWeight:900,fontSize:15,fontFamily:"monospace"}}>{isPos?"+":""}{brl(r)}</div>
                    </div>
                    <div style={{background:t.border,borderRadius:3,height:3,overflow:"hidden"}}>
                      <div style={{width:`${barPct}%`,height:"100%",background:isPos?"#22c55e":"#ef4444",borderRadius:3,transition:"width .4s ease"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* % Acerto — ranking por estratégia */}
        {rankView==="acerto"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {rankEstr.length===0&&<div style={{color:t.muted,fontSize:13,textAlign:"center",padding:20}}>Sem dados de estratégia registrados.</div>}
            {rankEstr.map((e,i)=>{
              const pctAcerto = e.count?Math.round(e.wins/e.count*100):0;
              const barPct = pctAcerto;
              const isPos = e.reais>=0;
              const rank1 = i===0;
              return (
                <div key={e.tipo} style={{background:rank1?"#0a0818":t.bg,border:`1px solid ${rank1?"#a78bfa44":t.border}`,borderRadius:12,padding:"14px 16px",transition:"all .15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:26,height:26,borderRadius:8,background:rank1?"#a78bfa33":"transparent",border:`1px solid ${rank1?"#a78bfa66":t.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:rank1?"#c4b5fd":t.muted,fontWeight:900,fontSize:11,flexShrink:0}}>#{i+1}</div>
                      <div>
                        <div style={{color:t.text,fontWeight:700,fontSize:13}}>{e.tipo}</div>
                        <div style={{color:t.muted,fontSize:10,marginTop:2}}>{e.count} op{e.count!==1?"s":""} · {e.wins}✅ {e.losses}❌</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:"#a78bfa",fontWeight:900,fontSize:18,fontFamily:"monospace"}}>{pctAcerto}%</div>
                      <div style={{color:isPos?"#4ade80":"#f87171",fontSize:10}}>{brl(e.reais)}</div>
                    </div>
                  </div>
                  <div style={{background:t.border,borderRadius:4,height:4,overflow:"hidden"}}>
                    <div style={{width:`${barPct}%`,height:"100%",background:"#a78bfa",borderRadius:4,transition:"width .4s ease"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ RISCO RETORNO — DISTRIBUIÇÃO DE PONTOS ══ */}
      {(()=>{
        const opsComPontos=opsFiltradas.filter(o=>parseFloat(o.resultadoPontos)!==0&&o.resultadoPontos!=="");
        if(opsComPontos.length===0) return null;
        const pontos=opsComPontos.map(o=>parseFloat(o.resultadoPontos)||0);
        const mediaPts=pontos.reduce((s,p)=>s+p,0)/pontos.length;
        const maxPts=Math.max(...pontos);
        const minPts=Math.min(...pontos);
        const buckets=[
          {label:"< 0 (Loss)",min:-Infinity,max:0,cor:"#ef4444"},
          {label:"0 – 100",min:0,max:100,cor:"#f59e0b"},
          {label:"101 – 250",min:100,max:250,cor:"#fbbf24"},
          {label:"251 – 500",min:250,max:500,cor:"#60a5fa"},
          {label:"501 – 1000",min:500,max:1000,cor:"#a78bfa"},
          {label:"+ 1000",min:1000,max:Infinity,cor:"#22c55e"},
        ];
        const bucketsData=buckets.map(b=>({
          ...b,
          ops:opsComPontos.filter(o=>{const p=parseFloat(o.resultadoPontos)||0;return p>b.min&&p<=b.max;}),
          count:opsComPontos.filter(o=>{const p=parseFloat(o.resultadoPontos)||0;return p>b.min&&p<=b.max;}).length,
        }));
        const maxCount=Math.max(...bucketsData.map(b=>b.count),1);
        return (
          <div style={{...card,border:"1px solid #f59e0b33"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <div style={{width:3,height:18,background:"#f59e0b",borderRadius:2}}/>
              <span style={{color:"#f59e0b",fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>⚡ Risco Retorno — Distribuição de Pontos</span>
              <span style={{marginLeft:"auto",background:"#f59e0b18",border:"1px solid #f59e0b33",borderRadius:99,padding:"2px 10px",color:"#f59e0b",fontSize:10,fontWeight:700}}>{opsComPontos.length} ops</span>
            </div>
            <div style={{color:t.muted,fontSize:11,marginBottom:14}}>Quantos pontos cada operação pagou — veja se você sai cedo demais</div>
            {/* Stats resumo */}
            <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
              {[
                {icon:"📊",label:"Média",value:`${mediaPts>=0?"+":""}${mediaPts.toFixed(0)} pts`,cor:mediaPts>=0?"#22c55e":"#ef4444"},
                {icon:"🏆",label:"Melhor op",value:`+${maxPts.toFixed(0)} pts`,cor:"#22c55e"},
                {icon:"📉",label:"Pior op",value:`${minPts.toFixed(0)} pts`,cor:"#ef4444"},
                {icon:"📈",label:"Ops analisadas",value:opsComPontos.length,cor:"#60a5fa"},
              ].map(({icon,label,value,cor})=>(
                <div key={label} style={{background:cor+"0d",border:`1px solid ${cor}33`,borderRadius:10,padding:"10px 14px",flex:1,minWidth:100}}>
                  <div style={{fontSize:16,marginBottom:3}}>{icon}</div>
                  <div style={{color:cor,fontWeight:900,fontSize:14,fontFamily:"monospace"}}>{value}</div>
                  <div style={{color:t.muted,fontSize:10,marginTop:2}}>{label}</div>
                </div>
              ))}
            </div>
            {/* Barras de distribuição */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {bucketsData.map(b=>(
                <div key={b.label}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{color:b.count>0?b.cor:t.muted,fontWeight:700,fontSize:12}}>{b.label}</span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{color:b.count>0?b.cor:t.muted,fontWeight:900,fontSize:13}}>{b.count} op{b.count!==1?"s":""}</span>
                      <span style={{color:t.muted,fontSize:10}}>{opsComPontos.length>0?Math.round(b.count/opsComPontos.length*100):0}%</span>
                    </div>
                  </div>
                  <div style={{background:t.border,borderRadius:4,height:10,overflow:"hidden"}}>
                    <div style={{width:`${b.count/maxCount*100}%`,height:"100%",background:b.cor,borderRadius:4,transition:"width .5s ease",opacity:b.count===0?0.2:1}}/>
                  </div>
                </div>
              ))}
            </div>
            {mediaPts>0&&mediaPts<500&&(
              <div style={{marginTop:14,background:"#f59e0b0d",border:"1px solid #f59e0b33",borderRadius:8,padding:"10px 14px",color:"#fbbf24",fontSize:12}}>
                💡 Sua média é de <strong>{mediaPts.toFixed(0)} pts/op</strong>. Se {opsComPontos.filter(o=>parseFloat(o.resultadoPontos)>500).length} operações passaram de 500 pts, considere segurar mais posições.
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ DNA DAS OPERAÇÕES VENCEDORAS ══ */}
      {dnaWins&&(
        <div style={{...card,border:"1px solid #22c55e33",background:"linear-gradient(135deg,#021a0e,#000)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
            <div style={{width:3,height:18,background:"#22c55e",borderRadius:2}}/>
            <span style={{color:"#22c55e",fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>🧬 DNA das Operações Vencedoras</span>
            <span style={{marginLeft:"auto",background:"#22c55e22",border:"1px solid #22c55e44",borderRadius:99,padding:"2px 10px",color:"#22c55e",fontSize:10,fontWeight:700}}>{dnaWins.total} wins</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>

            {/* Tendência Macro */}
            <div style={{background:"#00000055",border:"1px solid #22c55e22",borderRadius:12,padding:"12px 14px"}}>
              <div style={{color:"#4ade80",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>🌐 Tendência Macro</div>
              {dnaWins.macro.length===0&&<div style={{color:"#4a6a4a",fontSize:11}}>Sem dados</div>}
              {dnaWins.macro.map(({label,count,pct})=>(
                <div key={label} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{color:"#e2e8f0",fontSize:11}}>{label==="Alta"?"📈 Alta":label==="Baixa"?"📉 Baixa":label==="Lateral"?"➡️ Lateral":label}</span>
                    <span style={{color:"#4ade80",fontSize:11,fontWeight:700}}>{pct}%</span>
                  </div>
                  <div style={{background:"#0d2a1a",borderRadius:3,height:5,overflow:"hidden"}}>
                    <div style={{width:`${pct}%`,height:"100%",background:"#22c55e",borderRadius:3}}/>
                  </div>
                  <div style={{color:"#4a6a4a",fontSize:9,marginTop:2}}>{count} de {dnaWins.total} ops</div>
                </div>
              ))}
            </div>

            {/* Mercado Esticado + Liquidez + Retração */}
            <div style={{background:"#00000055",border:"1px solid #22c55e22",borderRadius:12,padding:"12px 14px"}}>
              <div style={{color:"#4ade80",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>📏 Condições de Mercado</div>
              {/* Esticado */}
              <div style={{marginBottom:10}}>
                <div style={{color:"#94a3b8",fontSize:9,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>Mercado Esticado?</div>
                {dnaWins.esticado.length===0?<div style={{color:"#4a6a4a",fontSize:11}}>Sem dados</div>:dnaWins.esticado.map(({label,count,pct})=>(
                  <div key={label} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{fontSize:11,minWidth:40}}>{label===true||label==="true"?"✅ Sim":"❌ Não"}</span>
                    <div style={{flex:1,background:"#0d2a1a",borderRadius:3,height:5,overflow:"hidden"}}>
                      <div style={{width:`${pct}%`,height:"100%",background:"#22c55e",borderRadius:3}}/>
                    </div>
                    <span style={{color:"#4ade80",fontSize:11,fontWeight:700,minWidth:30,textAlign:"right"}}>{pct}%</span>
                  </div>
                ))}
              </div>
              {/* Liquidez */}
              <div style={{marginBottom:10}}>
                <div style={{color:"#94a3b8",fontSize:9,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>Pegou Liquidez?</div>
                {dnaWins.liquidez.length===0?<div style={{color:"#4a6a4a",fontSize:11}}>Sem dados</div>:dnaWins.liquidez.map(({label,count,pct})=>(
                  <div key={label} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{fontSize:11,minWidth:40}}>{label===true||label==="true"?"✅ Sim":"❌ Não"}</span>
                    <div style={{flex:1,background:"#0d2a1a",borderRadius:3,height:5,overflow:"hidden"}}>
                      <div style={{width:`${pct}%`,height:"100%",background:"#22c55e",borderRadius:3}}/>
                    </div>
                    <span style={{color:"#4ade80",fontSize:11,fontWeight:700,minWidth:30,textAlign:"right"}}>{pct}%</span>
                  </div>
                ))}
              </div>
              {/* Retração */}
              <div>
                <div style={{color:"#94a3b8",fontSize:9,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>↩️ Estava em Retração?</div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:11,minWidth:40}}>✅ Sim</span>
                  <div style={{flex:1,background:"#0d2a1a",borderRadius:3,height:5,overflow:"hidden"}}>
                    <div style={{width:`${dnaWins.retracao.pct}%`,height:"100%",background:"#22c55e",borderRadius:3}}/>
                  </div>
                  <span style={{color:"#4ade80",fontSize:11,fontWeight:700,minWidth:30,textAlign:"right"}}>{dnaWins.retracao.pct}%</span>
                </div>
                {dnaWins.retracao.niveis.length>0&&(
                  <div style={{marginTop:4,paddingLeft:8,borderLeft:"2px solid #22c55e22"}}>
                    {dnaWins.retracao.niveis.map(({label,count,pct})=>(
                      <div key={label} style={{display:"flex",justifyContent:"space-between",color:"#4a6a4a",fontSize:9,marginBottom:2}}>
                        <span style={{color:"#94a3b8"}}>{label}</span>
                        <span style={{color:"#4ade80",fontWeight:700}}>{pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Médias a Favor */}
            <div style={{background:"#00000055",border:"1px solid #22c55e22",borderRadius:12,padding:"12px 14px"}}>
              <div style={{color:"#4ade80",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>📊 Médias a Favor</div>
              {dnaWins.medias.length===0&&<div style={{color:"#4a6a4a",fontSize:11}}>Sem dados registrados</div>}
              {dnaWins.medias.map(({label,count,pct})=>(
                <div key={label} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{color:"#e2e8f0",fontSize:11}}>{label}</span>
                    <span style={{color:"#4ade80",fontSize:11,fontWeight:700}}>{pct}%</span>
                  </div>
                  <div style={{background:"#0d2a1a",borderRadius:3,height:5,overflow:"hidden"}}>
                    <div style={{width:`${pct}%`,height:"100%",background:"#22c55e",borderRadius:3}}/>
                  </div>
                  <div style={{color:"#4a6a4a",fontSize:9,marginTop:2}}>{count} de {dnaWins.total} wins</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
      {wins.length>0&&wins.length<3&&(
        <div style={{...card,border:"1px solid #22c55e22",textAlign:"center",padding:"18px",marginBottom:16}}>
          <div style={{color:"#4a6a4a",fontSize:12}}>🧬 DNA das Vencedoras disponível a partir de <strong style={{color:"#22c55e"}}>3 wins</strong> filtrados (você tem {wins.length})</div>
        </div>
      )}

      {/* ══ DNA DAS OPERAÇÕES PERDEDORAS ══ */}
      {dnaLosses&&(
        <div style={{...card,border:"1px solid #ef444433",background:"linear-gradient(135deg,#1a0505,#000)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
            <div style={{width:3,height:18,background:"#ef4444",borderRadius:2}}/>
            <span style={{color:"#ef4444",fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>🧬 DNA das Operações Perdedoras</span>
            <span style={{marginLeft:"auto",background:"#ef444422",border:"1px solid #ef444444",borderRadius:99,padding:"2px 10px",color:"#ef4444",fontSize:10,fontWeight:700}}>{dnaLosses.total} losses</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

            {/* Impedimentos */}
            <div style={{background:"#00000055",border:"1px solid #ef444422",borderRadius:12,padding:"14px 16px"}}>
              <div style={{color:"#f87171",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>🚧 Impedimentos Presentes</div>
              {dnaLosses.impedimentos.length===0&&<div style={{color:"#4a2a2a",fontSize:11}}>Nenhum impedimento registrado</div>}
              {dnaLosses.impedimentos.map(({label,count,pct})=>(
                <div key={label} style={{marginBottom:9}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{color:"#e2e8f0",fontSize:11,flex:1,marginRight:8}}>{label}</span>
                    <span style={{color:"#f87171",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{pct}% · {count}x</span>
                  </div>
                  <div style={{background:"#2a0d0d",borderRadius:3,height:5,overflow:"hidden"}}>
                    <div style={{width:`${pct}%`,height:"100%",background:"#ef4444",borderRadius:3}}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Erros */}
            <div style={{background:"#00000055",border:"1px solid #ef444422",borderRadius:12,padding:"14px 16px"}}>
              <div style={{color:"#f87171",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>⚠️ Erros Cometidos</div>
              {dnaLosses.erros.length===0&&<div style={{color:"#4a2a2a",fontSize:11}}>Nenhum erro registrado</div>}
              {dnaLosses.erros.map(({label,color,count,pct})=>(
                <div key={label} style={{marginBottom:9}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{color:"#e2e8f0",fontSize:11,flex:1,marginRight:8}}>{label}</span>
                    <span style={{color:color||"#f59e0b",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{pct}% · {count}x</span>
                  </div>
                  <div style={{background:"#2a0d0d",borderRadius:3,height:5,overflow:"hidden"}}>
                    <div style={{width:`${pct}%`,height:"100%",background:color||"#f59e0b",borderRadius:3}}/>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
      {losses.length>0&&losses.length<3&&(
        <div style={{...card,border:"1px solid #ef444422",textAlign:"center",padding:"18px",marginBottom:16}}>
          <div style={{color:"#4a2a2a",fontSize:12}}>🧬 DNA das Perdedoras disponível a partir de <strong style={{color:"#ef4444"}}>3 losses</strong> filtrados (você tem {losses.length})</div>
        </div>
      )}

      {/* ══ LINHA: Média Ganho/Perda + Consistência ══ */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        <div style={{...card,marginBottom:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:3,height:18,background:"#60a5fa",borderRadius:2}}/>
            <span style={{color:"#60a5fa",fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>Média Ganho vs Perda</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div style={{background:"#052218",border:"1px solid #22c55e33",borderRadius:12,padding:"12px",textAlign:"center"}}>
              <div style={{color:"#475569",fontSize:9,fontWeight:700,textTransform:"uppercase",marginBottom:4,letterSpacing:1}}>Média Gain</div>
              <div style={{color:"#22c55e",fontWeight:900,fontSize:18,fontFamily:"monospace"}}>{brl(mediaGanho)}</div>
              <div style={{color:"#2a4a3a",fontSize:10,marginTop:2}}>{wins.length} wins</div>
            </div>
            <div style={{background:"#1a0505",border:"1px solid #ef444433",borderRadius:12,padding:"12px",textAlign:"center"}}>
              <div style={{color:"#475569",fontSize:9,fontWeight:700,textTransform:"uppercase",marginBottom:4,letterSpacing:1}}>Média Loss</div>
              <div style={{color:"#ef4444",fontWeight:900,fontSize:18,fontFamily:"monospace"}}>-{brl(mediaPerda)}</div>
              <div style={{color:"#4a2a2a",fontSize:10,marginTop:2}}>{losses.length} losses</div>
            </div>
          </div>
          <div style={{background:parseFloat(fatorR)>=1?"#052218":"#1a0505",border:`1px solid ${parseFloat(fatorR)>=1?"#22c55e44":"#ef444444"}`,borderRadius:12,padding:"12px",textAlign:"center"}}>
            <div style={{color:t.muted,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Fator R (Expectativa)</div>
            <div style={{color:parseFloat(fatorR)>=1?"#22c55e":"#ef4444",fontWeight:900,fontSize:26,fontFamily:"monospace"}}>{fatorR}x</div>
            <div style={{color:t.muted,fontSize:10}}>{parseFloat(fatorR)>=1?"✅ Expectativa positiva":"⚠️ Expectativa negativa"}</div>
          </div>
        </div>

        <div style={{...card,marginBottom:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:3,height:18,background:"#f59e0b",borderRadius:2}}/>
            <span style={{color:"#f59e0b",fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>Consistência Diária</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            <div style={{background:"#052218",border:"1px solid #22c55e33",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{color:"#22c55e",fontWeight:900,fontSize:24,fontFamily:"monospace"}}>{diasPos}</div>
              <div style={{color:"#2a4a3a",fontSize:10}}>dias ✅</div>
            </div>
            <div style={{background:"#1a0505",border:"1px solid #ef444433",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{color:"#ef4444",fontWeight:900,fontSize:24,fontFamily:"monospace"}}>{diasNeg}</div>
              <div style={{color:"#4a2a2a",fontSize:10}}>dias ❌</div>
            </div>
            <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{color:"#f59e0b",fontWeight:900,fontSize:24,fontFamily:"monospace"}}>{diasUnicos.length>0?Math.round(diasPos/diasUnicos.length*100):0}%</div>
              <div style={{color:t.muted,fontSize:10}}>dias pos.</div>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {diasUnicos.sort((a,b)=>a.data.localeCompare(b.data)).map(d=>(
              <div key={d.data} title={`${d.data}: ${brl(d.res)}`} style={{
                width:26,height:26,borderRadius:6,
                background:d.res>0?"#22c55e":"#ef4444",
                opacity:0.65+Math.min(Math.abs(d.res)/800,0.35),
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:8,color:"#fff",fontWeight:700,cursor:"default"
              }}>{d.data.slice(8)}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ Por Dia da Semana + Por Ativo ══ */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        <div style={{...card,marginBottom:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:3,height:18,background:"#f59e0b",borderRadius:2}}/>
            <span style={{color:"#f59e0b",fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>Por Dia da Semana</span>
          </div>
          {byDay.length===0&&<div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
          {byDay.map((d,i)=>(
            <div key={d.day} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:i===0?"#f59e0b":t.text,fontSize:12,fontWeight:i===0?800:500}}>
                  {i===0?"🏆 ":""}{d.day}
                </span>
                <span style={{color:d.reais>=0?"#4ade80":"#f87171",fontSize:12,fontWeight:700,fontFamily:"monospace"}}>
                  {d.reais>=0?"+":""}{brl(d.reais)}<span style={{color:t.muted,fontWeight:400,fontSize:10,marginLeft:4}}>{d.count?Math.round(d.wins/d.count*100):0}%</span>
                </span>
              </div>
              <div style={{background:t.bg,borderRadius:4,height:5,overflow:"hidden"}}>
                <div style={{width:`${Math.abs(d.reais)/maxAbsDay*100}%`,height:"100%",background:d.reais>=0?"#22c55e":"#ef4444",borderRadius:4,transition:"width .4s ease"}}/>
              </div>
            </div>
          ))}
        </div>

        <div style={{...card,marginBottom:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:3,height:18,background:"#a78bfa",borderRadius:2}}/>
            <span style={{color:"#a78bfa",fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>Por Ativo</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {byAtivo.map(a=>(
              <div key={a.ativo} style={{
                background:a.reais>=0?"#052218":"#1a0505",
                border:`1px solid ${a.reais>=0?"#22c55e44":"#ef444444"}`,
                borderRadius:12,padding:"10px 14px",minWidth:100,textAlign:"center",
              }}>
                <div style={{color:t.accent,fontWeight:700,fontSize:12,marginBottom:3}}>{a.ativo}</div>
                <div style={{color:a.reais>=0?"#4ade80":"#f87171",fontWeight:900,fontSize:14,fontFamily:"monospace"}}>{a.reais>=0?"+":""}{brl(a.reais)}</div>
                <div style={{color:t.muted,fontSize:10,marginTop:2}}>{a.wins}/{a.count} · {a.count?Math.round(a.wins/a.count*100):0}%</div>
              </div>
            ))}
            {byAtivo.length===0&&<div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
          </div>
        </div>
      </div>

      {/* ══ POTENCIAL DA OPERAÇÃO ══ */}
      {(()=>{
        const opsFut = ops.filter(o=>(o.ativo==="WINFUT"||o.ativo==="WDOFUT")&&parseFloat(o.stopPontos)>0&&parseFloat(o.riscoRetornoCustom)>0);
        if(opsFut.length===0) return null;
        const analises = opsFut.map(o=>{
          const stop = parseFloat(o.stopPontos);
          const andou = parseFloat(o.riscoRetornoCustom);
          // Capturado = maior parcial ou resultadoPontos
          const p1 = parseFloat(o.parcialPontosMenos)||0;
          const extras = (o.parciais||[]).map(p=>parseFloat(p.pontos)||0);
          const todasParciais = [p1,...extras].filter(v=>v>0);
          const capturado = todasParciais.length>0 ? Math.max(...todasParciais) : Math.abs(parseFloat(o.resultadoPontos)||0);
          const rrPotencial = andou/stop;
          const rrCapturado = capturado/stop;
          const eficiencia = andou>0 ? (capturado/andou)*100 : 0;
          const isStop = o.resultadoGainStop==="Stop";
          return {stop, andou, capturado, rrPotencial, rrCapturado, eficiencia, isStop, ativo:o.ativo};
        });
        const total = analises.length;
        const stops = analises.filter(a=>a.isStop).length;
        const gains = total - stops;
        const mediaRRPot = analises.reduce((s,a)=>s+a.rrPotencial,0)/total;
        const mediaRRCap = analises.filter(a=>!a.isStop).reduce((s,a)=>s+a.rrCapturado,0)/Math.max(gains,1);
        const mediaEfic = analises.filter(a=>!a.isStop).reduce((s,a)=>s+a.eficiencia,0)/Math.max(gains,1);
        const ops3R = analises.filter(a=>a.rrPotencial>=3).length;
        const ops5R = analises.filter(a=>a.rrPotencial>=5).length;
        const pctStop = (stops/total)*100;
        // ── Geração de insight inteligente ──
        const insights = [];
        if(gains>0&&mediaRRPot>=2&&mediaEfic<40){
          insights.push({cor:"#f59e0b",icon:"⚠️",texto:`Atenção: o mercado está oferecendo em média ${mediaRRPot.toFixed(1)}x o seu risco, mas você captura apenas ${mediaEfic.toFixed(0)}% desse movimento. Suas operações têm potencial maior — considere segurar o trade por mais tempo antes de realizar.`});
        }
        if(gains>0&&mediaRRPot>=2&&mediaEfic>=40&&mediaEfic<70){
          insights.push({cor:"#60a5fa",icon:"📈",texto:`Suas operações estão aproveitando ${mediaEfic.toFixed(0)}% do potencial disponível. O mercado oferece em média ${mediaRRPot.toFixed(1)}x o risco. Há espaço para melhorar — experimente mover o stop para o ponto de entrada após a P1 e deixar rodar.`});
        }
        if(gains>0&&mediaEfic>=70){
          insights.push({cor:"#22c55e",icon:"✅",texto:`Excelente aproveitamento: você captura ${mediaEfic.toFixed(0)}% do potencial médio das suas operações. Suas saídas estão bem posicionadas em relação ao movimento do mercado.`});
        }
        if(pctStop>50){
          insights.push({cor:"#f87171",icon:"🛑",texto:`${pctStop.toFixed(0)}% das suas operações estoparam antes de atingir o alvo. Seus alvos podem estar distantes demais da realidade do mercado. Considere reduzir o alvo ou utilizar parciais mais próximas do stop para melhorar a taxa de aproveitamento.`});
        }
        if(ops3R>=2&&gains>0){
          insights.push({cor:"#a78bfa",icon:"🎯",texto:`${ops3R} de ${total} operações oferecem potencial de 3R ou mais (${ops5R} delas acima de 5R). Quando o mercado abre espaço, ele costuma ir longe — avalie manter pelo menos 1 contrato rodando.`});
        }
        if(insights.length===0&&gains>0){
          insights.push({cor:"#94a3b8",icon:"📊",texto:`Com base em ${total} operações analisadas: potencial médio de ${mediaRRPot.toFixed(1)}R e captura de ${mediaRRCap.toFixed(1)}R. Continue registrando para obter análises mais precisas.`});
        }
        return (
          <div style={{...card,border:"1px solid #a78bfa33",background:"linear-gradient(135deg,#0d0a1a,#000)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{width:3,height:18,background:"#a78bfa",borderRadius:2}}/>
              <span style={{color:"#a78bfa",fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>🔬 Potencial da Operação</span>
              <span style={{marginLeft:"auto",background:"#a78bfa18",border:"1px solid #a78bfa33",borderRadius:99,padding:"2px 10px",color:"#a78bfa",fontSize:10,fontWeight:700}}>{total} ops analisadas</span>
            </div>
            <div style={{color:t.muted,fontSize:11,marginBottom:16}}>WINFUT e WDOFUT com stop e RR preenchidos</div>
            {/* Métricas */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}}>
              {[
                {icon:"🎯",label:"RR Médio Potencial",value:`${mediaRRPot.toFixed(1)}R`,cor:"#a78bfa",sub:"o que o mercado ofereceu"},
                {icon:"✂️",label:"RR Médio Capturado",value:`${mediaRRCap.toFixed(1)}R`,cor:"#60a5fa",sub:"o que você pegou"},
                {icon:"📊",label:"Eficiência Média",value:`${mediaEfic.toFixed(0)}%`,cor:mediaEfic>=60?"#22c55e":mediaEfic>=35?"#f59e0b":"#f87171",sub:"capturado / potencial"},
                {icon:"🛑",label:"Taxa de Stop",value:`${pctStop.toFixed(0)}%`,cor:pctStop>50?"#f87171":pctStop>30?"#f59e0b":"#22c55e",sub:`${stops} de ${total} ops`},
                {icon:"🚀",label:"Ops c/ pot. ≥3R",value:`${ops3R}`,cor:"#fbbf24",sub:`${ops5R} acima de 5R`},
              ].map(({icon,label,value,cor,sub})=>(
                <div key={label} style={{background:cor+"0d",border:`1px solid ${cor}33`,borderRadius:10,padding:"10px 14px",flex:1,minWidth:120}}>
                  <div style={{fontSize:18,marginBottom:4}}>{icon}</div>
                  <div style={{color:cor,fontWeight:900,fontSize:18,fontFamily:"monospace"}}>{value}</div>
                  <div style={{color:t.muted,fontSize:10,marginTop:2,fontWeight:600}}>{label}</div>
                  <div style={{color:t.muted,fontSize:9,marginTop:1,opacity:0.7}}>{sub}</div>
                </div>
              ))}
            </div>
            {/* Distribuição por faixa de potencial */}
            <div style={{marginBottom:18}}>
              <div style={{color:t.muted,fontSize:11,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Distribuição por Potencial (RR)</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  {label:"Stop (não atingiu alvo)",count:stops,cor:"#f87171",check:(a)=>a.isStop},
                  {label:"Abaixo de 1R",count:analises.filter(a=>!a.isStop&&a.rrPotencial<1).length,cor:"#f97316",check:null},
                  {label:"1R a 2R",count:analises.filter(a=>!a.isStop&&a.rrPotencial>=1&&a.rrPotencial<2).length,cor:"#f59e0b",check:null},
                  {label:"2R a 3R",count:analises.filter(a=>!a.isStop&&a.rrPotencial>=2&&a.rrPotencial<3).length,cor:"#84cc16",check:null},
                  {label:"3R a 5R",count:analises.filter(a=>!a.isStop&&a.rrPotencial>=3&&a.rrPotencial<5).length,cor:"#22c55e",check:null},
                  {label:"5R ou mais",count:analises.filter(a=>!a.isStop&&a.rrPotencial>=5).length,cor:"#a78bfa",check:null},
                ].map(b=>(
                  <div key={b.label} style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{color:b.cor,fontSize:11,fontWeight:700,minWidth:160}}>{b.label}</span>
                    <div style={{flex:1,background:t.border,borderRadius:4,height:8,overflow:"hidden"}}>
                      <div style={{width:`${total>0?(b.count/total)*100:0}%`,height:"100%",background:b.cor,borderRadius:4,transition:"width .5s"}}/>
                    </div>
                    <span style={{color:b.cor,fontWeight:700,fontSize:12,minWidth:24,textAlign:"right"}}>{b.count}</span>
                    <span style={{color:t.muted,fontSize:10,minWidth:32,textAlign:"right"}}>{total>0?Math.round(b.count/total*100):0}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Insights escritos */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{color:t.muted,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Análise</div>
              {insights.map((ins,i)=>(
                <div key={i} style={{background:ins.cor+"0d",border:`1px solid ${ins.cor}33`,borderRadius:10,padding:"12px 16px",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{ins.icon}</span>
                  <span style={{color:ins.cor,fontSize:12,lineHeight:1.7,fontWeight:500}}>{ins.texto}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ══ Evolução do Saldo ══ */}
      {chartData.length>1&&(
        <div style={{...card}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <div style={{width:3,height:18,background:"#3b82f6",borderRadius:2}}/>
            <span style={{color:"#3b82f6",fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>Evolução do Saldo</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border}/>
              <XAxis dataKey="name" tick={{fill:t.muted,fontSize:10}} axisLine={{stroke:t.border}}/>
              <YAxis tick={{fill:t.muted,fontSize:10}} axisLine={{stroke:t.border}} tickFormatter={v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/>
              <Tooltip contentStyle={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text}} formatter={v=>[brl(v),"Saldo"]}/>
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4"/>
              <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} dot={{fill:"#3b82f6",r:2}} activeDot={{r:5}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      </>)}
    </div>
  );
}



// ══════════════════════════════════════════════
// IMPOSTO DE RENDA TAB
// ══════════════════════════════════════════════
// ── Tabela Carnê-Leão 2025 — vigente para fatos geradores em 2026 (RF) ─────────
const TABELA_CARNE_LEAO = [
  { ate: 2428.80,  aliq: 0,     ded: 0      },
  { ate: 2826.65,  aliq: 0.075, ded: 182.16 },
  { ate: 3751.05,  aliq: 0.15,  ded: 394.16 },
  { ate: 4664.68,  aliq: 0.225, ded: 675.49 },
  { ate: Infinity, aliq: 0.275, ded: 908.73 },
];
const DESCONTO_SIMPLIFICADO_CL     = 564.62; // teto: 20% da base, máx R$564,62/mês
const DESCONTO_SIMPLIFICADO_PCT_CL = 0.20;   // 20% da base tributável
const DEDUCAO_DEPENDENTE_CL        = 189.59; // por dependente/mês
const LIMITE_ISENTO_CL             = 2428.80;
const LIMITE_ISENTO_COM_DESC       = 2993.42; // 2428.80 + 564.62

function calcCarneLeao(bruto, tipoDesc, dependentes, outrasDeducoes) {
  let deducao;
  if (tipoDesc === "simplificado") {
    deducao = 0;
  } else {
    const dedDep = (parseInt(dependentes)||0) * DEDUCAO_DEPENDENTE_CL;
    deducao = dedDep + (parseFloat(outrasDeducoes)||0);
  }
  const base  = Math.max(0, bruto - deducao);
  const faixa = TABELA_CARNE_LEAO.find(f => base <= f.ate);
  if (!faixa || faixa.aliq === 0) return { base, deducao, aliq: 0, ded: 0, impostoBase: 0, irDevido: 0, isento: true };
  const impostoBase = base * faixa.aliq;
  const irDevido = Math.max(0, impostoBase - faixa.ded);
  return { base, deducao, aliq: faixa.aliq, ded: faixa.ded, impostoBase, irDevido, isento: false };
}

// Busca PTAX BCB: último dia útil da 1ª quinzena do mês anterior
async function buscarPTAX(dataRecebimento) {
  if (!dataRecebimento) return null;
  const dt = new Date(dataRecebimento + 'T12:00:00');
  // mês anterior
  let ano = dt.getFullYear(), mes = dt.getMonth(); // 0-indexed
  if (mes === 0) { mes = 11; ano--; } else { mes--; }
  // tenta do dia 15 para baixo até encontrar cotação
  for (let dia = 15; dia >= 1; dia--) {
    const mm = String(mes + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    const dtStr = `${mm}-${dd}-${ano}`; // formato MM-DD-YYYY exigido pela BCB
    try {
      const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='USD'&@dataCotacao='${dtStr}'&$format=json&$select=cotacaoVenda,dataHoraCotacao`;
      const res  = await fetch(url);
      const json = await res.json();
      if (json.value && json.value.length > 0) {
        const taxa = json.value[json.value.length - 1].cotacaoVenda;
        const dataRef = `${dd}/${mm}/${ano}`;
        return { taxa, dataRef };
      }
    } catch (e) { /* continua tentando */ }
  }
  return null;
}

function CarneLeaoCalculadora({ t, prefillDarff, onClearPrefill }) {
  const brl = v => `R$ ${(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const inp = {width:'100%',background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:'9px 12px',color:t.text,fontSize:13,outline:'none',boxSizing:'border-box'};
  const label = (txt) => <div style={{color:t.muted,fontSize:11,fontWeight:700,marginBottom:5}}>{txt}</div>;

  // ── Estado ───────────────────────────────────────────────────────────────────
  const [tipoRend,     setTipoRend]     = React.useState('exterior'); // 'interior'|'exterior'
  const [nomeEmpresa,  setNomeEmpresa]  = React.useState('');
  const [paisOrigem,   setPaisOrigem]   = React.useState('Estados Unidos');
  const [dataReceb,    setDataReceb]    = React.useState('');
  const [moeda,        setMoeda]        = React.useState('USD');
  const [valorUSD,     setValorUSD]     = React.useState('');
  const [ptax,         setPtax]         = React.useState(null);   // {taxa, dataRef}
  const [ptaxLoading,  setPtaxLoading]  = React.useState(false);
  const [ptaxManual,   setPtaxManual]   = React.useState('');     // usuário pode digitar manualmente
  const [valorBRL,     setValorBRL]     = React.useState('');
  const [tipoDesc,     setTipoDesc]     = React.useState('simplificado');
  const [dependentes,  setDependentes]  = React.useState('0');
  const [outrasDeducoes, setOutrasDeducoes] = React.useState('');
  const [mesRef,       setMesRef]       = React.useState('');
  const [mulJur,       setMulJur]       = React.useState(null);
  const [calcMJLoad,   setCalcMJLoad]   = React.useState(false);
  const [vencimento,   setVencimento]   = React.useState('');

  React.useEffect(() => {
    if (!prefillDarff) return;
    if (prefillDarff.valor != null) {
      setValorBRL(String(prefillDarff.valor));
      setValorUSD('');
      setMoeda('BRL');
    }
    if (prefillDarff.mes) {
      setMesRef(prefillDarff.mes.replace('-', '/'));
    }
    setTipoDesc('simplificado');
    setDependentes('0');
    if (onClearPrefill) onClearPrefill();
  }, [prefillDarff, onClearPrefill]);

  // Cotação efetiva = ptax buscado OU manual
  const taxaEfetiva = parseFloat(ptaxManual) || (ptax ? ptax.taxa : 0);

  // Valor BRL calculado
  const brutoFinal = React.useMemo(() => {
    if (moeda === 'USD') {
      const usd = parseFloat(valorUSD) || 0;
      return usd * taxaEfetiva;
    }
    return parseFloat(valorBRL) || 0;
  }, [moeda, valorUSD, taxaEfetiva, valorBRL]);

  // Resultado Carnê-Leão
  const result = React.useMemo(() => {
    if (brutoFinal <= 0) return null;
    return calcCarneLeao(brutoFinal, tipoDesc, dependentes, outrasDeducoes);
  }, [brutoFinal, tipoDesc, dependentes, outrasDeducoes]);

  // Preenche mês de referência automaticamente pela data de recebimento
  React.useEffect(() => {
    if (!dataReceb) return;
    const [yyyy,mm] = dataReceb.split('-');
    if (yyyy && mm) setMesRef(`${mm}/${yyyy}`);
  }, [dataReceb]);

  // Vencimento: último dia do mês seguinte ao mês de referência
  React.useEffect(() => {
    if (!mesRef) { setVencimento(''); return; }
    const [mm, yyyy] = mesRef.split('/');
    if (!mm || !yyyy) return;
    const m = parseInt(mm)-1, y = parseInt(yyyy);
    const pm = m===11?0:m+1, py = m===11?y+1:y;
    const ult = new Date(py, pm+1, 0);
    setVencimento(`${String(ult.getDate()).padStart(2,'0')}/${String(ult.getMonth()+1).padStart(2,'0')}/${ult.getFullYear()}`);
  }, [mesRef]);

  // Busca PTAX ao mudar data de recebimento
  React.useEffect(() => {
    if (!dataReceb || moeda !== 'USD') return;
    setPtaxLoading(true); setPtax(null); setPtaxManual('');
    buscarPTAX(dataReceb).then(r => { setPtax(r); setPtaxLoading(false); });
  }, [dataReceb, moeda]);

  // Máscaras
  const handleMesRef = raw => {
    const d = raw.replace(/\D/g,'').slice(0,6);
    setMesRef(d.length > 2 ? d.slice(0,2)+'/'+d.slice(2) : d);
  };

  // Calcular multa/juros
  const calcMultaJuros = async () => {
    if (!vencimento || !result || result.irDevido <= 0) return;
    setCalcMJLoad(true); setMulJur(null);
    let dtHoje = new Date();
    try {
      const r = await fetch('https://worldtimeapi.org/api/timezone/America/Sao_Paulo');
      const j = await r.json();
      if (j.datetime) dtHoje = new Date(j.datetime);
    } catch(e) {}
    const pd = s => { const [d,m,y]=s.split('/'); return new Date(parseInt(y),parseInt(m)-1,parseInt(d)); };
    const dtV = pd(vencimento);
    const val = result.irDevido;
    if (dtHoje <= dtV) {
      setMulJur({ dentro: true, total: val });
    } else {
      const dias = Math.floor((dtHoje - dtV)/864e5);
      const mp   = Math.min(dias*0.0033, 0.20);
      const mc   = Math.floor(dias/30);
      const js   = val*(mc*0.01075+0.01);
      setMulJur({ dentro:false, dias, multa:val*mp, juros:js, multaPct:(mp*100).toFixed(2), total:val+val*mp+js });
    }
    setCalcMJLoad(false);
  };

  const btnSel = (ativo, onClick, children, cor='#3b82f6') => (
    <button onClick={onClick} style={{
      padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700,
      border:`2px solid ${ativo ? cor : t.border}`,
      background: ativo ? cor+'20' : 'transparent',
      color: ativo ? cor : t.muted, transition:'all .15s',
    }}>{children}</button>
  );

  const cardSt = {background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:'18px 20px',marginBottom:14};
  const inpSm  = {...inp, padding:'7px 10px', fontSize:12};

  return (
    <div style={{...cardSt, border:'1px solid #3b82f644', background:'linear-gradient(135deg,#03102088,#000)'}}>
      {/* Cabeçalho */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
        <div style={{width:3,height:20,background:'#3b82f6',borderRadius:2}}/>
        <span style={{color:'#3b82f6',fontWeight:800,fontSize:13,letterSpacing:1,textTransform:'uppercase'}}>🦁 Carnê-Leão — DARF 0190</span>
        <span style={{marginLeft:'auto',background:'#3b82f622',border:'1px solid #3b82f644',borderRadius:99,padding:'2px 10px',color:'#60a5fa',fontSize:10,fontWeight:700}}>Receita Federal 2025</span>
      </div>

      {/* ── Seção 1: Dados da operação ── */}
      <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:12,padding:'14px 16px',marginBottom:14}}>
        <div style={{color:'#60a5fa',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>1️⃣ Tipo de Rendimento</div>
        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          {btnSel(tipoRend==='exterior',()=>setTipoRend('exterior'),'🌐 Exterior (Prop Firm / EUA)','#3b82f6')}
          {btnSel(tipoRend==='interior',()=>setTipoRend('interior'),'🇧🇷 Pessoa Física / Interior','#22c55e')}
        </div>
        {tipoRend==='exterior'&&(
          <>
            <div style={{color:'#60a5fa',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>2️⃣ Dados da Fonte Pagadora</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:4}}>
              <div>
                {label('🏢 Nome da Empresa / Mesa')}
                <input type="text" placeholder="Ex: Apex Trader Funding" value={nomeEmpresa} onChange={e=>setNomeEmpresa(e.target.value)} style={inp}/>
              </div>
              <div>
                {label('🌐 País de Origem')}
                <input type="text" placeholder="Estados Unidos" value={paisOrigem} onChange={e=>setPaisOrigem(e.target.value)} style={inp}/>
              </div>
            </div>
            <div style={{background:'#3b82f60d',border:'1px solid #3b82f622',borderRadius:8,padding:'8px 12px',marginTop:8}}>
              <div style={{color:'#60a5fa',fontSize:10,fontWeight:700}}>ℹ️ Tipo: Exterior · CPF/CNPJ: deixe vazio para empresa estrangeira</div>
            </div>
          </>
        )}
      </div>

      {/* ── Seção 2: Data + Valor ── */}
      <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:12,padding:'14px 16px',marginBottom:14}}>
        <div style={{color:'#60a5fa',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>3️⃣ Data e Valor Recebido</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div>
            {label('📅 Data que o dinheiro entrou na conta')}
            <input type="date" value={dataReceb} onChange={e=>setDataReceb(e.target.value)} style={inp}/>
            {dataReceb&&<div style={{color:t.muted,fontSize:9,marginTop:3}}>Mês de referência: {mesRef}</div>}
          </div>
          <div>
            {label('💱 Moeda Recebida')}
            <div style={{display:'flex',gap:6}}>
              {btnSel(moeda==='USD',()=>setMoeda('USD'),'$ USD','#f59e0b')}
              {btnSel(moeda==='BRL',()=>setMoeda('BRL'),'R$ BRL','#22c55e')}
            </div>
          </div>
        </div>
        {moeda==='USD'&&(
          <div style={{background:'#f59e0b0a',border:'1px solid #f59e0b33',borderRadius:10,padding:'12px 14px',marginBottom:10}}>
            <div style={{color:'#f59e0b',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>💱 Conversor USD → BRL (Banco Central)</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div>
                {label('$ Valor recebido em USD')}
                <input type="number" placeholder="Ex: 500.00" value={valorUSD} onChange={e=>setValorUSD(e.target.value)} style={inp}/>
              </div>
              <div>
                {label('📊 Cotação PTAX BCB')}
                {ptaxLoading&&<div style={{color:'#f59e0b',fontSize:12,padding:'9px 0'}}>⏳ Buscando cotação...</div>}
                {!ptaxLoading&&ptax&&!ptaxManual&&(
                  <div style={{background:'#f59e0b15',border:'1px solid #f59e0b44',borderRadius:8,padding:'8px 12px'}}>
                    <div style={{color:'#f59e0b',fontWeight:900,fontSize:16,fontFamily:'monospace'}}>R$ {ptax.taxa.toFixed(4)}</div>
                    <div style={{color:t.muted,fontSize:10,marginTop:2}}>PTAX · {ptax.dataRef}</div>
                  </div>
                )}
                {!ptaxLoading&&!dataReceb&&<div style={{color:t.muted,fontSize:11,padding:'9px 0'}}>Informe a data para buscar cotação</div>}
                {!ptaxLoading&&dataReceb&&!ptax&&!ptaxManual&&<div style={{color:'#f59e0b',fontSize:11,padding:'9px 0'}}>⚠️ Cotação não encontrada. Digite abaixo:</div>}
                {dataReceb&&(
                  <button onClick={()=>{ setPtaxLoading(true); setPtax(null); setPtaxManual(''); buscarPTAX(dataReceb).then(r=>{ setPtax(r); setPtaxLoading(false); }); }} disabled={ptaxLoading}
                    style={{marginTop:6,background:'transparent',border:`1px solid #f59e0b66`,borderRadius:6,color:'#f59e0b',padding:'5px 12px',cursor:'pointer',fontSize:11,fontWeight:700,width:'100%'}}>
                    {ptaxLoading?'⏳ Buscando...':'🔄 Atualizar PTAX BCB'}
                  </button>
                )}
              </div>
            </div>
            <div>
              {label('✏️ Cotação manual (se necessário)')}
              <input type="number" step="0.0001" placeholder="Ex: 5.8547 (deixe vazio para usar BCB)" value={ptaxManual} onChange={e=>setPtaxManual(e.target.value)} style={inpSm}/>
              <div style={{color:t.muted,fontSize:9,marginTop:3}}>Regra RF: PTAX do último dia útil da 1ª quinzena do mês anterior ao recebimento</div>
            </div>
            {(parseFloat(valorUSD)||0)>0&&taxaEfetiva>0&&(
              <div style={{background:'#22c55e15',border:'1px solid #22c55e33',borderRadius:8,padding:'10px 14px',marginTop:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{color:t.muted,fontSize:10}}>Valor convertido</div>
                  <div style={{color:'#4ade80',fontWeight:900,fontSize:18,fontFamily:'monospace'}}>{brl(brutoFinal)}</div>
                </div>
                <div style={{color:t.muted,fontSize:11,textAlign:'right'}}>
                  <div>USD {parseFloat(valorUSD).toLocaleString('pt-BR',{minimumFractionDigits:2})} × {taxaEfetiva.toFixed(4)}</div>
                </div>
              </div>
            )}
          </div>
        )}
        {moeda==='BRL'&&(
          <div>
            {label('R$ Valor recebido em Reais')}
            <input type="number" placeholder="Ex: 2600.00" value={valorBRL} onChange={e=>setValorBRL(e.target.value)} style={inp}/>
          </div>
        )}
      </div>

      {/* ── Seção 3: Deduções ── */}
      <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:12,padding:'14px 16px',marginBottom:14}}>
        <div style={{color:'#60a5fa',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>4️⃣ Tipo de Desconto / Deduções</div>
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          {btnSel(tipoDesc==='simplificado',()=>setTipoDesc('simplificado'),'✅ Simplificado','#22c55e')}
          {btnSel(tipoDesc==='detalhado',()=>setTipoDesc('detalhado'),'📋 Detalhado (dependentes + deduções)','#a855f7')}
        </div>
        {tipoDesc==='detalhado'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              {label(`👨‍👩‍👧 Nº de Dependentes (R$ ${DEDUCAO_DEPENDENTE_CL.toFixed(2)}/dep)`)}
              <input type="number" min="0" placeholder="0" value={dependentes} onChange={e=>setDependentes(e.target.value)} style={inp}/>
            </div>
            <div>
              {label('➖ Outras Deduções (Pensão, INSS…)')}
              <input type="number" placeholder="0,00" value={outrasDeducoes} onChange={e=>setOutrasDeducoes(e.target.value)} style={inp}/>
            </div>
          </div>
        )}
      </div>

      {/* ── Seção 4: Tabela progressiva ── */}
      <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:12,padding:'14px 16px',marginBottom:14}}>
        <div style={{color:'#60a5fa',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>📊 Tabela Progressiva Carnê-Leão 2025 — Receita Federal</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr>
                {['Faixa de Rendimento (base)','Alíquota','Parcela a Deduzir','Situação'].map(h=>(
                  <th key={h} style={{color:t.muted,fontWeight:700,padding:'6px 10px',textAlign:'left',borderBottom:`1px solid ${t.border}`,fontSize:10,textTransform:'uppercase',letterSpacing:.5}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Até R$ 2.428,80','0%','—','Isento'],
                ['R$ 2.428,81 até R$ 2.826,65','7,5%','R$ 182,16','Tributado'],
                ['R$ 2.826,66 até R$ 3.751,05','15%','R$ 394,16','Tributado'],
                ['R$ 3.751,06 até R$ 4.664,68','22,5%','R$ 675,49','Tributado'],
                ['Acima de R$ 4.664,68','27,5%','R$ 908,73','Tributado'],
              ].map(([faixa,aliq,ded,sit],i)=>{
                const aliqVal = [0,0.075,0.15,0.225,0.275][i];
                const ativo = result && (i===0 ? result.isento : result.aliq===aliqVal&&!result.isento);
                return (
                  <tr key={i} style={{background:ativo?'#3b82f618':'transparent'}}>
                    <td style={{padding:'7px 10px',color:ativo?'#93c5fd':t.text,fontWeight:ativo?700:400,borderBottom:`1px solid ${t.border}44`}}>{faixa}</td>
                    <td style={{padding:'7px 10px',color:ativo?(i===0?'#4ade80':'#f59e0b'):t.muted,fontWeight:ativo?900:400,fontFamily:'monospace',borderBottom:`1px solid ${t.border}44`}}>{aliq}</td>
                    <td style={{padding:'7px 10px',color:ativo?'#fbbf24':t.muted,borderBottom:`1px solid ${t.border}44`}}>{ded}</td>
                    <td style={{padding:'7px 10px',borderBottom:`1px solid ${t.border}44`}}>
                      <span style={{background:i===0?'#22c55e22':'#f59e0b22',color:i===0?'#4ade80':'#f59e0b',borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:700}}>{sit}</span>
                      {ativo&&<span style={{marginLeft:6,color:'#93c5fd',fontSize:10}}>← você aqui</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Seção 5: Resultado ── */}
      {result&&brutoFinal>0&&(
        <div>
          {result.isento?(
            <div style={{background:'#22c55e12',border:'2px solid #22c55e55',borderRadius:14,padding:'20px 22px',textAlign:'center',marginBottom:14}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{color:'#4ade80',fontWeight:900,fontSize:16,marginBottom:6}}>Rendimento isento — sem DARF a pagar</div>
              <div style={{color:'#4a6a4a',fontSize:12,lineHeight:1.6}}>Base: <strong style={{color:'#4ade80'}}>{brl(result.base)}</strong> · Desconto: <strong style={{color:'#4ade80'}}>{brl(result.deducao)}</strong></div>
              <div style={{color:'#4ade80',fontSize:11,marginTop:8,fontWeight:700}}>⚠️ Mesmo isento, registre o rendimento no Carnê-Leão Web (obrigatório)</div>
            </div>
          ):(
            <div style={{marginBottom:14}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
                {[['Rendimento Bruto',brl(brutoFinal),'#60a5fa'],['Desconto Aplicado',brl(result.ded||result.deducao),'#22c55e'],['Base × Alíquota',brl(result.impostoBase),'#f59e0b'],['IR Carnê-Leão',brl(result.irDevido),'#ef4444']].map(([lbl,val,cor])=>(
                  <div key={lbl} style={{background:'#0a0a0a',border:`1px solid ${cor}44`,borderRadius:10,padding:'12px',textAlign:'center'}}>
                    <div style={{color:t.muted,fontSize:9,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{lbl}</div>
                    <div style={{color:cor,fontWeight:900,fontSize:15,fontFamily:'monospace'}}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'#ef444410',border:'1px solid #ef444444',borderRadius:10,padding:'12px 14px',marginBottom:12}}>
                <div style={{color:'#f87171',fontSize:11,fontWeight:700,marginBottom:2}}>Cálculo: {brl(result.base)} × {(result.aliq*100).toFixed(1)}% − {brl(result.ded)} = <span style={{fontSize:14}}>{brl(result.irDevido)}</span></div>
                <div style={{color:t.muted,fontSize:10}}>DARF código <strong style={{color:'#60a5fa'}}>0190</strong> · Mês: {mesRef}</div>
              </div>
              {vencimento&&(
                <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,padding:'12px 14px',marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div>
                      <div style={{color:t.muted,fontSize:10,fontWeight:700}}>📅 Vencimento DARF 0190</div>
                      <div style={{color:'#f59e0b',fontWeight:900,fontSize:15,marginTop:2}}>{vencimento}</div>
                      <div style={{color:t.muted,fontSize:9}}>Último dia útil do mês seguinte</div>
                    </div>
                    <button onClick={calcMultaJuros} disabled={calcMJLoad} style={{background:'#3b82f618',border:'1px solid #3b82f644',borderRadius:8,color:'#60a5fa',padding:'9px 16px',cursor:'pointer',fontSize:12,fontWeight:700}}>
                      {calcMJLoad?'⏳ Calculando...':'⚠️ Calcular Multa/Juros'}
                    </button>
                  </div>
                  {mulJur&&(mulJur.dentro?(
                    <div style={{color:'#4ade80',fontSize:12,fontWeight:700,padding:'6px 10px',background:'#22c55e12',borderRadius:8}}>✅ Dentro do prazo — DARF: {brl(result.irDevido)}</div>
                  ):(
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:6}}>
                      {[['Dias em Atraso',`${mulJur.dias} dias`,'#f59e0b'],['Multa',`${mulJur.multaPct}%`,'#ef4444'],['Juros',brl(mulJur.juros),'#ef4444'],['Total DARF',brl(mulJur.total),'#f87171']].map(([l,v,c])=>(
                        <div key={l} style={{background:'#1a0505',border:'1px solid #ef444433',borderRadius:8,padding:'8px',textAlign:'center'}}>
                          <div style={{color:t.muted,fontSize:9,textTransform:'uppercase',marginBottom:2}}>{l}</div>
                          <div style={{color:c,fontWeight:900,fontSize:13,fontFamily:'monospace'}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Botão e-CAC + Guia passo a passo ── */}
      <a href="https://cav.receita.fazenda.gov.br/autenticacao/login" target="_blank" rel="noopener noreferrer"
        style={{display:'block',textDecoration:'none',background:'linear-gradient(135deg,#1d4ed8,#2563eb)',borderRadius:10,color:'#fff',padding:'13px 20px',fontSize:13,fontWeight:800,textAlign:'center',letterSpacing:0.5,marginBottom:14}}>
        🔗 Acessar e-CAC / Carnê-Leão Web (Receita Federal)
      </a>
      <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:12,padding:'16px 18px'}}>
        <div style={{color:'#60a5fa',fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>📋 Como lançar no Carnê-Leão Web — Passo a Passo</div>
        {[
          {n:'1',t:'Acesse o e-CAC',d:'Clique no botão acima. Faça login com sua conta Gov.br (nível Prata ou Ouro — use o app Gov.br no celular).'},
          {n:'2',t:'Abra o Carnê-Leão Web',d:'No e-CAC clique em "Declarações e Demonstrativos" → "Carnê-Leão Web". Ou pesquise "Carnê-Leão" na barra de busca.'},
          {n:'3',t:'Selecione o ano e mês',d:`Clique no ano atual → selecione o mês em que o dinheiro entrou na sua conta${mesRef?' ('+mesRef+')':''}.`},
          {n:'4',t:'Adicione o rendimento',d:'Clique em "Incluir Rendimento".\n• Mesa estrangeira (EUA): selecione "Exterior"\n• Mesa brasileira: selecione "Pessoa Física"'},
          {n:'5',t:'Preencha os dados',d:`• Nome da fonte pagadora: nome da sua mesa\n• Valor recebido: ${brutoFinal>0?brl(brutoFinal):'o valor calculado acima'}\n• CPF/CNPJ: deixe vazio se empresa estrangeira\n• País: Estados Unidos (ou o país da mesa)`},
          {n:'6',t:'Gere o DARF',d:`No menu do Carnê-Leão clique em "DARF" → "Emitir DARF". Código sempre 0190.${result&&!result.isento?' Valor: '+brl(result.irDevido)+'.':''}`},
          {n:'7',t:'Pague',d:'Pague no internet banking, lotérica ou app do banco. Prazo: último dia útil do mês seguinte ao que recebeu.'},
        ].map(({n,t:titulo,d})=>(
          <div key={n} style={{display:'flex',gap:12,marginBottom:12,alignItems:'flex-start'}}>
            <div style={{minWidth:26,height:26,borderRadius:'50%',background:'#2563eb',color:'#fff',fontWeight:900,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{n}</div>
            <div>
              <div style={{color:t.text,fontWeight:700,fontSize:12,marginBottom:2}}>{titulo}</div>
              <div style={{color:t.muted,fontSize:11,lineHeight:1.7,whiteSpace:'pre-line'}}>{d}</div>
            </div>
          </div>
        ))}
        <div style={{background:'#f59e0b12',border:'1px solid #f59e0b33',borderRadius:8,padding:'10px 14px',marginTop:4}}>
          <div style={{color:'#f59e0b',fontWeight:700,fontSize:11,marginBottom:3}}>⚠️ Prazo</div>
          <div style={{color:t.muted,fontSize:11}}>DARF vence no <strong style={{color:'#fbbf24'}}>último dia útil do mês seguinte</strong> ao recebimento. Atraso: multa 0,33%/dia (máx 20%) + juros SELIC.</div>
        </div>
      </div>
    </div>
  );
}

// ── Utilitários para importar Notas de Corretagem em PDF ──────────────────

// Junta itens de uma linha usando proximidade de X para decidir espaço.
// Se o item seguinte começa logo onde o anterior termina (gap < 3 unidades
// OU gap < 30% da largura de um char médio), não adiciona espaço.
// Isso resolve PDFs que extraem "Total" como ["T","otal"] ou ["T ","o ","t ","a ","l "].
function joinPorX(itens) {
  if (!itens.length) return "";
  // Calcula largura média por char para estimar threshold de espaço
  const totalChars = itens.reduce((s, it) => s + (it.str.length || 1), 0);
  const totalW = itens.reduce((s, it) => s + (it.w || 0), 0);
  const charW = totalChars > 0 && totalW > 0 ? totalW / totalChars : 8;
  const spaceThreshold = charW * 0.6; // gap > 60% de um char = espaço

  let result = itens[0].str;
  for (let i = 1; i < itens.length; i++) {
    const prev = itens[i - 1];
    const curr = itens[i];
    const endX = prev.x + (prev.w || prev.str.length * charW);
    const gap = curr.x - endX;
    result += (gap > spaceThreshold ? " " : "") + curr.str;
  }
  return result;
}

async function extrairTextoPDF(file, senha = "") {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const arrayBuffer = await file.arrayBuffer();
  const params = { data: arrayBuffer };
  if (senha) params.password = senha;
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument(params).promise;
  } catch (err) {
    // PasswordException: code 1 = precisa senha, code 2 = senha errada
    if (err && err.name === "PasswordException") {
      const e = new Error(err.code === 2 ? "invalid_password" : "password_required");
      e.code = err.code === 2 ? "invalid_password" : "password_required";
      throw e;
    }
    throw err;
  }
  const paginas = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Ordena por posição Y (topo→baixo) depois X (esquerda→direita)
    // Isso garante leitura correta de tabelas — sem isso a ordem é do stream PDF
    const itens = content.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({
        str: it.str.trim(),
        x: it.transform[4],
        y: it.transform[5],
        w: it.width || 0,
      }))
      .sort((a, b) => {
        const dy = b.y - a.y;
        if (Math.abs(dy) > 6) return dy;   // linhas diferentes: Y decrescente
        return a.x - b.x;                  // mesma linha: X crescente
      });
    // Agrupa em linhas (itens com Y próximo = mesma linha, threshold 6pt)
    // Usa X-position para decidir espaço: se item começa logo onde o anterior termina → sem espaço
    const linhas = [];
    let linhaAtual = [], lastY = null;
    for (const it of itens) {
      if (lastY === null || Math.abs(it.y - lastY) <= 6) {
        linhaAtual.push(it);
        lastY = it.y;
      } else {
        linhas.push(joinPorX(linhaAtual));
        linhaAtual = [it];
        lastY = it.y;
      }
    }
    if (linhaAtual.length) linhas.push(joinPorX(linhaAtual));
    paginas.push(linhas.join("\n"));
  }
  return paginas;
}

// Divide um PDF multi-nota (várias páginas = várias notas) em blocos por data
function splitNotasMultiplas(paginas) {
  // Cada página com "Data pregão" ou "Data de Referência" é uma nota separada.
  // Exceção XP: as notas têm 2 páginas e AMBAS repetem "Data de Referência" no cabeçalho.
  // A página 2 da XP tem "Data da Consulta" mas NÃO tem "Data pregão" no corpo →
  // é continuação da mesma nota, não uma nova nota.
  const blocos = [];
  let atual = [];
  const rxDataInicio = /Data\s+preg.o\s+\d{2}\/\d{2}\/\d{4}|Data\s+de\s+Refer.ncia[\s:]+\d{2}\/\d{2}\/\d{4}/i;
  const rxConsulta  = /Data\s+da\s+Consulta/i;   // presente em todo cabeçalho XP
  const rxPreg      = /Data\s+preg.o/i;           // só no corpo da primeira página XP
  for (const pag of paginas) {
    const norm = pag.normalize("NFC");
    if (rxDataInicio.test(norm) && atual.length > 0) {
      // Página de detalhe XP: tem cabeçalho repetido (Data da Consulta) mas não tem
      // "Data pregão" no corpo → é continuação, não nova nota
      const paginaDetalheXP = rxConsulta.test(norm) && !rxPreg.test(norm);
      if (paginaDetalheXP) {
        atual.push(norm); // junta com a página anterior (mesma nota)
      } else {
        blocos.push(atual.join(" "));
        atual = [norm];
      }
    } else {
      atual.push(norm);
    }
  }
  if (atual.length > 0) blocos.push(atual.join(" "));
  return blocos.length > 0 ? blocos : [paginas.join(" ")];
}

function parseNotaCorretagem(texto) {
  // Normaliza Unicode (NFD → NFC) e divide em linhas para busca linha a linha
  const linhas = texto.normalize("NFC").split("\n").map(l => l.trim()).filter(Boolean);
  const t = linhas.join(" "); // versão flat para buscas gerais

  const num = s => parseFloat(s.replace(/\./g, "").replace(",", "."));
  const rxNumCD = /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\s*\|?\s*([CD])(?!\d)/gi;
  const rxNumAny = /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/;

  // Pega o ÚLTIMO número+C/D de uma string (suporta XP: "6,00 | C")
  const ultimoNumCD = str => {
    const rx = /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\s*\|?\s*([CD])(?!\d)/gi;
    let last, mv;
    while ((mv = rx.exec(str)) !== null) last = mv;
    return last || null;
  };

  // ── Data pregão ──────────────────────────────────────────────────────────
  // Prioridade: 1) Data pregão  2) Data de Referência (não consulta)  3) qualquer data
  // XP notes têm "Data da Consulta" (data do download) antes da data real da operação
  let data = "";
  for (const l of linhas) {
    if (!/preg.o/i.test(l)) continue;
    const d2 = l.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (d2) { const [d,mo,y] = d2[1].split("/"); data = `${y}-${mo}-${d}`; break; }
  }
  if (!data) {
    for (const l of linhas) {
      if (!/refer.ncia/i.test(l) || /consulta/i.test(l)) continue;
      const d2 = l.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (d2) { const [d,mo,y] = d2[1].split("/"); data = `${y}-${mo}-${d}`; break; }
    }
  }
  if (!data) {
    for (const l of linhas) {
      if (!/data/i.test(l) || /consulta/i.test(l)) continue;
      const d2 = l.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (d2) { const [d,mo,y] = d2[1].split("/"); data = `${y}-${mo}-${d}`; break; }
    }
  }
  if (!data) {
    const m = t.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (m) { const [d,mo,y] = m[1].split("/"); data = `${y}-${mo}-${d}`; }
  }

  // ── Valor dos negócios ───────────────────────────────────────────────────
  // Suporte a dois formatos:
  //   A) Mesma linha: "Valor dos negócios 79,00 C"
  //   B) Cabeçalho+valores: linha 1="...Valor dos negócios", linha 2="0,00 0,00 73,00 D"
  let valorNegocios = "";
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (!/neg.{0,5}cios/i.test(l)) continue;

    // Formato A: número+C/D na mesma linha
    const same = ultimoNumCD(l);
    if (same) {
      valorNegocios = same[2].toUpperCase() === "D" ? String(-num(same[1])) : String(num(same[1]));
      break;
    }
    // Formato B: linha é só cabeçalho — pega último número+C/D da linha seguinte
    const prox = linhas[i + 1] || "";
    const next = ultimoNumCD(prox);
    if (next) {
      valorNegocios = next[2].toUpperCase() === "D" ? String(-num(next[1])) : String(num(next[1]));
      break;
    }
  }

  // Fallback: "Ajuste de posição" ou "Ajuste day trade" (BTG antigo / futuros)
  if (!valorNegocios || valorNegocios === "0") {
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i];
      if (!/ajuste.{0,15}(posi|day)/i.test(l)) continue;
      const same = ultimoNumCD(l);
      if (same) { valorNegocios = same[2].toUpperCase() === "D" ? String(-num(same[1])) : String(num(same[1])); break; }
      const prox = linhas[i + 1] || "";
      const next = ultimoNumCD(prox);
      if (next) { valorNegocios = next[2].toUpperCase() === "D" ? String(-num(next[1])) : String(num(next[1])); break; }
    }
  }

  // ── IRRF Day Trade ────────────────────────────────────────────────────────
  // Valor do IR retido na fonte pelo broker (day trade)
  let irrfDayTrade = "";
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (!/irrf/i.test(l) || !/day/i.test(l)) continue;
    // Pega todos os números da linha; se só um, é o valor; se vários, é o 2º coluna
    const rxA = /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/g;
    let mvA, numsLinha = [];
    while ((mvA = rxA.exec(l)) !== null) numsLinha.push(mvA[1]);
    if (numsLinha.length === 1) { irrfDayTrade = String(num(numsLinha[0])); break; }
    if (numsLinha.length > 1) {
      // IRRF Day Trade é a 2ª coluna → 2º número
      irrfDayTrade = String(num(numsLinha[1])); break;
    }
    // Cabeçalho: pega do 2º número da linha seguinte
    const prox = linhas[i + 1] || "";
    const rxB = /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/g;
    let mvB, numsProx = [];
    while ((mvB = rxB.exec(prox)) !== null) numsProx.push(mvB[1]);
    if (numsProx.length >= 2) { irrfDayTrade = String(num(numsProx[1])); break; }
    if (numsProx.length === 1) { irrfDayTrade = String(num(numsProx[0])); break; }
  }

  // ── Total das despesas ────────────────────────────────────────────────────
  // Estratégia: busca no texto plano — pega segmento APÓS "total das despesas"
  // até o próximo "total" (ou 300 chars) e extrai o último valor D não-zero.
  // Fallback: linha a linha com até 8 linhas à frente.
  let totalDespesas = "", totalDespesasCD = "";
  const ultimoNum = str => {
    const rx = /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/g;
    let last, mv;
    while ((mv = rx.exec(str)) !== null) last = mv;
    return last ? last[1] : null;
  };
  {
    const tFlat = t.normalize("NFC");
    const tFlatLow = tFlat.toLowerCase();
    const despIdx = tFlatLow.indexOf("total das despesas");
    if (despIdx >= 0) {
      const fromDesp = tFlat.slice(despIdx + 18);
      const nextTotalRel = fromDesp.toLowerCase().indexOf("total");
      const seg = nextTotalRel > 10 ? fromDesp.slice(0, nextTotalRel) : fromDesp.slice(0, 300);
      const rxCD = /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\s*\|?\s*([CD])(?!\d)/gi;
      let mv, lastNZ = null, lastAny = null;
      while ((mv = rxCD.exec(seg)) !== null) {
        lastAny = mv;
        if (num(mv[1]) > 0) lastNZ = mv;
      }
      const best = lastNZ || lastAny;
      if (best) { totalDespesas = String(num(best[1])); totalDespesasCD = best[2].toUpperCase(); }
    }
  }
  // Fallback linha a linha (até 8 linhas à frente do cabeçalho)
  if (!totalDespesas) {
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i];
      if (!/total/i.test(l) || !/desp|taxa|custo/i.test(l)) continue;
      for (let j = 0; j <= 8; j++) {
        const ln = j === 0 ? l : (linhas[i + j] || "");
        const lCD = ultimoNumCD(ln);
        if (lCD) { totalDespesas = String(num(lCD[1])); totalDespesasCD = lCD[2].toUpperCase(); break; }
      }
      if (totalDespesas) break;
    }
  }

  // ── Total líquido da nota ─────────────────────────────────────────────────
  // Busca linha com "total" + "l?quido" + "nota", pega primeiro valor não-zero
  // na mesma linha ou nas 5 seguintes.
  let totalLiquidoNota = 0;
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (!/total/i.test(l) || !/l.quido/i.test(l) || !/nota/i.test(l)) continue;
    for (let j = 0; j <= 5; j++) {
      const ln = j === 0 ? l : (linhas[i + j] || "");
      const rxCD = /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\s*\|?\s*([CD])(?!\d)/gi;
      let mv;
      while ((mv = rxCD.exec(ln)) !== null) {
        const v = num(mv[1]);
        if (v > 0) {
          totalLiquidoNota = mv[2].toUpperCase() === "D" ? -v : v;
          break;
        }
      }
      if (totalLiquidoNota !== 0) break;
    }
    if (totalLiquidoNota !== 0) break;
  }

  // ── ISS ───────────────────────────────────────────────────────────────────
  // ISS pode aparecer de duas formas:
  //   A) Linha própria: "ISS 0,83" → valor único na mesma linha
  //   B) Cabeçalho de coluna junto com outros rótulos (Modal Mais):
  //      "+Outros Custos ISS Ajuste de posição ... Total das despesas"
  //      "0,00             0,83 0,00 ...           72,00 | C"
  //      Nesse caso o valor fica na linha seguinte e ISS é a 2ª coluna (após "+Outros Custos").
  let iss = 0;
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (!/\bi\.?s\.?s\.?\b/i.test(l)) continue;
    const rxA = /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/g;
    let mvA, numsL = [];
    while ((mvA = rxA.exec(l)) !== null) numsL.push(mvA[1]);
    if (numsL.length === 1) {
      // Formato A: "ISS 0,83" ou "I.S.S 0,04" sozinho na linha
      iss = num(numsL[0]);
      break;
    }
    // Formato B: linha de cabeçalhos sem números → valor na próxima linha
    const prox = linhas[i + 1] || "";
    const rxB = /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/g;
    let mvB, numsP = [];
    while ((mvB = rxB.exec(prox)) !== null) numsP.push(mvB[1]);
    if (numsP.length > 0) {
      // Descobre a posição do ISS: se "+Outros Custos" vem antes de ISS
      // no cabeçalho, ISS é a 2ª coluna (índice 1); caso contrário, é a 1ª (índice 0).
      const issPos = l.search(/\bi\.?s\.?s\.?\b/i);
      const temOutrosAntes = /outros.{0,10}custo/i.test(l.slice(0, issPos));
      const idx = temOutrosAntes ? 1 : 0;
      iss = num(numsP[Math.min(idx, numsP.length - 1)]);
      break;
    }
    break;
  }

  // Debug: todas as linhas numeradas para diagnóstico
  const debug = linhas.map((l,i) => `[${i}] ${l}`).slice(0, 60).join("\n")
    + `\n---\nDATA=${data} VN=${valorNegocios} DESP=${totalDespesas}${totalDespesasCD} ISS=${iss} LIQ=${totalLiquidoNota}`;
  return { data, valorNegocios, totalDespesas, totalDespesasCD, iss, irrfDayTrade, totalLiquidoNota, debug };
}
// ─────────────────────────────────────────────────────────────────────────────

function ImpostoRendaTab({t, onFecharMes, onFecharDia, relIrDados, darkMode, diasMesPendente, darfPrefill, onClearDarfPrefill, onGoToRelatorio}) {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 900;
  const [operaPor,  setOperaPor]  = React.useState(null); // "proprio" | "mesa"
  const [recebePor, setRecebePor] = React.useState(null); // "pf" | "pj" (só para mesa)
  // tipo = derivado dos dois acima, para compatibilidade com o resto do componente
  const tipo = operaPor === "proprio" ? "pf" : (operaPor === "mesa" && recebePor === "pf") ? "pf" : operaPor === "mesa" && recebePor === "pj" ? "pj" : null;
  const [digitarManual, setDigitarManual] = React.useState(false);

  React.useEffect(()=>{
    const forced = localStorage.getItem("darfrq_operaPor");
    if(forced==="proprio"){
      setOperaPor("proprio");
      setRecebePor(null);
      localStorage.removeItem("darfrq_operaPor");
    }
  },[]);

  const [mesAberto, setMesAberto] = React.useState(null);
  const [compensacaoManual, setCompensacaoManual] = React.useState(""); // campo manual editável pelo usuário
  const [irAnteriores, setIrAnteriores] = React.useState(""); // IR fonte de meses negativos anteriores
  const [mulJurCalc, setMulJurCalc] = React.useState(null);
  const [calculando, setCalculando] = React.useState(false);
  const [form, setForm] = React.useState({
    nomeCompleto:"", cpf:"", mesLucro:"",
    valorImpostoPagar:"", dataPagamento:""
  });
  const [notas, setNotas] = React.useState([{ data:"", valorNegocios:"", totalDespesas:"", outrosCustos:"", iss:"" }]);
  const importInputRef = React.useRef(null);
  const [importando, setImportando] = React.useState(false);
  const [importErro, setImportErro] = React.useState("");
  const [importOk, setImportOk] = React.useState("");
  const [importDebug, setImportDebug] = React.useState("");
  const [pdfSenhaModal, setPdfSenhaModal] = React.useState(false);
  const [pdfSenhaArquivos, setPdfSenhaArquivos] = React.useState([]);
  const [pdfSenhaValue, setPdfSenhaValue] = React.useState("");
  const [pdfSenhaErro, setPdfSenhaErro] = React.useState("");

  const NOMES_MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const processarPDFs = async (files, senha = "") => {
    setImportando(true);
    setImportErro("");
    setImportOk("");
    setPdfSenhaModal(false);
    const resultados = [];
    const erros = [];
    const precisamSenha = [];
    for (const file of files) {
      try {
        const paginas = await extrairTextoPDF(file, senha);
        const blocos = splitNotasMultiplas(paginas);
        for (const bloco of blocos) {
          const parsed = parseNotaCorretagem(bloco);
          resultados.push({ ...parsed, nomeArq: file.name });
        }
      } catch (err) {
        if (err.code === "password_required") {
          precisamSenha.push(file);
        } else if (err.code === "invalid_password") {
          setPdfSenhaErro("Senha incorreta. Tente novamente.");
          setImportando(false);
          return;
        } else {
          erros.push(file.name);
        }
      }
    }
    if (precisamSenha.length > 0) {
      setPdfSenhaArquivos(precisamSenha);
      setPdfSenhaValue("");
      setPdfSenhaErro("");
      setPdfSenhaModal(true);
      setImportando(false);
      return;
    }
    if (resultados.length > 0) {
      // Monta TODOS os dias primeiro, depois envia de uma vez para evitar batching do React
      const todosOsDias = resultados.map(r => {
        const vn = parseFloat(r.valorNegocios || 0);
        const td = parseFloat(r.totalDespesas || 0) + (parseFloat(r.iss) || 0); // ISS somado quando existir
        const irpfBase = vn - td; // base de cálculo: vn menos todas as despesas (incl. ISS)
        // IRPF = truncar((vn - despesas) × 1%, 2 casas) — truncamento conforme Receita Federal
        const irpf = irpfBase > 0 ? Math.floor(irpfBase * 0.01 * 100) / 100 : 0;
        // Líquido: para notas de lucro desconta também o IRPF retido na fonte
        const liq = irpfBase - irpf;
        const nota = { data: r.data || "", valorNegocios: r.valorNegocios || "", totalDespesas: String(td), vn, td, liq, irpf };
        let mes = "", nomeMesStr = "";
        if (r.data) {
          const [yyyy, mm] = r.data.split("-");
          mes = `${mm}/${yyyy}`;
          nomeMesStr = `${NOMES_MESES[(parseInt(mm)||1)-1]} ${yyyy}`;
        }
        let dataDisplay = r.data || new Date().toLocaleDateString("pt-BR");
        if (r.data && r.data.includes("-")) {
          const [y, m, d] = r.data.split("-");
          dataDisplay = `${d}/${m}/${y}`;
        }
        return { mes, nomeMesStr, data: dataDisplay, notas: [nota], totalBruto: liq, irpf };
      });
      // Verifica datas já existentes em diasMesPendente para evitar duplicatas
      const datasExistentes = new Set(
        (diasMesPendente?.dias || []).map(d => d.data)
      );
      // Também checar duplicatas dentro da própria importação atual
      const datasNaImportacao = new Set();
      const novosDias = [];
      const duplicatas = [];
      for (const dia of todosOsDias) {
        if (datasExistentes.has(dia.data) || datasNaImportacao.has(dia.data)) {
          duplicatas.push(dia.data);
        } else {
          novosDias.push(dia);
          datasNaImportacao.add(dia.data);
        }
      }
      if (novosDias.length > 0 && onFecharDia) onFecharDia(novosDias);

      if (resultados[0]?.debug) setImportDebug(resultados[0].debug);
      if (duplicatas.length > 0) {
        setImportErro(`⚠️ Nota(s) já importada(s), data duplicada: ${duplicatas.join(", ")}`);
      }
      if (novosDias.length > 0) {
        setImportOk(`✅ ${novosDias.length} nota(s) adicionada(s) ao Relatório IR`);
        if (onGoToRelatorio) setTimeout(() => onGoToRelatorio(), 600);
      } else if (duplicatas.length > 0 && novosDias.length === 0) {
        setImportOk(""); // só duplicatas, sem sucesso
      }
    } else if (erros.length === 0) {
      setImportErro("⚠️ Nenhum dado extraído dos PDFs");
    }
    if (erros.length > 0) {
      setImportErro(`⚠️ Erro ao ler: ${erros.join(", ")}`);
    }
    setImportando(false);
  };

  const handleImportarPDFs = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 22);
    e.target.value = "";
    if (!files.length) return;
    await processarPDFs(files, "");
  };

  const set = (k,v) => setForm(prev=>({...prev,[k]:v}));
  const brl = v => `R$ ${(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const cardStyle = {background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"18px 20px",marginBottom:14};
  const inp = {width:"100%",background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"9px 12px",color:t.text,fontSize:13,outline:"none",boxSizing:"border-box"};
  const inpSm = {...inp, padding:"7px 10px", fontSize:12};

  // ── Pré-preencher formulário DARF quando vem do Relatório IR ──
  /* eslint-disable react-hooks/exhaustive-deps */
  React.useEffect(()=>{
    if(!darfPrefill) return;
    setOperaPor("proprio");
    setRecebePor(null);
    setForm(prev=>({...prev, mesLucro: darfPrefill.mes||"", valorImpostoPagar: darfPrefill.valor ? parseFloat(darfPrefill.valor).toFixed(2) : ""}));
    if(onClearDarfPrefill) onClearDarfPrefill();
  },[darfPrefill]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // ── Data de hoje formatada ──
  const hoje = new Date();
  const hojeStr = `${String(hoje.getDate()).padStart(2,"0")}/${String(hoje.getMonth()+1).padStart(2,"0")}/${hoje.getFullYear()}`;
  const hojeISO = hoje.toISOString().slice(0,10);

  // ── Cálculos tabela de notas ──
  const notasCalc = notas.map(n => {
    const vn = parseFloat(n.valorNegocios)||0;
    const td = (parseFloat(n.totalDespesas)||0) + (parseFloat(n.outrosCustos)||0) + (parseFloat(n.iss)||0);
    const irpfBase = vn - td;
    const irpf = irpfBase > 0 ? Math.floor(irpfBase * 0.01 * 100) / 100 : 0;
    const liq = irpfBase - irpf;
    return { ...n, td, liq, irpf };
  });
  // Acumula dias fechados neste mês (diasMesPendente) + notas atuais do formulário
  const diasAcumBruto = (diasMesPendente?.mes === form.mesLucro)
    ? (diasMesPendente.dias||[]).reduce((s,d) => s + (d.totalBruto||0), 0) : 0;
  const diasAcumIRPF = (diasMesPendente?.mes === form.mesLucro)
    ? (diasMesPendente.dias||[]).reduce((s,d) => s + (d.irpf||0), 0) : 0;
  const totalBrutoReal = notasCalc.reduce((s, n) => s + n.liq, 0) + diasAcumBruto;
  const totalIRPF = notasCalc.reduce((s, n) => s + n.irpf, 0) + diasAcumIRPF;
  const totalBrutoNeg = totalBrutoReal < 0;
  const totalBrutoPositivo = totalBrutoNeg ? 0 : totalBrutoReal;
  const valorCompensarProx = totalBrutoNeg ? Math.abs(totalBrutoReal) : 0;

  // ── Ordena relIrDados cronologicamente por MM/YYYY ──
  const relIrOrdenado = React.useMemo(() => {
    if(!relIrDados || relIrDados.length === 0) return [];
    return [...relIrDados].sort((a,b) => {
      const [am,ay] = (a.mes||"00/0000").split("/").map(Number);
      const [bm,by] = (b.mes||"00/0000").split("/").map(Number);
      return (ay*12+am) - (by*12+bm);
    });
  }, [relIrDados]);

  // ── Compensação automática: soma todos os meses negativos e desconta quando há positivo ──
  // Lógica: percorre em ordem cronológica, acumula perdas e desconta ao encontrar mês positivo
  const compensacaoAcumulada = React.useMemo(() => {
    let acum = 0;
    for(const d of relIrOrdenado) {
      if(d.totalBrutoNeg) {
        acum += Math.abs(d.totalBrutoReal||0);
      } else {
        // Mês positivo absorve prejuízos acumulados até o limite do bruto positivo
        const usado = Math.min(acum, d.totalBrutoPositivo || 0);
        acum = Math.max(0, acum - usado);
      }
    }
    return acum;
  }, [relIrOrdenado]);

  // ── Detalhamento: quais meses negativos ainda têm saldo pendente de compensação ──
  const compensacaoDetalhes = React.useMemo(() => {
    // Rebuilda qual parcela de cada mês negativo ainda não foi compensada
    let saldo = 0;
    const pendentes = []; // {nomeMesStr, valor}
    for(const d of relIrOrdenado) {
      if(d.totalBrutoNeg) {
        const v = Math.abs(d.totalBrutoReal||0);
        pendentes.push({nomeMesStr: d.nomeMesStr, valor: v, restante: v});
        saldo += v;
      } else {
        let absorver = Math.min(saldo, d.totalBrutoPositivo || 0);
        saldo = Math.max(0, saldo - absorver);
        // desconta dos mais antigos primeiro
        for(let i = 0; i < pendentes.length && absorver > 0; i++) {
          const desconto = Math.min(pendentes[i].restante, absorver);
          pendentes[i].restante -= desconto;
          absorver -= desconto;
        }
      }
    }
    return pendentes.filter(p => p.restante > 0.005);
  }, [relIrOrdenado]);

  // ── IRPF acumulado de meses negativos anteriores ainda não creditado ──
  const irpfAcumulada = React.useMemo(() => {
    let acum = 0;
    for(const d of relIrOrdenado) {
      if(d.totalBrutoNeg) {
        acum += d.totalIRPF || 0;
      } else {
        acum = 0; // IR fonte creditado neste mês positivo
      }
    }
    return acum;
  }, [relIrOrdenado]);

  // Pré-preencher irAnteriores com o valor automático quando disponível
  React.useEffect(() => {
    if(irpfAcumulada > 0 && irAnteriores === "") setIrAnteriores(irpfAcumulada.toFixed(2));
    if(irpfAcumulada === 0 && irAnteriores !== "") setIrAnteriores("");
  }, [irpfAcumulada]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compensação final = acumulada automática + manual (usuário pode adicionar mais)
  const compensacaoV = compensacaoAcumulada + (parseFloat(compensacaoManual)||0);
  const baseComComp = Math.max(0, totalBrutoPositivo - compensacaoV);
  const valorLiquidoDARF = totalBrutoNeg ? 0 : baseComComp * 0.20;
  const irAnterioresV = parseFloat(irAnteriores)||0;
  const valorTotalDARF = totalBrutoNeg ? 0 : Math.max(0, valorLiquidoDARF - totalIRPF - irAnterioresV);

  // Alias para retrocompatibilidade no fechar mês
  const compensacao = compensacaoManual;
  const setCompensacao = setCompensacaoManual;

  // ── Máscara CPF: 000.000.000-00 ──
  const handleCpf = (raw) => {
    const d = raw.replace(/\D/g,"").slice(0,11);
    let f = d;
    if(d.length>9) f = d.slice(0,3)+"."+d.slice(3,6)+"."+d.slice(6,9)+"-"+d.slice(9);
    else if(d.length>6) f = d.slice(0,3)+"."+d.slice(3,6)+"."+d.slice(6);
    else if(d.length>3) f = d.slice(0,3)+"."+d.slice(3);
    set("cpf", f);
  };

  // ── Máscara Mês/Ano: MM/AAAA ──
  const handleMesLucro = (raw) => {
    const d = raw.replace(/\D/g,"").slice(0,6);
    let f = d;
    if(d.length>2) f = d.slice(0,2)+"/"+d.slice(2);
    set("mesLucro", f);
  };

  const [notasLocked, setNotasLocked] = React.useState([]); // índices bloqueados
  const [notasEditando, setNotasEditando] = React.useState([]); // índices em edição
  const [toastNota, setToastNota] = React.useState(null);

  const normalizeValue = (input) => {
    if (input === undefined || input === null || input === "") return "";
    const raw = String(input).replace(",", ".").replace(/[^0-9.-]/g, "");
    const num = parseFloat(raw);
    return Number.isNaN(num) ? "" : num.toFixed(2);
  };

  const setNota = (i, k, v) => {
    if (k === "valorNegocios" || k === "totalDespesas" || k === "outrosCustos" || k === "iss") {
      const text = String(v).replace(",", ".").replace(/[^0-9.-]/g, "");
      setNotas(prev => prev.map((n,idx)=>idx===i?{...n,[k]:text}:n));
    } else {
      setNotas(prev => prev.map((n,idx)=>idx===i?{...n,[k]:v}:n));
    }
  };

  const removeNota = (i) => {
    setNotas(prev => prev.filter((_,idx)=>idx!==i));
    setNotasLocked(lk => lk.filter(x=>x!==i).map(x=>x>i?x-1:x));
    setNotasEditando(ed => ed.filter(x=>x!==i).map(x=>x>i?x-1:x));
  };
  const toggleEditNota = (i) => setNotasEditando(ed => ed.includes(i) ? ed.filter(x=>x!==i) : [...ed, i]);

  // ── Nome do mês ──
  const nomeMes = (mm) => {
    const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    return nomes[(parseInt(mm)||1)-1] || "";
  };

  // ── Vencimento: último dia do mês seguinte ao mês do lucro ──
  const calcVencimento = (mesLucro) => {
    if(!mesLucro) return "";
    const [mm,yyyy] = mesLucro.split("/");
    if(!mm||!yyyy||isNaN(parseInt(mm))||isNaN(parseInt(yyyy))) return "";
    const mes = parseInt(mm)-1, ano = parseInt(yyyy);
    const pm = mes===11?0:mes+1, pa = mes===11?ano+1:ano;
    // último dia do mês seguinte
    const ult = new Date(pa, pm+1, 0);
    return `${String(ult.getDate()).padStart(2,"0")}/${String(ult.getMonth()+1).padStart(2,"0")}/${ult.getFullYear()}`;
  };
  const vencimento = calcVencimento(form.mesLucro);

  // ── Botão CALCULAR multa/juros ──
  const calcularMultaJuros = async () => {
    if(!vencimento||!form.valorImpostoPagar) return;
    setCalculando(true);
    setMulJurCalc(null);
    // Busca data atual online via API pública
    let dtHoje = new Date();
    try {
      const r = await fetch("https://worldtimeapi.org/api/timezone/America/Sao_Paulo");
      const j = await r.json();
      if(j.datetime) dtHoje = new Date(j.datetime);
    } catch(e) { /* usa data local */ }

    const pd = s => { const [d,m,y]=s.split("/"); return new Date(parseInt(y),parseInt(m)-1,parseInt(d)); };
    const dtV = pd(vencimento);
    const valor = parseFloat(form.valorImpostoPagar)||0;

    if(dtHoje <= dtV) {
      setMulJurCalc({ dentroDoprazo:true, diasAtraso:0, multa:0, juros:0, total:valor, dataCalculo:hojeStr });
    } else {
      const dias = Math.floor((dtHoje - dtV) / 864e5);
      const mp = Math.min(dias * 0.0033, 0.20);
      const mc = Math.floor(dias / 30);
      const js = valor * (mc * 0.01075 + 0.01);
      setMulJurCalc({ dentroDoprazo:false, diasAtraso:dias, multa:valor*mp, juros:js, multaPct:mp*100, total:valor+valor*mp+js, dataCalculo:hojeStr });
    }
    setCalculando(false);
  };

  const gerarDARF = () => {
    const val = parseFloat(form.valorImpostoPagar) || valorTotalDARF;
    const mj = mulJurCalc;
    // ── cálculo inline de multa/juros ──
    const pd = s => { const [d,m,y]=s.split("/"); return new Date(parseInt(y),parseInt(m)-1,parseInt(d)); };
    const dtHoje = new Date();
    let mjInline = null;
    if(vencimento) {
      const dtV = pd(vencimento);
      if(dtHoje > dtV) {
        const dias = Math.floor((dtHoje - dtV) / 864e5);
        const mp = Math.min(dias * 0.0033, 0.20);
        const mc = Math.floor(dias / 30);
        const js = val * (mc * 0.01075 + 0.01);
        mjInline = { diasAtraso:dias, multa:val*mp, juros:js, multaPct:mp*100, total:val+val*mp+js };
      }
    }
    const mj2 = mj || mjInline;
    const totalPagar = (mj2 && mj2.diasAtraso>0) ? mj2.total : val;
    const cpfFmt = form.cpf || "___.___.___-__";
    const nomeMesStr = form.mesLucro ? nomeMes(form.mesLucro.split("/")[0])+" de "+(form.mesLucro.split("/")[1]||"") : "";
    const anoExerc = form.mesLucro ? form.mesLucro.split("/")[1] : "____";
    const brlD = v => (v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});

    // barcode deterministico
    const bcArr = Array.from({length:80},(_,i)=>{
      const h=[36,18,28,12,36,22,36,12,28,18][i%10];
      const w=i%4===0?2.5:1.2;
      return `<span style="height:${h}px;width:${w}px;background:#000;display:inline-block;margin:0 0.2px;vertical-align:bottom"></span>`;
    }).join("");
    const cpfNum = cpfFmt.replace(/\D/g,"");
    const bcNum = `6015 0 ${cpfNum.substring(0,3)}.${cpfNum.substring(3,6)}.${cpfNum.substring(6,9)}-${cpfNum.substring(9)} ${(form.mesLucro||"00/0000").replace("/","/")} ${brlD(totalPagar)}`;

    const via = (titulo, n) => `
<div class="pagina">
  <div class="marca-agua">RECEITA FEDERAL DO BRASIL</div>

  <!-- CABEÇALHO -->
  <table class="hdr-table" cellspacing="0" cellpadding="0">
    <tr>
      <td class="hdr-emblema">
        <div class="emblema-circulo">
          <div class="emblema-rfb">RFB</div>
          <div class="emblema-sub">RECEITA<br>FEDERAL</div>
        </div>
      </td>
      <td class="hdr-centro">
        <div class="hdr-ministerio">MINISTÉRIO DA FAZENDA — SECRETARIA ESPECIAL DA RECEITA FEDERAL DO BRASIL</div>
        <div class="hdr-titulo">DARF — DOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS</div>
        <div class="hdr-descricao">CÓDIGO 6015 — GANHOS LÍQUIDOS EM OPERAÇÕES EM BOLSA — DAY TRADE — ALÍQUOTA 20% — PESSOA FÍSICA</div>
      </td>
      <td class="hdr-codigo">
        <div class="hdr-cod-label">CÓDIGO</div>
        <div class="hdr-cod-num">6015</div>
        <div class="hdr-cod-desc">Day Trade · PF</div>
      </td>
    </tr>
  </table>
  <div class="faixa-via">${titulo}</div>

  <!-- CAMPOS -->
  <table class="campos-table" cellspacing="0" cellpadding="0">
    <tr>
      <td class="campo" style="width:60%">
        <div class="cn">01</div>
        <div class="cl">NOME DO CONTRIBUINTE</div>
        <div class="cv lg">${form.nomeCompleto||"&nbsp;"}</div>
      </td>
      <td class="campo">
        <div class="cn">02</div>
        <div class="cl">CPF DO CONTRIBUINTE</div>
        <div class="cv mono">${cpfFmt}</div>
      </td>
    </tr>
    <tr>
      <td class="campo">
        <div class="cn">03</div>
        <div class="cl">PERÍODO DE APURAÇÃO</div>
        <div class="cv mono">${form.mesLucro||"__/____"}</div>
        <div class="cs">${nomeMesStr}</div>
      </td>
      <td class="campo">
        <div class="cn">04</div>
        <div class="cl">DATA DE VENCIMENTO</div>
        <div class="cv mono ${mj2&&mj2.diasAtraso>0?"vermelho":""}">${vencimento||"__/__/____"}</div>
        <div class="cs ${mj2&&mj2.diasAtraso>0?"vermelho":" "}">
          ${mj2&&mj2.diasAtraso>0?`⚠ ${mj2.diasAtraso} dia(s) em atraso`:"Último dia do mês seguinte"}
        </div>
      </td>
    </tr>
    <tr>
      <td class="campo" colspan="2">
        <div class="cn">05</div>
        <div class="cl">DENOMINAÇÃO / REFERÊNCIA</div>
        <div class="cv">Ganhos Líquidos em Operações Day Trade — Mercado Futuro de Índice (WIN) e Câmbio (WDO) — Renda Variável PF — Exercício ${anoExerc}</div>
      </td>
    </tr>
    <tr>
      <td class="campo">
        <div class="cn">06</div>
        <div class="cl">DATA DE EMISSÃO DA GUIA</div>
        <div class="cv mono">${hojeStr}</div>
      </td>
      <td class="campo">
        <div class="cn">07</div>
        <div class="cl">DATA DE PAGAMENTO</div>
        <div class="cv mono">${mj2?mj2.dataCalculo||hojeStr:"____/____/________"}</div>
      </td>
    </tr>
    <tr>
      <td class="campo">
        <div class="cn">08</div>
        <div class="cl">VALOR DO PRINCIPAL (R$)</div>
        <div class="cv mono">${brlD(val)}</div>
      </td>
      <td class="campo">
        <div class="cn">09</div>
        <div class="cl">MULTA (R$)</div>
        <div class="cv mono ${mj2&&mj2.diasAtraso>0?"vermelho":""}">${mj2&&mj2.diasAtraso>0?brlD(mj2.multa):"0,00"}</div>
        ${mj2&&mj2.diasAtraso>0?`<div class="cs vermelho">${mj2.multaPct?.toFixed(2)||"0"}% — 0,33%/dia, máx 20%</div>`:""}
      </td>
    </tr>
    <tr>
      <td class="campo">
        <div class="cn">10</div>
        <div class="cl">JUROS / ENCARGOS — SELIC (R$)</div>
        <div class="cv mono ${mj2&&mj2.diasAtraso>0?"vermelho":""}">${mj2&&mj2.diasAtraso>0?brlD(mj2.juros):"0,00"}</div>
        ${mj2&&mj2.diasAtraso>0?`<div class="cs vermelho">Estimativa ~1,075%/mês. Confirme no SICALC.</div>`:""}
      </td>
      <td class="campo total-campo">
        <div class="cn branco">11</div>
        <div class="cl branco">VALOR TOTAL A PAGAR (R$)</div>
        <div class="cv total-val">${brlD(totalPagar)}</div>
        <div class="cs branco">Principal${mj2&&mj2.diasAtraso>0?" + Multa + Juros":""}</div>
      </td>
    </tr>
  </table>

  ${mj2&&mj2.diasAtraso>0?`
  <div class="atraso-faixa">
    ⚠ GUIA COM ATRASO — ${mj2.diasAtraso} dia(s) | Vencimento: ${vencimento} |
    Multa: ${mj2.multaPct?.toFixed(2)||"0"}% (0,33%/dia, máx 20%) |
    Juros SELIC estimados (~1,075%/mês) — <strong>Confirme o valor exato no sistema SICALC da Receita Federal antes de pagar.</strong>
  </div>`:`
  <div class="prazo-faixa">✔ Guia dentro do prazo — sem acréscimos legais até ${vencimento}</div>`}

  <!-- AUTENTICAÇÃO -->
  <table class="autent-table" cellspacing="0" cellpadding="0">
    <tr>
      <td class="autent-campo">
        <div class="autent-label">AUTENTICAÇÃO BANCÁRIA / MECANICAMENTE</div>
        <div class="autent-linha">&nbsp;</div>
      </td>
      <td class="autent-campo" style="width:200px">
        <div class="autent-label">Nº DOCUMENTO / CONTROLE</div>
        <div class="autent-valor">${n||"001"}</div>
      </td>
    </tr>
  </table>

  <!-- CÓDIGO DE BARRAS -->
  <div class="barcode-area">
    <div class="autent-label" style="margin-bottom:5px">LINHA DIGITÁVEL</div>
    <div style="line-height:0;margin-bottom:4px">${bcArr}</div>
    <div class="barcode-num">${bcNum}</div>
  </div>

  <!-- SICALC -->
  <div class="sicalc-faixa">
    💡 Antes de efetuar o pagamento, confirme os valores no sistema <strong>SICALC</strong> da Receita Federal do Brasil:
    <strong>www.receita.fazenda.gov.br</strong> → Pagamentos → DARF → SICALC Online.
    A data de vencimento informada é o <strong>último dia do mês seguinte</strong> ao mês do lucro.
    Em caso de feriado bancário, o pagamento pode ser realizado no próximo dia útil.
  </div>

  <!-- RODAPÉ LEGAL -->
  <div class="rodape">
    <strong>⚠ AVISO LEGAL:</strong> Esta guia foi gerada automaticamente por sistema auxiliar de controle de operações Day Trade.
    <strong>A conferência das informações e a responsabilidade pelo pagamento são inteiramente do contribuinte.</strong>
    Este documento não substitui a DIRPF — Declaração de Imposto de Renda Pessoa Física.
    Código DARF 6015 — Alíquota 20% sobre lucro líquido deduzido o IRPF de 1% retido na fonte — Art. 1º da Lei nº 11.033/2004.
    O não recolhimento até o vencimento sujeita o contribuinte a multa de 0,33%/dia (limitada a 20%) + juros pela taxa SELIC.
    Gerado em: ${hojeStr} — TradeVision PRO · Sistema de Controle de Operações.
  </div>
</div>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>DARF 6015 — Receita Federal do Brasil</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Arial Narrow","Arial",Helvetica,sans-serif;background:#9e9e9e;padding:18px;color:#000;font-size:11px}
  .no-print{text-align:center;margin-bottom:16px;padding:10px 0}

  /* ── PÁGINA ── */
  .pagina{
    background:#fff;max-width:800px;margin:0 auto 24px;
    border:1px solid #666;
    box-shadow:0 3px 12px rgba(0,0,0,0.4);
    position:relative;overflow:hidden;
  }

  /* ── MARCA D'ÁGUA ── */
  .marca-agua{
    position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%) rotate(-30deg);
    font-size:200px;font-weight:900;
    color:rgba(14,75,140,0.06);
    white-space:nowrap;pointer-events:none;
    z-index:0;letter-spacing:4px;
    font-family:"Arial Narrow","Arial",sans-serif;
    line-height:1;
  }

  /* ── CABEÇALHO ── */
  .hdr-table{width:100%;border-collapse:collapse;position:relative;z-index:1}
  .hdr-emblema{background:#0c3d7a;width:72px;padding:10px 8px;text-align:center;vertical-align:middle;border-right:1px solid #1a5fa0}
  .emblema-circulo{
    width:52px;height:52px;border-radius:50%;
    background:radial-gradient(circle,#1760b0,#0c3d7a);
    border:2px solid #c8a600;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    margin:0 auto;
  }
  .emblema-rfb{color:#f1c40f;font-size:14px;font-weight:900;letter-spacing:1px;line-height:1}
  .emblema-sub{color:#aed6f1;font-size:5.5px;text-align:center;line-height:1.4;margin-top:2px}
  .hdr-centro{background:#0c3d7a;padding:10px 14px;vertical-align:middle}
  .hdr-ministerio{color:#7fb3d3;font-size:8px;letter-spacing:0.3px;text-transform:uppercase;margin-bottom:3px;font-weight:400}
  .hdr-titulo{color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.2px;margin-bottom:4px;font-family:"Arial","Arial Narrow",sans-serif}
  .hdr-descricao{color:#f1c40f;font-size:9px;font-weight:700;letter-spacing:0.5px}
  .hdr-codigo{background:#0a2e5c;width:100px;padding:12px 10px;text-align:center;vertical-align:middle;border-left:1px solid #1a5fa0}
  .hdr-cod-label{color:#aed6f1;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px}
  .hdr-cod-num{color:#f1c40f;font-size:38px;font-weight:900;letter-spacing:3px;line-height:1;font-family:"Arial","Arial Narrow",sans-serif}
  .hdr-cod-desc{color:#aed6f1;font-size:8px;margin-top:4px}
  .faixa-via{background:#1a5276;color:#d6eaf8;font-size:9px;font-weight:700;letter-spacing:2px;padding:3px 14px;border-bottom:3px solid #f1c40f;text-transform:uppercase}

  /* ── CAMPOS ── */
  .campos-table{width:100%;border-collapse:collapse;position:relative;z-index:1}
  .campo{padding:5px 9px;border:1px solid #b0b0b0;vertical-align:top;position:relative}
  .cn{position:absolute;top:3px;left:5px;font-size:7px;color:#777;font-weight:700;font-family:"Arial","Arial Narrow",sans-serif}
  .cl{font-size:7.5px;font-weight:700;text-transform:uppercase;color:#444;letter-spacing:0.6px;margin-bottom:4px;padding-left:12px;font-family:"Arial","Arial Narrow",sans-serif}
  .cv{font-size:14px;font-weight:700;color:#000;padding-left:12px;font-family:"Arial","Arial Narrow",sans-serif}
  .cv.mono{font-family:"Courier New",monospace;font-size:13px}
  .cv.lg{font-size:15px}
  .cv.vermelho{color:#c0392b}
  .cs{font-size:8px;color:#666;padding-left:12px;margin-top:2px;font-style:italic}
  .cs.vermelho{color:#c0392b;font-weight:700;font-style:normal}

  /* Campo total azul */
  .total-campo{background:#0c3d7a;border-color:#0a2e5c}
  .cl.branco{color:#aed6f1}
  .cn.branco{color:#7fb3d3}
  .cs.branco{color:#7fb3d3}
  .total-val{font-size:24px;font-weight:900;color:#f1c40f;padding-left:12px;font-family:"Courier New",monospace}

  /* Faixas */
  .atraso-faixa{background:#fef5e4;border-top:2px solid #e67e22;border-bottom:1px solid #f39c12;padding:5px 12px;font-size:9px;color:#7d4e00;position:relative;z-index:1}
  .prazo-faixa{background:#eafaf1;border-top:1px solid #27ae60;border-bottom:1px solid #27ae60;padding:4px 12px;font-size:9px;color:#1e8449;position:relative;z-index:1}
  .sicalc-faixa{background:#eaf4fb;border-top:1px solid #2471a3;border-bottom:1px solid #2471a3;padding:5px 12px;font-size:9px;color:#1a5276;line-height:1.6;position:relative;z-index:1}
  .sicalc-faixa strong{color:#0c3d7a}

  /* Autenticação */
  .autent-table{width:100%;border-collapse:collapse;position:relative;z-index:1;border-top:1px solid #b0b0b0}
  .autent-campo{padding:5px 12px;border-right:1px solid #b0b0b0;vertical-align:bottom}
  .autent-campo:last-child{border-right:none}
  .autent-label{font-size:7.5px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:0.5px;margin-bottom:6px}
  .autent-linha{border-bottom:1px solid #777;height:22px}
  .autent-valor{font-size:11px;color:#000;font-family:"Courier New",monospace}

  /* Código de barras */
  .barcode-area{padding:8px 12px;border-top:1px solid #b0b0b0;background:#fafafa;position:relative;z-index:1}
  .barcode-num{font-family:"Courier New",monospace;font-size:9px;color:#333;letter-spacing:0.8px;margin-top:2px}

  /* Rodapé */
  .rodape{background:#f2f2f2;border-top:2px solid #aaa;padding:7px 12px;font-size:8px;color:#444;line-height:1.7;text-align:justify;position:relative;z-index:1}
  .rodape strong{color:#c0392b}

  /* Linha de corte */
  .corte{border:none;border-top:1px dashed #888;margin:14px 0 10px;position:relative;max-width:800px;margin-left:auto;margin-right:auto}
  .corte::after{content:"✂  RECORTE AQUI — GUARDA A 1ª VIA E ENTREGUE A 2ª VIA AO BANCO";position:absolute;left:50%;top:-8px;transform:translateX(-50%);background:#9e9e9e;font-size:8px;color:#555;padding:0 10px;letter-spacing:1px;white-space:nowrap}

  @media print{
    body{background:#fff;padding:0}
    .pagina{box-shadow:none;border:1px solid #999;page-break-after:always;margin:0 auto}
    .no-print{display:none}
    .corte{display:none}
  }
</style></head><body>

<div class="no-print">
  <button onclick="window.print()" style="background:#0c3d7a;color:#fff;border:2px solid #c8a600;padding:11px 36px;font-size:14px;font-weight:700;border-radius:4px;cursor:pointer;font-family:Arial,sans-serif;margin-right:12px">
    🖨️ Imprimir / Salvar PDF
  </button>
  <span style="font-size:11px;color:#444">Ctrl+P → "Salvar como PDF" &nbsp;|&nbsp; <strong>Confirme os valores no SICALC antes de pagar.</strong></span>
</div>

${via("1ª VIA — CONTRIBUINTE (GUARDA ESTA VIA)", "001")}

<div class="corte"></div>

${via("2ª VIA — BANCO (ENTREGUE AO AGENTE ARRECADADOR)", "002")}

</body></html>`;
    const w = window.open("","_blank");
    w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600);
  };
  const corLiq = (v) => v < 0 ? "#f87171" : v > 0 ? "#4ade80" : t.text;

  return (
    <div style={{maxWidth:"100%"}}>
      {/* ── Cabeçalho estilo RFB / gov.br ── */}
      <div style={{marginBottom:20,borderRadius:12,overflow:"hidden",boxShadow:"0 4px 22px rgba(0,0,0,0.45)"}}>
        {/* Faixa azul gov.br */}
        <div style={{background:"#1351B4",padding:"5px 18px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:"#fff",fontSize:13,fontWeight:900,fontFamily:"Arial,sans-serif",letterSpacing:0.5}}>gov.br</span>
          <span style={{color:"rgba(255,255,255,0.35)",fontSize:16,lineHeight:1}}>|</span>
          <span style={{color:"rgba(255,255,255,0.82)",fontSize:10,fontFamily:"Arial,sans-serif",letterSpacing:0.3}}>Receita Federal do Brasil</span>
        </div>
        {/* Corpo azul RFB */}
        <div style={{background:"#0c3d7a",padding:"16px 20px",display:"flex",alignItems:"center",gap:18}}>
          {/* Emblema RFB */}
          <div style={{background:"radial-gradient(circle at 40% 40%,#1a5fa0,#0a2e5c)",border:"2px solid #c8a600",borderRadius:"50%",width:56,height:56,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 0 14px rgba(200,166,0,0.35)"}}>
            <div style={{color:"#f1c40f",fontSize:13,fontWeight:900,fontFamily:"Arial Narrow,Arial,sans-serif",letterSpacing:1,lineHeight:1}}>RFB</div>
            <div style={{color:"#aed6f1",fontSize:5.5,textAlign:"center",lineHeight:1.4,marginTop:2,fontFamily:"Arial,sans-serif"}}>RECEITA<br/>FEDERAL</div>
          </div>
          <div style={{flex:1}}>
            <div style={{color:"#7fb3d3",fontSize:9,letterSpacing:0.8,textTransform:"uppercase",marginBottom:4,fontFamily:"Arial,sans-serif"}}>Ministério da Fazenda · Secretaria Especial da Receita Federal do Brasil</div>
            <div style={{color:"#ffffff",fontSize:19,fontWeight:700,fontFamily:"Arial Narrow,Arial,sans-serif",marginBottom:5,letterSpacing:0.2}}>Imposto de Renda — Renda Variável</div>
            <div style={{color:"#f1c40f",fontSize:10,fontWeight:700,letterSpacing:0.8,fontFamily:"Arial,sans-serif"}}>DAY TRADE · DARF CÓDIGO 6015 · ALÍQUOTA 20%</div>
            <div style={{color:"#a8ff8b",fontSize:9,fontWeight:700,letterSpacing:0.6,fontFamily:"Arial,sans-serif",marginTop:2}}>Carnê-Leão 0190 · Pessoa Física</div>
          </div>
          <div style={{display:"flex",gap:10,flexShrink:0}}>
            <div style={{textAlign:"center",background:"#0a2e5c",border:"1px solid #1a5fa0",borderRadius:8,padding:"10px 16px",minWidth:110}}>
              <div style={{color:"#aed6f1",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",fontFamily:"Arial,sans-serif",marginBottom:3}}>Código</div>
              <div style={{color:"#f1c40f",fontSize:30,fontWeight:900,fontFamily:"Arial Narrow,Arial,sans-serif",letterSpacing:3,lineHeight:1}}>6015</div>
              <div style={{color:"#aed6f1",fontSize:8,marginTop:4,fontFamily:"Arial,sans-serif"}}>DARF</div>
            </div>
            <div style={{textAlign:"center",background:"#0a2e5c",border:"1px solid #1a5fa0",borderRadius:8,padding:"10px 16px",minWidth:110}}>
              <div style={{color:"#aed6f1",fontSize:8,letterSpacing:1.5,textTransform:"uppercase",fontFamily:"Arial,sans-serif",marginBottom:3}}>Código</div>
              <div style={{color:"#f1c40f",fontSize:30,fontWeight:900,fontFamily:"Arial Narrow,Arial,sans-serif",letterSpacing:3,lineHeight:1}}>0190</div>
              <div style={{color:"#aed6f1",fontSize:8,marginTop:4,fontFamily:"Arial,sans-serif"}}>Carnê-Leão</div>
            </div>
          </div>
        </div>
        {/* Faixa dourada inferior */}
        <div style={{background:"#c8a600",height:3}}/>
      </div>

      {/* ── Passo 1: Você opera Por? ── */}
      {!operaPor&&(
        <div style={{...cardStyle,border:`1px solid ${t.border}`}}>
          <div style={{marginBottom:18}}>
            <div style={{color:darkMode?"#64748b":"#94a3b8",fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:5,fontFamily:"Arial,sans-serif"}}>Configuração Inicial</div>
            <div style={{color:t.text,fontWeight:700,fontSize:16,fontFamily:"Arial,sans-serif",letterSpacing:-0.2}}>Como você opera no mercado?</div>
            <div style={{color:darkMode?"#94a3b8":"#64748b",fontSize:12,marginTop:3,fontFamily:"Arial,sans-serif"}}>Selecione o tipo de capital para definir a tributação correta</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:440}}>
            <button onClick={()=>{setOperaPor("proprio");setRecebePor(null);}}
              style={{padding:"0",borderRadius:8,cursor:"pointer",border:`1px solid ${t.border}`,background:t.card,overflow:"hidden",textAlign:"left",display:"flex",alignItems:"stretch",boxShadow:"0 1px 4px rgba(0,0,0,0.12)"}}>
              <div style={{width:4,background:"#16a34a",flexShrink:0}}/>
              <div style={{padding:"14px 18px",flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{color:t.text,fontWeight:700,fontSize:14,fontFamily:"Arial,sans-serif",letterSpacing:-0.1}}>Capital Próprio</span>
                  <span style={{background:darkMode?"#14532d":"#dcfce7",color:darkMode?"#86efac":"#15803d",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,fontFamily:"Arial,sans-serif",letterSpacing:0.3}}>DARF 6015 · 20%</span>
                </div>
                <div style={{color:darkMode?"#94a3b8":"#64748b",fontSize:12,fontFamily:"Arial,sans-serif"}}>Opera com seus próprios recursos financeiros</div>
              </div>
            </button>
            <button onClick={()=>setOperaPor("mesa")}
              style={{padding:"0",borderRadius:8,cursor:"pointer",border:`1px solid ${t.border}`,background:t.card,overflow:"hidden",textAlign:"left",display:"flex",alignItems:"stretch",boxShadow:"0 1px 4px rgba(0,0,0,0.12)"}}>
              <div style={{width:4,background:"#7c3aed",flexShrink:0}}/>
              <div style={{padding:"14px 18px",flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{color:t.text,fontWeight:700,fontSize:14,fontFamily:"Arial,sans-serif",letterSpacing:-0.1}}>Mesa Proprietária</span>
                  <span style={{background:darkMode?"#4c1d95":"#f3e8ff",color:darkMode?"#c4b5fd":"#6d28d9",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,fontFamily:"Arial,sans-serif",letterSpacing:0.3}}>PF ou PJ</span>
                </div>
                <div style={{color:darkMode?"#94a3b8":"#64748b",fontSize:12,fontFamily:"Arial,sans-serif"}}>Opera com capital alocado pela mesa proprietária</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Passo 2 (Mesa): Você recebe por? ── */}
      {operaPor==="mesa"&&!recebePor&&(
        <div style={{...cardStyle,border:"1px solid #a855f744"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <button onClick={()=>setOperaPor(null)} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,color:t.muted,padding:"4px 10px",cursor:"pointer",fontSize:11}}>← Voltar</button>
            <span style={{background:"#a855f722",border:"1px solid #a855f744",borderRadius:99,padding:"3px 12px",color:"#a855f7",fontSize:11,fontWeight:700}}>🏢 Mesa Proprietária</span>
          </div>
          <div style={{paddingBottom:8}}>
            <div style={{marginBottom:18}}>
              <div style={{color:darkMode?"#64748b":"#94a3b8",fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:5,fontFamily:"Arial,sans-serif"}}>Forma de Recebimento</div>
              <div style={{color:t.text,fontWeight:700,fontSize:16,fontFamily:"Arial,sans-serif",letterSpacing:-0.2}}>Como você recebe os lucros?</div>
              <div style={{color:darkMode?"#94a3b8":"#64748b",fontSize:12,marginTop:3,fontFamily:"Arial,sans-serif"}}>Selecione a forma jurídica dos pagamentos da mesa</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:440}}>
              <button onClick={()=>setRecebePor("pf")}
                style={{padding:"0",borderRadius:8,cursor:"pointer",border:`1px solid ${t.border}`,background:t.card,overflow:"hidden",textAlign:"left",display:"flex",alignItems:"stretch",boxShadow:"0 1px 4px rgba(0,0,0,0.12)"}}>
                <div style={{width:4,background:"#2563eb",flexShrink:0}}/>
                <div style={{padding:"14px 18px",flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{color:t.text,fontWeight:700,fontSize:14,fontFamily:"Arial,sans-serif",letterSpacing:-0.1}}>Pessoa Física</span>
                    <span style={{background:darkMode?"#1e3a8a":"#dbeafe",color:darkMode?"#93c5fd":"#1d4ed8",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,fontFamily:"Arial,sans-serif",letterSpacing:0.3}}>DARF 0190</span>
                  </div>
                  <div style={{color:darkMode?"#94a3b8":"#64748b",fontSize:12,fontFamily:"Arial,sans-serif"}}>Recebe via CPF — sujeito ao Carnê-Leão mensal</div>
                </div>
              </button>
              <button onClick={()=>setRecebePor("pj")}
                style={{padding:"0",borderRadius:8,cursor:"pointer",border:`1px solid ${t.border}`,background:t.card,overflow:"hidden",textAlign:"left",display:"flex",alignItems:"stretch",boxShadow:"0 1px 4px rgba(0,0,0,0.12)"}}>
                <div style={{width:4,background:"#d97706",flexShrink:0}}/>
                <div style={{padding:"14px 18px",flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{color:t.text,fontWeight:700,fontSize:14,fontFamily:"Arial,sans-serif",letterSpacing:-0.1}}>Pessoa Jurídica</span>
                    <span style={{background:darkMode?"#78350f":"#fef3c7",color:darkMode?"#fcd34d":"#b45309",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,fontFamily:"Arial,sans-serif",letterSpacing:0.3}}>NFS-e / MEI</span>
                  </div>
                  <div style={{color:darkMode?"#94a3b8":"#64748b",fontSize:12,fontFamily:"Arial,sans-serif"}}>Recebe via CNPJ — emite nota fiscal mensal</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {(operaPor==="proprio"||(operaPor==="mesa"&&recebePor))&&(
        <>
          {/* Badge de navegação */}
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
            {operaPor==="proprio"&&(
              <span style={{background:"#22c55e22",border:"1px solid #22c55e44",color:"#22c55e",padding:"4px 12px",borderRadius:999,fontWeight:700,fontSize:12}}>💰 Capital Próprio</span>
            )}
            {operaPor==="mesa"&&(
              <>
                <span style={{background:"#a855f722",border:"1px solid #a855f744",color:"#a855f7",padding:"4px 12px",borderRadius:999,fontWeight:700,fontSize:12}}>🏢 Mesa Proprietária</span>
                <span style={{color:t.muted,fontSize:12}}>→</span>
                <span style={{background:recebePor==="pf"?"#3b82f622":"#f59e0b22",border:`1px solid ${recebePor==="pf"?"#3b82f644":"#f59e0b44"}`,color:recebePor==="pf"?"#3b82f6":"#f59e0b",padding:"4px 12px",borderRadius:999,fontWeight:700,fontSize:12}}>
                  {recebePor==="pf"?"👤 Pessoa Física":"🏢 Pessoa Jurídica"}
                </span>
              </>
            )}
            <button onClick={()=>{setOperaPor(null);setRecebePor(null);}} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,color:t.muted,padding:"4px 10px",cursor:"pointer",fontSize:11,marginLeft:"auto"}}>↩ Trocar</button>
          </div>

          {/* Mesa PJ */}
          {operaPor==="mesa"&&recebePor==="pj"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>

              {/* Bloco Nota Fiscal MEI */}
              <div style={{...cardStyle,border:"1px solid #a855f744",background:"#a855f708",marginBottom:0}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <div style={{background:"#a855f722",borderRadius:10,padding:"8px 10px",fontSize:20,lineHeight:1}}>🧾</div>
                  <div>
                    <div style={{color:"#a855f7",fontWeight:800,fontSize:15,letterSpacing:0.2}}>Como Emitir Nota Fiscal (MEI)</div>
                    <div style={{color:t.muted,fontSize:11,marginTop:2}}>Passo a passo para NFS-e · Mesa Proprietária</div>
                  </div>
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    {
                      n:"01",
                      icon:"📱",
                      titulo:"Acesse o Portal",
                      desc:"Abra o App MEI ou acesse o Portal do Empreendedor (gov.br/mei)",
                      cor:"#6366f1",
                    },
                    {
                      n:"02",
                      icon:"🔐",
                      titulo:"Faça Login",
                      desc:"Entre com sua conta gov.br (CPF + senha cadastrada)",
                      cor:"#3b82f6",
                    },
                    {
                      n:"03",
                      icon:"📝",
                      titulo:"Emissão de Nota Fiscal",
                      desc:'Acesse "Emitir Nota Fiscal de Serviço (NFS-e)" no menu principal',
                      cor:"#06b6d4",
                    },
                    {
                      n:"04",
                      icon:"🏢",
                      titulo:"Dados da Mesa Proprietária",
                      desc:'Preencha: CNPJ da mesa · Valor recebido no mês · Descrição: "Prestação de serviços de trading"',
                      cor:"#a855f7",
                    },
                    {
                      n:"05",
                      icon:"✅",
                      titulo:"Emita a Nota",
                      desc:"A NFS-e será gerada pelo sistema oficial do governo ou da prefeitura do seu município",
                      cor:"#22c55e",
                    },
                    {
                      n:"06",
                      icon:"📤",
                      titulo:"Envie para a Mesa",
                      desc:"Baixe o PDF ou XML da nota e envie para a empresa que efetuou o pagamento",
                      cor:"#f59e0b",
                    },
                  ].map(step=>(
                    <div key={step.n} style={{display:"flex",gap:12,alignItems:"flex-start",background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,padding:"12px 14px"}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0}}>
                        <div style={{background:`${step.cor}22`,border:`1px solid ${step.cor}44`,borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{step.icon}</div>
                        <div style={{color:step.cor,fontWeight:900,fontSize:9,letterSpacing:1}}>{step.n}</div>
                      </div>
                      <div>
                        <div style={{color:t.text,fontWeight:700,fontSize:12,marginBottom:3}}>{step.titulo}</div>
                        <div style={{color:t.muted,fontSize:11,lineHeight:1.6}}>{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:12,background:"#22c55e0d",border:"1px solid #22c55e33",borderRadius:10,padding:"10px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:14,marginTop:1}}>💡</span>
                  <div style={{color:t.muted,fontSize:11,lineHeight:1.7}}>
                    O MEI pode emitir NFS-e <strong style={{color:t.text}}>mensalmente</strong> pelo valor recebido da mesa. Guarde todas as notas emitidas para comprovação perante a Receita Federal.
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Mesa PF: Carnê-Leão + DARF */}
          {operaPor==="mesa"&&recebePor==="pf"&&(
            <CarneLeaoCalculadora t={t} prefillDarff={darfPrefill} onClearPrefill={onClearDarfPrefill} />
          )}

          {/* Bloco DARF (Capital Próprio OU Mesa PF) */}
          {tipo==="pf"&&recebePor!=="pj"&&(
            <>
              {/* ── Bloco Nota de Corretagem ── */}
              <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
                {/* Cabeçalho oficial */}
                <div style={{background:"linear-gradient(90deg,#0c3d7a,#1a5fa0)",borderBottom:"3px solid #c8a600",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                  <div>
                    <div style={{color:"#ffffff",fontWeight:700,fontSize:14,fontFamily:"Arial Narrow,Arial,sans-serif",letterSpacing:0.3}}>Nota de Corretagem</div>
                    <div style={{color:"#aed6f1",fontSize:11,marginTop:2,fontFamily:"Arial,sans-serif"}}>Registre os valores de cada nota para calcular o IR</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <button onClick={()=>setDigitarManual(!digitarManual)}
                      style={{background:digitarManual?"#60a5fa22":"linear-gradient(135deg,#1d4ed8,#2563eb)",border:`2px solid ${digitarManual?"#60a5fa":"#3b82f6"}`,borderRadius:10,color:digitarManual?"#60a5fa":"#fff",padding:"10px 20px",cursor:"pointer",fontSize:14,fontWeight:800,boxShadow:digitarManual?"none":"0 4px 14px rgba(59,130,246,0.45)",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
                      📝 {digitarManual?"Ocultar formulário ✅":"Inserir nota manualmente"}
                    </button>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".pdf"
                      multiple
                      style={{display:"none"}}
                      onChange={handleImportarPDFs}
                    />
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                      <button
                        onClick={()=>importInputRef.current?.click()}
                        disabled={importando}
                        title="Selecione até 22 PDFs de notas de corretagem. O sistema lê automaticamente: data, valor dos negócios e total das despesas."
                        style={{background:importando?"#1e293b":"#1e3a5f",border:`1px solid ${importando?"#334155":"#3b82f6"}`,borderRadius:8,color:importando?"#64748b":"#60a5fa",padding:"8px 14px",cursor:importando?"wait":"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                        {importando?"⏳ Lendo PDFs...":"📎 Importar PDFs"}
                      </button>
                      {importOk&&<span style={{color:"#4ade80",fontSize:12,fontWeight:700}}>{importOk}</span>}
                      {importErro&&<span style={{color:"#f87171",fontSize:12,fontWeight:600,maxWidth:260}}>{importErro}</span>}
                    </div>
                    {/* Modal senha PDF */}
                    {pdfSenhaModal&&(
                      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}
                        onClick={()=>{setPdfSenhaModal(false);setPdfSenhaErro("");}}>
                        <div style={{background:"#1e293b",border:"1px solid #3b82f6",borderRadius:14,padding:"28px 32px",minWidth:340,maxWidth:420,boxShadow:"0 8px 40px rgba(0,0,0,0.6)"}}
                          onClick={e=>e.stopPropagation()}>
                          <div style={{color:"#f1f5f9",fontWeight:800,fontSize:16,marginBottom:6}}>🔒 PDF protegido por senha</div>
                          <div style={{color:"#94a3b8",fontSize:12,marginBottom:4}}>
                            {pdfSenhaArquivos.map(f=>f.name).join(", ")}
                          </div>
                          <div style={{color:"#64748b",fontSize:11,marginBottom:16,lineHeight:1.5}}>
                            Normalmente a senha é:<br/>
                            • Primeiros 3 dígitos do CPF<br/>
                            • Últimos 3 dígitos do CPF<br/>
                            • CPF completo (sem pontos/traços)
                          </div>
                          <input
                            type="password"
                            placeholder="Digite a senha do PDF"
                            value={pdfSenhaValue}
                            autoFocus
                            onChange={e=>setPdfSenhaValue(e.target.value)}
                            onKeyDown={async e=>{
                              if(e.key==="Enter"&&pdfSenhaValue.trim()){
                                setPdfSenhaModal(false);
                                await processarPDFs(pdfSenhaArquivos, pdfSenhaValue.trim());
                              }
                            }}
                            style={{width:"100%",background:"#0f172a",border:`1px solid ${pdfSenhaErro?"#f87171":"#3b82f6"}`,borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:8}}
                          />
                          {pdfSenhaErro&&<div style={{color:"#f87171",fontSize:12,marginBottom:8}}>{pdfSenhaErro}</div>}
                          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
                            <button onClick={()=>{setPdfSenhaModal(false);setPdfSenhaErro("");}}
                              style={{background:"transparent",border:"1px solid #475569",borderRadius:8,color:"#94a3b8",padding:"8px 16px",cursor:"pointer",fontSize:13}}>
                              Cancelar
                            </button>
                            <button
                              disabled={!pdfSenhaValue.trim()}
                              onClick={async()=>{
                                setPdfSenhaModal(false);
                                await processarPDFs(pdfSenhaArquivos, pdfSenhaValue.trim());
                              }}
                              style={{background:pdfSenhaValue.trim()?"#2563eb":"#1e3a5f",border:"none",borderRadius:8,color:pdfSenhaValue.trim()?"#fff":"#64748b",padding:"8px 20px",cursor:pdfSenhaValue.trim()?"pointer":"default",fontSize:13,fontWeight:700}}>
                              Confirmar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Botão Fechar Lançamento do Mês — aparece assim que tiver nota preenchida */}
                    {digitarManual&&(()=>{
                      const temNotaPreenchida = notasCalc.some(n => (parseFloat(n.valorNegocios)||0) !== 0 || (parseFloat(n.totalDespesas)||0) !== 0);
                      const jafechado = mesAberto&&mesAberto===form.mesLucro;
                      // Verificar se mês já foi enviado ao relatório
                      const mesJaNoRelatorio = relIrDados && relIrDados.some(d => d.mes === form.mesLucro && (d.dias||[]).some(di=>(di.totalBruto||0)!==0||(di.irpf||0)!==0));
                      if(!temNotaPreenchida && !jafechado) return null;
                      return (
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <button
                            onClick={()=>{
                              if (!form.mesLucro || form.mesLucro.length < 7) {
                                alert("⚠️ Preencha o campo 'Mês de Referência' (MM/AAAA) na coluna direita antes de fechar.");
                                return;
                              }
                              if (mesJaNoRelatorio && !jafechado) {
                                alert(`⚠️ O mês ${nomeMes(form.mesLucro.split("/")[0])} ${form.mesLucro.split("/")[1]||""} já foi lançado no Relatório IR.\n\nPara corrigir, vá à aba "Relatório IR", limpe e relance.`);
                                return;
                              }
                              const novoFechado = jafechado ? null : (form.mesLucro||"");
                              setMesAberto(novoFechado);
                              if(novoFechado && onFecharMes) {
                                // Combina dias fechados anteriores (diasMesPendente) + notas atuais do formulário
                                const diasAnteriores = (diasMesPendente?.mes === form.mesLucro) ? (diasMesPendente.dias||[]) : [];
                                const diaAtual = notasCalc.some(n => n.liq || n.irpf) ? [{
                                  mes: form.mesLucro,
                                  nomeMesStr: nomeMes(form.mesLucro.split("/")[0]) + " " + (form.mesLucro.split("/")[1]||""),
                                  data: new Date().toLocaleDateString("pt-BR"),
                                  notas: notasCalc,
                                  totalBruto: notasCalc.reduce((s,n)=>s+(n.liq||0),0),
                                  irpf: notasCalc.reduce((s,n)=>s+(n.irpf||0),0),
                                }] : [];
                                onFecharMes({
                                  mes: form.mesLucro,
                                  nomeMesStr: nomeMes(form.mesLucro.split("/")[0]) + " " + (form.mesLucro.split("/")[1]||""),
                                  notas: notasCalc,
                                  dias: [...diasAnteriores, ...diaAtual],
                                  totalBrutoReal,
                                  totalIRPF,
                                  totalBrutoPositivo,
                                  totalBrutoNeg,
                                  valorCompensarProx,
                                  baseComComp,
                                  valorLiquidoDARF,
                                  valorTotalDARF,
                                  dataFechamento: new Date().toLocaleDateString("pt-BR"),
                                });
                                // Resetar form após 1s e manter formulário aberto para novo mês
                                setTimeout(() => {
                                  set("mesLucro","");
                                  set("valorImpostoPagar","");
                                  setNotas([{ data:"", valorNegocios:"", totalDespesas:"", outrosCustos:"", iss:"" }]);
                                  setMesAberto(null);
                                  setMulJurCalc(null);
                                  // digitarManual permanece true — usuário pode lançar próximo mês
                                }, 1000);
                              }
                            }}
                            style={{
                              background: jafechado?"#22c55e22": mesJaNoRelatorio?"#ef444418":"#f59e0b18",
                              border:`2px solid ${jafechado?"#22c55e": mesJaNoRelatorio?"#ef4444":"#f59e0b"}`,
                              borderRadius:8,
                              color: jafechado?"#22c55e": mesJaNoRelatorio?"#f87171":"#f59e0b",
                              padding:"10px 20px",cursor:"pointer",
                              fontSize:13,fontWeight:700,whiteSpace:"nowrap",
                            }}>
                            {jafechado?"🔓 Reabrir Mês": mesJaNoRelatorio?"⚠️ Mês já lançado":"🔒 Fechar Mês"}{form.mesLucro?` — ${nomeMes(form.mesLucro.split("/")[0])} ${form.mesLucro.split("/")[1]||""}`:""}
                          </button>
                          </div>
                          {!form.mesLucro&&!jafechado&&(
                            <div style={{color:"#94a3b8",fontSize:10}}>💡 Preencha "Mês do Lucro" acima para nomear o fechamento</div>
                          )}
                          {mesJaNoRelatorio&&!jafechado&&(
                            <div style={{color:"#f87171",fontSize:10}}>Este mês já está no Relatório IR</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {digitarManual&&(
                  <div style={{padding:"16px 18px"}}>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 320px",gap:16,alignItems:"start"}}>

                    {/* COLUNA ESQUERDA */}
                    {(()=>{
                      const mesFechado = relIrDados && relIrDados.some(d => d.mes === form.mesLucro && (d.dias||[]).some(di=>(di.totalBruto||0)!==0||(di.irpf||0)!==0));
                      const bloqueado = mesFechado || mesAberto===form.mesLucro;
                      return (
                    <div style={{opacity: bloqueado ? 0.55 : 1, pointerEvents: bloqueado ? "none":"auto"}}>
                      {/* Toast nota salva */}
                      {toastNota&&(
                        <div style={{background:"#14532d",border:"1px solid #22c55e",borderRadius:8,padding:"10px 14px",marginBottom:10,color:"#4ade80",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:8}}>
                          {toastNota}
                        </div>
                      )}
                      {/* Dias acumulados no mês */}
                      {diasMesPendente?.mes===form.mesLucro&&(diasMesPendente.dias||[]).length>0&&(
                        <div style={{background:"#0f766e12",border:"1px solid #14b8a6",borderRadius:8,padding:"8px 14px",marginBottom:10}}>
                          <div style={{color:"#14b8a6",fontWeight:700,fontSize:12,marginBottom:6}}>
                            📅 {(diasMesPendente.dias||[]).length} dia(s) já fechado(s) neste mês
                          </div>
                          {(diasMesPendente.dias||[]).map((d,i)=>(
                            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",padding:"2px 0"}}>
                              <span>{d.data}</span>
                              <span style={{color:d.totalBruto>=0?"#4ade80":"#f87171",fontWeight:600}}>
                                {`R$ ${(d.totalBruto||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {mesAberto===form.mesLucro&&!mesFechado&&(
                        <div style={{background:"#22c55e15",border:"1px solid #22c55e44",borderRadius:8,padding:"8px 14px",marginBottom:10,color:"#4ade80",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:8}}>
                          🔒 Lançamento de {nomeMes(form.mesLucro.split("/")[0])} {form.mesLucro.split("/")[1]||""} fechado
                          <button onClick={()=>setMesAberto(null)} style={{background:"transparent",border:"1px solid #22c55e",borderRadius:6,color:"#4ade80",padding:"2px 8px",cursor:"pointer",fontSize:11,marginLeft:"auto"}}>Reabrir</button>
                        </div>
                      )}
                      {mesFechado&&(
                        <div style={{background:"#ef444415",border:"2px solid #ef444455",borderRadius:8,padding:"10px 14px",marginBottom:10,color:"#f87171",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:8}}>
                          🚫 O mês {nomeMes(form.mesLucro.split("/")[0])} {form.mesLucro.split("/")[1]||""} já foi fechado e enviado ao Relatório IR.
                          <span style={{color:"#94a3b8",fontWeight:400,fontSize:11,marginLeft:4}}>Altere o mês acima para lançar um novo.</span>
                        </div>
                      )}
                      <div style={{color:"#7fb3d3",fontSize:11,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:0.8,fontFamily:"Arial,sans-serif"}}>Lançamento das Notas</div>
                      <div style={{color:t.muted,fontSize:11,marginBottom:10,lineHeight:1.5,padding:"8px 12px",background:t.bg,borderRadius:8,border:`1px solid ${t.border}`}}>
                        <strong style={{color:t.text}}>Como preencher:</strong> Para cada nota de corretagem do mês:<br/>
                        • <strong style={{color:"#4ade80"}}>Valor dos Negócios</strong> = total bruto das operações<br/>
                        • <strong style={{color:"#f59e0b"}}>Total Despesas</strong> = corretagem + BMF + emolumentos + ISS
                      </div>
                      <div style={{overflowX:"auto"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead>
                            <tr style={{background:t.bg}}>
                              <th style={{padding:"8px 10px",color:t.muted,fontWeight:700,fontSize:10,textAlign:"left",borderBottom:`2px solid ${t.border}`,width:110}}>Data</th>
                              <th style={{padding:"8px 10px",color:"#4ade80",fontWeight:700,fontSize:10,textAlign:"right",borderBottom:`2px solid ${t.border}`}}>Valor Negócios (R$)</th>
                              <th style={{padding:"8px 10px",color:"#f59e0b",fontWeight:700,fontSize:10,textAlign:"right",borderBottom:`2px solid ${t.border}`}}>Total Despesas (R$)</th>
                              <th style={{padding:"8px 10px",color:"#fb923c",fontWeight:700,fontSize:10,textAlign:"right",borderBottom:`2px solid ${t.border}`}}>+ Outros Custos</th>
                              <th style={{padding:"8px 10px",color:"#fb923c",fontWeight:700,fontSize:10,textAlign:"right",borderBottom:`2px solid ${t.border}`}}>I.S.S</th>
                              <th style={{padding:"8px 10px",color:"#60a5fa",fontWeight:700,fontSize:10,textAlign:"right",borderBottom:`2px solid ${t.border}`}}>Total Líquido</th>
                              <th style={{padding:"8px 10px",color:"#a855f7",fontWeight:700,fontSize:10,textAlign:"right",borderBottom:`2px solid ${t.border}`}}>IRPF (1%)</th>
                              <th style={{padding:"8px 6px",borderBottom:`2px solid ${t.border}`,width:60,textAlign:"center",color:t.muted,fontWeight:700,fontSize:10}}>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {notasCalc.map((n, i) => {
                              const locked = notasLocked.includes(i) && !notasEditando.includes(i);
                              return (
                              <tr key={i} style={{background: locked ? (i%2===0?"#0f172a44":t.bg+"88") : (i%2===0?"transparent":t.bg+"66"), opacity: locked ? 0.85 : 1}}>
                                <td style={{padding:"5px 6px",borderBottom:`1px solid ${t.border}22`}}>
                                  {locked
                                    ? <span style={{color:t.text,fontSize:12,padding:"0 4px"}}>{n.data||"—"}</span>
                                    : <input type="date" value={n.data}
                                        onChange={e=>{
                                          const v = e.target.value;
                                          const ano = parseInt((v||"").split("-")[0]);
                                          if(ano > 2099) return;
                                          setNota(i,"data",v);
                                        }}
                                        max="2099-12-31"
                                        style={{...inpSm,width:118}}/>
                                  }
                                </td>
                                <td style={{padding:"5px 6px",borderBottom:`1px solid ${t.border}22`}}>
                                  {locked
                                    ? <span style={{color:"#4ade80",fontSize:12,fontWeight:700,display:"block",textAlign:"right",padding:"0 4px"}}>{n.valorNegocios ? Number(n.valorNegocios).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "—"}</span>
                                    : <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]{0,2}" placeholder="0,00" value={n.valorNegocios}
                                        onChange={e=>setNota(i,"valorNegocios",e.target.value)}
                                        onBlur={e => setNota(i, "valorNegocios", normalizeValue(e.target.value))}
                                        style={{...inpSm,textAlign:"right",border:"1px solid #4ade8033",minWidth:120}}/>
                                  }
                                </td>
                                <td style={{padding:"5px 6px",borderBottom:`1px solid ${t.border}22`}}>
                                  {locked
                                    ? <span style={{color:"#f59e0b",fontSize:12,fontWeight:700,display:"block",textAlign:"right",padding:"0 4px"}}>{n.totalDespesas ? Number(n.totalDespesas).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "—"}</span>
                                    : <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]{0,2}" placeholder="0,00" value={n.totalDespesas}
                                        onChange={e=>setNota(i,"totalDespesas",e.target.value)}
                                        onBlur={e => setNota(i, "totalDespesas", normalizeValue(e.target.value))}
                                        style={{...inpSm,textAlign:"right",border:"1px solid #f59e0b33",minWidth:120}}/>
                                  }
                                </td>
                                <td style={{padding:"5px 6px",borderBottom:`1px solid ${t.border}22`}}>
                                  {locked
                                    ? <span style={{color:"#fb923c",fontSize:12,fontWeight:700,display:"block",textAlign:"right",padding:"0 4px"}}>{n.outrosCustos ? Number(n.outrosCustos).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "—"}</span>
                                    : <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]{0,2}" placeholder="0,00" value={n.outrosCustos}
                                        onChange={e=>setNota(i,"outrosCustos",e.target.value)}
                                        onBlur={e => setNota(i, "outrosCustos", normalizeValue(e.target.value))}
                                        style={{...inpSm,textAlign:"right",border:"1px solid #fb923c33",minWidth:90}}/>
                                  }
                                </td>
                                <td style={{padding:"5px 6px",borderBottom:`1px solid ${t.border}22`}}>
                                  {locked
                                    ? <span style={{color:"#fb923c",fontSize:12,fontWeight:700,display:"block",textAlign:"right",padding:"0 4px"}}>{n.iss ? Number(n.iss).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "—"}</span>
                                    : <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]{0,2}" placeholder="0,00" value={n.iss}
                                        onChange={e=>setNota(i,"iss",e.target.value)}
                                        onBlur={e => setNota(i, "iss", normalizeValue(e.target.value))}
                                        style={{...inpSm,textAlign:"right",border:"1px solid #fb923c33",minWidth:80}}/>
                                  }
                                </td>
                                <td style={{padding:"5px 10px",textAlign:"right",fontWeight:700,color:corLiq(n.liq),borderBottom:`1px solid ${t.border}22`}}>
                                  {(n.valorNegocios||n.totalDespesas) ? brl(n.liq) : "—"}
                                </td>
                                <td style={{padding:"5px 10px",textAlign:"right",fontWeight:700,color:"#a855f7",borderBottom:`1px solid ${t.border}22`}}>
                                  {(n.valorNegocios||n.totalDespesas) ? (n.irpf>0?brl(n.irpf):<span style={{color:t.muted}}>R$ 0,00</span>) : "—"}
                                </td>
                                <td style={{padding:"5px 4px",borderBottom:`1px solid ${t.border}22`,textAlign:"center",whiteSpace:"nowrap"}}>
                                  {notasLocked.includes(i)&&(
                                    <button onClick={()=>toggleEditNota(i)}
                                      title={notasEditando.includes(i)?"Bloquear":"Editar"}
                                      style={{background:"transparent",border:"none",color:notasEditando.includes(i)?"#22c55e":"#60a5fa",cursor:"pointer",fontSize:12,padding:"2px 4px",fontWeight:700}}>
                                      {notasEditando.includes(i)?"✓":"✎"}
                                    </button>
                                  )}
                                  {notas.length>1&&<button onClick={()=>removeNota(i)} style={{background:"transparent",border:"none",color:"#f87171",cursor:"pointer",fontSize:13,padding:"2px 4px"}}>✕</button>}
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{background:t.bg,borderTop:`2px solid ${t.border}`}}>
                              <td colSpan={5} style={{padding:"8px 10px",color:t.muted,fontSize:11,fontWeight:700}}>TOTAIS</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontSize:13,color:corLiq(totalBrutoReal)}}>{brl(totalBrutoReal)}</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontSize:13,color:"#a855f7"}}>{brl(totalIRPF)}</td>
                              <td/>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <button onClick={()=>{
                        if (!form.mesLucro || form.mesLucro.length < 7) {
                          alert("⚠️ Preencha o campo 'Mês de Referência' (MM/AAAA) antes de adicionar a nota do dia.");
                          return;
                        }
                        const temNota = notasCalc.some(n => (parseFloat(n.valorNegocios)||0) !== 0 || (parseFloat(n.totalDespesas)||0) !== 0);
                        if (!temNota) {
                          alert("⚠️ Preencha pelo menos uma nota antes de adicionar.");
                          return;
                        }
                        const dia = {
                          mes: form.mesLucro,
                          nomeMesStr: nomeMes(form.mesLucro.split("/")[0]) + " " + (form.mesLucro.split("/")[1]||""),
                          data: new Date().toLocaleDateString("pt-BR"),
                          notas: notasCalc,
                          totalBruto: notasCalc.reduce((s,n)=>s+(n.liq||0),0),
                          irpf: notasCalc.reduce((s,n)=>s+(n.irpf||0),0),
                        };
                        if (onFecharDia) onFecharDia(dia);
                        setNotas([{ data:"", valorNegocios:"", totalDespesas:"", outrosCustos:"", iss:"" }]);
                        setNotasLocked([]);
                        setNotasEditando([]);
                        const totalNota = notasCalc.reduce((s,n)=>s+(n.liq||0),0);
                        setToastNota(`✅ Nota do dia salva! Total: R$ ${totalNota.toLocaleString("pt-BR",{minimumFractionDigits:2})}`);
                        setTimeout(()=>setToastNota(null),4000);
                      }}
                        style={{marginTop:10,background:"#2563eb",border:"1px solid #1d4ed8",borderRadius:6,color:"#fff",padding:"10px 14px",cursor:"pointer",fontSize:12,width:"100%",fontFamily:"Arial,sans-serif",letterSpacing:1,fontWeight:800,textTransform:"uppercase"}}>
                        ADICIONAR NOTA DO DIA
                      </button>
                    </div>
                      );
                    })()}

                    {/* COLUNA DIREITA */}
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>

                      {/* Mês de Referência */}
                      <div style={{background:t.card,border:`2px solid ${form.mesLucro?"#16a34a":"#d97706"}`,borderRadius:10,overflow:"hidden"}}>
                        <div style={{background:form.mesLucro?"#16a34a":"#d97706",padding:"8px 14px"}}>
                          <div style={{color:"#fff",fontSize:10,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",fontFamily:"Arial,sans-serif"}}>
                            Mês de Referência{!form.mesLucro&&<span style={{fontWeight:400,opacity:0.85}}> — obrigatório</span>}
                          </div>
                        </div>
                        <div style={{padding:"12px 14px"}}>
                          <input placeholder="MM/AAAA" value={form.mesLucro}
                            onChange={e=>handleMesLucro(e.target.value)}
                            maxLength={7}
                            style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:6,color:t.text,padding:"9px 12px",fontSize:15,fontWeight:700,width:"100%",outline:"none",fontFamily:"Arial Narrow,Arial,sans-serif",boxSizing:"border-box"}}/>
                          {form.mesLucro&&nomeMes(form.mesLucro.split("/")[0])&&(
                            <div style={{color:"#2563eb",fontSize:12,marginTop:6,fontWeight:600,fontFamily:"Arial,sans-serif"}}>
                              {nomeMes(form.mesLucro.split("/")[0])} / {form.mesLucro.split("/")[1]||""}
                            </div>
                          )}
                          {form.mesLucro&&form.mesLucro.length===7&&relIrDados&&relIrDados.some(d=>d.mes===form.mesLucro&&(d.dias||[]).some(di=>(di.totalBruto||0)!==0||(di.irpf||0)!==0))&&(
                            <div style={{color:"#dc2626",fontSize:11,marginTop:4,fontWeight:700,fontFamily:"Arial,sans-serif"}}>Mês já fechado no Relatório IR</div>
                          )}
                        </div>
                      </div>

                      {/* Resumo */}
                      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:10,overflow:"hidden"}}>
                        <div style={{background:darkMode?"#1e3a5f":"#dbeafe",padding:"10px 16px",borderBottom:`1px solid ${darkMode?"#2d5a8e":"#bfdbfe"}`}}>
                          <div style={{color:darkMode?"#93c5fd":"#1e3a8a",fontSize:12,fontWeight:800,letterSpacing:0.6,textTransform:"uppercase",fontFamily:"Arial,sans-serif"}}>Resumo do Mês</div>
                        </div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"Arial,sans-serif"}}>
                          <tbody>
                            <tr style={{borderBottom:`1px solid ${t.border}`}}>
                              <td style={{padding:"11px 16px",color:t.text,fontWeight:600,fontSize:13}}>Total Bruto</td>
                              <td style={{padding:"11px 16px",textAlign:"right",fontWeight:800,color:corLiq(totalBrutoReal),fontSize:15}}>{brl(totalBrutoReal)}</td>
                            </tr>
                            <tr style={{borderBottom:`1px solid ${t.border}`}}>
                              <td style={{padding:"11px 16px",color:t.text,fontWeight:600,fontSize:13}}>IRPF Retido (1%)</td>
                              <td style={{padding:"11px 16px",textAlign:"right",fontWeight:800,color:darkMode?"#c4b5fd":"#7c3aed",fontSize:15}}>{brl(totalIRPF)}</td>
                            </tr>
                            {!totalBrutoNeg&&(
                              <tr style={{borderBottom:`1px solid ${t.border}`}}>
                                <td style={{padding:"11px 16px",color:t.text,fontWeight:600,fontSize:13}}>Base (×20%)</td>
                                <td style={{padding:"11px 16px",textAlign:"right",fontWeight:800,color:darkMode?"#60a5fa":"#2563eb",fontSize:15}}>{brl(totalBrutoPositivo*0.20)}</td>
                              </tr>
                            )}
                            {totalBrutoNeg&&(
                              <tr style={{background:darkMode?"#3b0f0f":"#fef2f2",borderBottom:`1px solid ${t.border}`}}>
                                <td style={{padding:"11px 16px",color:darkMode?"#fca5a5":"#dc2626",fontWeight:700,fontSize:13,fontFamily:"Arial,sans-serif"}}>A Compensar Próx. Mês</td>
                                <td style={{padding:"11px 16px",textAlign:"right",fontWeight:900,color:darkMode?"#fca5a5":"#dc2626",fontSize:15}}>{brl(valorCompensarProx)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {totalBrutoNeg&&(
                          <div style={{padding:"10px 16px",background:darkMode?"#2d0f0f":"#fef2f2",borderTop:`1px solid ${darkMode?"#5a1a1a":"#fecaca"}`,fontSize:12,color:darkMode?"#fca5a5":"#dc2626",lineHeight:1.7,fontFamily:"Arial,sans-serif"}}>
                            Resultado negativo — sem DARF a pagar.<br/>
                            Prejuízo será compensado no próximo mês com lucro.
                            {totalIRPF > 0 && <><br/>IR fonte de {brl(totalIRPF)} será creditado no próximo mês positivo.</>}
                          </div>
                        )}
                      </div>


                    </div>
                  </div>
                  </div>
                )}
              </div>

              {/* ── Gerador DARF — somente Capital Próprio ── */}
              {operaPor==="proprio"&&<div style={{...cardStyle,border:"1px solid #60a5fa44"}}>
                <div style={{color:"#60a5fa",fontWeight:800,fontSize:14,marginBottom:14}}>📋 Gerador de DARF</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginBottom:12}}>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{display:"block",color:t.muted,fontSize:11,marginBottom:5,fontWeight:600}}>👤 Nome Completo</label>
                    <input placeholder="Seu nome completo" value={form.nomeCompleto} onChange={e=>set("nomeCompleto",e.target.value)} style={inp}/>
                  </div>
                  <div>
                    <label style={{display:"block",color:t.muted,fontSize:11,marginBottom:5,fontWeight:600}}>🪪 CPF</label>
                    <input placeholder="000.000.000-00" value={form.cpf}
                      onChange={e=>handleCpf(e.target.value)}
                      maxLength={14}
                      style={inp}/>
                  </div>
                  <div>
                    <label style={{display:"block",color:t.muted,fontSize:11,marginBottom:5,fontWeight:600}}>📅 Data de Emissão da Guia</label>
                    <input value={hojeStr} readOnly style={{...inp,color:"#4ade80",fontWeight:700,cursor:"not-allowed"}}/>
                    <div style={{color:t.muted,fontSize:10,marginTop:3}}>Gerada automaticamente — hoje</div>
                  </div>
                  <div>
                    <label style={{display:"block",color:t.muted,fontSize:11,marginBottom:5,fontWeight:600}}>📆 Mês do Lucro</label>
                    <input placeholder="MM/AAAA" value={form.mesLucro}
                      onChange={e=>handleMesLucro(e.target.value)}
                      maxLength={7}
                      style={inp}/>
                    {form.mesLucro&&nomeMes(form.mesLucro.split("/")[0])&&(
                      <div style={{color:"#60a5fa",fontSize:11,marginTop:3}}>📅 {nomeMes(form.mesLucro.split("/")[0])} {form.mesLucro.split("/")[1]||""}</div>
                    )}
                    {form.mesLucro&&form.mesLucro.length===7&&relIrDados&&relIrDados.some(d=>d.mes===form.mesLucro&&(d.dias||[]).some(di=>(di.totalBruto||0)!==0||(di.irpf||0)!==0))&&(
                      <div style={{color:"#f87171",fontSize:11,marginTop:3,fontWeight:700}}>⛔ {nomeMes(form.mesLucro.split("/")[0])} {form.mesLucro.split("/")[1]||""} já foi fechado — use outro mês</div>
                    )}
                  </div>
                  <div>
                    <label style={{display:"block",color:t.muted,fontSize:11,marginBottom:5,fontWeight:600}}>🔢 Código da Receita</label>
                    <input value="6015 — Renda Variável" readOnly style={{...inp,color:"#94a3b8",cursor:"not-allowed"}}/>
                  </div>
                  <div>
                    <label style={{display:"block",color:t.muted,fontSize:11,marginBottom:5,fontWeight:600}}>📅 Vencimento (automático)</label>
                    <input value={vencimento||"Preencha o Mês do Lucro"} readOnly style={{...inp,color:vencimento?"#4ade80":"#94a3b8",fontWeight:700,cursor:"not-allowed"}}/>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{display:"block",color:t.muted,fontSize:11,marginBottom:5,fontWeight:600}}>💰 Valor do Imposto (R$)</label>
                    <input type="number" step="0.01" placeholder={valorTotalDARF>0?valorTotalDARF.toFixed(2):"ex: 150.00"}
                      value={form.valorImpostoPagar} onChange={e=>set("valorImpostoPagar",e.target.value)} style={inp}/>
                    {valorTotalDARF>0&&!form.valorImpostoPagar&&(
                      <div style={{color:"#4ade80",fontSize:11,marginTop:3,cursor:"pointer"}} onClick={()=>set("valorImpostoPagar",valorTotalDARF.toFixed(2))}>
                        💡 Usar valor calculado: {brl(valorTotalDARF)} (clique)
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Botão CALCULAR multa/juros ── */}
                <div style={{marginBottom:14}}>
                  <button onClick={calcularMultaJuros} disabled={!vencimento||!form.valorImpostoPagar||calculando}
                    style={{width:"100%",padding:"11px",background:(!vencimento||!form.valorImpostoPagar)?"#1e293b":"linear-gradient(135deg,#1e3a5f,#1e1b4b)",border:`1px solid ${(!vencimento||!form.valorImpostoPagar)?"#334155":"#60a5fa44"}`,borderRadius:10,color:(!vencimento||!form.valorImpostoPagar)?"#475569":"#93c5fd",fontSize:13,fontWeight:700,cursor:(!vencimento||!form.valorImpostoPagar)?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    {calculando?"⏳ Verificando data online...":"🔍 Calcular Multa/Juros (verifica data atual online)"}
                  </button>
                  {(!vencimento||!form.valorImpostoPagar)&&(
                    <div style={{color:"#475569",fontSize:10,marginTop:4,textAlign:"center"}}>Preencha o Mês do Lucro e o Valor do Imposto para calcular</div>
                  )}
                </div>

                {/* Resultado do cálculo */}
                {mulJurCalc&&(
                  <div style={{marginBottom:14,borderRadius:10,overflow:"hidden",border:`1px solid ${mulJurCalc.dentroDobrazo||mulJurCalc.diasAtraso===0?"#22c55e33":"#ef444433"}`}}>
                    <div style={{background:mulJurCalc.diasAtraso>0?"#ef444415":"#22c55e15",padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{color:mulJurCalc.diasAtraso>0?"#f87171":"#4ade80",fontWeight:700,fontSize:13}}>
                        {mulJurCalc.diasAtraso>0?`⚠️ Em ATRASO — ${mulJurCalc.diasAtraso} dias`:"✅ Dentro do prazo — sem multa ou juros"}
                      </div>
                      <div style={{color:t.muted,fontSize:10}}>Calculado em {mulJurCalc.dataCalculo}</div>
                    </div>
                    {mulJurCalc.diasAtraso>0&&(
                      <div style={{padding:"12px 14px",background:"#0f172a"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                          {[
                            ["Principal",brl(parseFloat(form.valorImpostoPagar)||0),t.text],
                            [`Multa (${mulJurCalc.multaPct?.toFixed(2)}%)`,brl(mulJurCalc.multa),"#f87171"],
                            ["Juros SELIC+1%",brl(mulJurCalc.juros),"#f87171"],
                            ["TOTAL A PAGAR",brl(mulJurCalc.total),"#f87171"]
                          ].map(([l,v,c])=>(
                            <div key={l} style={{background:t.bg,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                              <div style={{color:t.muted,fontSize:9,fontWeight:600}}>{l}</div>
                              <div style={{color:c,fontWeight:800,fontSize:13}}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{color:"#475569",fontSize:10,marginTop:8}}>⚠️ Juros baseados em SELIC estimada (~1,075%/mês). Verifique no Banco Central.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ⚠️ Aviso legal */}
                <div style={{background:"#1a0a00",border:"1px solid #f59e0b55",borderRadius:8,padding:"10px 14px",marginBottom:10,display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
                  <div style={{fontSize:11,color:"#fbbf24",lineHeight:1.6}}>
                    Esta ferramenta <strong>apenas auxilia no cálculo</strong> da guia DARF. As informações inseridas e a <strong>responsabilidade pelo pagamento são do contribuinte</strong>. Sempre confira os valores no site oficial da Receita Federal antes de efetuar o pagamento.
                  </div>
                </div>

                <button onClick={gerarDARF}
                  style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#1a3c6b,#1e40af)",border:"none",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  🖨️ Gerar DARF (PDF)
                </button>
                {false&&(
                  <div style={{color:"#475569",fontSize:11,marginTop:4,textAlign:"center"}}>Clique em "Calcular Multa/Juros" antes de gerar o DARF</div>
                )}
              </div>}

              {/* Instruções */}
              <div style={{...cardStyle,border:"1px solid #a855f733"}}>
                <div style={{color:"#a855f7",fontWeight:700,fontSize:14,marginBottom:10}}>📚 Como funciona o IR em Renda Variável (Futuros — Código 6015)</div>
                <div style={{display:"flex",flexDirection:"column",gap:8,color:t.muted,fontSize:12,lineHeight:1.7}}>
                  <div>📌 <strong style={{color:t.text}}>Quem deve pagar:</strong> Todo trader PF com lucro líquido positivo no mês em Day Trade</div>
                  <div>📅 <strong style={{color:t.text}}>Prazo:</strong> Último dia útil do mês seguinte ao mês do lucro</div>
                  <div>💰 <strong style={{color:t.text}}>Alíquota:</strong> 20% sobre o lucro líquido, já deduzido o IRPF de 1% retido na fonte</div>
                  <div>➖ <strong style={{color:t.text}}>Dedução de prejuízo:</strong> Prejuízos de meses anteriores podem ser abatidos</div>
                  <div>⚠️ <strong style={{color:t.text}}>Multa por atraso:</strong> 0,33%/dia limitado a 20% + juros SELIC</div>
                  <div>🏦 <strong style={{color:t.text}}>Onde pagar:</strong> Receita Federal → Pagamentos → DARF, ou em qualquer banco</div>
                  <div>📤 <strong style={{color:t.text}}>Mês negativo:</strong> Se o resultado do mês for negativo, não há DARF. O prejuízo pode ser compensado no mês seguinte com lucro. O IR fonte (1%) retido em meses negativos é creditado integralmente no próximo DARF</div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
function RelatorioIRTab({t, dados, onLimpar, onDeleteMes, userId, diasMesPendente, onEditarDia, onFecharMesPendente, onDeleteDiaPendente, onEditDiaPendente, onGerarDarf, darkMode}) {
  const { useState: us, useEffect: ue, useCallback: uc } = React;
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 900;
  const brl = v => `R$ ${(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const cardStyle = {background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"18px 20px",marginBottom:14};
  const [savedRows, setSavedRows] = us([]);
  const [saving, setSaving] = us(false);
  const [loadingSaved, setLoadingSaved] = us(true);
  const [toast2, setToast2] = us(null);
  const [expandedMes, setExpandedMes] = us(null); // which month row is expanded
  const [editandoDia, setEditandoDia] = us(null); // {mes, diaIdx}
  const [editandoPendente, setEditandoPendente] = us(null); // {diaIdx, notas:[...]}
  const [editandoNota, setEditandoNota] = us(null); // {mes, diaIdx, notaIdx}
  const [notaEditValue, setNotaEditValue] = us({data:"", valorNegocios:"", totalDespesas:""});

  const parseDecimal = (valor) => {
    const str = String(valor||"").replace(",", ".").replace(/[^0-9.-]/g, "");
    const n = parseFloat(str);
    return Number.isNaN(n) ? 0 : n;
  };

  const handleGerarDarf = (mesRef, nomeMesStr, valor) => {
    if(!valor || valor <= 0) return;
    if(!window.confirm(`Lançar DARF mês requisitado?\n\nMês: ${nomeMesStr}\nValor: ${brl(valor)}`)) {
      return;
    }
    const prefill = { mes: mesRef, valor, codigo: "6015", tipo: "capital_proprio" };
    if(onGerarDarf) {
      onGerarDarf(prefill);
      setToast2(`➡️ Abrindo gerador de DARF para ${nomeMesStr}. Preencha Nome e CPF.`);
    } else {
      setToast2(`💳 DARF para ${nomeMesStr}: ${brl(valor)} (verifique em SICALC)`);
      window.open("https://www3.fazenda.gov.br/consulta-de-darf", "_blank");
    }
    setTimeout(()=>setToast2(null), 5000);
  };

  const handleSalvarNota = (mes, diaIdx, notaIdx) => {
    if(!editandoNota || !onEditarDia) return;
    const mesObj = dados.find(x => x.mes===mes);
    if(!mesObj) return;
    const dia = mesObj.dias?.[diaIdx];
    if(!dia) return;
    const novasNotas = (dia.notas||[]).map((nota,i) => i===notaIdx ? {
      ...nota,
      data: notaEditValue.data || nota.data || "",
      valorNegocios: parseDecimal(notaEditValue.valorNegocios).toFixed(2),
      totalDespesas: parseDecimal(notaEditValue.totalDespesas).toFixed(2),
      liq: parseDecimal(notaEditValue.valorNegocios) - parseDecimal(notaEditValue.totalDespesas),
      irpf: Math.max(0, (parseDecimal(notaEditValue.valorNegocios) - parseDecimal(notaEditValue.totalDespesas)) * 0.01)
    } : nota);
    onEditarDia(mes, diaIdx, novasNotas);
    setEditandoNota(null);
    setToast2(`✍️ Nota do dia atualizada em ${mes}.`);
    setTimeout(()=>setToast2(null), 4000);
  };

  const handleExcluirNota = (mes, diaIdx, notaIdx) => {
    if(!onEditarDia) return;
    if(!window.confirm("🗑️ Excluir nota?")) return;
    const mesObj = dados.find(x => x.mes===mes);
    if(!mesObj) return;
    const dia = mesObj.dias?.[diaIdx];
    if(!dia) return;
    const novasNotas = (dia.notas||[]).filter((_,i)=>i!==notaIdx);
    onEditarDia(mes, diaIdx, novasNotas);
    setToast2(`🗑️ Nota excluída em ${mes}.`);
    setTimeout(()=>setToast2(null), 4000);
  };

  const handleDeleteSalvo = uc(async (row) => {
    if(!window.confirm(`🗑️ Excluir o relatório de ${row.mes}?\n\nEsta ação é irreversível.`)) return;
    const {error} = await supabase.from("relatorios_ir").delete().eq("id", row.id);
    if(error){ setToast2("❌ Erro ao excluir: "+error.message); return; }
    setSavedRows(prev => prev.filter(r => r.id !== row.id));
    setToast2("✅ Relatório de "+row.mes+" excluído.");
    setTimeout(()=>setToast2(null), 3000);
  }, []);

  const handleDeleteAtual = (mes) => {
    if(!window.confirm(`🗑️ Excluir o mês ${mes} da apuração atual?\n\nEsta ação remove da sessão atual. Se já foi salvo no banco, use o Histórico Salvo.`)) return;
    if(onDeleteMes) onDeleteMes(mes);
  };

  // Carregar relatórios salvos do Supabase
  ue(() => {
    if (!userId) return;
    supabase.from("relatorios_ir").select("*").eq("user_id", userId).order("created_at", {ascending:false})
      .then(({data}) => { if(data) setSavedRows(data); setLoadingSaved(false); });
  }, [userId]);

  // ── Lógica de compensação sequencial ──
  let saldoComp = 0;
  let irpfAcum = 0; // IR fonte acumulado de meses negativos ainda não creditado
  const mesesProcessados = dados.map((d) => {
    const saldoEntrou = saldoComp;
    if(d.totalBrutoNeg) {
      // Sempre usa |totalBrutoReal| — ignora valorCompensarProx legado (que somava IRPF incorretamente)
      const prejuizo = Math.abs(d.totalBrutoReal||0);
      saldoComp += prejuizo;
      irpfAcum  += d.totalIRPF || 0; // acumula IR fonte para creditar no próximo mês positivo
      return {...d, saldoEntrou, compUsada:0, saldoRestante:saldoComp, base:0, ir20:0, darf:0, prejuizoGerado:prejuizo};
    } else {
      const bruto    = d.totalBrutoReal || 0;
      const irpf     = d.totalIRPF || 0;
      const irpfTotal = irpf + irpfAcum; // IR fonte do mês + acumulado de meses negativos anteriores
      const compUsada = Math.min(saldoComp, bruto);
      const base  = Math.max(0, bruto - compUsada);
      const ir20  = base * 0.20;
      const darf  = Math.max(0, ir20 - irpfTotal);
      saldoComp   = Math.max(0, saldoComp - compUsada);
      irpfAcum    = 0; // IR fonte foi creditado neste mês
      return {...d, saldoEntrou, compUsada, saldoRestante:saldoComp, base, ir20, darf, prejuizoGerado:0, irpfUsado:irpfTotal};
    }
  });

  const saldoAtual = saldoComp;
  const totalDARF = mesesProcessados.reduce((s,m) => s + m.darf, 0);
  const totalIRPFTotal = mesesProcessados.reduce((s,m) => s + (m.totalIRPF||0), 0);
  const totalBruto = mesesProcessados.reduce((s,m) => s + (m.totalBrutoReal||0), 0);

  // ── Salvar no Supabase + fallback CSV local ──
  const handleSalvar = uc(async () => {
    if (mesesProcessados.length === 0) { setToast2("⚠️ Nenhum mês para salvar."); return; }
    setSaving(true);
    setToast2(null);

    // ── Sempre gera CSV local (download direto, não depende de Supabase) ──
    const header = "Mês;Fechado em;Bruto;IRPF 1%;Comp. Usada;Base Cálculo;IR 20%;DARF;Saldo Restante;Status\n";
    const csvLocal = header + mesesProcessados.map(m =>
      `${m.nomeMesStr||""};${m.dataFechamento||""};${(m.totalBrutoReal||0).toFixed(2)};${(m.totalIRPF||0).toFixed(2)};${(m.compUsada||0).toFixed(2)};${(m.base||0).toFixed(2)};${(m.ir20||0).toFixed(2)};${(m.darf||0).toFixed(2)};${(m.saldoRestante||0).toFixed(2)};${m.totalBrutoNeg?"Prejuízo":m.darf>0?"Recolher DARF":"Sem DARF"}`
    ).join("\n");
    const blob = new Blob(["\uFEFF"+csvLocal], {type:"text/csv;charset=utf-8;"});
    const urlCsv = URL.createObjectURL(blob);
    const aEl = document.createElement("a");
    aEl.href = urlCsv;
    aEl.download = `RelatorioIR_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(aEl);
    aEl.click();
    document.body.removeChild(aEl);
    URL.revokeObjectURL(urlCsv);

    // ── Tenta salvar no Supabase se usuário autenticado ──
    if (userId) {
      const payload = mesesProcessados.map(m => ({
        user_id: userId,
        mes: m.nomeMesStr || "",
        data_fechamento: m.dataFechamento || null,
        total_bruto: m.totalBrutoReal || 0,
        irpf_retido: m.totalIRPF || 0,
        compensacao_usada: m.compUsada || 0,
        base_calculo: m.base || 0,
        ir_20: m.ir20 || 0,
        darf: m.darf || 0,
        saldo_restante: m.saldoRestante || 0,
        prejuizo_gerado: m.prejuizoGerado || 0,
        negativo: !!m.totalBrutoNeg,
        dados_json: JSON.stringify(m),
        created_at: new Date().toISOString(),
      }));
      try {
        const {error} = await supabase.from("relatorios_ir").upsert(payload, {onConflict:"user_id,mes", ignoreDuplicates:false});
        if (error) {
          setToast2("✅ CSV salvo no computador! (Banco: " + error.message + ")");
        } else {
          setToast2("✅ CSV baixado + salvo no banco de dados!");
          const {data} = await supabase.from("relatorios_ir").select("*").eq("user_id", userId).order("created_at", {ascending:false});
          if (data) setSavedRows(data);
        }
      } catch(e) {
        setToast2("✅ CSV salvo no computador! (Banco indisponível)");
      }
    } else {
      setToast2("✅ CSV salvo no seu computador com sucesso!");
    }
    setSaving(false);
    setTimeout(() => setToast2(null), 5000);
  }, [userId, mesesProcessados]);

  // ── Download CSV ──
  const downloadCSV = (source) => {
    const rows = source === "atual" ? mesesProcessados : savedRows.map(r => ({
      nomeMesStr: r.mes, dataFechamento: r.data_fechamento,
      totalBrutoReal: r.total_bruto, totalIRPF: r.irpf_retido,
      compUsada: r.compensacao_usada, base: r.base_calculo,
      ir20: r.ir_20, darf: r.darf, saldoRestante: r.saldo_restante,
      totalBrutoNeg: r.negativo,
    }));
    const header = "Mês;Fechado em;Bruto;IRPF 1%;Comp. Usada;Base Cálculo;IR 20%;DARF;Saldo Restante;Status\n";
    const csv = header + rows.map(m =>
      `${m.nomeMesStr};${m.dataFechamento};${(m.totalBrutoReal||0).toFixed(2)};${(m.totalIRPF||0).toFixed(2)};${(m.compUsada||0).toFixed(2)};${(m.base||0).toFixed(2)};${(m.ir20||0).toFixed(2)};${(m.darf||0).toFixed(2)};${(m.saldoRestante||0).toFixed(2)};${m.totalBrutoNeg?"Prejuízo":m.darf>0?"Recolher DARF":"Sem DARF"}`
    ).join("\n");
    const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `relatorio_IR_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Download HTML/Print ──
  const downloadPDF = () => {
    const rows = mesesProcessados;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Relatório IR - TradeVision</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}
      h1{color:#1d4ed8;font-size:22px;margin-bottom:4px}
      .sub{color:#64748b;font-size:13px;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#1e3a5f;color:#fff;padding:8px 10px;text-align:right}
      th:first-child{text-align:left}
      td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right}
      td:first-child{text-align:left;font-weight:700}
      .neg{color:#dc2626} .pos{color:#16a34a} .warn{color:#d97706}
      .footer{margin-top:20px;font-size:11px;color:#94a3b8}
      .summary{display:flex;gap:20px;margin-bottom:20px}
      .scard{background:#f8fafc;border-radius:8px;padding:12px 16px;flex:1}
      .scard .lbl{font-size:11px;color:#64748b;margin-bottom:4px}
      .scard .val{font-size:18px;font-weight:700}
    </style></head><body>
    <h1>📑 Relatório de Imposto de Renda</h1>
    <div class="sub">Gerado em ${new Date().toLocaleDateString("pt-BR")} · DARF Código 6015 · Mercado de Renda Variável</div>
    <div class="summary">
      <div class="scard"><div class="lbl">Total Bruto</div><div class="val ${totalBruto>=0?"pos":"neg"}">${brl(totalBruto)}</div></div>
      <div class="scard"><div class="lbl">IRPF Retido</div><div class="val" style="color:#7c3aed">${brl(totalIRPFTotal)}</div></div>
      <div class="scard"><div class="lbl">DARF Total</div><div class="val" style="color:#1d4ed8">${brl(totalDARF)}</div></div>
      <div class="scard"><div class="lbl">Saldo a Compensar</div><div class="val warn">${brl(saldoAtual)}</div></div>
    </div>
    <table><thead><tr>
      <th>Mês</th><th>Fechado em</th><th>Bruto</th><th>IRPF 1%</th><th>Comp. Usada</th><th>Base Cálc.</th><th>IR 20%</th><th>DARF</th><th>Saldo</th><th>Status</th>
    </tr></thead><tbody>
    ${rows.map(m=>`<tr>
      <td>${m.nomeMesStr}</td>
      <td>${m.dataFechamento}</td>
      <td class="${(m.totalBrutoReal||0)>=0?"pos":"neg"}">${brl(m.totalBrutoReal)}</td>
      <td style="color:#7c3aed">${brl(m.totalIRPF)}</td>
      <td class="warn">${m.compUsada>0?brl(m.compUsada):"—"}</td>
      <td>${m.totalBrutoNeg?"—":brl(m.base)}</td>
      <td>${m.totalBrutoNeg?"—":brl(m.ir20)}</td>
      <td style="color:#1d4ed8;font-weight:700">${brl(m.darf)}</td>
      <td class="warn">${m.saldoRestante>0?brl(m.saldoRestante):"—"}</td>
      <td>${m.totalBrutoNeg?"📤 Prejuízo":m.darf>0?"💳 Recolher":"✅ Sem DARF"}</td>
    </tr>`).join("")}
    </tbody></table>
    <div class="footer">TradeVision · Gerado automaticamente · Apenas para controle pessoal</div>
    </body></html>`;
    const blob = new Blob([html], {type:"text/html"});
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if(w) setTimeout(()=>w.print(), 800);
  };

  const allRows = savedRows; // histórico salvo

  return (
    <div>
      {/* Header */}
      <div style={{textAlign:"center",padding:"24px 0 18px"}}>
        <div style={{fontSize:40,marginBottom:8}}>📑</div>
        <h1 style={{fontSize:26,fontWeight:900,margin:"0 0 6px",background:"linear-gradient(135deg,#60a5fa,#22c55e)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Relatório de Imposto de Renda</h1>
        <div style={{color:t.muted,fontSize:13}}>Histórico de guias · Compensação automática · DARF Código 6015</div>
      </div>

      {/* Toast interno */}
      {toast2&&<div style={{background:toast2.startsWith("✅")?"#22c55e20":"#ef444420",border:`1px solid ${toast2.startsWith("✅")?"#22c55e55":"#ef444455"}`,borderRadius:8,padding:"10px 16px",marginBottom:12,color:toast2.startsWith("✅")?"#4ade80":"#f87171",fontWeight:600,fontSize:13,textAlign:"center"}}>{toast2}</div>}

      {/* Mês pendente (ADICIONAR NOTA DO DIA ainda não fechado) */}
      {diasMesPendente&&(()=>{
        const pTotalBruto = (diasMesPendente.dias||[]).reduce((s,d)=>s+(d.totalBruto||0),0);
        const pTotalIRPF = (diasMesPendente.dias||[]).reduce((s,d)=>s+(d.irpf||0),0);
        const pNeg = pTotalBruto < 0;
        const pCompUsada = pNeg ? 0 : Math.min(saldoAtual, pTotalBruto);
        const pBase = Math.max(0, pTotalBruto - pCompUsada);
        const pDarf = Math.max(0, pBase * 0.20 - pTotalIRPF);
        return (
          <div style={{background:t.card,border:"2px solid #2563eb",borderRadius:14,marginBottom:14,overflow:"hidden"}}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",padding:"16px 20px",gap:12}}>
              <button onClick={()=>setExpandedMes(expandedMes===`__pendente__`?null:`__pendente__`)}
                style={{flex:1,background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left",padding:0}}>
                <div style={{flex:1}}>
                  <div style={{color:"#60a5fa",fontWeight:900,fontSize:17,fontFamily:"Arial,sans-serif"}}>{diasMesPendente.nomeMesStr||diasMesPendente.mes}</div>
                  <div style={{color:t.muted,fontSize:12,marginTop:3}}>{(diasMesPendente.dias||[]).length} nota(s) adicionada(s) · Em andamento</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:pTotalBruto>=0?"#4ade80":"#f87171",fontWeight:900,fontSize:20}}>{brl(pTotalBruto)}</div>
                  <span style={{background:"#2563eb22",border:"1px solid #2563eb55",borderRadius:999,padding:"2px 10px",color:"#60a5fa",fontSize:11,fontWeight:700}}>⏳ Em andamento</span>
                </div>
                <div style={{color:"#60a5fa",fontSize:18,marginLeft:8}}>{expandedMes===`__pendente__`?"▲":"▼"}</div>
              </button>
              {onFecharMesPendente&&(diasMesPendente.dias||[]).length>0&&(
                <button onClick={()=>{
                  if(!window.confirm(`🔒 Fechar o mês ${diasMesPendente.nomeMesStr||diasMesPendente.mes}?\n\nO mês será lançado no Relatório IR e não poderá mais receber novas notas.\n\nTotal: ${brl(pTotalBruto)}`)) return;
                  onFecharMesPendente({
                    mes: diasMesPendente.mes,
                    nomeMesStr: diasMesPendente.nomeMesStr,
                    dias: diasMesPendente.dias,
                    totalBrutoReal: pTotalBruto,
                    totalIRPF: pTotalIRPF,
                    totalBrutoNeg: pNeg,
                    totalBrutoPositivo: pNeg ? 0 : pTotalBruto,
                    baseComComp: pBase,
                    valorLiquidoDARF: pDarf,
                    valorTotalDARF: pDarf,
                    valorCompensarProx: pNeg ? Math.abs(pTotalBruto) : 0,
                    dataFechamento: new Date().toLocaleDateString("pt-BR"),
                  });
                }}
                  style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:8,color:"#fff",padding:"10px 18px",cursor:"pointer",fontSize:13,fontWeight:800,whiteSpace:"nowrap",boxShadow:"0 3px 10px rgba(245,158,11,0.4)"}}>
                  🔒 Fechar Mês
                </button>
              )}
            </div>

            {/* Expanded content */}
            {expandedMes===`__pendente__`&&(
              <div style={{borderTop:`1px solid ${t.border}`,padding:"14px 20px"}}>
                {(diasMesPendente.dias||[]).length===0&&(
                  <div style={{color:t.muted,fontSize:13,padding:"8px 0",textAlign:"center"}}>Nenhuma nota adicionada ainda.</div>
                )}
                {(diasMesPendente.dias||[]).map((dia,di)=>(
                  <div key={di} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",marginBottom:10}}>
                    {/* Dia header + actions */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{color:"#60a5fa",fontWeight:700,fontSize:13}}>📅 {dia.data}</span>
                        <span style={{color:dia.totalBruto>=0?"#4ade80":"#f87171",fontWeight:800,fontSize:14}}>{brl(dia.totalBruto||0)}</span>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        {editandoPendente?.diaIdx===di ? (
                          <>
                            <button onClick={()=>{
                              const calcNota = n => {
                                const vn = parseFloat(n.valorNegocios)||0;
                                const td = parseFloat(n.totalDespesas)||0;
                                const liq = vn - td;
                                const irpf = liq>0 ? liq*0.01 : 0;
                                return {...n, liq, irpf};
                              };
                              const notasCalc = editandoPendente.notas.map(calcNota);
                              if(onEditDiaPendente) onEditDiaPendente(di, notasCalc);
                              setEditandoPendente(null);
                            }}
                              style={{background:"#22c55e20",border:"1px solid #22c55e55",borderRadius:6,color:"#4ade80",padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>✓ Salvar</button>
                            <button onClick={()=>setEditandoPendente(null)}
                              style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,color:t.muted,padding:"4px 10px",cursor:"pointer",fontSize:11}}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button onClick={()=>setEditandoPendente({diaIdx:di, notas:(dia.notas||[]).map(n=>({...n,valorNegocios:String(n.valorNegocios||""),totalDespesas:String(n.totalDespesas||"")}))})}
                              style={{background:"#2563eb20",border:"1px solid #2563eb55",borderRadius:6,color:"#60a5fa",padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>✏️ Editar</button>
                            <button onClick={()=>{
                              if(!window.confirm("🗑️ Excluir esta nota do dia?")) return;
                              if(onDeleteDiaPendente) onDeleteDiaPendente(di);
                            }}
                              style={{background:"#ef444415",border:"1px solid #ef444433",borderRadius:6,color:"#f87171",padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>🗑️ Excluir</button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Notes table - edit mode or read mode */}
                    {editandoPendente?.diaIdx===di ? (
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead><tr style={{color:t.muted}}>
                          <th style={{textAlign:"left",padding:"3px 6px",fontWeight:600}}>Data</th>
                          <th style={{textAlign:"right",padding:"3px 6px",fontWeight:600}}>Valor Negócios</th>
                          <th style={{textAlign:"right",padding:"3px 6px",fontWeight:600}}>Despesas</th>
                        </tr></thead>
                        <tbody>{editandoPendente.notas.map((n,ni)=>(
                          <tr key={ni} style={{borderTop:`1px solid ${t.border}`}}>
                            <td style={{padding:"4px 6px"}}>
                              <input value={n.data||""} onChange={e=>setEditandoPendente(prev=>({...prev,notas:prev.notas.map((x,xi)=>xi===ni?{...x,data:e.target.value}:x)}))}
                                style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:4,color:t.text,padding:"3px 6px",width:"90px",fontSize:11}}/>
                            </td>
                            <td style={{padding:"4px 6px",textAlign:"right"}}>
                              <input type="number" value={n.valorNegocios||""} onChange={e=>setEditandoPendente(prev=>({...prev,notas:prev.notas.map((x,xi)=>xi===ni?{...x,valorNegocios:e.target.value}:x)}))}
                                style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:4,color:t.text,padding:"3px 6px",width:"100px",fontSize:11,textAlign:"right"}}/>
                            </td>
                            <td style={{padding:"4px 6px",textAlign:"right"}}>
                              <input type="number" value={n.totalDespesas||""} onChange={e=>setEditandoPendente(prev=>({...prev,notas:prev.notas.map((x,xi)=>xi===ni?{...x,totalDespesas:e.target.value}:x)}))}
                                style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:4,color:t.text,padding:"3px 6px",width:"100px",fontSize:11,textAlign:"right"}}/>
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    ) : (
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead><tr style={{color:t.muted}}>
                          <th style={{textAlign:"left",padding:"3px 6px",fontWeight:600}}>Data</th>
                          <th style={{textAlign:"right",padding:"3px 6px",fontWeight:600}}>Valor Negócios</th>
                          <th style={{textAlign:"right",padding:"3px 6px",fontWeight:600}}>Despesas</th>
                          <th style={{textAlign:"right",padding:"3px 6px",fontWeight:600}}>Líquido</th>
                          <th style={{textAlign:"right",padding:"3px 6px",fontWeight:600}}>IRPF</th>
                        </tr></thead>
                        <tbody>{(dia.notas||[]).map((n,ni)=>(
                          <tr key={ni} style={{borderTop:`1px solid ${t.border}`}}>
                            <td style={{padding:"4px 6px",color:t.muted}}>{n.data||"—"}</td>
                            <td style={{padding:"4px 6px",textAlign:"right",color:t.text}}>{brl(n.valorNegocios||0)}</td>
                            <td style={{padding:"4px 6px",textAlign:"right",color:"#f87171"}}>{brl(n.totalDespesas||0)}</td>
                            <td style={{padding:"4px 6px",textAlign:"right",color:(n.liq||0)>=0?"#4ade80":"#f87171",fontWeight:700}}>{brl(n.liq||0)}</td>
                            <td style={{padding:"4px 6px",textAlign:"right",color:"#a855f7"}}>{brl(n.irpf||0)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── SEÇÃO: MESES ATUAIS (não salvos ainda) ─── */}
      {dados.length > 0 && (
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{color:t.accent,fontWeight:800,fontSize:15}}>📊 Apuração Atual <span style={{color:t.muted,fontWeight:400,fontSize:12}}>(sessão atual — não salvo)</span></div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>downloadCSV("atual")} style={{background:"#0891b220",border:"1px solid #0891b255",borderRadius:8,color:"#22d3ee",padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>⬇️ CSV</button>
              <button onClick={downloadPDF} style={{background:"linear-gradient(135deg,#7c3aed,#6d28d9)",border:"none",borderRadius:8,color:"#fff",padding:"9px 18px",cursor:"pointer",fontSize:13,fontWeight:800,boxShadow:"0 3px 10px rgba(124,58,237,0.4)"}}>🖨️ Download PDF</button>
              <button onClick={handleSalvar} disabled={saving} style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",border:"none",borderRadius:8,color:"#fff",padding:"7px 16px",cursor:"pointer",fontSize:12,fontWeight:700,opacity:saving?0.6:1}}>
                {saving?"💾 Salvando...":"💾 Salvar Relatório"}
              </button>
              <button onClick={()=>{
                if(window.confirm("🗑️ ATENÇÃO — Limpar Relatório IR\n\nEsta ação irá remover todos os meses lançados da sessão atual.\n\n⚠️ Os dados só existirão se você já fez o download do CSV ou salvou no banco. Sem download, os dados serão perdidos.\n\nTem certeza que deseja continuar?")) onLimpar();
              }} style={{background:"#ef444415",border:"1px solid #ef444433",borderRadius:8,color:"#f87171",padding:"7px 12px",cursor:"pointer",fontSize:11,fontWeight:700}}>🗑️ Limpar</button>
            </div>
          </div>

          {/* Cards resumo */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(4,1fr)",gap:12,marginBottom:14}}>
            {[
              {label:"Total Bruto Acumulado",valor:brl(totalBruto),cor:totalBruto>=0?"#4ade80":"#f87171",icon:"📊"},
              {label:"IRPF Já Retido",valor:brl(totalIRPFTotal),cor:"#a855f7",icon:"🏦"},
              {label:"Total DARF a Pagar",valor:brl(totalDARF),cor:"#60a5fa",icon:"💳"},
              {label:"Prejuízo a Compensar",valor:brl(saldoAtual),cor:saldoAtual>0?"#f59e0b":"#4ade80",icon:"📤"},
            ].map(item=>(
              <div key={item.label} style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 18px",textAlign:"center"}}>
                <div style={{fontSize:22,marginBottom:6}}>{item.icon}</div>
                <div style={{color:t.muted,fontSize:11,fontWeight:600,marginBottom:4}}>{item.label}</div>
                <div style={{color:item.cor,fontWeight:900,fontSize:20}}>{item.valor}</div>
              </div>
            ))}
          </div>

          {saldoAtual>0&&(
            <div style={{background:"#f59e0b10",border:"2px solid #f59e0b44",borderRadius:12,padding:"14px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:28}}>📤</span>
              <div>
                <div style={{color:"#f59e0b",fontWeight:800,fontSize:14}}>Prejuízo a Compensar nos próximos meses</div>
                <div style={{color:"#fbbf24",fontWeight:900,fontSize:22,marginTop:2}}>{brl(saldoAtual)}</div>
              </div>
            </div>
          )}

          {/* Cards de meses fechados */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {mesesProcessados.map((m,i)=>{
              const statusColor = m.totalBrutoNeg?"#f59e0b":m.darf>0?"#f87171":"#4ade80";
              const statusLabel = m.totalBrutoNeg?"📤 Prejuízo":m.darf>0?"💳 DARF":"✅ Sem DARF";
              const isOpen = expandedMes===m.mes;
              return (
                <div key={i} style={{background:t.card,border:`1px solid ${t.border}`,borderLeft:`4px solid ${statusColor}`,borderRadius:14,overflow:"hidden"}}>
                  <button onClick={()=>setExpandedMes(isOpen?null:m.mes)}
                    style={{width:"100%",background:"transparent",border:"none",cursor:"pointer",padding:"16px 20px",display:"flex",alignItems:"center",gap:16,textAlign:"left"}}>
                    <div style={{flex:1}}>
                      <div style={{color:t.text,fontWeight:900,fontSize:17,fontFamily:"Arial,sans-serif"}}>{m.nomeMesStr}</div>
                      <div style={{color:t.muted,fontSize:12,marginTop:3}}>
                        Fechado em {m.dataFechamento}
                        {(m.dias||[]).length>0&&<span> · {m.dias.length} dia(s)</span>}
                        {m.compUsada>0&&<span style={{color:"#f59e0b"}}> · Compensação: {brl(m.compUsada)}</span>}
                      </div>
                    </div>
                    <div style={{textAlign:"right",minWidth:160}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
                        <div style={{color:m.totalBrutoReal>=0?"#4ade80":"#f87171",fontWeight:900,fontSize:20}}>{brl(m.totalBrutoReal)}</div>
                        {m.darf>0&&<button onClick={(e)=>{e.stopPropagation();handleGerarDarf(m.mes, m.nomeMesStr||m.mes, m.darf);}} style={{background:"linear-gradient(135deg,#1d4ed8,#2563eb)",border:"none",borderRadius:8,color:"#fff",padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:800,whiteSpace:"nowrap"}}>💳 Gerar DARF</button>}
                      </div>
                      <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                        {m.darf>0&&<span style={{color:"#60a5fa",fontSize:11,fontWeight:700}}>DARF: {brl(m.darf)}</span>}
                        <span style={{background:m.totalBrutoNeg?"#f59e0b12":m.darf>0?"#ef444412":"#22c55e12",border:`1px solid ${m.totalBrutoNeg?"#f59e0b44":m.darf>0?"#ef444433":"#22c55e33"}`,borderRadius:999,padding:"1px 8px",color:statusColor,fontSize:10,fontWeight:700}}>{statusLabel}</span>
                      </div>
                    </div>
                    <div style={{color:t.muted,fontSize:18,marginLeft:8}}>{isOpen?"▲":"▼"}</div>
                  </button>
                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${t.border}`,padding:"14px 20px"}}>
                      {/* Resumo do mês */}
                      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(4,1fr)",gap:10,marginBottom:14}}>
                        {[
                          {label:"Total Bruto",val:brl(m.totalBrutoReal),cor:m.totalBrutoReal>=0?"#4ade80":"#f87171"},
                          {label:"IRPF Retido",val:brl(m.totalIRPF),cor:"#a855f7"},
                          {label:"Base Cálculo",val:m.totalBrutoNeg?"—":brl(m.base),cor:"#60a5fa"},
                          {label:"DARF",val:brl(m.darf),cor:"#60a5fa"},
                        ].map(item=>(
                          <div key={item.label} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                            <div style={{color:t.muted,fontSize:10,fontWeight:600,marginBottom:3}}>{item.label}</div>
                            <div style={{color:item.cor,fontWeight:800,fontSize:14}}>{item.val}</div>
                          </div>
                        ))}
                      </div>
                      {/* Notas por dia */}
                      {(m.dias||[]).length===0?(
                        <div style={{color:t.muted,fontSize:12,padding:"8px 0"}}>Nenhuma nota registrada por dia separado.</div>
                      ):(m.dias||[]).map((dia,di)=>(
                        <div key={di} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",marginBottom:8}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                            <span style={{color:"#60a5fa",fontWeight:700,fontSize:12}}>📅 {dia.data}</span>
                            <span style={{color:dia.totalBruto>=0?"#4ade80":"#f87171",fontWeight:800,fontSize:14}}>{brl(dia.totalBruto||0)}</span>
                          </div>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                            <thead><tr style={{color:t.muted}}>
                              <th style={{textAlign:"left",padding:"3px 6px",fontWeight:600}}>Data</th>
                              <th style={{textAlign:"right",padding:"3px 6px",fontWeight:600}}>Valor Negócios</th>
                              <th style={{textAlign:"right",padding:"3px 6px",fontWeight:600}}>Despesas</th>
                              <th style={{textAlign:"right",padding:"3px 6px",fontWeight:600}}>Líquido</th>
                              <th style={{textAlign:"right",padding:"3px 6px",fontWeight:600}}>IRPF</th>
                              <th style={{textAlign:"right",padding:"3px 6px",fontWeight:600}}>Ações</th>
                            </tr></thead>
                            <tbody>{(dia.notas||[]).map((n,ni)=>{
                              const isNotaEditing = editandoNota?.mes===m.mes && editandoNota?.diaIdx===di && editandoNota?.notaIdx===ni;
                              return (
                                <tr key={ni} style={{borderTop:`1px solid ${t.border}`}}>
                                  <td style={{padding:"4px 6px",color:t.muted}}>
                                    {isNotaEditing ? (
                                      <input value={notaEditValue.data} onChange={e=>setNotaEditValue(prev=>({...prev,data:e.target.value}))}
                                        style={{width:"86px",background:t.bg,border:`1px solid ${t.border}`,borderRadius:4,padding:"2px 4px",fontSize:11}} />
                                    ) : (n.data||"—")}
                                  </td>
                                  <td style={{padding:"4px 6px",textAlign:"right",color:t.text}}>
                                    {isNotaEditing ? (
                                      <input type="text" inputMode="decimal" value={notaEditValue.valorNegocios} onChange={e=>setNotaEditValue(prev=>({...prev,valorNegocios:e.target.value}))}
                                        style={{width:"80px",background:t.bg,border:`1px solid ${t.border}`,borderRadius:4,padding:"2px 4px",textAlign:"right",fontSize:11}} />
                                    ) : brl(n.valorNegocios||0)}
                                  </td>
                                  <td style={{padding:"4px 6px",textAlign:"right",color:"#f87171"}}>
                                    {isNotaEditing ? (
                                      <input type="text" inputMode="decimal" value={notaEditValue.totalDespesas} onChange={e=>setNotaEditValue(prev=>({...prev,totalDespesas:e.target.value}))}
                                        style={{width:"80px",background:t.bg,border:`1px solid ${t.border}`,borderRadius:4,padding:"2px 4px",textAlign:"right",fontSize:11}} />
                                    ) : brl(n.totalDespesas||0)}
                                  </td>
                                  <td style={{padding:"4px 6px",textAlign:"right",color:(n.liq||0)>=0?"#4ade80":"#f87171",fontWeight:700}}>{brl(n.liq||0)}</td>
                                  <td style={{padding:"4px 6px",textAlign:"right",color:"#a855f7"}}>{brl(n.irpf||0)}</td>
                                  <td style={{padding:"4px 6px",textAlign:"right"}}>
                                    {isNotaEditing ? (
                                      <><button onClick={()=>handleSalvarNota(m.mes, di, ni)} style={{marginRight:6,background:"#22c55e20",border:"1px solid #22c55e55",borderRadius:5,color:"#16a34a",padding:"3px 7px",cursor:"pointer",fontSize:11,fontWeight:700}}>💾</button>
                                        <button onClick={()=>setEditandoNota(null)} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:5,color:t.muted,padding:"3px 7px",cursor:"pointer",fontSize:11,fontWeight:700}}>✕</button></>
                                    ) : (
                                      <><button onClick={()=>{setEditandoNota({mes:m.mes,diaIdx:di,notaIdx:ni});setNotaEditValue({data:n.data||"",valorNegocios:String(n.valorNegocios||""),totalDespesas:String(n.totalDespesas||"")});}}
                                        style={{marginRight:6,background:"#2563eb20",border:"1px solid #2563eb55",borderRadius:5,color:"#2563eb",padding:"3px 7px",cursor:"pointer",fontSize:11,fontWeight:700}}>✏️</button>
                                        <button onClick={()=>handleExcluirNota(m.mes, di, ni)} style={{background:"#ef444415",border:"1px solid #ef444433",borderRadius:5,color:"#ef4444",padding:"3px 7px",cursor:"pointer",fontSize:11,fontWeight:700}}>🗑️</button></>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}</tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {dados.length === 0 && allRows.length === 0 && (
        <div style={{...cardStyle,textAlign:"center",padding:"48px 20px"}}>
          <div style={{fontSize:48,marginBottom:12}}>📭</div>
          <div style={{color:t.muted,fontSize:15,fontWeight:600}}>Nenhum relatório ainda</div>
          <div style={{color:t.muted,fontSize:12,marginTop:6}}>Vá em <strong style={{color:"#60a5fa"}}>Imposto de Renda</strong> → preencha as notas → clique em <strong style={{color:"#f59e0b"}}>🔒 Fechar Mês</strong></div>
        </div>
      )}

      {/* ─── SEÇÃO: HISTÓRICO SALVO ─── */}
      {allRows.length > 0 && (
        <div style={{marginTop:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{color:t.accent,fontWeight:800,fontSize:15}}>🗄️ Histórico Salvo <span style={{color:"#4ade80",fontWeight:500,fontSize:12}}>({allRows.length} registros)</span></div>
            <button onClick={()=>downloadCSV("salvo")} style={{background:"#0891b220",border:"1px solid #0891b255",borderRadius:8,color:"#22d3ee",padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>⬇️ Exportar CSV</button>
          </div>
          <div style={{...cardStyle}}>
            {loadingSaved ? (
              <div style={{textAlign:"center",color:t.muted,padding:20}}>⏳ Carregando...</div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:t.bg}}>
                      {["Mês","Fechado em","Bruto","IRPF","Comp.","Base","IR 20%","DARF","Saldo","Status",""].map((h,hi)=>(
                        <th key={h} style={{padding:"8px 10px",color:t.muted,fontWeight:700,fontSize:10,textAlign:hi===0?"left":"right",borderBottom:`2px solid ${t.border}`,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allRows.map((r,i)=>(
                      <tr key={r.id||i} style={{background:i%2===0?"transparent":t.bg+"55",borderBottom:`1px solid ${t.border}22`}}>
                        <td style={{padding:"8px 10px",fontWeight:700,color:t.accent,whiteSpace:"nowrap"}}>📅 {r.mes}</td>
                        <td style={{padding:"8px 10px",textAlign:"right",color:t.muted,fontSize:11}}>{r.data_fechamento}</td>
                        <td style={{padding:"8px 10px",textAlign:"right",color:r.total_bruto>=0?"#4ade80":"#f87171",fontWeight:700}}>{brl(r.total_bruto)}</td>
                        <td style={{padding:"8px 10px",textAlign:"right",color:"#a855f7"}}>{brl(r.irpf_retido)}</td>
                        <td style={{padding:"8px 10px",textAlign:"right",color:r.compensacao_usada>0?"#f59e0b":"#475569"}}>{r.compensacao_usada>0?brl(r.compensacao_usada):"—"}</td>
                        <td style={{padding:"8px 10px",textAlign:"right",color:"#60a5fa"}}>{r.negativo?"—":brl(r.base_calculo)}</td>
                        <td style={{padding:"8px 10px",textAlign:"right",color:"#93c5fd"}}>{r.negativo?"—":brl(r.ir_20)}</td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontWeight:900}}>
                          <span style={{background:r.darf>0?"#1e3a5f":"#1e293b",padding:"2px 8px",borderRadius:5,border:`1px solid ${r.darf>0?"#60a5fa55":"#33445555"}`,color:r.darf>0?"#93c5fd":"#475569"}}>{brl(r.darf)}</span>
                        </td>
                        <td style={{padding:"8px 10px",textAlign:"right",color:r.saldo_restante>0?"#fbbf24":"#4ade80"}}>{r.saldo_restante>0?brl(r.saldo_restante):"—"}</td>
                        <td style={{padding:"8px 10px",textAlign:"center"}}>
                          {r.negativo?<span style={{background:"#f59e0b12",border:"1px solid #f59e0b44",borderRadius:999,padding:"2px 7px",color:"#f59e0b",fontSize:10,fontWeight:700}}>📤 Prejuízo</span>:r.darf>0?<span style={{background:"#ef444412",border:"1px solid #ef444433",borderRadius:999,padding:"2px 7px",color:"#f87171",fontSize:10,fontWeight:700}}>💳 Recolher</span>:<span style={{background:"#22c55e12",border:"1px solid #22c55e33",borderRadius:999,padding:"2px 7px",color:"#4ade80",fontSize:10,fontWeight:700}}>✅ Sem DARF</span>}
                        </td>
                        <td style={{padding:"8px 10px",textAlign:"center"}}>
                          <button onClick={()=>handleDeleteSalvo(r)} title="Excluir registro" style={{background:"#ef444415",border:"1px solid #ef444433",borderRadius:6,color:"#f87171",padding:"3px 8px",cursor:"pointer",fontSize:12,fontWeight:700}}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiarioTrader({user,onLogout}) {
  // ══════════════════════════════════════════════════════════
  // TODOS OS HOOKS PRIMEIRO — regra do React (sem hooks após return)
  // ══════════════════════════════════════════════════════════
  const [ops,setOps]=useState([]);
  const [loadingOps,setLoadingOps]=useState(true);
  const [tab,setTab]=useState("home");
  const [relIrDados,setRelIrDados]=useState(()=>{ try{return JSON.parse(localStorage.getItem(`relIrDados_${user.id}`)||'[]')}catch{return []} });
  const [diasMesPendente,setDiasMesPendente]=useState(()=>{ try{return JSON.parse(localStorage.getItem(`diasMesPendente_${user.id}`)||'null')}catch{return null} });
  const [mercadoRegistros,setMercadoRegistros]=useState(()=>{ try{return JSON.parse(localStorage.getItem(`mercadoRegistros_${user.id}`)||'[]')}catch{return []} });
  const [modal,setModal]=useState(null);
  // ── Carregar mercadoRegistros do Supabase (source-of-truth) ──
  useEffect(()=>{
    supabase.from("mercado_registros").select("*").eq("user_id",user.id).order("data",{ascending:true})
      .then(({data})=>{
        if(data&&data.length>0){
          const rows=data.map(r=>({data:r.data,correlacao:r.correlacao,noticia:r.noticia,abertura:r.abertura,movimento:r.movimento,trava:r.trava,obs:r.obs||""}));
          setMercadoRegistros(rows);
          try{localStorage.setItem(`mercadoRegistros_${user.id}`,JSON.stringify(rows))}catch{}
        }
      }).catch(()=>{}); // tabela pode não existir ainda — usa localStorage como fallback
  // eslint-disable-next-line
  },[user.id]);
  const [editOp,setEditOp]=useState(null);
  const [darkMode,setDarkMode]=useState(true);
  const [darfPrefill,setDarfPrefill]=useState(null);
  const [showRelatorio,setShowRelatorio]=useState(false);
  const [toast,setToast]=useState(null);
  const [gerenciamentos,setGerenciamentos]=useState([]);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  // ── Persistir Relatório IR no localStorage ──
  useEffect(()=>{ try{localStorage.setItem(`relIrDados_${user.id}`,JSON.stringify(relIrDados))}catch{} },[relIrDados,user.id]);
  useEffect(()=>{ try{localStorage.setItem(`diasMesPendente_${user.id}`,JSON.stringify(diasMesPendente))}catch{} },[diasMesPendente,user.id]);
  // ── Persistir registros de mercado (localStorage + Supabase) ──
  useEffect(()=>{ try{localStorage.setItem(`mercadoRegistros_${user.id}`,JSON.stringify(mercadoRegistros))}catch{} },[mercadoRegistros,user.id]);
  async function handleRegistrarMercado(novo) {
    setMercadoRegistros(prev => {
      const sem = prev.filter(r => r.data !== novo.data);
      return [...sem, novo].sort((a,b) => a.data.localeCompare(b.data));
    });
    try {
      await supabase.from("mercado_registros").upsert(
        { user_id: user.id, ...novo },
        { onConflict: "user_id,data" }
      );
    } catch(_) {}
  }
  async function handleDeleteMercado(data) {
    setMercadoRegistros(prev => prev.filter(r => r.data !== data));
    try {
      await supabase.from("mercado_registros").delete().eq("user_id", user.id).eq("data", data);
    } catch(_) {}
  }

  // ── Macro data: Supabase (produção) + cotacoes.json (dev local) ──
  const [tvData, setTvData] = useState(null);
  useEffect(() => {
    const toEntry = (item) => item ? {
      preco:    item.price,
      variacao: +(item.price * item.change / 100).toFixed(2),
      percent:  item.change,
      fonte:    "tvDatafeed"
    } : null;

    const carregarMacro = async () => {
      let base = {};

      // Supabase — funciona em produção (Vercel)
      try {
        const { data } = await supabase
          .from("cotacoes_global")
          .select("dados")
          .eq("id", 1)
          .single();
        if (data?.dados) {
          const c = data.dados;
          if (c.OIL)    base.petroleo = toEntry(c.OIL);
          if (c.IRON)   base.minerio  = toEntry(c.IRON);
          if (c.VIX)    base.vix      = toEntry(c.VIX);
          if (c.DXY)    base.dxy      = toEntry(c.DXY);
          if (c.SP500)  base.sp500    = toEntry(c.SP500);
          if (c.US30)   base.us30     = toEntry(c.US30);
          if (c.EWZ)    base.ewz      = toEntry(c.EWZ);
          if (c.NASDAQ) base.nasdaq   = toEntry(c.NASDAQ);
          if (c.OURO)   base.ouro     = toEntry(c.OURO);
        }
      } catch(_) {}

      // cotacoes.json — fallback dev local
      if (!base.petroleo && !base.minerio) {
        try {
          const r = await fetch("/cotacoes.json", { signal: AbortSignal.timeout(5000) });
          if (r.ok) {
            const c = await r.json();
            if (c.OIL)    base.petroleo = toEntry(c.OIL);
            if (c.IRON)   base.minerio  = toEntry(c.IRON);
            if (c.VIX)    base.vix      = toEntry(c.VIX);
            if (c.DXY)    base.dxy      = toEntry(c.DXY);
            if (c.SP500)  base.sp500    = toEntry(c.SP500);
            if (c.US30)   base.us30     = toEntry(c.US30);
            if (c.EWZ)    base.ewz      = toEntry(c.EWZ);
            if (c.NASDAQ) base.nasdaq   = toEntry(c.NASDAQ);
            if (c.OURO)   base.ouro     = toEntry(c.OURO);
          }
        } catch(_) {}
      }

      if (Object.keys(base).length > 0) setTvData(prev => ({ ...prev, ...base }));
    };
    carregarMacro();
    const iv = setInterval(carregarMacro, 15000);
    return () => clearInterval(iv);
  }, []);

  // ── Acesso / Trial ──
  // Regra: toda conta nova recebe 15 dias de trial automático a partir da data de criação
  const [plano, setPlano] = useState(null);
  const [acessoAtivo, setAcessoAtivo] = useState(null); // null = verificando
  const [diasRestantes, setDiasRestantes] = useState(0);

  const verificarAcesso = useCallback(async () => {
    const {data} = await supabase.from("planos").select("*").eq("email", user.email).maybeSingle();

    if (data) {
      // Já tem registro — verificar expiração + status
      const expira = data.data_expiracao ? new Date(data.data_expiracao) : null;
      const bloqueadoTemporario = data.status === "bloqueado" && expira && expira > new Date();
      const bloqueioExpirado = data.status === "bloqueado" && expira && expira <= new Date();

      const ativo = data.status === "pago"
        || (data.status === "trial" && expira && expira > new Date())
        || (data.status === "bloqueado" && bloqueioExpirado);

      const dias = expira ? Math.max(0, Math.ceil((expira - new Date()) / 86400000)) : 0;

      setPlano(data);
      setAcessoAtivo(!bloqueadoTemporario && ativo);
      setDiasRestantes(dias);
    } else {
      // Sem plano → mostrar tela premium com WhatsApp
      setPlano({ status: "sem_plano" });
      setAcessoAtivo(false);
    }
  }, [user.email]);

  useEffect(() => {
    verificarAcesso();
    const iv = setInterval(verificarAcesso, 30 * 1000);
    return () => clearInterval(iv);
  }, [verificarAcesso]);

  // ── Presença: atualiza last_seen a cada 5 min ──
  useEffect(()=>{
    const ping = async () => {
      try {
        await supabase.from("user_presence").upsert(
          { user_id: user.id, email: user.email, last_seen: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      } catch(_) {}
    };
    ping();
    const iv = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line
  }, [user.id]);

  const t=darkMode?DARK:LIGHT;
  const showToast=useCallback((msg,type="success")=>setToast({msg,type}),[]);
  const isMobile = viewportWidth <= 900;

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Carregar dados ──
  useEffect(()=>{
    const load=async()=>{
      setLoadingOps(true);
      const {data,error}=await supabase.from("operacoes").select("*").eq("user_id",user.id).order("data",{ascending:false});
      if(error) showToast("Erro ao carregar: "+error.message,"error");
      else setOps((data||[]).map(rowToOp));
      setLoadingOps(false);
      // Carregar gerenciamentos
      const {data:gData}=await supabase.from("gerenciamentos").select("*").eq("user_id",user.id).order("created_at",{ascending:false});
      if(gData) setGerenciamentos(gData);
    };
    load();
  },[user.id,showToast]);

  const handleSaveGerenciamento=async(form, gerAtual)=>{
    // Campos garantidos na tabela original + extras serializados em JSON no campo "regras"
    // Campos extras que podem não existir ainda na tabela são salvos em campo "regras" como JSON
    const extraData = {
      mesaRegiao: form.mesaRegiao||"brasileira",
      mesaAmericanaEmpresa: form.mesaAmericanaEmpresa||"",
      mesaAmericanaStep: form.mesaAmericanaStep||"1 Step",
      mesaAmericanaOutra: form.mesaAmericanaOutra||"",
      mesaAmericanaFase: form.mesaAmericanaFase||"avaliacao",
      mesaAmericanaPrograma: form.mesaAmericanaPrograma||"",
      mesaAmericanaTamanhoConta: form.mesaAmericanaTamanhoConta||"",
      mesaAmericanaTamanhoContaOutra: form.mesaAmericanaTamanhoContaOutra||"",
      mesaAmericanaDrawdownTipo: form.mesaAmericanaDrawdownTipo||"",
      mesaAmericanaMinDias: form.mesaAmericanaMinDias||"",
      mesaAmericanaPrazoDias: form.mesaAmericanaPrazoDias||"",
      mesaAmericanaConsistenciaPct: form.mesaAmericanaConsistenciaPct||"",
      mesaAmericanaOvernight: form.mesaAmericanaOvernight||"",
      mesaAmericanaAtivos: form.mesaAmericanaAtivos||"",
      mesaAmericanaMetaTipo: form.mesaAmericanaMetaTipo||"usd",
      mesaAmericanaMetaValor: form.mesaAmericanaMetaValor||"",
      mesaAmericanaMetaLucroStep2: form.mesaAmericanaMetaLucroStep2||"",
      mesaAmericanaNumeroContratos: form.mesaAmericanaNumeroContratos||"",
      mesaAmericanaConsistenciaRegra: form.mesaAmericanaConsistenciaRegra||"Não tem",
      mesaAmericanaPlataforma: form.mesaAmericanaPlataforma||"",
      mesaAmericanaAtivosLista: (form.mesaAmericanaAtivosLista||[]).slice(0,10),
      mesaAmericanaTaxaAtivacao: form.mesaAmericanaTaxaAtivacao||"",
      mesaAmericanaReset: form.mesaAmericanaReset||"não",
      mesaAmericanaResetValor: form.mesaAmericanaResetValor||"",
      mesaAmericanaMaxTrailingDrawdown: form.mesaAmericanaMaxTrailingDrawdown||"",
      mesaAmericanaMaxStopDiario: form.mesaAmericanaMaxStopDiario||"",
      mesaAmericanaBufferRequired: form.mesaAmericanaBufferRequired||"",
      mesaAmericanaPagamentoPct: form.mesaAmericanaPagamentoPct||"",
      mesaAmericanaObservacao: form.mesaAmericanaObservacao||"",
      mesaAmericanaFrequenciaSaque: form.mesaAmericanaFrequenciaSaque||"",
      mesaDiasCustom: form.mesaDiasCustom||"",
      usaCustoPlataforma: form.usaCustoPlataforma||false,
      mesaCustoPlataforma: form.mesaCustoPlataforma||"",
      mesaCustoValor: form.mesaCustoValor||"",
      mesaRepasse: form.mesaRepasse||"",
      planQtdContratosWin: form.planQtdContratosWin||"",
      planQtdContratosWdo: form.planQtdContratosWdo||"",
      planMesmoNumCt: form.planMesmoNumCt||false,
      planUsaMetaPct: form.planUsaMetaPct||false,
      planMetaDiaPct: form.planMetaDiaPct||"",
      planUsaMetaPontos: form.planUsaMetaPontos||false,
      planMetaDiaPontos: form.planMetaDiaPontos||"",
      planMetaDiaPontosWin: form.planMetaDiaPontosWin||"",
      planMetaDiaPontosWdo: form.planMetaDiaPontosWdo||"",
      planUsaMetaReais: form.planUsaMetaReais||false,
      planMetaDiaReais: form.planMetaDiaReais||"",
      planStopMaxDia: form.planStopMaxDia||"",
      planQtdContratos: form.planQtdContratos||"",
    };
    const row={
      data_criacao: form.dataCriacao||"",
      nome: form.nome||"",
      tipo_capital: form.tipoCapital||"",
      perfil: form.perfil||"",
      modo_gerenciamento: form.modoGerenciamento||"",
      capital: form.capital||"",
      contratos: form.contratos||"",
      horario_inicio: form.horarioInicio||"",
      horario_fim: form.horarioFim||"",
      // Mesa — colunas que existem na tabela original
      mesa_nome: form.mesaNome||"",
      mesa_contratos_max_win: form.mesaContratosMaxWin||"",
      mesa_contratos_max_wdo: form.mesaContratosMaxWdo||"",
      usa_mesa_perda_diaria: form.usaMesaPerdaDiaria||false,
      mesa_perda_diaria: form.mesaPerdaDiaria||"",
      usa_mesa_perda_maxima: form.usaMesaPerdaMaxima||false,
      mesa_perda_maxima: form.mesaPerdaMaxima||"",
      usa_mesa_meta_aprovacao: form.usaMesaMetaAprovacao||false,
      mesa_meta_aprovacao: form.mesaMetaAprovacao||"",
      mesa_dias_contrato: form.mesaDiasContrato||"",
      // Serializa extras no campo regras (JSON + texto)
      regras: JSON.stringify(extraData) + (form.regras ? "\n---\n" + form.regras : ""),
    };

    if (gerAtual?.id) {
      const { data, error } = await supabase
        .from("gerenciamentos")
        .update(row)
        .eq("id", gerAtual.id)
        .eq("user_id", user.id)
        .select()
        .single();
      if(error){showToast("Erro ao atualizar: "+error.message,"error");return;}
      setGerenciamentos(prev=>prev.map(g=>g.id===gerAtual.id?data:g));
      setModal(null);
      showToast("Gerenciamento atualizado! ✏️");
      return;
    }

    const rowInsert = {
      ...row,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };
    const {data,error}=await supabase.from("gerenciamentos").insert([rowInsert]).select().single();
    if(error){showToast("Erro ao salvar: "+error.message,"error");return;}
    setGerenciamentos(prev=>[data,...prev]);
    setModal(null);
    showToast("Gerenciamento salvo! 🛡️");
  };

  const handleToggleAtivo=async(id,novoAtivo)=>{
    const {error}=await supabase.from("gerenciamentos").update({ativo:novoAtivo}).eq("id",id);
    if(error){showToast("Erro: "+error.message,"error");return;}
    setGerenciamentos(prev=>prev.map(g=>g.id===id?{...g,ativo:novoAtivo}:g));
    showToast(novoAtivo?"Gerenciamento ativado ✅":"Gerenciamento desativado ⏸️");
  };

  const handleDeleteGerenciamento=async(id)=>{
    await supabase.from("gerenciamentos").delete().eq("id",id);
    setGerenciamentos(prev=>prev.filter(g=>g.id!==id));
    showToast("Removido.","error");
  };

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

  // ── Tela de acesso bloqueado (DEPOIS de todos os hooks) ──
  const planoCarregando = acessoAtivo === null;
  const bloqueado = !planoCarregando && !acessoAtivo;
  const bloqueioAdmin = plano?.status === "bloqueado";
  const semPlano = plano?.status === "sem_plano";
  const bloqueioTitulo = bloqueioAdmin ? "🔒 Acesso bloqueado" : semPlano ? "🌟 Ative seu Plano Premium" : "⏱️ Seu período de teste encerrou";
  const bloqueioTexto = bloqueioAdmin
    ? "Seu acesso foi bloqueado pelo administrador. Entre em contato via WhatsApp para desbloquear."
    : semPlano
    ? "Sua conta foi criada com sucesso! Para acessar o TradeVision PRO, ative seu plano Premium pelo WhatsApp."
    : "Você testou o TradeVision PRO gratuitamente. Para continuar, entre em contato e solicite liberação ou adquira o plano.";

  // Componente da tela bloqueada inline
  const telaBloqueada = (
    <div style={{minHeight:"100vh",background:"#000",fontFamily:"'Segoe UI',sans-serif",color:"#fff"}}>
      {/* Header minimalista */}
      <div style={{background:"#050505",borderBottom:"1px solid #1a1a1a",padding:isMobile?"12px 16px":"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{fontSize:20,fontWeight:900,background:"linear-gradient(135deg,#c9a227,#ffd700)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TradeVision PRO</div>
        <button onClick={onLogout} style={{background:"transparent",border:"1px solid #333",borderRadius:8,color:"#666",padding:"6px 14px",cursor:"pointer",fontSize:12}}>Sair</button>
      </div>

      {/* Layout 2 colunas: formulário + carousel */}
      <div style={{display:"flex",gap:0,minHeight:"calc(100vh - 53px)",flexDirection:isMobile?"column":"row"}}>

        {/* Coluna esquerda — formulário de ativação */}
        <div style={{flex:"0 0 auto",width:isMobile?"100%":"420px",display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"32px 20px":"48px 32px",borderRight:isMobile?"none":"1px solid #1a1a1a"}}>
        <div style={{width:"100%",textAlign:"center"}}>
          <div style={{fontSize:52,marginBottom:12}}>{bloqueioAdmin ? "🔒" : "🌟"}</div>
          <div style={{fontSize:22,fontWeight:900,marginBottom:10,color:"#ffd700"}}>{bloqueioTitulo}</div>
          <div style={{color:"#aaa",fontSize:13.5,lineHeight:1.8,marginBottom:6}}>
            {bloqueioTexto}
          </div>
          <div style={{color:"#666",fontSize:12,lineHeight:1.7,marginBottom:24}}>
            Acesso ao diário, DARF, IR, gestão de risco<br/>e análise por IA — entre em contato.
          </div>

          {/* Botão WhatsApp principal */}
          <a
            href={"https://wa.me/5548999642910?text=Olá!%20Gostaria%20de%20adquirir%20a%20versão%20PRO%20do%20TradeVision.%20Meu%20email%3A%20"+encodeURIComponent(user.email)}
            target="_blank" rel="noreferrer"
            style={{display:"inline-flex",alignItems:"center",gap:10,background:"#25D366",color:"#fff",fontWeight:700,fontSize:15,padding:"14px 30px",borderRadius:12,textDecoration:"none",marginBottom:20,boxShadow:"0 4px 20px #25D36644"}}>
            📱 Falar no WhatsApp — (48) 99964-2910
          </a>

          {/* Planos */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:24}}>
            {[
              {nome:"Mensal",preco:"R$ 19,90/mês",desc:"Acesso completo por 30 dias",destaque:false},
              {nome:"Anual",preco:"R$ 149,90/ano",desc:"Economize 37% · R$ 12,49/mês",destaque:true},
            ].map(p=>(
              <div key={p.nome} style={{background:p.destaque?"#0a1628":"#0a0a0a",border:`2px solid ${p.destaque?"#c9a227":"#222"}`,borderRadius:12,padding:"16px",position:"relative"}}>
                {p.destaque&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",background:"#c9a227",color:"#000",fontSize:9,fontWeight:800,padding:"2px 10px",borderRadius:999,whiteSpace:"nowrap"}}>MELHOR VALOR</div>}
                <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>{p.nome}</div>
                <div style={{color:"#ffd700",fontWeight:900,fontSize:20,marginBottom:4}}>{p.preco}</div>
                <div style={{color:"#666",fontSize:11}}>{p.desc}</div>
              </div>
            ))}
          </div>

          {/* Código de ativação */}
          <div style={{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
            <div style={{color:"#666",fontSize:12,marginBottom:10}}>Já pagou? Insira o código recebido pelo WhatsApp:</div>
            <button
              onClick={async ()=>{
                const code = window.prompt("Digite o código de ativação recebido pelo WhatsApp:");
                if(!code) return;
                const c = code.trim().toUpperCase();

                // Buscar código na tabela codigos_ativacao
                const {data:cod, error} = await supabase
                  .from("codigos_ativacao")
                  .select("*")
                  .eq("codigo", c)
                  .maybeSingle();

                if(error || !cod) {
                  alert("❌ Código inválido ou não encontrado.\nEntre em contato: (48) 99964-2910");
                  return;
                }

                // Verificar se o código já foi usado por OUTRO email
                if(cod.email_usado && cod.email_usado !== user.email) {
                  alert("❌ Este código já foi utilizado por outro usuário.\nEntre em contato: (48) 99964-2910");
                  return;
                }

                // Verificar se o código está expirado
                if(cod.expira_em && new Date(cod.expira_em) < new Date()) {
                  alert("❌ Este código expirou.\nSolicite um novo: (48) 99964-2910");
                  return;
                }

                // Verificar se o código já foi usado por ESTE mesmo email (reuso)
                if(cod.email_usado === user.email && cod.usado) {
                  alert("ℹ️ Este código já foi usado na sua conta e está ativo.");
                  return;
                }

                // Tudo OK — marcar código como usado e liberar acesso
                const diasAcesso = cod.dias_acesso || 30;
                const expiraAcesso = new Date(Date.now() + diasAcesso * 86400000);

                // Marcar código como usado
                await supabase.from("codigos_ativacao")
                  .update({ usado: true, email_usado: user.email, usado_em: new Date().toISOString() })
                  .eq("codigo", c);

                // Salvar/atualizar plano
                await supabase.from("planos").upsert({
                  email: user.email,
                  status: "pago",
                  data_inicio: new Date().toISOString(),
                  data_expiracao: expiraAcesso.toISOString(),
                  observacao: `Código: ${c}`,
                }, {onConflict:"email"});

                setPlano({status:"pago", data_expiracao: expiraAcesso.toISOString()});
                setAcessoAtivo(true);
                setDiasRestantes(diasAcesso);
                alert(`✅ Acesso liberado por ${diasAcesso} dias!\nBem-vindo ao TradeVision PRO.`);
              }}
              style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:8,color:"#ccc",padding:"10px 22px",cursor:"pointer",fontSize:13,fontWeight:600,width:"100%"}}>
              🔑 Inserir Código de Ativação
            </button>
          </div>
          <div style={{color:"#444",fontSize:11}}>Logado como: {user.email}</div>
        </div>
        </div>

        {/* Coluna direita — carousel de features */}
        {!isMobile && (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"48px 40px",background:"#050505"}}>
            <div style={{width:"100%",maxWidth:720}}>
              <div style={{color:"#555",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>O que você terá acesso</div>
              <BannerCarousel />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (bloqueado) return telaBloqueada;

  return (
    <>
    <style>{`
      *,*::before,*::after{box-sizing:border-box}
      body{margin:0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
      ::-webkit-scrollbar{width:6px;height:6px}
      ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:#1e2035;border-radius:99px}
      ::-webkit-scrollbar-thumb:hover{background:#2d3155}
      ::selection{background:#5b8af533;color:#e4e8f5}
      button{font-family:'Inter','Segoe UI',system-ui,sans-serif}
      input,textarea,select{font-family:'Inter','Segoe UI',system-ui,sans-serif}
      .tv-fade-in{animation:fadeIn .22s ease}
      .tv-card-hover{transition:border-color .18s,box-shadow .18s}
      .tv-card-hover:hover{border-color:#2d3155 !important;box-shadow:0 4px 24px #0006}
    `}</style>
    <div style={{minHeight:"100vh",background:t.bg,fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:t.text,letterSpacing:"0.01em",overflowX:"hidden"}}>
      {/* ══ HEADER PRINCIPAL ══ */}
      <div style={{

        backgroundImage:`url('data:image/jpeg;base64,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')`
        ,backgroundSize:"cover"
        ,backgroundPosition:"center center"
        ,position:"sticky",top:0,zIndex:100
        ,borderBottom:"2px solid #c9a22733"
      }}>
        {/* Overlay escuro */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,0.83) 0%,rgba(0,0,0,0.78) 100%)",zIndex:0,pointerEvents:"none"}}/>

        {/* Ticker TradingView real */}
        <div style={{position:"relative",zIndex:1,borderBottom:"1px solid #ffffff11",overflow:"hidden",height:28}}>
          <iframe title="TradingView Ticker"
            src="https://s.tradingview.com/embed-widget/ticker-tape/?locale=br#%7B%22symbols%22%3A%5B%7B%22proName%22%3A%22BMFBOVESPA%3AWIN1!%22%2C%22title%22%3A%22WIN%22%7D%2C%7B%22proName%22%3A%22BMFBOVESPA%3AWDO1!%22%2C%22title%22%3A%22WDO%22%7D%2C%7B%22proName%22%3A%22BMFBOVESPA%3AIBOV%22%2C%22title%22%3A%22IBOV%22%7D%2C%7B%22proName%22%3A%22BMFBOVESPA%3AVALE3%22%2C%22title%22%3A%22VALE3%22%7D%2C%7B%22proName%22%3A%22BMFBOVESPA%3APETR4%22%2C%22title%22%3A%22PETR4%22%7D%2C%7B%22proName%22%3A%22BMFBOVESPA%3ABBDC4%22%2C%22title%22%3A%22BBDC4%22%7D%2C%7B%22proName%22%3A%22FX_IDC%3AUSDBRL%22%2C%22title%22%3A%22USD%2FBRL%22%7D%2C%7B%22proName%22%3A%22COINBASE%3ABTCUSD%22%2C%22title%22%3A%22BTC%22%7D%2C%7B%22proName%22%3A%22TVC%3AGOLD%22%2C%22title%22%3A%22OURO%22%7D%2C%7B%22proName%22%3A%22FOREXCOM%3ASPXUSD%22%2C%22title%22%3A%22S%26P500%22%7D%5D%2C%22showSymbolLogo%22%3Afalse%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22adaptive%22%2C%22colorTheme%22%3A%22dark%22%7D"
            style={{width:"100%",height:44,border:"none",marginTop:-8}}
            scrolling="no"
            allowTransparency="true"
          />
        </div>

        {/* Conteúdo principal do header */}
        <div style={{padding:isMobile?"0 14px":"0 40px",position:"relative",zIndex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",flexDirection:isMobile?"column":"row",flexWrap:"wrap",gap:12,padding:"14px 0 10px"}}>

            {/* ── LOGO ZK + NOME ── */}
            <div style={{display:"flex",alignItems:"center",gap:isMobile?10:16,width:isMobile?"100%":"auto"}}>
              {/* Logo ZK estilo bolsa — candlesticks + letra */}
              <div style={{position:"relative",width:isMobile?44:54,height:isMobile?44:54}}>
                <div style={{
                  width:isMobile?44:54,height:isMobile?44:54,borderRadius:14,
                  background:"linear-gradient(135deg,#0d1117 0%,#0a1628 100%)",
                  border:"2px solid #c9a227",
                  boxShadow:"0 0 18px #c9a22744, inset 0 0 12px #c9a22711",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  position:"relative",overflow:"hidden",
                }}>
                  {/* Candlesticks decorativos atrás */}
                  <svg width={isMobile?44:54} height={isMobile?44:54} style={{position:"absolute",top:0,left:0,opacity:0.5}}>
                    {[[8,18,10,26,"#22c55e"],[16,22,8,28,"#ef4444"],[24,14,10,32,"#22c55e"],[32,20,8,26,"#22c55e"],[40,24,8,22,"#ef4444"]].map(([x,y,w,h,c],i)=>(
                      <g key={i}>
                        <rect x={x} y={y} width={w} height={h} rx={1} fill={c} opacity={0.8}/>
                        <line x1={x+w/2} y1={y-4} x2={x+w/2} y2={y} stroke={c} strokeWidth={1.5}/>
                        <line x1={x+w/2} y1={y+h} x2={x+w/2} y2={y+h+4} stroke={c} strokeWidth={1.5}/>
                      </g>
                    ))}
                    {/* Linha dourada diagonal */}
                    <path d="M6 46 Q20 20 48 10" stroke="#c9a227" strokeWidth={1.5} fill="none" opacity={0.9}/>
                  </svg>
                  {/* Letras ZK */}
                  <span style={{
                    fontSize:isMobile?18:22,fontWeight:900,
                    background:"linear-gradient(135deg,#fffbe6 0%,#c9a227 50%,#fff8dc 100%)",
                    WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                    letterSpacing:"-2px",fontFamily:"Georgia,serif",
                    position:"relative",zIndex:2,textShadow:"none",
                    filter:"drop-shadow(0 0 6px #c9a22799)",
                  }}>ZK</span>
                </div>
                {/* Ponto verde online */}
                <div style={{position:"absolute",bottom:-2,right:-2,width:10,height:10,background:"#00ff88",borderRadius:"50%",border:"2px solid #000",boxShadow:"0 0 8px #00ff88"}}/>
              </div>

              {/* Nome TradeVision */}
              <div>
                <h1 style={{
                  fontSize:isMobile?24:34, fontWeight:900, margin:0,
                  letterSpacing:"-0.5px", lineHeight:1.05,
                  fontFamily:"Georgia,'Times New Roman',serif",
                  color:"#c9a227",
                  background:"linear-gradient(90deg,#b8860b 0%,#ffd700 25%,#fffde7 50%,#ffd700 75%,#b8860b 100%)",
                  WebkitBackgroundClip:"text",
                  WebkitTextFillColor:"transparent",
                  paintOrder:"stroke fill",
                  filter:"drop-shadow(0 0 12px #c9a22766)",
                }}>TradeVision</h1>
                <div style={{color:"#666",fontSize:isMobile?10:11,marginTop:3,letterSpacing:isMobile?"1px":"2px",fontWeight:600,textTransform:"uppercase",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                  <span style={{color:"#00ff88",fontSize:8}}>●</span>
                  {user.email} &nbsp;·&nbsp; Renda Variável
                  {plano && plano.status==="trial" && diasRestantes > 0 && (
                    <span style={{marginLeft:8,background:"#f59e0b22",border:"1px solid #f59e0b66",borderRadius:999,padding:"1px 8px",color:"#fbbf24",fontSize:9,fontWeight:700}}>
                      TRIAL · {diasRestantes}d restantes
                    </span>
                  )}
                  {plano && plano.status==="pago" && (
                    <span style={{marginLeft:8,background:"#22c55e22",border:"1px solid #22c55e55",borderRadius:999,padding:"1px 8px",color:"#4ade80",fontSize:9,fontWeight:700}}>
                      ✓ PRO · {diasRestantes}d
                    </span>
                  )}
                </div>
              </div>
              <span style={{fontSize:10,color:"#c9a227",fontWeight:800,background:"#c9a22718",border:"1px solid #c9a22766",borderRadius:5,padding:"3px 9px",letterSpacing:"2px",boxShadow:"0 0 8px #c9a22733"}}>PRO</span>
            </div>

            {/* ── STATS + BOTÕES ── */}
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",width:isMobile?"100%":"auto"}}>
              {/* Stats Semana / Mês / Total */}
              {[["Semana",semanaReais],["Mês",mesReais],["Total",totalReais]].map(([l,v])=>(
                <div key={l} style={{background:t.card,border:`1px solid ${v>=0?"#16a34a44":"#dc262644"}`,borderRadius:8,padding:isMobile?"7px 10px":"8px 16px",textAlign:"right",minWidth:isMobile?78:96,boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
                  <div style={{color:darkMode?"#cbd5e1":"#64748b",fontSize:11,fontWeight:700,letterSpacing:"0.6px",marginBottom:3,textTransform:"uppercase",fontFamily:"Arial,sans-serif"}}>{l}</div>
                  <div style={{color:v>=0?"#22c55e":"#f87171",fontWeight:800,fontSize:15,fontFamily:"Arial Narrow,Arial,sans-serif"}}>{v>=0?"+":""}{v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                </div>
              ))}
              {temDolar&&(
                <div style={{background:t.card,border:"1px solid #c9a22744",borderRadius:8,padding:isMobile?"7px 10px":"8px 16px",textAlign:"right",minWidth:isMobile?78:96,boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
                  <div style={{color:darkMode?"#cbd5e1":"#64748b",fontSize:11,fontWeight:700,letterSpacing:"0.6px",marginBottom:3,textTransform:"uppercase",fontFamily:"Arial,sans-serif"}}>USD</div>
                  <div style={{color:"#c9a227",fontWeight:800,fontSize:15,fontFamily:"Arial Narrow,Arial,sans-serif"}}>{totalDolar>=0?"+":""}{totalDolar.toLocaleString("en-US",{style:"currency",currency:"USD"})}</div>
                </div>
              )}

              {!isMobile&&<div style={{width:1,height:36,background:t.border,margin:"0 2px"}}/>}

              {/* Botão Gerador de Análise */}
              <button onClick={()=>setShowRelatorio(true)} style={{
                background:darkMode?"#14532d":"#dcfce7",
                border:`1px solid ${darkMode?"#166534":"#86efac"}`,
                borderLeft:"3px solid #16a34a",
                borderRadius:8,color:darkMode?"#86efac":"#14532d",
                padding:isMobile?"8px 12px":"10px 16px",cursor:"pointer",
                fontFamily:"Arial,sans-serif",fontWeight:700,fontSize:isMobile?12:13,
                whiteSpace:"nowrap",letterSpacing:"-0.1px",
              }}>
                Análise Operacional
              </button>

              {/* Toggle dark/light — ☀️ / 🌙 */}
              <button onClick={()=>setDarkMode(d=>!d)} style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.muted,padding:isMobile?"8px 10px":"10px 13px",cursor:"pointer",fontSize:16,lineHeight:1}}>{darkMode?"☀️":"🌙"}</button>
              <button onClick={onLogout} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,color:t.muted,padding:isMobile?"8px 10px":"10px 14px",cursor:"pointer",fontSize:isMobile?12:13,fontWeight:600,fontFamily:"Arial,sans-serif"}}>Sair</button>

              {/* Botão Nova Operação */}
              <button onClick={()=>{setEditOp(null);setModal("add");}} style={{
                background:"#2563eb",border:"1px solid #1d4ed8",
                borderRadius:8,color:"#fff",
                padding:isMobile?"8px 12px":"10px 20px",cursor:"pointer",
                fontFamily:"Arial,sans-serif",fontWeight:700,fontSize:isMobile?12:13,
                whiteSpace:"nowrap",letterSpacing:"-0.1px",
                boxShadow:"0 1px 4px rgba(37,99,235,0.35)",
              }}>
                + Nova Operação
              </button>

              {/* Botão Gestão de Risco */}
              <button onClick={()=>setModal("gerenciamento")} style={{
                background:darkMode?"#2d1515":"#fff1f2",
                border:`1px solid ${darkMode?"#5a2020":"#fecaca"}`,
                borderLeft:"3px solid #dc2626",
                borderRadius:8,color:darkMode?"#fca5a5":"#991b1b",
                padding:isMobile?"8px 12px":"10px 16px",cursor:"pointer",
                fontFamily:"Arial,sans-serif",fontWeight:700,fontSize:isMobile?12:13,
                whiteSpace:"nowrap",letterSpacing:"-0.1px",
              }}>
                Gestão de Risco
              </button>
            </div>
          </div>

          {/* ── TABS PROFISSIONAIS ── */}
          <div style={{display:"flex",gap:6,borderTop:`1px solid ${t.border}`,overflowX:"auto",padding:"8px 8px 0 8px",flexWrap:"wrap"}}>
            {[
              {id:"home", label:"Início", activeColor:"#f5c842",
                svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>},
              {id:"journal", label:"Diário", activeColor:"#38bdf8",
                svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>},
              {id:"analytics", label:"Análises", activeColor:"#a78bfa",
                svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
              {id:"risco", label:"Risco", activeColor:"#34d399",
                svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>},
              {id:"ir", label:"Imposto de Renda", activeColor:"#fb923c",
                svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></svg>},
              {id:"relir", label:"Relatório IR", activeColor:"#f472b6",
                svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>},
              {id:"mercado", label:"Correlação Dia", activeColor:"#38bdf8",
                svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>},
              {id:"plano", label:"Plano de Trade", activeColor:"#a78bfa",
                svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>},
            ].map(tb=>(
              <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
                padding:isMobile?"6px 10px":"7px 14px",
                border: tab===tb.id ? `2px solid ${tb.activeColor}` : "1.5px solid #555",
                borderRadius:8,
                background: tab===tb.id ? tb.activeColor+"22" : "#ffffff",
                color: tab===tb.id ? tb.activeColor : "#111111",
                fontWeight: tab===tb.id ? 700 : 500,
                fontSize: isMobile ? 12 : 13,
                cursor:"pointer",
                transition:"all .15s",
                letterSpacing:"0.2px",
                display:"flex", alignItems:"center", gap:6,
                whiteSpace:"nowrap",
                fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",
                boxShadow: tab===tb.id ? `0 2px 8px ${tb.activeColor}44` : "0 1px 3px rgba(0,0,0,0.12)",
                marginBottom:8,
              }}>
                <span style={{opacity: tab===tb.id ? 1 : 0.7, display:"flex"}}>{tb.svg}</span>
                <span>{tb.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{margin:"0 auto",padding:isMobile?"16px 12px":"28px 40px",fontSize:15}}>
        {loadingOps?(
          <div style={{textAlign:"center",padding:60,color:t.muted,fontSize:15}}>⏳ Carregando operações...</div>
        ):(
          <>
            {tab==="home"&&<HomeTab ops={ops} t={t} tvData={tvData} mercadoRegistros={mercadoRegistros} onRegistrarMercado={handleRegistrarMercado} onIrAnalise={()=>setTab("mercado")}/>}
            {tab==="journal"&&<JournalTab ops={ops} onEdit={handleEdit} onDelete={handleDelete} t={t}/>}
            {tab==="analytics"&&<AnalyticsTab ops={ops} t={t}/>}
            {tab==="risco"&&<GestaoRiscoTab gerenciamentos={gerenciamentos} onSave={handleSaveGerenciamento} onDelete={handleDeleteGerenciamento} onToggleAtivo={handleToggleAtivo} t={t}/>}
            {tab==="ir"&&<ImpostoRendaTab t={t} darkMode={darkMode} relIrDados={relIrDados}
  darfPrefill={darfPrefill}
  onClearDarfPrefill={()=>setDarfPrefill(null)}
  diasMesPendente={diasMesPendente}
  onFecharDia={(diaOuArray)=>{
    // Aceita um dia único (formulário manual) ou array (importação de PDFs)
    const lista = Array.isArray(diaOuArray) ? diaOuArray : [diaOuArray];
    setDiasMesPendente(prev=>{
      let estado = prev;
      for (const dia of lista) {
        if(!estado||estado.mes!==dia.mes) estado={mes:dia.mes,nomeMesStr:dia.nomeMesStr,dias:[dia]};
        else estado={...estado,dias:[...estado.dias,dia]};
      }
      return estado;
    });
  }}
  onFecharMes={(dados)=>{setRelIrDados(prev=>[...prev,dados]);setDiasMesPendente(null);setTab("relir");}}
  onGoToRelatorio={()=>setTab("relir")}
/>}
            {tab==="relir"&&<RelatorioIRTab t={t} darkMode={darkMode} dados={relIrDados.filter(d=>(d.dias||[]).some(di=>(di.totalBruto||0)!==0||(di.irpf||0)!==0))} diasMesPendente={diasMesPendente} userId={user.id} onLimpar={()=>setRelIrDados([])} onDeleteMes={(mes)=>setRelIrDados(prev=>prev.filter(d=>d.mes!==mes))} onEditarDia={(mes,diaIdx,notasNovas)=>{ setRelIrDados(prev=>prev.map(d=>{ if(d.mes!==mes) return d; const novosDias=[...( d.dias||[])]; novosDias[diaIdx]={...novosDias[diaIdx],notas:notasNovas, totalBruto:notasNovas.reduce((s,n)=>s+(n.liq||0),0), irpf:notasNovas.reduce((s,n)=>s+(n.irpf||0),0)}; const totalBrutoReal=novosDias.reduce((s,di)=>s+(di.totalBruto||0),0); const totalIRPF=novosDias.reduce((s,di)=>s+(di.irpf||0),0); return {...d,dias:novosDias,totalBrutoReal,totalIRPF,totalBrutoNeg:totalBrutoReal<0,totalBrutoPositivo:totalBrutoReal<0?0:totalBrutoReal}; })) }}
  onFecharMesPendente={(dados)=>{setRelIrDados(prev=>[...prev,dados]);setDiasMesPendente(null);}}
  onDeleteDiaPendente={(idx)=>setDiasMesPendente(prev=>{const novasDias=(prev.dias||[]).filter((_,i)=>i!==idx);return novasDias.length===0?null:{...prev,dias:novasDias};})}
  onEditDiaPendente={(idx,novasNotas)=>setDiasMesPendente(prev=>{const dias=[...(prev.dias||[])];dias[idx]={...dias[idx],notas:novasNotas,totalBruto:novasNotas.reduce((s,n)=>s+(n.liq||0),0),irpf:novasNotas.reduce((s,n)=>s+(n.irpf||0),0)};return {...prev,dias};})}
  onGerarDarf={(data)=>{ setDarfPrefill(data); localStorage.setItem("darfrq_operaPor","proprio"); setTab("ir"); }}
/>}
            {tab==="mercado"&&<MercadoAnaliseTab t={t} registros={mercadoRegistros} onDelete={handleDeleteMercado}/>}
            {tab==="plano"&&<PlanoTradeTab t={t} user={user}/>}
          </>
        )}
      </div>
      {(modal==="add"||modal==="edit")&&(
        <Modal title={editOp?"✏️ Editar Operação":"＋ Nova Operação"} onClose={()=>{setModal(null);setEditOp(null);}} t={t}>
          <AddOpForm initial={editOp||undefined} onSave={handleSave} onClose={()=>{setModal(null);setEditOp(null);}} t={t}/>
        </Modal>
      )}
      {modal==="gerenciamento"&&(
        <Modal title="🛡️ Criar Gerenciamento de Risco" onClose={()=>setModal(null)} t={t}>
          <GerenciamentoForm onSave={handleSaveGerenciamento} onClose={()=>setModal(null)} t={t}/>
        </Modal>
      )}
      {showRelatorio&&<RelatorioModal ops={ops} t={t} userId={user.id} userEmail={user.email} onClose={()=>setShowRelatorio(false)}/>}
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
    </>
  );
}