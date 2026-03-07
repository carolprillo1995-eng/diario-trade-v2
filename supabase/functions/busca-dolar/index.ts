// Edge Function: busca-dolar
// Caminho no projeto: supabase/functions/busca-dolar/index.ts
//
// Deploy: npx supabase functions deploy busca-dolar --project-ref qqgoojzlhczfexqlgvpe
// Teste manual: npx supabase functions invoke busca-dolar --project-ref qqgoojzlhczfexqlgvpe

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qqgoojzlhczfexqlgvpe.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Yahoo Finance API — contrato futuro BRL/USD (CME 6L=F)
const YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/6L=F?interval=1d&range=1d";

serve(async (_req) => {
  try {
    // 1. Buscar dados na Yahoo Finance API
    const res = await fetch(YAHOO_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance retornou status ${res.status}`);
    }

    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;

    if (!meta) {
      throw new Error("Resposta da Yahoo Finance sem dados (meta ausente)");
    }

    // 2. Extrair valores brutos do contrato CME (em USD por 1 BRL)
    const rawLast = meta.regularMarketPrice;          // Last / preço atual
    const rawHigh = meta.regularMarketDayHigh;        // High do dia
    const rawLow  = meta.regularMarketDayLow;         // Low do dia

    if (!rawLast || !rawHigh || !rawLow) {
      throw new Error(`Dados incompletos: last=${rawLast} high=${rawHigh} low=${rawLow}`);
    }

    // 3. Calcular regiões do dólar em R$/USD
    // Lógica: contrato cotado em USD/BRL → inverter para BRL/USD
    // Ex: 0.1890 USD/BRL → 1 ÷ 0.1890 = R$ 5,291/USD
    const abertura = parseFloat((1 / rawLast).toFixed(4)); // 1 ÷ Last   = Abertura
    const minima   = parseFloat((1 / rawHigh).toFixed(4)); // 1 ÷ High   = Mínima do dólar
    const maxima   = parseFloat((1 / rawLow).toFixed(4));  // 1 ÷ Low    = Máxima do dólar

    // 4. Data de hoje no formato YYYY-MM-DD (horário Brasília)
    const agora = new Date();
    const brasilia = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const hoje = brasilia.toISOString().slice(0, 10);

    // 5. Salvar no Supabase (upsert — atualiza se já existe registro do dia)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error } = await supabase
      .from("dolar_diario")
      .upsert({
        data:     hoje,
        abertura,
        minima,
        maxima,
        raw_last: rawLast,
        raw_high: rawHigh,
        raw_low:  rawLow,
      }, { onConflict: "data" });

    if (error) throw error;

    console.log(`✅ Dólar salvo para ${hoje}: abertura=${abertura} minima=${minima} maxima=${maxima}`);

    return new Response(
      JSON.stringify({ ok: true, data: hoje, abertura, minima, maxima }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("❌ Erro na busca do dólar:", err.message);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});