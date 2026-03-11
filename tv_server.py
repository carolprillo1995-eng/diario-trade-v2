from flask import Flask, jsonify
from flask_cors import CORS
from tvDatafeed import TvDatafeed, Interval

app = Flask(__name__)
CORS(app)

tv = TvDatafeed()

def get_asset(symbol, exchange):
    hist = tv.get_hist(
        symbol=symbol,
        exchange=exchange,
        interval=Interval.in_daily,
        n_bars=2
    )
    if hist is None:
        return {"preco": None, "variacao": None, "percent": None}

    close_ontem = hist['close'].iloc[-2]
    close_atual = hist['close'].iloc[-1]
    variacao     = close_atual - close_ontem
    variacao_pct = (variacao / close_ontem) * 100

    return {
        "preco":    round(close_atual, 2),
        "variacao": round(variacao, 2),
        "percent":  round(variacao_pct, 2)
    }

@app.route("/macro")
def macro():
    return jsonify({
        "minerio":  get_asset("FEF1!", "SGX"),
        "petroleo": get_asset("CL1!", "NYMEX"),
        "vix":      get_asset("VIX", "CBOE"),
        "sp500":    get_asset("ES1!", "CME_MINI"),
    })

@app.route("/")
def home():
    return "TV Server rodando!"

if __name__ == "__main__":
    print("=" * 40)
    print("  TV Server — DiarioTrader")
    print("  http://localhost:5000/macro")
    print("=" * 40)
    app.run(port=5000)
