'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Archive,
  PlayCircle,
  Loader2,
  Sparkles,
  CheckSquare,
  QrCode,
  Copy,
  Check,
  Trash2,
  CalendarClock,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Assessment, Procedure, TrainingRecord } from '@/types';

interface AssessmentsScreenProps {
  procedures: Procedure[];
  assessments: Assessment[];
  records: TrainingRecord[];
  onApproveAssessment: (id: string) => void;
  onArchiveAssessment: (id: string) => void;
  onDeleteAssessment: (id: string) => void;
  onOpenAssessmentTaker: (assessment: Assessment) => void;
  onGenerateAssessment: (proc: Procedure) => Promise<void>;
}

export function AssessmentsScreen({
  procedures,
  assessments,
  records,
  onApproveAssessment,
  onArchiveAssessment,
  onDeleteAssessment,
  onOpenAssessmentTaker,
  onGenerateAssessment,
}: AssessmentsScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Agrupar registros da matriz por data de validade, ordenados pela urgência
  const expirationGroups = useMemo(() => {
    const map = new Map<string, TrainingRecord[]>();
    records.forEach(r => {
      const existing = map.get(r.validityDate) || [];
      existing.push(r);
      map.set(r.validityDate, existing);
    });
    return Array.from(map.entries())
      .map(([date, recs]) => ({
        date,
        records: recs,
        minDays: Math.min(...recs.map(r => r.daysRemaining)),
      }))
      .sort((a, b) => a.minDays - b.minDays)
      .slice(0, 12);
  }, [records]);

  const total = procedures.length;
  const comAvaliacao = assessments.filter((a) => a.status !== 'Encerrada').length;
  const ativas = assessments.filter((a) => a.status === 'Ativa').length;
  // Only non-Encerrada assessments block the "Sem avaliação" state
  const semAvaliacao = procedures.filter(
    (p) => !assessments.find((a) => a.procedureCode === p.code && a.status !== 'Encerrada')
  ).length;

  // Encerrada assessments are invisible — the card shows "Gerar via IA" again
  const getAssessmentForProc = (code: string) =>
    assessments.find((a) => a.procedureCode === code && a.status !== 'Encerrada') ?? null;

  const dateBadgeStyle = (days: number) => {
    if (days < 0) return { bar: 'bg-red-600', badge: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500', label: `${Math.abs(days)}d vencido` };
    if (days <= 30) return { bar: 'bg-red-400', badge: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-400', label: `${days}d restantes` };
    if (days <= 60) return { bar: 'bg-amber-400', badge: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-400', label: `${days}d restantes` };
    return { bar: 'bg-blue-400', badge: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-400', label: `${days}d restantes` };
  };

  const statusBadge = (status: Assessment['status']) => {
    switch (status) {
      case 'Ativa':      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rascunho':   return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Encerrada':  return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getAssessmentLink = (assessment: Assessment) => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.tigertank.com.br';
    return `${base}/avaliar/${assessment.tokenUuid}`;
  };

  const handleCopyLink = (assessment: Assessment) => {
    navigator.clipboard.writeText(getAssessmentLink(assessment));
    setCopiedId(assessment.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = async (proc: Procedure) => {
    setGeneratingFor(proc.code);
    try {
      await onGenerateAssessment(proc);
    } finally {
      setGeneratingFor(null);
    }
  };

  if (procedures.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <CheckSquare className="w-12 h-12 text-slate-300" />
        <p className="text-slate-600 font-semibold text-sm">Nenhum procedimento cadastrado ainda</p>
        <p className="text-slate-400 text-xs text-center max-w-xs">
          Crie procedimentos na aba <strong>Procedimentos</strong> — as avaliações serão geradas automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Gestão de Provas
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {total} procedimento{total !== 1 ? 's' : ''} · avaliações geradas por IA, revise e ative para liberar o link/QR Code
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Procedimentos</span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">{total}</p>
          <span className="text-[11px] text-slate-500 font-medium">No banco</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sem Prova</span>
          <p className="text-2xl font-extrabold text-orange-500 font-mono tabular-nums mt-1">{semAvaliacao}</p>
          <span className="text-[11px] text-orange-600 font-medium">Aguardando geração</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ativas</span>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums mt-1">{ativas}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Link/QR liberado</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Com Avaliação</span>
          <p className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums mt-1">{comAvaliacao}</p>
          <span className="text-[11px] text-blue-700 font-medium">Rascunho ou ativa</span>
        </div>
      </div>

      {/* Painel de Vencimentos por Data */}
      {expirationGroups.length > 0 && (
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
            <CalendarClock className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Calendário de Vencimentos</span>
            <span className="ml-auto text-[11px] text-slate-400 font-medium">Por data de validade da matriz</span>
          </div>
          <div className="divide-y divide-slate-100">
            {expirationGroups.map(({ date, records: recs, minDays }) => {
              const style = dateBadgeStyle(minDays);
              const isOpen = expandedDate === date;
              const vencido = minDays < 0;
              return (
                <div key={date}>
                  <button
                    onClick={() => setExpandedDate(isOpen ? null : date)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors text-left"
                  >
                    {/* Urgency dot */}
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />

                    {/* Date */}
                    <span className="text-xs font-mono font-semibold text-slate-700 w-24 shrink-0">
                      {date}
                    </span>

                    {/* Days badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${style.badge}`}>
                      {vencido ? `⚠ ${Math.abs(minDays)}d vencido` : `${minDays}d restantes`}
                    </span>

                    {/* Employee count */}
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Users className="w-3 h-3" />
                      {recs.length} certificação{recs.length !== 1 ? 'ões' : ''}
                    </span>

                    {/* Procedure codes preview */}
                    <span className="flex-1 text-[10px] text-slate-400 truncate hidden sm:block">
                      {[...new Set(recs.map(r => r.procedureCode))].slice(0, 3).join(' · ')}
                      {[...new Set(recs.map(r => r.procedureCode))].length > 3 && ' ...'}
                    </span>

                    {isOpen
                      ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  </button>

                  {/* Expanded: list of employee-procedure pairs */}
                  {isOpen && (
                    <div className="px-4 pb-3 bg-slate-50/60 space-y-1.5">
                      {recs.map(r => {
                        const s = dateBadgeStyle(r.daysRemaining);
                        return (
                          <div key={r.id} className="flex items-center gap-2.5 py-1.5 border-b border-slate-100 last:border-0">
                            <img
                              src={r.employeeAvatar}
                              alt={r.employeeName}
                              className="w-6 h-6 rounded-full border border-slate-200 shrink-0 object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{r.employeeName}</p>
                              <p className="text-[10px] text-slate-500 truncate">{r.employeeRole} · {r.sector}</p>
                            </div>
                            <span className="font-mono text-[10px] font-bold text-blue-700 shrink-0">{r.procedureCode}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${s.badge}`}>
                              {r.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Procedure → Assessment cards */}
      <div className="space-y-3">
        {procedures.map((proc) => {
          const assessment = getAssessmentForProc(proc.code);
          const isGenerating = generatingFor === proc.code;
          const cardId = assessment?.id ?? `proc-${proc.id}`;
          const isExpanded = expandedId === cardId;

          return (
            <div
              key={proc.id}
              className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : cardId)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${assessment ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    <CheckSquare className={`w-4 h-4 ${assessment ? 'text-blue-600' : 'text-orange-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                        {proc.code}
                      </span>
                      {assessment ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(assessment.status)}`}>
                          {assessment.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-orange-50 text-orange-600 border-orange-200">
                          Sem avaliação
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{proc.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {proc.sector} · Rev. {proc.revision ?? 'R00'} · {proc.validityMonths} meses
                      {assessment && ` · ${assessment.questionsCount} questões · mín. ${assessment.minScorePercent}%`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {!assessment && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleGenerate(proc); }}
                      disabled={isGenerating}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded transition-colors"
                    >
                      {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {isGenerating ? 'Gerando...' : 'Gerar via IA'}
                    </button>
                  )}
                  {assessment?.status === 'Rascunho' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteAssessment(assessment.id); }}
                        className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                        title="Descartar e gerar novamente"
                      >
                        <Trash2 className="w-3 h-3" />
                        Descartar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onApproveAssessment(assessment.id); }}
                        className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Aprovar
                      </button>
                    </>
                  )}
                  {assessment?.status === 'Ativa' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenAssessmentTaker(assessment); }}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                    >
                      <PlayCircle className="w-3 h-3" />
                      Simular
                    </button>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50/60">

                  {/* No assessment yet */}
                  {!assessment && (
                    <div className="p-6 flex flex-col items-center gap-3 text-center">
                      <Sparkles className="w-8 h-8 text-blue-300" />
                      <p className="text-sm font-semibold text-slate-700">Nenhuma avaliação gerada para este procedimento</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Clique abaixo para a IA gerar as perguntas automaticamente com base no conteúdo do procedimento <strong>{proc.code}</strong>.
                      </p>
                      <button
                        onClick={() => handleGenerate(proc)}
                        disabled={isGenerating}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors"
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isGenerating ? 'Gerando avaliação...' : 'Gerar Avaliação via IA'}
                      </button>
                    </div>
                  )}

                  {/* Assessment exists */}
                  {assessment && (
                    <>
                      {/* Action bar */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white">
                        <span className="text-xs text-slate-600 font-medium">
                          {assessment.questions.length} questão{assessment.questions.length !== 1 ? 'ões' : ''}
                          {assessment.status === 'Rascunho' ? ' — revise e aprove' : assessment.status === 'Ativa' ? ' — ativa, link liberado' : ' — encerrada'}
                        </span>
                        <div className="flex items-center gap-2">
                          {assessment.status === 'Rascunho' && (
                            <>
                              <button
                                onClick={() => onDeleteAssessment(assessment.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                                title="Descarta este rascunho e libera nova geração via IA"
                              >
                                <Trash2 className="w-3 h-3" />
                                Descartar
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

                      {/* QR Code + Link (only for Ativa) */}
                      {assessment.status === 'Ativa' && (
                        <div className="px-4 py-4 border-b border-slate-200 bg-white">
                          <div className="flex items-start gap-6 flex-wrap">
                            <div className="flex flex-col items-center gap-2">
                              <QRCodeSVG
                                value={getAssessmentLink(assessment)}
                                size={96}
                                bgColor="#ffffff"
                                fgColor="#1e293b"
                                level="M"
                              />
                              <span className="text-[10px] text-slate-400 font-medium">QR Code da prova</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                                <QrCode className="w-3 h-3" /> Link seguro de acesso
                              </p>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 truncate text-[11px] bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-slate-700 font-mono">
                                  {getAssessmentLink(assessment)}
                                </code>
                                <button
                                  onClick={() => handleCopyLink(assessment)}
                                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                                >
                                  {copiedId === assessment.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  {copiedId === assessment.id ? 'Copiado!' : 'Copiar'}
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1.5">
                                Envie este link ou o QR Code ao colaborador. Válido por 7 dias · máx. {assessment.maxAttempts} tentativas.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Questions list */}
                      <div className="p-4 space-y-4 max-h-[480px] overflow-y-auto">
                        {assessment.questions.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-6">Sem questões.</p>
                        ) : (
                          assessment.questions.map((q, idx) => (
                            <div key={q.id} className="rounded-lg bg-white border border-slate-200 p-4 space-y-3 shadow-sm">
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
                                      {isCorrect && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 ml-auto mt-0.5" />}
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
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
