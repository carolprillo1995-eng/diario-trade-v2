// api/economic-calendar.js
// Fonte: Forex Factory JSON (nfs.faireconomy.media) — público, sem API key
// Filtra eventos relevantes do Brasil (BRL) e EUA (USD)

// Palavras-chave dos eventos que interessam
const FILTRO_BRL = [
  "retail sales", "ibc-br", "gdp", "cpi", "inflation", "pmi",
  "unemployment", "services", "ipca", "igp",
];
const FILTRO_USD = [
  "gdp", "jobless claims", "unemployment claims",
  "ism manufacturing", "ism services", "ism non-manufacturing",
];

// Indicadores onde valor MENOR = melhor (sinal invertido)
const INVERSOS = [
  "unemployment", "jobless claims", "unemployment claims", "cpi", "inflation", "ipca", "igp",
];

// Data atual no fuso Brasil (GMT-3)
function dataBrasil() {
  const agora = new Date();
  const br = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return br.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// Converter data do evento para horário de Brasília
function toHoraBrasil(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return null; }
}

// Verificar se o evento é do dia de hoje (Brasil)
function eHoje(dateStr, hoje) {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const br = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    return br.toISOString().slice(0, 10) === hoje;
  } catch { return false; }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  const hoje = dataBrasil();

  try {
    // Tenta semana atual; se não houver eventos hoje, tenta próxima semana
    const urls = [
      "https://nfs.faireconomy.media/ff_calendar_thisweek.json?timezone=America%2FSao_Paulo",
      "https://nfs.faireconomy.media/ff_calendar_nextweek.json?timezone=America%2FSao_Paulo",
    ];

    let raw = [];
    for (const url of urls) {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TradeVision/1.0)",
          "Accept": "application/json",
          "Referer": "https://www.forexfactory.com/",
        },
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      if (Array.isArray(data)) raw = raw.concat(data);
    }

    if (raw.length === 0) {
      return res.status(502).json({ ok: false, error: "Fonte indisponível no momento" });
    }

    // ── Filtrar: apenas hoje + países relevantes + impacto Alto + eventos da lista ──
    const filtrados = raw.filter((e) => {
      const pais   = (e.country || "").toUpperCase();
      const nome   = (e.title   || "").toLowerCase();
      const impact = (e.impact  || "").toLowerCase();

      if (!eHoje(e.date, hoje)) return false;
      if (impact !== "high" && impact !== "medium") return false;

      if (pais === "BRL") return FILTRO_BRL.some(k => nome.includes(k));
      if (pais === "USD") return FILTRO_USD.some(k => nome.includes(k));
      return false;
    });

    // ── Enriquecer com news_signal ────────────────────────────────────────
    const enriquecidos = filtrados.map((e) => {
      const nome     = (e.title || "").toLowerCase();
      const actual   = e.actual   && e.actual   !== "" ? parseFloat(e.actual.replace(/[^0-9.\-]/g, ""))   : null;
      const previous = e.previous && e.previous !== "" ? parseFloat(e.previous.replace(/[^0-9.\-]/g, "")) : null;
      const forecast = e.forecast && e.forecast !== "" ? parseFloat(e.forecast.replace(/[^0-9.\-]/g, "")) : null;
      const impacto  = (e.impact || "").toLowerCase() === "high" ? "alto" : "medio";

      let news_signal = null;
      if (actual != null && previous != null && actual !== previous) {
        const inverso = INVERSOS.some(inv => nome.includes(inv));
        news_signal = inverso
          ? (actual < previous ? "compra" : "venda")
          : (actual > previous ? "compra" : "venda");
      }

      return {
        evento:      e.title   || "—",
        pais:        e.country || "—",
        horario:     e.date    || null,
        horaBrasil:  toHoraBrasil(e.date),
        actual,
        previous,
        forecast,
        impacto,
        news_signal,
      };
    });

    // ── Ordenar: BRL primeiro (prioridade 09:00), depois USD ─────────────
    enriquecidos.sort((a, b) => {
      if (a.pais === "BRL" && b.pais !== "BRL") return -1;
      if (a.pais !== "BRL" && b.pais === "BRL") return 1;
      return new Date(a.horario) - new Date(b.horario);
    });

    return res.json({ ok: true, date: hoje, eventos: enriquecidos });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
