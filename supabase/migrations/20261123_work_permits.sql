-- Módulo PT / PET — Permissões de Trabalho
-- Aplicar no Supabase dashboard: https://app.supabase.com/project/zwmqiuemrsyjauvohgtl/sql

CREATE TABLE IF NOT EXISTS work_permits (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  numero               TEXT        NOT NULL,
  tipo                 TEXT        NOT NULL CHECK (tipo IN ('PT', 'PET')),
  subtipo              TEXT        CHECK (subtipo IN ('altura', 'confinado', 'quente', 'eletrico', 'icamento')),
  data_emissao         DATE        NOT NULL,
  hora_inicio          TEXT        NOT NULL,
  hora_fim_prevista    TEXT        NOT NULL,
  unidade              TEXT,
  local_trabalho       TEXT        NOT NULL,
  descricao_atividade  TEXT        NOT NULL,
  empresa_executante   TEXT,
  responsavel_execucao TEXT        NOT NULL,
  equipe               TEXT,
  riscos               TEXT,
  medidas_controle     TEXT,
  epis_selecionados    TEXT,
  autorizador_nome     TEXT,
  autorizador_funcao   TEXT,
  status               TEXT        NOT NULL DEFAULT 'emitida'
                                   CHECK (status IN ('emitida', 'em_execucao', 'encerrada', 'cancelada')),
  hora_encerramento    TIMESTAMPTZ,
  observacoes          TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_permits_status ON work_permits(status);
CREATE INDEX IF NOT EXISTS idx_work_permits_tipo   ON work_permits(tipo);
CREATE INDEX IF NOT EXISTS idx_work_permits_data   ON work_permits(data_emissao);

CREATE OR REPLACE FUNCTION update_work_permits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS work_permits_updated_at ON work_permits;
CREATE TRIGGER work_permits_updated_at
  BEFORE UPDATE ON work_permits
  FOR EACH ROW EXECUTE FUNCTION update_work_permits_updated_at();
