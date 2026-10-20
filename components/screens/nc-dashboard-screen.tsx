'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, BarChart2,
  TrendingUp, Layers, MapPin, Activity, Loader2,
  RefreshCw, FileWarning, Wrench,
} from 'lucide-react';
import { fetchNonConformities, fetchROIRecords, type NonConformityRow, type ROIRow } from '@/lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYearMonth(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return dateStr.slice(0, 7); // 'YYYY-MM'
}

function formatMonth(ym: string): string {
  if (!ym || ym === 'N/A') return ym;
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
}

function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = key(item) || 'N/A';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function last6Months(): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

// ─── Color palettes ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'Aberta': '#ef4444',
  'Em Investigação': '#f97316',
  'Em Andamento': '#eab308',
  'Concluída': '#22c55e',
};

const SEVERITY_COLORS: Record<string, string> = {
  'Crítica': '#dc2626',
  'Moderada': '#f59e0b',
  'Leve': '#3b82f6',
};

const TYPE_COLORS: Record<string, string> = {
  'NC': '#8b5cf6',
  'Observação': '#0ea5e9',
  'Oportunidade de Melhoria': '#10b981',
};

const SITE_COLORS: Record<string, string> = {
  'RDO': '#6366f1',
  'MC': '#ec4899',
  'CLIENTE': '#14b8a6',
};

const CHART_BLUE = '#3b82f6';
const CHART_PURPLE = '#8b5cf6';

// ─── Sub-components: SVG Charts ───────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  maxValue?: number;
}

function BarChart({ data, height = 120, maxValue }: BarChartProps) {
  if (!data.length) return <div className="text-slate-400 text-xs text-center py-4">Sem dados</div>;
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(18, Math.floor(260 / data.length) - 6);
  const gap = 6;
  const totalW = data.length * (barW + gap) - gap;
  const svgW = Math.max(totalW + 20, 200);

  return (
    <svg viewBox={`0 0 ${svgW} ${height + 28}`} className="w-full overflow-visible">
      {data.map((d, i) => {
        const barH = Math.round((d.value / max) * height);
        const x = i * (barW + gap) + 10;
        const y = height - barH;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 2)}
              rx={3} fill={d.color ?? CHART_BLUE} opacity={0.85} />
            <text x={x + barW / 2} y={y - 3} textAnchor="middle"
              fontSize={10} fill="currentColor" className="text-slate-600 dark:text-slate-300"
              opacity={d.value ? 1 : 0}>{d.value}</text>
            <text x={x + barW / 2} y={height + 14} textAnchor="middle"
              fontSize={9} fill="currentColor" className="text-slate-500"
              style={{ maxWidth: barW }}>
              {d.label.length > 8 ? d.label.slice(0, 7) + '…' : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

function DonutChart({ data, size = 120 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div className="text-slate-400 text-xs text-center py-4">Sem dados</div>;

  const cx = size / 2, cy = size / 2;
  const r = size * 0.38, innerR = size * 0.24;
  const filtered = data.filter(d => d.value > 0);

  // Build cumulative angles without mutable variable
  const sweeps = filtered.map(d => (d.value / total) * 2 * Math.PI);
  const startAngles = sweeps.reduce<number[]>((acc, sw, i) => {
    acc.push(i === 0 ? -Math.PI / 2 : acc[i - 1] + sweeps[i - 1]);
    return acc;
  }, []);

  const slices = filtered.map((d, i) => {
    const startAngle = startAngles[i];
    const sweep = sweeps[i];
    const endAngle = startAngle + sweep;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const lf = sweep > Math.PI ? 1 : 0;
    const path = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${lf} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');
    return { ...d, path, pct: d.value / total };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[120px]">
      {slices.map(s => (
        <path key={s.label} d={s.path} fill={s.color} opacity={0.88} />
      ))}
      <circle cx={cx} cy={cy} r={innerR} fill="var(--card-bg, white)" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={12} fontWeight="600"
        fill="currentColor">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8}
        fill="currentColor" opacity={0.6}>total</text>
    </svg>
  );
}

interface LineChartProps {
  series: { label: string; values: number[]; color: string }[];
  labels: string[];
  height?: number;
}

function LineChart({ series, labels, height = 100 }: LineChartProps) {
  const allVals = series.flatMap(s => s.values);
  const max = Math.max(...allVals, 1);
  const W = 300, H = height;
  const padL = 24, padR = 8, padT = 8, padB = 20;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const n = labels.length;

  const point = (v: number, i: number) => ({
    x: padL + (i / Math.max(n - 1, 1)) * chartW,
    y: padT + (1 - v / max) * chartH,
  });

  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} className="w-full overflow-visible">
      {/* Grid lines */}
      {[0, 0.5, 1].map(f => {
        const y = padT + f * chartH;
        return (
          <line key={f} x1={padL} y1={y} x2={W - padR} y2={y}
            stroke="currentColor" strokeWidth={0.5} opacity={0.15} />
        );
      })}
      {/* Y labels */}
      {[0, Math.round(max / 2), max].map((v, i) => (
        <text key={i} x={padL - 3} y={padT + (1 - v / max) * chartH + 4}
          textAnchor="end" fontSize={8} fill="currentColor" opacity={0.5}>{v}</text>
      ))}
      {/* Lines */}
      {series.map(s => {
        const pts = labels.map((_, i) => point(s.values[i] ?? 0, i));
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return (
          <g key={s.label}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color} />
            ))}
          </g>
        );
      })}
      {/* X labels */}
      {labels.map((l, i) => (
        <text key={l} x={point(0, i).x} y={H + 2}
          textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.6}>{l}</text>
      ))}
    </svg>
  );
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

