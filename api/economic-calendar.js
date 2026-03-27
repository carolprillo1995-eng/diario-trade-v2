// api/economic-calendar.js
// Fonte 1: Forex Factory (nfs.faireconomy.media)
// Fonte 2: TradingView Economic Calendar (fallback)

const FILTRO_USD = [
  "gdp", "jobless claims", "unemployment claims",
  "ism manufacturing", "ism services", "ism non-manufacturing",
  "nonfarm", "non-farm", "fomc", "fed", "interest rate",
  "consumer confidence", "retail sales", "cpi", "inflation",
  "pce", "durable goods",
];

const INVERSOS = [
  "unemployment", "jobless claims", "unemployment claims", "cpi", "inflation", "ipca", "igp",
];

function dataBrasil() {
  const agora = new Date();
  const br = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return br.toISOString().slice(0, 10);
}

function toHoraBrasil(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return null; }
}

function eHoje(dateStr, hoje) {
  if (!dateStr) return false;
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
      === new Date(hoje + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch { return false; }
}

async function fetchComTimeout(url, options = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal });
    return r;
  } finally {
    clearTimeout(t);
  }
}

// ── Fonte 1: Forex Factory ──────────────────────────────────────────────────
async function fetchForexFactory(hoje) {
  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, */*",
    "Referer": "https://www.forexfactory.com/",
    "Origin": "https://www.forexfactory.com",
  };
  const urls = [
    "https://nfs.faireconomy.media/ff_calendar_thisweek.json?timezone=America%2FSao_Paulo",
    "https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json?timezone=America%2FSao_Paulo",
    "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  ];
  for (const url of urls) {
    try {
      const r = await fetchComTimeout(url, { headers: HEADERS });
      if (!r.ok) continue;
      const data = await r.json();
      if (!Array.isArray(data) || data.length === 0) continue;
      return data.filter(e => eHoje(e.date, hoje) && (e.country === "BRL" || e.country === "USD"))
        .map(e => ({
          evento:     e.title    || "—",
          pais:       e.country  || "—",
          horario:    e.date     || null,
          horaBrasil: toHoraBrasil(e.date),
          actual:     e.actual   && e.actual   !== "" ? parseFloat(e.actual.replace(/[^0-9.\-]/g, ""))   : null,
          previous:   e.previous && e.previous !== "" ? parseFloat(e.previous.replace(/[^0-9.\-]/g, "")) : null,
          forecast:   e.forecast && e.forecast !== "" ? parseFloat(e.forecast.replace(/[^0-9.\-]/g, "")) : null,
          impacto:    (e.impact  || "").toLowerCase() === "high" ? "alto" : "medio",
        }));
    } catch (_) {}
  }
  return null;
}

// ── Fonte 2: TradingView Economic Calendar ──────────────────────────────────
async function fetchTradingView(hoje) {
  try {
    const from = hoje + "T00:00:00.000Z";
    const to   = hoje + "T23:59:59.000Z";
    const url  = `https://economic-calendar.tradingview.com/events?from=${from}&to=${to}&countries=BRL,USD`;
    const r = await fetchComTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Origin": "https://www.tradingview.com",
        "Referer": "https://www.tradingview.com/",
      },
    });
    if (!r.ok) return null;
    const json = await r.json();
    const evs = json?.result || json?.data || json || [];
    if (!Array.isArray(evs) || evs.length === 0) return null;

    return evs
      .filter(e => {
        const imp = (e.importance || e.impact || 0);
        return imp >= 1; // 1=medium, 2=high no TV
      })
      .map(e => ({
        evento:     e.title    || e.name || "—",
        pais:       e.country  || "—",
        horario:    e.date     || e.datetime || null,
        horaBrasil: toHoraBrasil(e.date || e.datetime),
        actual:     e.actual   != null ? parseFloat(e.actual)   : null,
        previous:   e.previous != null ? parseFloat(e.previous) : null,
        forecast:   e.estimate != null ? parseFloat(e.estimate) : null,
        impacto:    (e.importance || e.impact || 0) >= 2 ? "alto" : "medio",
      }));
  } catch (_) {
    return null;
  }
}

// ── Enriquece com news_signal ───────────────────────────────────────────────
function enriquecer(evs) {
  return evs.map(e => {
    const nome = (e.evento || "").toLowerCase();
    let news_signal = null;
    if (e.actual != null && e.previous != null && e.actual !== e.previous) {
      const inverso = INVERSOS.some(inv => nome.includes(inv));
      news_signal = inverso
        ? (e.actual < e.previous ? "compra" : "venda")
        : (e.actual > e.previous ? "compra" : "venda");
    }
    return { ...e, news_signal };
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  const hoje = dataBrasil();

  try {
    // Tenta Forex Factory primeiro, depois TradingView
    let evs = await fetchForexFactory(hoje);
    let fonte = "ForexFactory";

    if (!evs || evs.length === 0) {
      evs = await fetchTradingView(hoje);
      fonte = "TradingView";
    }

    if (!evs || evs.length === 0) {
      return res.status(502).json({ ok: false, error: "Calendário econômico indisponível no momento. Tente novamente em alguns minutos." });
    }

    // Filtra USD por keyword, BRL entra tudo
    const filtrados = evs.filter(e => {
      const pais = (e.pais || "").toUpperCase();
      const nome = (e.evento || "").toLowerCase();
      if (pais === "BRL") return true;
      if (pais === "USD") return FILTRO_USD.some(k => nome.includes(k));
      return false;
    });

    // Ordena: BRL primeiro, depois por horário
    filtrados.sort((a, b) => {
      const aIsBRL = (a.pais || "").toUpperCase() === "BRL";
      const bIsBRL = (b.pais || "").toUpperCase() === "BRL";
      if (aIsBRL && !bIsBRL) return -1;
      if (!aIsBRL && bIsBRL) return 1;
      return new Date(a.horario || 0) - new Date(b.horario || 0);
    });

    return res.json({ ok: true, date: hoje, fonte, eventos: enriquecer(filtrados) });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
