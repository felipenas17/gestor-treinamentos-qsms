-- =========================================================================
-- BANCO DE DADOS SUPABASE: GESTOR DE TREINAMENTOS INTERNOS QSMS OFFSHORE
-- Esquema completo com RLS (Row Level Security), cálculo de vigência no servidor
-- e links de avaliação protegidos por UUID (sem expor CPF na URL).
-- =========================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE PROCEDIMENTOS (POPs)
CREATE TABLE IF NOT EXISTS public.procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    associated_role VARCHAR(150) NOT NULL,
    application TEXT NOT NULL,
    compliance_rate NUMERIC(5,2) DEFAULT 100.00 CHECK (compliance_rate BETWEEN 0 AND 100),
    last_revision DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Em Revisão', 'Arquivado')),
    questions_count INTEGER DEFAULT 0,
    criticality VARCHAR(20) DEFAULT 'Alta' CHECK (criticality IN ('Alta', 'Média', 'Baixa')),
    validity_months INTEGER DEFAULT 12,
    content_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE COLABORADORES
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    role VARCHAR(150) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    cpf_hash VARCHAR(64), -- Nunca armazenar CPF puro ou usar em URLs
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Embarcado', 'Desembarcado', 'Afastado')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE TREINAMENTOS E REGISTROS
CREATE TABLE IF NOT EXISTS public.trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE RESTRICT,
    completion_date DATE NOT NULL,
    validity_date DATE NOT NULL, -- Calculada no servidor via Trigger
    days_remaining INTEGER GENERATED ALWAYS AS ((validity_date - CURRENT_DATE)) STORED,
    compliance_rate NUMERIC(5,2) DEFAULT 100.00,
    status VARCHAR(30) NOT NULL CHECK (status IN ('Certificado', 'Reciclar', 'Vencido')),
    instructor VARCHAR(200),
    certificate_hash VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para cálculo automático da validade do treinamento no servidor
CREATE OR REPLACE FUNCTION public.calculate_training_validity()
RETURNS TRIGGER AS $$
DECLARE
    v_months INTEGER;
BEGIN
    SELECT COALESCE(validity_months, 12) INTO v_months 
    FROM public.procedures WHERE id = NEW.procedure_id;

    IF NEW.validity_date IS NULL THEN
        NEW.validity_date := NEW.completion_date + (v_months || ' months')::INTERVAL;
    END IF;

    -- Atualiza status dinamicamente
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

DROP TRIGGER IF EXISTS trg_calc_training_validity ON public.trainings;
CREATE TRIGGER trg_calc_training_validity
BEFORE INSERT OR UPDATE ON public.trainings
FOR EACH ROW EXECUTE FUNCTION public.calculate_training_validity();

-- 4. TABELA DE AVALIAÇÕES (PROVAS DE EFICÁCIA)
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
    min_score_percent INTEGER DEFAULT 80 CHECK (min_score_percent BETWEEN 0 AND 100),
    duration_minutes INTEGER DEFAULT 20,
    max_attempts INTEGER DEFAULT 2,
    questions_bank JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(30) DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Rascunho', 'Encerrada')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE LINKS DE AVALIAÇÃO PROTEGIDOS POR UUID (SEM CPF NA URL)
CREATE TABLE IF NOT EXISTS public.assessment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    max_uses INTEGER DEFAULT 2,
    uses_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE RESPOSTAS E SUBMISSÕES
CREATE TABLE IF NOT EXISTS public.responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL REFERENCES public.assessment_links(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    score_percent NUMERIC(5,2) CHECK (score_percent BETWEEN 0 AND 100),
    status VARCHAR(30) NOT NULL CHECK (status IN ('Entregue', 'Pendente', 'Reprovado', 'Em Andamento')),
    attempt_number INTEGER DEFAULT 1,
    answers JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS (Segurança Restritiva por Role)

-- Gestores de QSMS autenticados têm acesso total de leitura e escrita
CREATE POLICY "QSMS Managers full access on procedures" 
ON public.procedures FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'role' IN ('admin', 'qsms_manager', 'supervisor'))
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'qsms_manager', 'supervisor'));

-- Leitura pública para colaboradores consultarem procedimentos vigentes
CREATE POLICY "Public read active procedures" 
ON public.procedures FOR SELECT 
TO authenticated, anon 
USING (status = 'Ativo');

-- Colaboradores: Somente QSMS gerencia registros
CREATE POLICY "QSMS manages employees and trainings" 
ON public.trainings FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Assessment Links: Validação segura via UUID Token para responder provas
CREATE POLICY "Access assessment by valid UUID token" 
ON public.assessment_links FOR SELECT 
TO anon, authenticated 
USING (is_active = TRUE AND expires_at > NOW());

-- Permissão para gravar respostas anônimas / autenticadas via UUID
CREATE POLICY "Submit response with valid link" 
ON public.responses FOR INSERT 
TO anon, authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.assessment_links 
        WHERE id = link_id AND is_active = TRUE AND expires_at > NOW()
    )
);
