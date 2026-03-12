from tvDatafeed import TvDatafeed, Interval
import json
import time

tv = TvDatafeed()

def pegar_dados(symbol, exchange):

    data = tv.get_hist(symbol=symbol, exchange=exchange, interval=Interval.in_daily, n_bars=2)

    if data is None:
        return {"price": None, "change": None}

    preco_atual = float(data['close'].iloc[-1])
    preco_anterior = float(data['close'].iloc[-2])

    variacao_pct = ((preco_atual - preco_anterior) / preco_anterior) * 100

    return {
        "price": round(preco_atual,2),
        "change": round(variacao_pct,2)
    }


while True:

    dados = {
        "VIX": pegar_dados("VIX","TVC"),
        "OIL": pegar_dados("CL1!","NYMEX"),
        "IRON": pegar_dados("FEF1!","SGX"),
        "DXY": pegar_dados("DXY","TVC")
    }

with open(r"C:\React\diario-trader\public\cotacoes.json","w") as f:
        json.dump(dados,f)

    print("Atualizado:", dados)

    time.sleep(15)