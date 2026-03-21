import React, { useState, useEffect, useRef } from "react";

const PUB = process.env.PUBLIC_URL || "";

const SLIDES = [
  {
    id: "cotacoes",
    img: `${PUB}/images/banner-cotacoes.png`,
    tag: "COTAÇÕES AO VIVO",
    tagColor: "#38bdf8",
    tagBg: "linear-gradient(90deg,#0369a1,#0ea5e9)",
    titulo: "Mercados Globais em Tempo Real",
    subtitulo: "Tudo que você precisa acompanhar antes e durante o pregão",
    bullets: [
      "📡 VIX, DXY, S&P 500, DOW, NASDAQ, EWZ",
      "🪙 Ouro, Petróleo, BTC e DI Futuro B3",
      "🌍 ADRs brasileiras · commodities · cripto",
      "💱 Região do dólar e probabilidade do índice",
    ],
    overlayFrom: "rgba(3,18,40,0.0)",
    overlayTo:   "rgba(3,18,40,0.88)",
    objPos: "top left",
  },
  {
    id: "ir",
    img: `${PUB}/images/banner-ir.png`,
    tag: "IR · DARF",
    tagColor: "#f87171",
    tagBg: "linear-gradient(90deg,#991b1b,#dc2626)",
    titulo: "Imposto de Renda Automatizado",
    subtitulo: "Calcule, gere e pague sua DARF sem sair da plataforma",
    bullets: [
      "🧮 Cálculo automático de IR · multas · juros",
      "📄 DARF 6015 e Carnê-Leão 0190 prontos",
      "📑 Relatório mensal e anual completo",
      "♻️ Compensação automática de prejuízos",
    ],
    overlayFrom: "rgba(10,2,2,0.0)",
    overlayTo:   "rgba(10,2,2,0.88)",
    objPos: "top left",
  },
  {
    id: "preMercado",
    img: `${PUB}/images/banner-preMercado.png`,
    tag: "PLANO DE TRADE",
    tagColor: "#2dd4bf",
    tagBg: "linear-gradient(90deg,#065f46,#059669)",
    titulo: "Pré-Mercado Estruturado",
    subtitulo: "Prepare sua mente e seu plano antes de abrir a primeira ordem",
    bullets: [
      "📋 Pré-mercado com análise de contexto do dia",
      "🎯 Oportunidades com filtros e avaliação técnica",
      "🌙 Pós-mercado: revisão e lições aprendidas",
      "🔔 Registro do trade de abertura para estudo",
    ],
    overlayFrom: "rgba(2,10,8,0.0)",
    overlayTo:   "rgba(2,10,8,0.88)",
    objPos: "top left",
  },
  {
    id: "grafico",
    img: `${PUB}/images/banner-grafico.png`,
    tag: "GRÁFICO PRO",
    tagColor: "#a78bfa",
    tagBg: "linear-gradient(90deg,#4c1d95,#7c3aed)",
    titulo: "Gráfico TradingView Integrado",
    subtitulo: "Análise técnica profissional sem sair da plataforma",
    bullets: [
      "📊 WIN, WDO · índices · forex · cripto · metais",
      "📐 EMA 9 · SMA 20/50/200 · EMA 200 · VWAP",
      "⏱️ Timeframes de 1 min até Semanal",
      "📸 Print direto no Plano de Trade",
    ],
    overlayFrom: "rgba(5,2,15,0.0)",
    overlayTo:   "rgba(5,2,15,0.88)",
    objPos: "top left",
  },
  {
    id: "ia",
    img: null,
    tag: "INTELIGÊNCIA ARTIFICIAL",
    tagColor: "#c084fc",
    tagBg: "linear-gradient(90deg,#581c87,#9333ea)",
    titulo: "Análise do seu Trading por IA",
    subtitulo: "O que a IA revela sobre o seu desempenho real",
    bullets: [
      "🧠 Relatório: operacional · emocional · risco",
      "🎯 Assertividade e pontos críticos de melhoria",
      "💼 Avaliação real do seu gerenciamento",
      "🧘 Psicológico: disciplina, paciência, controle",
    ],
    bgCss: "linear-gradient(135deg, #0f0520 0%, #2d0960 40%, #1a0535 70%, #0d0420 100%)",
    objPos: "top left",
  },
  {
    id: "analytics",
    img: null,
    tag: "ANÁLISE OPERACIONAL",
    tagColor: "#fb923c",
    tagBg: "linear-gradient(90deg,#78350f,#d97706)",
    titulo: "Análise Baseada nos Seus Trades",
    subtitulo: "Dados reais para evoluir com consistência",
    bullets: [
      "✅ Taxa de acerto · risco/retorno · maiores gains",
      "📓 Estratégia, sentimento e erros por operação",
      "📈 Gráfico de evolução do patrimônio R$ e USD",
      "🔍 Filtros por ativo, data e resultado",
    ],
    bgCss: "linear-gradient(135deg, #1a0800 0%, #5c2800 40%, #2a1000 70%, #120500 100%)",
    objPos: "top left",
  },
  {
    id: "risco",
    img: `${PUB}/images/banner-risco.png`,
    tag: "GESTÃO DE RISCO PROFISSIONAL",
    tagColor: "#60a5fa",
    tagBg: "linear-gradient(90deg,#1e3a8a,#2563eb)",
    titulo: "Nunca mais entre em uma operação sem calcular o risco",
    subtitulo: "A ferramenta que separa o trader amador do trader profissional",
    bullets: [
      "🏛️ Capital próprio e mesa proprietária com regras diferentes",
      "📏 Risco em % do capital · em pontos · e em valor financeiro (R$)",
      "🎯 Cálculo automático de lotes para WIN, WDO e qualquer ativo",
      "⚠️ Limites de perda diária, semanal e mensal configuráveis",
      "💾 Crie múltiplos planos de risco e alterne conforme o mercado",
      "🔒 Proteja seu capital antes de cada entrada — sempre",
    ],
    overlayFrom: "rgba(2,5,20,0.0)",
    overlayTo:   "rgba(2,5,20,0.92)",
    objPos: "top left",
  },
];

