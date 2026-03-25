-- Tabela para estudos do Plano de Trade (Pré Mercado + Oportunidades do Dia)
-- Execute este SQL no Supabase Dashboard > SQL Editor

create table if not exists plano_estudos (
  id bigint primary key,
  user_id uuid references auth.users not null,
  tipo text not null check (tipo in ('pre', 'oportunidades')),
  data date not null,
  ativo text default '',
  texto text default '',
  fotos jsonb default '[]',
  regioes jsonb default '[]',
  tf text default '',
  candle text default '',
  retracao text default '',
  tfs jsonb default '[]',
  medias_per_tf jsonb default '{}',
  filtros jsonb default '[]',
  stop text default '',
  pontos text default '',
  travas jsonb default '[]',
  observacoes text default '',
  created_at timestamptz default now()
);

alter table plano_estudos enable row level security;

create policy "Usuarios gerenciam proprios estudos"
  on plano_estudos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
