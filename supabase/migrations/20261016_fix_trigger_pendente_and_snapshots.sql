-- Migration: 20261016_fix_trigger_pendente_and_snapshots
-- Corrige o trigger que sobrescreve status='Pendente' com 'Reciclar'
-- Adiciona função atômica para uses_count
-- Cria tabela de snapshots para dashboard delta

-- 1. Torna colunas nullable para registros genuinamente Pendentes
ALTER TABLE public.trainings ALTER COLUMN completion_date DROP NOT NULL;
ALTER TABLE public.trainings ALTER COLUMN validity_date DROP NOT NULL;

-- 2. Corrige trigger: preserva Pendente quando completion_date é NULL
CREATE OR REPLACE FUNCTION public.calculate_training_validity()
RETURNS trigger AS $$
DECLARE
  v_months integer;
BEGIN
  -- Sem data de conclusão = genuinamente Pendente — preservar status sem recalcular
  IF NEW.completion_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calcula validity_date quando não fornecida
  IF NEW.validity_date IS NULL THEN
    SELECT validity_months INTO v_months
    FROM public.procedures
    WHERE id = NEW.procedure_id;
    v_months := COALESCE(v_months, 12);
    NEW.validity_date := NEW.completion_date + (v_months || ' months')::INTERVAL;
  END IF;

  -- Define status baseado em validity_date
  IF NEW.validity_date < CURRENT_DATE THEN
    NEW.status := 'Vencido';
  ELSIF NEW.validity_date <= (CURRENT_DATE + INTERVAL '60 days') THEN
    NEW.status := 'Reciclar';
  ELSE
    NEW.status := 'Certificado';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Função atômica para incrementar uses_count sem race condition
CREATE OR REPLACE FUNCTION public.increment_assessment_uses(p_link_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.assessment_links
  SET uses_count = uses_count + 1
  WHERE id = p_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Tabela para snapshots de conformidade (dashboard delta real vs ciclo anterior)
CREATE TABLE IF NOT EXISTS public.compliance_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  general_compliance numeric(5,2) NOT NULL,
  active_certifications integer NOT NULL DEFAULT 0,
  expiring_in_60_days integer NOT NULL DEFAULT 0,
  expired_documents integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_snapshots_date_unique
  ON public.compliance_snapshots(snapshot_date);

-- 5. Corrige registros Pendentes existentes mal inseridos pelo trigger
-- Zera datas para os registros onde compliance_rate=0 e completion_date=validity_date
-- (padrão do autoGenerateMatrix com sentinel date)
UPDATE public.trainings
SET
  completion_date = NULL,
  validity_date = NULL,
  status = 'Pendente'
WHERE
  status IN ('Reciclar', 'Certificado', 'Vencido')
  AND compliance_rate = 0
  AND completion_date IS NOT NULL
  AND completion_date = validity_date;
