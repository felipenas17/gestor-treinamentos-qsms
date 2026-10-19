'use client';

import React, { useMemo } from 'react';
import {
  ShieldCheck, FileText, Scale, GraduationCap,
  TrendingUp, TrendingDown, Minus, Info, RefreshCw,
} from 'lucide-react';
import { GlobalComplianceScore, ModuleScore } from '@/types';

// ─── Gauge ────────────────────────────────────────────────────────────────────

function Gauge({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const angle = (clamped / 100) * 180; // 0→180°
  const RAD = Math.PI / 180;
  // Arc path — semi-circle from left (-180°) to right (0°)
  const r = 80;
  const cx = 100;
  const cy = 100;
  const x = cx + r * Math.cos((angle - 180) * RAD);
  const y = cy + r * Math.sin((angle - 180) * RAD);

  const color =
    clamped >= 80 ? '#10b981' :
    clamped >= 60 ? '#f59e0b' :
    '#ef4444';

  const trackColor = 'rgba(0,0,0,0.08)';

  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[220px]">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={trackColor}
        strokeWidth={16}
        strokeLinecap="round"
      />
      {/* Progress arc */}
      {clamped > 0 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${angle > 180 ? 1 : 0} 1 ${x} ${y}`}
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeLinecap="round"
        />
      )}
      {/* Needle dot */}
      <circle cx={x} cy={y} r={7} fill={color} />
      {/* Value text */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={28} fontWeight="bold" fill={color}>
        {Math.round(clamped)}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.5}>
        conformidade
      </text>
    </svg>
  );
}

// ─── Module bar ───────────────────────────────────────────────────────────────

function ModuleBar({ mod }: { mod: ModuleScore }) {
  const { score, compliant, total, module } = mod;
  const color =
    score >= 80 ? 'bg-emerald-500' :
    score >= 60 ? 'bg-amber-500' :
    'bg-red-500';
  const textColor =
    score >= 80 ? 'text-emerald-700' :
    score >= 60 ? 'text-amber-700' :
    'text-red-700';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{module}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{compliant}/{total}</span>
          <span className={`text-sm font-bold ${textColor}`}>{Math.round(score)}%</span>
        </div>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

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

function moduleIcon(name: string) {
  if (name.includes('Documento')) return <FileText className="w-4 h-4 text-blue-500" />;
  if (name.includes('Legal')) return <Scale className="w-4 h-4 text-purple-500" />;
  if (name.includes('Treinamento')) return <GraduationCap className="w-4 h-4 text-emerald-500" />;
  return <ShieldCheck className="w-4 h-4 text-slate-400" />;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ComplianceScoreScreenProps {
  score: GlobalComplianceScore;
  onRefresh: () => void;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ComplianceScoreScreen({ score, onRefresh }: ComplianceScoreScreenProps) {
  const { overall, modules, generatedAt } = score;

  // Non-zero modules (modules with data)
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

  // Weakest module
  const weakest = useMemo(
    () => activeModules.length
      ? [...activeModules].sort((a, b) => a.score - b.score)[0]
      : null,
    [activeModules]
  );

  // Total items across all modules
  const totalItems = useMemo(
    () => modules.reduce((acc, m) => acc + m.total, 0),
    [modules]
  );
  const totalCompliant = useMemo(
    () => modules.reduce((acc, m) => acc + m.compliant, 0),
    [modules]
  );

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
            Índice consolidado — Documentos · Obrigações Legais · Treinamentos
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

      {/* Main card */}
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

            {overall >= 80 && (
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

      {/* Module breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-5">Detalhamento por Módulo</h2>
        <div className="space-y-5">
          {modules.map((mod) => (
            <div key={mod.module}>
              <div className="flex items-center gap-2 mb-2">
                {moduleIcon(mod.module)}
                <span className="text-sm font-semibold text-slate-700">{mod.module}</span>
              </div>
              {mod.total === 0 ? (
                <div className="text-xs text-slate-400 italic pl-6">
                  Nenhum registro encontrado para este módulo.
                </div>
              ) : (
                <div className="pl-6">
                  <ModuleBar mod={mod} />
                </div>
              )}
            </div>
          ))}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {[
              {
                icon: <FileText className="w-3.5 h-3.5 text-blue-500" />,
                label: 'Documentos',
                rule: 'Status = "Vigente" → conforme',
              },
              {
                icon: <Scale className="w-3.5 h-3.5 text-purple-500" />,
                label: 'Obrigações Legais',
                rule: 'Status = "Vigente" → conforme',
              },
              {
                icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />,
                label: 'Treinamentos',
                rule: 'Status = "Certificado" → conforme',
              },
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
            Fórmula por módulo: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
              Score = (conformes / total) × 100
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
