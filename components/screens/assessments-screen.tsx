'use client';

import React, { useState } from 'react';
import { 
  CheckSquare, 
  Sparkles, 
  QrCode, 
  Clock, 
  Award, 
  Send, 
  Edit3, 
  CheckCircle2, 
  Share2, 
  Sliders, 
  Copy, 
  Check, 
  FileCheck, 
  Users, 
  AlertCircle,
  HelpCircle,
  FileQuestion,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Assessment, RespondentStatus, AssessmentQuestion } from '@/types';

interface AssessmentsScreenProps {
  assessment: Assessment | null;
  respondents: RespondentStatus[];
  onOpenAssessmentTaker: (assessment: Assessment) => void;
  onSendReminder: (respondent: RespondentStatus) => void;
  onApproveAssessment: () => void;
  onEditAssessment: () => void;
  onCreateNewAssessment: () => void;
}

export function AssessmentsScreen({
  assessment,
  respondents,
  onOpenAssessmentTaker,
  onSendReminder,
  onApproveAssessment,
  onEditAssessment,
  onCreateNewAssessment,
}: AssessmentsScreenProps) {
  // Toggle Binarizar PDFs
  const [binarizePdf, setBinarizePdf] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);
  const [activeChip, setActiveChip] = useState<'provas' | 'respostas' | 'banco' | 'figuras'>('provas');

  // AI Question Generator state
  const [aiQuestionPrompt, setAiQuestionPrompt] = useState('Qual é o procedimento correto para operação com cabo umbilical e resposta em caso de perda de tensão na empregadeira?');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<AssessmentQuestion[]>([]);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  const handleGenerateQuestions = async () => {
    if (!aiQuestionPrompt.trim() || generatingAi) return;
    setGeneratingAi(true);
    setAiSuccessMessage(null);

    try {
      const res = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: aiQuestionPrompt,
          procedureCode: assessment?.procedureCode ?? '',
        }),
      });
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        setGeneratedQuestions((prev) => [...data.questions, ...prev]);
        setAiSuccessMessage(`${data.questions.length} novas questões técnicas geradas com sucesso via IA!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAi(false);
    }
  };

  const getRespondentStatusBadge = (status: RespondentStatus['status']) => {
    switch (status) {
      case 'Entregue':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pendente':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Reprovado':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Em Andamento':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (!assessment) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <FileQuestion className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500 font-semibold text-sm">Nenhuma avaliação ativa no momento</p>
        <p className="text-slate-400 text-xs">Crie uma nova avaliação para iniciar o processo de certificação.</p>
        <button
          onClick={onCreateNewAssessment}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
        >
          + Criar Nova Avaliação
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gestão de Provas & Links de Avaliação
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Distribuição de links seguros com tokens UUID e monitoramento em tempo real
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Binarizar PDFs toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 font-medium">
            <span>Binarizar PDFs</span>
            <button
              onClick={() => setBinarizePdf(!binarizePdf)}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                binarizePdf ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  binarizePdf ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            onClick={onCreateNewAssessment}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <span>+ Criar Nova Avaliação Abrangente</span>
          </button>
        </div>
      </div>

      {/* KPI Row (4 KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Taxa de Aprovação
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums mt-1">
            {assessment.approvalRate}%
          </p>
          <span className="text-[11px] text-emerald-700 font-medium">
            {(assessment.approvalRate ?? 0) >= 85 ? 'Acima do alvo de 85%' : 'Abaixo do alvo de 85%'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total de Avaliações
          </span>
          <p className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums mt-1">
            {assessment.totalSubmissions}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">Ciclo 2026</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Tempo Médio
          </span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
            {assessment.avgDurationMinutes} min
          </p>
          <span className="text-[11px] text-slate-500 font-medium">Limite de 20 min</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Certificados Emitidos
          </span>
          <p className="text-2xl font-extrabold text-indigo-600 font-mono tabular-nums mt-1">
            {respondents.filter((r) => r.status === 'Entregue').length}
          </p>
          <span className="text-[11px] text-indigo-700 font-medium">Validados no Supabase</span>
        </div>
      </div>

      {/* Two Columns: Left Panel (Prova) & Right Panel (Respondentes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: 7 cols */}
        <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                  {assessment.code}
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {assessment.status}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">
                {assessment.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {assessment.questions.length} questões · {assessment.minScorePercent ?? 80}% mínimo · {assessment.durationMinutes ?? 20} min · {assessment.maxAttempts ?? 2} tentativas
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-center shrink-0">
              <div className="w-24 h-24 bg-white p-2 rounded-lg border border-slate-300 flex items-center justify-center shadow-xs">
                {/* SVG QR Code Simulation */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                  <rect width="100" height="100" fill="white" />
                  <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
                  <rect x="15" y="15" width="15" height="15" fill="white" />
                  <rect x="18" y="18" width="9" height="9" fill="#0f172a" />
                  
                  <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
                  <rect x="70" y="15" width="15" height="15" fill="white" />
                  <rect x="73" y="18" width="9" height="9" fill="#0f172a" />
                  
                  <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
                  <rect x="15" y="70" width="15" height="15" fill="white" />
                  <rect x="18" y="73" width="9" height="9" fill="#0f172a" />
                  
                  <rect x="42" y="12" width="6" height="12" fill="#0f172a" />
                  <rect x="52" y="24" width="6" height="12" fill="#0f172a" />
                  <rect x="42" y="42" width="16" height="16" fill="#0f172a" />
                  <rect x="65" y="45" width="10" height="6" fill="#0f172a" />
                  <rect x="78" y="55" width="12" height="6" fill="#0f172a" />
                  <rect x="42" y="72" width="12" height="16" fill="#0f172a" />
                  <rect x="60" y="75" width="28" height="12" fill="#0f172a" />
                </svg>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1.5 font-medium">
                Token UUID Seguro
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              onClick={() => onOpenAssessmentTaker(assessment)}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Aplicar Link</span>
            </button>

            <button
              onClick={onApproveAssessment}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aprovar</span>
            </button>

            <button
              onClick={onEditAssessment}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          </div>

          {/* Status Chips Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
            {[
              { id: 'provas', label: 'Provas Ativas', count: '1' },
              { id: 'respostas', label: 'Respostas & Dados do Colaborador', count: `${respondents.length}` },
              { id: 'banco', label: 'Banco de Questões', count: `${assessment.questions.length}` },
              { id: 'figuras', label: 'Ver Figuras', count: '0' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveChip(chip.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeChip === chip.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    activeChip === chip.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            ))}
          </div>

          {/* Active Tab Preview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            {activeChip === 'provas' && (
              <div>
                <p className="font-semibold text-slate-900">Prova Ativa: {assessment.code} {assessment.title}</p>
                <p className="text-slate-600 mt-1">
                  Avaliação habilitada no link anônimo via token UUID: <code className="text-blue-700 font-mono">{assessment.tokenUuid}</code>.
                  Nenhum dado sensível como CPF é trafegado no navegador.
                </p>
              </div>
            )}

            {activeChip === 'respostas' && (
              <div>
                <p className="font-semibold text-slate-900">Dados do Colaborador & Submissões</p>
                <p className="text-slate-600 mt-1">
                  {respondents.filter((r) => r.status === 'Entregue').length} entregas validadas com sucesso.
                  {respondents.filter((r) => r.status === 'Pendente').length} colaboradores pendentes de envio.
                </p>
              </div>
            )}

            {activeChip === 'banco' && (
              <div className="space-y-2">
                <p className="font-semibold text-slate-900">Questões Cadastradas:</p>
                {assessment.questions.map((q, idx) => (
                  <div key={q.id} className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-bold text-slate-900">Q{idx + 1}: </span>
                    <span>{q.question}</span>
                  </div>
                ))}
              </div>
            )}

            {activeChip === 'figuras' && (
              <div className="space-y-2">
                <p className="font-semibold text-slate-900">Figuras & Diagramas Técnicos do POP:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-white rounded border border-slate-200 flex items-center gap-2">
                    <span className="font-mono text-blue-700 font-bold">Fig 1:</span>
                    <span>Diagrama de Tração Empregadeira DP2</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200 flex items-center gap-2">
                    <span className="font-mono text-blue-700 font-bold">Fig 2:</span>
                    <span>Raio Crítico da Bobina de Lançamento</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: 5 cols — Respondentes: Não entregues em Tempo Real */}
        <div className="lg:col-span-5 rounded-xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Respondentes: Não entregues em Tempo Real
                </h3>
                <p className="text-xs text-slate-500">
                  Colaboradores convocados aguardando conclusão da prova
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {respondents.filter((r) => r.status !== 'Entregue').length} pendentes
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto pt-1">
              {respondents.map((resp) => (
                <div key={resp.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">{resp.name}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${getRespondentStatusBadge(
                          resp.status
                        )}`}
                      >
                        {resp.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {resp.role} · {resp.sector}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                      <span>Prazo: {resp.dueDate}</span>
                      {resp.scorePercent !== null && (
                        <span className="text-slate-700 font-semibold">
                          · Nota: {resp.scorePercent}%
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onSendReminder(resp)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors shrink-0 whitespace-nowrap"
                  >
                    Enviar Lembrete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span>Disparos automáticos por e-mail e SMS náutico ativados</span>
            <span className="font-semibold text-blue-700 font-mono">NR-37</span>
          </div>
        </div>
      </div>

      {/* Below: Gerador Rápido de Questões via IA */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Gerador Rápido de Questões via IA
              </h3>
              <p className="text-xs text-slate-500">
                Digite um procedimento, cenário de risco ou comando técnico para gerar questões com 4 alternativas e fundamentação normativa
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hidden sm:inline-block">
            Gemini 3.8 Flash
          </span>
        </div>

        <div className="space-y-3">
          <textarea
            rows={2}
            value={aiQuestionPrompt}
            onChange={(e) => setAiQuestionPrompt(e.target.value)}
            placeholder="Qual é o procedimento correto para operação..."
            className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Exemplo: &ldquo;Como agir se o freio hidráulico da empregadeira superaquecer acima de 90°C?&rdquo;
            </span>
            <button
              onClick={handleGenerateQuestions}
              disabled={generatingAi || !aiQuestionPrompt.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              {generatingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gerando Questões...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar Questões via IA</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Success Notification */}
        {aiSuccessMessage && (
          <div className="p-3 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{aiSuccessMessage}</span>
          </div>
        )}

        {/* Generated Questions Output */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Questões Geradas Recentemente (Prontas para Avaliação):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedQuestions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-700 shrink-0">#{idx + 1}</span>
                    <p className="font-semibold text-slate-900 leading-snug">{q.question}</p>
                  </div>
                  <div className="space-y-1 pl-4 pt-1">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`p-1.5 rounded text-[11px] border ${
                          optIdx === q.correctOptionIndex
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-mono mr-1.5">{String.fromCharCode(65 + optIdx)})</span>
                        {opt}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 italic">
                    <strong>QSMS:</strong> {q.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
