-- Migration: 20261016_procedure_document_control
-- Adiciona campos de controle documental na tabela procedures
-- Revisão periódica, status do documento, responsável

-- 1. Novos campos na tabela procedures
ALTER TABLE public.procedures
  ADD COLUMN IF NOT EXISTS doc_type             TEXT    DEFAULT 'Procedimento',
  ADD COLUMN IF NOT EXISTS doc_last_revision_date DATE  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doc_revision_months  INTEGER DEFAULT 36,
  ADD COLUMN IF NOT EXISTS doc_next_revision_date DATE  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doc_revision_status  TEXT    DEFAULT 'Indefinido',
  ADD COLUMN IF NOT EXISTS doc_responsible      TEXT    DEFAULT NULL;

-- 2. Trigger: calcula doc_next_revision_date e doc_revision_status automaticamente
CREATE OR REPLACE FUNCTION public.calculate_doc_revision_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Sem data de última revisão → status Indefinido
  IF NEW.doc_last_revision_date IS NULL THEN
    NEW.doc_next_revision_date := NULL;
    NEW.doc_revision_status    := 'Indefinido';
    RETURN NEW;
  END IF;

  -- Próxima revisão = última revisão + ciclo em meses
  NEW.doc_next_revision_date := NEW.doc_last_revision_date
    + (COALESCE(NEW.doc_revision_months, 36) || ' months')::INTERVAL;

  -- Status baseado na data de hoje
  IF NEW.doc_next_revision_date < CURRENT_DATE THEN
    NEW.doc_revision_status := 'Vencido';
  ELSIF NEW.doc_next_revision_date <= (CURRENT_DATE + INTERVAL '90 days') THEN
    NEW.doc_revision_status := 'Para Revisão';
  ELSE
    NEW.doc_revision_status := 'Vigente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Garante que o trigger não seja duplicado
DROP TRIGGER IF EXISTS trg_doc_revision_status ON public.procedures;
CREATE TRIGGER trg_doc_revision_status
  BEFORE INSERT OR UPDATE ON public.procedures
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_doc_revision_status();

-- 3. Recalcula status dos procedimentos existentes que já têm data preenchida
UPDATE public.procedures SET doc_last_revision_date = doc_last_revision_date;
-- (o trigger recalcula doc_next_revision_date e doc_revision_status automaticamente)
