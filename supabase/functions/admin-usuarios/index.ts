// Edge Function: admin-usuarios
// Retorna lista de usuários auth + presença (last_seen)
// Deploy: npx supabase functions deploy admin-usuarios --project-ref qqgoojzlhczfexqlgvpe

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qqgoojzlhczfexqlgvpe.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN") ?? "Z@cca2012";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let body = {};
  try {
    body = await req.json();
  } catch (_) {}

  // Endpoint seguro para validação admin
  if (body.action === "validate_admin") {
    if (body.adminToken === ADMIN_TOKEN) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 200,
      });
    } else {
      return new Response(JSON.stringify({ ok: false, error: "Senha incorreta" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 401,
      });
    }
  }

  // Novo: criar usuário
  if (body.action === "create_user") {
    if (body.adminToken !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "Token de admin inválido" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 401,
      });
    }
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const accessDays = parseInt(body.accessDays, 10) || 15;
    if (!email || !password) {
      return new Response(JSON.stringify({ ok: false, error: "Email e senha obrigatórios" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 400,
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    // Cria usuário
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 400,
      });
    }
    // Cria plano
    const data_inicio = new Date();
    const data_expiracao = new Date(data_inicio.getTime() + accessDays * 86400000);
    await supabase.from("planos").upsert({
      email,
      status: "pago",
      data_inicio: data_inicio.toISOString(),
      data_expiracao: data_expiracao.toISOString(),
      observacao: `Criado pelo admin via painel em ${data_inicio.toLocaleDateString("pt-BR")}`
    }, { onConflict: "email" });
    return new Response(JSON.stringify({ ok: true, user: data.user }), {
      headers: { ...CORS, "Content-Type": "application/json" }, status: 200,
    });
  }

  // Excluir contas específicas por UID
  if (body.action === "delete_users") {
    if (body.adminToken !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "Token inválido" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 401,
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const ids: string[] = body.ids || [];
    for (const id of ids) {
      await supabase.auth.admin.deleteUser(id);
    }
    return new Response(JSON.stringify({ ok: true, message: `${ids.length} contas excluídas` }), {
      headers: { ...CORS, "Content-Type": "application/json" }, status: 200,
    });
  }

  // Excluir todas as contas
  if (body.action === "delete_all_users") {
    if (body.adminToken !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "Token inválido" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 401,
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 500,
      });
    }
    // Limpa TODAS as tabelas relacionadas primeiro
    const tabelas = ["planos","user_presence","operacoes","trades","plano_trade","mercado_registros","codigos_ativacao","registros","notas","gerenciamento"];
    for (const tabela of tabelas) {
      try { await supabase.from(tabela).delete().neq("id", "00000000-0000-0000-0000-000000000000"); } catch(_) {}
      try { await supabase.from(tabela).delete().neq("user_id", "00000000-0000-0000-0000-000000000000"); } catch(_) {}
      try { await supabase.from(tabela).delete().neq("email", ""); } catch(_) {}
    }
    const errors: string[] = [];
    let count = 0;
    for (const u of users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) { errors.push(`${u.email}: ${delErr.message}`); }
      else { count++; }
    }
    return new Response(JSON.stringify({ ok: true, message: `${count} contas excluídas`, errors }), {
      headers: { ...CORS, "Content-Type": "application/json" }, status: 200,
    });
  }

  // Forçar logout de todos os usuários
  if (body.action === "force_signout_all") {
    if (body.adminToken !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "Token inválido" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 401,
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 500,
      });
    }
    let count = 0;
    for (const u of users) {
      await supabase.auth.admin.signOut(u.id, "global");
      count++;
    }
    return new Response(JSON.stringify({ ok: true, message: `${count} sessões encerradas` }), {
      headers: { ...CORS, "Content-Type": "application/json" }, status: 200,
    });
  }

  // Limpar todos os planos
  if (body.action === "clear_all_plans") {
    if (body.adminToken !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "Token inválido" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 401,
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await supabase.from("planos").delete().neq("email", "");
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 500,
      });
    }
    return new Response(JSON.stringify({ ok: true, message: "Todos os planos apagados" }), {
      headers: { ...CORS, "Content-Type": "application/json" }, status: 200,
    });
  }

  // Liberar acesso direto por email
  if (body.action === "liberar_acesso") {
    if (body.adminToken !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "Token inválido" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 401,
      });
    }
    const email = (body.email || "").trim().toLowerCase();
    const dias = parseInt(body.dias, 10) || 30;
    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: "Email obrigatório" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 400,
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const dataInicio = new Date();
    const dataExpiracao = new Date(dataInicio.getTime() + dias * 86400000);
    const { error } = await supabase.from("planos").upsert({
      email,
      status: "pago",
      data_inicio: dataInicio.toISOString(),
      data_expiracao: dataExpiracao.toISOString(),
      observacao: `Liberado pelo admin em ${dataInicio.toLocaleDateString("pt-BR")}`,
    }, { onConflict: "email" });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 500,
      });
    }
    return new Response(JSON.stringify({ ok: true, message: `Acesso liberado para ${email} por ${dias} dias` }), {
      headers: { ...CORS, "Content-Type": "application/json" }, status: 200,
    });
  }

  // Bloquear acesso por email
  if (body.action === "bloquear_acesso") {
    if (body.adminToken !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "Token inválido" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 401,
      });
    }
    const email = (body.email || "").trim().toLowerCase();
    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: "Email obrigatório" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 400,
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await supabase.from("planos").update({ status: "bloqueado" }).eq("email", email);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 500,
      });
    }
    return new Response(JSON.stringify({ ok: true, message: `${email} bloqueado` }), {
      headers: { ...CORS, "Content-Type": "application/json" }, status: 200,
    });
  }

  // Renovar plano (+N dias)
  if (body.action === "renovar_acesso") {
    if (body.adminToken !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "Token inválido" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 401,
      });
    }
    const email = (body.email || "").trim().toLowerCase();
    const dias = parseInt(body.dias, 10) || 30;
    const baseDate = body.dataExpiracao && new Date(body.dataExpiracao) > new Date()
      ? new Date(body.dataExpiracao) : new Date();
    const novaExpiracao = new Date(baseDate.getTime() + dias * 86400000);
    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: "Email obrigatório" }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 400,
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await supabase.from("planos").update({
      status: "pago",
      data_expiracao: novaExpiracao.toISOString(),
    }).eq("email", email);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...CORS, "Content-Type": "application/json" }, status: 500,
      });
    }
    return new Response(JSON.stringify({ ok: true, novaExpiracao: novaExpiracao.toISOString() }), {
      headers: { ...CORS, "Content-Type": "application/json" }, status: 200,
    });
  }

  // Listar usuários (padrão)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const { data: presenca } = await supabase
    .from("user_presence")
    .select("user_id, last_seen, email");

  const presencaMap: Record<string, string> = {};
  (presenca || []).forEach((p: { user_id: string; last_seen: string }) => {
    presencaMap[p.user_id] = p.last_seen;
  });

  const { data: planos } = await supabase.from("planos").select("email, status, data_expiracao");
  const planosMap: Record<string, { status: string; data_expiracao: string }> = {};
  (planos || []).forEach((p: { email: string; status: string; data_expiracao: string }) => {
    planosMap[p.email] = p;
  });

  const agora = new Date();
  const resultado = users.map(u => {
    const lastSeen = presencaMap[u.id] || u.last_sign_in_at || null;
    const onlineMinutos = lastSeen
      ? Math.floor((agora.getTime() - new Date(lastSeen).getTime()) / 60000)
      : null;
    const online = onlineMinutos !== null && onlineMinutos <= 10;
    const plano = planosMap[u.email || ""];
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_seen: lastSeen,
      online,
      onlineMinutos,
      planoStatus: plano?.status || null,
      planoExpira: plano?.data_expiracao || null,
    };
  });

  resultado.sort((a, b) => {
    if (a.online && !b.online) return -1;
    if (!a.online && b.online) return 1;
    if (a.last_seen && b.last_seen) return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
    return 0;
  });

  return new Response(JSON.stringify({ ok: true, total: resultado.length, usuarios: resultado }), {
    headers: { ...CORS, "Content-Type": "application/json" }, status: 200,
  });

});
