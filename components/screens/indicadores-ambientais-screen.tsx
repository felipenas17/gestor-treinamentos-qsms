'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Leaf, Zap, Droplets, Trash2, Waves, Plus, X, Pencil, RefreshCw,
  TrendingUp, TrendingDown, Loader2, Target, AlertTriangle, CheckCircle2,
  BarChart2, Minus, Table2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Indicador {
  id: string;
  mes_ano: string;
  indicador: string;
  unidade: string;
  valor_realizado: number | null;
  meta: number | null;
  observacoes: string | null;
  created_at: string;
}

type ViewMode = 'dashboard' | 'tabela';

// ─── Constants ───────────────────────────────────────────────────────────────

const INDICADORES_PADRAO = [
  'Energia Elétrica', 'Consumo de Água', 'Resíduos Sólidos',
  'Efluentes Gerados', 'Emissões CO₂', 'Combustível',
];

const UNIDADES: Record<string, string> = {
  'Energia Elétrica': 'kWh', 'Consumo de Água': 'm³',
  'Resíduos Sólidos': 'kg',  'Efluentes Gerados': 'm³',
  'Emissões CO₂': 'tCO₂eq', 'Combustível': 'L',
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/** Config visual por indicador: ícone, cor Tailwind, hex para SVG */
const IND_CFG: Record<string, { icon: React.ElementType; tw: string; hex: string; bg: string; border: string }> = {
  'Energia Elétrica': { icon: Zap,      tw: 'amber',   hex: '#f59e0b', bg: 'bg-amber-500/10',   border: 'border-amber-500/30'  },
  'Consumo de Água':  { icon: Droplets, tw: 'blue',    hex: '#3b82f6', bg: 'bg-blue-500/10',    border: 'border-blue-500/30'   },
  'Resíduos Sólidos': { icon: Trash2,   tw: 'violet',  hex: '#8b5cf6', bg: 'bg-violet-500/10',  border: 'border-violet-500/30' },
  'Efluentes Gerados':{ icon: Waves,    tw: 'cyan',    hex: '#06b6d4', bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30'   },
  'Emissões CO₂':     { icon: Leaf,     tw: 'emerald', hex: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30'},
  'Combustível':      { icon: Zap,      tw: 'orange',  hex: '#f97316', bg: 'bg-orange-500/10',  border: 'border-orange-500/30' },
};

const KPI_INDICADORES = ['Energia Elétrica','Consumo de Água','Resíduos Sólidos','Efluentes Gerados'];

function mesLabel(mes_ano: string) {
  const d = new Date(mes_ano + 'T12:00:00');
  return MESES[d.getMonth()];
}

function pct(valor: number | null, meta: number | null): number | null {
  if (!valor || !meta || meta === 0) return null;
  return Math.round((valor / meta) * 100);
}

function fmtNum(n: number | null | undefined, unit?: string): string {
  if (n == null) return '—';
  const s = n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toFixed(1).replace(/\.0$/, '');
  return unit ? `${s} ${unit}` : s;
}

// ─── SVG: Sparkline ──────────────────────────────────────────────────────────

function Sparkline({ values, hex }: { values: number[]; hex: string }) {
  if (values.length < 2) return null;
  const W = 88, H = 28, PAD = 2;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((v - min) / range) * (H - PAD * 2),
  }));
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i];
    const p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y},${cp2x},${cp2y},${p2.x},${p2.y}`;
  }
  const area = `${d} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;
  const gradId = `sp-${hex.replace('#','')}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hex} stopOpacity="0.35" />
          <stop offset="100%" stopColor={hex} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={d} stroke={hex} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="2.5" fill={hex} />
    </svg>
  );
}

// ─── SVG: Donut ──────────────────────────────────────────────────────────────

function DonutChart({ value, hex, size = 72 }: { value: number | null; hex: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const filled = value !== null ? Math.min(value, 110) / 110 * circ : 0;
  const over = value !== null && value > 100;
  const stroke = value === null ? '#e2e8f0' : over ? '#ef4444' : hex;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={stroke} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  );
}

// ─── SVG: Trend Chart ────────────────────────────────────────────────────────

function TrendChart({ byIndicador, allMeses }: { byIndicador: Record<string, Indicador[]>; allMeses: string[] }) {
  const H = 160, W = 1000, ML = 44, MR = 16, MB = 28, MT = 10;
  const CW = W - ML - MR, CH = H - MB - MT;
  const YMAX = 120;
  const toY = (p: number) => MT + CH - (Math.min(p, YMAX) / YMAX) * CH;
  const toX = (i: number) => ML + (allMeses.length <= 1 ? CW / 2 : (i / (allMeses.length - 1)) * CW);

  const inds = KPI_INDICADORES.filter(ind => byIndicador[ind]?.length);

  return (
    <svg viewBox={`0 0 ${W} ${H + MB}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        {inds.map(ind => {
          const hex = IND_CFG[ind]?.hex ?? '#10b981';
          const id = `tg-${ind.replace(/\s/g, '')}`;
          return (
            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={hex} stopOpacity="0.18" />
              <stop offset="100%" stopColor={hex} stopOpacity="0.02" />
            </linearGradient>
          );
        })}
      </defs>

      {/* Grid */}
      {[0, 25, 50, 75, 100].map(yv => {
        const y = toY(yv);
        return (
          <g key={yv}>
            <line x1={ML} y1={y} x2={W - MR} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray={yv === 100 ? '0' : '4 4'} />
            <text x={ML - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{yv}%</text>
          </g>
        );
      })}

      {/* Meta reference at 100% — solid emerald dashed */}
      <line x1={ML} y1={toY(100)} x2={W - MR} y2={toY(100)} stroke="#10b981" strokeWidth="1" strokeDasharray="6 4" opacity="0.6" />

      {/* X axis months */}
      {allMeses.map((m, i) => (
        <text key={m} x={toX(i)} y={H + MB - 4} textAnchor="middle" fontSize="10" fill="#475569">
          {mesLabel(m)}
        </text>
      ))}

      {/* Lines per indicator */}
      {inds.map(ind => {
        const cfg = IND_CFG[ind];
        const hex = cfg?.hex ?? '#10b981';
        const gradId = `tg-${ind.replace(/\s/g, '')}`;
        const recs = byIndicador[ind] ?? [];
        const pts = allMeses.map((m, i) => {
          const rec = recs.find(r => r.mes_ano === m);
          const p = rec ? pct(rec.valor_realizado, rec.meta) : null;
          return p !== null ? { x: toX(i), y: toY(p), p } : null;
        }).filter(Boolean) as { x: number; y: number; p: number }[];

        if (pts.length < 2) return null;

        let pathD = `M${pts[0].x},${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[Math.max(0, i - 1)], p1 = pts[i];
          const p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
          const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
          const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
          pathD += ` C${cp1x},${cp1y},${cp2x},${cp2y},${p2.x},${p2.y}`;
        }
        const areaD = `${pathD} L${pts[pts.length-1].x},${toY(0)} L${pts[0].x},${toY(0)} Z`;

        return (
          <g key={ind}>
            <path d={areaD} fill={`url(#${gradId})`} />
            <path d={pathD} stroke={hex} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill={hex} stroke="#0f172a" strokeWidth="1.5" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Modal CRUD ──────────────────────────────────────────────────────────────

interface ModalProps {
  rec: Partial<Indicador> | null;
  onClose: () => void;
  onSave: (d: Partial<Indicador>) => Promise<void>;
  saving: boolean;
}

function Modal({ rec, onClose, onSave, saving }: ModalProps) {
  const isNew = !rec?.id;
  const [form, setForm] = useState<Partial<Indicador>>({
    mes_ano: new Date().toISOString().slice(0, 7) + '-01',
    indicador: 'Energia Elétrica',
    unidade: 'kWh',
    valor_realizado: null,
    meta: null,
    observacoes: '',
    ...rec,
  });
  const set = (k: keyof Indicador, v: unknown) => setForm(p => ({ ...p, [k]: v }));
  const handleInd = (ind: string) => { set('indicador', ind); if (UNIDADES[ind]) set('unidade', UNIDADES[ind]); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <h2 className="font-bold text-slate-100 text-sm">{isNew ? 'Novo Registro' : 'Editar Registro'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Mês/Ano</label>
              <input type="month" value={form.mes_ano?.slice(0,7) ?? ''} onChange={e => set('mes_ano', e.target.value + '-01')}
                className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Indicador</label>
              <select value={form.indicador ?? ''} onChange={e => handleInd(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50">
                {INDICADORES_PADRAO.map(i => <option key={i}>{i}</option>)}
                <option value="__outro">Outro…</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Unidade</label>
              <input value={form.unidade ?? ''} onChange={e => set('unidade', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="kWh" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Realizado</label>
              <input type="number" value={form.valor_realizado ?? ''} onChange={e => set('valor_realizado', e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Meta</label>
              <input type="number" value={form.meta ?? ''} onChange={e => set('meta', e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Observações</label>
            <textarea value={form.observacoes ?? ''} onChange={e => set('observacoes', e.target.value)} rows={2}
              className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none" placeholder="Observações opcionais" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50 flex items-center gap-2 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isNew ? 'Salvar' : 'Atualizar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function IndicadoresAmbientaisScreen({ onToast }: Props) {
  const [records, setRecords] = useState<Indicador[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState<ViewMode>('dashboard');
  const [modal, setModal]     = useState<Partial<Indicador> | null | false>(false);
  const [saving, setSaving]   = useState(false);
  const [filtroInd, setFiltroInd] = useState('Todos');
  const [filtroAno, setFiltroAno] = useState('2026');

  const load = useCallback(async () => {
    setLoading(true);
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('indicadores_ambientais')
      .select('*')
      .order('mes_ano', { ascending: false })
      .order('indicador');
    if (error) onToast('Erro ao carregar indicadores', 'error');
    else setRecords((data ?? []) as Indicador[]);
    setLoading(false);
  }, [onToast]);

  useState(() => { void load(); return null; });

  const handleSave = async (form: Partial<Indicador>) => {
    if (!supabase) return;
    setSaving(true);
    const payload = {
      mes_ano: form.mes_ano, indicador: form.indicador,
      unidade: form.unidade, valor_realizado: form.valor_realizado,
      meta: form.meta, observacoes: form.observacoes || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = form.id
      ? await supabase.from('indicadores_ambientais').update(payload).eq('id', form.id)
      : await supabase.from('indicadores_ambientais').insert(payload);
    setSaving(false);
    if (error) { onToast('Erro ao salvar', 'error'); return; }
    onToast(form.id ? 'Registro atualizado' : 'Registro salvo', 'success');
    setModal(false);
    void load();
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !confirm('Excluir este registro?')) return;
    const { error } = await supabase.from('indicadores_ambientais').delete().eq('id', id);
    if (error) { onToast('Erro ao excluir', 'error'); return; }
    onToast('Registro excluído', 'success');
    void load();
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const allAnos = useMemo(() =>
    [...new Set(records.map(r => r.mes_ano.slice(0,4)))].sort().reverse(), [records]);

  const byIndicador = useMemo(() => {
    const map: Record<string, Indicador[]> = {};
    records.forEach(r => { if (!map[r.indicador]) map[r.indicador] = []; map[r.indicador].push(r); });
    Object.values(map).forEach(arr => arr.sort((a, b) => a.mes_ano.localeCompare(b.mes_ano)));
    return map;
  }, [records]);

  // All unique months from 2026, sorted ascending
  const allMeses2026 = useMemo(() =>
    [...new Set(records.filter(r => r.mes_ano.startsWith('2026')).map(r => r.mes_ano))]
      .sort(), [records]);

  // Overall environmental score: avg of % da meta for KPI indicators (latest month each)
  const overallScore = useMemo(() => {
    const scores = KPI_INDICADORES.map(ind => {
      const recs = byIndicador[ind] ?? [];
      const latest = recs[recs.length - 1];
      return pct(latest?.valor_realizado ?? null, latest?.meta ?? null);
    }).filter((p): p is number => p !== null);
    if (!scores.length) return null;
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return avg;
  }, [byIndicador]);

  // Conformes count
  const conformeCount = useMemo(() => KPI_INDICADORES.filter(ind => {
    const recs = byIndicador[ind] ?? [];
    const latest = recs[recs.length - 1];
    const p = pct(latest?.valor_realizado ?? null, latest?.meta ?? null);
    return p !== null && p <= 100;
  }).length, [byIndicador]);

  // Latest month label
  const latestMes = useMemo(() => {
    if (!records.length) return '';
    const latest = [...records].sort((a, b) => b.mes_ano.localeCompare(a.mes_ano))[0];
    return mesLabel(latest.mes_ano) + ' ' + latest.mes_ano.slice(0, 4);
  }, [records]);

  const filteredTable = useMemo(() => records.filter(r =>
    (filtroInd === 'Todos' || r.indicador === filtroInd) &&
    (!filtroAno || r.mes_ano.startsWith(filtroAno))
  ), [records, filtroInd, filtroAno]);

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />Carregando indicadores…
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-slate-950">
      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border-b border-slate-800 px-6 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

          {/* Left: branding + score */}
          <div className="flex items-center gap-6">
            {/* Score ring */}
            <div className="relative shrink-0">
              <DonutChart value={overallScore} hex="#10b981" size={88} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white leading-none">
                  {overallScore !== null ? `${overallScore}%` : '—'}
                </span>
                <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-widest mt-0.5">score</span>
              </div>
            </div>

            {/* Title block */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest">ISO 14001</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-tight">Indicadores Ambientais</h1>
              <p className="text-sm text-slate-400 mt-0.5">Gestão Ambiental · Monitoramento e Medição</p>
            </div>
          </div>

          {/* Right: stats + actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Stats chips */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-center">
                <div className="text-lg font-black text-white">{conformeCount}<span className="text-slate-500 text-sm font-normal">/{KPI_INDICADORES.length}</span></div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Conformes</div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-center">
                <div className="text-lg font-black text-white">{allMeses2026.length}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Meses</div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-center">
                <div className="text-sm font-black text-white leading-tight">{latestMes || '—'}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Referência</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                <button onClick={() => setView('dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${view === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                  <BarChart2 className="w-3.5 h-3.5" />Dashboard
                </button>
                <button onClick={() => setView('tabela')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${view === 'tabela' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                  <Table2 className="w-3.5 h-3.5" />Tabela
                </button>
              </div>
              <button onClick={() => void load()} title="Atualizar" className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={() => setModal({})}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/40 transition-colors">
                <Plus className="w-3.5 h-3.5" />Novo Registro
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Dashboard View ───────────────────────────────────────────────────── */}
      {view === 'dashboard' && (
        <div className="p-6 space-y-6">

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {KPI_INDICADORES.map(ind => {
              const cfg = IND_CFG[ind] ?? IND_CFG['Energia Elétrica'];
              const Icon = cfg.icon;
              const recs = byIndicador[ind] ?? [];
              const latest = recs[recs.length - 1];
              const prev   = recs[recs.length - 2];
              const p = pct(latest?.valor_realizado ?? null, latest?.meta ?? null);
              const isOk = p !== null && p <= 100;
              const isOver = p !== null && p > 100;
              const delta = latest && prev && prev.valor_realizado
                ? ((latest.valor_realizado! - prev.valor_realizado!) / prev.valor_realizado!) * 100
                : null;
              const sparkVals = recs.slice(-8).map(r => r.valor_realizado ?? 0);

              return (
                <div key={ind} className="relative bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-hidden group hover:border-slate-700 transition-colors">
                  {/* Accent glow top */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${cfg.hex}80, transparent)` }} />

                  {/* Top row: icon + status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" style={{ color: cfg.hex }} />
                    </div>
                    {p !== null ? (
                      isOk ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] font-bold text-emerald-400">CONFORME</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          <span className="text-[10px] font-bold text-red-400">ACIMA META</span>
                        </div>
                      )
                    ) : (
                      <div className="px-2 py-1 bg-slate-800 rounded-full">
                        <span className="text-[10px] font-bold text-slate-500">SEM DADO</span>
                      </div>
                    )}
                  </div>

                  {/* Indicator name */}
                  <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">{ind}</div>

                  {/* Value */}
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-2xl font-black text-white">
                      {fmtNum(latest?.valor_realizado ?? null)}
                    </span>
                    <span className="text-sm text-slate-500">{latest?.unidade ?? UNIDADES[ind] ?? ''}</span>
                  </div>

                  {/* Meta + delta */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Target className="w-3 h-3" />
                      <span>meta {fmtNum(latest?.meta ?? null)}</span>
                    </div>
                    {delta !== null && (
                      <div className={`flex items-center gap-0.5 text-xs font-bold ${delta < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {delta < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                        {Math.abs(delta).toFixed(1)}%
                      </div>
                    )}
                  </div>

                  {/* % da meta progress bar */}
                  {p !== null && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-500 font-medium">% da meta</span>
                        <span className={`text-[11px] font-black ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>{p}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(p, 100)}%`, background: isOver ? '#ef4444' : cfg.hex }} />
                      </div>
                    </div>
                  )}

                  {/* Sparkline */}
                  {sparkVals.length >= 2 && (
                    <div className="opacity-70">
                      <Sparkline values={sparkVals} hex={cfg.hex} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Main Chart + Conformidade Rings Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* Trend Chart (2/3) */}
            <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Tendência Anual — % da Meta</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Todos os indicadores · 2026 · Linha verde = meta 100%</p>
                </div>
                {/* Legend */}
                <div className="hidden sm:flex items-center gap-3 flex-wrap justify-end">
                  {KPI_INDICADORES.map(ind => {
                    const hex = IND_CFG[ind]?.hex ?? '#10b981';
                    return (
                      <div key={ind} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: hex }} />
                        <span className="text-[10px] text-slate-400 font-medium">{ind.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {allMeses2026.length >= 2 ? (
                <TrendChart byIndicador={byIndicador} allMeses={allMeses2026} />
              ) : (
                <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                  Dados insuficientes para o gráfico
                </div>
              )}
            </div>

            {/* Conformidade Rings (1/3) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-1">Conformidade por Indicador</h3>
              <p className="text-xs text-slate-500 mb-4">Mês mais recente vs. meta</p>
              <div className="grid grid-cols-2 gap-4">
                {KPI_INDICADORES.map(ind => {
                  const cfg = IND_CFG[ind];
                  const Icon = cfg?.icon ?? Leaf;
                  const recs = byIndicador[ind] ?? [];
                  const latest = recs[recs.length - 1];
                  const p = pct(latest?.valor_realizado ?? null, latest?.meta ?? null);
                  const isOk = p !== null && p <= 100;

                  return (
                    <div key={ind} className="flex flex-col items-center gap-1.5">
                      <div className="relative">
                        <DonutChart value={p} hex={cfg?.hex ?? '#10b981'} size={72} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Icon className="w-4 h-4" style={{ color: p === null ? '#475569' : isOk ? cfg?.hex : '#ef4444' }} />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`text-sm font-black ${p === null ? 'text-slate-500' : isOk ? 'text-emerald-400' : 'text-red-400'}`}>
                          {p !== null ? `${p}%` : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium leading-tight text-center">{ind.split(' ')[0]}<br/>{ind.split(' ').slice(1).join(' ')}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Score summary */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Score Ambiental Geral</span>
                  <span className={`text-sm font-black ${(overallScore ?? 0) <= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {overallScore !== null ? `${overallScore}%` : '—'}
                  </span>
                </div>
                {overallScore !== null && (
                  <div className="mt-1.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(overallScore, 100)}%`, background: overallScore <= 100 ? '#10b981' : '#ef4444' }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* All Indicators Summary (remaining indicators) */}
          {Object.keys(byIndicador).filter(ind => !KPI_INDICADORES.includes(ind)).length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">Outros Indicadores</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.keys(byIndicador).filter(ind => !KPI_INDICADORES.includes(ind)).map(ind => {
                  const cfg = IND_CFG[ind] ?? IND_CFG['Energia Elétrica'];
                  const Icon = cfg.icon;
                  const recs = byIndicador[ind] ?? [];
                  const latest = recs[recs.length - 1];
                  const p = pct(latest?.valor_realizado ?? null, latest?.meta ?? null);
                  return (
                    <div key={ind} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-3.5 h-3.5" style={{ color: cfg.hex }} />
                        <span className="text-xs font-semibold text-slate-300 truncate">{ind}</span>
                      </div>
                      <div className="text-lg font-black text-white">{fmtNum(latest?.valor_realizado ?? null)} <span className="text-xs text-slate-500">{latest?.unidade}</span></div>
                      <div className={`text-xs font-bold ${p !== null && p <= 100 ? 'text-emerald-400' : p !== null ? 'text-red-400' : 'text-slate-500'}`}>
                        {p !== null ? `${p}% da meta` : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Table View ───────────────────────────────────────────────────────── */}
      {view === 'tabela' && (
        <div className="p-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select value={filtroInd} onChange={e => setFiltroInd(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
              <option value="Todos">Todos os indicadores</option>
              {[...new Set(records.map(r => r.indicador))].sort().map(i => <option key={i}>{i}</option>)}
            </select>
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
              <option value="">Todos os anos</option>
              {allAnos.map(a => <option key={a}>{a}</option>)}
            </select>
            <span className="text-xs text-slate-500 ml-auto">{filteredTable.length} registros</span>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mês/Ano</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Indicador</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Realizado</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Meta</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">% Meta</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Observações</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTable.map((r, i) => {
                    const p = pct(r.valor_realizado, r.meta);
                    const isOk = p !== null && p <= 100;
                    const cfg = IND_CFG[r.indicador];
                    return (
                      <tr key={r.id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-800/10'}`}>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-200">{mesLabel(r.mes_ano)}</span>
                          <span className="text-slate-500 text-xs"> {r.mes_ano.slice(0,4)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {cfg && <div className="w-1.5 h-5 rounded-full" style={{ background: cfg.hex }} />}
                            <span className="text-slate-200 font-medium">{r.indicador}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200 font-semibold">
                          {r.valor_realizado != null ? r.valor_realizado.toLocaleString('pt-BR') : '—'}
                          <span className="text-slate-500 text-xs ml-1">{r.unidade}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-400">
                          {r.meta != null ? r.meta.toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {p !== null ? (
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(p, 100)}%`, background: isOk ? '#10b981' : '#ef4444' }} />
                              </div>
                              <span className={`text-xs font-bold w-10 text-right ${isOk ? 'text-emerald-400' : 'text-red-400'}`}>{p}%</span>
                            </div>
                          ) : <span className="text-slate-600 text-center block">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p === null ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-500 rounded-full">
                              <Minus className="w-2.5 h-2.5" />S/DADO
                            </span>
                          ) : isOk ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" />CONFORME
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
                              <AlertTriangle className="w-2.5 h-2.5" />ACIMA
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{r.observacoes || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => setModal(r)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-200 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTable.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                        Nenhum registro encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal !== false && (
        <Modal rec={modal} onClose={() => setModal(false)} onSave={handleSave} saving={saving} />
      )}
    </div>
  );
}
