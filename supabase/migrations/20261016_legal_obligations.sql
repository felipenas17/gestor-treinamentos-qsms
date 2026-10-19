-- Migration: 20261016_legal_obligations
-- Módulo de Obrigações Legais (cumprimento de requisitos de licenças)
-- Execute manualmente no Supabase SQL editor (projeto zwmqiuemrsyjauvohgtl)

CREATE TABLE IF NOT EXISTS public.legal_obligations (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title             TEXT NOT NULL,
  description       TEXT DEFAULT NULL,
  frequency         TEXT NOT NULL DEFAULT 'Anual',  -- Mensal | Bimestral | Trimestral | Semestral | Anual | Bienal
  responsible       TEXT DEFAULT NULL,
  last_done_date    DATE DEFAULT NULL,
  next_due_date     DATE DEFAULT NULL,              -- calculado pelo trigger
  obligation_status TEXT DEFAULT 'Indefinido',      -- calculado pelo trigger
  base              TEXT DEFAULT NULL,
  doc_control_id    UUID DEFAULT NULL REFERENCES public.doc_control(id) ON DELETE SET NULL,
  notes             TEXT DEFAULT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: acesso total (mesma política do restante do projeto)
ALTER TABLE public.legal_obligations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all legal_obligations" ON public.legal_obligations;
CREATE POLICY "Allow all legal_obligations" ON public.legal_obligations
  FOR ALL USING (true) WITH CHECK (true);

-- Índice para consultas por status e data
CREATE INDEX IF NOT EXISTS idx_legal_obligations_status ON public.legal_obligations(obligation_status);
CREATE INDEX IF NOT EXISTS idx_legal_obligations_next_due ON public.legal_obligations(next_due_date ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_legal_obligations_doc_control ON public.legal_obligations(doc_control_id);

-- Trigger: calcula next_due_date e obligation_status automaticamente
CREATE OR REPLACE FUNCTION public.calculate_obligation_status()
RETURNS TRIGGER AS $$
DECLARE
  v_months INT;
BEGIN
  -- Calcula intervalo em meses baseado na frequência
  v_months := CASE NEW.frequency
    WHEN 'Mensal'      THEN 1
    WHEN 'Bimestral'   THEN 2
    WHEN 'Trimestral'  THEN 3
    WHEN 'Semestral'   THEN 6
    WHEN 'Anual'       THEN 12
    WHEN 'Bienal'      THEN 24
    ELSE 12  -- padrão: anual
  END;

  -- Calcula próxima data de vencimento
  IF NEW.last_done_date IS NOT NULL THEN
    NEW.next_due_date := NEW.last_done_date + (v_months || ' months')::INTERVAL;
  ELSE
    NEW.next_due_date := NULL;
  END IF;

  -- Calcula status
  IF NEW.next_due_date IS NULL THEN
    NEW.obligation_status := 'Indefinido';
  ELSIF NEW.next_due_date < CURRENT_DATE THEN
    NEW.obligation_status := 'Vencido';
  ELSIF NEW.next_due_date <= (CURRENT_DATE + INTERVAL '30 days') THEN
    NEW.obligation_status := 'Próximo';
  ELSE
    NEW.obligation_status := 'Vigente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_obligation_status ON public.legal_obligations;
CREATE TRIGGER trg_obligation_status
  BEFORE INSERT OR UPDATE ON public.legal_obligations
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_obligation_status();
