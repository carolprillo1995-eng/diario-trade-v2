// api/correlacao.js
// Retorna o resultado da correlação para o robô Profit Pro

const SUPABASE_URL     = "https://qqgoojzlhczfexqlgvpe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxZ29vanpsaGN6ZmV4cWxndnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODM0ODQsImV4cCI6MjA4ODI1OTQ4NH0.C_rElTl676HaMHzkrJMPAkcm58edODGSJzvpu4xaDa0";

export default async function handler(req, res) {
  // CORS — permite chamada do Python
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    // Buscar cotações do Supabase
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/cotacoes_global?id=eq.1&select=dados`,
      {
        headers: {
          apikey:        SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!resp.ok) {
      return res.status(500).json({ ok: false, error: "Falha Supabase" });
    }

    const rows = await resp.json();
    const dados = rows?.[0]?.dados;

    if (!dados) {
      return res.status(200).json({ ok: false, error: "Sem dados", resultado: 0, zona: "neutro" });
    }

    // Extrair percentuais
    const vix     = dados.VIX?.change  ?? null;
    const oleo    = dados.OIL?.change  ?? null;
    const minerio = dados.IRON?.change ?? null;

    if (vix === null || oleo === null || minerio === null) {
      return res.status(200).json({ ok: false, error: "Dados incompletos", resultado: 0, zona: "neutro" });
    }

    // Fórmula igual ao site
    const resultado = minerio + oleo + (-vix);

    let zona, sinal;
    if (resultado > 2)       { zona = "alta";   sinal = 1;  }
    else if (resultado < -2) { zona = "baixa";  sinal = -1; }
    else                     { zona = "neutro"; sinal = 0;  }

    return res.status(200).json({
      ok: true,
      resultado: +resultado.toFixed(2),
      zona,
      sinal,          // 1=compra, -1=venda, 0=neutro
      vix:     +vix.toFixed(2),
      petroleo:+oleo.toFixed(2),
      minerio: +minerio.toFixed(2),
      horario: new Date().toISOString(),
    });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message, resultado: 0, zona: "neutro" });
  }
}
