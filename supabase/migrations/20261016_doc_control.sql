-- Migration: 20261016_doc_control
-- Tabela de Controle Documental Institucional
-- Licenças (PF, Exército), Alvarás, Certificados corporativos, etc.

CREATE TABLE IF NOT EXISTS public.doc_control (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT NOT NULL,
  name           TEXT NOT NULL,
  doc_type       TEXT NOT NULL DEFAULT 'Licença',
  issuing_body   TEXT DEFAULT NULL,  -- Órgão emissor: DPC, PF, Exército, IBAMA…
  issue_date     DATE DEFAULT NULL,  -- Data de emissão
  expiry_date    DATE DEFAULT NULL,  -- Data de vencimento
  renewal_months INTEGER DEFAULT 12, -- Ciclo de renovação (informativo)
  doc_status     TEXT DEFAULT 'Indefinido', -- calculado pelo trigger
  responsible    TEXT DEFAULT NULL,
  file_url       TEXT DEFAULT NULL,
  notes          TEXT DEFAULT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: acesso total (mesma política do restante do projeto)
ALTER TABLE public.doc_control ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all doc_control" ON public.doc_control;
CREATE POLICY "Allow all doc_control" ON public.doc_control
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger: calcula doc_status com base na expiry_date vs. data atual
CREATE OR REPLACE FUNCTION public.calculate_doc_control_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NULL THEN
    NEW.doc_status := 'Indefinido';
    RETURN NEW;
  END IF;

  IF NEW.expiry_date < CURRENT_DATE THEN
    NEW.doc_status := 'Vencido';
  ELSIF NEW.expiry_date <= (CURRENT_DATE + INTERVAL '90 days') THEN
    NEW.doc_status := 'Para Renovar';
  ELSE
    NEW.doc_status := 'Vigente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_doc_control_status ON public.doc_control;
CREATE TRIGGER trg_doc_control_status
  BEFORE INSERT OR UPDATE ON public.doc_control
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_doc_control_status();
