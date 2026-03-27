-- Tabela para cache do calendário econômico (atualizada pelo script local)
-- Execute no Supabase Dashboard > SQL Editor

create table if not exists calendario_economico (
  id int primary key default 1,
  data date not null,
  eventos jsonb not null default '[]',
  atualizado_em timestamptz default now()
);

-- Sem RLS — apenas service_role pode escrever, anon pode ler
alter table calendario_economico enable row level security;

create policy "leitura publica"
  on calendario_economico for select
  using (true);
