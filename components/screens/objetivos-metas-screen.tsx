'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Target, Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  ClipboardList, History, X, Save, Calendar, User,
  TrendingUp, AlertCircle, CheckCircle2, Clock, XCircle,
  RefreshCw,
} from 'lucide-react';

// ── Supabase ─────────────────────────────────────────────────────────────────
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Types ─────────────────────────────────────────────────────────────────────
interface ObjetivoMeta {
  id: string;
  ano: number;
  objetivo: string;
  origem_objetivo: string | null;
  item_politica_qsms: string | null;
  riscos_relacionado: string | null;
  consulta_trabalhadores: string | null;
  indicador: string | null;
  situacao_atual: string | null;
  meta: string | null;
  o_que_sera_feito: string | null;
  recursos_necessarios: string | null;
  responsavel: string | null;
  prazo: string | null;
  como_monitorado: string | null;
  frequencia: string | null;
  como_avaliado: string | null;
  integracao_processo: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ObjetivoRevisao {
  id: string;
  numero: number;
  descricao: string;
  participantes: string | null;
  data: string;
  created_at: string;
}

type Tab = 'objetivos' | 'revisoes';

const STATUS_OPTIONS = ['Em andamento', 'Concluído', 'Suspenso', 'Cancelado'];
const FREQ_OPTIONS   = ['Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'];

const STATUS_STYLE: Record<string, string> = {
  'Em andamento': 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  'Concluído':    'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  'Suspenso':     'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  'Cancelado':    'bg-red-500/15 text-red-300 border border-red-500/30',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  'Em andamento': <Clock      size={12} />,
  'Concluído':    <CheckCircle2 size={12} />,
  'Suspenso':     <AlertCircle  size={12} />,
  'Cancelado':    <XCircle      size={12} />,
};

const EMPTY_FORM: Omit<ObjetivoMeta, 'id' | 'created_at' | 'updated_at'> = {
  ano: new Date().getFullYear(),
  objetivo: '',
  origem_objetivo: '',
  item_politica_qsms: '',
  riscos_relacionado: '',
  consulta_trabalhadores: '',
  indicador: '',
  situacao_atual: '',
  meta: '',
  o_que_sera_feito: '',
  recursos_necessarios: '',
  responsavel: '',
  prazo: '',
  como_monitorado: '',
  frequencia: 'Mensal',
  como_avaliado: '',
  integracao_processo: '',
  status: 'Em andamento',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ObjetivosMetas() {
  const [supabase] = useState(() => createClient(SB_URL, SB_KEY));
  const [activeTab, setActiveTab]   = useState<Tab>('objetivos');
  const [anoFiltro, setAnoFiltro]   = useState(new Date().getFullYear());
  const [objetivos, setObjetivos]   = useState<ObjetivoMeta[]>([]);
  const [revisoes,  setRevisoes]    = useState<ObjetivoRevisao[]>([]);
  const [loading,   setLoading]     = useState(false);
  const [error,     setError]       = useState<string | null>(null);
  const [expanded,  setExpanded]    = useState<Set<string>>(new Set());

  // Modal objetivo
  const [modal, setModal] = useState<{ open: boolean; editing: ObjetivoMeta | null }>({ open: false, editing: null });
  const [form,  setForm]  = useState(EMPTY_FORM);

  // Modal revisão
  const [revModal, setRevModal] = useState<{ open: boolean; editing: ObjetivoRevisao | null }>({ open: false, editing: null });
  const [revForm,  setRevForm]  = useState({ descricao: '', participantes: '', data: new Date().toISOString().split('T')[0] });

  // ── Load ──────────────────────────────────────────────────────────────────
  async function loadAll(ano = anoFiltro) {
    setLoading(true);
    setError(null);
    try {
      const [obj, rev] = await Promise.all([
        supabase.from('objetivos_metas').select('*').eq('ano', ano).order('created_at'),
        supabase.from('objetivos_revisoes').select('*').order('numero', { ascending: false }),
      ]);
      if (obj.error) throw obj.error;
      if (rev.error) throw rev.error;
      setObjetivos(obj.data ?? []);
      setRevisoes(rev.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  // Initial load — avoids react-hooks/set-state-in-effect
  useState(() => { void loadAll(); return null; });

  // ── Auto-revisão ──────────────────────────────────────────────────────────
  async function createAutoRevision(descricao: string) {
    const { data } = await supabase
      .from('objetivos_revisoes')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNum = ((data?.numero ?? -1) as number) + 1;
    await supabase.from('objetivos_revisoes').insert({
      numero: nextNum,
      descricao,
      data: new Date().toISOString().split('T')[0],
    });
  }

  // ── Objetivo CRUD ─────────────────────────────────────────────────────────
  function openNew() {
    setForm({ ...EMPTY_FORM, ano: anoFiltro });
    setModal({ open: true, editing: null });
  }

  function openEdit(obj: ObjetivoMeta) {
    setForm({
      ano: obj.ano,
      objetivo: obj.objetivo,
      origem_objetivo: obj.origem_objetivo ?? '',
      item_politica_qsms: obj.item_politica_qsms ?? '',
      riscos_relacionado: obj.riscos_relacionado ?? '',
      consulta_trabalhadores: obj.consulta_trabalhadores ?? '',
      indicador: obj.indicador ?? '',
      situacao_atual: obj.situacao_atual ?? '',
      meta: obj.meta ?? '',
      o_que_sera_feito: obj.o_que_sera_feito ?? '',
      recursos_necessarios: obj.recursos_necessarios ?? '',
      responsavel: obj.responsavel ?? '',
      prazo: obj.prazo ?? '',
      como_monitorado: obj.como_monitorado ?? '',
      frequencia: obj.frequencia ?? 'Mensal',
      como_avaliado: obj.como_avaliado ?? '',
      integracao_processo: obj.integracao_processo ?? '',
      status: obj.status,
    });
    setModal({ open: true, editing: obj });
  }

  async function saveObjetivo() {
    if (!form.objetivo.trim()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        origem_objetivo:        form.origem_objetivo?.trim()        || null,
        item_politica_qsms:     form.item_politica_qsms?.trim()     || null,
        riscos_relacionado:     form.riscos_relacionado?.trim()      || null,
        consulta_trabalhadores: form.consulta_trabalhadores?.trim()  || null,
        indicador:              form.indicador?.trim()               || null,
        situacao_atual:         form.situacao_atual?.trim()          || null,
        meta:                   form.meta?.trim()                    || null,
        o_que_sera_feito:       form.o_que_sera_feito?.trim()        || null,
        recursos_necessarios:   form.recursos_necessarios?.trim()    || null,
        responsavel:            form.responsavel?.trim()             || null,
        prazo:                  form.prazo                           || null,
        como_monitorado:        form.como_monitorado?.trim()         || null,
        frequencia:             form.frequencia                      || null,
        como_avaliado:          form.como_avaliado?.trim()           || null,
        integracao_processo:    form.integracao_processo?.trim()     || null,
      };
      if (modal.editing) {
        const { error: err } = await supabase.from('objetivos_metas').update(payload).eq('id', modal.editing.id);
        if (err) throw err;
        await createAutoRevision(`Atualização de Objetivo — ${form.objetivo.substring(0, 60)}`);
      } else {
        const { error: err } = await supabase.from('objetivos_metas').insert(payload);
        if (err) throw err;
        await createAutoRevision(`Novo Objetivo — ${form.objetivo.substring(0, 60)}`);
      }
      setModal({ open: false, editing: null });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
      setLoading(false);
    }
  }

  async function deleteObjetivo(obj: ObjetivoMeta) {
    if (!window.confirm('Excluir este objetivo?')) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.from('objetivos_metas').delete().eq('id', obj.id);
      if (err) throw err;
      await createAutoRevision(`Exclusão de Objetivo — ${obj.objetivo.substring(0, 60)}`);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir');
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Revisão CRUD ──────────────────────────────────────────────────────────
  function openNewRev() {
    setRevForm({ descricao: '', participantes: '', data: new Date().toISOString().split('T')[0] });
    setRevModal({ open: true, editing: null });
  }

  function openEditRev(r: ObjetivoRevisao) {
    setRevForm({ descricao: r.descricao, participantes: r.participantes ?? '', data: r.data });
    setRevModal({ open: true, editing: r });
  }

  async function saveRevisao() {
    if (!revForm.descricao.trim()) return;
    setLoading(true);
    try {
      if (revModal.editing) {
        const { error: err } = await supabase.from('objetivos_revisoes').update({
          descricao: revForm.descricao.trim(),
          participantes: revForm.participantes.trim() || null,
          data: revForm.data,
        }).eq('id', revModal.editing.id);
        if (err) throw err;
      } else {
        const { data: maxData } = await supabase
          .from('objetivos_revisoes')
          .select('numero')
          .order('numero', { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextNum = ((maxData?.numero ?? -1) as number) + 1;
        const { error: err } = await supabase.from('objetivos_revisoes').insert({
          numero: nextNum,
          descricao: revForm.descricao.trim(),
          participantes: revForm.participantes.trim() || null,
          data: revForm.data,
        });
        if (err) throw err;
      }
      setRevModal({ open: false, editing: null });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar revisão');
      setLoading(false);
    }
  }

  async function deleteRevisao(id: string) {
    if (!window.confirm('Remover esta revisão?')) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.from('objetivos_revisoes').delete().eq('id', id);
      if (err) throw err;
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
      setLoading(false);
    }
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiTotal      = objetivos.length;
  const kpiAndamento  = objetivos.filter(o => o.status === 'Em andamento').length;
  const kpiConcluido  = objetivos.filter(o => o.status === 'Concluído').length;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function fmtDate(d: string | null) {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  function Field({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
        <p className="text-sm text-slate-200 mt-0.5 whitespace-pre-wrap">{value}</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
              <Target size={20} className="text-teal-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-100">Objetivos e Metas</h1>
              <p className="text-xs text-slate-500">SGI — Planejamento e Monitoramento</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={anoFiltro}
              onChange={e => { const a = Number(e.target.value); setAnoFiltro(a); void loadAll(a); }}
              className="bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm text-slate-200"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {activeTab === 'objetivos' && (
              <button
                onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors"
              >
                <Plus size={15} /> Novo Objetivo
              </button>
            )}
            {activeTab === 'revisoes' && (
              <button
                onClick={openNewRev}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
              >
                <Plus size={15} /> Nova Revisão
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {([
            { id: 'objetivos', label: 'Objetivos',  icon: ClipboardList },
            { id: 'revisoes',  label: 'Revisões',   icon: History       },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <t.icon size={14} />
              {t.label}
              {t.id === 'objetivos' && kpiTotal > 0 && (
                <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">{kpiTotal}</span>
              )}
              {t.id === 'revisoes' && revisoes.length > 0 && (
                <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">{revisoes.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={15} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <RefreshCw size={18} className="text-slate-500 animate-spin" />
        </div>
      )}

      {/* ── Tab: Objetivos ── */}
      {!loading && activeTab === 'objetivos' && (
        <div className="p-6 space-y-4">

          {/* KPI row */}
          {kpiTotal > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-2">
              {[
                { label: 'Total', value: kpiTotal,     color: 'text-slate-200' },
                { label: 'Em andamento', value: kpiAndamento, color: 'text-blue-300' },
                { label: 'Concluídos',   value: kpiConcluido, color: 'text-emerald-300' },
              ].map(k => (
                <div key={k.label} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{k.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {objetivos.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <Target size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum objetivo cadastrado para {anoFiltro}</p>
              <p className="text-xs mt-1 text-slate-700">Clique em &quot;Novo Objetivo&quot; para começar</p>
            </div>
          )}

          {/* List */}
          {objetivos.map(obj => {
            const isOpen = expanded.has(obj.id);
            return (
              <div key={obj.id} className="bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden">
                {/* Card header */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => toggleExpand(obj.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[obj.status] ?? STATUS_STYLE['Em andamento']}`}>
                        {STATUS_ICON[obj.status]} {obj.status}
                      </span>
                      {obj.frequencia && (
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{obj.frequencia}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-100 leading-snug">{obj.objetivo}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                      {obj.responsavel && <span className="flex items-center gap-1"><User size={11} />{obj.responsavel}</span>}
                      {obj.prazo       && <span className="flex items-center gap-1"><Calendar size={11} />Prazo: {fmtDate(obj.prazo)}</span>}
                      {obj.indicador   && <span className="flex items-center gap-1"><TrendingUp size={11} />{obj.indicador}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(obj); }}
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteObjetivo(obj); }}
                      className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                    {isOpen ? <ChevronUp size={16} className="text-slate-500 ml-1" /> : <ChevronDown size={16} className="text-slate-500 ml-1" />}
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-slate-800/60 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/40">
                    <Field label="Origem do Objetivo"       value={obj.origem_objetivo} />
                    <Field label="Item da Política de QSMS" value={obj.item_politica_qsms} />
                    <Field label="Riscos / Oportunidades"   value={obj.riscos_relacionado} />
                    <Field label="Consulta aos Trabalhadores (Evidência)" value={obj.consulta_trabalhadores} />
                    <Field label="Indicador"                value={obj.indicador} />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Situação Atual"         value={obj.situacao_atual} />
                      <Field label="Meta"                   value={obj.meta} />
                    </div>
                    <Field label="O que será feito?"        value={obj.o_que_sera_feito} />
                    <Field label="Recursos Necessários"     value={obj.recursos_necessarios} />
                    <Field label="Responsável"              value={obj.responsavel} />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Prazo"                  value={fmtDate(obj.prazo)} />
                      <Field label="Frequência"             value={obj.frequencia} />
                    </div>
                    <Field label="Como será Monitorado?"    value={obj.como_monitorado} />
                    <Field label="Como será Avaliado?"      value={obj.como_avaliado} />
                    <Field label="Integração ao Processo"   value={obj.integracao_processo} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Revisões ── */}
      {!loading && activeTab === 'revisoes' && (
        <div className="p-6 space-y-3">
          {revisoes.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <History size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma revisão registrada</p>
            </div>
          )}
          {revisoes.map(r => (
            <div key={r.id} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-xs font-bold text-teal-400">
                  {r.numero}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">{r.descricao}</p>
                  {r.participantes && (
                    <p className="text-xs text-slate-500 mt-1">Participantes: {r.participantes}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-1">{fmtDate(r.data)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditRev(r)}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => deleteRevisao(r.id)}
                    className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Objetivo ── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-teal-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {modal.editing ? 'Editar Objetivo' : 'Novo Objetivo'}
                </h2>
              </div>
              <button onClick={() => setModal({ open: false, editing: null })} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">

              {/* Ano + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ano</label>
                  <select
                    value={form.ano}
                    onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Objetivo */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Objetivo <span className="text-red-400">*</span></label>
                <textarea
                  rows={3}
                  value={form.objetivo}
                  onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))}
                  placeholder="Descreva o objetivo..."
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Origem do Objetivo</label>
                  <input
                    type="text"
                    value={form.origem_objetivo ?? ''}
                    onChange={e => setForm(f => ({ ...f, origem_objetivo: e.target.value }))}
                    placeholder="Ex: CIPA, Auditoria..."
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Item da Política de QSMS</label>
                  <input
                    type="text"
                    value={form.item_politica_qsms ?? ''}
                    onChange={e => setForm(f => ({ ...f, item_politica_qsms: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Riscos / Oportunidades Relacionados</label>
                <textarea
                  rows={2}
                  value={form.riscos_relacionado ?? ''}
                  onChange={e => setForm(f => ({ ...f, riscos_relacionado: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Consulta aos Trabalhadores (Evidência)</label>
                <input
                  type="text"
                  value={form.consulta_trabalhadores ?? ''}
                  onChange={e => setForm(f => ({ ...f, consulta_trabalhadores: e.target.value }))}
                  placeholder="Ex: Reunião da CIPA 03/2026"
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Indicador</label>
                  <input
                    type="text"
                    value={form.indicador ?? ''}
                    onChange={e => setForm(f => ({ ...f, indicador: e.target.value }))}
                    placeholder="Ex: Taxa de frequência de acidentes"
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Situação Atual</label>
                  <input
                    type="text"
                    value={form.situacao_atual ?? ''}
                    onChange={e => setForm(f => ({ ...f, situacao_atual: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Meta</label>
                <input
                  type="text"
                  value={form.meta ?? ''}
                  onChange={e => setForm(f => ({ ...f, meta: e.target.value }))}
                  placeholder="Ex: 0 acidentes / ano"
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">O que será feito?</label>
                <textarea
                  rows={3}
                  value={form.o_que_sera_feito ?? ''}
                  onChange={e => setForm(f => ({ ...f, o_que_sera_feito: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Recursos Necessários</label>
                <textarea
                  rows={2}
                  value={form.recursos_necessarios ?? ''}
                  onChange={e => setForm(f => ({ ...f, recursos_necessarios: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Responsável</label>
                  <input
                    type="text"
                    value={form.responsavel ?? ''}
                    onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Prazo</label>
                  <input
                    type="date"
                    value={form.prazo ?? ''}
                    onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Como será Monitorado?</label>
                <textarea
                  rows={2}
                  value={form.como_monitorado ?? ''}
                  onChange={e => setForm(f => ({ ...f, como_monitorado: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Frequência</label>
                  <select
                    value={form.frequencia ?? 'Mensal'}
                    onChange={e => setForm(f => ({ ...f, frequencia: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    {FREQ_OPTIONS.map(fr => <option key={fr} value={fr}>{fr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Como será Avaliado?</label>
                  <input
                    type="text"
                    value={form.como_avaliado ?? ''}
                    onChange={e => setForm(f => ({ ...f, como_avaliado: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Integração ao Processo</label>
                <input
                  type="text"
                  value={form.integracao_processo ?? ''}
                  onChange={e => setForm(f => ({ ...f, integracao_processo: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-800/60">
              <button
                onClick={() => setModal({ open: false, editing: null })}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveObjetivo}
                disabled={loading || !form.objetivo.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white transition-colors"
              >
                <Save size={14} /> {modal.editing ? 'Salvar Alterações' : 'Criar Objetivo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Revisão ── */}
      {revModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <History size={16} className="text-teal-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {revModal.editing ? 'Editar Revisão' : 'Nova Revisão'}
                </h2>
              </div>
              <button onClick={() => setRevModal({ open: false, editing: null })} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Descrição <span className="text-red-400">*</span></label>
                <textarea
                  rows={3}
                  value={revForm.descricao}
                  onChange={e => setRevForm(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Participantes</label>
                <input
                  type="text"
                  value={revForm.participantes}
                  onChange={e => setRevForm(f => ({ ...f, participantes: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Data</label>
                <input
                  type="date"
                  value={revForm.data}
                  onChange={e => setRevForm(f => ({ ...f, data: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-800/60">
              <button
                onClick={() => setRevModal({ open: false, editing: null })}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveRevisao}
                disabled={loading || !revForm.descricao.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white transition-colors"
              >
                <Save size={14} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
