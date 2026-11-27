-- Requisitos Legais (GRL) — relatórios anuais em PDF
-- Projeto Supabase: portal-qsms (dayvjhlaigacrtjnpguv)

CREATE TABLE IF NOT EXISTS grl_relatorios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ano integer NOT NULL,
  tipo text NOT NULL DEFAULT 'Revisão',   -- Implantação | Revisão | Auditoria de Requisitos
  unidade text,                            -- Macaé | Rio das Ostras | Macaé e Rio das Ostras | NULL
  titulo text NOT NULL,
  data_relatorio date NOT NULL,
  arquivo_url text NOT NULL,
  arquivo_nome text,
  tamanho_bytes bigint,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION grl_relatorios_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grl_relatorios_upd ON grl_relatorios;
CREATE TRIGGER trg_grl_relatorios_upd
  BEFORE UPDATE ON grl_relatorios
  FOR EACH ROW EXECUTE FUNCTION grl_relatorios_set_updated_at();

ALTER TABLE grl_relatorios ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all_grl_relatorios ON grl_relatorios
  FOR ALL USING (true) WITH CHECK (true);

-- Bucket de armazenamento dos PDFs (mesmo padrão dos demais buckets do app)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('grl-relatorios', 'grl-relatorios', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read grl-relatorios" ON storage.objects
  FOR SELECT USING (bucket_id = 'grl-relatorios');
CREATE POLICY "Anon insert grl-relatorios" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'grl-relatorios');
