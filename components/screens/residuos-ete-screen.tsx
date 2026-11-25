'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trash2, Waves, Plus, X, Pencil, RefreshCw, Loader2,
  CheckCircle2, AlertTriangle, FileText, Droplets, FlaskConical,
  ClipboardList, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Residuo {
  id: string;
  data_geracao: string;
  tipo_residuo: string;
  classificacao: string;
  quantidade: number | null;
  unidade: string;
  destinacao: string;
  transportadora: string | null;
  manifesto: string | null;
  observacoes: string | null;
  created_at: string;
}

interface EteRecord {
  id: string;
  data_coleta: string;
  ponto_coleta: string;
  ph: number | null;
  dbo: number | null;
  dqo: number | null;
  solidos_suspensos: number | null;
  turbidez: number | null;
  oleo_graxas: number | null;
  cloro_residual: number | null;
  conforme: boolean | null;
  laudo_url: string | null;
  observacoes: string | null;
  created_at: string;
}

type ActiveTab = 'residuos' | 'ete';

const CLASSIFICACOES = ['Classe I — Perigoso', 'Classe II-A — Não-Inerte', 'Classe II-B — Inerte'];
const DESTINACOES = ['Aterro Industrial', 'Aterro Sanitário', 'Incineração', 'Coprocessamento', 'Reciclagem', 'Compostagem', 'Reaproveitamento Energético', 'Reutilização'];
const TIPOS_RESIDUO = ['Resíduo Perigoso', 'Resíduo Não Perigoso', 'Resíduo Químico', 'Resíduo de Serviços de Saúde', 'Resíduo Eletroeletrônico', 'Resíduo de Construção', 'Resíduo Orgânico', 'Resíduo Reciclável'];
const PONTOS_COLETA = ['Entrada ETE', 'Saída ETE', 'Tanque de Equalização', 'Reator Biológico', 'Pós-Flotação', 'Lançamento Final'];

function fmtData(d: string) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('pt-BR');
}

