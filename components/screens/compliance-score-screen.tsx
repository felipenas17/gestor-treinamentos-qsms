'use client';

import React, { useMemo, useState } from 'react';
import {
  ShieldCheck, FileText, Scale, GraduationCap, ClipboardList,
  TrendingUp, TrendingDown, Minus, Info, RefreshCw,
  AlertTriangle, Clock, ChevronDown, ChevronUp, XCircle,
} from 'lucide-react';
import { GlobalComplianceScore, ModuleScore, AlertItem, BreakdownItem } from '@/types';

// ─── Gauge ────────────────────────────────────────────────────────────────────

function Gauge({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const angle = (clamped / 100) * 180;
  const RAD = Math.PI / 180;
  const r = 80;
  const cx = 100;
  const cy = 100;
  const x = cx + r * Math.cos((angle - 180) * RAD);
  const y = cy + r * Math.sin((angle - 180) * RAD);

  const color =
    clamped >= 80 ? '#10b981' :
    clamped >= 60 ? '#f59e0b' :
    '#ef4444';

  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[220px]">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={16} strokeLinecap="round"
      />
      {clamped > 0 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${angle > 180 ? 1 : 0} 1 ${x} ${y}`}
          fill="none" stroke={color} strokeWidth={16} strokeLinecap="round"
        />
      )}
      <circle cx={x} cy={y} r={7} fill={color} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={28} fontWeight="bold" fill={color}>
        {Math.round(clamped)}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.5}>
        conformidade
      </text>
    </svg>
  );
}

// ─── Breakdown pill ────────────────────────────────────────────────────────────

const PILL_COLORS: Record<BreakdownItem['variant'], string> = {
  green: 'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-slate-100 text-slate-500',
};

const DOT_COLORS: Record<BreakdownItem['variant'], string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
  gray: 'bg-slate-400',
};

function BreakdownPill({ item }: { item: BreakdownItem }) {
  if (item.count === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PILL_COLORS[item.variant]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[item.variant]}`} />
      {item.count} {item.label}
    </span>
  );
}

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  if (score >= 90) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
      <ShieldCheck className="w-3 h-3" /> Excelente
    </span>
  );
  if (score >= 80) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
      <TrendingUp className="w-3 h-3" /> Bom
    </span>
  );
  if (score >= 60) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
      <Minus className="w-3 h-3" /> Atenção
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
      <TrendingDown className="w-3 h-3" /> Crítico
    </span>
  );
}

// ─── Module icon ──────────────────────────────────────────────────────────────

