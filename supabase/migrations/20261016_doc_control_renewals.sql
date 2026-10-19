-- Migration: 20261016_doc_control_renewals
-- Expande módulo Controle Documental: status de renovação + histórico de eventos
-- Execute manualmente no Supabase SQL editor (projeto zwmqiuemrsyjauvohgtl)

-- 1. Adiciona status de renovação à tabela doc_control
ALTER TABLE public.doc_control
  ADD COLUMN IF NOT EXISTS renewal_status TEXT DEFAULT 'Não iniciado';

-- Valores válidos: Não iniciado | Em processo | Aguardando aprovação | Concluído

-- 2. Tabela de histórico de eventos de renovação (uma linha por evento registrado)
CREATE TABLE IF NOT EXISTS public.doc_control_renewals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_control_id  UUID NOT NULL REFERENCES public.doc_control(id) ON DELETE CASCADE,
  event_date      DATE NOT NULL,
  notes           TEXT DEFAULT NULL,
  file_url        TEXT DEFAULT NULL,
  file_name       TEXT DEFAULT NULL,
  renewal_status  TEXT NOT NULL DEFAULT 'Em processo',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: acesso total (mesma política do restante do projeto)
ALTER TABLE public.doc_control_renewals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all doc_control_renewals" ON public.doc_control_renewals;
CREATE POLICY "Allow all doc_control_renewals" ON public.doc_control_renewals
  FOR ALL USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_doc_control_renewals_doc_id
  ON public.doc_control_renewals(doc_control_id);
CREATE INDEX IF NOT EXISTS idx_doc_control_renewals_event_date
  ON public.doc_control_renewals(event_date DESC);
