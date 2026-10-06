'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Assessment } from '@/types';

interface AssessmentTakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment;
  onComplete?: (score: number, passed: boolean) => void;
}

export function AssessmentTakerModal({
  isOpen,
  onClose,
  assessment,
  onComplete,
}: AssessmentTakerModalProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(assessment.durationMinutes * 60);

  const uuidUrl = `https://offshore.qsms.local/avaliacoes/${assessment.tokenUuid}`;

  useEffect(() => {
    if (!isOpen || isSubmitted) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isSubmitted]);

  if (!isOpen) return null;

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmit = () => {
    let correctCount = 0;
    assessment.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctOptionIndex) {
        correctCount += 1;
      }
    });

    const calculatedScore = Math.round((correctCount / assessment.questions.length) * 100);
    setScore(calculatedScore);
    setIsSubmitted(true);

    if (onComplete) {
      onComplete(calculatedScore, calculatedScore >= assessment.minScorePercent);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(uuidUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold border border-blue-200">
                {assessment.code}
              </span>
              <span className="text-xs text-slate-500 font-medium">Link Seguro via UUID</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              {assessment.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Link Bar */}
        <div className="px-6 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-slate-600 font-medium shrink-0">URL do Colaborador:</span>
            <code className="font-mono text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 truncate max-w-md">
              {uuidUrl}
            </code>
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
          </button>
        </div>

        {/* Question Area */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-200px)]">
          {/* Rules & Timer info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-4 text-slate-600">
              <span><strong>Mínimo:</strong> {assessment.minScorePercent}%</span>
              <span><strong>Questões:</strong> {assessment.questions.length}</span>
              <span><strong>Tentativa:</strong> 1 de {assessment.maxAttempts}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          </div>

          {/* Results banner if submitted */}
          {isSubmitted && score !== null && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                score >= assessment.minScorePercent
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {score >= assessment.minScorePercent ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-sm">
                  {score >= assessment.minScorePercent
                    ? 'Aprovado na Avaliação de Eficácia!'
                    : 'Abaixo do Limiar Mínimo de Aprovação (80%)'}
                </h3>
                <p className="text-xs mt-1">
                  Nota Final: <strong>{score}%</strong> (Mínimo exigido: {assessment.minScorePercent}%).
                  {score >= assessment.minScorePercent
                    ? ' Certificação gerada e registrada no Supabase com sucesso.'
                    : ' Uma nova tentativa pode ser agendada pelo gestor de treinamento.'}
                </p>
              </div>
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-6">
            {assessment.questions.map((q, qIdx) => {
              const isAnswered = selectedAnswers[qIdx] !== undefined;
              return (
                <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      {q.question}
                    </p>
                  </div>

                  <div className="space-y-2 pt-1 pl-8">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[qIdx] === optIdx;
                      const isCorrect = isSubmitted && optIdx === q.correctOptionIndex;
                      const isWrong = isSubmitted && isSelected && !isCorrect;

                      return (
                        <button
                          key={optIdx}
                          disabled={isSubmitted}
                          onClick={() => handleSelectOption(qIdx, optIdx)}
                          className={`w-full text-left p-3 rounded-lg text-xs font-medium border transition-all flex items-center justify-between ${
                            isSelected && !isSubmitted
                              ? 'bg-blue-50 border-blue-500 text-blue-950 font-semibold'
                              : isCorrect
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                              : isWrong
                              ? 'bg-red-50 border-red-400 text-red-950'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-5 h-5 rounded-full border text-[11px] flex items-center justify-center shrink-0 ${
                                isSelected && !isSubmitted
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : isCorrect
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : isWrong
                                  ? 'border-red-600 bg-red-600 text-white'
                                  : 'border-slate-300 text-slate-500'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation after submission */}
                  {isSubmitted && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 ml-8">
                      <span className="font-semibold text-slate-900">Justificativa QSMS:</span> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {Object.keys(selectedAnswers).length} de {assessment.questions.length} respondidas
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Fechar
            </button>
            {!isSubmitted && (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-colors"
              >
                Finalizar Prova e Calcular Nota
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