function ModuleIcon({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  if (name.includes('Documento')) return <FileText className={`${cls} text-blue-500`} />;
  if (name.includes('Legal'))     return <Scale className={`${cls} text-purple-500`} />;
  if (name.includes('Treinamento')) return <GraduationCap className={`${cls} text-emerald-500`} />;
  if (name.includes('Conformidade') || name.includes('NC')) return <ClipboardList className={`${cls} text-orange-500`} />;
  return <ShieldCheck className={`${cls} text-slate-400`} />;
}

// ─── Module card ──────────────────────────────────────────────────────────────

function ModuleCard({ mod }: { mod: ModuleScore }) {
  const { score, compliant, total, module, breakdown } = mod;
  const barColor =
    score >= 80 ? 'bg-emerald-500' :
    score >= 60 ? 'bg-amber-500' :
    'bg-red-500';
  const textColor =
    score >= 80 ? 'text-emerald-600' :
    score >= 60 ? 'text-amber-600' :
    'text-red-600';
  const borderColor =
    score >= 80 ? 'border-emerald-100' :
    score >= 60 ? 'border-amber-100' :
    'border-red-100';

  return (
    <div className={`bg-white border ${borderColor} rounded-xl p-4 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ModuleIcon name={module} size="md" />
          <span className="text-sm font-semibold text-slate-700">{module}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-lg font-bold ${textColor}`}>{Math.round(score)}%</span>
          <ScoreBadge score={score} />
        </div>
      </div>

      {/* Bar */}
      {total === 0 ? (
        <p className="text-xs text-slate-400 italic">Nenhum registro</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 shrink-0">{compliant}/{total}</span>
          </div>

          {/* Breakdown pills */}
          {breakdown && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {breakdown.map((b) => <BreakdownPill key={b.label} item={b} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: AlertItem }) {
  const { severity, daysUntilExpiry, module, label } = alert;

  const config = severity === 'expired'
    ? { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-100 text-red-700', tag: 'VENCIDO' }
    : severity === 'critical'
    ? { bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', tag: 'CRÍTICO' }
    : { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', tag: 'ATENÇÃO' };

  const timeLabel = daysUntilExpiry < 0
    ? `Vencido há ${Math.abs(daysUntilExpiry)}d`
    : daysUntilExpiry === 0
    ? 'Vence hoje'
    : `Vence em ${daysUntilExpiry}d`;

  return (
    <div className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${config.bg} ${config.border}`}>
      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.badge}`}>{config.tag}</span>
          <span className="text-xs text-slate-400">{module}</span>
        </div>
        <p className={`text-xs font-medium ${config.text} truncate`}>{label}</p>
      </div>
      <div className="shrink-0 flex items-center gap-1 text-xs text-slate-500">
        <Clock className="w-3 h-3" />
        <span>{timeLabel}</span>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ComplianceScoreScreenProps {
  score: GlobalComplianceScore;
  onRefresh: () => void;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ComplianceScoreScreen({ score, onRefresh }: ComplianceScoreScreenProps) {
  const { overall, modules, generatedAt, alerts = [] } = score;
  const [alertsExpanded, setAlertsExpanded] = useState(true);

  const activeModules = useMemo(
    () => modules.filter((m) => m.total > 0),
    [modules]
  );

  const generatedDate = useMemo(
    () => new Date(generatedAt).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
    [generatedAt]
  );

  const weakest = useMemo(
    () => activeModules.length
      ? [...activeModules].sort((a, b) => a.score - b.score)[0]
      : null,
    [activeModules]
  );

  const totalItems     = useMemo(() => modules.reduce((acc, m) => acc + m.total, 0), [modules]);
  const totalCompliant = useMemo(() => modules.reduce((acc, m) => acc + m.compliant, 0), [modules]);

  const expiredCount  = alerts.filter((a) => a.severity === 'expired').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount  = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            Score de Conformidade Global
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Índice consolidado — Documentos · Obrigações Legais · Treinamentos · NCs
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg bg-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setAlertsExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              <span className="text-sm font-semibold text-slate-700">Ações Necessárias</span>
              <div className="flex items-center gap-1.5">
                {expiredCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{expiredCount} vencido{expiredCount > 1 ? 's' : ''}</span>
                )}
                {criticalCount > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">{criticalCount} crítico{criticalCount > 1 ? 's' : ''}</span>
                )}
                {warningCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{warningCount} atenção</span>
                )}
              </div>
            </div>
            {alertsExpanded
              ? <ChevronUp className="w-4 h-4 text-slate-400" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />
            }
          </button>

          {alertsExpanded && (
            <div className="px-5 pb-4 space-y-2 border-t border-slate-100 pt-3">
              {alerts.map((alert) => (
                <AlertRow key={`${alert.module}-${alert.id}`} alert={alert} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main score card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Gauge side */}
          <div className="flex flex-col items-center justify-center p-8 gap-4">
            <Gauge value={overall} />
            <div className="text-center">
              <ScoreBadge score={overall} />
              <p className="text-xs text-slate-400 mt-2">
                Calculado em {generatedDate}
              </p>
            </div>
          </div>

          {/* Summary side */}
          <div className="p-6 flex flex-col justify-center gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Itens Conformes</p>
                <p className="text-2xl font-bold text-slate-800">{totalCompliant}</p>
                <p className="text-xs text-slate-400">de {totalItems} total</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Módulos Ativos</p>
                <p className="text-2xl font-bold text-slate-800">{activeModules.length}</p>
                <p className="text-xs text-slate-400">de {modules.length} módulos</p>
              </div>
            </div>

            {weakest && weakest.score < 80 && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Ponto de atenção</p>
                  <p className="text-xs mt-0.5">
                    <strong>{weakest.module}</strong> tem o menor índice ({Math.round(weakest.score)}%).
                    Priorize ações corretivas neste módulo.
                  </p>
                </div>
              </div>
            )}

            {overall >= 80 && alerts.length === 0 && (
              <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Sistema em conformidade</p>
                  <p className="text-xs mt-0.5">
                    O índice global está acima de 80%, dentro da faixa aceitável para auditorias ISO.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module cards grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Detalhamento por Módulo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((mod) => <ModuleCard key={mod.module} mod={mod} />)}
        </div>
      </div>

      {/* Formula explainer */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-400" />
          Como o Score é calculado
        </h2>
        <div className="text-xs text-slate-600 space-y-2">
          <p>
            O Score Global é a <strong>média simples</strong> dos scores de cada módulo ativo.
            Módulos sem registros são excluídos da média.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            {[
              { icon: <FileText className="w-3.5 h-3.5 text-blue-500" />, label: 'Documentos', rule: 'Status = "Vigente" → conforme' },
              { icon: <Scale className="w-3.5 h-3.5 text-purple-500" />, label: 'Obrigações Legais', rule: 'Status = "Vigente" → conforme' },
              { icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />, label: 'Treinamentos', rule: 'Status = "Certificado" → conforme' },
              { icon: <ClipboardList className="w-3.5 h-3.5 text-orange-500" />, label: 'Não Conformidades', rule: 'Status = "Encerrada" → conforme' },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  {item.icon}
                  <span className="font-semibold text-slate-700">{item.label}</span>
                </div>
                <p className="text-slate-500">{item.rule}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-slate-500">
            Fórmula por módulo:{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
              Score = (conformes / total) × 100
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
