-- Adiciona coluna 'base' na tabela doc_control
-- Execute manualmente no Supabase SQL editor (projeto zwmqiuemrsyjauvohgtl)

ALTER TABLE doc_control ADD COLUMN IF NOT EXISTS base TEXT;
