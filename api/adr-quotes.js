// api/adr-quotes.js
// Cotações ADRs via Yahoo Finance v8/chart (mesmo endpoint do gráfico — sem auth)
const SYMBOLS = ["BOLSY", "BBD", "VALE", "ITUB", "PBR", "BDORY"];

const NOMES = {
  BOLSY: "B3 SA",
  BBD:   "Bradesco",
  VALE:  "Vale",
  ITUB:  "Itaú",
  PBR:   "Petrobras",
  BDORY: "Banco do Brasil",
};

async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d&includePrePost=false`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
  });
  if (!resp.ok) throw new Error(`YF ${symbol}: ${resp.status}`);
  const json = await resp.json();
  const meta = json?.chart?.result?.[0]?.meta || {};
  return {
    symbol,
    nome:     NOMES[symbol] || symbol,
    ultimo:   meta.regularMarketPrice        ?? null,
    anterior: meta.chartPreviousClose ?? meta.previousClose ?? null,
    abertura: meta.regularMarketOpen         ?? null,
    maxima:   meta.regularMarketDayHigh      ?? null,
    minima:   meta.regularMarketDayLow       ?? null,
    volume:   meta.regularMarketVolume       ?? null,
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const results = await Promise.all(SYMBOLS.map(fetchQuote));

    const data = results.map(r => {
      const variacao = r.ultimo != null && r.anterior != null ? r.ultimo - r.anterior : null;
      const varPct   = r.anterior != null && r.anterior !== 0 ? (variacao / r.anterior) * 100 : null;
      return { ...r, variacao, varPct };
    });

    return res.json({ ok: true, data, ts: Date.now() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
