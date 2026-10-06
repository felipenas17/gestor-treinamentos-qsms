'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Database, Shield, Lock, FileCode } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

interface SupabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupabaseSchemaModal({ isOpen, onClose }: SupabaseSchemaModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlCode = `-- ESQUEMA DE BANCO SUPABASE: GESTOR DE TREINAMENTOS INTERNOS QSMS
-- Tabelas: procedures, employees, trainings, assessments, assessment_links, responses
-- Segurança: RLS ativado em todas as tabelas. Validade calculada no servidor. Tokens UUID.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. procedures
CREATE TABLE public.procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    associated_role VARCHAR(150) NOT NULL,
    application TEXT NOT NULL,
    compliance_rate NUMERIC(5,2) DEFAULT 100.00,
    last_revision DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Em Revisão', 'Arquivado')),
    questions_count INTEGER DEFAULT 0,
    criticality VARCHAR(20) DEFAULT 'Alta',
    validity_months INTEGER DEFAULT 12,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. employees
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    role VARCHAR(150) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. trainings (Cálculo de vigência no servidor via Trigger)
CREATE TABLE public.trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE RESTRICT,
    completion_date DATE NOT NULL,
    validity_date DATE NOT NULL,
    days_remaining INTEGER GENERATED ALWAYS AS ((validity_date - CURRENT_DATE)) STORED,
    compliance_rate NUMERIC(5,2) DEFAULT 100.00,
    status VARCHAR(30) NOT NULL CHECK (status IN ('Certificado', 'Reciclar', 'Vencido')),
    instructor VARCHAR(200),
    certificate_hash VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. assessments
CREATE TABLE public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
    min_score_percent INTEGER DEFAULT 80,
    duration_minutes INTEGER DEFAULT 20,
    max_attempts INTEGER DEFAULT 2,
    questions_bank JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(30) DEFAULT 'Ativa',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. assessment_links (Tokens UUID anônimos - SEM CPF NA URL)
CREATE TABLE public.assessment_links (
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

-- 6. responses
CREATE TABLE public.responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL REFERENCES public.assessment_links(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    score_percent NUMERIC(5,2),
    status VARCHAR(30) NOT NULL CHECK (status IN ('Entregue', 'Pendente', 'Reprovado', 'Em Andamento')),
    answers JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilita RLS em todas as tabelas
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Esquema de Banco de Dados Supabase (PostgreSQL)
                </h2>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    isSupabaseConfigured
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {isSupabaseConfigured ? 'Nuvem Conectada' : 'Modo Reativo Local'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tabelas com RLS, cálculo de vigência no servidor e links com tokens UUID.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-130px)]">
          {/* Architecture Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900">RLS (Row Level Security)</p>
                <p className="text-[11px] text-slate-500">Políticas granulares impedem vazamento de dados entre perfis.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900">Links Seguros por UUID</p>
                <p className="text-[11px] text-slate-500">Avaliações acessadas via hash UUID v4. Zero CPF ou IDs sensíveis em URLs.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2.5">
              <FileCode className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900">Vigência no Servidor</p>
                <p className="text-[11px] text-slate-500">Triggers calculam automaticamente datas e status (Certificado/Reciclar/Vencido).</p>
              </div>
            </div>
          </div>

          {/* SQL Editor preview */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1222] overflow-hidden text-slate-200">
            <div className="px-4 py-2.5 bg-[#090e1a] border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400">schema_supabase_qsms.sql</span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar DDL Completo</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed text-slate-300 max-h-[360px]">
              {sqlCode}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Pronto para ser colado no SQL Editor do dashboard da Supabase.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
