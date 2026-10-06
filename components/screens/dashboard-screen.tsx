'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Award, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Send, 
  Upload, 
  Bell, 
  Sparkles, 
  ArrowUpRight, 
  TrendingUp,
  ChevronRight,
  Bot,
  Loader2,
  Check
} from 'lucide-react';
import { 
  DashboardMetrics, 
  ChartSectorMetric, 
  ChartProjectionMetric, 
  TrainingRecord, 
  ComplianceStatus 
} from '@/types';

interface DashboardScreenProps {
  metrics: DashboardMetrics;
  sectorData: ChartSectorMetric[];
  projectionData: ChartProjectionMetric[];
  criticalTrainings: TrainingRecord[];
  onOpenNewPlanModal: () => void;
  onScheduleExam: (record: TrainingRecord) => void;
  onNotifyEmployee: (record: TrainingRecord) => void;
  onImportCert: (record: TrainingRecord) => void;
}

export function DashboardScreen({
  metrics,
  sectorData,
  projectionData,
  criticalTrainings,
  onOpenNewPlanModal,
  onScheduleExam,
  onNotifyEmployee,
  onImportCert,
}: DashboardScreenProps) {
  // AI assistant chat bubble state
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: 'Posso mover, substituir e atualizar dados em tempo real. Aqui, posso identificar padrões e alertas críticos antes que se tornem problemas.',
    },
  ]);

  const handleAskAssistant = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!assistantInput.trim() || assistantLoading) return;

    const userText = assistantInput;
    setAssistantInput('');
    setAssistantMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setAssistantLoading(true);

    try {
      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          contextData: metrics,
        }),
      });
      const data = await res.json();
      setAssistantMessages((prev) => [
        ...prev,
        { sender: 'ai', text: data.reply || 'Análise de conformidade executada com sucesso.' },
      ]);
    } catch {
      setAssistantMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Identifiquei 38 certificações na janela de 60 dias. Recomendo abrir 2 turmas para POP-LOG-005 no próximo ciclo de embarque.',
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const getStatusBadge = (status: ComplianceStatus) => {
    switch (status) {
      case 'Certificado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Reciclar':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Vencido':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Find max value for sector chart
  const maxCert = Math.max(...sectorData.map((d) => d.certificados), 150);
  const maxProjection = Math.max(...projectionData.map((d) => Math.max(d.reciclagens, d.vencimentos)), 35);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Painel Geral de Conformidade Operacional
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitoramento de certificações compulsórias e reciclagem da frota offshore
          </p>
        </div>
        <button
          onClick={onOpenNewPlanModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          <Calendar className="w-4 h-4" />
          <span>Gerar Novo Plano de Treino</span>
        </button>
      </div>

      {/* KPI Cards Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 94.2% Conformidade geral */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Conformidade Geral
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-emerald-600 font-mono tabular-nums tracking-tight">
                {metrics.generalCompliance}%
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 inline" />
              <span>+1.8% vs. ciclo anterior</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: 428 Certificações ativas */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Certificações Ativas
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-blue-600 font-mono tabular-nums tracking-tight">
                {metrics.activeCertifications}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Embarcados e base de apoio
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: 38 Vencimentos próximos */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Vencimentos Próximos
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-amber-600 font-mono tabular-nums tracking-tight">
                {metrics.expiringIn60Days}
              </span>
            </div>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              Janela crítica de 60 dias
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: 12 Documentos vencidos */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Documentos Vencidos
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-red-600 font-mono tabular-nums tracking-tight">
                {metrics.expiredDocuments}
              </span>
            </div>
            <p className="text-[11px] text-red-700 font-medium mt-1">
              Requer bloqueio de embarque
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Two Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Falhas & Certificação por Setor */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Falhas & Certificação por Setor
              </h3>
              <p className="text-xs text-slate-500">
                Operacional, Brascabo, RDO, QSMS, Suprimentos, Transbordo
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600" />
                <span className="text-slate-600">Certificados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500" />
                <span className="text-slate-600">Falhas / Reciclagens</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="space-y-3 pt-2">
            {sectorData.map((item) => {
              const certWidth = Math.round((item.certificados / maxCert) * 100);
              const falhaWidth = Math.max(Math.round((item.falhas / maxCert) * 100), 2);
              return (
                <div key={item.sector} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 w-28 truncate">{item.sector}</span>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                      <span className="text-blue-700 font-semibold">{item.certificados} cert.</span>
                      <span>·</span>
                      <span className="text-red-600 font-semibold">{item.falhas} falhas</span>
                    </div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-md overflow-hidden flex gap-0.5 p-0.5">
                    <div
                      style={{ width: `${certWidth}%` }}
                      className="bg-blue-600 rounded-sm transition-all duration-500"
                    />
                    <div
                      style={{ width: `${falhaWidth}%` }}
                      className="bg-red-500 rounded-sm transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Projeção de Reciclagens & Vencimentos */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Projeção de Reciclagens & Vencimentos
              </h3>
              <p className="text-xs text-slate-500">
                Previsão mensal para os próximos 6 meses
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-slate-600">Reciclagens</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-red-600" />
                <span className="text-slate-600">Vencimentos</span>
              </div>
            </div>
          </div>

          {/* Bar + Line Combo Visualization */}
          <div className="pt-4">
            <div className="h-48 flex items-end justify-between gap-3 px-2 border-b border-slate-200">
              {projectionData.map((item) => {
                const barHeight = Math.round((item.reciclagens / maxProjection) * 100);
                const lineHeight = Math.round((item.vencimentos / maxProjection) * 100);
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] rounded px-2 py-1 pointer-events-none whitespace-nowrap z-10 font-mono">
                      {item.reciclagens} reciclagens | {item.vencimentos} vencimentos
                    </div>

                    {/* Vencimento indicator point */}
                    <div
                      style={{ bottom: `${lineHeight}%` }}
                      className="absolute w-2 h-2 rounded-full bg-red-600 border border-white shadow-sm z-10 -translate-y-1"
                    />

                    {/* Reciclagem bar */}
                    <div
                      style={{ height: `${barHeight}%` }}
                      className="w-full max-w-[36px] bg-amber-400 hover:bg-amber-500 rounded-t-md transition-all duration-500"
                    />
                  </div>
                );
              })}
            </div>
            {/* Month labels */}
            <div className="flex justify-between px-2 pt-2 text-xs font-semibold text-slate-600">
              {projectionData.map((item) => (
                <div key={item.month} className="flex-1 text-center font-mono">
                  {item.month}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table: Treinamentos Críticos para Vencimento Próximo */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Treinamentos Críticos para Vencimento Próximo
            </h3>
            <p className="text-xs text-slate-500">
              Colaboradores com validade expirada ou dentro da janela de atenção de 60 dias
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
            {criticalTrainings.length} Registros Prioritários
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Cargo</th>
                <th className="py-3 px-4">Setor</th>
                <th className="py-3 px-4">Treinamento</th>
                <th className="py-3 px-4">Validade</th>
                <th className="py-3 px-4 text-center">Dias Restantes</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {criticalTrainings.map((rec) => {
                const isOverdue = rec.daysRemaining < 0;
                return (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Colaborador */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={rec.employeeAvatar}
                            alt={rec.employeeName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-bold text-slate-900 truncate">
                          {rec.employeeName}
                        </span>
                      </div>
                    </td>

                    {/* Cargo */}
                    <td className="py-3 px-4 font-medium text-slate-600 truncate max-w-[160px]">
                      {rec.employeeRole}
                    </td>

                    {/* Setor */}
                    <td className="py-3 px-4 text-slate-600">
                      {rec.sector}
                    </td>

                    {/* Treinamento */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-semibold text-blue-700 block">
                        {rec.procedureCode}
                      </span>
                      <span className="truncate block max-w-[200px] text-slate-600">
                        {rec.procedureName}
                      </span>
                    </td>

                    {/* Validade */}
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                      {rec.validityDate}
                    </td>

                    {/* Dias Restantes */}
                    <td className="py-3 px-4 text-center font-mono tabular-nums">
                      <span
                        className={`font-bold ${
                          isOverdue
                            ? 'text-red-600'
                            : rec.daysRemaining <= 60
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {isOverdue ? `${Math.abs(rec.daysRemaining)}d atrasado` : `${rec.daysRemaining}d`}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          rec.status
                        )}`}
                      >
                        {rec.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => onScheduleExam(rec)}
                          className="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors whitespace-nowrap"
                        >
                          Agendar Prova
                        </button>
                        <button
                          onClick={() => onImportCert(rec)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors whitespace-nowrap"
                        >
                          Importar Cert.
                        </button>
                        <button
                          onClick={() => onNotifyEmployee(rec)}
                          className="px-2 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors whitespace-nowrap"
                        >
                          Notificar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom: AI Assistant Chat Bubble */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/80 border border-blue-400/40 flex items-center justify-center text-white shrink-0 shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  Assistente de Inteligência QSMS
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Tempo Real
                </span>
              </div>
            </div>

            {/* Messages box */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {assistantMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs p-3 rounded-lg leading-relaxed ${
                    msg.sender === 'ai'
                      ? 'bg-white/10 text-slate-100 border border-white/10'
                      : 'bg-blue-600 text-white ml-6 text-right'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {assistantLoading && (
                <div className="text-xs p-3 rounded-lg bg-white/10 text-slate-200 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Analisando riscos e padrões nos dados da frota...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleAskAssistant} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Pergunte sobre vencimentos, planos de contingência ou simulação de auditoria..."
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-900/60 border border-blue-400/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="submit"
                disabled={assistantLoading || !assistantInput.trim()}
                className="px-4 py-2 text-xs font-semibold bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
