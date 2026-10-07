-- =========================================================================
-- MIGRATION: sector_procedure_matrix + pending trainings
-- Aplique este script no Supabase Dashboard → SQL Editor
-- =========================================================================

-- 1. TABELA: Matriz de procedimentos por setor
CREATE TABLE IF NOT EXISTS public.sector_procedure_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector VARCHAR(100) NOT NULL,
    procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sector, procedure_id)
);

ALTER TABLE public.sector_procedure_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sector matrix"
ON public.sector_procedure_matrix FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated manage sector matrix"
ON public.sector_procedure_matrix FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

-- 2. ATUALIZAR employees: adicionar phone e cpf_display (mascarado)
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cpf_masked VARCHAR(20);

-- 3. MODIFICAR trainings: adicionar status 'Pendente' e tornar campos opcionais
ALTER TABLE public.trainings
    DROP CONSTRAINT IF EXISTS trainings_status_check;

ALTER TABLE public.trainings
    ADD CONSTRAINT trainings_status_check
    CHECK (status IN ('Certificado', 'Reciclar', 'Vencido', 'Pendente'));

-- Permitir NULL em completion_date e validity_date para registros pendentes
ALTER TABLE public.trainings
    ALTER COLUMN completion_date DROP NOT NULL,
    ALTER COLUMN validity_date DROP NOT NULL;

-- 4. ATUALIZAR TRIGGER: não recalcular status 'Pendente'
CREATE OR REPLACE FUNCTION public.calculate_training_validity()
RETURNS TRIGGER AS $$
DECLARE
    v_months INTEGER;
BEGIN
    -- Não recalcular registros pendentes
    IF NEW.status = 'Pendente' THEN
        NEW.completion_date := NULL;
        NEW.validity_date := NULL;
        RETURN NEW;
    END IF;

    SELECT COALESCE(validity_months, 12) INTO v_months
    FROM public.procedures WHERE id = NEW.procedure_id;

    IF NEW.validity_date IS NULL AND NEW.completion_date IS NOT NULL THEN
        NEW.validity_date := NEW.completion_date + (v_months || ' months')::INTERVAL;
    END IF;

    -- Atualiza status dinamicamente
    IF NEW.validity_date IS NULL THEN
        NEW.status := 'Vencido';
    ELSIF NEW.validity_date < CURRENT_DATE THEN
        NEW.status := 'Vencido';
    ELSIF NEW.validity_date <= (CURRENT_DATE + INTERVAL '60 days') THEN
        NEW.status := 'Reciclar';
    ELSE
        NEW.status := 'Certificado';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
DROP TRIGGER IF EXISTS trg_calc_training_validity ON public.trainings;
CREATE TRIGGER trg_calc_training_validity
BEFORE INSERT OR UPDATE ON public.trainings
FOR EACH ROW EXECUTE FUNCTION public.calculate_training_validity();

-- 5. RLS para employees
CREATE POLICY IF NOT EXISTS "Anon read employees"
ON public.employees FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated manage employees"
ON public.employees FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

-- Para uso com anon key (sem autenticação) — permite operações diretas via anon key
-- Remova estas políticas se usar autenticação Supabase
CREATE POLICY IF NOT EXISTS "Anon manage employees"
ON public.employees FOR ALL
TO anon
USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Anon manage trainings"
ON public.trainings FOR ALL
TO anon
USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Anon manage sector matrix"
ON public.sector_procedure_matrix FOR ALL
TO anon
USING (true) WITH CHECK (true);
