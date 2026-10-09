'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  AlertTriangle,
  Link,
  RefreshCw,
} from 'lucide-react';
import { TrainingRecord, Assessment } from '@/types';

interface NotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TrainingRecord | null;
  assessments: Assessment[];
}

const STATUS_COLORS: Record<string, string> = {
  Certificado: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
  Reciclar: 'bg-amber-900/60 text-amber-300 border border-amber-700',
  Vencido: 'bg-red-900/60 text-red-300 border border-red-700',
  Pendente: 'bg-slate-700/60 text-slate-300 border border-slate-600',
};

export function NotifyModal({ isOpen, onClose, record, assessments }: NotifyModalProps) {
  const [copied, setCopied] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  if (!isOpen || !record) return null;

  const activeAssessment = assessments.find(
    (a) => a.procedureCode === record.procedureCode && a.status === 'Ativa'
  );

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const token = generatedToken ?? activeAssessment?.tokenUuid ?? null;
  const examLink = token ? `${origin}/avaliar/${token}` : '';

  const handleGenerateLink = async () => {
    if (!activeAssessment) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/assessments/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: activeAssessment.id }),
      });
      const json = await res.json();
      if (json.tokenUuid) {
        setGeneratedToken(json.tokenUuid);
        setCopied(false);
      }
    } catch (err) {
      console.error('generate-link:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!examLink) return;
    try {
      await navigator.clipboard.writeText(examLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = examLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    if (!examLink) return;
    const msg = [
      `Olá, *${record.employeeName}*!`,
      '',
      `Você tem uma avaliação pendente sobre o procedimento *${record.procedureName}* (${record.procedureCode}).`,
      '',
      `Acesse o link abaixo para realizar sua prova:`,
      examLink,
      '',
      `_O link é válido por 7 dias. Em caso de dúvidas, entre em contato com o setor de QSMS._`,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const statusClass = STATUS_COLORS[record.status] ?? STATUS_COLORS['Pendente'];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notificar colaborador"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <div className="flex items-center gap-2 text-slate-100">
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold">Notificar Colaborador</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Employee info */}
          <div className="px-5 py-4 border-b border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{record.employeeName}</p>
                <p className="text-xs text-slate-400 truncate">{record.employeeRole} · {record.sector}</p>
              </div>
              <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusClass}`}>
                {record.status}
              </span>
            </div>
            <div className="bg-slate-800/60 rounded-lg px-3 py-2.5 space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Procedimento</p>
              <p className="text-xs text-slate-200 font-medium leading-snug">{record.procedureName}</p>
              <p className="text-[10px] text-slate-500 font-mono">{record.procedureCode}</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {activeAssessment ? (
              <>
                {/* Gerar novo link */}
                <button
                  onClick={handleGenerateLink}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white border border-blue-600 hover:border-blue-500 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Gerando...' : generatedToken ? 'Gerar Novo Link' : 'Gerar Link da Prova'}
                </button>

                {/* Exam link — só aparece após gerar */}
                {examLink && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                      <Link className="w-3 h-3" />
                      Link da Prova {generatedToken && <span className="text-emerald-400 normal-case font-normal">• válido 7 dias · 2 usos</span>}
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="flex-1 text-[11px] text-slate-300 font-mono truncate">{examLink}</span>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {examLink && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 border ${
                        copied
                          ? 'bg-emerald-900/60 border-emerald-700 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar Link
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleWhatsApp}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 hover:border-emerald-500 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-slate-500 text-center">
                  Cada link gerado é único, expira em 7 dias e tem limite de 2 usos.
                </p>
              </>
            ) : (
              <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-700/50 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300 leading-relaxed">
                  Nenhuma prova ativa para este POP. Ative uma prova na aba{' '}
                  <span className="font-semibold">Gestão de Provas</span>.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
