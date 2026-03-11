/* eslint-disable no-unused-vars */

import React, { useState, useEffect } from "react";

export function CotacoesPainel({ t, darkMode }) {
  const [cotacoes, setCotacoes] = useState({});
  const [carregando, setCarregando] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const [autoAtualizando, setAutoAtualizando] = useState(false);

  const ATIVOS = {
    VIX: { nome: "Volatilidade S&P 500", tipo: "Índice" },
    FEF1: { nome: "Futuros Fed Fund", tipo: "Futuro" },
    DXY: { nome: "Índice Dólar", tipo: "Índice" },
    CL1: { nome: "Petróleo Bruto", tipo: "Commodity" },
  };

  // Buscar cotações
  const buscarCotacoes = async () => {
    setCarregando(true);
    try {
      const response = await fetch("http://localhost:5000/api/cotacoes");
      const dados = await response.json();

      if (!dados.erro) {
        setCotacoes(dados);
        setUltimaAtualizacao(new Date().toLocaleTimeString("pt-BR"));
      }
    } catch (error) {
      console.error("Erro ao buscar cotações:", error);
    }
    setCarregando(false);
  };

 // Auto-atualização
useEffect(() => {
  if (autoAtualizando) {
    const intervalo = setInterval(buscarCotacoes, 30000); // 30 segundos
    return () => clearInterval(intervalo);
  }
}, [autoAtualizando]);

  const formatarVariacao = (valor) => {
    const num = parseFloat(valor);
    return num > 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`;
  };

  const ehPositivo = (valor) => parseFloat(valor) > 0;

  return (
    <div style={{ width: "100%", marginBottom: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 15,
          paddingBottom: 10,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <h3 style={{ color: t.accent, fontSize: 16, fontWeight: 700, margin: 0 }}>
          📊 Cotações ao Vivo
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={buscarCotacoes}
            disabled={carregando}
            style={{
              background: t.accent,
              color: "#fff",
              border: "none",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              opacity: carregando ? 0.6 : 1,
            }}
          >
            {carregando ? "⏳" : "🔄"} Atualizar
          </button>

          <button
            onClick={() => setAutoAtualizando(!autoAtualizando)}
            style={{
              background: autoAtualizando ? "#22c55e" : t.border,
              color: autoAtualizando ? "#fff" : t.text,
              border: "none",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {autoAtualizando ? "⏹️" : "⏱️"} Auto
          </button>
        </div>
      </div>

      {/* Grid de Cotações */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 15,
        }}
      >
        {Object.entries(ATIVOS).map(([simbolo, info]) => {
          const dado = cotacoes[simbolo];
          const variacao = dado ? parseFloat(dado.variacao || 0) : 0;
          const positivo = variacao > 0;

          return (
            <div
              key={simbolo}
              style={{
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: 12,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = t.accent;
                e.currentTarget.style.boxShadow = `0 0 12px ${t.accent}44`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = t.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Símbolo e Tipo */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14, color: t.accent }}>
                  {simbolo}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: t.muted,
                    background: t.input,
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {info.tipo}
                </span>
              </div>

              {/* Nome */}
              <div style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>
                {info.nome}
              </div>

              {/* Preço */}
              {dado ? (
                <>
                  <div style={{ fontSize: 18, fontWeight: 800, color: t.text, marginBottom: 6 }}>
                    {dado.preço}
                  </div>

                  {/* Variação */}
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: positivo ? "#22c55e" : "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>{positivo ? "📈" : "📉"}</span>
                    <span>{formatarVariacao(dado.variacao)}</span>
                  </div>

                  {/* Barra de progresso */}
                  <div
                    style={{
                      marginTop: 8,
                      height: 3,
                      background: t.border,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: positivo ? "#22c55e" : "#ef4444",
                        width: `${Math.min(Math.abs(variacao) * 10, 100)}%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic" }}>
                  Aguardando dados...
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Última Atualização */}
      {ultimaAtualizacao && (
        <div style={{ fontSize: 11, color: t.muted, textAlign: "right" }}>
          ✅ Atualizado às {ultimaAtualizacao}
        </div>
      )}
    </div>
  );
}