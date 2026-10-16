'use client';

import React, { useEffect, useState } from 'react';
import { X, History, CheckCircle2, XCircle, Loader2, ClipboardList } from 'lucide-react';
import { fetchAssessmentHistory, AssessmentAttempt } from '@/lib/supabase';

interface TrainingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  procedureCode: string;
  procedureName: string;
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

export function TrainingHistoryModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  procedureCode,
  procedureName,
}: TrainingHistoryModalProps) {
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !employeeId) return;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchAssessmentHistory(employeeId, procedureCode);
        setAttempts(data);
      } catch {
        setAttempts([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isOpen, employeeId, procedureCode]);

  if (!isOpen) return null;

  const bestAttempt = attempts.length > 0
    ? attempts.reduce((best, a) => a.score > best.score ? a : best, attempts[0])
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-100 text-violet-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Histórico de Tentativas</h2>
              <p className="text-xs text-slate-500">
                {employeeName} · {procedureCode} – {procedureName}
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

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando histórico...</span>
            </div>
          ) : attempts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
              <ClipboardList className="w-9 h-9 opacity-40" />
              <p className="text-sm font-medium">Nenhuma tentativa registrada</p>
              <p className="text-xs">As avaliações via link aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    Tentativas
                  </p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{attempts.length}</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">
                    Melhor nota
                  </p>
                  <p className="text-xl font-bold text-emerald-700 mt-0.5">
                    {bestAttempt ? `${bestAttempt.score}%` : '–'}
                  </p>
                </div>
                <div className={`text-center p-3 rounded-lg border ${
                  attempts.some((a) => a.passed)
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${
                    attempts.some((a) => a.passed) ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    Resultado
                  </p>
                  <p className={`text-sm font-bold mt-0.5 ${
                    attempts.some((a) => a.passed) ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {attempts.some((a) => a.passed) ? 'Aprovado' : 'Reprovado'}
                  </p>
                </div>
              </div>

              {/* Attempts table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="py-2.5 px-3 text-left font-semibold">#</th>
                      <th className="py-2.5 px-3 text-left font-semibold">Data</th>
                      <th className="py-2.5 px-3 text-left font-semibold">Horário</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Nota</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt, idx) => (
                      <tr
                        key={attempt.id}
                        className={`border-t border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                      >
                        <td className="py-2.5 px-3 text-slate-400 font-mono">
                          {attempts.length - idx}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {formatDate(attempt.completedAt)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {formatTime(attempt.completedAt)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                            attempt.passed
                              ? 'bg-emerald-50 text-emerald-700'
                              : attempt.score >= attempt.minScore * 0.8
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {attempt.score}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {attempt.passed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Aprovado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              Reprovado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-slate-400 text-right">
                Nota mínima de aprovação: {attempts[0]?.minScore ?? 80}%
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
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
