-- ============================================================
-- FIX RLS: Habilita Row Level Security em todas as tabelas
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================================

-- ── operacoes ────────────────────────────────────────────────
alter table operacoes enable row level security;

create policy "usuarios gerenciam proprias operacoes"
  on operacoes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── gerenciamentos ────────────────────────────────────────────
alter table gerenciamentos enable row level security;

create policy "usuarios gerenciam proprios gerenciamentos"
  on gerenciamentos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── relatorios_ir ─────────────────────────────────────────────
alter table relatorios_ir enable row level security;

create policy "usuarios gerenciam proprios relatorios"
  on relatorios_ir for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── mercado_registros ─────────────────────────────────────────
alter table mercado_registros enable row level security;

create policy "usuarios gerenciam proprios registros de mercado"
  on mercado_registros for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── user_presence ─────────────────────────────────────────────
alter table user_presence enable row level security;

create policy "usuarios gerenciam propria presenca"
  on user_presence for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin pode ver presença de todos (para o painel AdminTradeVision)
create policy "admin le todas as presencas"
  on user_presence for select
  using (auth.jwt() ->> 'email' = 'thiagozacca@gmail.com');

-- ── planos ────────────────────────────────────────────────────
alter table planos enable row level security;

-- Usuário lê o próprio plano pelo email do JWT
create policy "usuario le proprio plano"
  on planos for select
  using (auth.jwt() ->> 'email' = email);

-- Usuário insere o próprio plano (durante ativação de código)
create policy "usuario insere proprio plano"
  on planos for insert
  with check (auth.jwt() ->> 'email' = email);

-- Usuário atualiza o próprio plano
create policy "usuario atualiza proprio plano"
  on planos for update
  using (auth.jwt() ->> 'email' = email)
  with check (auth.jwt() ->> 'email' = email);

-- Admin tem acesso total ao planos
create policy "admin acesso total planos"
  on planos for all
  using (auth.jwt() ->> 'email' = 'thiagozacca@gmail.com')
  with check (auth.jwt() ->> 'email' = 'thiagozacca@gmail.com');

-- ── codigos_ativacao ──────────────────────────────────────────
alter table codigos_ativacao enable row level security;

-- Qualquer usuário autenticado pode buscar código (para ativação)
create policy "usuario busca codigo ativacao"
  on codigos_ativacao for select
  using (auth.role() = 'authenticated');

-- Usuário pode marcar código como usado
create policy "usuario usa codigo ativacao"
  on codigos_ativacao for update
  using (auth.role() = 'authenticated');

-- Admin tem acesso total (criar, ler todos, deletar)
create policy "admin acesso total codigos ativacao"
  on codigos_ativacao for all
  using (auth.jwt() ->> 'email' = 'thiagozacca@gmail.com')
  with check (auth.jwt() ->> 'email' = 'thiagozacca@gmail.com');

-- ── cotacoes_global ───────────────────────────────────────────
alter table cotacoes_global enable row level security;

-- Leitura pública (dados de cotações são públicos)
create policy "leitura publica cotacoes global"
  on cotacoes_global for select
  using (true);
