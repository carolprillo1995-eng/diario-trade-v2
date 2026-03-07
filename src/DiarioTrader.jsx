import React, { useState, useMemo, useEffect, useCallback } from "react";
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
    horaEntrada:row.hora_entrada||"",
    quantidadeContratos:row.quantidade_contratos!=null?String(row.quantidade_contratos):"",
    precoCompra:row.preco_compra!=null?String(row.preco_compra):"",
    precoVenda:row.preco_venda!=null?String(row.preco_venda):"",
    stopPontos:row.stop_pontos!=null?String(row.stop_pontos):"",
    parcialContratos:row.parcial_contratos!=null?String(row.parcial_contratos):"",
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
  // Novos campos
  horaEntrada:"", quantidadeContratos:"", precoCompra:"", precoVenda:"",
  stopPontos:"",
  parcialContratos:"",
  saidaFinalTipo:"", saidaFinalContratos:"", saidaFinalPontos:"",
  saidaFinalStopTipo:"inicial", saidaFinalStopCustom:"",
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
  const [f,setF]=useState(()=>initial?{...EMPTY_FORM,...initial,medias:initial.medias||[],impedimentos:initial.impedimentos||[],errosOperacao:initial.errosOperacao||[]}:{...EMPTY_FORM});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const toggleErro=(v)=>setF(p=>({...p,errosOperacao:p.errosOperacao.includes(v)?p.errosOperacao.filter(x=>x!==v):[...p.errosOperacao,v]}));
  const valid=f.data&&f.ativo&&f.direcao&&f.resultadoPontos!=="";
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
      <Section icon="📦" title="Quantidade de Contratos" t={t} accent="#f59e0b">
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:120}}>
            <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>Nº de Contratos</label>
            <input type="number" min="1" placeholder="ex: 2" value={f.quantidadeContratos} onChange={e=>set("quantidadeContratos",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box"}}/>
          </div>
          {isFuturosBR(f.ativo)&&(
            <>
              <div style={{flex:1,minWidth:120}}>
                <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>💚 Preço de Compra</label>
                <input type="number" step="0.5" placeholder="ex: 135450" value={f.precoCompra} onChange={e=>set("precoCompra",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box",border:"1px solid #22c55e55"}}/>
              </div>
              <div style={{flex:1,minWidth:120}}>
                <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>🔴 Preço de Venda</label>
                <input type="number" step="0.5" placeholder="ex: 135500" value={f.precoVenda} onChange={e=>set("precoVenda",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box",border:"1px solid #ef444455"}}/>
              </div>
            </>
          )}
        </div>
      </Section>
      {isFuturosBR(f.ativo)&&(
        <Section icon="🛑" title="Stop da Operação" t={t} accent="#ef4444">
          {(()=>{
            const cts=parseFloat(f.quantidadeContratos)||1;
            const pts=parseFloat(f.stopPontos)||0;
            const isWDO=f.ativo==="WDOFUT";
            const vlrPorPonto=isWDO?10:0.20;
            const vlrStop=pts*vlrPorPonto*cts;
            return (
              <div>
                <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:130}}>
                    <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>Pontos de Stop</label>
                    <input type="number" step={isWDO?0.5:1} placeholder={isWDO?"ex: 50":"ex: 300"} value={f.stopPontos} onChange={e=>set("stopPontos",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box",border:"1px solid #ef444455"}}/>
                  </div>
                  {pts>0&&(
                    <div style={{background:"#ef444410",border:"1px solid #ef444433",borderRadius:10,padding:"10px 14px",flex:1,minWidth:180}}>
                      <div style={{color:"#f87171",fontSize:10,fontWeight:700,marginBottom:4}}>💸 RISCO CALCULADO</div>
                      <div style={{color:"#ef4444",fontWeight:800,fontSize:16}}>-R$ {vlrStop.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                      <div style={{color:t.muted,fontSize:10,marginTop:2}}>{pts} pts × R${vlrPorPonto.toFixed(2)}/pt × {cts} contrato{cts>1?"s":""}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </Section>
      )}
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
        <SimNao value={f.fezParcial} onChange={v=>{set("fezParcial",v);if(!v){set("parcialRR","");set("parcialRRCustom","");set("parcialMotivoMenos","");set("parcialContratos","");}}} t={t}/>
        {f.fezParcial===true&&(
          <div style={{marginTop:14,background:t.bg,border:"1px solid #a855f733",borderRadius:10,padding:"14px 16px"}}>
            <div style={{color:"#c084fc",fontWeight:700,fontSize:12,marginBottom:10}}>📊 RISCO RETORNO DA PARCIAL</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              {PARCIAL_RR_OPCOES.map(rr=>{
                const isSelected=f.parcialRR===rr; const col=rr==="Menos que 1x1"?"#f87171":"#a855f7";
                return <button key={rr} onClick={()=>{set("parcialRR",isSelected?"":rr);if(rr!=="Menos que 1x1")set("parcialMotivoMenos","");}}
                  style={{padding:"9px 14px",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12,
                    border:`2px solid ${isSelected?col:t.border}`,background:isSelected?col+"22":"transparent",
                    color:isSelected?col:t.muted,transition:"all .15s"}}
                >{rr==="Menos que 1x1"?"⚠️ Menos 1x1":rr==="1x1"?"🎯 1x1":rr==="2x1"?"🚀 2x1":"➕ Mais"}</button>;
              })}
            </div>
            {f.parcialRR==="Mais"&&<input type="text" placeholder="Ex: 3x1, 4x1..." value={f.parcialRRCustom} onChange={e=>set("parcialRRCustom",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box",marginBottom:10,border:"1px solid #a855f755"}}/>}
            {isFuturosBR(f.ativo)&&f.parcialRR&&(()=>{
              const cts=parseFloat(f.parcialContratos)||0;
              const stopPts=parseFloat(f.stopPontos)||0;
              const isWDO=f.ativo==="WDOFUT";
              const vlrPorPonto=isWDO?10:0.20;
              // Para "Menos 1x1": usar pontos reais digitados pelo usuário
              const isMenos=f.parcialRR==="Menos que 1x1";
              let pontosParcial=0;
              if(isMenos){
                pontosParcial=parseFloat(f.parcialPontosMenos)||0;
              } else {
                let multRR=1;
                if(f.parcialRR==="2x1") multRR=2;
                else if(f.parcialRR==="Mais"&&f.parcialRRCustom) multRR=parseFloat(f.parcialRRCustom.replace(/[^0-9.]/g,""))||1;
                pontosParcial=stopPts*multRR;
              }
              const vlrParcial=pontosParcial*vlrPorPonto*cts;
              return (
                <div style={{marginBottom:12}}>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
                    <div>
                      <label style={{display:"block",color:"#c084fc",fontSize:12,marginBottom:6,fontWeight:600}}>Contratos na Parcial</label>
                      <input type="number" min="1" placeholder="ex: 1" value={f.parcialContratos} onChange={e=>set("parcialContratos",e.target.value)} style={{...inp,width:100,border:"1px solid #a855f755"}}/>
                    </div>
                    {isMenos&&(
                      <div>
                        <label style={{display:"block",color:"#f87171",fontSize:12,marginBottom:6,fontWeight:600}}>Pontos realizados</label>
                        <input type="number" step={isWDO?0.5:1} min="0" placeholder={`ex: ${Math.round((stopPts||10)*0.4)}`}
                          value={f.parcialPontosMenos||""}
                          onChange={e=>set("parcialPontosMenos",e.target.value)}
                          style={{...inp,width:120,border:"1px solid #f8717155"}}/>
                      </div>
                    )}
                    {cts>0&&pontosParcial>0&&(
                      <div style={{background:"#a855f710",border:"1px solid #a855f733",borderRadius:10,padding:"10px 14px",flex:1,minWidth:160}}>
                        <div style={{color:"#c084fc",fontSize:10,fontWeight:700,marginBottom:2}}>✂️ RESULTADO PARCIAL</div>
                        <div style={{color:"#4ade80",fontWeight:800,fontSize:16}}>+R$ {vlrParcial.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                        <div style={{color:t.muted,fontSize:10}}>{pontosParcial} pts × R${vlrPorPonto}/pt × {cts} ct{cts>1?"s":""}{!isMenos&&` (${f.parcialRR==="Mais"?f.parcialRRCustom:f.parcialRR} — stop ${stopPts}pts)`}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            {f.parcialRR==="Menos que 1x1"&&(
              <div style={{marginTop:4,background:"#ef444410",border:"1px solid #ef444444",borderRadius:8,padding:"12px 14px"}}>
                <div style={{color:"#f87171",fontSize:11,fontWeight:700,marginBottom:8}}>⚠️ Por que saiu parcial abaixo de 1x1?</div>
                <textarea placeholder="Descreva o motivo..." value={f.parcialMotivoMenos} onChange={e=>set("parcialMotivoMenos",e.target.value)} rows={2}
                  style={{...inp,width:"100%",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box",border:"1px solid #ef444455",background:"#ef444408"}}/>
              </div>
            )}
          </div>
        )}
      </Section>
      <Section icon="🚪" title="Saída Final — Resultado" t={t} accent="#f59e0b">
        {isFuturosBR(f.ativo)&&(
          <div style={{marginBottom:14}}>
            <div style={{color:"#f59e0b",fontWeight:700,fontSize:12,marginBottom:10}}>🎯 TIPO DE SAÍDA FINAL</div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {[["alvo","🎯 Alvo","#22c55e"],["zero","⚪ Zero","#94a3b8"],["stop","🛑 Stop","#ef4444"]].map(([val,label,cor])=>(
                <button key={val} onClick={()=>set("saidaFinalTipo",f.saidaFinalTipo===val?"":val)}
                  style={{flex:1,padding:"12px 0",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14,
                    border:`2px solid ${f.saidaFinalTipo===val?cor:t.border}`,
                    background:f.saidaFinalTipo===val?cor+"22":"transparent",
                    color:f.saidaFinalTipo===val?cor:t.muted,transition:"all .15s"}}
                >{label}</button>
              ))}
            </div>
            {f.saidaFinalTipo&&(()=>{
              const cts=parseFloat(f.saidaFinalContratos)||0;
              const pts=parseFloat(f.saidaFinalPontos)||0;
              const stopPts=parseFloat(f.stopPontos)||0;
              const isWDO=f.ativo==="WDOFUT";
              const vlrPorPonto=isWDO?10:0.20;
              // Stop efetivo: stop inicial ou custom
              const stopEfetivo=(f.saidaFinalStopTipo||"inicial")==="outro"&&f.saidaFinalStopCustom
                ?parseFloat(f.saidaFinalStopCustom)||stopPts
                :stopPts;
              const vlrSaida=f.saidaFinalTipo==="zero"?0:f.saidaFinalTipo==="stop"?-(stopEfetivo*vlrPorPonto*cts):pts*vlrPorPonto*cts;
              const corSaida=f.saidaFinalTipo==="stop"?"#ef4444":f.saidaFinalTipo==="zero"?"#94a3b8":"#22c55e";
              // Calcular valor da parcial (se fez)
              let vlrParcial=0;
              if(f.fezParcial===true&&f.parcialRR&&f.parcialContratos){
                const ctsParc=parseFloat(f.parcialContratos)||0;
                const isMenos=f.parcialRR==="Menos que 1x1";
                let pontosParcial=0;
                if(isMenos){
                  pontosParcial=parseFloat(f.parcialPontosMenos)||0;
                } else {
                  let multRR=1;
                  if(f.parcialRR==="2x1") multRR=2;
                  else if(f.parcialRR==="Mais"&&f.parcialRRCustom) multRR=parseFloat(f.parcialRRCustom.replace(/[^0-9.]/g,""))||1;
                  pontosParcial=stopPts*multRR;
                }
                vlrParcial=pontosParcial*vlrPorPonto*ctsParc;
              }
              const vlrTotal=vlrParcial+vlrSaida;
              const temParcial=f.fezParcial===true&&vlrParcial>0;
              const corTotal=vlrTotal>0?"#22c55e":vlrTotal<0?"#ef4444":"#94a3b8";
              return (
                <div style={{background:t.bg,border:`1px solid ${corSaida}33`,borderRadius:10,padding:"14px 16px"}}>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:cts>0?12:0}}>
                    <div style={{flex:1,minWidth:100}}>
                      <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>Contratos na saída</label>
                      <input type="number" min="1" placeholder="ex: 1" value={f.saidaFinalContratos} onChange={e=>set("saidaFinalContratos",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box",border:`1px solid ${corSaida}55`}}/>
                    </div>
                    {f.saidaFinalTipo==="alvo"&&(
                      <div style={{flex:1,minWidth:120}}>
                        <label style={{display:"block",color:t.muted,fontSize:12,marginBottom:6,fontWeight:600}}>Pontos do alvo</label>
                        <input type="number" step={isWDO?0.5:1} placeholder="ex: 500" value={f.saidaFinalPontos} onChange={e=>set("saidaFinalPontos",e.target.value)} style={{...inp,width:"100%",boxSizing:"border-box",border:"1px solid #22c55e55"}}/>
                      </div>
                    )}
                    {f.saidaFinalTipo==="stop"&&(
                      <div style={{flex:1,minWidth:180}}>
                        <label style={{display:"block",color:"#f87171",fontSize:12,marginBottom:6,fontWeight:600}}>Tipo de Stop</label>
                        <div style={{display:"flex",gap:6,marginBottom:8}}>
                          {[["inicial","🔒 Stop Inicial"],["outro","✏️ Outro valor"]].map(([v,l])=>(
                            <button key={v} onClick={()=>set("saidaFinalStopTipo",f.saidaFinalStopTipo===v?"inicial":v)}
                              style={{flex:1,padding:"8px 6px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:11,
                                border:`2px solid ${(f.saidaFinalStopTipo||"inicial")===v?"#ef4444":t.border}`,
                                background:(f.saidaFinalStopTipo||"inicial")===v?"#ef444422":"transparent",
                                color:(f.saidaFinalStopTipo||"inicial")===v?"#ef4444":t.muted,transition:"all .15s"}}
                            >{l}</button>
                          ))}
                        </div>
                        {(f.saidaFinalStopTipo||"inicial")==="inicial"&&stopPts>0&&(
                          <div style={{background:"#ef444410",border:"1px solid #ef444433",borderRadius:8,padding:"8px 12px"}}>
                            <div style={{color:"#f87171",fontSize:10,fontWeight:700}}>Stop original</div>
                            <div style={{color:"#ef4444",fontWeight:800,fontSize:14}}>{stopPts} pts = R${(stopPts*vlrPorPonto).toFixed(2)}/ct</div>
                          </div>
                        )}
                        {(f.saidaFinalStopTipo||"inicial")==="outro"&&(
                          <div>
                            <input type="number" step={isWDO?0.5:1} min="0" placeholder={`Novo stop (era ${stopPts||"?"} pts)`}
                              value={f.saidaFinalStopCustom||""}
                              onChange={e=>set("saidaFinalStopCustom",e.target.value)}
                              style={{...inp,width:"100%",boxSizing:"border-box",border:"1px solid #ef444455"}}/>
                            {f.saidaFinalStopCustom&&(
                              <div style={{background:"#f59e0b10",border:"1px solid #f59e0b33",borderRadius:6,padding:"5px 10px",marginTop:4,fontSize:10,color:"#f59e0b",fontWeight:600}}>
                                Novo stop: {f.saidaFinalStopCustom} pts = R${(parseFloat(f.saidaFinalStopCustom)*vlrPorPonto).toFixed(2)}/ct
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {cts>0&&(f.saidaFinalTipo==="zero"||(f.saidaFinalTipo==="alvo"&&pts>0)||(f.saidaFinalTipo==="stop"&&stopEfetivo>0))&&(
                    <>
                      <div style={{background:corSaida+"10",border:`1px solid ${corSaida}33`,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:temParcial?8:0}}>
                        <div>
                          <div style={{color:t.muted,fontSize:10,fontWeight:700}}>RESULTADO DA SAÍDA FINAL</div>
                          <div style={{color:corSaida,fontWeight:800,fontSize:18}}>
                            {f.saidaFinalTipo==="zero"?"R$ 0,00":`${vlrSaida>=0?"+":""} R$ ${Math.abs(vlrSaida).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`}
                          </div>
                        </div>
                        <div style={{textAlign:"right",color:t.muted,fontSize:10}}>
                          {f.saidaFinalTipo==="alvo"&&`${pts} pts × R$${vlrPorPonto}/pt × ${cts} ct`}
                          {f.saidaFinalTipo==="stop"&&`${stopEfetivo} pts × R$${vlrPorPonto}/pt × ${cts} ct${stopEfetivo!==stopPts?" (ajustado)":""}`}
                          {f.saidaFinalTipo==="zero"&&`${cts} contrato${cts>1?"s":""} saiu no zero`}
                        </div>
                      </div>
                      {temParcial&&(
                        <div style={{background:corTotal+"12",border:`2px solid ${corTotal}55`,borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                          <div>
                            <div style={{color:t.muted,fontSize:10,fontWeight:700,marginBottom:3}}>🏆 RESULTADO TOTAL DA OPERAÇÃO</div>
                            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                              <span style={{color:"#a855f7",fontSize:12,fontWeight:600}}>✂️ Parcial: +R$ {vlrParcial.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                              <span style={{color:t.muted,fontSize:12}}>{vlrSaida>=0?"+":""}</span>
                              <span style={{color:corSaida,fontSize:12,fontWeight:600}}>{f.saidaFinalTipo==="zero"?"R$ 0,00":` R$ ${vlrSaida.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`}</span>
                              <span style={{color:t.muted,fontSize:12}}>=</span>
                            </div>
                            <div style={{color:corTotal,fontWeight:900,fontSize:22,marginTop:4}}>
                              {vlrTotal>=0?"+":""} R$ {Math.abs(vlrTotal).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}
                            </div>
                          </div>
                          <div style={{background:corTotal+"22",border:`1px solid ${corTotal}44`,borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
                            <div style={{color:corTotal,fontSize:22}}>{vlrTotal>0?"🏆":vlrTotal<0?"🛑":"➡️"}</div>
                            <div style={{color:corTotal,fontSize:10,fontWeight:700,marginTop:2}}>{vlrTotal>0?"LUCRATIVO":vlrTotal<0?"NEGATIVO":"BREAKEVEN"}</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}
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

// ─── RELATÓRIO IA ─────────────────────────────────────────────────────────────

// ─── PAINEL MERCADOS GLOBAIS (TradingView Widget) ────────────────────────────
function PainelMercados({t}) {
  const [open,setOpen]=React.useState(true);
  const tvRef=React.useRef(null);
  const tvRef2=React.useRef(null);
  const TICKER_SYMBOLS=[
    {proName:"CBOE:VIX",title:"VIX"},
    {proName:"NYMEX:CL1!",title:"Petróleo WTI"},
    {proName:"CBOT:ZC1!",title:"Milho"},
    {proName:"NYSE:VALE",title:"VALE ADR"},
    {proName:"NYSE:PBR",title:"PBR ADR"},
    {proName:"NYSE:ITUB",title:"ITUB ADR"},
    {proName:"NYSE:BBD",title:"BBD ADR"},
    {proName:"NYSE:BOLSY",title:"BOLSY ADR"},
    {proName:"NYSE:BDORY",title:"BDORY ADR"},
  ];
  React.useEffect(()=>{
    if(!open) return;
    // Ticker tape widget
    if(tvRef.current){
      tvRef.current.innerHTML="";
      const s=document.createElement("script");
      s.src="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
      s.async=true;
      s.innerHTML=JSON.stringify({
        symbols:TICKER_SYMBOLS,
        showSymbolLogo:true,
        isTransparent:true,
        displayMode:"adaptive",
        colorTheme:"dark",
        locale:"br",
      });
      tvRef.current.appendChild(s);
    }
    // Mini charts widget para VIX, CL1!, FEF2!
    if(tvRef2.current){
      tvRef2.current.innerHTML="";
      const s=document.createElement("script");
      s.src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
      s.async=true;
      s.innerHTML=JSON.stringify({
        symbol:"CBOE:VIX",
        width:"100%",
        height:150,
        locale:"br",
        dateRange:"1D",
        colorTheme:"dark",
        isTransparent:true,
        autosize:false,
        largeChartUrl:"",
      });
      tvRef2.current.appendChild(s);
    }
  },[open]);
  return (
    <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,overflow:"hidden",marginBottom:16}}>
      <div onClick={()=>setOpen(v=>!v)} style={{background:t.header,borderBottom:open?`1px solid ${t.border}`:"none",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span>🌍</span>
          <span style={{color:t.accent,fontWeight:800,fontSize:11,letterSpacing:1,textTransform:"uppercase"}}>Mercados Globais</span>
          <span style={{background:"#3b82f618",border:"1px solid #3b82f633",borderRadius:999,padding:"2px 8px",color:"#60a5fa",fontSize:10,fontWeight:700}}>VIX · CL1! · FEF2! · ADRs BR</span>
        </div>
        <span style={{color:t.muted,fontSize:13,fontWeight:700,display:"inline-block",transform:open?"rotate(0deg)":"rotate(180deg)",transition:"transform .2s"}}>▲</span>
      </div>
      {open&&(
        <div style={{padding:"0 0 8px 0"}}>
          {/* TradingView Ticker Tape — VIX, CL1!, ADRs */}
          <div className="tradingview-widget-container" ref={tvRef} style={{minHeight:46,overflow:"hidden"}}/>
          {/* Mini charts linha */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,padding:"10px 18px"}}>
            {[
              {sym:"CBOE:VIX",label:"VIX",color:"#ef4444"},
              {sym:"NYMEX:CL1!",label:"CL1! Petróleo",color:"#f59e0b"},
              {sym:"BMFBOVESPA:FEF2!",label:"FEF2! Boi Gordo",color:"#22c55e"},
            ].map(({sym,label,color})=>(
              <div key={sym} style={{background:t.bg,border:`1px solid ${color}33`,borderRadius:10,overflow:"hidden"}}>
                <div style={{padding:"8px 12px 4px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{color,fontWeight:800,fontSize:11}}>{label}</span>
                </div>
                <MiniChart sym={sym} t={t}/>
              </div>
            ))}
          </div>
          {/* ADRs Brasileiras grid */}
          <div style={{padding:"0 18px 8px"}}>
            <div style={{color:t.muted,fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>🇧🇷 ADRs Brasileiras — NYSE</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[
                {sym:"NYSE:VALE",label:"VALE",desc:"Vale"},
                {sym:"NYSE:PBR",label:"PBR",desc:"Petrobras"},
                {sym:"NYSE:ITUB",label:"ITUB",desc:"Itaú"},
                {sym:"NYSE:BBD",label:"BBD",desc:"Bradesco"},
                {sym:"NYSE:BOLSY",label:"BOLSY",desc:"B3"},
                {sym:"NYSE:BDORY",label:"BDORY",desc:"Banco do Brasil"},
              ].map(({sym,label,desc})=>(
                <div key={sym} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,overflow:"hidden"}}>
                  <div style={{padding:"6px 10px 2px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{color:t.accent,fontWeight:800,fontSize:12}}>{label}</div>
                      <div style={{color:t.muted,fontSize:9}}>{desc}</div>
                    </div>
                  </div>
                  <MiniChart sym={sym} t={t} height={80}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{textAlign:"right",padding:"0 18px",marginTop:2}}>
            <a href="https://br.tradingview.com" target="_blank" rel="noopener noreferrer" style={{color:t.muted,fontSize:9}}>powered by TradingView</a>
          </div>
        </div>
      )}
    </div>
  );
}
function MiniChart({sym,t,height=110}) {
  const ref=React.useRef(null);
  React.useEffect(()=>{
    if(!ref.current) return;
    ref.current.innerHTML="";
    const container=document.createElement("div");
    container.className="tradingview-widget-container";
    const widget=document.createElement("div");
    widget.className="tradingview-widget-container__widget";
    const s=document.createElement("script");
    s.src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    s.async=true;
    s.innerHTML=JSON.stringify({
      symbol:sym,
      width:"100%",
      height:height,
      locale:"br",
      dateRange:"1D",
      colorTheme:"dark",
      isTransparent:true,
      autosize:true,
      largeChartUrl:"",
      noTimeScale:false,
    });
    container.appendChild(widget);
    container.appendChild(s);
    ref.current.appendChild(container);
  },[sym,height]);
  return <div ref={ref} style={{width:"100%",minHeight:height}}/>;
}


function RegoesDolar({t}) {
  const [dados, setDados] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    async function buscar() {
      setLoading(true);
      try {
        const hoje = new Date().toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from("dolar_diario")
          .select("*")
          .eq("data", hoje)
          .single();
        if (!error && data) setDados(data);
        else setDados(null);
      } catch(e) {
        setDados(null);
      } finally {
        setLoading(false);
      }
    }
    buscar();
  }, []);

  const fmt = v => v ? `R$ ${Number(v).toFixed(3).replace(".", ",")}` : "—";
  const hoje = new Date().toLocaleDateString("pt-BR", {day:"2-digit",month:"2-digit",year:"numeric"});

  return (
    <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,overflow:"hidden",marginBottom:16}}>
      <div onClick={()=>setOpen(v=>!v)} style={{background:t.header,borderBottom:open?`1px solid ${t.border}`:"none",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span>💵</span>
          <span style={{color:t.accent,fontWeight:800,fontSize:11,letterSpacing:1,textTransform:"uppercase"}}>Regiões do Dólar</span>
          <span style={{background:"#3b82f618",border:"1px solid #3b82f633",borderRadius:999,padding:"2px 8px",color:"#60a5fa",fontSize:10,fontWeight:700}}>CME 6L=F · {hoje}</span>
        </div>
        <span style={{color:t.muted,fontSize:13,fontWeight:700,display:"inline-block",transform:open?"rotate(0deg)":"rotate(180deg)",transition:"transform .2s"}}>▲</span>
      </div>
      {open&&(
        <div style={{padding:"14px 18px"}}>
          {loading ? (
            <div style={{color:t.muted,fontSize:13,textAlign:"center",padding:"20px 0"}}>⏳ Carregando dados...</div>
          ) : !dados ? (
            <div style={{background:"#f59e0b10",border:"1px solid #f59e0b40",borderRadius:8,padding:"12px 16px"}}>
              <div style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>⚠️ Dados não disponíveis para hoje</div>
              <div style={{color:t.muted,fontSize:11,marginTop:4}}>Os dados são carregados automaticamente às 08:50 nos dias úteis.</div>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
                <div style={{color:t.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Abertura</div>
                <div style={{color:"#60a5fa",fontWeight:800,fontSize:20}}>{fmt(dados.abertura)}</div>
                <div style={{color:t.muted,fontSize:10,marginTop:4}}>1 ÷ {dados.raw_last}</div>
              </div>
              <div style={{background:t.bg,border:`1px solid #22c55e33`,borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
                <div style={{color:t.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Mínima</div>
                <div style={{color:"#22c55e",fontWeight:800,fontSize:20}}>{fmt(dados.minima)}</div>
                <div style={{color:t.muted,fontSize:10,marginTop:4}}>1 ÷ {dados.raw_high}</div>
              </div>
              <div style={{background:t.bg,border:`1px solid #ef444433`,borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
                <div style={{color:t.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Máxima</div>
                <div style={{color:"#ef4444",fontWeight:800,fontSize:20}}>{fmt(dados.maxima)}</div>
                <div style={{color:t.muted,fontSize:10,marginTop:4}}>1 ÷ {dados.raw_low}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CALENDÁRIO ECONÔMICO (MQL5 Widget) ──────────────────────────────────────
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
            height="500"
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

// ─── GESTÃO DE MARGEM ─────────────────────────────────────────────────────────
const PERFIS_MARGEM = {
  conservador: {label:"🛡️ Conservador",color:"#22c55e",bg:"#22c55e10",border:"#22c55e40",pctPerda:5, margemBR:3000},
  moderado:    {label:"⚖️ Moderado",   color:"#f59e0b",bg:"#f59e0b10",border:"#f59e0b40",pctPerda:8, margemBR:2000},
  agressivo:   {label:"⚡ Agressivo",  color:"#ef4444",bg:"#ef444410",border:"#ef444440",pctPerda:15,margemBR:1000},
};

function ColapsableSection({icon,title,color,badge,t,children,defaultOpen=true}) {
  const [open,setOpen]=React.useState(defaultOpen);
  return (
    <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,overflow:"hidden",marginBottom:14}}>
      <div onClick={()=>setOpen(v=>!v)} style={{background:t.header,borderBottom:open?`1px solid ${t.border}`:"none",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span>{icon}</span>
          <span style={{color:color||t.accent,fontWeight:800,fontSize:11,letterSpacing:1,textTransform:"uppercase"}}>{title}</span>
          {badge}
        </div>
        <span style={{color:t.muted,fontSize:13,fontWeight:700,display:"inline-block",transform:open?"rotate(0deg)":"rotate(180deg)",transition:"transform .2s"}}>▲</span>
      </div>
      {open&&<div style={{padding:"16px 18px"}}>{children}</div>}
    </div>
  );
}

function MargemRow({label,value,color,sub,bold}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #1e3a5f22"}}>
      <span style={{color:"#475569",fontSize:12}}>{label}</span>
      <div style={{textAlign:"right"}}>
        <div style={{color:color||"#e2e8f0",fontWeight:bold?800:700,fontSize:bold?15:13}}>{value}</div>
        {sub&&<div style={{color:"#475569",fontSize:10,marginTop:1}}>{sub}</div>}
      </div>
    </div>
  );
}

function MargemInp({label,value,onChange,small}) {
  return (
    <div style={{flex:1,minWidth:small?80:140}}>
      {label&&<div style={{color:"#475569",fontSize:10,fontWeight:700,letterSpacing:0.4,marginBottom:5,textTransform:"uppercase"}}>{label}</div>}
      <input type="number" value={value} onChange={e=>onChange(parseFloat(e.target.value)||0)}
        style={{background:"#070e1a",border:"1px solid #1e3a5f",borderRadius:8,color:"#e2e8f0",padding:"9px 12px",fontSize:15,fontWeight:700,outline:"none",width:"100%",boxSizing:"border-box"}}/>
    </div>
  );
}

function SecaoBRMargem({perfil,t}) {
  const p=PERFIS_MARGEM[perfil];
  const [contratos,setContratos]=React.useState(2);
  const [opsPlano,setOpsPlano]=React.useState(3);
  const capitalTotal=contratos*p.margemBR;
  const perdaMaxTotal=capitalTotal*p.pctPerda/100;
  const perdaMaxPorOp=opsPlano>0?perdaMaxTotal/opsPlano:0;
  const pontosPerda=contratos>0?Math.round(perdaMaxPorOp/(contratos*0.20)):0;
  const brl=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  return (
    <ColapsableSection icon="🇧🇷" title="Mercado Brasileiro — WIN / WDO" color="#60a5fa" t={t}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <MargemInp label="Contratos" value={contratos} onChange={setContratos} small/>
        <MargemInp label="Operações planejadas hoje" value={opsPlano} onChange={setOpsPlano} small/>
      </div>
      <div style={{background:t.bg,border:`1px solid ${p.border}`,borderRadius:10,padding:"12px 14px"}}>
        <div style={{color:p.color,fontSize:10,fontWeight:800,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>
          📊 {p.label} — R${p.margemBR.toLocaleString()}/contrato · Perda máx. {p.pctPerda}%
        </div>
        <MargemRow label="Margem necessária" value={brl(capitalTotal)} color="#60a5fa" sub={`${contratos}x R$${p.margemBR.toLocaleString()}/contrato`}/>
        <MargemRow label={`Perda máxima do dia (${p.pctPerda}%)`} value={`-${brl(perdaMaxTotal)}`} color="#ef4444" bold/>
        <MargemRow label={`Perda máx. por operação (÷${opsPlano} ops)`} value={`-${brl(perdaMaxPorOp)}`} color="#f59e0b" bold sub={`≈ ${pontosPerda} pontos WIN por operação · ${contratos} contrato${contratos>1?"s":""}`}/>
      </div>
      <div style={{background:"#22c55e10",border:"1px solid #22c55e40",borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
        <span style={{color:"#22c55e",fontWeight:700,fontSize:13}}>✅ Plano configurado corretamente</span>
        <span style={{background:p.color+"22",border:`1px solid ${p.color}55`,color:p.color,padding:"3px 12px",borderRadius:999,fontSize:11,fontWeight:700}}>{p.label}</span>
      </div>
    </ColapsableSection>
  );
}

function SecaoForexMargem({perfil,t}) {
  const p=PERFIS_MARGEM[perfil];
  const [capital,setCapital]=React.useState(500);
  const [opsPlano,setOpsPlano]=React.useState(3);
  const PCT=2;
  const perdaMaxTotal=capital*PCT/100;
  const perdaMaxPorOp=opsPlano>0?perdaMaxTotal/opsPlano:0;
  const PARES=["EURUSD","USDJPY","GBPUSD","USDCHF","AUDUSD","USDCAD","NZDUSD","EURGBP","EURJPY","GBPJPY","CADJPY","CHFJPY"];
  return (
    <ColapsableSection icon="💱" title="Pares de Moedas (Forex)" color="#06b6d4" t={t}>
      <div style={{marginBottom:12,padding:"8px 12px",background:"#06b6d410",border:"1px solid #06b6d440",borderRadius:8}}>
        <span style={{color:"#06b6d4",fontSize:11,fontWeight:700}}>🔒 Regra Forex: máximo 2% do capital por ativo — proteção conservadora de conta</span>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{color:t.muted,fontSize:10,fontWeight:700,letterSpacing:0.4,marginBottom:6,textTransform:"uppercase"}}>Pares disponíveis</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{PARES.map(par=><span key={par} style={{background:"#1e3a5f",border:"1px solid #2a4a7f",color:"#93c5fd",padding:"2px 9px",borderRadius:6,fontSize:11}}>{par}</span>)}</div>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <MargemInp label="Capital na corretora (USD)" value={capital} onChange={setCapital}/>
        <MargemInp label="Operações planejadas" value={opsPlano} onChange={setOpsPlano} small/>
      </div>
      <div style={{background:t.bg,border:`1px solid ${p.border}`,borderRadius:10,padding:"12px 14px"}}>
        <div style={{color:p.color,fontSize:10,fontWeight:800,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>📊 Limites — 2% máx. por ativo</div>
        <MargemRow label="Capital disponível" value={`$${capital.toFixed(2)}`} color="#60a5fa"/>
        <MargemRow label={`Perda máxima total (${PCT}% do capital)`} value={`-$${perdaMaxTotal.toFixed(2)}`} color="#ef4444" bold sub={`${PCT}% de $${capital}`}/>
        <MargemRow label={`Risco máximo por operação (÷${opsPlano} ops)`} value={`-$${perdaMaxPorOp.toFixed(2)}`} color="#f59e0b" bold sub={`$${perdaMaxTotal.toFixed(2)} ÷ ${opsPlano} operações`}/>
      </div>
      <div style={{background:capital>=100?"#22c55e10":"#ef444410",border:`1px solid ${capital>=100?"#22c55e40":"#ef444440"}`,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
        <span style={{color:capital>=100?"#22c55e":"#ef4444",fontWeight:700,fontSize:13}}>{capital>=100?"✅ Capital adequado para operar Forex":"⚠️ Capital muito baixo para gestão adequada"}</span>
        <span style={{background:p.color+"22",border:`1px solid ${p.color}55`,color:p.color,padding:"3px 12px",borderRadius:999,fontSize:11,fontWeight:700}}>{p.label}</span>
      </div>
    </ColapsableSection>
  );
}

function SecaoIndicesMargem({perfil,t}) {
  const p=PERFIS_MARGEM[perfil];
  const [capital,setCapital]=React.useState(500);
  const [opsPlano,setOpsPlano]=React.useState(2);
  const PCT=2;
  const perdaMaxTotal=capital*PCT/100;
  const perdaMaxPorOp=opsPlano>0?perdaMaxTotal/opsPlano:0;
  const INDICES=["US30","US100","US500","US2000","GER40","UK100","FR40","JPN225","HK50","CN50","AUS200","EU50","SPA35","ITA40"];
  return (
    <ColapsableSection icon="🌐" title="Índices Mundiais" color="#a855f7" t={t}>
      <div style={{marginBottom:12,padding:"8px 12px",background:"#a855f710",border:"1px solid #a855f740",borderRadius:8}}>
        <span style={{color:"#a855f7",fontSize:11,fontWeight:700}}>🔒 Regra Índices: máximo 2% do capital por ativo — mesma proteção do Forex</span>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{color:t.muted,fontSize:10,fontWeight:700,letterSpacing:0.4,marginBottom:6,textTransform:"uppercase"}}>Índices disponíveis</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{INDICES.map(idx=><span key={idx} style={{background:"#1e3a5f",border:"1px solid #2a3a6f",color:"#c084fc",padding:"2px 9px",borderRadius:6,fontSize:11,fontWeight:600}}>{idx}</span>)}</div>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <MargemInp label="Capital na corretora (USD)" value={capital} onChange={setCapital}/>
        <MargemInp label="Operações planejadas" value={opsPlano} onChange={setOpsPlano} small/>
      </div>
      <div style={{background:t.bg,border:`1px solid ${p.border}`,borderRadius:10,padding:"12px 14px"}}>
        <div style={{color:p.color,fontSize:10,fontWeight:800,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>📊 Limites — 2% máx. por índice</div>
        <MargemRow label="Capital disponível" value={`$${capital.toFixed(2)}`} color="#60a5fa"/>
        <MargemRow label={`Perda máxima total (${PCT}% do capital)`} value={`-$${perdaMaxTotal.toFixed(2)}`} color="#ef4444" bold sub={`${PCT}% de $${capital}`}/>
        <MargemRow label={`Risco máximo por operação (÷${opsPlano} ops)`} value={`-$${perdaMaxPorOp.toFixed(2)}`} color="#f59e0b" bold sub={`$${perdaMaxTotal.toFixed(2)} ÷ ${opsPlano} operações`}/>
      </div>
      <div style={{background:capital>=100?"#22c55e10":"#ef444410",border:`1px solid ${capital>=100?"#22c55e40":"#ef444440"}`,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
        <span style={{color:capital>=100?"#22c55e":"#ef4444",fontWeight:700,fontSize:13}}>{capital>=100?"✅ Capital adequado para índices mundiais":"⚠️ Capital insuficiente para gestão segura"}</span>
        <span style={{background:p.color+"22",border:`1px solid ${p.color}55`,color:p.color,padding:"3px 12px",borderRadius:999,fontSize:11,fontWeight:700}}>{p.label}</span>
      </div>
    </ColapsableSection>
  );
}

function PainelMargem({t}) {
  const [perfil,setPerfil]=React.useState("moderado");
  const p=PERFIS_MARGEM[perfil];
  const [open,setOpen]=React.useState(true);
  return (
    <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,overflow:"hidden",marginBottom:16}}>
      <div onClick={()=>setOpen(v=>!v)} style={{background:t.header,borderBottom:open?`1px solid ${t.border}`:"none",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span>🏦</span>
          <span style={{color:t.accent,fontWeight:800,fontSize:13}}>GESTÃO DE MARGEM</span>
          <span style={{background:p.color+"22",border:`1px solid ${p.color}55`,color:p.color,padding:"2px 10px",borderRadius:999,fontSize:11,fontWeight:700}}>{p.label}</span>
        </div>
        <span style={{color:t.muted,fontSize:13,fontWeight:700,display:"inline-block",transform:open?"rotate(0deg)":"rotate(180deg)",transition:"transform .2s"}}>▲</span>
      </div>
      {open&&(
        <div style={{padding:"16px 18px"}}>
          {/* Seletor de perfil */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            {Object.entries(PERFIS_MARGEM).map(([key,pf])=>(
              <button key={key} onClick={()=>setPerfil(key)} style={{padding:"11px 8px",borderRadius:10,cursor:"pointer",border:`2px solid ${perfil===key?pf.color:t.border}`,background:perfil===key?pf.bg:"transparent",color:perfil===key?pf.color:t.muted,fontWeight:perfil===key?800:400,fontSize:12,transition:"all .15s",textAlign:"center"}}>
                <div>{pf.label}</div>
                <div style={{fontSize:10,marginTop:3,opacity:0.8}}>R${pf.margemBR.toLocaleString()}/ct · {pf.pctPerda}% perda máx.</div>
              </button>
            ))}
          </div>
          <div style={{marginBottom:14,background:p.bg,border:`1px solid ${p.border}`,borderRadius:8,padding:"9px 14px"}}>
            <span style={{color:p.color,fontSize:12,fontWeight:700}}>
              {perfil==="conservador"&&"🛡️ R$3.000/contrato · 5% perda máx. diária — preserve o capital, consistência gera lucro"}
              {perfil==="moderado"&&"⚖️ R$2.000/contrato · 8% perda máx. diária — equilibre risco e retorno, sem exageros"}
              {perfil==="agressivo"&&"⚡ R$1.000/contrato · 15% perda máx. diária — alto risco exige disciplina máxima"}
            </span>
          </div>
          <SecaoBRMargem perfil={perfil} t={t}/>
          <SecaoForexMargem perfil={perfil} t={t}/>
          <SecaoIndicesMargem perfil={perfil} t={t}/>
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
// COLOQUE ISSO:
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
      <PainelMercados t={t}/>
      <RegoesDolar t={t}/>
      <CalendarioEconomico t={t}/>
      <PainelMargem t={t}/>
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
  // ── FILTROS ──────────────────────────────────────────────────────────────────
  const [periodo,setPeriodo] = useState("tudo");
  const [dataIni,setDataIni] = useState("");
  const [dataFim,setDataFim] = useState("");
  const [fMercado,setFMercado] = useState("todos");
  const [fAtivo,setFAtivo] = useState("todos");
  const [fDirecao,setFDirecao] = useState("todas");
  const [fErro,setFErro] = useState("todos");
  const [fEstrategia,setFEstrategia] = useState("todas");

  const hoje = new Date();
  const {start:ws,end:we} = getWeekRange(hoje);
  const mesStr = hoje.toISOString().slice(0,7);
  const hj = hojeStr();

  // ── DETECTAR MERCADO DO ATIVO ────────────────────────────────────────────────
  function getMercado(ativo) {
    if(!ativo) return "outros";
    if(["WINFUT","WDOFUT"].includes(ativo)) return "br";
    const forex = Object.values(ATIVOS).filter((_,i)=>Object.keys(ATIVOS)[i].includes("Forex")).flat();
    if(forex.includes(ativo)) return "forex";
    const indices = [...(ATIVOS["🇺🇸 Índices EUA"]||[]),...(ATIVOS["🇩🇪 Europa"]||[]),...(ATIVOS["🌏 Ásia"]||[])];
    if(indices.includes(ativo)) return "indices";
    return "outros";
  }

  // ── FILTRAR OPS ───────────────────────────────────────────────────────────────
  const opsFiltradas = useMemo(() => {
    return ops.filter(op => {
      // Período
      if(periodo==="hoje" && op.data!==hj) return false;
      if(periodo==="semana" && (op.data<ws||op.data>we)) return false;
      if(periodo==="mes" && !op.data.startsWith(mesStr)) return false;
      if(periodo==="custom"){
        if(dataIni && op.data<dataIni) return false;
        if(dataFim && op.data>dataFim) return false;
      }
      // Mercado
      if(fMercado!=="todos" && getMercado(op.ativo)!==fMercado) return false;
      // Ativo
      if(fAtivo!=="todos" && op.ativo!==fAtivo) return false;
      // Direção
      if(fDirecao!=="todas" && op.direcao!==fDirecao) return false;
      // Erro
      if(fErro!=="todos" && !(op.errosOperacao||[]).includes(fErro)) return false;
      // Estratégia
      if(fEstrategia!=="todas" && op.tipoEntrada!==fEstrategia) return false;
      return true;
    });
  }, [ops,periodo,dataIni,dataFim,fMercado,fAtivo,fDirecao,fErro,fEstrategia,hj,ws,we,mesStr]);

  // ── ATIVOS ÚNICOS ──────────────────────────────────────────────────────────
  const ativosUnicos = useMemo(()=>[...new Set(ops.map(o=>o.ativo).filter(Boolean))],[ops]);
  const estrategiasUnicas = useMemo(()=>[...new Set(ops.map(o=>o.tipoEntrada).filter(Boolean))],[ops]);

  // ── MÉTRICAS BASE ──────────────────────────────────────────────────────────
  const totalReais = opsFiltradas.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0);
  const totalDolar = opsFiltradas.filter(o=>o.resultadoDolar).reduce((s,o)=>s+(parseFloat(o.resultadoDolar)||0),0);
  const wins = opsFiltradas.filter(o=>(parseFloat(o.resultadoReais)||0)>0);
  const losses = opsFiltradas.filter(o=>(parseFloat(o.resultadoReais)||0)<0);
  const pct = opsFiltradas.length>0?Math.round(wins.length/opsFiltradas.length*100):0;
  const temDolar = opsFiltradas.some(o=>o.resultadoDolar);
  const mediaGanho = wins.length>0?wins.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0)/wins.length:0;
  const mediaPerda = losses.length>0?Math.abs(losses.reduce((s,o)=>s+(parseFloat(o.resultadoReais)||0),0)/losses.length):0;
  const fatorExpectativa = mediaPerda>0?(mediaGanho/mediaPerda).toFixed(2):"-";

  // ── CONSISTÊNCIA DIÁRIA ────────────────────────────────────────────────────
  const diasUnicos = useMemo(()=>{
    const acc={};
    opsFiltradas.forEach(op=>{
      if(!acc[op.data]) acc[op.data]=0;
      acc[op.data]+=(parseFloat(op.resultadoReais)||0);
    });
    return Object.entries(acc).map(([data,res])=>({data,res}));
  },[opsFiltradas]);
  const diasPositivos = diasUnicos.filter(d=>d.res>0).length;
  const diasNegativos = diasUnicos.filter(d=>d.res<0).length;
  const diasTotal = diasUnicos.length;

  // ── POR PERÍODO (evolução) ─────────────────────────────────────────────────
  const chartData = useMemo(()=>{
    const s=[...opsFiltradas].sort((a,b)=>a.data.localeCompare(b.data));
    let acc=0;
    return s.map((op,i)=>{acc+=parseFloat(op.resultadoReais)||0;return{name:`Op ${i+1}`,saldo:Math.round(acc*100)/100};});
  },[opsFiltradas]);

  // ── POR ESTRATÉGIA ─────────────────────────────────────────────────────────
  const byEstrategia = useMemo(()=>{
    const acc={};
    opsFiltradas.forEach(op=>{
      const k=op.tipoEntrada||"Sem estratégia";
      if(!acc[k]) acc[k]={tipo:k,reais:0,count:0,wins:0};
      acc[k].reais+=parseFloat(op.resultadoReais)||0;
      acc[k].count++;
      if((parseFloat(op.resultadoReais)||0)>0) acc[k].wins++;
    });
    return Object.values(acc).sort((a,b)=>b.reais-a.reais);
  },[opsFiltradas]);

  // ── POR DIREÇÃO + MACRO ────────────────────────────────────────────────────
  const byDirecaoMacro = useMemo(()=>{
    const cats={"Compra_Alta":{label:"▲ Compra a Favor (Macro Alta)",reais:0,count:0,wins:0,color:"#22c55e"},
                "Venda_Baixa":{label:"▼ Venda a Favor (Macro Baixa)",reais:0,count:0,wins:0,color:"#22c55e"},
                "Compra_Baixa":{label:"▲ Compra Contra (Macro Baixa)",reais:0,count:0,wins:0,color:"#f59e0b"},
                "Venda_Alta":{label:"▼ Venda Contra (Macro Alta)",reais:0,count:0,wins:0,color:"#f59e0b"},
                "Compra_":{label:"▲ Compra (sem macro)",reais:0,count:0,wins:0,color:"#60a5fa"},
                "Venda_":{label:"▼ Venda (sem macro)",reais:0,count:0,wins:0,color:"#60a5fa"}};
    opsFiltradas.forEach(op=>{
      const macro=op.mercadoMacro||"";
      const dir=op.direcao||"";
      const key=`${dir}_${macro}`;
      if(cats[key]){
        cats[key].reais+=parseFloat(op.resultadoReais)||0;
        cats[key].count++;
        if((parseFloat(op.resultadoReais)||0)>0) cats[key].wins++;
      }
    });
    return Object.values(cats).filter(c=>c.count>0);
  },[opsFiltradas]);

  // ── POR MERCADO ────────────────────────────────────────────────────────────
  const byMercado = useMemo(()=>{
    const acc={"br":{label:"🇧🇷 Mercado BR",reais:0,count:0,wins:0},
               "forex":{label:"💱 Forex",reais:0,count:0,wins:0},
               "indices":{label:"🌐 Índices",reais:0,count:0,wins:0},
               "outros":{label:"📦 Outros",reais:0,count:0,wins:0}};
    opsFiltradas.forEach(op=>{
      const m=getMercado(op.ativo);
      if(acc[m]){
        acc[m].reais+=parseFloat(op.resultadoReais)||0;
        acc[m].count++;
        if((parseFloat(op.resultadoReais)||0)>0) acc[m].wins++;
      }
    });
    return Object.values(acc).filter(c=>c.count>0).sort((a,b)=>b.reais-a.reais);
  },[opsFiltradas]);

  // ── POR ATIVO ──────────────────────────────────────────────────────────────
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

  // ── POR DIA DA SEMANA ──────────────────────────────────────────────────────
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

  // ── POR ERRO ───────────────────────────────────────────────────────────────
  const byErro = useMemo(()=>{
    const acc={};
    opsFiltradas.forEach(op=>{
      (op.errosOperacao||[]).forEach(e=>{
        if(!acc[e]) acc[e]={v:e,count:0,reais:0};
        acc[e].count++;
        acc[e].reais+=parseFloat(op.resultadoReais)||0;
      });
    });
    return Object.values(acc).sort((a,b)=>b.count-a.count);
  },[opsFiltradas]);

  const maxAbs = Math.max(...byDay.map(d=>Math.abs(d.reais)),1);
  const brl = v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  // ── ESTILOS REUTILIZÁVEIS ──────────────────────────────────────────────────
  const cardStyle = {background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:18,marginBottom:14};
  const selStyle = {background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"7px 10px",fontSize:12,fontWeight:600,cursor:"pointer",outline:"none"};
  const btnFiltro = (ativo,onClick,label,cor) => (
    <button onClick={onClick} style={{
      padding:"5px 12px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700,
      border:`1px solid ${ativo?(cor||"#60a5fa")+"88":t.border}`,
      background:ativo?(cor||"#60a5fa")+"18":"transparent",
      color:ativo?(cor||"#60a5fa"):t.muted,transition:"all .15s"
    }}>{label}</button>
  );

  return (
    <div>
      {/* ── PAINEL DE FILTROS ───────────────────────────────────────────────── */}
      <div style={{...cardStyle,marginBottom:16}}>
        <div style={{color:t.accent,fontWeight:800,fontSize:11,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>🔍 Filtros</div>

        {/* Período */}
        <div style={{marginBottom:10}}>
          <div style={{color:t.muted,fontSize:10,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Período</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["tudo","Tudo"],["hoje","Hoje"],["semana","Esta Semana"],["mes","Este Mês"],["custom","Personalizado"]].map(([v,l])=>
              btnFiltro(periodo===v,()=>setPeriodo(v),l)
            )}
          </div>
          {periodo==="custom"&&(
            <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
              <input type="date" value={dataIni} onChange={e=>setDataIni(e.target.value)} style={{...selStyle}}/>
              <span style={{color:t.muted}}>até</span>
              <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} style={{...selStyle}}/>
            </div>
          )}
        </div>

        {/* Mercado */}
        <div style={{marginBottom:10}}>
          <div style={{color:t.muted,fontSize:10,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Mercado</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["todos","Todos"],["br","🇧🇷 BR"],["forex","💱 Forex"],["indices","🌐 Índices"]].map(([v,l])=>
              btnFiltro(fMercado===v,()=>{setFMercado(v);setFAtivo("todos");},l)
            )}
          </div>
        </div>

        {/* Ativo */}
        <div style={{marginBottom:10}}>
          <div style={{color:t.muted,fontSize:10,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Ativo</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {btnFiltro(fAtivo==="todos",()=>setFAtivo("todos"),"Todos")}
            {ativosUnicos.filter(a=>fMercado==="todos"||getMercado(a)===fMercado).map(a=>
              btnFiltro(fAtivo===a,()=>setFAtivo(a),a,"#a78bfa")
            )}
          </div>
        </div>

        {/* Direção + Estratégia + Erro em linha */}
        <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:180}}>
            <div style={{color:t.muted,fontSize:10,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Direção</div>
            <div style={{display:"flex",gap:6}}>
              {[["todas","Todas"],["Compra","▲ Compra"],["Venda","▼ Venda"]].map(([v,l])=>
                btnFiltro(fDirecao===v,()=>setFDirecao(v),l,v==="Compra"?"#22c55e":"#ef4444")
              )}
            </div>
          </div>
          <div style={{flex:1,minWidth:180}}>
            <div style={{color:t.muted,fontSize:10,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Estratégia</div>
            <select value={fEstrategia} onChange={e=>setFEstrategia(e.target.value)} style={{...selStyle,width:"100%"}}>
              <option value="todas">Todas</option>
              {estrategiasUnicas.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div style={{flex:1,minWidth:180}}>
            <div style={{color:t.muted,fontSize:10,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Filtrar por Erro</div>
            <select value={fErro} onChange={e=>setFErro(e.target.value)} style={{...selStyle,width:"100%"}}>
              <option value="todos">Todos</option>
              {ERROS_OPERACAO.map(e=><option key={e.v} value={e.v}>{e.label}</option>)}
            </select>
          </div>
        </div>

        {/* Resumo do filtro */}
        <div style={{marginTop:10,padding:"6px 12px",background:t.bg,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:t.muted,fontSize:11}}>{opsFiltradas.length} operações encontradas</span>
          <button onClick={()=>{setPeriodo("tudo");setFMercado("todos");setFAtivo("todos");setFDirecao("todas");setFErro("todos");setFEstrategia("todas");setDataIni("");setDataFim("");}}
            style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,color:t.muted,padding:"3px 10px",fontSize:11,cursor:"pointer"}}>
            ✕ Limpar filtros
          </button>
        </div>
      </div>

      {opsFiltradas.length===0&&(
        <div style={{...cardStyle,textAlign:"center",padding:40}}>
          <div style={{fontSize:32,marginBottom:8}}>🔍</div>
          <div style={{color:t.muted,fontSize:14}}>Nenhuma operação encontrada com os filtros selecionados.</div>
        </div>
      )}

      {opsFiltradas.length>0&&(<>

      {/* ── CARDS RESUMO ──────────────────────────────────────────────────────── */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <StatCard icon="📊" label="Total Ops" value={opsFiltradas.length} t={t}/>
        <StatCard icon="✅" label="Taxa Acerto" value={`${pct}%`} color={pct>=50?"#4ade80":"#f87171"} t={t}/>
        <StatCard icon="💰" label="Total R$" value={brl(totalReais)} color={totalReais>=0?"#4ade80":"#f87171"} t={t}/>
        {temDolar&&<StatCard icon="💵" label="Total USD" value={totalDolar.toLocaleString("en-US",{style:"currency",currency:"USD"})} color={totalDolar>=0?"#f59e0b":"#f87171"} t={t}/>}
        <StatCard icon="📅" label="Dias Operados" value={`${diasTotal}d`} t={t}/>
        <StatCard icon="🟢" label="Dias Positivos" value={`${diasPositivos}/${diasTotal}`} color="#4ade80" t={t}/>
      </div>

      {/* ── MÉDIA GANHO vs PERDA ──────────────────────────────────────────────── */}
      <div style={{...cardStyle}}>
        <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>⚖️ Média de Ganho vs Perda</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <div style={{background:t.bg,border:"1px solid #22c55e33",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
            <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Média por Gain</div>
            <div style={{color:"#22c55e",fontWeight:800,fontSize:18}}>{brl(mediaGanho)}</div>
            <div style={{color:t.muted,fontSize:10,marginTop:2}}>{wins.length} wins</div>
          </div>
          <div style={{background:t.bg,border:"1px solid #ef444433",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
            <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Média por Loss</div>
            <div style={{color:"#ef4444",fontWeight:800,fontSize:18}}>-{brl(mediaPerda)}</div>
            <div style={{color:t.muted,fontSize:10,marginTop:2}}>{losses.length} losses</div>
          </div>
          <div style={{background:t.bg,border:`1px solid ${parseFloat(fatorExpectativa)>=1?"#22c55e33":"#ef444433"}`,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
            <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Fator R (Gain/Loss)</div>
            <div style={{color:parseFloat(fatorExpectativa)>=1?"#22c55e":"#ef4444",fontWeight:800,fontSize:18}}>{fatorExpectativa}x</div>
            <div style={{color:t.muted,fontSize:10,marginTop:2}}>{parseFloat(fatorExpectativa)>=1?"✅ Expectativa positiva":"⚠️ Expectativa negativa"}</div>
          </div>
        </div>
      </div>

      {/* ── CONSISTÊNCIA DIÁRIA ───────────────────────────────────────────────── */}
      <div style={{...cardStyle}}>
        <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>📅 Consistência Diária</h3>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
          <div style={{flex:1,minWidth:100,background:t.bg,border:"1px solid #22c55e33",borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
            <div style={{color:"#22c55e",fontWeight:800,fontSize:22}}>{diasPositivos}</div>
            <div style={{color:t.muted,fontSize:11}}>Dias positivos</div>
          </div>
          <div style={{flex:1,minWidth:100,background:t.bg,border:"1px solid #ef444433",borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
            <div style={{color:"#ef4444",fontWeight:800,fontSize:22}}>{diasNegativos}</div>
            <div style={{color:t.muted,fontSize:11}}>Dias negativos</div>
          </div>
          <div style={{flex:1,minWidth:100,background:t.bg,border:`1px solid ${t.border}`,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
            <div style={{color:t.accent,fontWeight:800,fontSize:22}}>{diasTotal>0?Math.round(diasPositivos/diasTotal*100):0}%</div>
            <div style={{color:t.muted,fontSize:11}}>% dias positivos</div>
          </div>
        </div>
        {/* Calendário de consistência */}
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {diasUnicos.sort((a,b)=>a.data.localeCompare(b.data)).map(d=>(
            <div key={d.data} title={`${d.data}: ${brl(d.res)}`} style={{
              width:28,height:28,borderRadius:6,background:d.res>0?"#22c55e":"#ef4444",
              opacity:0.7+Math.min(Math.abs(d.res)/500,0.3),
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,color:"#fff",fontWeight:700,cursor:"default"
            }}>{d.data.slice(8)}</div>
          ))}
        </div>
        <div style={{marginTop:6,fontSize:10,color:t.muted}}>🟢 Verde = dia positivo · 🔴 Vermelho = dia negativo · Passe o mouse para ver o valor</div>
      </div>

      {/* ── DIREÇÃO + MACRO ───────────────────────────────────────────────────── */}
      <div style={{...cardStyle}}>
        <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 6px"}}>🧭 Resultado por Direção × Macro</h3>
        <div style={{color:t.muted,fontSize:11,marginBottom:14}}>Compara quando você opera a favor ou contra a tendência macro marcada na operação</div>
        {byDirecaoMacro.length===0&&<div style={{color:t.muted,fontSize:13}}>Sem dados suficientes</div>}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {byDirecaoMacro.map(d=>(
            <div key={d.label} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{color:t.text,fontWeight:700,fontSize:13}}>{d.label}</div>
                <div style={{color:t.muted,fontSize:11,marginTop:2}}>{d.wins}/{d.count} ops · {d.count?Math.round(d.wins/d.count*100):0}% acerto</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:d.reais>=0?"#4ade80":"#f87171",fontWeight:800,fontSize:15}}>{d.reais>=0?"+":""}{brl(d.reais)}</div>
                <div style={{color:t.muted,fontSize:10}}>média: {brl(d.count?d.reais/d.count:0)}/op</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── POR ESTRATÉGIA ────────────────────────────────────────────────────── */}
      <div style={{...cardStyle}}>
        <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>🎯 Resultado por Estratégia</h3>
        {byEstrategia.length===0&&<div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {byEstrategia.map(e=>(
            <div key={e.tipo} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>{e.tipo}</div>
                <div style={{color:t.muted,fontSize:11,marginTop:2}}>{e.wins}/{e.count} ops · {e.count?Math.round(e.wins/e.count*100):0}% acerto</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:e.reais>=0?"#4ade80":"#f87171",fontWeight:800,fontSize:15}}>{e.reais>=0?"+":""}{brl(e.reais)}</div>
                <div style={{color:t.muted,fontSize:10}}>média: {brl(e.count?e.reais/e.count:0)}/op</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── POR MERCADO ───────────────────────────────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{...cardStyle,marginBottom:0}}>
          <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>🌍 Por Mercado</h3>
          {byMercado.length===0&&<div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
          {byMercado.map(m=>(
            <div key={m.label} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:t.text,fontWeight:700,fontSize:13}}>{m.label}</span>
                <span style={{color:m.reais>=0?"#4ade80":"#f87171",fontWeight:700}}>{m.reais>=0?"+":""}{brl(m.reais)}</span>
              </div>
              <div style={{color:t.muted,fontSize:11,marginTop:2}}>{m.wins}/{m.count} ops · {m.count?Math.round(m.wins/m.count*100):0}% acerto</div>
            </div>
          ))}
        </div>
        <div style={{...cardStyle,marginBottom:0}}>
          <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>📅 Por Dia da Semana</h3>
          {byDay.length===0&&<div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
          {byDay.map((d,i)=>(
            <div key={d.day} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{color:t.text,fontSize:13,fontWeight:i===0?700:400}}>{i===0?"🏆 ":""}{d.day}</span>
                <span style={{color:d.reais>=0?"#4ade80":"#f87171",fontSize:12,fontWeight:700}}>
                  {d.reais>=0?"+":""}{brl(d.reais)} <span style={{color:t.muted,fontWeight:400,fontSize:10}}>{d.count>0?Math.round(d.wins/d.count*100):0}%</span>
                </span>
              </div>
              <div style={{background:t.bg,borderRadius:4,height:6,overflow:"hidden"}}>
                <div style={{width:`${Math.abs(d.reais)/maxAbs*100}%`,height:"100%",background:d.reais>=0?"#22c55e":"#ef4444",borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── POR ATIVO ─────────────────────────────────────────────────────────── */}
      <div style={{...cardStyle}}>
        <h3 style={{color:t.accent,fontSize:13,fontWeight:700,margin:"0 0 14px"}}>📊 Por Ativo</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {byAtivo.map(a=>(
            <div key={a.ativo} style={{background:(a.reais>=0?"#14532d":"#7f1d1d")+"33",border:`1px solid ${a.reais>=0?"#166534":"#991b1b"}`,borderRadius:10,padding:"10px 14px",minWidth:110,textAlign:"center"}}>
              <div style={{color:t.accent,fontWeight:700,fontSize:13}}>{a.ativo}</div>
              <div style={{color:a.reais>=0?"#4ade80":"#f87171",fontWeight:700,fontSize:15,margin:"3px 0"}}>{a.reais>=0?"+":""}{brl(a.reais)}</div>
              <div style={{color:t.muted,fontSize:11}}>{a.wins}/{a.count} · {a.count?Math.round(a.wins/a.count*100):0}%</div>
            </div>
          ))}
          {byAtivo.length===0&&<div style={{color:t.muted,fontSize:13}}>Sem dados</div>}
        </div>
      </div>

      {/* ── ERROS ─────────────────────────────────────────────────────────────── */}
      {byErro.length>0&&(
        <div style={{...cardStyle,border:"1px solid #ef444433"}}>
          <h3 style={{color:"#f87171",fontSize:13,fontWeight:700,margin:"0 0 14px"}}>⚠️ Erros Cometidos</h3>
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            {byErro.map(e=>{
              const err=ERROS_OPERACAO.find(x=>x.v===e.v);
              return (
                <div key={e.v} style={{background:"#ef444410",border:"1px solid #ef444433",borderRadius:10,padding:"10px 14px",minWidth:150,textAlign:"center"}}>
                  <div style={{color:"#f87171",fontWeight:700,fontSize:12}}>{err?.label||e.v}</div>
                  <div style={{color:t.text,fontWeight:800,fontSize:22,margin:"4px 0"}}>{e.count}x</div>
                  <div style={{color:e.reais>=0?"#4ade80":"#f87171",fontSize:11}}>{brl(e.reais)} nessas ops</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EVOLUÇÃO DO SALDO ─────────────────────────────────────────────────── */}
      {chartData.length>0&&(
        <div style={{...cardStyle}}>
          <h3 style={{color:t.accent,fontSize:14,fontWeight:700,margin:"0 0 16px"}}>📈 Evolução do Saldo</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border}/>
              <XAxis dataKey="name" tick={{fill:t.muted,fontSize:11}} axisLine={{stroke:t.border}}/>
              <YAxis tick={{fill:t.muted,fontSize:11}} axisLine={{stroke:t.border}} tickFormatter={v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/>
              <Tooltip contentStyle={{background:t.card,border:`1px solid ${t.border}`,borderRadius:8,color:t.text}} formatter={v=>[brl(v),"Saldo"]}/>
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4"/>
              <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} dot={{fill:"#3b82f6",r:3}} activeDot={{r:5}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      </>)}
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
