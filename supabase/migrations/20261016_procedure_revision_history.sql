-- Histórico de revisões de procedimentos
-- Execute manualmente no Supabase SQL editor (projeto zwmqiuemrsyjauvohgtl)

CREATE TABLE IF NOT EXISTS procedure_revision_history (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id  UUID        NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  procedure_code TEXT       NOT NULL,
  revision      TEXT,                  -- ex: R01, R02
  revision_date DATE,                  -- doc_last_revision_date do momento
  responsible   TEXT,                  -- quem revisou
  notes         TEXT,                  -- observações da revisão
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE procedure_revision_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on procedure_revision_history"
  ON procedure_revision_history FOR ALL
  USING (true) WITH CHECK (true);

-- Índice para busca rápida por procedimento
CREATE INDEX IF NOT EXISTS idx_proc_rev_history_procedure_id
  ON procedure_revision_history(procedure_id, created_at DESC);
