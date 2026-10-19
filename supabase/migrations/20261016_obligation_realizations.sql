-- Migration: 20261016_obligation_realizations
-- Expande módulo de Obrigações Legais: histórico de realizações + status de execução
-- Execute manualmente no Supabase SQL editor (projeto zwmqiuemrsyjauvohgtl)

-- 1. Adiciona status de execução à tabela de obrigações
ALTER TABLE public.legal_obligations
  ADD COLUMN IF NOT EXISTS execution_status TEXT DEFAULT 'Pendente';

-- Valores válidos: Pendente | Em andamento | Parcial | Concluído

-- 2. Tabela de histórico de realizações (uma linha por ocorrência registrada)
CREATE TABLE IF NOT EXISTS public.obligation_realizations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obligation_id   UUID NOT NULL REFERENCES public.legal_obligations(id) ON DELETE CASCADE,
  done_date       DATE NOT NULL,
  notes           TEXT DEFAULT NULL,
  file_url        TEXT DEFAULT NULL,
  file_name       TEXT DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: acesso total (mesma política do restante do projeto)
ALTER TABLE public.obligation_realizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all obligation_realizations" ON public.obligation_realizations;
CREATE POLICY "Allow all obligation_realizations" ON public.obligation_realizations
  FOR ALL USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_obligation_realizations_obligation_id
  ON public.obligation_realizations(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obligation_realizations_done_date
  ON public.obligation_realizations(done_date DESC);

-- 3. Trigger: ao inserir uma realização, atualiza last_done_date da obrigação pai
--    → esse UPDATE dispara o trigger trg_obligation_status existente,
--      que recalcula next_due_date e obligation_status automaticamente.
CREATE OR REPLACE FUNCTION public.sync_obligation_last_done()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.legal_obligations
  SET last_done_date = (
    SELECT MAX(done_date)
    FROM public.obligation_realizations
    WHERE obligation_id = NEW.obligation_id
  )
  WHERE id = NEW.obligation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_obligation_last_done ON public.obligation_realizations;
CREATE TRIGGER trg_sync_obligation_last_done
  AFTER INSERT ON public.obligation_realizations
  FOR EACH ROW EXECUTE FUNCTION public.sync_obligation_last_done();
