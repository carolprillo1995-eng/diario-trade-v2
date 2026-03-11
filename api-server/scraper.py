#!/usr/bin/env python3
import time
import json
from datetime import datetime

def obter_cotacoes_simuladas():
    """
    Retorna cotações simuladas (funciona offline)
    Em produção, você substituiria isto pelo scraper real com Selenium
    """
    
    import random
    
    ativos = {
        "VIX": {
            "preço": f"{random.uniform(15, 25):.2f}",
            "variação": f"{random.uniform(-5, 5):.2f}",
            "timestamp": datetime.now().isoformat()
        },
        "FEF1": {
            "preço": f"{random.uniform(93, 95):.3f}",
            "variação": f"{random.uniform(-1, 1):.2f}",
            "timestamp": datetime.now().isoformat()
        },
        "DXY": {
            "preço": f"{random.uniform(102, 104):.2f}",
            "variação": f"{random.uniform(-0.5, 0.5):.2f}",
            "timestamp": datetime.now().isoformat()
        },
        "CL1": {
            "preço": f"{random.uniform(75, 85):.2f}",
            "variação": f"{random.uniform(-2, 2):.2f}",
            "timestamp": datetime.now().isoformat()
        }
    }
    
    return ativos

if __name__ == "__main__":
    resultado = obter_cotacoes_simuladas()
    print(json.dumps(resultado, indent=2, ensure_ascii=False))