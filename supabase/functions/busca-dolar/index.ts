// Edge Function: busca-dolar
// Fonte: TradingCharts (ondemand.websol.barchart.com) — CME L6 BRL Futures
// Deploy: npx supabase functions deploy busca-dolar --project-ref qqgoojzlhczfexqlgvpe

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qqgoojzlhczfexqlgvpe.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// API key pública do TradingCharts (embutida na página deles)
const TC_APIKEY = "2d8b3b803594b13e02a7dc827f4a63f8";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    // Buscar contratos L6 (CME Brazilian Real futures) via TradingCharts
    const symbols = "L6J26,L6M26,L6U26,L6*1";
    const url = `https://ondemand.websol.barchart.com/getQuote.json?apikey=${TC_APIKEY}&symbols=${encodeURIComponent(symbols)}&fields=lastPrice,highPrice,lowPrice,open,volume`;

    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) throw new Error(`TradingCharts retornou status ${r.status}`);

    const json = await r.json();
    const results: Array<{symbol:string,lastPrice:number,highPrice:number,lowPrice:number,volume:number}> = json?.results ?? [];

    if (!results.length) throw new Error("TradingCharts não retornou resultados");

    // Pegar o contrato com maior volume (mais ativo)
    const ativo = results
      .filter(q => q.lastPrice > 0.05 && q.lastPrice < 0.5)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0];

    if (!ativo) throw new Error("Nenhum contrato L6 válido encontrado");

    const last = ativo.lastPrice;
    const high = ativo.high || ativo.highPrice || last;
    const low  = ativo.low  || ativo.lowPrice  || last;
    const fonte = `TradingCharts ${ativo.symbol}`;

    // Salvar no Supabase (valores brutos USD/BRL — frontend converte com 1/v)
    const brasilia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const hoje = brasilia.toISOString().slice(0, 10);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from("dolar_diario").upsert(
      { data: hoje, abertura: last, minima: high, maxima: low },
      { onConflict: "data" }
    );

    console.log(`✅ [${fonte}] USD/BRL ${hoje}: last=${last} high=${high} low=${low}`);

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
