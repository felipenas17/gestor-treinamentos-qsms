'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  Users,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileQuestion,
  BarChart3,
  Clock,
  Award,
  ClipboardList,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Procedure } from '@/types';
import { fetchAssessmentByProcedureCode, fetchRespondentsByAssessment } from '@/lib/supabase';

interface ProcedureExamModalProps {
  procedure: Procedure | null;
  onClose: () => void;
  onGoToAssessments?: () => void;
}

export function ProcedureExamModal({
  procedure,
  onClose,
  onGoToAssessments,
}: ProcedureExamModalProps) {
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState<any>(null);
  const [respondents, setRespondents] = useState<any[]>([]);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'questoes' | 'respondentes'>('questoes');
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (!procedure) return;
    setLoading(true);
    setExam(null);
    setRespondents([]);
    fetchAssessmentByProcedureCode(procedure.code)
      .then(async (examData) => {
        setExam(examData);
        if (examData?.id) {
          const resp = await fetchRespondentsByAssessment(examData.id);
          setRespondents(resp);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [procedure]);

  if (!procedure) return null;

  const handleCopyToken = (token: string) => {
    const url = `${window.location.origin}/avaliacoes/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const questions: any[] = exam?.assessment_questions ?? [];
  const approved = respondents.filter((r) => r.score_percent >= (exam?.min_score_percent ?? 80)).length;
  const approvalRate = respondents.length > 0 ? Math.round((approved / respondents.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl flex flex-col">

        {/* ── Header ── */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between z-10 rounded-t-2xl">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {procedure.code}
              </span>
              {procedure.revision && (
                <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {procedure.revision}
                </span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                procedure.criticality === 'Alta'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : procedure.criticality === 'Média'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>{procedure.criticality}</span>
            </div>
            <h2 className="mt-1.5 text-base font-bold text-slate-900 leading-snug truncate">
              {procedure.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              Gestão de Avaliação / Banco de Questões
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 ml-3 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-500">Buscando avaliação...</p>
            </div>
          ) : exam ? (
            <div className="space-y-5">
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Questões</p>
                  <p className="text-xl font-extrabold text-blue-700 font-mono mt-0.5">{questions.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mínimo</p>
                  <p className="text-xl font-extrabold text-amber-600 font-mono mt-0.5">{exam.min_score_percent ?? 80}%</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Respondentes</p>
                  <p className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">{respondents.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Aprovação</p>
                  <p className={`text-xl font-extrabold font-mono mt-0.5 ${approvalRate >= 80 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {approvalRate}%
                  </p>
                </div>
              </div>

              {/* Exam header info */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono font-bold text-blue-700">{exam.code ?? exam.id?.slice(0, 8)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    exam.status === 'Ativa'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>{exam.status ?? 'Ativa'}</span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Clock className="w-3 h-3" /> {exam.duration_minutes ?? 20} min
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Award className="w-3 h-3" /> {exam.max_attempts ?? 2} tentativas
                  </span>
                </div>
                {exam.token_uuid && (
                  <button
                    onClick={() => handleCopyToken(exam.token_uuid)}
                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                    title="Copiar link da avaliação"
                  >
                    {copiedToken ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedToken ? 'Copiado!' : 'Link UUID'}
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-200">
                {(['questoes', 'respondentes'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
                      activeTab === tab
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab === 'questoes' ? (
                      <span className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Questões ({questions.length})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Respondentes ({respondents.length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab: Questões */}
              {activeTab === 'questoes' && (
                <div className="space-y-2">
                  {questions.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">
                      Nenhuma questão cadastrada nesta avaliação.
                    </div>
                  ) : (
                    questions.map((q: any, idx: number) => {
                      const qId = q.id ?? String(idx);
                      const isOpen = expandedQuestion === qId;
                      const options: string[] = Array.isArray(q.options) ? q.options : [];
                      return (
                        <div key={qId} className="border border-slate-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setExpandedQuestion(isOpen ? null : qId)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                          >
                            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="flex-1 text-xs font-medium text-slate-800 leading-snug">
                              {q.question}
                            </span>
                            {isOpen
                              ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                              : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                          </button>
                          {isOpen && (
                            <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-2">
                              {options.map((opt: string, optIdx: number) => {
                                const isCorrect = optIdx === q.correct_option_index;
                                return (
                                  <div key={optIdx}
                                    className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                                      isCorrect
                                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold'
                                        : 'bg-white border border-slate-200 text-slate-600'
                                    }`}>
                                    <span className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center rounded-full text-[10px] font-bold border
                                      ${isCorrect ? 'border-emerald-400 bg-emerald-100 text-emerald-700' : 'border-slate-300 text-slate-500'}">
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="flex-1">{opt}</span>
                                    {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                  </div>
                                );
                              })}
                              {q.explanation && (
                                <div className="text-[11px] text-slate-500 italic border-t border-slate-200 pt-2 mt-1">
                                  💡 {q.explanation}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab: Respondentes */}
              {activeTab === 'respondentes' && (
                <div>
                  {respondents.length === 0 ? (
                    <div className="py-10 text-center">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-500">Nenhum respondente ainda</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Copie o link UUID e distribua para os colaboradores.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wide font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Colaborador</th>
                            <th className="py-2.5 px-3 text-center">Nota</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-center">Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {respondents.map((r: any) => {
                            const passed = r.score_percent >= (exam?.min_score_percent ?? 80);
                            return (
                              <tr key={r.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3">
                                  <p className="font-semibold text-slate-900">{r.employees?.name ?? '—'}</p>
                                  <p className="text-[10px] text-slate-400">{r.employees?.role ?? ''}</p>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold">
                                  {r.score_percent != null ? (
                                    <span className={passed ? 'text-emerald-700' : 'text-red-600'}>
                                      {r.score_percent}%
                                    </span>
                                  ) : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {r.score_percent != null ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      passed
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                      {passed ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                      {passed ? 'Aprovado' : 'Reprovado'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 font-semibold">Pendente</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                                  {r.created_at
                                    ? new Date(r.created_at).toLocaleDateString('pt-BR')
                                    : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── Empty state — no exam yet ── */
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center">
                <FileQuestion className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Nenhuma avaliação criada para este POP
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Este procedimento ainda não possui uma avaliação vinculada.
                  Crie uma na aba <span className="font-semibold text-blue-600">Gestão de Provas</span> para aplicar testes aos colaboradores.
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 mt-2">
                {onGoToAssessments && (
                  <button
                    onClick={() => { onClose(); onGoToAssessments(); }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Ir para Gestão de Provas
                  </button>
                )}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                    {procedure.code}
                  </span>
                  <span>·</span>
                  <span>{procedure.validityMonths} meses de validade</span>
                  {procedure.sectors && procedure.sectors.length > 0 && (
                    <>
                      <span>·</span>
                      <span>{procedure.sectors.join(', ')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
