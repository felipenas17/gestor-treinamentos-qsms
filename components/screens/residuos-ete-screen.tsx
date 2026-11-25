'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Trash2, Waves, Plus, X, Pencil, RefreshCw, Loader2,
  CheckCircle2, AlertTriangle, FileText, Droplets, FlaskConical,
  ClipboardList,
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
  if (cls.includes('I —')) return 'bg-red-500/15 text-red-400 border border-red-500/30';
  if (cls.includes('II-A')) return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
  return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent';
const inputClsIndigo = 'w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-transparent';
const labelCls = 'block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-cyan-400" />
            </div>
            <h2 className="font-bold text-white text-base">{isNew ? 'Novo Registro de Resíduo' : 'Editar Resíduo'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Data de Geração</label>
              <input type="date" value={form.data_geracao ?? ''} onChange={e => set('data_geracao', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tipo de Resíduo</label>
              <select value={form.tipo_residuo ?? ''} onChange={e => set('tipo_residuo', e.target.value)} className={inputCls}>
                {TIPOS_RESIDUO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Classificação NBR 10004</label>
            <select value={form.classificacao ?? ''} onChange={e => set('classificacao', e.target.value)} className={inputCls}>
              {CLASSIFICACOES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Quantidade</label>
              <input type="number" value={form.quantidade ?? ''} onChange={e => set('quantidade', e.target.value ? Number(e.target.value) : null)} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Unidade</label>
              <select value={form.unidade ?? 'kg'} onChange={e => set('unidade', e.target.value)} className={inputCls}>
                {['kg', 't', 'L', 'm³', 'un'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Destinação</label>
              <select value={form.destinacao ?? ''} onChange={e => set('destinacao', e.target.value)} className={inputCls}>
                {DESTINACOES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Transportadora</label>
              <input value={form.transportadora ?? ''} onChange={e => set('transportadora', e.target.value)} className={inputCls} placeholder="Nome da transportadora" />
            </div>
            <div>
              <label className={labelCls}>Nº Manifesto / MTR</label>
              <input value={form.manifesto ?? ''} onChange={e => set('manifesto', e.target.value)} className={inputCls} placeholder="MTR-2026-XXXXX" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Observações</label>
            <textarea value={form.observacoes ?? ''} onChange={e => set('observacoes', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 pb-5 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isNew ? 'Salvar Registro' : 'Atualizar'}
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
      <label className={labelCls}>{label} <span className="text-slate-500 font-normal normal-case">({unit})</span></label>
      <input type="number" step="0.01" value={(form[key] as number | null) ?? ''}
        onChange={e => set(key, e.target.value ? Number(e.target.value) : null)}
        className={inputClsIndigo} placeholder="—" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="font-bold text-white text-base">{isNew ? 'Nova Coleta ETE' : 'Editar Coleta ETE'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Data da Coleta</label>
              <input type="date" value={form.data_coleta ?? ''} onChange={e => set('data_coleta', e.target.value)} className={inputClsIndigo} />
            </div>
            <div>
              <label className={labelCls}>Ponto de Coleta</label>
              <select value={form.ponto_coleta ?? ''} onChange={e => set('ponto_coleta', e.target.value)} className={inputClsIndigo}>
                {PONTOS_COLETA.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-800" />
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Parâmetros Analíticos</p>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {numField('pH', 'ph', 'adimensional')}
            {numField('DBO', 'dbo', 'mg/L')}
            {numField('DQO', 'dqo', 'mg/L')}
            {numField('Sólidos Suspensos', 'solidos_suspensos', 'mg/L')}
            {numField('Turbidez', 'turbidez', 'NTU')}
            {numField('Óleo e Graxas', 'oleo_graxas', 'mg/L')}
            {numField('Cloro Residual', 'cloro_residual', 'mg/L')}
          </div>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-800" />
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Resultado</p>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Conformidade</label>
              <select value={form.conforme === true ? 'true' : form.conforme === false ? 'false' : ''}
                onChange={e => set('conforme', e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}
                className={inputClsIndigo}>
                <option value="">Não avaliado</option>
                <option value="true">Conforme</option>
                <option value="false">Não Conforme</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>URL do Laudo</label>
              <input value={form.laudo_url ?? ''} onChange={e => set('laudo_url', e.target.value)} className={inputClsIndigo} placeholder="https://…" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Observações</label>
            <textarea value={form.observacoes ?? ''} onChange={e => set('observacoes', e.target.value)} rows={2} className={`${inputClsIndigo} resize-none`} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 pb-5 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isNew ? 'Salvar Coleta' : 'Atualizar'}
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

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-full bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm text-slate-500">Carregando dados ambientais…</p>
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-slate-950">

      {/* ── Hero Header ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 border-b border-slate-800/60">
        <div className="px-6 pt-7 pb-0">

          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-7">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shadow-lg shadow-cyan-500/5">
                <Waves className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-tight">Gestão de Resíduos / ETE</h1>
                <p className="text-xs text-slate-400 mt-0.5">ISO 14001 · CONAMA 357 / 430 · NBR 10004</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadAll}
                className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 border border-slate-700/50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              {activeTab === 'residuos' && (
                <button
                  onClick={() => setModalR({})}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-cyan-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Resíduo
                </button>
              )}
              {activeTab === 'ete' && (
                <button
                  onClick={() => setModalE({})}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Coleta ETE
                </button>
              )}
            </div>
          </div>

          {/* Tab switcher — integrated into hero bottom */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('residuos')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl transition-all ${
                activeTab === 'residuos'
                  ? 'bg-slate-950 text-cyan-400 border-t border-l border-r border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Resíduos
              {kpiResiduos.registros > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'residuos' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700 text-slate-400'}`}>
                  {kpiResiduos.registros}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('ete')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl transition-all ${
                activeTab === 'ete'
                  ? 'bg-slate-950 text-indigo-400 border-t border-l border-r border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              ETE — Efluentes
              {kpiEte.coletas > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'ete' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-400'}`}>
                  {kpiEte.coletas}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="p-6 space-y-6">

        {/* ══ RESÍDUOS TAB ══════════════════════════════════════════════════════ */}
        {activeTab === 'residuos' && (
          <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Gerado */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-500/50 rounded-t-2xl" />
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                  <Trash2 className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Total Gerado</p>
                <p className="text-2xl font-bold text-white tabular-nums">{kpiResiduos.total.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-slate-500 mt-1">kg acumulados</p>
              </div>

              {/* Registros */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-500/40 rounded-t-2xl" />
                <div className="w-9 h-9 rounded-xl bg-slate-700/60 border border-slate-600/40 flex items-center justify-center mb-4">
                  <ClipboardList className="w-4 h-4 text-slate-300" />
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Registros</p>
                <p className="text-2xl font-bold text-white tabular-nums">{kpiResiduos.registros}</p>
                <p className="text-xs text-slate-500 mt-1">lançamentos totais</p>
              </div>

              {/* Perigosos */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/50 rounded-t-2xl" />
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Perigosos</p>
                <p className={`text-2xl font-bold tabular-nums ${kpiResiduos.perigosos > 0 ? 'text-red-400' : 'text-white'}`}>
                  {kpiResiduos.perigosos}
                </p>
                <p className="text-xs text-slate-500 mt-1">Classe I — NBR 10004</p>
              </div>

              {/* Últimos 30 dias */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500/50 rounded-t-2xl" />
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <Droplets className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Últimos 30 dias</p>
                <p className="text-2xl font-bold text-white tabular-nums">{kpiResiduos.ultimos30}</p>
                <p className="text-xs text-slate-500 mt-1">registros recentes</p>
              </div>
            </div>

            {/* Resíduos Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">Classificação</span>
                  <select
                    value={filtroClass}
                    onChange={e => setFiltroClass(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                  >
                    <option>Todos</option>
                    {CLASSIFICACOES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <span className="text-xs text-slate-500 ml-auto">{filteredResiduos.length} registro(s)</span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Data', 'Tipo', 'Classificação', 'Quantidade', 'Destinação', 'Transportadora', 'MTR', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredResiduos.map(r => (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-200 font-medium tabular-nums">{fmtData(r.data_geracao)}</td>
                        <td className="px-4 py-3 text-slate-300 max-w-[140px] truncate">{r.tipo_residuo}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${classColor(r.classificacao)}`}>
                            {r.classificacao.split(' — ')[0]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-medium whitespace-nowrap tabular-nums">
                          {r.quantidade?.toLocaleString('pt-BR') ?? '—'} <span className="text-slate-500">{r.unidade}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{r.destinacao}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[100px] truncate">{r.transportadora ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{r.manifesto ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setModalR(r)}
                              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-200 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteResiduo(r.id)}
                              className="p-1.5 hover:bg-red-900/30 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredResiduos.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-14 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Trash2 className="w-8 h-8 text-slate-700" />
                            <p className="text-sm text-slate-500">Nenhum resíduo registrado.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ ETE TAB ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'ete' && (
          <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Coletas */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500/50 rounded-t-2xl" />
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <FlaskConical className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Coletas</p>
                <p className="text-2xl font-bold text-white tabular-nums">{kpiEte.coletas}</p>
                <p className="text-xs text-slate-500 mt-1">registros totais</p>
              </div>

              {/* Conformes */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500/50 rounded-t-2xl" />
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Conformes</p>
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">{kpiEte.conformes}</p>
                <p className="text-xs text-slate-500 mt-1">dentro dos limites</p>
              </div>

              {/* Não Conformes */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/50 rounded-t-2xl" />
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Não Conformes</p>
                <p className={`text-2xl font-bold tabular-nums ${(kpiEte.total - kpiEte.conformes) > 0 ? 'text-red-400' : 'text-white'}`}>
                  {kpiEte.total - kpiEte.conformes}
                </p>
                <p className="text-xs text-slate-500 mt-1">acima dos limites</p>
              </div>

              {/* % Conformidade */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl ${
                  kpiEte.pct === null ? 'bg-slate-600/40'
                  : kpiEte.pct >= 90 ? 'bg-cyan-500/50'
                  : kpiEte.pct >= 70 ? 'bg-amber-500/50'
                  : 'bg-red-500/50'
                }`} />
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                  <Waves className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Conformidade</p>
                <p className={`text-2xl font-bold tabular-nums ${
                  kpiEte.pct === null ? 'text-slate-500'
                  : kpiEte.pct >= 90 ? 'text-cyan-400'
                  : kpiEte.pct >= 70 ? 'text-amber-400'
                  : 'text-red-400'
                }`}>
                  {kpiEte.pct !== null ? `${kpiEte.pct}%` : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1">das amostras avaliadas</p>
              </div>
            </div>

            {/* Última Coleta — parâmetros */}
            {kpiEte.ultima && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 rounded-full bg-indigo-500" />
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Última Coleta
                    </p>
                    <span className="text-xs text-slate-500">·</span>
                    <p className="text-xs text-slate-400">{fmtData(kpiEte.ultima.data_coleta)}</p>
                    <span className="text-xs text-slate-500">·</span>
                    <p className="text-xs text-slate-400">{kpiEte.ultima.ponto_coleta}</p>
                  </div>
                  {kpiEte.ultima.conforme !== null && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      kpiEte.ultima.conforme
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/15 border border-red-500/30 text-red-400'
                    }`}>
                      {kpiEte.ultima.conforme
                        ? <><CheckCircle2 className="w-3 h-3" />Conforme</>
                        : <><AlertTriangle className="w-3 h-3" />Não Conforme</>
                      }
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                  {[
                    { label: 'pH',       value: kpiEte.ultima.ph,               unit: '' },
                    { label: 'DBO',      value: kpiEte.ultima.dbo,              unit: 'mg/L' },
                    { label: 'DQO',      value: kpiEte.ultima.dqo,              unit: 'mg/L' },
                    { label: 'SS',       value: kpiEte.ultima.solidos_suspensos, unit: 'mg/L' },
                    { label: 'Turbidez', value: kpiEte.ultima.turbidez,         unit: 'NTU' },
                    { label: 'Óleo/G',   value: kpiEte.ultima.oleo_graxas,      unit: 'mg/L' },
                    { label: 'Cloro',    value: kpiEte.ultima.cloro_residual,   unit: 'mg/L' },
                  ].map(p => (
                    <div key={p.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">{p.label}</p>
                      <p className="text-sm font-bold text-white tabular-nums">{p.value?.toFixed(2) ?? '—'}</p>
                      {p.unit && <p className="text-[9px] text-slate-500 mt-0.5">{p.unit}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ETE Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">Ponto</span>
                  <select
                    value={filtroPonto}
                    onChange={e => setFiltroPonto(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                  >
                    <option>Todos</option>
                    {PONTOS_COLETA.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <span className="text-xs text-slate-500 ml-auto">{filteredEte.length} coleta(s)</span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Data', 'Ponto', 'pH', 'DBO', 'DQO', 'SS', 'Turbidez', 'Óleo/G', 'Cl', 'Conf.', 'Laudo', ''].map(h => (
                        <th key={h} className="px-3 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredEte.map(r => (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-200 tabular-nums">{fmtData(r.data_coleta)}</td>
                        <td className="px-3 py-3 text-slate-400 max-w-[100px] truncate">{r.ponto_coleta}</td>
                        <td className="px-3 py-3 text-slate-200 tabular-nums">{r.ph?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-200 tabular-nums">{r.dbo?.toFixed(0) ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-200 tabular-nums">{r.dqo?.toFixed(0) ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-200 tabular-nums">{r.solidos_suspensos?.toFixed(0) ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-200 tabular-nums">{r.turbidez?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-200 tabular-nums">{r.oleo_graxas?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-200 tabular-nums">{r.cloro_residual?.toFixed(2) ?? '—'}</td>
                        <td className="px-3 py-3">
                          {r.conforme === null
                            ? <span className="text-slate-600">—</span>
                            : r.conforme
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              : <AlertTriangle className="w-4 h-4 text-red-500" />
                          }
                        </td>
                        <td className="px-3 py-3">
                          {r.laudo_url
                            ? (
                              <a href={r.laudo_url} target="_blank" rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
                                <FileText className="w-3.5 h-3.5" />Ver
                              </a>
                            ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setModalE(r)}
                              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-200 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteEte(r.id)}
                              className="p-1.5 hover:bg-red-900/30 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredEte.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-4 py-14 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <FlaskConical className="w-8 h-8 text-slate-700" />
                            <p className="text-sm text-slate-500">Nenhuma coleta ETE registrada.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modalR !== false && (
        <ResiduoModal rec={modalR || null} onClose={() => setModalR(false)} onSave={saveResiduo} saving={saving} />
      )}
      {modalE !== false && (
        <EteModal rec={modalE || null} onClose={() => setModalE(false)} onSave={saveEte} saving={saving} />
      )}
    </div>
  );
}