function KpiTile({ label, value, icon, color, sub }: KpiTileProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate-800 dark:text-white leading-none">{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{label}</div>
        {sub && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Legend row ───────────────────────────────────────────────────────────────

function LegendItem({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="flex-1 text-slate-600 dark:text-slate-300 truncate">{label}</span>
      <span className="font-semibold text-slate-700 dark:text-slate-200">{value}</span>
      <span className="text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NCDashboardScreen() {
  const [ncs, setNcs] = useState<NonConformityRow[]>([]);
  const [rois, setRois] = useState<ROIRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const [ncData, roiData] = await Promise.all([fetchNonConformities(), fetchROIRecords()]);
      setNcs(ncData);
      setRois(roiData);
    } catch (e) {
      setError('Erro ao carregar dados. Verifique a conexão.');
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadData(); }, [loadData]);

  // ─── Derived metrics ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    // NC counts
    const byStatus = countBy(ncs, r => r.status);
    const bySeverity = countBy(ncs, r => r.severity);
    const byType = countBy(ncs, r => r.type);
    const bySector = countBy(ncs, r => r.sector ?? 'N/A');

    // ROI counts
    const byROISite = countBy(rois, r => r.site ?? 'N/A');
    const byROITema = countBy(rois, r => r.tema ?? 'N/A');
    const byROISetor = countBy(rois, r => r.setor_responsavel ?? 'N/A');

    // Month series (last 6 months)
    const months = last6Months();
    const ncByMonth = countBy(ncs, r => toYearMonth(r.detected_date));
    const roiByMonth = countBy(rois, r => toYearMonth(r.recorded_date));
    const ncMonthly = months.map(m => ncByMonth[m] ?? 0);
    const roiMonthly = months.map(m => roiByMonth[m] ?? 0);
    const monthLabels = months.map(formatMonth);

    // ROI tipo breakdown
    const roiTipos = [
      { key: 'tipo_processo', label: 'Processo' },
      { key: 'tipo_vazamento', label: 'Vazamento' },
      { key: 'tipo_revestimento', label: 'Revestimento' },
      { key: 'tipo_etiquetas', label: 'Etiquetas' },
      { key: 'tipo_dano_avaria', label: 'Dano/Avaria' },
      { key: 'tipo_placas', label: 'Placas' },
    ] as const;
    const roiByTipo = roiTipos.map(t => ({
      label: t.label,
      value: rois.filter(r => r[t.key]).length,
    }));

    // Cross-ref: RNCs com ROI no mesmo mês
    const ncWithROIMonth = months.map(m => {
      const nc = ncByMonth[m] ?? 0;
      const roi = roiByMonth[m] ?? 0;
      return { month: m, nc, roi };
    });

    // Top sectors (NC)
    const topSectors = Object.entries(bySector)
      .filter(([k]) => k !== 'N/A')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Top temas (ROI)
    const topROITemas = Object.entries(byROITema)
      .filter(([k]) => k !== 'N/A')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      totalNC: ncs.length,
      totalROI: rois.length,
      abertas: byStatus['Aberta'] ?? 0,
      emAndamento: (byStatus['Em Investigação'] ?? 0) + (byStatus['Em Andamento'] ?? 0),
      concluidas: byStatus['Concluída'] ?? 0,
      criticas: bySeverity['Crítica'] ?? 0,
      byStatus, bySeverity, byType, bySector,
      byROISite, byROITema, byROISetor,
      ncMonthly, roiMonthly, monthLabels,
      roiByTipo, topSectors, topROITemas,
      ncWithROIMonth,
    };
  }, [ncs, rois]);

  // ─── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Carregando dashboard…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <span className="text-sm">{error}</span>
          <button onClick={() => loadData()} className="text-xs text-blue-500 hover:underline">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const statusData = Object.entries(stats.byStatus).map(([label, value]) => ({
    label, value, color: STATUS_COLORS[label] ?? '#94a3b8',
  }));

  const severityData = Object.entries(stats.bySeverity).map(([label, value]) => ({
    label, value, color: SEVERITY_COLORS[label] ?? '#94a3b8',
  }));

  const typeData = Object.entries(stats.byType).map(([label, value]) => ({
    label, value, color: TYPE_COLORS[label] ?? '#94a3b8',
  }));

  const siteData = Object.entries(stats.byROISite).map(([label, value]) => ({
    label, value, color: SITE_COLORS[label] ?? '#94a3b8',
  }));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Dashboard RNC × ROI</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.totalNC} não conformidades · {stats.totalROI} registros de ocorrência
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="p-4 md:p-6 space-y-6">

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiTile
            label="Total de RNCs"
            value={stats.totalNC}
            icon={<FileWarning className="w-5 h-5 text-white" />}
            color="bg-violet-500"
          />
          <KpiTile
            label="Abertas"
            value={stats.abertas}
            icon={<AlertTriangle className="w-5 h-5 text-white" />}
            color="bg-red-500"
            sub={stats.totalNC ? `${Math.round(stats.abertas / stats.totalNC * 100)}% do total` : undefined}
          />
          <KpiTile
            label="Em Andamento"
            value={stats.emAndamento}
            icon={<Clock className="w-5 h-5 text-white" />}
            color="bg-amber-500"
          />
          <KpiTile
            label="Concluídas"
            value={stats.concluidas}
            icon={<CheckCircle2 className="w-5 h-5 text-white" />}
            color="bg-emerald-500"
            sub={stats.totalNC ? `${Math.round(stats.concluidas / stats.totalNC * 100)}% de efetividade` : undefined}
          />
          <KpiTile
            label="Críticas"
            value={stats.criticas}
            icon={<AlertTriangle className="w-5 h-5 text-white" />}
            color="bg-rose-600"
          />
          <KpiTile
            label="Total de ROIs"
            value={stats.totalROI}
            icon={<Wrench className="w-5 h-5 text-white" />}
            color="bg-sky-500"
          />
        </div>

        {/* ── Tendência RNC × ROI (últimos 6 meses) ── */}
        <Card title="Tendência Mensal — RNC × ROI (últimos 6 meses)">
          <div className="flex gap-4 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-1.5 rounded-full inline-block" style={{ background: CHART_BLUE }} />
              RNCs
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-1.5 rounded-full inline-block" style={{ background: CHART_PURPLE }} />
              ROIs
            </div>
          </div>
          <LineChart
            series={[
              { label: 'RNCs', values: stats.ncMonthly, color: CHART_BLUE },
              { label: 'ROIs', values: stats.roiMonthly, color: CHART_PURPLE },
            ]}
            labels={stats.monthLabels}
            height={110}
          />
        </Card>

        {/* ── NC breakdown row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Status */}
          <Card title="RNCs por Status">
            <div className="flex items-center gap-4">
              <DonutChart data={statusData} size={110} />
              <div className="flex-1 space-y-2">
                {statusData.sort((a, b) => b.value - a.value).map(d => (
                  <LegendItem key={d.label} color={d.color} label={d.label}
                    value={d.value} total={stats.totalNC} />
                ))}
              </div>
            </div>
          </Card>

          {/* Severidade */}
          <Card title="RNCs por Severidade">
            <div className="flex items-center gap-4">
              <DonutChart data={severityData} size={110} />
              <div className="flex-1 space-y-2">
                {severityData.sort((a, b) => b.value - a.value).map(d => (
                  <LegendItem key={d.label} color={d.color} label={d.label}
                    value={d.value} total={stats.totalNC} />
                ))}
              </div>
            </div>
          </Card>

          {/* Tipo */}
          <Card title="RNCs por Tipo">
            <div className="flex items-center gap-4">
              <DonutChart data={typeData} size={110} />
              <div className="flex-1 space-y-2">
                {typeData.sort((a, b) => b.value - a.value).map(d => (
                  <LegendItem key={d.label} color={d.color} label={d.label}
                    value={d.value} total={stats.totalNC} />
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* ── Top Setores (NC) + ROI por Site ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Top setores NC */}
          <Card title="Top Setores — RNCs">
            {stats.topSectors.length === 0
              ? <p className="text-xs text-slate-400 text-center py-3">Sem dados de setor</p>
              : (
                <div className="space-y-2">
                  {stats.topSectors.map(([label, value]) => {
                    const pct = stats.totalNC ? Math.round((value / stats.totalNC) * 100) : 0;
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <div className="w-28 text-xs text-slate-600 dark:text-slate-300 truncate">{label}</div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs text-slate-500 w-10 text-right">{value}</div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </Card>

          {/* ROI por site */}
          <Card title="ROIs por Site">
            <div className="flex items-center gap-4">
              <DonutChart data={siteData} size={110} />
              <div className="flex-1 space-y-2">
                {siteData.sort((a, b) => b.value - a.value).map(d => (
                  <LegendItem key={d.label} color={d.color} label={d.label}
                    value={d.value} total={stats.totalROI} />
                ))}
                {!siteData.length && (
                  <p className="text-xs text-slate-400">Sem dados</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ── ROI Tipo breakdown (barras) + Top Temas ROI ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Tipos de ROI */}
          <Card title="ROIs por Tipo de Ocorrência">
            <BarChart
              data={stats.roiByTipo.map((d, i) => ({
                ...d,
                color: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9'][i],
              }))}
              height={110}
            />
          </Card>

          {/* Top Temas ROI */}
          <Card title="Top Temas — ROI">
            {stats.topROITemas.length === 0
              ? <p className="text-xs text-slate-400 text-center py-3">Sem dados de tema</p>
              : (
                <div className="space-y-2">
                  {stats.topROITemas.map(([label, value]) => {
                    const pct = stats.totalROI ? Math.round((value / stats.totalROI) * 100) : 0;
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <div className="w-28 text-xs text-slate-600 dark:text-slate-300 truncate">{label}</div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs text-slate-500 w-10 text-right">{value}</div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </Card>
        </div>

        {/* ── Tabela cruzada: últimos 6 meses ── */}
        <Card title="Resumo Mensal — RNC × ROI">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 text-slate-500 font-medium">Mês</th>
                  <th className="text-right py-2 px-2 text-violet-600 font-medium">RNCs abertas</th>
                  <th className="text-right py-2 px-2 text-sky-600 font-medium">ROIs registrados</th>
                  <th className="text-right py-2 pl-2 text-slate-500 font-medium">Razão ROI/RNC</th>
                </tr>
              </thead>
              <tbody>
                {stats.ncWithROIMonth.map(row => (
                  <tr key={row.month} className="border-b border-slate-50 dark:border-slate-700/50">
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{formatMonth(row.month)}</td>
                    <td className="text-right py-2 px-2 font-semibold text-slate-700 dark:text-slate-200">{row.nc}</td>
                    <td className="text-right py-2 px-2 font-semibold text-slate-700 dark:text-slate-200">{row.roi}</td>
                    <td className="text-right py-2 pl-2 text-slate-500">
                      {row.nc ? (row.roi / row.nc).toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
                {!stats.ncWithROIMonth.some(r => r.nc || r.roi) && (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-slate-400">Nenhum dado nos últimos 6 meses</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Setores ROI ── */}
        {Object.keys(stats.byROISetor).filter(k => k !== 'N/A').length > 0 && (
          <Card title="ROIs por Setor Responsável">
            <div className="space-y-2">
              {Object.entries(stats.byROISetor)
                .filter(([k]) => k !== 'N/A')
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([label, value]) => {
                  const pct = stats.totalROI ? Math.round((value / stats.totalROI) * 100) : 0;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-36 text-xs text-slate-600 dark:text-slate-300 truncate">{label}</div>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-400" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-slate-500 w-10 text-right">{value}</div>
                    </div>
                  );
                })}
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
