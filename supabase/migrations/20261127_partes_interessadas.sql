-- Partes Interessadas (FOR TR-SMS-005-01-R03)
-- Projeto Supabase: portal-qsms (dayvjhlaigacrtjnpguv)

CREATE TABLE IF NOT EXISTS partes_interessadas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem integer NOT NULL DEFAULT 0,
  parte_interessada text NOT NULL,
  necessidade text,
  expectativa text,
  requisito text,
  interesse_tiger text,
  como_atingidos text,
  acoes_atingimento text,
  monitoramento text,
  riscos_oportunidades text,
  acoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partes_interessadas_revisoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero integer NOT NULL,
  descricao text NOT NULL,
  participantes text,
  data date,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION partes_interessadas_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partes_interessadas_upd ON partes_interessadas;
CREATE TRIGGER trg_partes_interessadas_upd
  BEFORE UPDATE ON partes_interessadas
  FOR EACH ROW EXECUTE FUNCTION partes_interessadas_set_updated_at();

ALTER TABLE partes_interessadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE partes_interessadas_revisoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_all_partes_interessadas ON partes_interessadas
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_partes_interessadas_revisoes ON partes_interessadas_revisoes
  FOR ALL USING (true) WITH CHECK (true);
