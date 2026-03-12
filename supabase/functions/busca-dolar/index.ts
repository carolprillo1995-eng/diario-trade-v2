// Edge Function: busca-dolar
// Deploy: npx supabase functions deploy busca-dolar --project-ref qqgoojzlhczfexqlgvpe

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qqgoojzlhczfexqlgvpe.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    let last: number | null = null;
    let high: number | null = null;
    let low:  number | null = null;
    let fonte = "";

    // Barchart — CME BRL Futures (front-month)
    // Contrato cotado em USD/BRL (ex: 0.1890) → exibido como R$/USD via 1/v no frontend
    for (const sym of ["6LJ26", "6LM26", "@6L", "6L*1"]) {
      try {
        const url = `https://www.barchart.com/proxies/core-api/v1/quotes/get?symbols=${encodeURIComponent(sym)}&fields=lastPrice,highPrice,lowPrice,priceChange,percentChange&groupBy=none&raw=1`;
        const r = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.barchart.com/futures/quotes/6L*1/overview",
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) continue;
        const json = await r.json();
        const q0 = json?.data?.[0]?.raw ?? json?.data?.[0];
        if (q0?.lastPrice) {
          const rawLast = parseFloat(q0.lastPrice);
          const rawHigh = parseFloat(q0.highPrice || q0.lastPrice);
          const rawLow  = parseFloat(q0.lowPrice  || q0.lastPrice);
          // Validar que é contrato USD/BRL (valores entre 0.05 e 0.5)
          if (rawLast > 0.05 && rawLast < 0.5) {
            last  = rawLast;
            high  = rawHigh;
            low   = rawLow;
            fonte = `Barchart ${sym}`;
            break;
          }
        }
      } catch (_) { continue; }
    }

    if (!last || !high || !low) {
      throw new Error(`Barchart não retornou dados para nenhum símbolo (6LJ26, 6LM26, @6L, 6L*1)`);
    }

    // Salvar no Supabase (valores brutos USD/BRL — frontend converte com 1/v)
    const brasilia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const hoje = brasilia.toISOString().slice(0, 10);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from("dolar_diario").upsert(
      { data: hoje, abertura: last, minima: high, maxima: low },
      { onConflict: "data" }
    );

    console.log(`✅ [${fonte}] USD/BRL ${hoje}: last=${last} high=${high} low=${low}`);

    // Retornar valores brutos (USD/BRL) — frontend faz 1/v para converter em R$/USD
    return new Response(
      JSON.stringify({ ok: true, data: hoje, last, high, low, fonte }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("❌ busca-dolar:", err.message);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
