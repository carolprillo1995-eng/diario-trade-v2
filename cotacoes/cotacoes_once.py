import os
import requests
from supabase import create_client

SUPABASE_URL = "https://qqgoojzlhczfexqlgvpe.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxZ29vanpsaGN6ZmV4cWxndnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODM0ODQsImV4cCI6MjA4ODI1OTQ4NH0.C_rElTl676HaMHzkrJMPAkcm58edODGSJzvpu4xaDa0"
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

def pegar_yf(symbol):
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=2d"
        r = requests.get(url, headers=HEADERS, timeout=10)
        result = r.json()["chart"]["result"][0]
        closes = [c for c in result["indicators"]["quote"][0]["close"] if c is not None]
        if len(closes) < 2:
            return None
        price, prev = closes[-1], closes[-2]
        return {"price": round(price, 2), "change": round((price - prev) / prev * 100, 2)}
    except Exception as e:
        print(f"Erro {symbol}: {e}")
        return None

# Lê dados atuais do Supabase (para manter IRON que o Yahoo Finance não tem)
try:
    res = sb.table("cotacoes_global").select("dados").eq("id", 1).single().execute()
    dados = res.data["dados"] if res.data else {}
except:
    dados = {}

novos = {
    "VIX":    pegar_yf("^VIX"),
    "DXY":    pegar_yf("DX-Y.NYB"),
    "SP500":  pegar_yf("^GSPC"),
    "US30":   pegar_yf("^DJI"),
    "EWZ":    pegar_yf("EWZ"),
    "NASDAQ": pegar_yf("^NDX"),
    "OIL":    pegar_yf("CL=F"),
    "OURO":   pegar_yf("GC=F"),
    # IRON (FEF1!/SGX) só via tvDatafeed no PC — mantém último valor
}

# Só atualiza campos que retornaram dados válidos
for key, val in novos.items():
    if val is not None:
        dados[key] = val

sb.table("cotacoes_global").upsert({"id": 1, "dados": dados}).execute()
print("Atualizado:", {k: v["price"] for k, v in dados.items() if v and v.get("price")})
