'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Archive,
  PlayCircle,
  PlusCircle,
  FileQuestion,
  CheckSquare,
} from 'lucide-react';
import { Assessment } from '@/types';

interface AssessmentsScreenProps {
  assessments: Assessment[];
  onCreateNewAssessment: () => void;
  onApproveAssessment: (id: string) => void;
  onArchiveAssessment: (id: string) => void;
  onOpenAssessmentTaker: (assessment: Assessment) => void;
}

export function AssessmentsScreen({
  assessments,
  onCreateNewAssessment,
  onApproveAssessment,
  onArchiveAssessment,
  onOpenAssessmentTaker,
}: AssessmentsScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const total = assessments.length;
  const rascunhos = assessments.filter((a) => a.status === 'Rascunho').length;
  const ativas = assessments.filter((a) => a.status === 'Ativa').length;
  const encerradas = assessments.filter((a) => a.status === 'Encerrada').length;

  const statusBadge = (status: Assessment['status']) => {
    switch (status) {
      case 'Ativa':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rascunho':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Encerrada':
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  if (assessments.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <FileQuestion className="w-12 h-12 text-slate-300" />
        <p className="text-slate-600 font-semibold text-sm">Nenhuma avaliação criada ainda</p>
        <p className="text-slate-400 text-xs text-center max-w-xs">
          Avaliações são geradas automaticamente ao criar um procedimento via IA.
          Você também pode criar uma manualmente.
        </p>
        <button
          onClick={onCreateNewAssessment}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Gerar Procedimento + Avaliação via IA
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Banco de Avaliações
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {total} avaliação{total !== 1 ? 'ões' : ''} gerada{total !== 1 ? 's' : ''} por IA — revise e aprove para liberar aos colaboradores
          </p>
        </div>
        <button
          onClick={onCreateNewAssessment}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4" />
          + Gerar via IA
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">{total}</p>
          <span className="text-[11px] text-slate-500 font-medium">Avaliações</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rascunho</span>
          <p className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">{rascunhos}</p>
          <span className="text-[11px] text-amber-700 font-medium">Aguardando revisão</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ativas</span>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums mt-1">{ativas}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Liberadas para prova</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Encerradas</span>
          <p className="text-2xl font-extrabold text-slate-500 font-mono tabular-nums mt-1">{encerradas}</p>
          <span className="text-[11px] text-slate-500 font-medium">Arquivadas</span>
        </div>
      </div>

      {/* Assessment List */}
      <div className="space-y-3">
        {assessments.map((assessment) => {
          const isExpanded = expandedId === assessment.id;
          return (
            <div
              key={assessment.id}
              className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Card Header (always visible) */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : assessment.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {assessment.procedureCode && (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                          {assessment.procedureCode}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(assessment.status)}`}
                      >
                        {assessment.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                      {assessment.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {assessment.questionsCount} questão{assessment.questionsCount !== 1 ? 'ões' : ''} · mín. {assessment.minScorePercent}% · {assessment.durationMinutes} min · {assessment.maxAttempts} tentativa{assessment.maxAttempts !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {/* Quick action buttons (stop propagation) */}
                  {assessment.status === 'Rascunho' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onApproveAssessment(assessment.id); }}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Aprovar
                    </button>
                  )}
                  {assessment.status === 'Ativa' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenAssessmentTaker(assessment); }}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                    >
                      <PlayCircle className="w-3 h-3" />
                      Simular
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded: Question Review Panel */}
              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50/60">
                  {/* Action bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white">
                    <span className="text-xs text-slate-600 font-medium">
                      Revise as {assessment.questions.length} questão{assessment.questions.length !== 1 ? 'ões' : ''} abaixo
                    </span>
                    <div className="flex items-center gap-2">
                      {assessment.status === 'Rascunho' && (
                        <>
                          <button
                            onClick={() => onArchiveAssessment(assessment.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                          >
                            <Archive className="w-3 h-3" />
                            Arquivar
                          </button>
                          <button
                            onClick={() => onApproveAssessment(assessment.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Aprovar e Ativar
                          </button>
                        </>
                      )}
                      {assessment.status === 'Ativa' && (
                        <>
                          <button
                            onClick={() => onArchiveAssessment(assessment.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                          >
                            <Archive className="w-3 h-3" />
                            Encerrar
                          </button>
                          <button
                            onClick={() => onOpenAssessmentTaker(assessment)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                          >
                            <PlayCircle className="w-3 h-3" />
                            Simular Prova
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="p-4 space-y-4 max-h-[520px] overflow-y-auto">
                    {assessment.questions.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">Sem questões cadastradas.</p>
                    ) : (
                      assessment.questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="rounded-lg bg-white border border-slate-200 p-4 space-y-3 shadow-sm"
                        >
                          <p className="text-xs font-bold text-slate-800">
                            <span className="text-slate-400 font-mono mr-1">{idx + 1}.</span>
                            {q.question}
                          </p>
                          <div className="space-y-1.5">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = optIdx === q.correctOptionIndex;
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-start gap-2 px-3 py-1.5 rounded-lg text-xs ${
                                    isCorrect
                                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold'
                                      : 'bg-slate-50 border border-slate-200 text-slate-600'
                                  }`}
                                >
                                  <span className={`font-mono font-bold shrink-0 ${isCorrect ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  <span>{opt}</span>
                                  {isCorrect && (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 ml-auto mt-0.5" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {q.explanation && (
                            <div className="flex items-start gap-1.5 text-[11px] text-slate-500 bg-slate-50 rounded px-2.5 py-1.5 border border-slate-100">
                              <AlertCircle className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                              <span>{q.explanation}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
