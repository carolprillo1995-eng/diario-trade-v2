/* eslint-disable no-unused-vars */

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
    horaEntrada:row.hora_entrada||"",
    quantidadeContratos:row.quantidade_contratos!=null?String(row.quantidade_contratos):"",
    precoCompra:row.preco_compra!=null?String(row.preco_compra):"",
    precoVenda:row.preco_venda!=null?String(row.preco_venda):"",
    stopPontos:row.stop_pontos!=null?String(row.stop_pontos):"",
    parcialContratos:row.parcial_contratos!=null?String(row.parcial_contratos):"",
    parciais:row.parciais?JSON.parse(row.parciais):[],
    saidaFinalTipo:row.saida_final_tipo||"",
    saidaFinalContratos:row.saida_final_contratos!=null?String(row.saida_final_contratos):"",
    saidaFinalPontos:row.saida_final_pontos!=null?String(row.saida_final_pontos):"",
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
    hora_entrada:op.horaEntrada||null,
    quantidade_contratos:op.quantidadeContratos!==""?parseFloat(op.quantidadeContratos):null,
    preco_compra:op.precoCompra!==""?parseFloat(op.precoCompra):null,
    preco_venda:op.precoVenda!==""?parseFloat(op.precoVenda):null,
    stop_pontos:op.stopPontos!==""?parseFloat(op.stopPontos):null,
    parcial_contratos:op.parcialContratos!==""?parseFloat(op.parcialContratos):null,
    saida_final_tipo:op.saidaFinalTipo||null,
    saida_final_contratos:op.saidaFinalContratos!==""?parseFloat(op.saidaFinalContratos):null,
    saida_final_pontos:op.saidaFinalPontos!==""?parseFloat(op.saidaFinalPontos):null,
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
  fezParcial:null, parcialRR:"", parcialRRCustom:"", parcialMotivoMenos:"", parcialPontosMenos:"",
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
  const [numParciaisExtras, setNumParciaisExtras] = useState(0);
  const [f,setF]=useState(()=>initial?{
    ...EMPTY_FORM,...initial,
    medias:initial.medias||[],
    impedimentos:initial.impedimentos||[],
    errosOperacao:initial.errosOperacao||[],
    parciais:initial.parciais||[]
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
        {f.direcao&&!isFuturosBR(f.ativo)&&(()=>{
          const taxa=parseFloat(f.cotacaoDolar||cotacaoApi||0);
          const usd=parseFloat(f.resultadoDolar||"");
          const reaisCalc=taxa>0&&!isNaN(usd)&&f.resultadoDolar!==""?(usd*taxa):null;
          const corUsd=usd>=0?"#4ade80":"#f87171";
          return (
            <div style={{marginTop:4,marginBottom:14}}>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
                <div style={{flex:"0 0 190px"}}>
                  <label style={{display:"block",color:"#f59e0b",fontSize:12,marginBottom:6,fontWeight:600}}>💵 Resultado em USD</label>
                  <input type="number" placeholder="ex: 150.00 ou -80.00" value={f.resultadoDolar}
                    onChange={e=>{
                      set("resultadoDolar",e.target.value);
                      const d=parseFloat(e.target.value);
                      const c=parseFloat(f.cotacaoDolar||cotacaoApi||0);
                      if(!isNaN(d)&&c>0) set("resultadoReais",(d*c).toFixed(2));
                    }}
                    style={{...inp,width:"100%",boxSizing:"border-box",border:"1px solid #f59e0b66"}}/>
                </div>
                {reaisCalc!==null&&(
                  <div style={{flex:1,minWidth:150,background:reaisCalc>=0?"#22c55e0d":"#ef44440d",border:`1px solid ${reaisCalc>=0?"#22c55e44":"#ef444444"}`,borderRadius:10,padding:"10px 14px"}}>
                    <div style={{color:t.muted,fontSize:9,marginBottom:6,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{color:"#f59e0b",fontWeight:700}}>{usd>=0?"+":""}{usd.toFixed(2)} USD</span>
                      <span>×</span>
                      <span style={{color:t.text}}>R$ {taxa.toFixed(4)}</span>
                      <span style={{background:"#ef444422",borderRadius:4,padding:"1px 5px",color:"#f87171",fontSize:8,fontWeight:700}}>{loadingCotacao?"⏳":"🔴 AO VIVO"}</span>
                    </div>
                    <div style={{color:corUsd,fontWeight:900,fontSize:20}}>{reaisCalc>=0?"+R$ ":"-R$ "}{Math.abs(reaisCalc).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6,flexWrap:"wrap"}}>
                {cotacaoApi&&<span style={{color:t.muted,fontSize:10}}>Cotação ao vivo: <strong style={{color:"#f59e0b"}}>R$ {cotacaoApi}</strong></span>}
                <button onClick={buscarCotacao} disabled={loadingCotacao} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,color:t.muted,padding:"3px 8px",cursor:"pointer",fontSize:10}}>
                  {loadingCotacao?"⏳":"🔄 Atualizar cotação"}
                </button>
              </div>
            </div>
          );
        })()}
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
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:f.estrategia==="outro"?10:0}}>
          {[
            {v:"trade_abertura",    label:"🔔 Trade de Abertura"},
            {v:"order_block",       label:"🟦 Order Block"},
            {v:"fv_order_block",    label:"🔷 Fair Value Order Block"},
            {v:"pullback_raso",     label:"〰️ Pullback Raso"},
            {v:"pullback_complexo", label:"🔁 Pullback Complexo"},
            {v:"pullback_profundo", label:"📉 Pullback Profundo"},
            {v:"trm",               label:"📊 TRM — Retorno às Médias"},
            {v:"fqe",               label:"⚡ FQE — Falha e Quebra de Estrutura"},
            {v:"tc_supertrend",     label:"🚀 TC SuperTrend"},
            {v:"outro",             label:"✏️ Outro"},
          ].map(op=>(
            <Pill key={op.v} label={op.label}
              selected={f.estrategia===op.v}
              onClick={()=>set("estrategia",f.estrategia===op.v?"":op.v)}
              color="#f59e0b" t={t}/>
          ))}
        </div>
        {f.estrategia==="outro"&&(
          <input
            type="text"
            placeholder="Descreva sua estratégia..."
            value={f.estrategiaOutro||""}
            onChange={e=>set("estrategiaOutro",e.target.value)}
            style={{...inp,width:"100%",boxSizing:"border-box",marginTop:6,border:"1px solid #f59e0b55"}}
          />
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
              const vlrExtras=(f.parciais||[]).reduce((s,p)=>s+cv(p.contratos,p.pontos),0);
              let vlrP1=0;
              if(f.parcialRR==="1x1"){
                // saída total = todos contratos × stop; mais parciais = cts1 × stop
                vlrP1=f.parcialSaidaTotal===true ? cv(cts,stopPts) : cv(cts1,stopPts);
              } else if(f.parcialRR==="Menos que 1x1"){
                const pts=parseFloat(f.parcialPontosMenos)||0;
                // saída total = todos contratos; mais parciais = cts1
                vlrP1=f.parcialSaidaTotalMenos===true ? cv(cts,pts) : cv(cts1,pts);
              } else if(f.parcialRR==="2x1"){
                // saída total = todos contratos × 2×stop; mais parciais = cts1 × 2×stop
                vlrP1=f.parcialSaidaTotal===true ? cv(cts,stopPts*2) : cv(cts1,stopPts*2);
              }
              const total=vlrP1+vlrExtras;
              if(total!==0) finalForm={...finalForm,resultadoReais:total.toFixed(2)};
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
      {op.foto&&<div style={{marginTop:10}}><img src={op.foto} alt="op" style={{maxWidth:"100%",maxHeight:200,borderRadius:8,border:`1px solid ${t.border}`,display:"block",cursor:"pointer"}} onClick={()=>window.open(op.foto,"_blank","noopener,noreferrer")}/><div style={{color:t.muted,fontSize:10,marginTop:4}}>🔍 Clique para ampliar</div></div>}
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


// ─── VIX CARD — Stooq ^vix com variação real ─────────────────────────────────
function VixCard({ t }) {
  const [vix, setVix]         = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const fetchVix = React.useCallback(async () => {
    setLoading(true);
    const yahooUrl = "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d";
    const proxies  = [
      `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`,
    ];
    for (const proxy of proxies) {
      try {
        const res  = await fetch(proxy, { signal: AbortSignal.timeout(9000) });
        let   json = await res.json();
        if (json?.contents) { try { json = JSON.parse(json.contents); } catch(_) {} }
        const meta = json?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          const price = meta.regularMarketPrice;
          const prev  = meta.chartPreviousClose || meta.previousClose || price;
          const chg   = price - prev;
          const pct   = prev > 0 ? (chg / prev) * 100 : 0;
          setVix({ value: price, chg, pct });
          setLoading(false);
          return;
        }
      } catch(_) {}
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchVix();
    const iv = setInterval(fetchVix, 2 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchVix]);

  const isUp = vix ? vix.chg >= 0 : null;
  const cor  = isUp === null ? "#f87171" : (isUp ? "#ef4444" : "#22c55e");
  return (
    <div style={{ background: t.bg, border: `1px solid ${cor}28`, borderRadius: 10, padding: "10px 12px", minWidth: 0, minHeight: 78 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
        <div>
          <div style={{ color: cor, fontWeight: 800, fontSize: 12 }}>VIX</div>
          <div style={{ color: t.muted, fontSize: 8 }}>CBOE Volatility · YF</div>
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
        <div style={{ fontSize: 11, color: t.muted, marginTop: 8 }}>{loading ? "⏳" : "—"}</div>
      )}
    </div>
  );
}

// ─── ADRs BRASILEIRAS — widgets TradingView (tempo real, sem CORS) ────────────
function ADRBrasileiras({ t }) {
  const ADR_LIST = [
    { sym: "NYSE:BBD",   nome: "BBDC", label: "Banco Bradesco"           },
    { sym: "NYSE:VALE",  nome: "VALE", label: "Vale S.A."                },
    { sym: "NYSE:ITUB",  nome: "ITUB", label: "Itaú Unibanco"            },
    { sym: "NYSE:PBR",   nome: "PBR",  label: "Petróleo Brasileiro"      },
    { sym: "OTC:BOLSY",  nome: "B3SA", label: "B3 S.A."         },
    { sym: "OTC:BDORY",  nome: "BBAS", label: "Banco do Brasil" },
  ];
  const makeIframe = sym => {
    const cfg = JSON.stringify({ symbol: sym, width: "100%", colorTheme: "dark", isTransparent: true, locale: "br" });
    return `https://s.tradingview.com/embed-widget/single-quote/?locale=br#${encodeURIComponent(cfg)}`;
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 7px" }}>
        <div style={{ flex: 1, height: 1, background: t.border }} />
        <span style={{ color: "#4ade80", fontWeight: 800, fontSize: 10, letterSpacing: 1.2, whiteSpace: "nowrap" }}>🇧🇷 ADRs BRASILEIRAS — NYSE / OTC</span>
        <div style={{ flex: 1, height: 1, background: t.border }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 7 }}>
        {ADR_LIST.map(adr => (
          <div key={adr.sym} style={{ background: t.bg, border: "1px solid #4ade8020", borderRadius: 10, overflow: "hidden", minWidth: 0, minHeight: 93 }}>
            <iframe src={makeIframe(adr.sym)} style={{ width: "100%", height: 93, border: "none", display: "block" }} scrolling="no" allowTransparency={true} title={adr.nome} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 5, color: t.muted, fontSize: 8, textAlign: "center" }}>⚡ TradingView · tempo real</div>
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

  // TradingView Mini Widget — funciona via iframe embed, sem CORS, completamente gratuito
  // Cada card é um iframe com widget do TradingView
  // Grupo 1 e 2 usam Yahoo Finance (YF) via proxy — TradingView bloqueia SP:SPX, DJ:DJI, TVC:DXY etc em embed gratuito
  const widgets = [
    // Linha 1: Dólar/Índices — Yahoo Finance
    { yf: "DX-Y.NYB", nome: "DXY",        cor: "#f59e0b", grupo: 1 },
    { yf: "^GSPC",    nome: "S&P 500",    cor: "#60a5fa", grupo: 1 },
    { yf: "^DJI",     nome: "Dow Jones",  cor: "#60a5fa", grupo: 1 },
    { yf: "^NDX",     nome: "Nasdaq 100", cor: "#60a5fa", grupo: 1 },
    // Linha 2: Commodities/Cripto
    { yf: "GC=F",                        nome: "Ouro",       cor: "#f59e0b", grupo: 2 },
    { yf: "CL=F",                        nome: "WTI CL1!",   cor: "#94a3b8", grupo: 2 },
    { tvFetch: true, tvSym: "SGX:FEF1!", yfSyms: ["TIO=F","IO=F"], stooqSyms: ["fef1.f","tio.f"], nasdaqSym: "CHRIS/SGX_FEF1", barchartSym: "C0*0", nome: "Minério FEF1!", cor: "#fb923c", grupo: 2 },
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
      <div style={{ background: t.bg, border: `1px solid ${cor}28`, borderRadius: 10, overflow: "hidden", minWidth: 0, minHeight: 80 }}>
        <iframe
          src={src}
          style={{ width: "100%", height: 78, border: "none", display: "block" }}
          scrolling="no"
          allowTransparency={true}
          title={nome}
        />
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
            <div style={{ color: t.muted, fontSize: 9 }}>tvDatafeed</div>
          </div>
          <span style={{ background: "#1a2a1a", borderRadius: 3, padding: "1px 4px", color: "#4ade80", fontSize: 8, fontWeight: 700 }}>TV</span>
        </div>
        {d ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 900, color: clr }}>{d.preco.toFixed(2)}</div>
            <div style={{ fontSize: 10, color: clr, fontWeight: 600 }}>
              {isUp ? "+" : ""}{d.variacao.toFixed(2)} ({isUp ? "+" : ""}{d.percent.toFixed(2)}%)
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: t.muted, marginTop: 6 }}>⏳ aguardando servidor...</div>
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
          <span style={{ background: "#1a2a1a", borderRadius: 3, padding: "1px 4px", color: "#4ade80", fontSize: 8, fontWeight: 700 }}>TV</span>
        </div>
        {d ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 900, color: clr }}>
              {d.preco.toFixed(2)} <span style={{ fontSize: 9, color: t.muted, fontWeight: 400 }}>USD</span>
            </div>
            <div style={{ fontSize: 10, color: clr, fontWeight: 600 }}>
              {up ? "+" : ""}{d.variacao.toFixed(2)} ({up ? "+" : ""}{d.percent.toFixed(2)}%)
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10, alignItems: "start" }}>

            {/* Esquerda: índices + commodities empilhados */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Linha 1: VIX + grupo 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                <VixCard t={t} />
                {widgets.filter(w => w.grupo === 1).map(w => <QuoteCard key={w.yf} yf={w.yf} nome={w.nome} cor={w.cor} />)}
              </div>

              {/* Linha 2: Commodities · Cripto */}
              <div>
                <Titulo icon="🛢️" label="COMMODITIES · CRIPTO" cor="#f59e0b" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
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
            <div style={{ alignSelf: "start" }}>
              <div style={{ color: "#a855f7", fontWeight: 800, fontSize: 9, letterSpacing: 1, marginBottom: 6, whiteSpace: "nowrap" }}>🏦 DI FUTURO B3</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {DI_CONFIG.map(di => {
                  const cfg = JSON.stringify({ symbol: di.tvSym, width: "100%", colorTheme: "dark", isTransparent: true, locale: "br" });
                  const src = `https://s.tradingview.com/embed-widget/single-quote/?locale=br#${encodeURIComponent(cfg)}`;
                  return (
                    <div key={di.nome} style={{ background: t.bg, border: `1px solid ${di.cor}28`, borderRadius: 8, overflow: "hidden" }}>
                      <iframe src={src} style={{ width: "100%", height: 78, border: "none", display: "block" }} scrolling="no" allowTransparency={true} title={di.nome} />
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


// ─── PROBABILIDADE DA ABERTURA ──────────────────────────────────────────────
function ProbabilidadeCard({ t, tvData }) {
  const [vix,  setVix]  = React.useState(null);
  const [cl1,  setCl1]  = React.useState(null);
  const [fef1, setFef1] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [temNoticia, setTemNoticia] = React.useState(false);
  const [open, setOpen] = React.useState(true);
  const [fonte, setFonte] = React.useState(null);
  const [calculado, setCalculado] = React.useState(false);

  const fetchYF = React.useCallback(async (sym) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    ];
    for (const proxy of proxies) {
      try {
        const r = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
        let d;
        if (proxy.includes("/get?url=")) { const j = await r.json(); d = JSON.parse(j.contents); }
        else { d = await r.json(); }
        const meta = d?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          const price = meta.regularMarketPrice;
          const prev  = meta.chartPreviousClose || meta.previousClose || price;
          return prev ? ((price - prev) / prev) * 100 : 0;
        }
      } catch (_) {}
    }
    return null;
  }, []);

  const buscarMacro = React.useCallback(() => {
    setLoading(true);
    // VIX e CL1 → Yahoo Finance (sempre disponível)
    Promise.all([fetchYF("^VIX"), fetchYF("CL=F")]).then(([v, c]) => {
      if (v != null) setVix(v);
      if (c != null) setCl1(c);
      setFonte("YF");
      setCalculado(true);
      setLoading(false);
    });
  }, [fetchYF]);

  // FEF1 → apenas do servidor local tvDatafeed
  React.useEffect(() => {
    if (!tvData?.minerio?.percent) return;
    setFef1(tvData.minerio.percent);
    setCalculado(true);
  }, [tvData]);

  const analise = React.useMemo(() => {
    if (!calculado || vix == null || cl1 == null || fef1 == null) return null;
    const vixAdj   = -vix;
    const resultado = fef1 + cl1 + vixAdj;
    const absRes   = Math.abs(resultado);
    const descorrelado = (fef1 > 0 && cl1 < 0) || (fef1 < 0 && cl1 > 0);
    let tendencia, corTendencia, gap;
    if (resultado > 2)       { tendencia = "POSITIVO ▲"; corTendencia = "#4ade80"; gap = "GAP de ALTA provável"; }
    else if (resultado < -2) { tendencia = "NEGATIVO ▼"; corTendencia = "#f87171"; gap = "GAP de BAIXA provável"; }
    else                     { tendencia = "NEUTRO →";   corTendencia = "#f59e0b"; gap = "Abertura SEM GAP"; }
    let cenarioHoje;
    if (temNoticia) {
      if (resultado > 2)       cenarioHoje = "Pode abrir com GAP de alta e corrigir, ou abrir sem GAP e subir depois";
      else if (resultado < -2) cenarioHoje = "Pode abrir com GAP de baixa e corrigir, ou abrir sem GAP e cair depois";
      else                     cenarioHoje = "Notícia às 09:00 pode causar movimento inicial contrário — aguardar direção";
    } else {
      if (resultado > 2)       cenarioHoje = "Tendência de abertura positiva / GAP de alta";
      else if (resultado < -2) cenarioHoje = "Tendência de abertura negativa / GAP de baixa";
      else                     cenarioHoje = "Mercado deve abrir neutro, sem gap relevante";
    }
    return { resultado, tendencia, corTendencia, gap, descorrelado, cenarioHoje, vix, cl1, fef1 };
  }, [calculado, vix, cl1, fef1, temNoticia]);

  const labelCor = "#a78bfa";
  const _agora = new Date(), _min = _agora.getHours() * 60 + _agora.getMinutes();
  const liberado850 = _min >= 8 * 60 + 50;

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
      <div onClick={() => setOpen(o => !o)} style={{ background: t.header, borderBottom: open ? `1px solid ${t.border}` : "none", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>📈</span>
          <span style={{ color: labelCor, fontWeight: 800, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Probabilidade abertura Índice hoje</span>
          {analise && (
            <span style={{ background: analise.corTendencia + "22", border: `1px solid ${analise.corTendencia}44`, borderRadius: 999, padding: "2px 8px", color: analise.corTendencia, fontSize: 9, fontWeight: 700 }}>
              {analise.tendencia} ({analise.resultado >= 0 ? "+" : ""}{analise.resultado.toFixed(2)}%)
            </span>
          )}
        </div>
        <span style={{ color: t.muted, fontSize: 12, transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform .2s", display: "inline-block" }}>▲</span>
      </div>

      {open && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            {/* Botão Calcular */}
            <button
              onClick={e => { e.stopPropagation(); if (liberado850) buscarMacro(); }}
              disabled={loading || !liberado850}
              title={!liberado850 ? "Disponível a partir das 08:50" : ""}
              style={{ background: !liberado850 ? t.header : loading ? t.header : "#7c3aed22", border: `1px solid ${!liberado850 ? t.border : "#7c3aed"}`, borderRadius: 6, color: !liberado850 ? t.muted : loading ? t.muted : "#a78bfa", padding: "4px 16px", cursor: (!liberado850 || loading) ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700 }}>
              {loading ? "⏳ Buscando..." : !liberado850 ? "🔒 Libera às 08:50" : "Calcular"}
            </button>
            {/* Notícia toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: t.muted, fontSize: 10 }}>📅 Notícia 09h?</span>
              <button onClick={e => { e.stopPropagation(); setTemNoticia(v => !v); }}
                style={{ background: temNoticia ? "#7c3aed" : t.header, border: `1px solid ${temNoticia ? "#7c3aed" : t.border}`, borderRadius: 4, color: temNoticia ? "#fff" : t.muted, padding: "2px 8px", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                {temNoticia ? "SIM" : "NÃO"}
              </button>
            </div>
            {/* Status */}
            {fonte === "TV" && <span style={{ color: "#4ade80", fontSize: 9 }}>✅ TV Server</span>}
            {fonte === "YF" && fef1 == null && <span style={{ color: "#f59e0b", fontSize: 9 }}>⚠️ Sem FEF1! — inicie python tv_server.py</span>}
            {/* Valores usados */}
            {analise && (
              <>
                <span style={{ color: t.muted, fontSize: 10 }}>VIX <span style={{ color: analise.vix >= 0 ? "#f87171" : "#4ade80" }}>{analise.vix >= 0 ? "+" : ""}{analise.vix.toFixed(2)}%</span></span>
                <span style={{ color: t.muted, fontSize: 10 }}>CL1! <span style={{ color: analise.cl1 >= 0 ? "#4ade80" : "#f87171" }}>{analise.cl1 >= 0 ? "+" : ""}{analise.cl1.toFixed(2)}%</span></span>
                <span style={{ color: t.muted, fontSize: 10 }}>FEF1! <span style={{ color: analise.fef1 >= 0 ? "#4ade80" : "#f87171" }}>{analise.fef1 >= 0 ? "+" : ""}{analise.fef1.toFixed(2)}%</span></span>
              </>
            )}
          </div>

          {/* Resultado */}
          {analise ? (
            <div style={{ background: t.bg, border: `1px solid ${analise.corTendencia}44`, borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ color: analise.corTendencia, fontWeight: 900, fontSize: 15 }}>{analise.tendencia}</span>
                <span style={{ color: analise.corTendencia, fontWeight: 700, fontSize: 12 }}>
                  {analise.resultado >= 0 ? "+" : ""}{analise.resultado.toFixed(2)}%
                </span>
              </div>
              <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 10, marginBottom: 4 }}>{analise.gap}</div>
              <div style={{ color: t.text, fontSize: 10 }}>{analise.cenarioHoje}</div>
              {temNoticia && <div style={{ color: "#f87171", fontSize: 9, marginTop: 4 }}>⚠️ Notícia às 09:00 — atenção ao movimento inicial</div>}
              {analise.descorrelado && <div style={{ color: "#f59e0b", fontSize: 9, marginTop: 4 }}>⚠️ Ativos descorrelacionados — menor confiabilidade</div>}
            </div>
          ) : !loading && (
            <div style={{ color: t.muted, fontSize: 10, textAlign: "center", padding: "16px 0" }}>
              Clique em <strong>Calcular</strong> para buscar os dados do servidor local.
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

    // Fonte 1: Yahoo Finance USDBRL=X — direto, sem proxy, mais confiável
    try {
      const r    = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/USDBRL%3DX?interval=1d&range=1d`, { signal: AbortSignal.timeout(8000) });
      const data = await r.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        const last = parseFloat(meta.regularMarketPrice);
        const high = parseFloat(meta.regularMarketDayHigh || meta.regularMarketPrice);
        const low  = parseFloat(meta.regularMarketDayLow  || meta.regularMarketPrice);
        if (last > 3 && last < 12) {
          salvar(1/last, 1/low, 1/high, "YF USDBRL");
          setLoading(false);
          return;
        }
      }
    } catch(_) {}

    // Fonte 2: AwesomeAPI USD-BRL spot (direto, sem proxy)
    try {
      const r    = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", { signal: AbortSignal.timeout(8000) });
      const json = await r.json();
      const bid  = parseFloat(json?.USDBRL?.bid  || 0);
      const high = parseFloat(json?.USDBRL?.high || 0);
      const low  = parseFloat(json?.USDBRL?.low  || 0);
      if (bid > 3 && bid < 10) {
        salvar(1 / bid, 1 / low, 1 / high, "AwesomeAPI");
        setLoading(false);
        return;
      }
    } catch(_) {}

    setLoading(false);
  }, []);

  const liberado800 = true; // Yahoo Finance e AwesomeAPI disponíveis 24h

  React.useEffect(() => { buscar(); }, [buscar]);

  // Converte BRL/USD → R$ por dólar
  const fmtBrl = v => v && v > 0 ? `R$ ${(1 / v).toFixed(3).replace(".", ",")}` : "—";

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
      <div onClick={() => setOpen(v => !v)} style={{ background: t.header, borderBottom: open ? `1px solid ${t.border}` : "none", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
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

function GerenciamentoForm({onSave, onClose, t}) {
  const [f, setF] = useState({...EMPTY_GERENCIAMENTO});
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const inp = {background:t.input,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"10px 14px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box"};

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

  const validMesa = f.tipoCapital==="mesa" && f.dataCriacao && f.mesaNome && f.mesaContratosMax && f.mesaContratosOp;
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
        <Section icon="🏢" title="Mesa Proprietária" t={t} accent="#a855f7">

          {/* Nome da mesa */}
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🏷️ Nome da Mesa</label>
            <input placeholder="ex: TopstepTrader, Apex, FTMO, Clear..." value={f.mesaNome}
              onChange={e=>set("mesaNome",e.target.value)} style={inp}/>
          </div>

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
          💾 Salvar Gerenciamento
        </button>
      </div>
    </div>
  );
}

function GestaoRiscoTab({gerenciamentos, onSave, onDelete, onToggleAtivo, t}) {
  const [editando, setEditando] = React.useState(null);

  const ativos = gerenciamentos.filter(g=>g.ativo!==false);
  const inativos = gerenciamentos.filter(g=>g.ativo===false);

  const renderCard = (g) => {
    const pf = g.perfil ? PERFIS_RISCO[g.perfil] : null;
    const cor = pf ? pf.color : (g.tipo_capital==="mesa"?"#a855f7":"#60a5fa");
    const isAtivo = g.ativo!==false;
    const capital = parseFloat(g.capital)||0;
    const metaAprov = parseFloat(g.mesa_meta_aprovacao)||0;
    const perdaDiaria = parseFloat(g.mesa_perda_diaria)||0;
    const perdaMax = parseFloat(g.mesa_perda_maxima)||0;
    const stopDia = parseFloat(g.plan_stop_max_dia)||0;
    return (
      <div key={g.id} style={{background:t.card,border:`2px solid ${isAtivo?cor+"66":t.border}`,borderRadius:16,padding:"20px 22px",marginBottom:16,opacity:isAtivo?1:0.55,position:"relative"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
          <div>
            {isAtivo&&<div style={{color:"#10b981",fontWeight:800,fontSize:11,marginBottom:4,letterSpacing:1}}>✅ PLANO ATIVO</div>}
            {!isAtivo&&<div style={{color:t.muted,fontWeight:700,fontSize:11,marginBottom:4,letterSpacing:1}}>⏸️ DESATIVADO</div>}
            <div style={{color:t.text,fontWeight:800,fontSize:17}}>{g.nome||g.mesa_nome||"Sem nome"}</div>
            <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
              {pf&&<span style={{background:pf.bg,border:`1px solid ${pf.border}`,color:pf.color,padding:"3px 12px",borderRadius:999,fontSize:11,fontWeight:700}}>{pf.label}</span>}
              {g.tipo_capital&&<span style={{background:t.bg,border:`1px solid ${t.border}`,color:t.muted,padding:"3px 12px",borderRadius:999,fontSize:11}}>{g.tipo_capital==="mesa"?"🏢 Mesa Proprietária":"💰 Capital Próprio"}</span>}
              <span style={{color:t.muted,fontSize:11}}>📅 {g.data_criacao||g.created_at?.slice(0,10)}</span>
            </div>
          </div>
          {/* Ações */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>onToggleAtivo&&onToggleAtivo(g.id,!isAtivo)}
              style={{background:"transparent",border:`1px solid ${isAtivo?"#f59e0b55":"#22c55e55"}`,borderRadius:8,
                color:isAtivo?"#f59e0b":"#22c55e",padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>
              {isAtivo?"⏸️ Desativar":"▶️ Ativar"}
            </button>
            <button onClick={()=>onDelete(g.id)}
              style={{background:"transparent",border:`1px solid #ef444455`,borderRadius:8,color:"#f87171",padding:"7px 12px",cursor:"pointer",fontSize:12}}>
              🗑️ Excluir
            </button>
          </div>
        </div>

        {/* Indicadores */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8,marginBottom:14}}>
          {[
            capital?["💰 Capital",`R$ ${capital.toLocaleString("pt-BR",{minimumFractionDigits:2})}`,"#60a5fa"]:null,
            g.mesa_nome?["🏢 Mesa",g.mesa_nome,"#a855f7"]:null,
            g.mesa_contratos_max_win?["🟢 Máx WIN",`${g.mesa_contratos_max_win} ct`,"#22c55e"]:null,
            g.mesa_contratos_max_wdo?["💱 Máx WDO",`${g.mesa_contratos_max_wdo} ct`,"#06b6d4"]:null,
            perdaDiaria?["🛑 Stop Diário",`-R$ ${perdaDiaria.toLocaleString("pt-BR",{minimumFractionDigits:2})}`,"#ef4444"]:null,
            perdaMax?["💀 Perda Máx",`-R$ ${perdaMax.toLocaleString("pt-BR",{minimumFractionDigits:2})}`,"#ef4444"]:null,
            metaAprov?["🏆 Meta Aprovação",`+R$ ${metaAprov.toLocaleString("pt-BR",{minimumFractionDigits:2})}`,"#22c55e"]:null,
            g.mesa_repasse?["📊 Repasse",`${g.mesa_repasse}% p/ você`,"#a855f7"]:null,
            stopDia?["🛑 Stop/Dia",`-R$ ${stopDia.toLocaleString("pt-BR",{minimumFractionDigits:2})}`,"#f59e0b"]:null,
            g.plan_qtd_contratos?["📊 Contratos Plan",`${g.plan_qtd_contratos} ct`,cor]:null,
            g.horario_inicio&&g.horario_fim?["⏰ Horário",`${g.horario_inicio} → ${g.horario_fim}`,"#06b6d4"]:null,
            g.mesa_custo_plataforma?["🖥️ Plataforma",`${g.mesa_custo_plataforma} R$${g.mesa_custo_valor||"?"}/per`,"#94a3b8"]:null,
          ].filter(Boolean).map(([label,val,c])=>(
            <div key={label} style={{background:t.bg,border:`1px solid ${c}33`,borderRadius:10,padding:"10px 12px"}}>
              <div style={{color:t.muted,fontSize:10,fontWeight:700,marginBottom:3}}>{label}</div>
              <div style={{color:c,fontWeight:800,fontSize:13}}>{val}</div>
            </div>
          ))}
        </div>

        {/* Metas planejamento */}
        {(g.plan_usa_meta_pct||g.plan_usa_meta_pontos||g.plan_usa_meta_reais)&&(
          <div style={{background:"#a855f710",border:"1px solid #a855f733",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
            <div style={{color:"#a855f7",fontWeight:700,fontSize:11,marginBottom:8}}>⚙️ MEU PLANEJAMENTO</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              {g.plan_usa_meta_pct&&g.plan_meta_dia_pct&&(
                <div style={{background:t.bg,borderRadius:8,padding:"8px 12px",border:"1px solid #a855f733"}}>
                  <div style={{color:t.muted,fontSize:10,fontWeight:600}}>Meta % ao dia</div>
                  <div style={{color:"#a855f7",fontWeight:800,fontSize:15}}>{g.plan_meta_dia_pct}%</div>
                  {metaAprov>0&&<div style={{color:t.muted,fontSize:10}}>~{Math.ceil(metaAprov/(metaAprov*parseFloat(g.plan_meta_dia_pct)/100))} dias</div>}
                </div>
              )}
              {g.plan_usa_meta_pontos&&(g.plan_meta_dia_pontos_win||g.plan_meta_dia_pontos_wdo)&&(
                <div style={{background:t.bg,borderRadius:8,padding:"8px 12px",border:"1px solid #22c55e33"}}>
                  <div style={{color:t.muted,fontSize:10,fontWeight:600}}>Meta Pontos</div>
                  {g.plan_meta_dia_pontos_win&&<div style={{color:"#4ade80",fontWeight:700,fontSize:13}}>WIN: {g.plan_meta_dia_pontos_win}pts</div>}
                  {g.plan_meta_dia_pontos_wdo&&<div style={{color:"#06b6d4",fontWeight:700,fontSize:13}}>WDO: {g.plan_meta_dia_pontos_wdo}pts</div>}
                </div>
              )}
              {g.plan_usa_meta_reais&&g.plan_meta_dia_reais&&(
                <div style={{background:t.bg,borderRadius:8,padding:"8px 12px",border:"1px solid #f59e0b33"}}>
                  <div style={{color:t.muted,fontSize:10,fontWeight:600}}>Meta R$/dia</div>
                  <div style={{color:"#f59e0b",fontWeight:800,fontSize:15}}>R$ {parseFloat(g.plan_meta_dia_reais).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                  {metaAprov>0&&<div style={{color:t.muted,fontSize:10}}>~{Math.ceil(metaAprov/parseFloat(g.plan_meta_dia_reais))} dias</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Regras perfil */}
        {pf&&isAtivo&&(
          <div style={{background:pf.bg,border:`1px solid ${pf.border}`,borderRadius:10,padding:"14px 16px",marginBottom:10}}>
            <div style={{color:pf.color,fontWeight:700,fontSize:12,marginBottom:8}}>📋 REGRAS — {pf.label.toUpperCase()}</div>
            {pf.regras.map((r,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}>
                <span style={{color:pf.color,fontWeight:700,fontSize:11,minWidth:18}}>{i+1}.</span>
                <span style={{color:t.text,fontSize:12}}>{r}</span>
              </div>
            ))}
            <div style={{marginTop:10,color:pf.color,fontWeight:700,fontSize:11}}>🛑 {pf.stopDiario}</div>
          </div>
        )}
        {g.regras&&(()=>{
          // Regras: pode ser JSON puro, JSON+\n---\n+texto, ou texto puro
          let textoRegras = g.regras || "";
          let extraParsed = null;
          if(textoRegras.trim().startsWith("{")) {
            try {
              // Tenta separar pelo delimitador
              const sep = textoRegras.indexOf("\n---\n");
              const jsonPart = sep>=0 ? textoRegras.slice(0,sep) : textoRegras;
              textoRegras = sep>=0 ? textoRegras.slice(sep+5).trim() : "";
              extraParsed = JSON.parse(jsonPart);
            } catch(e) {
              // Se parse falhar, trata tudo como texto
              textoRegras = g.regras;
            }
          }
          return textoRegras ? (
            <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,padding:"12px 16px"}}>
              <div style={{color:t.muted,fontSize:11,fontWeight:700,marginBottom:6}}>📝 REGRAS PESSOAIS</div>
              <pre style={{color:t.text,fontSize:12,lineHeight:1.7,whiteSpace:"pre-wrap",margin:0,fontFamily:"inherit"}}>{textoRegras}</pre>
            </div>
          ) : null;
        })()}
      </div>
    );
  };

  return (
    <div>
      {ativos.length===0&&(
        <div style={{background:t.card,border:`2px dashed ${t.border}`,borderRadius:16,padding:"40px 20px",textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:12}}>🛡️</div>
          <div style={{color:t.text,fontWeight:700,fontSize:16,marginBottom:6}}>Nenhum gerenciamento ativo</div>
          <div style={{color:t.muted,fontSize:13}}>Clique em "🛡️ Criar Gerenciamento" no topo para definir seu plano de risco</div>
        </div>
      )}
      {ativos.map(g=>renderCard(g))}
      {inativos.length>0&&(
        <div>
          <div style={{color:t.muted,fontWeight:700,fontSize:12,letterSpacing:1,textTransform:"uppercase",margin:"20px 0 12px"}}>📂 Gerenciamentos Desativados</div>
          {inativos.map(g=>renderCard(g))}
        </div>
      )}
    </div>
  );
}


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
    const prompt = `Você é coach de traders com 20 anos de experiência. Analise as operações da semana ${semana.start} a ${semana.end} e gere relatório COMPLETO em português simples.\n\nDADOS:\n- Total: ${opsSemana.length} ops\n- Resultado R$: ${totalSemana.toFixed(2)}\n- Resultado USD: ${totalSemanaUSD.toFixed(2)}\n- Acerto: ${pct}% (${wins} ganhos, ${opsSemana.length - wins} perdas)\n\nOPERAÇÕES:\n${JSON.stringify(resumo, null, 2)}\n\nSeções obrigatórias:\n## 📊 VISÃO GERAL\n## 🏆 O QUE FEZ BEM\n## ❌ O QUE TE FEZ PERDER\n## 🔍 PADRÕES DE ERRO\n## 🧠 ANÁLISE EMOCIONAL\n## 🛠️ PLANO DE AÇÃO (5 ações concretas)\n## 🎯 3 FOCOS DA PRÓXIMA SEMANA\n\nSeja direto, cite dados reais, explique termos técnicos.`;
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
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 8px #5b8af544}50%{box-shadow:0 0 18px #5b8af577}}
      `}</style>
    </Modal>
  );
}

function HomeTab({ops,t,tvData}) {
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
      {/* Mercados no topo — largura total */}
      <PainelMercados t={t} tvData={tvData}/>

      {/* Layout de 2 colunas: conteúdo principal + calendário lateral */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 660px",gap:14,alignItems:"start"}}>

        {/* Coluna esquerda */}
        <div>
          <RegoesDolar t={t}/>
          <ProbabilidadeCard t={t} tvData={tvData}/>

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
  const [periodo,setPeriodo] = useState("tudo");
  const [dataIni,setDataIni] = useState("");
  const [dataFim,setDataFim] = useState("");
  const [fMercado,setFMercado] = useState("todos");
  const [fAtivo,setFAtivo] = useState("todos");
  const [fDirecao,setFDirecao] = useState("todas");
  const [fEstrategia,setFEstrategia] = useState("todas");
  const [rankView,setRankView] = useState("ganhos"); // ganhos | perdas | acerto

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

        {/* Linha 3: Estratégia da Operação — destaque especial */}
        <div style={{background:t.bg,border:`1px solid #a78bfa33`,borderRadius:12,padding:"12px 16px"}}>
          <div style={{color:"#a78bfa",fontSize:9,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1.5,display:"flex",alignItems:"center",gap:6}}>
            <span>🎯</span> Estratégia da Operação
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {btnF(fEstrategia==="todas",()=>setFEstrategia("todas"),"Todas","#a78bfa")}
            {["🔔 Trade de Abertura","🟦 Order Block","🔷 Fair Value Order Block","〰️ Pullback Raso","🔁 Pullback Complexo","📉 Pullback Profundo","📊 TRM — Retorno às Médias","⚡ FQE — Falha e Quebra de Estrutura","🚀 TC SuperTrend","✏️ Outro"].map(e=>
              btnF(fEstrategia===e,()=>setFEstrategia(e),e,"#a78bfa")
            )}
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

      {/* ══ RANKING ESTRATÉGIAS ══ */}
      <div style={{...card}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:3,height:18,background:"#a78bfa",borderRadius:2}}/>
            <span style={{color:"#a78bfa",fontWeight:800,fontSize:12,letterSpacing:1,textTransform:"uppercase"}}>Ranking por Estratégia</span>
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
        {rankEstr.length===0&&<div style={{color:t.muted,fontSize:13,textAlign:"center",padding:20}}>Sem dados de estratégia registrados.</div>}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {rankEstr.map((e,i)=>{
            const pctAcerto = e.count?Math.round(e.wins/e.count*100):0;
            const barPct = Math.abs(e.reais)/maxAbsEstr*100;
            const isPos = e.reais>=0;
            const rank1 = i===0;
            return (
              <div key={e.tipo} style={{
                background:rank1?(isPos?"#052218":"#1a0505"):t.bg,
                border:`1px solid ${rank1?(isPos?"#22c55e44":"#ef444444"):t.border}`,
                borderRadius:12,padding:"14px 16px",
                transition:"all .15s",
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{
                      width:26,height:26,borderRadius:8,
                      background:rank1?(isPos?"#22c55e33":"#ef444433"):"transparent",
                      border:`1px solid ${rank1?(isPos?"#22c55e66":"#ef444466"):t.border}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      color:rank1?(isPos?"#4ade80":"#f87171"):t.muted,
                      fontWeight:900,fontSize:11,flexShrink:0,
                    }}>#{i+1}</div>
                    <div>
                      <div style={{color:t.text,fontWeight:700,fontSize:13}}>{e.tipo}</div>
                      <div style={{color:t.muted,fontSize:10,marginTop:2}}>
                        {e.count} op{e.count!==1?"s":""} · {e.wins}✅ {e.losses}❌ · {pctAcerto}% acerto
                      </div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:isPos?"#4ade80":"#f87171",fontWeight:900,fontSize:16,fontFamily:"monospace"}}>
                      {isPos?"+":""}{brl(e.reais)}
                    </div>
                    <div style={{color:t.muted,fontSize:10}}>média {brl(e.count?e.reais/e.count:0)}/op</div>
                  </div>
                </div>
                {/* Barra de resultado */}
                <div style={{background:t.border,borderRadius:4,height:4,overflow:"hidden"}}>
                  <div style={{width:`${barPct}%`,height:"100%",background:isPos?"#22c55e":"#ef4444",borderRadius:4,transition:"width .4s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
    deducao = Math.min(DESCONTO_SIMPLIFICADO_CL, bruto * DESCONTO_SIMPLIFICADO_PCT_CL);
  } else {
    const dedDep = (parseInt(dependentes)||0) * DEDUCAO_DEPENDENTE_CL;
    deducao = dedDep + (parseFloat(outrasDeducoes)||0);
  }
  const base  = Math.max(0, bruto - deducao);
  const faixa = TABELA_CARNE_LEAO.find(f => base <= f.ate);
  if (!faixa || faixa.aliq === 0) return { base, deducao, aliq: 0, ded: 0, irDevido: 0, isento: true };
  const irDevido = Math.max(0, base * faixa.aliq - faixa.ded);
  return { base, deducao, aliq: faixa.aliq, ded: faixa.ded, irDevido, isento: false };
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

function CarneLeaoCalculadora({ t }) {
  const brl    = v => `R$ ${(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const cardSt = {background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:'18px 20px',marginBottom:14};
  const inp    = {width:'100%',background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:'9px 12px',color:t.text,fontSize:13,outline:'none',boxSizing:'border-box'};
  const inpSm  = {...inp, padding:'7px 10px', fontSize:12};
  const label  = (txt) => <div style={{color:t.muted,fontSize:11,fontWeight:700,marginBottom:5}}>{txt}</div>;

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
                  <div>
                    <div style={{background:'#f59e0b15',border:'1px solid #f59e0b44',borderRadius:8,padding:'8px 12px'}}>
                      <div style={{color:'#f59e0b',fontWeight:900,fontSize:16,fontFamily:'monospace'}}>R$ {ptax.taxa.toFixed(4)}</div>
                      <div style={{color:t.muted,fontSize:10,marginTop:2}}>PTAX · {ptax.dataRef} · última BD da 1ª quinzena do mês anterior</div>
                    </div>
                  </div>
                )}
                {!ptaxLoading&&!dataReceb&&<div style={{color:t.muted,fontSize:11,padding:'9px 0'}}>Informe a data para buscar cotação</div>}
                {!ptaxLoading&&dataReceb&&!ptax&&!ptaxManual&&<div style={{color:'#f59e0b',fontSize:11,padding:'9px 0'}}>⚠️ Cotação não encontrada. Digite abaixo:</div>}
              </div>
            </div>
            <div>
              {label('✏️ Cotação manual (se necessário)')}
              <input type="number" step="0.0001" placeholder="Ex: 5.8547 (deixe vazio para usar BCB)" value={ptaxManual} onChange={e=>setPtaxManual(e.target.value)} style={inpSm}/>
              <div style={{color:t.muted,fontSize:9,marginTop:3}}>Regra RF: PTAX do último dia útil da 1ª quinzena do mês anterior ao recebimento</div>
            </div>
            {(parseFloat(valorUSD)||0) > 0 && taxaEfetiva > 0 &&(
              <div style={{background:'#22c55e15',border:'1px solid #22c55e33',borderRadius:8,padding:'10px 14px',marginTop:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{color:t.muted,fontSize:10}}>Valor convertido</div>
                  <div style={{color:'#4ade80',fontWeight:900,fontSize:18,fontFamily:'monospace'}}>{brl(brutoFinal)}</div>
                </div>
                <div style={{color:t.muted,fontSize:11,textAlign:'right'}}>
                  <div>USD {parseFloat(valorUSD).toLocaleString('pt-BR',{minimumFractionDigits:2})} × {taxaEfetiva.toFixed(4)}</div>
                  <div style={{fontSize:9,marginTop:2}}>= {brl(brutoFinal)}</div>
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
          {btnSel(tipoDesc==='simplificado',()=>setTipoDesc('simplificado'),'✅ Simplificado (20%, máx R$ 564,62/mês)','#22c55e')}
          {btnSel(tipoDesc==='detalhado',()=>setTipoDesc('detalhado'),'📋 Detalhado (dependentes + deduções)','#a855f7')}
        </div>
        {tipoDesc==='simplificado'&&(
          <div style={{background:'#22c55e0d',border:'1px solid #22c55e33',borderRadius:8,padding:'10px 14px'}}>
            <div style={{color:'#4ade80',fontSize:12,fontWeight:700,marginBottom:3}}>Desconto de 20% da base, máximo R$ 564,62/mês</div>
            <div style={{color:t.muted,fontSize:11}}>
              Base isenta com desconto simplificado: até <strong style={{color:'#4ade80'}}>R$ 2.993,42 brutos/mês</strong>
            </div>
          </div>
        )}
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
                const ativo = result && (
                  i===0 ? result.isento :
                  result.aliq === aliqVal && !result.isento
                );
                return (
                  <tr key={i} style={{background:ativo?'#3b82f618':'transparent',transition:'background .2s'}}>
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
        <div style={{color:t.muted,fontSize:10,marginTop:8}}>
          ✅ <strong style={{color:'#4ade80'}}>Com desconto simplificado</strong> (20%, máx R$ 564,62) → isenção efetiva até <strong style={{color:'#4ade80'}}>R$ 2.993,42/mês</strong>
        </div>
      </div>

      {/* ── Seção 5: Resultado ── */}
      {result && brutoFinal > 0 && (
        <div>
          {result.isento ? (
            <div style={{background:'#22c55e12',border:'2px solid #22c55e55',borderRadius:14,padding:'20px 22px',textAlign:'center'}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{color:'#4ade80',fontWeight:900,fontSize:16,marginBottom:6}}>Não é necessário declarar imposto e gerar DARF</div>
              <div style={{color:'#4a6a4a',fontSize:12,lineHeight:1.6}}>
                Base de cálculo: <strong style={{color:'#4ade80'}}>{brl(result.base)}</strong>
                {' · '}Desconto aplicado: <strong style={{color:'#4ade80'}}>{brl(result.deducao)}</strong>
              </div>
              <div style={{color:'#2a4a2a',fontSize:11,marginTop:6}}>
                Base de {brl(result.base)} está abaixo do limite de isenção de R$ 2.259,20
              </div>
              <div style={{background:'#22c55e0a',border:'1px solid #22c55e33',borderRadius:10,padding:'10px 14px',marginTop:12,textAlign:'left'}}>
                <div style={{color:'#4ade80',fontWeight:700,fontSize:12,marginBottom:4}}>✔ O que fazer mesmo sem DARF:</div>
                <div style={{color:t.muted,fontSize:11,lineHeight:1.8}}>
                  • Registre o rendimento no <strong style={{color:t.text}}>Carnê-Leão Web</strong> (e-CAC da Receita Federal)<br/>
                  • Informe como rendimento do exterior ({nomeEmpresa||'mesa proprietária'} — {paisOrigem})<br/>
                  • O registro é obrigatório mesmo sem imposto a pagar
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
                {[
                  ['Rendimento Bruto', brl(brutoFinal), '#60a5fa'],
                  ['Desconto Aplicado', brl(result.deducao), '#22c55e'],
                  ['Base de Cálculo',   brl(result.base),   '#f59e0b'],
                  ['IR Carnê-Leão',     brl(result.irDevido),'#ef4444'],
                ].map(([lbl,val,cor])=>(
                  <div key={lbl} style={{background:'#0a0a0a',border:`1px solid ${cor}44`,borderRadius:10,padding:'12px',textAlign:'center'}}>
                    <div style={{color:t.muted,fontSize:9,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{lbl}</div>
                    <div style={{color:cor,fontWeight:900,fontSize:15,fontFamily:'monospace'}}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'#ef444410',border:'1px solid #ef444444',borderRadius:10,padding:'12px 14px',marginBottom:12}}>
                <div style={{color:'#f87171',fontSize:11,fontWeight:700,marginBottom:2}}>Cálculo: {brl(result.base)} × {(result.aliq*100).toFixed(1)}% - {brl(result.ded)} = <span style={{fontSize:14}}>{brl(result.irDevido)}</span></div>
                <div style={{color:t.muted,fontSize:10}}>DARF código <strong style={{color:'#60a5fa'}}>0190</strong> — Carnê-Leão · Mês: {mesRef}</div>
              </div>

              {/* Vencimento + Multa/Juros */}
              {vencimento&&(
                <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,padding:'12px 14px',marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div>
                      <div style={{color:t.muted,fontSize:10,fontWeight:700}}>📅 Vencimento DARF 0190</div>
                      <div style={{color:'#f59e0b',fontWeight:900,fontSize:15,marginTop:2}}>{vencimento}</div>
                      <div style={{color:t.muted,fontSize:9}}>Último dia útil do mês seguinte ao de referência</div>
                    </div>
                    <button onClick={calcMultaJuros} disabled={calcMJLoad} style={{background:'#3b82f618',border:'1px solid #3b82f644',borderRadius:8,color:'#60a5fa',padding:'9px 16px',cursor:'pointer',fontSize:12,fontWeight:700}}>
                      {calcMJLoad?'⏳ Calculando...':'⚠️ Calcular Multa/Juros'}
                    </button>
                  </div>
                  {mulJur&&(
                    mulJur.dentro?(
                      <div style={{color:'#4ade80',fontSize:12,fontWeight:700,padding:'6px 10px',background:'#22c55e12',borderRadius:8}}>✅ Dentro do prazo — DARF a pagar: {brl(result.irDevido)}</div>
                    ):(
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:6}}>
                        {[['Dias em Atraso',`${mulJur.dias} dias`,'#f59e0b'],['Multa',`${mulJur.multaPct}%`,'#ef4444'],['Juros',brl(mulJur.juros),'#ef4444'],['Total DARF',brl(mulJur.total),'#f87171']].map(([l,v,c])=>(
                          <div key={l} style={{background:'#1a0505',border:'1px solid #ef444433',borderRadius:8,padding:'8px',textAlign:'center'}}>
                            <div style={{color:t.muted,fontSize:9,textTransform:'uppercase',marginBottom:2}}>{l}</div>
                            <div style={{color:c,fontWeight:900,fontSize:13,fontFamily:'monospace'}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}
              <div style={{color:t.muted,fontSize:10,textAlign:'center'}}>
                Pague via <strong style={{color:'#60a5fa'}}>SICALC</strong>, app <strong style={{color:'#60a5fa'}}>Meu Imposto de Renda</strong> ou internet banking · Código DARF: <strong style={{color:'#f59e0b'}}>0190</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ImpostoRendaTab({t, onFecharMes, relIrDados}) {
  const [operaPor,  setOperaPor]  = React.useState(null); // "proprio" | "mesa"
  const [recebePor, setRecebePor] = React.useState(null); // "pf" | "pj" (só para mesa)
  // tipo = derivado dos dois acima, para compatibilidade com o resto do componente
  const tipo = operaPor === "proprio" ? "pf" : (operaPor === "mesa" && recebePor === "pf") ? "pf" : operaPor === "mesa" && recebePor === "pj" ? "pj" : null;
  const [digitarManual, setDigitarManual] = React.useState(false);
  const [mesAberto, setMesAberto] = React.useState(null);
  const [compensacaoManual, setCompensacaoManual] = React.useState(""); // campo manual editável pelo usuário
  const [mulJurCalc, setMulJurCalc] = React.useState(null);
  const [calculando, setCalculando] = React.useState(false);
  const [form, setForm] = React.useState({
    nomeCompleto:"", cpf:"", mesLucro:"",
    valorImpostoPagar:"", dataPagamento:""
  });
  const [notas, setNotas] = React.useState([{ data:"", valorNegocios:"", totalDespesas:"" }]);

  const set = (k,v) => setForm(prev=>({...prev,[k]:v}));
  const brl = v => `R$ ${(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const cardStyle = {background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"18px 20px",marginBottom:14};
  const inp = {width:"100%",background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"9px 12px",color:t.text,fontSize:13,outline:"none",boxSizing:"border-box"};
  const inpSm = {...inp, padding:"7px 10px", fontSize:12};

  // ── Data de hoje formatada ──
  const hoje = new Date();
  const hojeStr = `${String(hoje.getDate()).padStart(2,"0")}/${String(hoje.getMonth()+1).padStart(2,"0")}/${hoje.getFullYear()}`;
  const hojeISO = hoje.toISOString().slice(0,10);

  // ── Cálculos tabela de notas ──
  const notasCalc = notas.map(n => {
    const vn = parseFloat(n.valorNegocios)||0;
    const td = parseFloat(n.totalDespesas)||0;
    const liq = vn - td;
    const irpf = liq > 0 ? liq * 0.01 : 0;
    return { ...n, liq, irpf };
  });
  const totalBrutoReal = notasCalc.reduce((s, n) => s + n.liq, 0);
  const totalIRPF = notasCalc.reduce((s, n) => s + n.irpf, 0);
  const totalBrutoNeg = totalBrutoReal < 0;
  const totalBrutoPositivo = totalBrutoNeg ? 0 : totalBrutoReal;
  const valorCompensarProx = totalBrutoNeg ? Math.abs(totalBrutoReal) + totalIRPF : 0;

  // ── Compensação automática: soma meses negativos do RelatorioIR que ainda não foram compensados ──
  // Lógica: percorre relIrDados em ordem, acumula negativos e desconta quando há positivo
  const compensacaoAcumulada = React.useMemo(() => {
    if(!relIrDados || relIrDados.length === 0) return 0;
    let acum = 0;
    for(const d of relIrDados) {
      if(d.totalBrutoNeg) {
        // Mês negativo: acumula valor a compensar
        acum += d.valorCompensarProx || 0;
      } else {
        // Mês positivo: usa a compensação disponível e desconta
        const usado = Math.min(acum, d.totalBrutoPositivo || 0);
        acum = Math.max(0, acum - usado);
      }
    }
    return acum;
  }, [relIrDados]);

  // Compensação final = acumulada automática + manual (usuário pode adicionar mais)
  const compensacaoV = compensacaoAcumulada + (parseFloat(compensacaoManual)||0);
  const baseComComp = Math.max(0, totalBrutoPositivo - compensacaoV);
  const valorLiquidoDARF = totalBrutoNeg ? 0 : baseComComp * 0.20;
  const valorTotalDARF = totalBrutoNeg ? 0 : Math.max(0, valorLiquidoDARF - totalIRPF);

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

  const addNota = () => setNotas(prev => [...prev, { data:"", valorNegocios:"", totalDespesas:"" }]);


  const removeNota = (i) => setNotas(prev => prev.filter((_,idx)=>idx!==i));
  const setNota = (i, k, v) => setNotas(prev => prev.map((n,idx)=>idx===i?{...n,[k]:v}:n));

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
      {/* Título */}
      <div style={{textAlign:"center",padding:"24px 0 18px"}}>
        <div style={{fontSize:40,marginBottom:8}}>🧾</div>
        <h1 style={{fontSize:28,fontWeight:900,margin:"0 0 6px",background:"linear-gradient(135deg,#60a5fa,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Imposto de Renda</h1>
        <div style={{color:t.muted,fontSize:13}}>Renda Variável · Day Trade</div>
      </div>

      {/* ── Passo 1: Você opera Por? ── */}
      {!operaPor&&(
        <div style={{...cardStyle,textAlign:"center",border:"1px solid #60a5fa33"}}>
          <div style={{color:t.text,fontWeight:800,fontSize:16,marginBottom:6}}>Você opera Por?</div>
          <div style={{color:t.muted,fontSize:12,marginBottom:20}}>Escolha o tipo de capital que você utiliza para operar</div>
          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>{setOperaPor("proprio");setRecebePor(null);}} style={{padding:"18px 32px",borderRadius:14,cursor:"pointer",fontWeight:800,fontSize:15,border:"2px solid #22c55e",background:"#22c55e15",color:"#22c55e",display:"flex",flexDirection:"column",alignItems:"center",gap:6,minWidth:180}}>
              <span style={{fontSize:26}}>💰</span>
              <span>Capital Próprio</span>
              <span style={{fontSize:11,fontWeight:400,color:"#4a6a4a"}}>Opera com seu próprio dinheiro</span>
            </button>
            <button onClick={()=>setOperaPor("mesa")} style={{padding:"18px 32px",borderRadius:14,cursor:"pointer",fontWeight:800,fontSize:15,border:"2px solid #a855f7",background:"#a855f715",color:"#a855f7",display:"flex",flexDirection:"column",alignItems:"center",gap:6,minWidth:180}}>
              <span style={{fontSize:26}}>🏢</span>
              <span>Mesa Proprietária</span>
              <span style={{fontSize:11,fontWeight:400,color:"#6a4a7a"}}>Opera com capital da mesa</span>
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
          <div style={{textAlign:"center",paddingBottom:8}}>
            <div style={{color:t.text,fontWeight:800,fontSize:16,marginBottom:6}}>Você recebe por?</div>
            <div style={{color:t.muted,fontSize:12,marginBottom:20}}>Como você recebe os lucros da mesa proprietária?</div>
            <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={()=>setRecebePor("pf")} style={{padding:"18px 32px",borderRadius:14,cursor:"pointer",fontWeight:800,fontSize:15,border:"2px solid #3b82f6",background:"#3b82f615",color:"#3b82f6",display:"flex",flexDirection:"column",alignItems:"center",gap:6,minWidth:180}}>
                <span style={{fontSize:26}}>👤</span>
                <span>Pessoa Física</span>
                <span style={{fontSize:11,fontWeight:400,color:"#2a4a6a"}}>CPF — Carnê-Leão + DARF 6015</span>
              </button>
              <button onClick={()=>setRecebePor("pj")} style={{padding:"18px 32px",borderRadius:14,cursor:"pointer",fontWeight:800,fontSize:15,border:"2px solid #f59e0b",background:"#f59e0b15",color:"#f59e0b",display:"flex",flexDirection:"column",alignItems:"center",gap:6,minWidth:180}}>
                <span style={{fontSize:26}}>🏢</span>
                <span>Pessoa Jurídica</span>
                <span style={{fontSize:11,fontWeight:400,color:"#6a4a2a"}}>CNPJ — IRPJ/CSLL</span>
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
            <CarneLeaoCalculadora t={t}/>
          )}

          {/* Bloco DARF (Capital Próprio OU Mesa PF) */}
          {tipo==="pf"&&recebePor!=="pj"&&(
            <>
              {/* ── Bloco Nota de Corretagem ── */}
              <div style={{...cardStyle}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:digitarManual?14:0,flexWrap:"wrap",gap:10}}>
                  <div>
                    <div style={{color:t.text,fontWeight:700,fontSize:14}}>📂 Nota de Corretagem</div>
                    <div style={{color:t.muted,fontSize:11,marginTop:2}}>Registre os valores de cada nota para calcular o IR</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <button style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,color:t.muted,padding:"8px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>📎 Importar (em breve)</button>
                    <button onClick={()=>setDigitarManual(!digitarManual)}
                      style={{background:digitarManual?"#60a5fa22":"linear-gradient(135deg,#1d4ed8,#2563eb)",border:`2px solid ${digitarManual?"#60a5fa":"#3b82f6"}`,borderRadius:10,color:digitarManual?"#60a5fa":"#fff",padding:"10px 20px",cursor:"pointer",fontSize:14,fontWeight:800,boxShadow:digitarManual?"none":"0 4px 14px rgba(59,130,246,0.45)",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
                      ✏️ {digitarManual?"Ocultar formulário ✅":"Digitar Manualmente"}
                    </button>
                    {/* Botão Fechar Lançamento do Mês — aparece assim que tiver nota preenchida */}
                    {digitarManual&&(()=>{
                      const temNotaPreenchida = notasCalc.some(n => (parseFloat(n.valorNegocios)||0) !== 0 || (parseFloat(n.totalDespesas)||0) !== 0);
                      const jafechado = mesAberto&&mesAberto===form.mesLucro;
                      // Verificar se mês já foi enviado ao relatório
                      const mesJaNoRelatorio = relIrDados && relIrDados.some(d => d.mes === form.mesLucro);
                      if(!temNotaPreenchida && !jafechado) return null;
                      return (
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                          <button
                            onClick={()=>{
                              if (mesJaNoRelatorio && !jafechado) {
                                alert(`⚠️ O mês ${nomeMes(form.mesLucro.split("/")[0])} ${form.mesLucro.split("/")[1]||""} já foi lançado no Relatório IR.\n\nPara corrigir, vá à aba "Relatório IR", limpe e relance.`);
                                return;
                              }
                              const novoFechado = jafechado ? null : (form.mesLucro||"");
                              setMesAberto(novoFechado);
                              if(novoFechado && onFecharMes) {
                                onFecharMes({
                                  mes: form.mesLucro,
                                  nomeMesStr: nomeMes(form.mesLucro.split("/")[0]) + " " + (form.mesLucro.split("/")[1]||""),
                                  notas: notasCalc,
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
                                // Resetar form para lançar novo mês sem travar
                                setTimeout(() => {
                                  set("mesLucro","");
                                  set("valorImpostoPagar","");
                                  setNotas([{ data:"", valorNegocios:"", totalDespesas:"" }]);
                                  setMesAberto(null);
                                  setDigitarManual(false);
                                  setMulJurCalc(null);
                                }, 800);
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
                  <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:16,alignItems:"start"}}>

                    {/* COLUNA ESQUERDA */}
                    {(()=>{
                      const mesFechado = relIrDados && relIrDados.some(d => d.mes === form.mesLucro);
                      const bloqueado = mesFechado || mesAberto===form.mesLucro;
                      return (
                    <div style={{opacity: bloqueado ? 0.55 : 1, pointerEvents: bloqueado ? "none":"auto"}}>
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
                      <div style={{color:"#60a5fa",fontSize:11,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>📋 Lançamento das Notas</div>
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
                              <th style={{padding:"8px 10px",color:"#60a5fa",fontWeight:700,fontSize:10,textAlign:"right",borderBottom:`2px solid ${t.border}`}}>Total Líquido</th>
                              <th style={{padding:"8px 10px",color:"#a855f7",fontWeight:700,fontSize:10,textAlign:"right",borderBottom:`2px solid ${t.border}`}}>IRPF (1%)</th>
                              <th style={{padding:"8px 4px",borderBottom:`2px solid ${t.border}`,width:28}}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {notasCalc.map((n, i) => (
                              <tr key={i} style={{background:i%2===0?"transparent":t.bg+"66"}}>
                                <td style={{padding:"5px 6px",borderBottom:`1px solid ${t.border}22`}}>
                                  <input type="date" value={n.data} onChange={e=>setNota(i,"data",e.target.value)} style={{...inpSm,width:118}}/>
                                </td>
                                <td style={{padding:"5px 6px",borderBottom:`1px solid ${t.border}22`}}>
                                  <input type="number" step="0.01" placeholder="0,00" value={n.valorNegocios}
                                    onChange={e=>setNota(i,"valorNegocios",e.target.value)}
                                    style={{...inpSm,textAlign:"right",border:"1px solid #4ade8033"}}/>
                                </td>
                                <td style={{padding:"5px 6px",borderBottom:`1px solid ${t.border}22`}}>
                                  <input type="number" step="0.01" placeholder="0,00" value={n.totalDespesas}
                                    onChange={e=>setNota(i,"totalDespesas",e.target.value)}
                                    style={{...inpSm,textAlign:"right",border:"1px solid #f59e0b33"}}/>
                                </td>
                                <td style={{padding:"5px 10px",textAlign:"right",fontWeight:700,color:corLiq(n.liq),borderBottom:`1px solid ${t.border}22`}}>
                                  {(n.valorNegocios||n.totalDespesas) ? brl(n.liq) : "—"}
                                </td>
                                <td style={{padding:"5px 10px",textAlign:"right",fontWeight:700,color:"#a855f7",borderBottom:`1px solid ${t.border}22`}}>
                                  {(n.valorNegocios||n.totalDespesas) ? (n.irpf>0?brl(n.irpf):<span style={{color:t.muted}}>R$ 0,00</span>) : "—"}
                                </td>
                                <td style={{padding:"5px 4px",borderBottom:`1px solid ${t.border}22`,textAlign:"center"}}>
                                  {notas.length>1&&<button onClick={()=>removeNota(i)} style={{background:"transparent",border:"none",color:"#f87171",cursor:"pointer",fontSize:14,padding:2}}>✕</button>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{background:t.bg,borderTop:`2px solid ${t.border}`}}>
                              <td colSpan={3} style={{padding:"8px 10px",color:t.muted,fontSize:11,fontWeight:700}}>TOTAIS</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontSize:13,color:corLiq(totalBrutoReal)}}>{brl(totalBrutoReal)}</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:800,fontSize:13,color:"#a855f7"}}>{brl(totalIRPF)}</td>
                              <td/>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <button onClick={addNota}
                        style={{marginTop:10,background:"transparent",border:`1px dashed ${t.border}`,borderRadius:8,color:t.muted,padding:"8px 14px",cursor:"pointer",fontSize:12,width:"100%"}}>
                        ➕ Adicionar nota
                      </button>
                    </div>
                      );
                    })()}

                    {/* COLUNA DIREITA */}
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>

                      {/* Resumo */}
                      <div style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:12,overflow:"hidden"}}>
                        <div style={{background:"#1e3a5f",padding:"10px 14px",color:"#93c5fd",fontWeight:800,fontSize:12,letterSpacing:0.5}}>📊 RESUMO DO MÊS</div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <tbody>
                            <tr style={{borderBottom:"1px solid #1e293b"}}>
                              <td style={{padding:"8px 14px",color:"#94a3b8",fontWeight:600}}>Total Bruto</td>
                              <td style={{padding:"8px 14px",textAlign:"right",fontWeight:800,color:corLiq(totalBrutoReal),fontSize:14}}>{brl(totalBrutoReal)}</td>
                            </tr>
                            <tr style={{borderBottom:"1px solid #1e293b"}}>
                              <td style={{padding:"8px 14px",color:"#94a3b8",fontWeight:600}}>IRPF Já Descontado</td>
                              <td style={{padding:"8px 14px",textAlign:"right",fontWeight:800,color:"#a855f7",fontSize:14}}>{brl(totalIRPF)}</td>
                            </tr>
                            {!totalBrutoNeg&&(
                              <tr style={{borderBottom:"1px solid #1e293b"}}>
                                <td style={{padding:"8px 14px",color:"#94a3b8",fontWeight:600}}>Valor Líquido (×20%)</td>
                                <td style={{padding:"8px 14px",textAlign:"right",fontWeight:800,color:"#60a5fa",fontSize:14}}>{brl(totalBrutoPositivo*0.20)}</td>
                              </tr>
                            )}
                            {/* Linha de valor a compensar próximo mês (quando negativo) */}
                            {totalBrutoNeg&&(
                              <tr style={{background:"#ef444415",borderBottom:"1px solid #ef444433"}}>
                                <td style={{padding:"8px 14px",color:"#f87171",fontWeight:700,fontSize:11}}>📤 Valor a Compensar Próx. Mês</td>
                                <td style={{padding:"8px 14px",textAlign:"right",fontWeight:900,color:"#f87171",fontSize:14}}>{brl(valorCompensarProx)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {totalBrutoNeg&&(
                          <div style={{padding:"8px 14px",background:"#ef444410",fontSize:10,color:"#f87171",lineHeight:1.5}}>
                            ⚠️ Resultado negativo: não há DARF a pagar. <br/>
                            Valor de {brl(valorCompensarProx)} (prejuízo + IRPF) poderá ser compensado no próximo mês com lucro.
                          </div>
                        )}
                      </div>

                      {/* Compensação */}
                      <div style={{background:"#0f172a",border:`1px solid ${totalBrutoNeg?"#ef444422":"#ef444433"}`,borderRadius:12,overflow:"hidden",opacity:totalBrutoNeg?0.5:1}}>
                        <div style={{background:"#1f0a0a",padding:"10px 14px",color:"#f87171",fontWeight:800,fontSize:12,letterSpacing:0.5}}>➖ COMPENSAÇÃO</div>
                        <div style={{padding:"12px 14px"}}>
                          {/* Compensação automática dos meses anteriores */}
                          {compensacaoAcumulada > 0 && (
                            <div style={{background:"#ef444415",border:"1px solid #ef444433",borderRadius:8,padding:"8px 12px",marginBottom:10}}>
                              <div style={{color:"#f87171",fontWeight:700,fontSize:11,marginBottom:4}}>📥 Acumulado de meses anteriores (automático)</div>
                              <div style={{color:"#f87171",fontWeight:900,fontSize:16}}>{brl(compensacaoAcumulada)}</div>
                              <div style={{color:"#94a3b8",fontSize:10,marginTop:3}}>
                                {(relIrDados||[]).filter(d=>d.totalBrutoNeg).map(d=>`${d.nomeMesStr}: −${brl(d.valorCompensarProx)}`).join(" · ")}
                              </div>
                            </div>
                          )}
                          <label style={{display:"block",color:"#94a3b8",fontSize:11,marginBottom:6,fontWeight:600}}>
                            {compensacaoAcumulada>0 ? "➕ Compensação adicional manual (R$)" : "Prejuízo a compensar (R$)"}
                          </label>
                          <input type="number" step="0.01" placeholder="0,00" value={compensacao}
                            onChange={e=>setCompensacao(e.target.value)} disabled={totalBrutoNeg}
                            style={{...inpSm,border:"1px solid #ef444455",width:"100%",opacity:totalBrutoNeg?0.5:1}}/>
                          {compensacaoV>0&&!totalBrutoNeg&&(
                            <div style={{marginTop:6,fontSize:11,color:"#94a3b8",lineHeight:1.6}}>
                              Total compensação: {brl(compensacaoV)} → {brl(totalBrutoPositivo)} − {brl(compensacaoV)} = <strong style={{color:"#60a5fa"}}>{brl(baseComComp)}</strong>
                            </div>
                          )}
                        </div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,borderTop:"1px solid #1e293b"}}>
                          <tbody>
                            <tr style={{borderBottom:"1px solid #1e293b"}}>
                              <td style={{padding:"8px 14px",color:"#94a3b8",fontWeight:600}}>Valor Total (após compensação)</td>
                              <td style={{padding:"8px 14px",textAlign:"right",fontWeight:800,color:"#60a5fa"}}>{totalBrutoNeg?"—":brl(baseComComp)}</td>
                            </tr>
                            <tr style={{borderBottom:"1px solid #1e293b"}}>
                              <td style={{padding:"8px 14px",color:"#94a3b8",fontWeight:600}}>Valor Líquido (×20%)</td>
                              <td style={{padding:"8px 14px",textAlign:"right",fontWeight:800,color:"#60a5fa"}}>{totalBrutoNeg?"—":brl(valorLiquidoDARF)}</td>
                            </tr>
                          </tbody>
                        </table>
                        <div style={{padding:"12px 14px",background:"linear-gradient(135deg,#1a3c6b22,#1e1b4b22)",borderTop:"2px solid #60a5fa44"}}>
                          <div style={{color:"#93c5fd",fontSize:11,fontWeight:700,marginBottom:4}}>💳 VALOR TOTAL DARF</div>
                          <div style={{fontSize:10,color:"#475569",marginBottom:8}}>
                            {totalBrutoNeg?"Sem DARF — resultado negativo no mês":`= Valor Líquido − IRPF = ${brl(valorLiquidoDARF)} − ${brl(totalIRPF)}`}
                          </div>
                          <div style={{color:totalBrutoNeg?"#94a3b8":"#fff",fontWeight:900,fontSize:22,textAlign:"center",padding:"10px",background:totalBrutoNeg?"#1e293b":"#1a3c6b",borderRadius:8}}>
                            {totalBrutoNeg?"R$ 0,00 — sem DARF":brl(valorTotalDARF)}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* ── Gerador DARF ── */}
              <div style={{...cardStyle,border:"1px solid #60a5fa44"}}>
                <div style={{color:"#60a5fa",fontWeight:800,fontSize:14,marginBottom:14}}>📋 Gerador de DARF</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
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
              </div>

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
                  <div>📤 <strong style={{color:t.text}}>Mês negativo:</strong> Se o resultado do mês for negativo, não há DARF. O valor (prejuízo + IRPF já pago) pode ser compensado no mês seguinte com lucro</div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
function RelatorioIRTab({t, dados, onLimpar, onDeleteMes, userId}) {
  const { useState: us, useEffect: ue, useCallback: uc } = React;
  const brl = v => `R$ ${(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const cardStyle = {background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"18px 20px",marginBottom:14};
  const [savedRows, setSavedRows] = us([]);
  const [saving, setSaving] = us(false);
  const [loadingSaved, setLoadingSaved] = us(true);
  const [toast2, setToast2] = us(null);

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
  const mesesProcessados = dados.map((d) => {
    const saldoEntrou = saldoComp;
    if(d.totalBrutoNeg) {
      const prejuizo = d.valorCompensarProx || Math.abs(d.totalBrutoReal) + (d.totalIRPF||0);
      saldoComp += prejuizo;
      return {...d, saldoEntrou, compUsada:0, saldoRestante:saldoComp, base:0, ir20:0, darf:0, prejuizoGerado:prejuizo};
    } else {
      const bruto = d.totalBrutoReal || 0;
      const irpf  = d.totalIRPF || 0;
      const compUsada = Math.min(saldoComp, bruto);
      const base  = Math.max(0, bruto - compUsada);
      const ir20  = base * 0.20;
      const darf  = Math.max(0, ir20 - irpf);
      saldoComp   = Math.max(0, saldoComp - compUsada);
      return {...d, saldoEntrou, compUsada, saldoRestante:saldoComp, base, ir20, darf, prejuizoGerado:0};
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
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
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

          {/* Tabela */}
          <div style={{...cardStyle}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:t.bg}}>
                    {["Mês","Fechado em","Bruto Mês","IRPF (1%)","Comp. Usada","Base Calc.","IR 20%","DARF","Saldo Restante","Status",""].map((h,hi)=>(
                      <th key={h} style={{padding:"8px 10px",color:t.muted,fontWeight:700,fontSize:10,textAlign:hi===0?"left":"right",borderBottom:`2px solid ${t.border}`,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mesesProcessados.map((m,i)=>(
                    <tr key={i} style={{background:i%2===0?"transparent":t.bg+"55",borderBottom:`1px solid ${t.border}22`}}>
                      <td style={{padding:"10px",fontWeight:700,color:t.accent,whiteSpace:"nowrap"}}>📅 {m.nomeMesStr}</td>
                      <td style={{padding:"10px",textAlign:"right",color:t.muted,fontSize:11}}>{m.dataFechamento}</td>
                      <td style={{padding:"10px",textAlign:"right",fontWeight:700,color:m.totalBrutoReal>=0?"#4ade80":"#f87171"}}>{brl(m.totalBrutoReal)}</td>
                      <td style={{padding:"10px",textAlign:"right",color:"#a855f7",fontWeight:600}}>{brl(m.totalIRPF)}</td>
                      <td style={{padding:"10px",textAlign:"right",color:m.compUsada>0?"#f59e0b":"#475569",fontWeight:m.compUsada>0?700:400}}>{m.compUsada>0?brl(m.compUsada):"—"}</td>
                      <td style={{padding:"10px",textAlign:"right",color:"#60a5fa"}}>{m.totalBrutoNeg?"—":brl(m.base)}</td>
                      <td style={{padding:"10px",textAlign:"right",color:"#93c5fd"}}>{m.totalBrutoNeg?"—":brl(m.ir20)}</td>
                      <td style={{padding:"10px",textAlign:"right",fontWeight:900}}>
                        <span style={{background:m.darf>0?"#1e3a5f":"#1e293b",padding:"3px 9px",borderRadius:5,border:`1px solid ${m.darf>0?"#60a5fa55":"#33445555"}`,color:m.darf>0?"#93c5fd":"#475569"}}>{brl(m.darf)}</span>
                      </td>
                      <td style={{padding:"10px",textAlign:"right",color:m.saldoRestante>0?"#fbbf24":"#4ade80",fontWeight:600}}>{m.saldoRestante>0?brl(m.saldoRestante):"—"}</td>
                      <td style={{padding:"10px",textAlign:"center"}}>
                        {m.totalBrutoNeg?<span style={{background:"#f59e0b12",border:"1px solid #f59e0b44",borderRadius:999,padding:"2px 8px",color:"#f59e0b",fontSize:10,fontWeight:700}}>📤 Prejuízo</span>:m.darf>0?<span style={{background:"#ef444412",border:"1px solid #ef444433",borderRadius:999,padding:"2px 8px",color:"#f87171",fontSize:10,fontWeight:700}}>💳 Recolher</span>:<span style={{background:"#22c55e12",border:"1px solid #22c55e33",borderRadius:999,padding:"2px 8px",color:"#4ade80",fontSize:10,fontWeight:700}}>✅ Sem DARF</span>}
                      </td>
                      <td style={{padding:"10px",textAlign:"center"}}>
                        <button onClick={()=>handleDeleteAtual(m.mes)} title="Excluir mês" style={{background:"#ef444415",border:"1px solid #ef444433",borderRadius:6,color:"#f87171",padding:"3px 8px",cursor:"pointer",fontSize:12,fontWeight:700}}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:t.bg,borderTop:`2px solid ${t.border}`}}>
                    <td colSpan={2} style={{padding:"10px",color:t.muted,fontWeight:700,fontSize:11}}>TOTAIS</td>
                    <td style={{padding:"10px",textAlign:"right",fontWeight:900,color:totalBruto>=0?"#4ade80":"#f87171"}}>{brl(totalBruto)}</td>
                    <td style={{padding:"10px",textAlign:"right",fontWeight:900,color:"#a855f7"}}>{brl(totalIRPFTotal)}</td>
                    <td colSpan={4}/>
                    <td style={{padding:"10px",textAlign:"right",fontWeight:900,fontSize:13,color:"#60a5fa"}}>{brl(totalDARF)}</td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>
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
  const [relIrDados,setRelIrDados]=useState([]);
  const [modal,setModal]=useState(null);
  const [editOp,setEditOp]=useState(null);
  const [darkMode,setDarkMode]=useState(true);
  const [showRelatorio,setShowRelatorio]=useState(false);
  const [toast,setToast]=useState(null);
  const [gerenciamentos,setGerenciamentos]=useState([]);

  // ── Macro data via Yahoo Finance direto no browser ──
  const [tvData, setTvData] = useState(null);
  useEffect(() => {
    const yfQuote = async (symbol) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
        const r = await fetch(url);
        const data = await r.json();
        const meta = data.chart.result[0].meta;
        const price = parseFloat(meta.regularMarketPrice);
        const prev  = parseFloat(meta.chartPreviousClose || meta.previousClose || price);
        const variacao = price - prev;
        const percent  = prev ? (variacao / prev * 100) : 0;
        return { preco: +price.toFixed(2), variacao: +variacao.toFixed(2), percent: +percent.toFixed(2) };
      } catch(_) { return null; }
    };
    const carregarMacro = async () => {
      const [minerio, petroleo, vix, sp500] = await Promise.all([
        yfQuote("TIO=F").then(r => r || yfQuote("IO=F")),
        yfQuote("CL=F"),
        yfQuote("^VIX"),
        yfQuote("^GSPC"),
      ]);
      setTvData({ minerio, petroleo, vix, sp500 });
    };
    carregarMacro();
    const iv = setInterval(carregarMacro, 60000);
    return () => clearInterval(iv);
  }, []);

  // ── Acesso / Trial ──
  // Regra: toda conta nova recebe 15 dias de trial automático a partir da data de criação
  const [plano, setPlano] = useState(null);
  const [acessoAtivo, setAcessoAtivo] = useState(true);
  const [diasRestantes, setDiasRestantes] = useState(0);

  useEffect(()=>{
    const verificarAcesso = async () => {
      const userCriadoEm = new Date(user.created_at || user.email_confirmed_at || Date.now());
      const {data} = await supabase.from("planos").select("*").eq("email", user.email).maybeSingle();

      if (data) {
        // Já tem registro — verificar expiração
        const expira = data.data_expiracao ? new Date(data.data_expiracao) : null;
        const ativo = data.status === "pago" || (expira && expira > new Date());
        const dias = expira ? Math.max(0, Math.ceil((expira - new Date()) / 86400000)) : 0;
        setPlano(data);
        setAcessoAtivo(ativo);
        setDiasRestantes(dias);
      } else {
        // Sem registro → trial de 15 dias automático para qualquer conta nova
        const expira = new Date(userCriadoEm.getTime() + 15 * 86400000);
        const ativo = expira > new Date();
        const dias = Math.max(0, Math.ceil((expira - new Date()) / 86400000));
        await supabase.from("planos").upsert({
          email: user.email,
          status: "trial",
          data_inicio: userCriadoEm.toISOString(),
          data_expiracao: expira.toISOString(),
        }, {onConflict:"email"});
        setPlano({status:"trial", data_expiracao: expira.toISOString()});
        setAcessoAtivo(ativo);
        setDiasRestantes(dias);
      }
    };
    verificarAcesso();
  // eslint-disable-next-line
  },[user.email]);

  const t=darkMode?DARK:LIGHT;
  const showToast=useCallback((msg,type="success")=>setToast({msg,type}),[]);

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

  const handleSaveGerenciamento=async(form)=>{
    // Campos garantidos na tabela original + extras serializados em JSON no campo "regras"
    // Campos extras que podem não existir ainda na tabela são salvos em campo "regras" como JSON
    const extraData = {
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
      user_id: user.id,
      created_at: new Date().toISOString(),
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
    const {data,error}=await supabase.from("gerenciamentos").insert([row]).select().single();
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
  const planoCarregando = plano === null;
  const bloqueado = !planoCarregando && !acessoAtivo;

  // Componente da tela bloqueada inline
  const telaBloqueada = (
    <div style={{minHeight:"100vh",background:"#000",fontFamily:"'Segoe UI',sans-serif",color:"#fff"}}>
      {/* Header minimalista */}
      <div style={{background:"#050505",borderBottom:"1px solid #1a1a1a",padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:20,fontWeight:900,background:"linear-gradient(135deg,#c9a227,#ffd700)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TradeVision PRO</div>
        <button onClick={onLogout} style={{background:"transparent",border:"1px solid #333",borderRadius:8,color:"#666",padding:"6px 14px",cursor:"pointer",fontSize:12}}>Sair</button>
      </div>

      {/* Aviso central */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px 20px"}}>
        <div style={{maxWidth:480,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:56,marginBottom:16}}>⏱️</div>
          <div style={{fontSize:26,fontWeight:900,marginBottom:12,color:"#ffd700"}}>Seu período de teste encerrou</div>
          <div style={{color:"#aaa",fontSize:15,lineHeight:1.8,marginBottom:8}}>
            Você testou o <strong style={{color:"#fff"}}>TradeVision PRO</strong> gratuitamente por <strong style={{color:"#ffd700"}}>15 dias</strong>.
          </div>
          <div style={{color:"#888",fontSize:13,lineHeight:1.7,marginBottom:28}}>
            Para continuar com acesso ao diário de operações, gerador de DARF,<br/>
            relatório IR, gestão de risco e análise por IA, entre em contato.
          </div>

          {/* Botão WhatsApp principal */}
          <a
            href={"https://wa.me/5548999642910?text=Olá!%20Gostaria%20de%20adquirir%20a%20versão%20PRO%20do%20TradeVision.%20Meu%20email%3A%20"+encodeURIComponent(user.email)}
            target="_blank" rel="noreferrer"
            style={{display:"inline-flex",alignItems:"center",gap:10,background:"#25D366",color:"#fff",fontWeight:700,fontSize:15,padding:"14px 30px",borderRadius:12,textDecoration:"none",marginBottom:20,boxShadow:"0 4px 20px #25D36644"}}>
            📱 Falar no WhatsApp — (48) 99964-2910
          </a>

          {/* Planos */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
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
    <div style={{minHeight:"100vh",background:t.bg,fontFamily:"'Inter','Segoe UI',system-ui,-apple-system,sans-serif",color:t.text,letterSpacing:"0.01em"}}>
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
        <div style={{padding:"0 40px",position:"relative",zIndex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,padding:"14px 0 10px"}}>

            {/* ── LOGO ZK + NOME ── */}
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              {/* Logo ZK estilo bolsa — candlesticks + letra */}
              <div style={{position:"relative",width:54,height:54}}>
                <div style={{
                  width:54,height:54,borderRadius:14,
                  background:"linear-gradient(135deg,#0d1117 0%,#0a1628 100%)",
                  border:"2px solid #c9a227",
                  boxShadow:"0 0 18px #c9a22744, inset 0 0 12px #c9a22711",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  position:"relative",overflow:"hidden",
                }}>
                  {/* Candlesticks decorativos atrás */}
                  <svg width="54" height="54" style={{position:"absolute",top:0,left:0,opacity:0.5}}>
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
                    fontSize:22,fontWeight:900,
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
                  fontSize:34, fontWeight:900, margin:0,
                  letterSpacing:"-0.5px", lineHeight:1.05,
                  fontFamily:"Georgia,'Times New Roman',serif",
                  color:"#c9a227",
                  background:"linear-gradient(90deg,#b8860b 0%,#ffd700 25%,#fffde7 50%,#ffd700 75%,#b8860b 100%)",
                  WebkitBackgroundClip:"text",
                  WebkitTextFillColor:"transparent",
                  paintOrder:"stroke fill",
                  filter:"drop-shadow(0 0 12px #c9a22766)",
                }}>TradeVision</h1>
                <div style={{color:"#666",fontSize:11,marginTop:3,letterSpacing:"2px",fontWeight:600,textTransform:"uppercase",display:"flex",alignItems:"center",gap:5}}>
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
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              {[["📅 Semana",semanaReais],["🗓️ Mês",mesReais],["💰 Total",totalReais]].map(([l,v])=>(
                <div key={l} style={{background:"#0a0a0a",border:`1px solid ${v>=0?"#00ff8822":"#ff4d4d22"}`,borderRadius:8,padding:"6px 14px",textAlign:"right",minWidth:88}}>
                  <div style={{color:"#555",fontSize:10,fontWeight:600,letterSpacing:"0.5px",marginBottom:1}}>{l}</div>
                  <div style={{color:v>=0?"#00ff88":"#ff4d4d",fontWeight:800,fontSize:14}}>{v>=0?"+":""}{v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                </div>
              ))}
              {temDolar&&(
                <div style={{background:"#0a0a0a",border:"1px solid #c9a22722",borderRadius:8,padding:"6px 14px",textAlign:"right",minWidth:88}}>
                  <div style={{color:"#555",fontSize:10,fontWeight:600,marginBottom:1}}>💵 USD</div>
                  <div style={{color:"#c9a227",fontWeight:800,fontSize:14}}>{totalDolar>=0?"+":""}{totalDolar.toLocaleString("en-US",{style:"currency",currency:"USD"})}</div>
                </div>
              )}
              <div style={{width:1,height:34,background:"#1a1a1a"}}/>

              {/* Botão IA — Gerador de Análise */}
              <button onClick={()=>setShowRelatorio(true)} style={{
                background:"linear-gradient(135deg,#1a0a2e,#2d1b69)",
                border:"1px solid #7c3aed88",
                borderRadius:10,color:"#c4b5fd",
                padding:"9px 14px",cursor:"pointer",
                fontSize:11,fontWeight:700,
                boxShadow:"0 2px 16px #7c3aed44",
                letterSpacing:"0.3px",
                display:"flex",alignItems:"center",gap:7,
                whiteSpace:"nowrap",
              }}>
                <span style={{fontSize:16}}>🤖</span>
                <span style={{display:"flex",flexDirection:"column",lineHeight:1.1,textAlign:"left"}}>
                  <span style={{fontSize:9,color:"#9d86e9",fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase"}}>Gerador de</span>
                  <span style={{fontSize:11,color:"#ddd6fe",fontWeight:800}}>Análise Operacional</span>
                </span>
              </button>

              <button onClick={()=>setDarkMode(d=>!d)} style={{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:8,color:"#555",padding:"9px 12px",cursor:"pointer",fontSize:16}}>{darkMode?"☀️":"🌙"}</button>
              <button onClick={onLogout} style={{background:"transparent",border:"1px solid #1a1a1a",borderRadius:8,color:"#444",padding:"9px 13px",cursor:"pointer",fontSize:12,fontWeight:500}}>Sair</button>

              {/* Botão Nova Operação */}
              <button onClick={()=>{setEditOp(null);setModal("add");}} style={{
                background:"linear-gradient(135deg,#001a33,#002855)",
                border:"1px solid #00d4ff66",
                borderRadius:10,color:"#7dd3fc",
                padding:"10px 18px",cursor:"pointer",
                fontSize:12,fontWeight:700,
                boxShadow:"0 4px 16px rgba(0,212,255,0.2)",
                whiteSpace:"nowrap",letterSpacing:"0.3px",
                display:"flex",alignItems:"center",gap:7,
              }}>
                <span style={{fontSize:16,color:"#00d4ff"}}>＋</span>
                <span style={{display:"flex",flexDirection:"column",lineHeight:1.1,textAlign:"left"}}>
                  <span style={{fontSize:9,color:"#38bdf8",fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase"}}>Registrar</span>
                  <span style={{fontSize:12,color:"#e0f2fe",fontWeight:800}}>Nova Operação</span>
                </span>
              </button>

              {/* Botão Gestão de Risco */}
              <button onClick={()=>setModal("gerenciamento")} style={{
                background:"linear-gradient(135deg,#001a0d,#002818)",
                border:"1px solid #00ff8866",
                borderRadius:10,color:"#6ee7b7",
                padding:"10px 16px",cursor:"pointer",
                fontSize:12,fontWeight:700,
                boxShadow:"0 4px 16px rgba(0,255,136,0.15)",
                whiteSpace:"nowrap",
                display:"flex",alignItems:"center",gap:7,
              }}>
                <span style={{fontSize:16,color:"#00ff88"}}>🛡️</span>
                <span style={{display:"flex",flexDirection:"column",lineHeight:1.1,textAlign:"left"}}>
                  <span style={{fontSize:9,color:"#34d399",fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase"}}>Gestão de</span>
                  <span style={{fontSize:12,color:"#d1fae5",fontWeight:800}}>Risco</span>
                </span>
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
            ].map(tb=>(
              <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
                padding:"7px 14px",
                border: tab===tb.id ? `2px solid ${tb.activeColor}` : "1.5px solid #555",
                borderRadius:8,
                background: tab===tb.id ? tb.activeColor+"22" : "#ffffff",
                color: tab===tb.id ? tb.activeColor : "#111111",
                fontWeight: tab===tb.id ? 700 : 500,
                fontSize: 13,
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
      <div style={{margin:"0 auto",padding:"28px 40px",fontSize:15}}>
        {loadingOps?(
          <div style={{textAlign:"center",padding:60,color:t.muted,fontSize:15}}>⏳ Carregando operações...</div>
        ):(
          <>
            {tab==="home"&&<HomeTab ops={ops} t={t} tvData={tvData}/>}
            {tab==="journal"&&<JournalTab ops={ops} onEdit={handleEdit} onDelete={handleDelete} t={t}/>}
            {tab==="analytics"&&<AnalyticsTab ops={ops} t={t}/>}
            {tab==="risco"&&<GestaoRiscoTab gerenciamentos={gerenciamentos} onSave={handleSaveGerenciamento} onDelete={handleDeleteGerenciamento} onToggleAtivo={handleToggleAtivo} t={t}/>}
            {tab==="ir"&&<ImpostoRendaTab t={t} relIrDados={relIrDados} onFecharMes={(dados)=>{setRelIrDados(prev=>[...prev,dados]);setTab("relir");}}/>}
            {tab==="relir"&&<RelatorioIRTab t={t} dados={relIrDados} userId={user.id} onLimpar={()=>setRelIrDados([])} onDeleteMes={(mes)=>setRelIrDados(prev=>prev.filter(d=>d.mes!==mes))}/>}
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
      {showRelatorio&&<RelatorioModal ops={ops} t={t} onClose={()=>setShowRelatorio(false)}/>}
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
    </>
  );
}