const ALTURA = 580; // px — 50% maior que antes

function SlideComImagem({ slide, fading }) {
  return (
    <div style={{
      position: "relative",
      borderRadius: 14,
      overflow: "hidden",
      height: ALTURA,
      border: "1px solid #1e1e1e",
      boxShadow: "0 8px 48px #000a",
      opacity: fading ? 0 : 1,
      transform: fading ? "scale(0.985)" : "scale(1)",
      transition: "opacity 0.35s ease, transform 0.35s ease",
    }}>
      <img
        src={slide.img}
        alt={slide.titulo}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: slide.objPos || "top left",
          display: "block",
        }}
        onError={e => { e.target.style.display = "none"; }}
      />
      {/* Gradiente: transparente em cima, escuro em baixo */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(to bottom,
          ${slide.overlayFrom} 0%,
          transparent 25%,
          transparent 35%,
          ${slide.overlayTo} 65%
        )`,
        pointerEvents: "none",
      }} />
      {/* Texto */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        padding: "24px 32px 28px",
      }}>
        <div style={{
          display: "inline-block",
          background: slide.tagBg,
          color: "#fff",
          fontSize: 9,
          fontWeight: 900,
          padding: "3px 14px",
          borderRadius: 999,
          letterSpacing: 1.5,
          marginBottom: 10,
          boxShadow: "0 2px 8px #0006",
        }}>
          {slide.tag}
        </div>
        <div style={{
          fontSize: 22,
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1.2,
          marginBottom: 6,
          textShadow: "0 2px 12px #000b",
        }}>
          {slide.titulo}
        </div>
        <div style={{
          fontSize: 12.5,
          color: slide.tagColor,
          fontWeight: 600,
          marginBottom: 14,
          textShadow: "0 1px 4px #0009",
        }}>
          {slide.subtitulo}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 18px" }}>
          {slide.bullets.map((b, i) => (
            <div key={i} style={{
              color: "rgba(255,255,255,0.88)",
              fontSize: 11.5,
              textShadow: "0 1px 4px #000a",
            }}>
              {b}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideCSS({ slide, fading }) {
  const isIA = slide.id === "ia";
  return (
    <div style={{
      borderRadius: 14,
      overflow: "hidden",
      height: ALTURA,
      background: slide.bgCss,
      position: "relative",
      border: "1px solid #1e1e1e",
      boxShadow: "0 8px 48px #000a",
      opacity: fading ? 0 : 1,
      transform: fading ? "scale(0.985)" : "scale(1)",
      transition: "opacity 0.35s ease, transform 0.35s ease",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
    }}>
      {/* Brilho decorativo */}
      <div style={{
        position: "absolute", top: -80, right: -80,
        width: 360, height: 360, borderRadius: "50%",
        background: `radial-gradient(circle, ${slide.tagColor}25 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      {/* Visual central */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "55%",
      }}>
        {isIA ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 70, marginBottom: 18, filter: "drop-shadow(0 0 24px #c084fc88)" }}>🤖</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", maxWidth: 420, margin: "0 auto" }}>
              {["Disciplina 94%","Risco/Retorno 87%","Assertividade 71%","Psicológico 88%"].map((m, i) => (
                <div key={i} style={{
                  background: "#ffffff10", border: "1px solid #c084fc44",
                  borderRadius: 10, padding: "7px 16px",
                  fontSize: 12, color: "#c084fc", fontWeight: 700,
                }}>{m}</div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 70, marginBottom: 18, filter: "drop-shadow(0 0 24px #fb923c88)" }}>📊</div>
            <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
              {[
                { label: "Taxa Acerto", value: "68%",     color: "#4ade80" },
                { label: "R/R Médio",   value: "1:2.4",  color: "#fb923c" },
                { label: "Total Ops",   value: "142",    color: "#60a5fa" },
                { label: "Resultado",   value: "+R$14k", color: "#4ade80" },
              ].map((s, i) => (
                <div key={i} style={{
                  background: "#ffffff08", border: "1px solid #fb923c22",
                  borderRadius: 12, padding: "12px 18px", textAlign: "center", minWidth: 80,
                }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Texto inferior */}
      <div style={{ padding: "24px 32px 28px", position: "relative", zIndex: 1 }}>
        <div style={{
          display: "inline-block", background: slide.tagBg,
          color: "#fff", fontSize: 9, fontWeight: 900,
          padding: "3px 14px", borderRadius: 999, letterSpacing: 1.5, marginBottom: 10,
        }}>{slide.tag}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>{slide.titulo}</div>
        <div style={{ fontSize: 12.5, color: slide.tagColor, fontWeight: 600, marginBottom: 14 }}>{slide.subtitulo}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 18px" }}>
          {slide.bullets.map((b, i) => (
            <div key={i} style={{ color: "rgba(255,255,255,0.85)", fontSize: 11.5 }}>{b}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BannerCarousel() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef(null);

  const goTo = (idx) => {
    if (fading || idx === current) return;
    setFading(true);
    setTimeout(() => { setCurrent(idx); setFading(false); }, 350);
  };

  const next = () => goTo((current + 1) % SLIDES.length);
  const prev = () => goTo((current - 1 + SLIDES.length) % SLIDES.length);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => { setCurrent(c => (c + 1) % SLIDES.length); setFading(false); }, 350);
    }, 6000);
  };

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, []);

  const slide = SLIDES[current];

  return (
    <div style={{ width: "100%", userSelect: "none" }}>
      {/* Slide */}
      <div style={{ position: "relative" }}>
        {slide.img
          ? <SlideComImagem slide={slide} fading={fading} />
          : <SlideCSS slide={slide} fading={fading} />
        }
        {/* Seta esquerda */}
        <button onClick={() => { prev(); resetTimer(); }} style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          background: "rgba(0,0,0,0.60)", border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: "50%", width: 38, height: 38, cursor: "pointer",
          color: "#fff", fontSize: 22, display: "flex", alignItems: "center",
          justifyContent: "center", backdropFilter: "blur(6px)", zIndex: 10, lineHeight: 1,
        }}>‹</button>
        {/* Seta direita */}
        <button onClick={() => { next(); resetTimer(); }} style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "rgba(0,0,0,0.60)", border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: "50%", width: 38, height: 38, cursor: "pointer",
          color: "#fff", fontSize: 22, display: "flex", alignItems: "center",
          justifyContent: "center", backdropFilter: "blur(6px)", zIndex: 10, lineHeight: 1,
        }}>›</button>
      </div>

      {/* Dots */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14 }}>
        <button onClick={() => { prev(); resetTimer(); }} style={{
          background: "#1a1a1a", border: "1px solid #333", borderRadius: "50%",
          width: 28, height: 28, cursor: "pointer", color: "#777", fontSize: 15,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>‹</button>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => { goTo(i); resetTimer(); }} style={{
              width: i === current ? 26 : 7, height: 7, borderRadius: 999,
              background: i === current ? slide.tagColor : "#2a2a2a",
              border: "none", cursor: "pointer", padding: 0,
              transition: "width 0.35s, background 0.35s",
            }} />
          ))}
        </div>
        <button onClick={() => { next(); resetTimer(); }} style={{
          background: "#1a1a1a", border: "1px solid #333", borderRadius: "50%",
          width: 28, height: 28, cursor: "pointer", color: "#777", fontSize: 15,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>›</button>
      </div>
      <div style={{ textAlign: "center", marginTop: 6, fontSize: 10, color: "#3a3a3a", letterSpacing: 0.5 }}>
        <span style={{ color: slide.tagColor, fontWeight: 700 }}>{current + 1}</span>
        {" / "}{SLIDES.length}
        {" · "}{slide.tag}
      </div>
    </div>
  );
}
