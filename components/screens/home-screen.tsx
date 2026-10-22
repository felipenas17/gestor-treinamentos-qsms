'use client';

import React, { useMemo } from 'react';
import {
  GraduationCap,
  AlertTriangle,
  FileText,
  ClipboardList,
  Shield,
  ShieldCheck,
  ClipboardCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Users,
  Award,
  CheckSquare,
  LayoutDashboard,
  Wrench,
  Activity,
  Anchor,
} from 'lucide-react';
import { GlobalComplianceScore, NonConformity, TrainingRecord, DocControl, LegalObligation } from '@/types';
import { CertificateRecord } from '@/components/screens/certificates-screen';

interface HomeScreenProps {
  complianceScore: GlobalComplianceScore;
  records: TrainingRecord[];
  nonConformities: NonConformity[];
  documents: DocControl[];
  obligations: LegalObligation[];
  normativeCerts: CertificateRecord[];
  onNavigate: (tab: string) => void;
}

interface ModuleCard {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;          // Tailwind color prefix, e.g. 'blue'
  tab: string;
  stats: { label: string; value: string | number; variant?: 'green' | 'yellow' | 'red' | 'neutral' }[];
}

export function HomeScreen({
  complianceScore,
  records,
  nonConformities,
  documents,
  obligations,
  normativeCerts,
  onNavigate,
}: HomeScreenProps) {
  // ── Computed stats ────────────────────────────────────────────────────────────

  const trainStats = useMemo(() => {
    const certificados = records.filter(r => r.status === 'Certificado').length;
    const vencendo = records.filter(r => r.daysRemaining >= 0 && r.daysRemaining <= 60 && r.status !== 'Certificado').length;
    const vencidos = records.filter(r => r.status === 'Vencido').length;
    return { total: records.length, certificados, vencendo, vencidos };
  }, [records]);

  const ncStats = useMemo(() => {
    const abertas = nonConformities.filter(nc => nc.status === 'Aberta').length;
    const emTratamento = nonConformities.filter(nc => nc.status === 'Em tratamento').length;
    const encerradas = nonConformities.filter(nc => nc.status === 'Encerrada').length;
    return { total: nonConformities.length, abertas, emTratamento, encerradas };
  }, [nonConformities]);

  const docStats = useMemo(() => {
    const vigentes = documents.filter(d => d.docStatus === 'Vigente').length;
    const renovar = documents.filter(d => d.docStatus === 'Para Renovar').length;
    const vencidos = documents.filter(d => d.docStatus === 'Vencido').length;
    return { total: documents.length, vigentes, renovar, vencidos };
  }, [documents]);

  const oblStats = useMemo(() => {
    const vigentes = obligations.filter(o => o.status === 'Vigente').length;
    const proximos = obligations.filter(o => o.status === 'Próximo').length;
    const vencidos = obligations.filter(o => o.status === 'Vencido').length;
    return { total: obligations.length, vigentes, proximos, vencidos };
  }, [obligations]);

  const certStats = useMemo(() => {
    const validos = normativeCerts.filter(c => c.status === 'Certificado').length;
    const vencendo = normativeCerts.filter(c => c.daysRemaining >= 0 && c.daysRemaining <= 60 && c.status !== 'Vencido').length;
    const vencidos = normativeCerts.filter(c => c.status === 'Vencido').length;
    return { total: normativeCerts.length, validos, vencendo, vencidos };
  }, [normativeCerts]);

  const criticalAlerts = useMemo(
    () => (complianceScore.alerts ?? []).slice(0, 5),
    [complianceScore.alerts],
  );

  const overallScore = complianceScore.overall;
  const scoreColor =
    overallScore >= 80 ? 'text-emerald-400' :
    overallScore >= 60 ? 'text-amber-400' :
    'text-red-400';
  const scoreRingColor =
    overallScore >= 80 ? '#34d399' :
    overallScore >= 60 ? '#fbbf24' :
    '#f87171';

  // ── SGI Module cards ──────────────────────────────────────────────────────────
  const sgiCards: ModuleCard[] = [
    {
      id: 'conformidade',
      label: 'Score de Conformidade',
      sublabel: 'Índice Global do SGI',
      icon: ShieldCheck,
      color: 'indigo',
      tab: 'conformidade',
      stats: [
        { label: 'Score Geral', value: `${overallScore}%`, variant: overallScore >= 80 ? 'green' : overallScore >= 60 ? 'yellow' : 'red' },
        { label: 'Módulos', value: complianceScore.modules.filter(m => m.total > 0).length },
        { label: 'Alertas', value: (complianceScore.alerts ?? []).length, variant: (complianceScore.alerts ?? []).length > 0 ? 'yellow' : 'green' },
      ],
    },
    {
      id: 'nc-capa',
      label: 'NC / CAPA — RNC',
      sublabel: 'Registros de Não Conformidade',
      icon: AlertTriangle,
      color: 'orange',
      tab: 'nc-capa',
      stats: [
        { label: 'Total', value: ncStats.total, variant: 'neutral' },
        { label: 'Em Aberto', value: ncStats.abertas, variant: ncStats.abertas > 0 ? 'red' : 'green' },
        { label: 'Em Tratamento', value: ncStats.emTratamento, variant: ncStats.emTratamento > 0 ? 'yellow' : 'neutral' },
      ],
    },
    {
      id: 'nc-roi',
      label: 'ROI',
      sublabel: 'Registro de Ocorrência Interna',
      icon: Wrench,
      color: 'cyan',
      tab: 'nc-roi',
      stats: [
        { label: 'Módulo Ativo', value: 'ROI', variant: 'green' },
        { label: 'Integrado com', value: 'NC/CAPA', variant: 'neutral' },
      ],
    },
    {
      id: 'nc-dashboard',
      label: 'Dashboard NC',
      sublabel: 'RNC × ROI — Indicadores',
      icon: Activity,
      color: 'violet',
      tab: 'nc-dashboard',
      stats: [
        { label: 'Encerradas', value: ncStats.encerradas, variant: 'green' },
        { label: 'Em aberto', value: ncStats.abertas + ncStats.emTratamento, variant: (ncStats.abertas + ncStats.emTratamento) > 0 ? 'yellow' : 'green' },
      ],
    },
    {
      id: 'auditoria-interna',
      label: 'Auditoria Interna',
      sublabel: 'Diagnóstico Automático',
      icon: ClipboardCheck,
      color: 'teal',
      tab: 'auditoria-interna',
      stats: [
        { label: 'Módulo Ativo', value: 'Diagnóstico', variant: 'green' },
      ],
    },
    {
      id: 'procedimentos',
      label: 'Procedimentos & POPs',
      sublabel: 'Revisões e Vigência',
      icon: FileText,
      color: 'sky',
      tab: 'procedimentos',
      stats: [
        { label: 'Controle', value: 'Ativo', variant: 'green' },
        { label: 'IA integrada', value: 'Sim', variant: 'green' },
      ],
    },
    {
      id: 'doc-controle',
      label: 'Controle Documental',
      sublabel: 'Licenças e Autorizações',
      icon: Shield,
      color: 'blue',
      tab: 'doc-controle',
      stats: [
        { label: 'Total', value: docStats.total, variant: 'neutral' },
        { label: 'Vigentes', value: docStats.vigentes, variant: 'green' },
        { label: 'Vencidos', value: docStats.vencidos, variant: docStats.vencidos > 0 ? 'red' : 'neutral' },
      ],
    },
    {
      id: 'obrigacoes-legais',
      label: 'Obrigações Legais',
      sublabel: 'Cumprimento e Prazos',
      icon: ClipboardList,
      color: 'amber',
      tab: 'obrigacoes-legais',
      stats: [
        { label: 'Total', value: oblStats.total, variant: 'neutral' },
        { label: 'Vigentes', value: oblStats.vigentes, variant: 'green' },
        { label: 'Vencidas', value: oblStats.vencidos, variant: oblStats.vencidos > 0 ? 'red' : 'neutral' },
      ],
    },
  ];

  // ── SMS Module cards ──────────────────────────────────────────────────────────
  const smsCards: ModuleCard[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Treinamentos',
      sublabel: 'Painel Geral de Conformidade',
      icon: LayoutDashboard,
      color: 'blue',
      tab: 'dashboard',
      stats: [
        { label: 'Certificados', value: trainStats.certificados, variant: 'green' },
        { label: 'Vencendo (60d)', value: trainStats.vencendo, variant: trainStats.vencendo > 0 ? 'yellow' : 'neutral' },
        { label: 'Vencidos', value: trainStats.vencidos, variant: trainStats.vencidos > 0 ? 'red' : 'neutral' },
      ],
    },
    {
      id: 'provas',
      label: 'Provas & Links',
      sublabel: 'Avaliações de Eficácia',
      icon: CheckSquare,
      color: 'emerald',
      tab: 'provas',
      stats: [
        { label: 'Avaliações ativas', value: 'IA', variant: 'green' },
        { label: 'Links por colaborador', value: 'Sim', variant: 'green' },
      ],
    },
    {
      id: 'certificados',
      label: 'Certificados',
      sublabel: 'Internos e Normativos',
      icon: Award,
      color: 'yellow',
      tab: 'certificados',
      stats: [
        { label: 'Normativos', value: certStats.total, variant: 'neutral' },
        { label: 'Válidos', value: certStats.validos, variant: 'green' },
        { label: 'Vencidos', value: certStats.vencidos, variant: certStats.vencidos > 0 ? 'red' : 'neutral' },
      ],
    },
    {
      id: 'matriz',
      label: 'Matriz & Colaboradores',
      sublabel: 'Conformidade de Equipes',
      icon: Users,
      color: 'purple',
      tab: 'matriz',
      stats: [
        { label: 'Total registros', value: trainStats.total, variant: 'neutral' },
        { label: 'Conformes', value: trainStats.certificados, variant: 'green' },
      ],
    },
  ];

  // ── Color maps ────────────────────────────────────────────────────────────────
  const colorMap: Record<string, { bg: string; icon: string; border: string; badge: string }> = {
    blue:   { bg: 'bg-blue-500/10',   icon: 'text-blue-400',   border: 'border-blue-500/20',   badge: 'bg-blue-500/20 text-blue-300' },
    indigo: { bg: 'bg-indigo-500/10', icon: 'text-indigo-400', border: 'border-indigo-500/20', badge: 'bg-indigo-500/20 text-indigo-300' },
    orange: { bg: 'bg-orange-500/10', icon: 'text-orange-400', border: 'border-orange-500/20', badge: 'bg-orange-500/20 text-orange-300' },
    cyan:   { bg: 'bg-cyan-500/10',   icon: 'text-cyan-400',   border: 'border-cyan-500/20',   badge: 'bg-cyan-500/20 text-cyan-300' },
    violet: { bg: 'bg-violet-500/10', icon: 'text-violet-400', border: 'border-violet-500/20', badge: 'bg-violet-500/20 text-violet-300' },
    teal:   { bg: 'bg-teal-500/10',   icon: 'text-teal-400',   border: 'border-teal-500/20',   badge: 'bg-teal-500/20 text-teal-300' },
    sky:    { bg: 'bg-sky-500/10',    icon: 'text-sky-400',    border: 'border-sky-500/20',    badge: 'bg-sky-500/20 text-sky-300' },
    amber:  { bg: 'bg-amber-500/10',  icon: 'text-amber-400',  border: 'border-amber-500/20',  badge: 'bg-amber-500/20 text-amber-300' },
    emerald:{ bg: 'bg-emerald-500/10',icon: 'text-emerald-400',border: 'border-emerald-500/20',badge: 'bg-emerald-500/20 text-emerald-300' },
    yellow: { bg: 'bg-yellow-500/10', icon: 'text-yellow-400', border: 'border-yellow-500/20', badge: 'bg-yellow-500/20 text-yellow-300' },
    purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/20', badge: 'bg-purple-500/20 text-purple-300' },
  };

  const statVariantClass = (v?: string) => {
    if (v === 'green')  return 'text-emerald-400';
    if (v === 'yellow') return 'text-amber-400';
    if (v === 'red')    return 'text-red-400';
    return 'text-slate-300';
  };

  const alertSeverityIcon = (sev: string) => {
    if (sev === 'expired')  return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
    if (sev === 'critical') return <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />;
    return <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
  };

  const renderCard = (card: ModuleCard) => {
    const c = colorMap[card.color] ?? colorMap['blue'];
    const Icon = card.icon;
    return (
      <button
        key={card.id}
        onClick={() => onNavigate(card.tab)}
        className={`group text-left flex flex-col gap-3 p-4 rounded-xl border ${c.border} ${c.bg} bg-slate-900/40 hover:bg-slate-800/60 transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer`}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${c.icon}`} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-slate-100 leading-tight truncate">{card.label}</div>
              <div className="text-[11px] text-slate-500 truncate">{card.sublabel}</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
        </div>

        {/* Stats */}
        {card.stats.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {card.stats.map((stat, i) => (
              <div key={i} className="flex flex-col">
                <span className={`text-base font-bold leading-tight tabular-nums ${statVariantClass(stat.variant)}`}>
                  {stat.value}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </button>
    );
  };

  // Circumference for SVG ring
  const R = 42;
  const circ = 2 * Math.PI * R;
  const dashOffset = circ - (overallScore / 100) * circ;

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-[#0d1117] text-slate-800 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Hero / Welcome ──────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-900/30 border border-blue-400/30">
              <Anchor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">Painel Geral</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tiger Rentank — Offshore · Gestor QSMS</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Selecione um módulo abaixo para acessar
          </div>
        </div>

        {/* ── Score + Alerts banner ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Score gauge */}
          <div className="md:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col items-center gap-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Score de Conformidade</p>

            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth="10"
                  className="text-slate-100 dark:text-slate-800" />
                <circle cx="50" cy="50" r={R} fill="none" strokeWidth="10"
                  stroke={scoreRingColor}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold tabular-nums ${scoreColor}`}>{overallScore}%</span>
                <span className="text-[10px] text-slate-400">global</span>
              </div>
            </div>

            <div className="w-full space-y-1.5">
              {complianceScore.modules.filter(m => m.total > 0).map(m => (
                <div key={m.module} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{m.module}</span>
                      <span className={`text-[11px] font-semibold tabular-nums ${m.score >= 80 ? 'text-emerald-500' : m.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                        {Math.round(m.score)}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${m.score >= 80 ? 'bg-emerald-500' : m.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('conformidade')}
              className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/50 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Ver Score Detalhado
            </button>
          </div>

          {/* Alerts panel */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Alertas Críticos</p>
                <p className="text-xs text-slate-400">{(complianceScore.alerts ?? []).length} item(s) precisam de atenção</p>
              </div>
              {(complianceScore.alerts ?? []).length === 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800/50">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tudo em dia
                </div>
              )}
            </div>

            {(complianceScore.alerts ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum alerta crítico no momento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {criticalAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                    {alertSeverityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{alert.module}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          alert.severity === 'expired' ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400' :
                          alert.severity === 'critical' ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400' :
                          'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                        }`}>
                          {alert.daysUntilExpiry < 0 ? `${Math.abs(alert.daysUntilExpiry)}d vencido` : `${alert.daysUntilExpiry}d restantes`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 truncate mt-0.5">{alert.label}</p>
                    </div>
                  </div>
                ))}
                {(complianceScore.alerts ?? []).length > 5 && (
                  <p className="text-xs text-slate-400 text-center pt-1">
                    + {(complianceScore.alerts ?? []).length - 5} alertas adicionais
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── SGI Section ──────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">SGI — Sistema de Gestão Integrado</span>
            </div>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {sgiCards.map(renderCard)}
          </div>
        </div>

        {/* ── SMS Section ──────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">SMS — Saúde, Meio Ambiente e Segurança</span>
            </div>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {smsCards.map(renderCard)}
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
}
