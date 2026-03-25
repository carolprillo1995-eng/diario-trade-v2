-- Adiciona coluna de créditos extras de análise operacional na tabela planos
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE planos ADD COLUMN IF NOT EXISTS creditos_relatorio_extra INT DEFAULT 0;
