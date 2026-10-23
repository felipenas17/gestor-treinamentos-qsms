'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Activity, AlertTriangle, CheckCircle, Clock,
  TrendingUp, TrendingDown, Shield, Edit2, Save, X,
  Plus, ChevronDown, Users, Clock3, CalendarDays,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AccidentRem, AccidentSite } from '@/types';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const SITES: AccidentSite[] = ['Macaé', 'CS', 'RDO', 'DCX'];
const MONTHS_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const META_TFCA = 30;   // meta corporativa
const MULTIPLIER = 1_000_000;

function calcTfca(row: AccidentRem): number {
  return row.hher_tr > 0 ? (row.acidentes_tr * MULTIPLIER) / row.hher_tr : 0;
}
function calcTfsa(row: AccidentRem): number {
  return row.hher_tr > 0 ? (row.sem_afastamento * MULTIPLIER) / row.hher_tr : 0;
}
function calcTg(row: AccidentRem): number {
  return row.hher_tr > 0 ? ((row.dias_perdidos + row.dias_debitados) * MULTIPLIER) / row.hher_tr : 0;
}
function enrich(row: AccidentRem): AccidentRem {
  return { ...row, tfca: calcTfca(row), tfsa: calcTfsa(row), tg: calcTg(row) };
}

// TFCA acumulada no ano = (total acidentes × 1M) / total HHER do ano
function calcTfcaAcum(rows: AccidentRem[]): number {
  const totalAcidentes = rows.reduce((s, r) => s + r.acidentes_tr, 0);
  const totalHher = rows.reduce((s, r) => s + Number(r.hher_tr), 0);
  return totalHher > 0 ? (totalAcidentes * MULTIPLIER) / totalHher : 0;
}

