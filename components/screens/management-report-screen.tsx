'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  BarChart3, Download, FileText, GraduationCap, Scale,
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock,
  Calendar, Building2, Printer, Loader2,
} from 'lucide-react';
import {
  DocControl, LegalObligation, TrainingRecord, NonConformity, GlobalComplianceScore,
} from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-600';
  if (s >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBg(s: number) {
  if (s >= 80) return 'bg-emerald-50 border-emerald-200';
  if (s >= 60) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

// ─── Small stat card ──────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border ${accent ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
      <div className={`flex items-center gap-1.5 mb-2 ${accent ? 'text-blue-600' : 'text-slate-500'}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-blue-700' : 'text-slate-800'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon, title, score,
}: {
  icon: React.ReactNode;
  title: string;
  score?: number;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
      </div>
      {score !== undefined && (
        <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}% conformidade</span>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ManagementReportScreenProps {
  documents: DocControl[];
  obligations: LegalObligation[];
  records: TrainingRecord[];
  nonConformities: NonConformity[];
  complianceScore: GlobalComplianceScore;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ManagementReportScreen({
  documents,
  obligations,
  records,
  nonConformities,
  complianceScore,
}: ManagementReportScreenProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // ─── Document stats ─────────────────────────────────────────────────────────
  const docStats = useMemo(() => {
    const vigentes = documents.filter((d) => d.docStatus === 'Vigente').length;
    const renovar = documents.filter((d) => d.docStatus === 'Para Renovar').length;
    const vencidos = documents.filter((d) => d.docStatus === 'Vencido').length;
    const total = documents.length;
    return { vigentes, renovar, vencidos, total, score: pct(vigentes, total) };
  }, [documents]);

  // ─── Obligation stats ────────────────────────────────────────────────────────
  const oblStats = useMemo(() => {
    const vigentes = obligations.filter((o) => o.status === 'Vigente').length;
    const proximas = obligations.filter((o) => o.status === 'Próximo').length;
    const vencidas = obligations.filter((o) => o.status === 'Vencido').length;
    const total = obligations.length;
    return { vigentes, proximas, vencidas, total, score: pct(vigentes, total) };
  }, [obligations]);

  // ─── Training stats ──────────────────────────────────────────────────────────
  const trainStats = useMemo(() => {
    const certificados = records.filter((r) => r.status === 'Certificado').length;
    const reciclar = records.filter((r) => r.status === 'Reciclar').length;
    const vencidos = records.filter((r) => r.status === 'Vencido').length;
    const total = records.length;
    return { certificados, reciclar, vencidos, total, score: pct(certificados, total) };
  }, [records]);

  // ─── NC stats ────────────────────────────────────────────────────────────────
  const ncStats = useMemo(() => {
    const abertas = nonConformities.filter((n) => n.status === 'Aberta').length;
    const emTratamento = nonConformities.filter((n) => n.status === 'Em tratamento').length;
    const encerradas = nonConformities.filter((n) => n.status === 'Encerrada').length;
    const criticas = nonConformities.filter((n) => n.severity === 'Crítica' && n.status !== 'Encerrada').length;
    const total = nonConformities.length;
    return { abertas, emTratamento, encerradas, criticas, total };
  }, [nonConformities]);

  // ─── Critical items ──────────────────────────────────────────────────────────
  const criticalDocs = useMemo(
    () => documents.filter((d) => d.docStatus === 'Vencido').slice(0, 5),
    [documents]
  );
  const criticalObls = useMemo(
    () => obligations.filter((o) => o.status === 'Vencido').slice(0, 5),
    [obligations]
  );
  const criticalTraining = useMemo(
    () => records.filter((r) => r.status === 'Vencido').slice(0, 5),
    [records]
  );

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const handleExport = async () => {
    setIsGenerating(true);
    // Small delay for UX feedback
    await new Promise((r) => setTimeout(r, 300));
    try {
      window.print();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Relatório Gerencial
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão consolidada de todos os módulos — {today}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          {isGenerating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
          ) : (
            <><Printer className="w-3.5 h-3.5" /> Exportar / Imprimir</>
          )}
        </button>
      </div>

      {/* Printable report body */}
      <div ref={reportRef} className="space-y-6">

        {/* ── Cabeçalho do relatório ── */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 opacity-80" />
                <span className="text-xs opacity-80 font-medium">Tiger Rentank</span>
              </div>
              <h2 className="text-xl font-bold mb-0.5">Relatório Gerencial QSMS</h2>
              <p className="text-sm opacity-80">Sistema de Gestão Integrado — ISO 9001 · ISO 14001 · ISO 45001</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end mb-1">
                <Calendar className="w-3.5 h-3.5 opacity-70" />
                <span className="text-xs opacity-70">Período de referência</span>
              </div>
              <p className="font-semibold">{today}</p>
            </div>
          </div>
        </div>

        {/* ── Score Global ── */}
        <div className={`rounded-2xl border p-5 ${scoreBg(complianceScore.overall)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className={`w-8 h-8 ${scoreColor(complianceScore.overall)}`} />
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Score de Conformidade Global</p>
                <p className={`text-4xl font-bold ${scoreColor(complianceScore.overall)}`}>
                  {Math.round(complianceScore.overall)}%
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {complianceScore.modules.map((m) => (
                <div key={m.module} className="bg-white/70 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5 truncate">{m.module.split(' ')[0]}</p>
                  <p className={`text-lg font-bold ${scoreColor(m.score)}`}>{Math.round(m.score)}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Summary KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Documentos Vigentes"
            value={`${docStats.vigentes}/${docStats.total}`}
            sub={`${docStats.score}% conformidade`}
          />
          <StatCard
            icon={<Scale className="w-3.5 h-3.5" />}
            label="Obrigações Vigentes"
            value={`${oblStats.vigentes}/${oblStats.total}`}
            sub={`${oblStats.score}% conformidade`}
          />
          <StatCard
            icon={<GraduationCap className="w-3.5 h-3.5" />}
            label="Treinamentos OK"
            value={`${trainStats.certificados}/${trainStats.total}`}
            sub={`${trainStats.score}% conformidade`}
          />
          <StatCard
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="NC/CAPA em Aberto"
            value={ncStats.abertas + ncStats.emTratamento}
            sub={ncStats.criticas > 0 ? `${ncStats.criticas} crítica(s)` : `${ncStats.total} total`}
            accent={ncStats.criticas > 0}
          />
        </div>

        {/* ── Documentos ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionHeader
            icon={<FileText className="w-4 h-4 text-blue-500" />}
            title="Controle Documental"
            score={docStats.score}
          />
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Vigentes', value: docStats.vigentes, cls: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Para Renovar', value: docStats.renovar, cls: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Vencidos', value: docStats.vencidos, cls: 'text-red-700', bg: 'bg-red-50' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
          {criticalDocs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-2">Documentos Vencidos (ação imediata)</p>
              <div className="space-y-1.5">
                {criticalDocs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg border border-red-100 text-xs">
                    <span className="font-medium text-slate-700">{d.name}</span>
                    <span className="text-red-600 font-semibold">{d.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Obrigações Legais ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionHeader
            icon={<Scale className="w-4 h-4 text-purple-500" />}
            title="Obrigações Legais"
            score={oblStats.score}
          />
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Vigentes', value: oblStats.vigentes, cls: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Próximas', value: oblStats.proximas, cls: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Vencidas', value: oblStats.vencidas, cls: 'text-red-700', bg: 'bg-red-50' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
          {criticalObls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-2">Obrigações Vencidas</p>
              <div className="space-y-1.5">
                {criticalObls.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg border border-red-100 text-xs">
                    <span className="font-medium text-slate-700">{o.title}</span>
                    {o.nextDueDate && (
                      <span className="text-red-600">{new Date(o.nextDueDate).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Treinamentos ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionHeader
            icon={<GraduationCap className="w-4 h-4 text-emerald-500" />}
            title="Treinamentos & Certificações"
            score={trainStats.score}
          />
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Certificados', value: trainStats.certificados, cls: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Para Reciclar', value: trainStats.reciclar, cls: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Vencidos', value: trainStats.vencidos, cls: 'text-red-700', bg: 'bg-red-50' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
          {criticalTraining.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-2">Certificações Vencidas</p>
              <div className="space-y-1.5">
                {criticalTraining.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg border border-red-100 text-xs">
                    <span className="font-medium text-slate-700">{r.employeeName}</span>
                    <span className="text-slate-500">{r.procedureName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── NC / CAPA ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionHeader
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            title="NC / CAPA — Não Conformidades"
          />
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total', value: ncStats.total, cls: 'text-slate-700', bg: 'bg-slate-50' },
              { label: 'Em Aberto', value: ncStats.abertas, cls: 'text-red-700', bg: 'bg-red-50' },
              { label: 'Em Tratamento', value: ncStats.emTratamento, cls: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Encerradas', value: ncStats.encerradas, cls: 'text-emerald-700', bg: 'bg-emerald-50' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-slate-100`}>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
          {ncStats.criticas > 0 && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <XCircle className="w-4 h-4 shrink-0" />
              <span><strong>{ncStats.criticas}</strong> NC crítica{ncStats.criticas > 1 ? 's' : ''} em aberto — requer atenção imediata da gestão.</span>
            </div>
          )}
          {ncStats.criticas === 0 && nonConformities.length > 0 && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Nenhuma NC crítica em aberto.</span>
            </div>
          )}
        </div>

        {/* ── Recomendações ── */}
        {(docStats.vencidos > 0 || oblStats.vencidas > 0 || trainStats.vencidos > 0 || ncStats.criticas > 0) && (
          <div className="bg-white border border-amber-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Recomendações Prioritárias
            </h3>
            <div className="space-y-2.5">
              {docStats.vencidos > 0 && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs">
                  <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-slate-700">
                    <strong className="text-amber-700">{docStats.vencidos} documento(s) vencido(s)</strong> —
                    Iniciar processo de renovação imediatamente para manter conformidade documental.
                  </p>
                </div>
              )}
              {oblStats.vencidas > 0 && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs">
                  <Scale className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-slate-700">
                    <strong className="text-amber-700">{oblStats.vencidas} obrigação(ões) vencida(s)</strong> —
                    Regularizar pendências legais para evitar autuações ou não-conformidades de auditoria.
                  </p>
                </div>
              )}
              {trainStats.vencidos > 0 && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-slate-700">
                    <strong className="text-amber-700">{trainStats.vencidos} certificação(ões) vencida(s)</strong> —
                    Agendar reciclagem de treinamentos para colaboradores com certificação expirada.
                  </p>
                </div>
              )}
              {ncStats.criticas > 0 && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 rounded-xl border border-red-100 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-slate-700">
                    <strong className="text-red-700">{ncStats.criticas} NC crítica(s) em aberto</strong> —
                    Prioridade máxima: elaborar e implementar CAPA imediatamente.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
          <span>Tiger Rentank — QSMS Portal</span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            Gerado em {today}
          </span>
        </div>
      </div>
    </div>
  );
}