function classColor(cls: string) {
  if (cls.includes('I —')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (cls.includes('II-A')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
}

// ─── Resíduo Modal ────────────────────────────────────────────────────────────

function ResiduoModal({ rec, onClose, onSave, saving }: {
  rec: Partial<Residuo> | null;
  onClose: () => void;
  onSave: (d: Partial<Residuo>) => Promise<void>;
  saving: boolean;
}) {
  const isNew = !rec?.id;
  const [form, setForm] = useState<Partial<Residuo>>({
    data_geracao: new Date().toISOString().slice(0, 10),
    tipo_residuo: 'Resíduo Não Perigoso',
    classificacao: 'Classe II-A — Não-Inerte',
    quantidade: null,
    unidade: 'kg',
    destinacao: 'Aterro Sanitário',
    transportadora: '',
    manifesto: '',
    observacoes: '',
    ...rec,
  });
  const set = (k: keyof Residuo, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">{isNew ? 'Novo Registro de Resíduo' : 'Editar Resíduo'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Data de Geração</label>
              <input type="date" value={form.data_geracao ?? ''} onChange={e => set('data_geracao', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tipo de Resíduo</label>
              <select value={form.tipo_residuo ?? ''} onChange={e => set('tipo_residuo', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
                {TIPOS_RESIDUO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Classificação NBR 10004</label>
            <select value={form.classificacao ?? ''} onChange={e => set('classificacao', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
              {CLASSIFICACOES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Quantidade</label>
              <input type="number" value={form.quantidade ?? ''} onChange={e => set('quantidade', e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Unidade</label>
              <select value={form.unidade ?? 'kg'} onChange={e => set('unidade', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
                {['kg','t','L','m³','un'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Destinação</label>
              <select value={form.destinacao ?? ''} onChange={e => set('destinacao', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40">
                {DESTINACOES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Transportadora</label>
              <input value={form.transportadora ?? ''} onChange={e => set('transportadora', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" placeholder="Nome da transportadora" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Nº Manifesto / MTR</label>
              <input value={form.manifesto ?? ''} onChange={e => set('manifesto', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40" placeholder="MTR-2026-XXXXX" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Observações</label>
            <textarea value={form.observacoes ?? ''} onChange={e => set('observacoes', e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isNew ? 'Salvar' : 'Atualizar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ETE Modal ────────────────────────────────────────────────────────────────

function EteModal({ rec, onClose, onSave, saving }: {
  rec: Partial<EteRecord> | null;
  onClose: () => void;
  onSave: (d: Partial<EteRecord>) => Promise<void>;
  saving: boolean;
}) {
  const isNew = !rec?.id;
  const [form, setForm] = useState<Partial<EteRecord>>({
    data_coleta: new Date().toISOString().slice(0, 10),
    ponto_coleta: 'Saída ETE',
    ph: null, dbo: null, dqo: null, solidos_suspensos: null,
    turbidez: null, oleo_graxas: null, cloro_residual: null,
    conforme: true,
    laudo_url: '',
    observacoes: '',
    ...rec,
  });
  const set = (k: keyof EteRecord, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const numField = (label: string, key: keyof EteRecord, unit: string) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{label} <span className="text-slate-400 font-normal">({unit})</span></label>
      <input type="number" step="0.01" value={(form[key] as number | null) ?? ''}
        onChange={e => set(key, e.target.value ? Number(e.target.value) : null)}
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" placeholder="—" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">{isNew ? 'Nova Coleta ETE' : 'Editar Coleta ETE'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Data da Coleta</label>
              <input type="date" value={form.data_coleta ?? ''} onChange={e => set('data_coleta', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Ponto de Coleta</label>
              <select value={form.ponto_coleta ?? ''} onChange={e => set('ponto_coleta', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                {PONTOS_COLETA.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parâmetros Analíticos</p>
          <div className="grid grid-cols-2 gap-4">
            {numField('pH', 'ph', 'adimensional')}
            {numField('DBO', 'dbo', 'mg/L')}
            {numField('DQO', 'dqo', 'mg/L')}
            {numField('Sólidos Suspensos', 'solidos_suspensos', 'mg/L')}
            {numField('Turbidez', 'turbidez', 'NTU')}
            {numField('Óleo e Graxas', 'oleo_graxas', 'mg/L')}
            {numField('Cloro Residual', 'cloro_residual', 'mg/L')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Conformidade</label>
              <select value={form.conforme === true ? 'true' : form.conforme === false ? 'false' : ''}
                onChange={e => set('conforme', e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                <option value="">Não avaliado</option>
                <option value="true">Conforme</option>
                <option value="false">Não Conforme</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">URL do Laudo</label>
              <input value={form.laudo_url ?? ''} onChange={e => set('laudo_url', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" placeholder="https://…" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Observações</label>
            <textarea value={form.observacoes ?? ''} onChange={e => set('observacoes', e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
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

export function ResiduosEteScreen({ onToast }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('residuos');
  const [residuos, setResiduos]   = useState<Residuo[]>([]);
  const [eteRecs, setEteRecs]     = useState<EteRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalR, setModalR]       = useState<Partial<Residuo> | null | false>(false);
  const [modalE, setModalE]       = useState<Partial<EteRecord> | null | false>(false);
  const [saving, setSaving]       = useState(false);
  const [filtroClass, setFiltroClass] = useState('Todos');
  const [filtroPonto, setFiltroPonto] = useState('Todos');

  const loadAll = useCallback(async () => {
    setLoading(true);
    if (!supabase) { setLoading(false); return; }
    const [resR, resE] = await Promise.all([
      supabase.from('residuos_registros').select('*').order('data_geracao', { ascending: false }),
      supabase.from('ete_monitoramento').select('*').order('data_coleta', { ascending: false }),
    ]);
    if (resR.error) onToast('Erro ao carregar resíduos', 'error');
    else setResiduos((resR.data ?? []) as Residuo[]);
    if (resE.error) onToast('Erro ao carregar ETE', 'error');
    else setEteRecs((resE.data ?? []) as EteRecord[]);
    setLoading(false);
  }, [onToast]);

  useState(() => { void loadAll(); return null; });

  // ── Save Resíduo ──
  const saveResiduo = async (form: Partial<Residuo>) => {
    if (!supabase) return;
    setSaving(true);
    const payload = {
      data_geracao: form.data_geracao,
      tipo_residuo: form.tipo_residuo,
      classificacao: form.classificacao,
      quantidade: form.quantidade,
      unidade: form.unidade ?? 'kg',
      destinacao: form.destinacao,
      transportadora: form.transportadora || null,
      manifesto: form.manifesto || null,
      observacoes: form.observacoes || null,
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from('residuos_registros').update(payload).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('residuos_registros').insert(payload));
    }
    setSaving(false);
    if (error) { onToast('Erro ao salvar', 'error'); return; }
    onToast(form.id ? 'Resíduo atualizado' : 'Resíduo registrado', 'success');
    setModalR(false);
    loadAll();
  };

  const deleteResiduo = async (id: string) => {
    if (!supabase || !confirm('Excluir este registro?')) return;
    const { error } = await supabase.from('residuos_registros').delete().eq('id', id);
    if (error) { onToast('Erro ao excluir', 'error'); return; }
    onToast('Registro excluído', 'success');
    loadAll();
  };

  // ── Save ETE ──
  const saveEte = async (form: Partial<EteRecord>) => {
    if (!supabase) return;
    setSaving(true);
    const payload = {
      data_coleta: form.data_coleta,
      ponto_coleta: form.ponto_coleta,
      ph: form.ph,
      dbo: form.dbo,
      dqo: form.dqo,
      solidos_suspensos: form.solidos_suspensos,
      turbidez: form.turbidez,
      oleo_graxas: form.oleo_graxas,
      cloro_residual: form.cloro_residual,
      conforme: form.conforme ?? null,
      laudo_url: form.laudo_url || null,
      observacoes: form.observacoes || null,
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from('ete_monitoramento').update(payload).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('ete_monitoramento').insert(payload));
    }
    setSaving(false);
    if (error) { onToast('Erro ao salvar', 'error'); return; }
    onToast(form.id ? 'Coleta ETE atualizada' : 'Coleta ETE salva', 'success');
    setModalE(false);
    loadAll();
  };

  const deleteEte = async (id: string) => {
    if (!supabase || !confirm('Excluir esta coleta?')) return;
    const { error } = await supabase.from('ete_monitoramento').delete().eq('id', id);
    if (error) { onToast('Erro ao excluir', 'error'); return; }
    onToast('Coleta excluída', 'success');
    loadAll();
  };

  // ── KPIs ──
  const kpiResiduos = useMemo(() => {
    const total = residuos.reduce((s, r) => s + (r.quantidade ?? 0), 0);
    const perigosos = residuos.filter(r => r.classificacao.includes('Classe I')).length;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);
    const ultimos30 = residuos.filter(r => r.data_geracao >= cutoffStr).length;
    return { total, perigosos, ultimos30, registros: residuos.length };
  }, [residuos]);

  const kpiEte = useMemo(() => {
    const conformes = eteRecs.filter(r => r.conforme === true).length;
    const total = eteRecs.filter(r => r.conforme !== null).length;
    const pct = total > 0 ? Math.round((conformes / total) * 100) : null;
    const ultima = eteRecs[0];
    return { conformes, total, pct, ultima, coletas: eteRecs.length };
  }, [eteRecs]);

  const filteredResiduos = useMemo(() => residuos.filter(r =>
    filtroClass === 'Todos' || r.classificacao === filtroClass
  ), [residuos, filtroClass]);

  const filteredEte = useMemo(() => eteRecs.filter(r =>
    filtroPonto === 'Todos' || r.ponto_coleta === filtroPonto
  ), [eteRecs, filtroPonto]);

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
            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Gestão de Resíduos / ETE</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 ml-10">ISO 14001 · CONAMA 357 / 430 · NBR 10004</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab === 'residuos' && (
            <button onClick={() => setModalR({})} className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg">
              <Plus className="w-3.5 h-3.5" />Novo Resíduo
            </button>
          )}
          {activeTab === 'ete' && (
            <button onClick={() => setModalE({})} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg">
              <Plus className="w-3.5 h-3.5" />Nova Coleta ETE
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => setActiveTab('residuos')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'residuos' ? 'border-cyan-600 text-cyan-700 dark:text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <Trash2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />Resíduos
        </button>
        <button onClick={() => setActiveTab('ete')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'ete' ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          <FlaskConical className="w-4 h-4 inline mr-1.5 -mt-0.5" />ETE — Efluentes
        </button>
      </div>

      {/* ── RESÍDUOS TAB ── */}
      {activeTab === 'residuos' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Gerado (kg)', value: kpiResiduos.total.toLocaleString('pt-BR'), icon: Trash2, color: 'cyan' },
              { label: 'Registros', value: kpiResiduos.registros.toString(), icon: ClipboardList, color: 'slate' },
              { label: 'Perigosos', value: kpiResiduos.perigosos.toString(), icon: AlertTriangle, color: 'red' },
              { label: 'Últimos 30 dias', value: kpiResiduos.ultimos30.toString(), icon: Droplets, color: 'emerald' },
            ].map(k => (
              <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className={`w-8 h-8 rounded-lg bg-${k.color}-100 dark:bg-${k.color}-900/30 flex items-center justify-center mb-3`}>
                  <k.icon className={`w-4 h-4 text-${k.color}-600 dark:text-${k.color}-400`} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
              <select value={filtroClass} onChange={e => setFiltroClass(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400">
                <option>Todos</option>
                {CLASSIFICACOES.map(c => <option key={c}>{c}</option>)}
              </select>
              <span className="text-xs text-slate-400 self-center ml-auto">{filteredResiduos.length} registro(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {['Data','Tipo','Classificação','Qtd.','Destinação','Transp.','MTR',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredResiduos.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-200 font-medium">{fmtData(r.data_geracao)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[140px] truncate">{r.tipo_residuo}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${classColor(r.classificacao)}`}>
                          {r.classificacao.split(' — ')[0]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap">{r.quantidade?.toLocaleString('pt-BR') ?? '—'} {r.unidade}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.destinacao}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-[100px] truncate">{r.transportadora ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{r.manifesto ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setModalR(r)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteResiduo(r.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredResiduos.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Nenhum resíduo registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ETE TAB ── */}
      {activeTab === 'ete' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Coletas Registradas', value: kpiEte.coletas.toString(), icon: FlaskConical, color: 'indigo' },
              { label: 'Conformes', value: kpiEte.conformes.toString(), icon: CheckCircle2, color: 'emerald' },
              { label: 'Não Conformes', value: (kpiEte.total - kpiEte.conformes).toString(), icon: AlertTriangle, color: 'red' },
              { label: '% Conformidade', value: kpiEte.pct !== null ? `${kpiEte.pct}%` : '—', icon: Waves, color: 'cyan' },
            ].map(k => (
              <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className={`w-8 h-8 rounded-lg bg-${k.color}-100 dark:bg-${k.color}-900/30 flex items-center justify-center mb-3`}>
                  <k.icon className={`w-4 h-4 text-${k.color}-600 dark:text-${k.color}-400`} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Last coleta summary */}
          {kpiEte.ultima && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Última Coleta — {fmtData(kpiEte.ultima.data_coleta)} · {kpiEte.ultima.ponto_coleta}</p>
                {kpiEte.ultima.conforme !== null && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${kpiEte.ultima.conforme ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {kpiEte.ultima.conforme ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {kpiEte.ultima.conforme ? 'Conforme' : 'Não Conforme'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
                {[
                  { label: 'pH', value: kpiEte.ultima.ph, unit: '' },
                  { label: 'DBO', value: kpiEte.ultima.dbo, unit: 'mg/L' },
                  { label: 'DQO', value: kpiEte.ultima.dqo, unit: 'mg/L' },
                  { label: 'SS', value: kpiEte.ultima.solidos_suspensos, unit: 'mg/L' },
                  { label: 'Turbidez', value: kpiEte.ultima.turbidez, unit: 'NTU' },
                  { label: 'Óleo/Grx', value: kpiEte.ultima.oleo_graxas, unit: 'mg/L' },
                  { label: 'Cloro', value: kpiEte.ultima.cloro_residual, unit: 'mg/L' },
                ].map(p => (
                  <div key={p.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">{p.label}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{p.value?.toFixed(2) ?? '—'}</p>
                    {p.unit && <p className="text-[9px] text-slate-400">{p.unit}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ETE Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
              <select value={filtroPonto} onChange={e => setFiltroPonto(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400">
                <option>Todos</option>
                {PONTOS_COLETA.map(p => <option key={p}>{p}</option>)}
              </select>
              <span className="text-xs text-slate-400 self-center ml-auto">{filteredEte.length} coleta(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {['Data','Ponto','pH','DBO','DQO','SS','Turbidez','Óleo/G','Cl','Conf.','Laudo',''].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredEte.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{fmtData(r.data_coleta)}</td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400 max-w-[100px] truncate">{r.ponto_coleta}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{r.ph?.toFixed(1) ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{r.dbo?.toFixed(0) ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{r.dqo?.toFixed(0) ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{r.solidos_suspensos?.toFixed(0) ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{r.turbidez?.toFixed(1) ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{r.oleo_graxas?.toFixed(1) ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{r.cloro_residual?.toFixed(2) ?? '—'}</td>
                      <td className="px-3 py-3">
                        {r.conforme === null ? <span className="text-slate-300">—</span> :
                          r.conforme
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <AlertTriangle className="w-4 h-4 text-red-500" />
                        }
                      </td>
                      <td className="px-3 py-3">
                        {r.laudo_url
                          ? <a href={r.laudo_url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-0.5"><FileText className="w-3.5 h-3.5" />Ver</a>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setModalE(r)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteEte(r.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEte.length === 0 && (
                    <tr><td colSpan={12} className="px-4 py-10 text-center text-slate-400">Nenhuma coleta ETE registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modalR !== false && (
        <ResiduoModal rec={modalR || null} onClose={() => setModalR(false)} onSave={saveResiduo} saving={saving} />
      )}
      {modalE !== false && (
        <EteModal rec={modalE || null} onClose={() => setModalE(false)} onSave={saveEte} saving={saving} />
      )}
    </div>
  );
}
