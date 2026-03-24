// API serverless — busca dados OHLCV do Yahoo Finance para o Lightweight Charts
const YF_SYMBOL = {
  // Futuros BR
  WINFUT: '^BVSP', WDOFUT: 'BRL=X',
  // Índices globais
  US30: '^DJI', US100: '^NDX', US500: '^GSPC', US2000: '^RUT',
  GER40: '^GDAXI', UK100: '^FTSE', FR40: '^FCHI', EU50: '^STOXX50E',
  SPA35: '^IBEX', ITA40: 'FTSEMIB.MI',
  HK50: '^HSI', JP225: '^N225', CN50: '000016.SS', AUS200: '^AXJO',
  JPN225: '^N225',
  // Forex Major
  EURUSD: 'EURUSD=X', USDJPY: 'USDJPY=X', GBPUSD: 'GBPUSD=X',
  USDCHF: 'USDCHF=X', AUDUSD: 'AUDUSD=X', USDCAD: 'USDCAD=X', NZDUSD: 'NZDUSD=X',
  // Forex Minor
  EURGBP: 'EURGBP=X', EURJPY: 'EURJPY=X', GBPJPY: 'GBPJPY=X',
  EURCHF: 'EURCHF=X', AUDJPY: 'AUDJPY=X', CADJPY: 'CADJPY=X', CHFJPY: 'CHFJPY=X',
  EURCAD: 'EURCAD=X', GBPAUD: 'GBPAUD=X', EURAUD: 'EURAUD=X', NZDJPY: 'NZDJPY=X',
  // Cripto
  BTCUSD: 'BTC-USD', ETHUSD: 'ETH-USD', LTCUSD: 'LTC-USD', XRPUSD: 'XRP-USD', SOLUSD: 'SOL-USD', BCHUSD: 'BCH-USD',
  // Metais
  XAUUSD: 'GC=F', XAGUSD: 'SI=F', XPTUSD: 'PL=F',
  // Energia
  USOIL: 'CL=F', UKOIL: 'BZ=F', NATGAS: 'NG=F',
};

const INTERVAL_MAP = { '1':'1m', '2':'2m', '5':'5m', '15':'15m', '60':'60m', 'D':'1d' };
const RANGE_MAP    = { '1':'1d', '2':'5d', '5':'5d', '15':'60d', '60':'60d', 'D':'2y' };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const { symbol = 'WINFUT', interval = '5' } = req.query;
  const yfSym      = YF_SYMBOL[symbol] || '^BVSP';
  const yfInterval = INTERVAL_MAP[interval] || '5m';
  const range      = RANGE_MAP[interval] || '5d';

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=${yfInterval}&range=${range}&includePrePost=false`;

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DiarioTrader/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!resp.ok) {
      throw new Error(`Yahoo Finance returned ${resp.status}`);
    }

    const json = await resp.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      throw new Error('No data returned from Yahoo Finance');
    }

    const timestamps = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    const opens   = q.open   || [];
    const highs   = q.high   || [];
    const lows    = q.low    || [];
    const closes  = q.close  || [];
    const volumes = q.volume || [];

    const quotes = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (opens[i] == null || highs[i] == null || lows[i] == null || closes[i] == null) continue;
      quotes.push({
        time:   timestamps[i],
        open:   +opens[i].toFixed(6),
        high:   +highs[i].toFixed(6),
        low:    +lows[i].toFixed(6),
        close:  +closes[i].toFixed(6),
        volume: volumes[i] || 0,
      });
    }

    res.json({ ok: true, data: quotes });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
