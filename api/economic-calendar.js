// api/economic-calendar.js
// Lê o calendário econômico do Supabase (atualizado pelo script local update_calendario.py)

const SUPABASE_URL = "https://qqgoojzlhczfexqlgvpe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxZ29vanpsaGN6ZmV4cWxndnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODM0ODQsImV4cCI6MjA4ODI1OTQ4NH0.C_rElTl676HaMHzkrJMPAkcm58edODGSJzvpu4xaDa0";

function dataBrasil() {
  const agora = new Date();
  const br = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return br.toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  const hoje = dataBrasil();

  try {
    const url = `${SUPABASE_URL}/rest/v1/calendario_economico?id=eq.1&select=data,eventos,atualizado_em`;
    const r = await fetch(url, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Accept": "application/json",
      },
    });

    if (!r.ok) {
      return res.status(502).json({ ok: false, error: "Erro ao acessar banco de dados do calendário." });
    }

    const rows = await r.json();
    if (!rows || rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Calendário ainda não foi carregado hoje. Execute o script de atualização." });
    }

    const row = rows[0];

    // Verifica se os dados são de hoje
    if (row.data !== hoje) {
      return res.json({ ok: true, date: hoje, desatualizado: true, eventos: [], msg: `Calendário é de ${row.data} — aguardando atualização de hoje.` });
    }

    return res.json({ ok: true, date: hoje, eventos: row.eventos || [], atualizado_em: row.atualizado_em });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
