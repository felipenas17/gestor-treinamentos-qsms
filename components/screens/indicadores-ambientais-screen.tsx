'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Leaf, Zap, Droplets, Trash2, Waves, Plus, X, Pencil, RefreshCw,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Loader2,
  Target, BarChart2, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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

const INDICADORES_PADRAO = [
  'Energia Elétrica',
  'Consumo de Água',
  'Resíduos Sólidos',
  'Efluentes Gerados',
  'Emissões CO₂',
  'Combustível',
];

const UNIDADES: Record<string, string> = {
  'Energia Elétrica': 'kWh',
  'Consumo de Água': 'm³',
  'Resíduos Sólidos': 'kg',
  'Efluentes Gerados': 'm³',
  'Emissões CO₂': 'tCO₂eq',
  'Combustível': 'L',
};

const ICONES: Record<string, React.ElementType> = {
  'Energia Elétrica': Zap,
  'Consumo de Água': Droplets,
  'Resíduos Sólidos': Trash2,
  'Efluentes Gerados': Waves,
  'Emissões CO₂': Leaf,
  'Combustível': Zap,
};

const CORES: Record<string, string> = {
  'Energia Elétrica': 'amber',
  'Consumo de Água': 'blue',
  'Resíduos Sólidos': 'slate',
  'Efluentes Gerados': 'cyan',
  'Emissões CO₂': 'emerald',
  'Combustível': 'orange',
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function mesLabel(mes_ano: string) {
  const d = new Date(mes_ano + 'T12:00:00');
  return `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

function pct(valor: number | null, meta: number | null): number | null {
  if (!valor || !meta || meta === 0) return null;
  return Math.round((valor / meta) * 100);
}

function statusMeta(p: number | null) {
  if (p === null) return { label: '—', cls: 'text-slate-400', bar: 'bg-slate-300' };
  if (p <= 100)   return { label: `${p}% da meta`, cls: 'text-emerald-600', bar: 'bg-emerald-500' };
  return { label: `${p}% da meta`, cls: 'text-red-600', bar: 'bg-red-500' };
}

// ─── Modal ───────────────────────────────────────────────────────────────────

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

  const handleIndicadorChange = (ind: string) => {
    set('indicador', ind);
    if (UNIDADES[ind]) set('unidade', UNIDADES[ind]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">
            {isNew ? 'Novo Registro' : 'Editar Registro'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Mês/Ano</label>
              <input type="month" value={form.mes_ano?.slice(0,7) ?? ''} onChange={e => set('mes_ano', e.target.value + '-01')}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Indicador</label>
              <select value={form.indicador ?? ''} onChange={e => handleIndicadorChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                {INDICADORES_PADRAO.map(i => <option key={i}>{i}</option>)}
                <option value="__outro">Outro…</option>
              </select>
            </div>
          </div>
          {form.indicador === '__outro' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Nome do indicador</label>
              <input value={form.indicador === '__outro' ? '' : (form.indicador ?? '')} onChange={e => set('indicador', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="Nome livre" />
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Unidade</label>
              <input value={form.unidade ?? ''} onChange={e => set('unidade', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="kWh" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Realizado</label>
              <input type="number" value={form.valor_realizado ?? ''} onChange={e => set('valor_realizado', e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Meta</label>
              <input type="number" value={form.meta ?? ''} onChange={e => set('meta', e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Observações</label>
            <textarea value={form.observacoes ?? ''} onChange={e => set('observacoes', e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none" placeholder="Observações opcionais" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isNew ? 'Salvar' : 'Atualizar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function IndicadoresAmbientaisScreen({ onToast }: Props) {
  const [records, setRecords]   = useState<Indicador[]>([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<ViewMode>('dashboard');
  const [modal, setModal]       = useState<Partial<Indicador> | null | false>(false);
  const [saving, setSaving]     = useState(false);
  const [filtroInd, setFiltroInd] = useState('Todos');
  const [filtroAno, setFiltroAno] = useState('2026');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

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
      mes_ano: form.mes_ano,
      indicador: form.indicador,
      unidade: form.unidade,
      valor_realizado: form.valor_realizado,
      meta: form.meta,
      observacoes: form.observacoes || null,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from('indicadores_ambientais').update(payload).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('indicadores_ambientais').insert(payload));
    }
    setSaving(false);
    if (error) { onToast('Erro ao salvar', 'error'); return; }
    onToast(form.id ? 'Registro atualizado' : 'Registro salvo', 'success');
    setModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !confirm('Excluir este registro?')) return;
    const { error } = await supabase.from('indicadores_ambientais').delete().eq('id', id);
    if (error) { onToast('Erro ao excluir', 'error'); return; }
    onToast('Registro excluído', 'success');
    load();
  };

  // All distinct indicadores
  const allIndicadores = useMemo(() => [...new Set(records.map(r => r.indicador))].sort(), [records]);
  const allAnos = useMemo(() => [...new Set(records.map(r => r.mes_ano.slice(0,4)))].sort().reverse(), [records]);

  // Dashboard: group by indicador, latest 12 months
  const byIndicador = useMemo(() => {
    const map: Record<string, Indicador[]> = {};
    records.forEach(r => {
      if (!map[r.indicador]) map[r.indicador] = [];
      map[r.indicador].push(r);
    });
    // sort each by mes_ano asc
    Object.values(map).forEach(arr => arr.sort((a,b) => a.mes_ano.localeCompare(b.mes_ano)));
    return map;
  }, [records]);

  const filteredTable = useMemo(() => records.filter(r => {
    const matchInd = filtroInd === 'Todos' || r.indicador === filtroInd;
    const matchAno = !filtroAno || r.mes_ano.startsWith(filtroAno);
    return matchInd && matchAno;
  }), [records, filtroInd, filtroAno]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />Carregando…
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Indicadores Ambientais</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 ml-10">ISO 14001 · Monitoramento e Medição</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            <button onClick={() => setView('dashboard')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'dashboard' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
              <BarChart2 className="w-3.5 h-3.5 inline mr-1" />Dashboard
            </button>
            <button onClick={() => setView('tabela')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'tabela' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
              <Target className="w-3.5 h-3.5 inline mr-1" />Tabela
            </button>
          </div>
          <button onClick={load} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setModal({})} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg">
            <Plus className="w-3.5 h-3.5" />Novo Registro
          </button>
        </div>
      </div>

      {/* DASHBOARD VIEW */}
      {view === 'dashboard' && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(['Energia Elétrica','Consumo de Água','Resíduos Sólidos','Efluentes Gerados'] as const).map(ind => {
              const recs = byIndicador[ind] ?? [];
              const latest = recs[recs.length - 1];
              const prev   = recs[recs.length - 2];
              const p = pct(latest?.valor_realizado ?? null, latest?.meta ?? null);
              const st = statusMeta(p);
              const Ic = ICONES[ind] ?? Leaf;
              const cor = CORES[ind] ?? 'emerald';
              const delta = latest && prev && prev.valor_realizado
                ? ((latest.valor_realizado! - prev.valor_realizado!) / prev.valor_realizado!) * 100
                : null;
              return (
                <div key={ind} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-lg bg-${cor}-100 dark:bg-${cor}-900/30 flex items-center justify-center`}>
                      <Ic className={`w-4 h-4 text-${cor}-600 dark:text-${cor}-400`} />
                    </div>
                    {delta !== null && (
                      <span className={`flex items-center gap-0.5 text-[11px] font-medium ${delta > 0 ? 'text-red-500' : delta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {Math.abs(delta).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{ind}</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {latest?.valor_realizado?.toLocaleString('pt-BR') ?? '—'}
                    <span className="text-xs font-normal text-slate-400 ml-1">{latest?.unidade}</span>
                  </p>
                  {latest?.meta && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Meta: {latest.meta.toLocaleString('pt-BR')}</span>
                        <span className={st.cls}>{st.label}</span>
                      </div>
                      <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${st.bar} rounded-full transition-all`} style={{ width: `${Math.min(p ?? 0, 120)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Trend Charts per indicador */}
          {allIndicadores.map(ind => {
            const recs = (byIndicador[ind] ?? []).slice(-12);
            const max = Math.max(...recs.map(r => Math.max(r.valor_realizado ?? 0, r.meta ?? 0)), 1);
            const isExpanded = expandedCard === ind;
            const latest = recs[recs.length - 1];
            const p = pct(latest?.valor_realizado ?? null, latest?.meta ?? null);
            const st = statusMeta(p);
            return (
              <div key={ind} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <button className="w-full flex items-center justify-between p-4" onClick={() => setExpandedCard(isExpanded ? null : ind)}>
                  <div className="flex items-center gap-3">
                    {React.createElement(ICONES[ind] ?? Leaf, { className: `w-4 h-4 text-${CORES[ind] ?? 'emerald'}-600 dark:text-${CORES[ind] ?? 'emerald'}-400` })}
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{ind}</p>
                      <p className={`text-[11px] ${st.cls}`}>{st.label} · últimos {recs.length} meses</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4">
                    {/* Bar chart */}
                    <div className="flex items-end gap-1 h-32 mt-2">
                      {recs.map((r, i) => {
                        const h = r.valor_realizado ? Math.round((r.valor_realizado / max) * 100) : 0;
                        const hMeta = r.meta ? Math.round((r.meta / max) * 100) : 0;
                        const over = r.valor_realizado && r.meta && r.valor_realizado > r.meta;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              {r.valor_realizado?.toLocaleString('pt-BR')} {r.unidade}
                            </div>
                            <div className="w-full flex items-end gap-px" style={{ height: '100%' }}>
                              <div className={`flex-1 rounded-t ${over ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ height: `${h}%` }} />
                              {hMeta > 0 && <div className="w-1 rounded-t bg-slate-300 dark:bg-slate-600 opacity-60" style={{ height: `${hMeta}%` }} />}
                            </div>
                            <span className="text-[9px] text-slate-400 truncate w-full text-center">{mesLabel(r.mes_ano)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" />Realizado</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />Acima da meta</span>
                      <span className="flex items-center gap-1"><span className="w-1 h-2 rounded-sm bg-slate-300 dark:bg-slate-600 inline-block" />Meta</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {records.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Leaf className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum indicador registrado ainda.</p>
              <button onClick={() => setModal({})} className="mt-3 text-xs text-emerald-600 hover:underline">Adicionar primeiro registro</button>
            </div>
          )}
        </div>
      )}

      {/* TABELA VIEW */}
      {view === 'tabela' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
            <select value={filtroInd} onChange={e => setFiltroInd(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400">
              <option>Todos</option>
              {allIndicadores.map(i => <option key={i}>{i}</option>)}
            </select>
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400">
              <option value="">Todos os anos</option>
              {allAnos.map(a => <option key={a}>{a}</option>)}
            </select>
            <span className="text-xs text-slate-400 self-center ml-auto">{filteredTable.length} registro(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Mês/Ano','Indicador','Realizado','Meta','% Meta','Unidade','Obs',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredTable.map(r => {
                  const p = pct(r.valor_realizado, r.meta);
                  const st = statusMeta(p);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{mesLabel(r.mes_ano)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.indicador}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{r.valor_realizado?.toLocaleString('pt-BR') ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.meta?.toLocaleString('pt-BR') ?? '—'}</td>
                      <td className="px-4 py-3">
                        {p !== null ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${p <= 100 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {p <= 100 ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            {p}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{r.unidade}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{r.observacoes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setModal(r)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTable.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal !== false && (
        <Modal rec={modal || null} onClose={() => setModal(false)} onSave={handleSave} saving={saving} />
      )}
    </div>
  );
}
