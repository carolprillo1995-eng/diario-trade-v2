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
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    let abertura: number | null = null;
    let minima: number | null = null;
    let maxima: number | null = null;
    let fonte = "";

    // ── Fonte 1: Yahoo Finance v8 (CME 6L=F — contrato BRL/USD) ──
    try {
      const r = await fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/6L=F?interval=1d&range=1d",
        {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (r.ok) {
        const json = await r.json();
        const meta = json?.chart?.result?.[0]?.meta;
        const rawLast = meta?.regularMarketPrice;
        const rawHigh = meta?.regularMarketDayHigh;
        const rawLow  = meta?.regularMarketDayLow;
        if (rawLast && rawHigh && rawLow) {
          // Contrato cotado em USD/BRL → inverter para R$/USD
          abertura = parseFloat((1 / rawLast).toFixed(4));
          minima   = parseFloat((1 / rawHigh).toFixed(4));
          maxima   = parseFloat((1 / rawLow).toFixed(4));
          fonte    = "Yahoo Finance";
        }
      }
    } catch (_) { /* continua para fallback */ }

    // ── Fonte 2: AwesomeAPI (fallback — retorna diretamente em R$/USD) ──
    if (!abertura) {
      try {
        const r = await fetch(
          "https://economia.awesomeapi.com.br/json/last/USD-BRL",
          { signal: AbortSignal.timeout(8000) }
        );
        if (r.ok) {
          const json = await r.json();
          const d = json?.USDBRL;
          if (d?.bid && d?.high && d?.low) {
            abertura = parseFloat(parseFloat(d.bid).toFixed(4));
            minima   = parseFloat(parseFloat(d.low).toFixed(4));
            maxima   = parseFloat(parseFloat(d.high).toFixed(4));
            fonte    = "AwesomeAPI";
          }
        }
      } catch (_) { /* falhou */ }
    }

    if (!abertura || !minima || !maxima) {
      throw new Error("Todas as fontes falharam em retornar dados do dólar");
    }

    // ── Salvar no Supabase ──
    const brasilia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const hoje = brasilia.toISOString().slice(0, 10);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from("dolar_diario").upsert(
      { data: hoje, abertura, minima, maxima },
      { onConflict: "data" }
    );

    console.log(`✅ [${fonte}] Dólar ${hoje}: abertura=${abertura} min=${minima} max=${maxima}`);

    return new Response(
      JSON.stringify({ ok: true, data: hoje, abertura, minima, maxima, fonte }),
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
