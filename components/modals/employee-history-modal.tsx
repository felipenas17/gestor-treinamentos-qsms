'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  History,
  CheckCircle2,
  XCircle,
  Loader2,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Trophy,
  Target,
  BookOpen,
} from 'lucide-react';
import { fetchAssessmentHistory, AssessmentAttempt } from '@/lib/supabase';

interface EmployeeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeRole?: string;
  employeeSector?: string;
}

interface ProcedureGroup {
  procedureCode: string;
  assessmentTitle: string;
  attempts: AssessmentAttempt[];
  bestScore: number;
  passed: boolean;
  minScore: number;
}

function formatDate(iso: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function EmployeeHistoryModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeRole,
  employeeSector,
}: EmployeeHistoryModalProps) {
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedProcs, setExpandedProcs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !employeeId) return;

    async function load() {
      setLoading(true);
      setExpandedProcs(new Set());
      try {
        // Sem filtro de procedimento → retorna TODAS as tentativas do colaborador
        const data = await fetchAssessmentHistory(employeeId);
        setAttempts(data);
      } catch {
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isOpen, employeeId]);

  // Agrupa por procedimento
  const procedureGroups = useMemo((): ProcedureGroup[] => {
    const map = new Map<string, ProcedureGroup>();

    for (const a of attempts) {
      const key = a.procedureCode;
      if (!map.has(key)) {
        map.set(key, {
          procedureCode: a.procedureCode,
          assessmentTitle: a.assessmentTitle,
          attempts: [],
          bestScore: 0,
          passed: false,
          minScore: a.minScore,
        });
      }
      const grp = map.get(key)!;
      grp.attempts.push(a);
      if (a.score > grp.bestScore) grp.bestScore = a.score;
      if (a.passed) grp.passed = true;
    }

    return Array.from(map.values()).sort((a, b) => a.procedureCode.localeCompare(b.procedureCode));
  }, [attempts]);

  // KPIs globais
  const totalAttempts = attempts.length;
  const totalProcedures = procedureGroups.length;
  const approvedProcedures = procedureGroups.filter((g) => g.passed).length;
  const approvalRate =
    totalProcedures > 0 ? Math.round((approvedProcedures / totalProcedures) * 100) : 0;

  const toggleProc = (code: string) => {
    setExpandedProcs((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 text-violet-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{employeeName}</h2>
              {(employeeRole || employeeSector) && (
                <p className="text-xs text-slate-500">
                  {[employeeRole, employeeSector].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando histórico...</span>
            </div>
          ) : attempts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <ClipboardList className="w-10 h-10 opacity-30" />
              <p className="text-sm font-semibold">Nenhuma tentativa registrada</p>
              <p className="text-xs text-center max-w-xs">
                As avaliações concluídas via link serão exibidas aqui, agrupadas por procedimento.
              </p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* ── KPI summary ── */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <div className="flex items-center justify-center mb-1 text-slate-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-800">{totalAttempts}</p>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">
                    Total de tentativas
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-violet-200 bg-violet-50 text-center">
                  <div className="flex items-center justify-center mb-1 text-violet-400">
                    <Target className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-violet-800">{totalProcedures}</p>
                  <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide mt-0.5">
                    Procedimentos avaliados
                  </p>
                </div>
                <div className={`p-3 rounded-xl border text-center ${
                  approvalRate >= 70
                    ? 'border-emerald-200 bg-emerald-50'
                    : approvalRate >= 40
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className={`flex items-center justify-center mb-1 ${
                    approvalRate >= 70 ? 'text-emerald-400' : approvalRate >= 40 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    <Trophy className="w-4 h-4" />
                  </div>
                  <p className={`text-xl font-bold ${
                    approvalRate >= 70 ? 'text-emerald-800' : approvalRate >= 40 ? 'text-amber-800' : 'text-red-800'
                  }`}>
                    {approvalRate}%
                  </p>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${
                    approvalRate >= 70 ? 'text-emerald-600' : approvalRate >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    Taxa de aprovação
                  </p>
                </div>
              </div>

              {/* ── Procedure groups ── */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Por procedimento
                </p>
                {procedureGroups.map((grp) => {
                  const isExpanded = expandedProcs.has(grp.procedureCode);
                  return (
                    <div
                      key={grp.procedureCode}
                      className="rounded-xl border border-slate-200 overflow-hidden bg-white"
                    >
                      {/* Procedure header (clickable) */}
                      <button
                        onClick={() => toggleProc(grp.procedureCode)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        }

                        {/* Code badge */}
                        <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 shrink-0">
                          {grp.procedureCode}
                        </span>

                        {/* Title */}
                        <span className="flex-1 min-w-0 text-sm font-medium text-slate-700 truncate">
                          {grp.assessmentTitle || '—'}
                        </span>

                        {/* Meta */}
                        <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500">
                          <span className="hidden sm:inline">
                            {grp.attempts.length} tentativa{grp.attempts.length !== 1 ? 's' : ''}
                          </span>
                          <span className={`font-bold ${grp.bestScore >= grp.minScore ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {grp.bestScore}% melhor
                          </span>
                          {grp.passed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Aprovado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                              <XCircle className="w-3 h-3" /> Reprovado
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Expanded: individual attempts */}
                      {isExpanded && (
                        <div className="border-t border-slate-100">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500">
                                <th className="py-2 px-4 text-left font-semibold w-8">#</th>
                                <th className="py-2 px-3 text-left font-semibold">Data</th>
                                <th className="py-2 px-3 text-left font-semibold hidden sm:table-cell">Horário</th>
                                <th className="py-2 px-3 text-center font-semibold">Nota</th>
                                <th className="py-2 px-3 text-center font-semibold">Resultado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {grp.attempts.map((attempt, idx) => (
                                <tr
                                  key={attempt.id}
                                  className={`border-t border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                                >
                                  <td className="py-2 px-4 text-slate-400 font-mono text-[11px]">
                                    {grp.attempts.length - idx}
                                  </td>
                                  <td className="py-2 px-3 text-slate-700 font-medium">
                                    {formatDate(attempt.completedAt)}
                                  </td>
                                  <td className="py-2 px-3 text-slate-500 hidden sm:table-cell">
                                    {formatTime(attempt.completedAt)}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                                      attempt.passed
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : attempt.score >= attempt.minScore * 0.8
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-red-50 text-red-700'
                                    }`}>
                                      {attempt.score}%
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {attempt.passed ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                                        <CheckCircle2 className="w-3 h-3" /> Aprovado
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-red-500 font-semibold text-[11px]">
                                        <XCircle className="w-3 h-3" /> Reprovado
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <p className="text-[10px] text-slate-400 text-right px-4 py-2">
                            Nota mínima para aprovação: {grp.minScore}%
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-400">
            Histórico completo de avaliações via link
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
