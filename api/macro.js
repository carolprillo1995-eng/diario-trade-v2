/**
 * Vercel Serverless Function — /api/macro
 * Fontes: TradingView Scanner API (primário) → Investing.com (fallback)
 * Sem Yahoo Finance.
 */

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ── TradingView Scanner API ──────────────────────────────────────────────────
// A mesma API usada internamente pelo site do TradingView.
// Chamada servidor→servidor: sem CORS.
async function tvScan(ticker, screener = "cfd") {
  const r = await fetch(`https://scanner.tradingview.com/${screener}/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":   UA,
      "Origin":       "https://www.tradingview.com",
      "Referer":      "https://www.tradingview.com/",
    },
    body: JSON.stringify({
      symbols: { tickers: [ticker], query: { types: [] } },
      columns: ["close", "open", "change", "change_abs"],
    }),
    signal: AbortSignal.timeout(10000),
  });

  const row = (await r.json())?.data?.[0]?.d;
  if (!row || row[0] == null) throw new Error("sem dados");

  const close    = parseFloat(row[0]);
  const open_    = parseFloat(row[1]) || close;
  const pct      = parseFloat(row[2]) ?? 0;
  const variacao = parseFloat(row[3]) ?? (close - open_);

  return {
    preco:    +close.toFixed(2),
    variacao: +variacao.toFixed(2),
    percent:  +pct.toFixed(2),
    fonte:    `TV:${ticker}`,
  };
}

// ── Investing.com API ────────────────────────────────────────────────────────
// API interna usada pelo site investing.com.
// IDs dos ativos (pairId do Investing.com):
//   VIX:          44336
//   Dollar Index: 8066
//   Iron Ore SGX: 961352   (SGX Iron Ore 62% CFR Futures)
//   WTI Oil:      8849
//   S&P 500:      166
async function investingQuote(pairId, nome) {
  const r = await fetch(
    `https://api.investing.com/api/financialdata/${pairId}/historical/chart/?period=P1D&interval=PT5M&pointscount=3`,
    {
      headers: {
        "User-Agent": UA,
        "domain-id":  "www.investing.com",
        "Origin":     "https://www.investing.com",
        "Referer":    "https://www.investing.com/",
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  const chart = (await r.json())?.data?.chart;
  if (!chart?.length) throw new Error("sem chart");

  // formato: [timestamp, open, high, low, close, volume]
  const last     = chart[chart.length - 1];
  const prev     = chart.length > 1 ? chart[chart.length - 2] : last;
  const close    = parseFloat(last[4]);
  const prevClose= parseFloat(prev[4]);
  if (!close || close <= 0) throw new Error("preço inválido");

  const variacao = close - prevClose;
  const pct      = prevClose ? (variacao / prevClose * 100) : 0;

  return {
    preco:    +close.toFixed(2),
    variacao: +variacao.toFixed(2),
    percent:  +pct.toFixed(2),
    fonte:    `INV:${nome}`,
  };
}

// ── Busca com fallback TV → Investing ────────────────────────────────────────
async function fetch_asset({ tvTicker, tvScreener = "cfd", invId, invNome }) {
  // 1. TradingView
  try {
    const res = await tvScan(tvTicker, tvScreener);
    if (res?.preco) return res;
  } catch (_) {}

  // 2. Investing.com
  if (invId) {
    try {
      const res = await investingQuote(invId, invNome || tvTicker);
      if (res?.preco) return res;
    } catch (_) {}
  }

  return null;
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");

  const ativos = {
    minerio:  { tvTicker: "SGX:FEF1!",       tvScreener: "cfd",     invId: 961352, invNome: "Iron Ore SGX" },
    vix:      { tvTicker: "CBOE:VIX",         tvScreener: "america", invId: 44336,  invNome: "VIX" },
    dxy:      { tvTicker: "TVC:DXY",          tvScreener: "cfd",     invId: 8066,   invNome: "DXY" },
    petroleo: { tvTicker: "TVC:USOIL",        tvScreener: "cfd",     invId: 8849,   invNome: "WTI Oil" },
    sp500:    { tvTicker: "SP:SPX",           tvScreener: "america", invId: 166,    invNome: "S&P 500" },
    us30:     { tvTicker: "DJ:DJI",            tvScreener: "america", invId: 169,    invNome: "US30" },
    ewz:      { tvTicker: "AMEX:EWZ",         tvScreener: "america", invId: null,   invNome: "EWZ" },
    nasdaq:   { tvTicker: "NASDAQ:NDX",       tvScreener: "america", invId: 13754,  invNome: "Nasdaq 100" },
    ouro:     { tvTicker: "TVC:GOLD",         tvScreener: "cfd",     invId: 8830,   invNome: "Ouro" },
  };

  const results = await Promise.allSettled(
    Object.entries(ativos).map(([, cfg]) => fetch_asset(cfg))
  );

  const keys = Object.keys(ativos);
  const out  = {};
  results.forEach((r, i) => { out[keys[i]] = r.status === "fulfilled" ? r.value : null; });

  res.json(out);
}
