'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicQuestion {
  id: string;
  question: string;
  options: string[];
}

interface PublicAssessment {
  id: string;
  title: string;
  procedureCode: string;
  procedureTitle: string;
  questionsCount: number;
  minScorePercent: number;
  durationMinutes: number;
  maxAttempts: number;
  questions: PublicQuestion[];
}

interface SubmitResult {
  passed: boolean;
  score: number;
  minScore: number;
  correctCount: number;
  totalQuestions: number;
}

type Step = 'loading' | 'notfound' | 'intro' | 'exam' | 'signature' | 'result';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExamPage() {
  const { token } = useParams<{ token: string }>();

  // State
  const [step, setStep] = useState<Step>('loading');
  const [assessment, setAssessment] = useState<PublicAssessment | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch assessment ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch(`/api/assessments/${token}`)
      .then(async (res) => {
        if (!res.ok) { setStep('notfound'); return; }
        const data: PublicAssessment = await res.json();
        setAssessment(data);
        setTimeLeft(data.durationMinutes * 60);
        setStep('intro');
      })
      .catch(() => setStep('notfound'));
  }, [token]);

  // ── Timer ────────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setStep('signature');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── Canvas signature ─────────────────────────────────────────────────────────
  const getCanvasPos = (
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number
  ) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(canvas, e.clientX, e.clientY);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(canvas, e.clientX, e.clientY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const handleMouseUp = () => { isDrawingRef.current = false; };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const touch = e.touches[0];
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(canvas, touch.clientX, touch.clientY);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasPos(canvas, touch.clientX, touch.clientY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // ── Start exam ───────────────────────────────────────────────────────────────
  const handleStart = () => {
    if (!employeeName.trim()) return;
    setStep('exam');
    startTimer();
  };

  // ── Answer selection ─────────────────────────────────────────────────────────
  const handleAnswer = (optionIndex: number) => {
    if (!assessment) return;
    const qId = assessment.questions[currentQ].id;
    setAnswers((prev) => ({ ...prev, [qId]: optionIndex }));
  };

  // ── Next question or finish ──────────────────────────────────────────────────
  const handleNext = () => {
    if (!assessment) return;
    if (currentQ < assessment.questions.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setStep('signature');
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitting) return;
    const canvas = canvasRef.current;
    const signatureData = canvas ? canvas.toDataURL('image/png') : '';

    setSubmitting(true);
    try {
      const res = await fetch('/api/assessments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          answers,
          employeeName,
          signature: signatureData,
        }),
      });
      const data: SubmitResult = await res.json();
      setResult(data);
      setStep('result');
    } catch {
      alert('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  // Loading
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Carregando avaliação…</p>
        </div>
      </div>
    );
  }

  // Not found
  if (step === 'notfound') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f1117' }}>
        <div className="max-w-lg w-full text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white mb-2">Prova não encontrada ou expirada</h1>
          <p className="text-white/50 text-sm mb-6">
            O link pode ter sido desativado ou já expirou. Solicite um novo link ao seu gestor.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    );
  }

  if (!assessment) return null;

  // ── Intro screen ─────────────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="min-h-screen py-8 px-4" style={{ background: '#0f1117' }}>
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 mb-4">
              <span className="text-blue-400 text-xs font-medium tracking-wider uppercase">Tiger Rentank · QSMS</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{assessment.title}</h1>
            <p className="text-white/50 text-sm">{assessment.procedureCode}</p>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl p-3 text-center" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-2xl font-bold text-blue-400">{assessment.questionsCount}</p>
              <p className="text-white/50 text-xs mt-0.5">Questões</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-2xl font-bold text-blue-400">{assessment.durationMinutes}<span className="text-sm font-normal">min</span></p>
              <p className="text-white/50 text-xs mt-0.5">Duração</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-2xl font-bold text-blue-400">{assessment.minScorePercent}<span className="text-sm font-normal">%</span></p>
              <p className="text-white/50 text-xs mt-0.5">Nota mínima</p>
            </div>
          </div>

          {/* Procedure info */}
          <div className="rounded-xl p-4 mb-6" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Procedimento</p>
            <p className="text-white text-sm font-medium">{assessment.procedureTitle}</p>
          </div>

          {/* Name input */}
          <div className="mb-6">
            <label className="block text-white/70 text-sm mb-2">
              Nome completo <span className="text-blue-400">*</span>
            </label>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Digite seu nome completo"
              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)' }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleStart(); }}
            />
          </div>

          {/* Instructions */}
          <div className="rounded-xl p-4 mb-6" style={{ background: '#1a1f2e', border: '1px solid rgba(234,179,8,0.2)' }}>
            <p className="text-yellow-400 text-xs font-medium mb-2">⚠ Instruções</p>
            <ul className="text-white/60 text-xs space-y-1">
              <li>• Responda todas as questões antes do tempo acabar</li>
              <li>• Ao finalizar, assine digitalmente para confirmar</li>
              <li>• Não feche ou recarregue a página durante a prova</li>
            </ul>
          </div>

          <button
            onClick={handleStart}
            disabled={!employeeName.trim()}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: employeeName.trim() ? '#2563eb' : '#374151' }}
          >
            Iniciar Prova →
          </button>
        </div>
      </div>
    );
  }

  // ── Exam screen ──────────────────────────────────────────────────────────────
  if (step === 'exam') {
    const question = assessment.questions[currentQ];
    const selectedAnswer = answers[question?.id];
    const isLast = currentQ === assessment.questions.length - 1;
    const progress = ((currentQ + 1) / assessment.questions.length) * 100;
    const isLowTime = timeLeft <= 60;

    return (
      <div className="min-h-screen py-6 px-4" style={{ background: '#0f1117' }}>
        <div className="max-w-lg mx-auto">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-xs">
              Questão <span className="text-white font-medium">{currentQ + 1}</span> de {assessment.questions.length}
            </span>
            <span className={`text-sm font-mono font-bold px-3 py-1 rounded-full ${isLowTime ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
              ⏱ {formatTime(timeLeft)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full mb-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: '#2563eb' }}
            />
          </div>

          {/* Question */}
          <div className="rounded-xl p-5 mb-4" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
              {assessment.procedureCode}
            </p>
            <p className="text-white text-base leading-relaxed">{question?.question}</p>
          </div>

          {/* Options */}
          <div className="space-y-2.5 mb-6">
            {question?.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className="w-full text-left px-4 py-3.5 rounded-xl transition-all duration-150 flex items-start gap-3"
                  style={{
                    background: isSelected ? 'rgba(37,99,235,0.2)' : '#1a1f2e',
                    border: isSelected ? '1px solid rgba(37,99,235,0.7)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                    style={{
                      background: isSelected ? '#2563eb' : 'rgba(255,255,255,0.08)',
                      color: isSelected ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {OPTION_LABELS[idx]}
                  </span>
                  <span className={`text-sm leading-relaxed ${isSelected ? 'text-white' : 'text-white/70'}`}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <button
            onClick={handleNext}
            disabled={selectedAnswer === undefined}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: selectedAnswer !== undefined ? '#2563eb' : '#374151' }}
          >
            {isLast ? 'Finalizar Prova' : 'Próxima →'}
          </button>
        </div>
      </div>
    );
  }

  // ── Signature screen ──────────────────────────────────────────────────────────
  if (step === 'signature') {
    return (
      <div className="min-h-screen py-8 px-4" style={{ background: '#0f1117' }}>
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">✍️</div>
            <h2 className="text-xl font-bold text-white mb-2">Assinatura Digital</h2>
            <p className="text-white/50 text-sm">
              Assine abaixo para confirmar que você realizou esta avaliação pessoalmente
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-xl p-4 mb-5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Candidato</span>
              <span className="text-white font-medium">{employeeName}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-white/50">Respondidas</span>
              <span className="text-white font-medium">{Object.keys(answers).length} / {assessment.questions.length}</span>
            </div>
          </div>

          {/* Canvas */}
          <div className="rounded-xl overflow-hidden mb-3" style={{ border: '2px solid rgba(37,99,235,0.4)', background: '#fff' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={180}
              className="w-full cursor-crosshair touch-none"
              style={{ display: 'block' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>
          <p className="text-white/30 text-xs text-center mb-5">Assine com o dedo ou mouse na área acima</p>

          <div className="flex gap-3 mb-4">
            <button
              onClick={clearCanvas}
              className="flex-1 py-3 rounded-xl text-white/70 text-sm font-medium transition-all hover:text-white"
              style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Limpar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-[2] py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-60"
              style={{ background: submitting ? '#374151' : '#2563eb' }}
            >
              {submitting ? 'Enviando…' : 'Enviar Avaliação'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const { passed, score, minScore, correctCount, totalQuestions } = result;

    return (
      <div className="min-h-screen py-8 px-4 flex flex-col" style={{ background: '#0f1117' }}>
        <div className="max-w-lg mx-auto w-full flex-1">
          {/* Result hero */}
          <div
            className="rounded-2xl p-8 text-center mb-6"
            style={{
              background: passed ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
              border: `1px solid ${passed ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
            }}
          >
            <div className="text-5xl mb-4">{passed ? '✅' : '❌'}</div>
            <h2 className={`text-2xl font-bold mb-1 ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {passed ? 'Aprovado!' : 'Reprovado'}
            </h2>
            <p className="text-white/50 text-sm mb-5">{employeeName}</p>

            <div className="flex items-baseline justify-center gap-1">
              <span className={`text-5xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {score}
              </span>
              <span className="text-white/50 text-xl">%</span>
            </div>
            <p className="text-white/40 text-xs mt-1">Nota mínima: {minScore}%</p>
          </div>

          {/* Score breakdown */}
          <div className="rounded-xl p-5 mb-5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Resultado</p>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{totalQuestions}</p>
                <p className="text-white/40 text-xs mt-0.5">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{correctCount}</p>
                <p className="text-white/40 text-xs mt-0.5">Corretas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{totalQuestions - correctCount}</p>
                <p className="text-white/40 text-xs mt-0.5">Incorretas</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full mt-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(correctCount / totalQuestions) * 100}%`,
                  background: passed ? '#16a34a' : '#dc2626',
                }}
              />
            </div>
          </div>

          {/* Message */}
          <div
            className="rounded-xl p-4 mb-6"
            style={{
              background: passed ? 'rgba(22,163,74,0.08)' : 'rgba(234,179,8,0.08)',
              border: `1px solid ${passed ? 'rgba(22,163,74,0.2)' : 'rgba(234,179,8,0.2)'}`,
            }}
          >
            <p className={`text-sm ${passed ? 'text-green-400' : 'text-yellow-400'}`}>
              {passed
                ? '🎓 Parabéns! Seu certificado foi registrado no sistema. O gestor de QSMS receberá a confirmação.'
                : `📋 Nota mínima exigida: ${minScore}%. Aguarde novo agendamento de treinamento.`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-lg mx-auto w-full mt-auto pt-4 text-center">
          <p className="text-white/20 text-xs">Tiger Rentank do Brasil · QSMS</p>
        </div>
      </div>
    );
  }

  return null;
}
