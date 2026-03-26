// api/economic-calendar.js
// Fonte primária: Forex Factory JSON (nfs.faireconomy.media)
// Fallback: cdn-nfs.faireconomy.media

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
    const d = new Date(dateStr);
    const br = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    return br.toISOString().slice(0, 10) === hoje;
  } catch { return false; }
}

const HEADERS_LISTA = [
  {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
    "Referer": "https://www.forexfactory.com/",
    "Origin": "https://www.forexfactory.com",
    "Cache-Control": "no-cache",
  },
  {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.forexfactory.com/calendar",
  },
];

const URLS_THISWEEK = [
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json?timezone=America%2FSao_Paulo",
  "https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json?timezone=America%2FSao_Paulo",
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
];
const URLS_NEXTWEEK = [
  "https://nfs.faireconomy.media/ff_calendar_nextweek.json?timezone=America%2FSao_Paulo",
  "https://cdn-nfs.faireconomy.media/ff_calendar_nextweek.json?timezone=America%2FSao_Paulo",
];

async function tentarFetch(urls) {
  for (const url of urls) {
    for (const headers of HEADERS_LISTA) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timer);
        if (!resp.ok) continue;
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) return data;
      } catch (_) { /* tenta próximo */ }
    }
  }
  return [];
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
  if (req.method === "OPTIONS") return res.status(200).end();

  const hoje = dataBrasil();

  try {
    const [thisWeek, nextWeek] = await Promise.all([
      tentarFetch(URLS_THISWEEK),
      tentarFetch(URLS_NEXTWEEK),
    ]);

    const raw = [...thisWeek, ...nextWeek];

    if (raw.length === 0) {
      return res.status(502).json({ ok: false, error: "Calendário econômico indisponível no momento. Tente novamente em alguns minutos." });
    }

    const filtrados = raw.filter((e) => {
      const pais   = (e.country || "").toUpperCase();
      const nome   = (e.title   || "").toLowerCase();
      const impact = (e.impact  || "").toLowerCase();

      if (!eHoje(e.date, hoje)) return false;
      if (impact !== "high" && impact !== "medium") return false;

      // BRL: todos os eventos de alto/médio impacto entram (sem filtro de keyword)
      if (pais === "BRL") return true;
      if (pais === "USD") return FILTRO_USD.some(k => nome.includes(k));
      return false;
    });

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
        actual, previous, forecast, impacto, news_signal,
      };
    });

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