function tfcaBand(tfca: number): { label: string; color: string; bgColor: string } {
  if (tfca === 0) return { label: 'Sem ocorrências', color: '#22c55e', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' };
  if (tfca <= 20) return { label: 'Excelente', color: '#22c55e', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' };
  if (tfca <= 40) return { label: 'Bom', color: '#84cc16', bgColor: 'bg-lime-50 dark:bg-lime-900/20' };
  if (tfca <= 60) return { label: 'Regular', color: '#f59e0b', bgColor: 'bg-amber-50 dark:bg-amber-900/20' };
  return { label: 'Crítico', color: '#ef4444', bgColor: 'bg-red-50 dark:bg-red-900/20' };
}

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────
interface AccidentIndicatorsScreenProps {
  onToast?: (msg: string, type?: 'success' | 'error') => void;
}

// ──────────────────────────────────────────────
// Empty row factory
// ──────────────────────────────────────────────
function emptyRow(site: AccidentSite, year: number, month: number): Partial<AccidentRem> {
  return {
    site, year, month,
    num_func_tr: 0, num_func_terceiros: 0,
    hher_tr: 0,
    acidentes_tr: 0, acidentes_terceiros: 0,
    sem_afastamento: 0,
    impacto_ambiental: 0, perda_material: 0, incidente: 0,
    dias_perdidos: 0, dias_debitados: 0,
    changed_by: 'Portal',
  };
}

// ──────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</span>
        {trend && (
          <span className={`mb-0.5 ${trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-emerald-500' : 'text-slate-400'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
export function AccidentIndicatorsScreen({ onToast }: AccidentIndicatorsScreenProps) {
  const currentYear = new Date().getFullYear();
  const [rows, setRows] = useState<AccidentRem[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterSite, setFilterSite] = useState<AccidentSite | 'Todos'>('Todos');

  // tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rem'>('dashboard');

  // edit state
  const [editingRow, setEditingRow] = useState<Partial<AccidentRem> | null>(null);
  const [saving, setSaving] = useState(false);

  // ── fetch ────────────────────────────────────
  const fetchRows = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('accident_rem')
      .select('*')
      .order('year', { ascending: true })
      .order('month', { ascending: true })
      .order('site', { ascending: true });
    if (error) { onToast?.('Erro ao carregar dados REM', 'error'); }
    else { setRows((data ?? []).map(enrich)); }
    setLoading(false);
  }, [onToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRows(); }, [fetchRows]);

  // ── derived data ─────────────────────────────
  const availableYears = useMemo(() => {
    const years = [...new Set(rows.map(r => r.year))].sort((a, b) => b - a);
    if (!years.includes(currentYear)) years.unshift(currentYear);
    return years;
  }, [rows, currentYear]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (r.year !== filterYear) return false;
      if (filterSite !== 'Todos' && r.site !== filterSite) return false;
      return true;
    });
  }, [rows, filterYear, filterSite]);

  // Chart data: one point per month with TFCA per site
  const chartData = useMemo(() => {
    return MONTHS_ABBR.map((abbr, i) => {
      const month = i + 1;
      const monthRows = filteredRows.filter(r => r.month === month);
      const entry: Record<string, unknown> = { month: abbr };
      SITES.forEach(site => {
        const r = monthRows.find(x => x.site === site);
        if (r && r.hher_tr > 0) {
          entry[`TFCA_${site}`] = parseFloat(calcTfca(r).toFixed(1));
          entry[`TFSA_${site}`] = parseFloat(calcTfsa(r).toFixed(1));
        }
      });
      // aggregate (all sites)
      const totalAcid = monthRows.reduce((s, r) => s + r.acidentes_tr, 0);
      const totalHher = monthRows.reduce((s, r) => s + Number(r.hher_tr), 0);
      entry['TFCA_Total'] = totalHher > 0 ? parseFloat(((totalAcid * MULTIPLIER) / totalHher).toFixed(1)) : null;
      entry['meta'] = META_TFCA;
      return entry;
    });
  }, [filteredRows]);

  // KPIs aggregated
  const kpis = useMemo(() => {
    const totalAcid = filteredRows.reduce((s, r) => s + r.acidentes_tr, 0);
    const totalTerc = filteredRows.reduce((s, r) => s + r.acidentes_terceiros, 0);
    const totalSem = filteredRows.reduce((s, r) => s + r.sem_afastamento, 0);
    const totalHher = filteredRows.reduce((s, r) => s + Number(r.hher_tr), 0);
    const totalDias = filteredRows.reduce((s, r) => s + r.dias_perdidos + r.dias_debitados, 0);
    const tfcaAcum = calcTfcaAcum(filteredRows);
    const tfcaBandResult = tfcaBand(tfcaAcum);
    return { totalAcid, totalTerc, totalSem, totalHher, totalDias, tfcaAcum, tfcaBandResult };
  }, [filteredRows]);

  // Comparison 2025 vs 2026 for macaé
  const prevYear = filterYear - 1;
  const prevRows = useMemo(() => {
    return rows.filter(r => r.year === prevYear && (filterSite === 'Todos' || r.site === filterSite));
  }, [rows, prevYear, filterSite]);
  const prevTfca = calcTfcaAcum(prevRows);

  // ── save ─────────────────────────────────────
  const handleSave = async () => {
    if (!supabase || !editingRow) return;
    setSaving(true);
    try {
      const payload = { ...editingRow };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.tfca;
      delete payload.tfsa;
      delete payload.tg;

      let error;
      if (editingRow.id) {
        ({ error } = await supabase.from('accident_rem').update(payload).eq('id', editingRow.id));
      } else {
        ({ error } = await supabase.from('accident_rem').insert(payload));
      }
      if (error) throw error;
      onToast?.('Dados salvos com sucesso', 'success');
      setEditingRow(null);
      await fetchRows();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar';
      onToast?.(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── row field helpers ─────────────────────────
  function numField(key: keyof AccidentRem, label: string, isDecimal = false) {
    if (!editingRow) return null;
    const val = editingRow[key] as number ?? 0;
    return (
      <div key={key} className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
        <input
          type="number"
          min={0}
          step={isDecimal ? 0.1 : 1}
          value={val}
          onChange={e => setEditingRow(prev => ({ ...prev, [key]: isDecimal ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0 }))}
          className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-full"
        />
      </div>
    );
  }

  // ── Site colors ───────────────────────────────
  const SITE_COLORS: Record<string, string> = {
    Macaé: '#3b82f6',
    RDO: '#8b5cf6',
    CS: '#f59e0b',
    DCX: '#10b981',
    Total: '#64748b',
  };

  // Which sites have data in this year
  const activeSites = useMemo(() => {
    const s = new Set(filteredRows.map(r => r.site));
    return SITES.filter(x => s.has(x));
  }, [filteredRows]);

  // ── REM table months ────────────────────────────
  const remTableData = useMemo(() => {
    const sites = filterSite === 'Todos' ? SITES : [filterSite];
    return sites.flatMap(site =>
      MONTHS_ABBR.map((abbr, i) => {
        const month = i + 1;
        const existing = filteredRows.find(r => r.site === site && r.month === month);
        return { site, month, abbr, row: existing ?? null };
      }).filter(x => x.row !== null) // only months with data
    );
  }, [filteredRows, filterSite]);

  // ── Render ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Carregando indicadores…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">

      {/* ── Header ── */}
      <div className="shrink-0 px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Activity className="w-4 h-4 text-orange-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">TFCA / TFSA</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 ml-10.5">
              Indicadores de Frequência de Acidentes · {filterSite === 'Todos' ? 'Todos os sites' : filterSite} · {filterYear}
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Ano</label>
              <select
                value={filterYear}
                onChange={e => setFilterYear(Number(e.target.value))}
                className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Site</label>
              <select
                value={filterSite}
                onChange={e => setFilterSite(e.target.value as AccidentSite | 'Todos')}
                className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              >
                {['Todos', ...SITES].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b border-slate-200 dark:border-slate-700 -mb-4">
          {(['dashboard', 'rem'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-950 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab === 'dashboard' ? 'Dashboard' : 'Resumo Estatístico (REM)'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ========= DASHBOARD TAB ========= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="TFCA Acumulada"
                value={kpis.tfcaAcum.toFixed(1)}
                sub={`Meta: ≤ ${META_TFCA} · ${kpis.tfcaBandResult.label}`}
                icon={Activity}
                color={kpis.tfcaBandResult.color}
                trend={kpis.tfcaAcum <= META_TFCA ? 'down' : 'up'}
              />
              <KpiCard
                label="Acid. com Afastamento"
                value={String(kpis.totalAcid)}
                sub={`Terceiros: ${kpis.totalTerc} · Meta: ≤ 2/ano`}
                icon={AlertTriangle}
                color={kpis.totalAcid === 0 ? '#22c55e' : kpis.totalAcid <= 2 ? '#f59e0b' : '#ef4444'}
                trend={kpis.totalAcid === 0 ? 'down' : kpis.totalAcid <= 2 ? 'neutral' : 'up'}
              />
              <KpiCard
                label="HHER Total"
                value={kpis.totalHher.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                sub="Horas Homem Expostas ao Risco"
                icon={Clock3}
                color="#3b82f6"
              />
              <KpiCard
                label="Dias Perdidos"
                value={String(kpis.totalDias)}
                sub={`Sem afastamento: ${kpis.totalSem}`}
                icon={CalendarDays}
                color={kpis.totalDias === 0 ? '#22c55e' : '#f59e0b'}
                trend={kpis.totalDias === 0 ? 'neutral' : 'up'}
              />
            </div>

            {/* Vs ano anterior banner */}
            {prevRows.length > 0 && (
              <div className={`rounded-xl border px-5 py-3 flex flex-wrap items-center gap-4 text-sm ${
                kpis.tfcaAcum <= prevTfca
                  ? 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {kpis.tfcaAcum <= prevTfca
                    ? <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    : <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    vs {prevYear}:
                  </span>
                </div>
                <span className="text-slate-600 dark:text-slate-300">
                  TFCA {prevYear} = <strong>{prevTfca.toFixed(1)}</strong> &nbsp;→&nbsp; {filterYear} = <strong>{kpis.tfcaAcum.toFixed(1)}</strong>
                  &nbsp;
                  <span className={kpis.tfcaAcum <= prevTfca ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                    ({kpis.tfcaAcum <= prevTfca ? '▼' : '▲'} {Math.abs(kpis.tfcaAcum - prevTfca).toFixed(1)})
                  </span>
                </span>
              </div>
            )}

            {/* TFCA Mensal Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">TFCA Mensal — {filterYear}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Taxa de Frequência de Acidentes com Afastamento × Meta ({META_TFCA})</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block" /> Meta {META_TFCA}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-slate-500 dark:text-slate-400" />
                  <YAxis tick={{ fontSize: 11 }} className="text-slate-500 dark:text-slate-400" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: any) => [
                      typeof v === 'number' ? v.toFixed(1) : String(v),
                      typeof name === 'string' ? name.replace('TFCA_', '').replace('meta', `Meta (${META_TFCA})`) : String(name),
                    ]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={META_TFCA} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: `Meta ${META_TFCA}`, fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
                  {activeSites.map(site => (
                    <Line
                      key={site}
                      type="monotone"
                      dataKey={`TFCA_${site}`}
                      name={`TFCA ${site}`}
                      stroke={SITE_COLORS[site]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                  {filterSite === 'Todos' && activeSites.length > 1 && (
                    <Line
                      type="monotone"
                      dataKey="TFCA_Total"
                      name="TFCA Total"
                      stroke={SITE_COLORS.Total}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Acidentes por Site — Bar Chart */}
            {filterSite === 'Todos' && activeSites.length > 1 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Acidentes por Site — {filterYear}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Com afastamento (TR) · Sem afastamento · Terceiros</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={activeSites.map(site => {
                      const siteRows = filteredRows.filter(r => r.site === site);
                      return {
                        site,
                        'Com Afastamento': siteRows.reduce((s, r) => s + r.acidentes_tr, 0),
                        'Sem Afastamento': siteRows.reduce((s, r) => s + r.sem_afastamento, 0),
                        'Terceiros': siteRows.reduce((s, r) => s + r.acidentes_terceiros, 0),
                      };
                    })}
                    margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                    <XAxis dataKey="site" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Com Afastamento" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Sem Afastamento" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Terceiros" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Legenda das bandas */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Referência de Classificação — TFCA</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { range: '0 – 20', label: 'Excelente', color: '#22c55e' },
                  { range: '20 – 40', label: 'Bom', color: '#84cc16' },
                  { range: '40 – 60', label: 'Regular', color: '#f59e0b' },
                  { range: '> 60', label: 'Crítico', color: '#ef4444' },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-2.5 rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                    <div>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{b.label}</div>
                      <div className="text-[10px] text-slate-400">TFCA {b.range}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                Meta corporativa: ≤ {META_TFCA} · Máximo 2 acidentes com afastamento/ano
              </p>
            </div>
          </div>
        )}

        {/* ========= REM TAB ========= */}
        {activeTab === 'rem' && (
          <div className="space-y-4">

            {/* Add button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Registros mensais do REM · {filterYear} · {filterSite === 'Todos' ? 'Todos os sites' : filterSite}
              </p>
              <button
                onClick={() => {
                  const now = new Date();
                  setEditingRow(emptyRow(filterSite === 'Todos' ? 'Macaé' : filterSite, filterYear, now.getMonth() + 1));
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo Registro
              </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {remTableData.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14 text-slate-400">
                  <Activity className="w-8 h-8" />
                  <p className="text-sm">Nenhum dado para {filterYear}{filterSite !== 'Todos' ? ` — ${filterSite}` : ''}</p>
                  <button
                    onClick={() => setEditingRow(emptyRow(filterSite === 'Todos' ? 'Macaé' : filterSite, filterYear, 1))}
                    className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2"
                  >
                    Adicionar primeiro registro
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Site</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mês</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Func TR</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">HHER</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Acid. c/ Afas.</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Acid. Terc.</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Sem Afas.</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Dias Perd.</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">TFCA</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">TFSA</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {remTableData.map(({ site, month, abbr, row }) => {
                        if (!row) return null;
                        const tfca = calcTfca(row);
                        const tfsa = calcTfsa(row);
                        const band = tfcaBand(tfca);
                        const hasAccident = row.acidentes_tr > 0 || row.acidentes_terceiros > 0;
                        return (
                          <tr
                            key={`${site}-${month}`}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${hasAccident ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}
                          >
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                {site}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{abbr}/{filterYear}</td>
                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{row.num_func_tr}</td>
                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{Number(row.hher_tr).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-semibold ${row.acidentes_tr > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                                {row.acidentes_tr}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`${row.acidentes_terceiros > 0 ? 'text-purple-600 dark:text-purple-400 font-semibold' : 'text-slate-400'}`}>
                                {row.acidentes_terceiros}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`${row.sem_afastamento > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400'}`}>
                                {row.sem_afastamento}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`${row.dias_perdidos > 0 ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-slate-400'}`}>
                                {row.dias_perdidos}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {row.hher_tr > 0 ? (
                                <span className="font-semibold" style={{ color: band.color }}>{tfca.toFixed(1)}</span>
                              ) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {row.hher_tr > 0 && row.sem_afastamento > 0 ? (
                                <span className="font-semibold text-amber-600 dark:text-amber-400">{tfsa.toFixed(1)}</span>
                              ) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setEditingRow({ ...row })}
                                className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {editingRow.id ? 'Editar' : 'Novo'} Registro REM
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Resumo Estatístico Mensal
                </p>
              </div>
              <button
                onClick={() => setEditingRow(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Site / Ano / Mês */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Site</label>
                  <select
                    value={editingRow.site ?? 'Macaé'}
                    onChange={e => setEditingRow(p => ({ ...p, site: e.target.value as AccidentSite }))}
                    disabled={!!editingRow.id}
                    className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-60"
                  >
                    {SITES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Ano</label>
                  <input
                    type="number" min={2020} max={2050}
                    value={editingRow.year ?? currentYear}
                    onChange={e => setEditingRow(p => ({ ...p, year: parseInt(e.target.value) || currentYear }))}
                    disabled={!!editingRow.id}
                    className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-60"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Mês</label>
                  <select
                    value={editingRow.month ?? 1}
                    onChange={e => setEditingRow(p => ({ ...p, month: parseInt(e.target.value) }))}
                    disabled={!!editingRow.id}
                    className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-60"
                  >
                    {MONTHS_ABBR.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Headcount */}
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Headcount</p>
                <div className="grid grid-cols-2 gap-4">
                  {numField('num_func_tr', 'Funcionários TR (próprios)')}
                  {numField('num_func_terceiros', 'Funcionários Terceirizados')}
                </div>
              </div>

              {/* HHER */}
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Horas Homem Expostas ao Risco</p>
                <div className="grid grid-cols-1 gap-4">
                  {numField('hher_tr', 'HHER — Próprios TR', true)}
                </div>
              </div>

              {/* Ocorrências */}
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Ocorrências</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {numField('acidentes_tr', 'Acidentes c/ Afastamento (TR)')}
                  {numField('acidentes_terceiros', 'Acidentes c/ Afastamento (Terc.)')}
                  {numField('sem_afastamento', 'Acidentes s/ Afastamento')}
                  {numField('impacto_ambiental', 'Impacto Ambiental')}
                  {numField('perda_material', 'Perda Material')}
                  {numField('incidente', 'Incidente (quase-acidente)')}
                </div>
              </div>

              {/* Gravidade */}
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Gravidade (TG)</p>
                <div className="grid grid-cols-2 gap-4">
                  {numField('dias_perdidos', 'Dias Perdidos')}
                  {numField('dias_debitados', 'Dias Debitados')}
                </div>
              </div>

              {/* Responsável */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Alterado por</label>
                <input
                  type="text"
                  value={editingRow.changed_by ?? ''}
                  onChange={e => setEditingRow(p => ({ ...p, changed_by: e.target.value }))}
                  placeholder="Nome do responsável"
                  className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>

              {/* Preview computado */}
              {(editingRow.hher_tr ?? 0) > 0 && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-4 py-3 grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: 'TFCA', value: (((editingRow.acidentes_tr ?? 0) * MULTIPLIER) / (editingRow.hher_tr ?? 1)).toFixed(1) },
                    { label: 'TFSA', value: (((editingRow.sem_afastamento ?? 0) * MULTIPLIER) / (editingRow.hher_tr ?? 1)).toFixed(1) },
                    { label: 'TG', value: ((((editingRow.dias_perdidos ?? 0) + (editingRow.dias_debitados ?? 0)) * MULTIPLIER) / (editingRow.hher_tr ?? 1)).toFixed(1) },
                  ].map(x => (
                    <div key={x.label}>
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{x.value}</div>
                      <div className="text-xs text-slate-400">{x.label} calculado</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
