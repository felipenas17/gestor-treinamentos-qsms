'use client';

import React from 'react';
import { X, FileText, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { Procedure } from '@/types';

interface ProcedureDetailsModalProps {
  procedure: Procedure | null;
  onClose: () => void;
  onStartAssessment?: (procedure: Procedure) => void;
}

export function ProcedureDetailsModal({
  procedure,
  onClose,
  onStartAssessment,
}: ProcedureDetailsModalProps) {
  if (!procedure) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200">
              {procedure.code}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {procedure.name}
              </h2>
              <p className="text-xs text-slate-500">
                Setor: {procedure.sector} · Revisão: {procedure.lastRevision}
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
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500">Conformidade Operacional</span>
              <p className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {procedure.complianceRate}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500">Banco de Questões</span>
              <p className="text-lg font-bold text-blue-600 font-mono tabular-nums mt-0.5">
                {procedure.questionsCount} questões
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500">Vigência Recomendada</span>
              <p className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {procedure.validityMonths} meses
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
              Aplicação Prática no Convés & Unidades Flutuantes
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              {procedure.application}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
              Cargo e Funções Críticas Associadas
            </h3>
            <p className="text-xs text-slate-700 font-medium bg-slate-50 p-3 rounded-lg border border-slate-200">
              {procedure.associatedRole}
            </p>
          </div>

          {procedure.description && (
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                Barreiras de Segurança & Descrição Normativa
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {procedure.description}
              </p>
            </div>
          )}

          {/* Banco de questões preview */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-blue-950">
                  Banco de Questões Geradas via IA
                </h4>
              </div>
              <span className="text-[11px] font-mono text-blue-700 font-semibold">
                {procedure.questionsCount} ativas
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Questões calibradas com pesos de risco crítico para aprovação mínima de 80%. As provas são distribuídas em links seguros com token UUID único.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Status: <span className="font-semibold text-emerald-700">{procedure.status}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Fechar
            </button>
            {onStartAssessment && (
              <button
                onClick={() => {
                  onClose();
                  onStartAssessment(procedure);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Abrir Módulo de Avaliação
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
