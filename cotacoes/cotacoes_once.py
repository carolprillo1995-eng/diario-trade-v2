from tvDatafeed import TvDatafeed, Interval
from supabase import create_client
import os
import json

tv = TvDatafeed()

SUPABASE_URL = "https://qqgoojzlhczfexqlgvpe.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_KEY"]  # vem do GitHub Secrets

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

def pegar_dados(symbol, exchange):
    try:
        data = tv.get_hist(symbol=symbol, exchange=exchange, interval=Interval.in_daily, n_bars=2)
        if data is None or len(data) < 2:
            return {"price": None, "change": None}
        preco_atual    = float(data['close'].iloc[-1])
        preco_anterior = float(data['close'].iloc[-2])
        variacao_pct   = ((preco_atual - preco_anterior) / preco_anterior) * 100
        return {"price": round(preco_atual, 2), "change": round(variacao_pct, 2)}
    except Exception as e:
        print(f"Erro {symbol}: {e}")
        return {"price": None, "change": None}

dados = {
    "VIX":    pegar_dados("VIX",   "TVC"),
    "DXY":    pegar_dados("DXY",   "TVC"),
    "SP500":  pegar_dados("SPX",   "SP"),
    "US30":   pegar_dados("US30",  "TVC"),
    "EWZ":    pegar_dados("EWZ",   "AMEX"),
    "NASDAQ": pegar_dados("NDX",   "NASDAQ"),
    "OIL":    pegar_dados("CL1!",  "NYMEX"),
    "IRON":   pegar_dados("FEF1!", "SGX"),
    "OURO":   pegar_dados("GOLD",  "TVC"),
}

sb.table("cotacoes_global").upsert({"id": 1, "dados": dados}).execute()
print("Atualizado:", {k: v["price"] for k, v in dados.items() if v["price"]})
