import sys, os
sys.path.insert(0, os.path.dirname(__file__))  # permite importar tvDatafeed local

from tvDatafeed import TvDatafeed, Interval
from supabase import create_client

SUPABASE_URL = "https://qqgoojzlhczfexqlgvpe.supabase.co"
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

sb = create_client(SUPABASE_URL, SUPABASE_KEY)
tv = TvDatafeed()

def pegar_dados(symbol, exchange):
    try:
        data = tv.get_hist(symbol=symbol, exchange=exchange, interval=Interval.in_daily, n_bars=2)
        if data is None or len(data) < 2:
            return None
        preco_atual    = float(data['close'].iloc[-1])
        preco_anterior = float(data['close'].iloc[-2])
        variacao_pct   = ((preco_atual - preco_anterior) / preco_anterior) * 100
        return {"price": round(preco_atual, 2), "change": round(variacao_pct, 2)}
    except Exception as e:
        print(f"Erro {symbol}: {e}")
        return None

# Lê dados atuais para manter campos que falharem
try:
    res = sb.table("cotacoes_global").select("dados").eq("id", 1).single().execute()
    dados = res.data["dados"] if res.data else {}
except:
    dados = {}

novos = {
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

for key, val in novos.items():
    if val is not None:
        dados[key] = val

sb.table("cotacoes_global").upsert({"id": 1, "dados": dados}).execute()
print("Atualizado:", {k: v["price"] for k, v in dados.items() if v and v.get("price")})
