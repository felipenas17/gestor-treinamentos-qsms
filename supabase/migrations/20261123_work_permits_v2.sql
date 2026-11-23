-- Módulo PT / PET — adição de campos v2 (FOR-TR-SMS-042)
-- Aplicar no Supabase dashboard: https://app.supabase.com/project/zwmqiuemrsyjauvohgtl/sql

-- Adiciona campos faltando ao template real
ALTER TABLE work_permits
  ADD COLUMN IF NOT EXISTS empresa_tipo     TEXT DEFAULT 'Tiger Rentank'
                                            CHECK (empresa_tipo IN ('Tiger Rentank', 'Terceiros')),
  ADD COLUMN IF NOT EXISTS epcs_selecionados TEXT,   -- JSON: string[]
  ADD COLUMN IF NOT EXISTS envolvidos        TEXT,   -- JSON: {nome:string}[]
  ADD COLUMN IF NOT EXISTS qsms_nome         TEXT;   -- Nome do responsável QSMS (assinatura)

-- riscos e medidas_controle e epis_selecionados já existem como TEXT
-- serão usados como JSON arrays de strings selecionadas
