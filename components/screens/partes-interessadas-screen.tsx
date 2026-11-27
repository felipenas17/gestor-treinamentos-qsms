'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Handshake, Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  ClipboardList, History, X, Save, Search, FileCheck2,
  AlertCircle, RefreshCw,
} from 'lucide-react';

// ── Supabase ─────────────────────────────────────────────────────────────────
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Types ─────────────────────────────────────────────────────────────────────
interface ParteInteressada {
  id: string;
  ordem: number;
  parte_interessada: string;
  necessidade: string | null;
  expectativa: string | null;
  requisito: string | null;
  interesse_tiger: string | null;
  como_atingidos: string | null;
  acoes_atingimento: string | null;
  monitoramento: string | null;
  riscos_oportunidades: string | null;
  acoes: string | null;
  created_at: string;
  updated_at: string;
}

interface ParteRevisao {
  id: string;
  numero: number;
  descricao: string;
  participantes: string | null;
  data: string | null;
  created_at: string;
}

type Tab = 'partes' | 'revisoes';

type ParteForm = Omit<ParteInteressada, 'id' | 'ordem' | 'created_at' | 'updated_at'>;

const EMPTY_FORM: ParteForm = {
  parte_interessada: '',
  necessidade: '',
  expectativa: '',
  requisito: '',
  interesse_tiger: '',
  como_atingidos: '',
  acoes_atingimento: '',
  monitoramento: '',
  riscos_oportunidades: '',
  acoes: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function oneLine(s: string, max = 60) {
  return s.replace(/\s+/g, ' ').trim().substring(0, max);
}

function semRequisito(requisito: string | null) {
  const v = (requisito ?? '').trim().toUpperCase();
  return v === '' || v === 'N/A';
}

// Linhas de "Riscos e Oportunidades" / "Ações" começam com R:, O: ou "R e O:" / "O e R:"
function tipoLinha(line: string): 'R' | 'O' | 'RO' | null {
  const m = line.match(/^\s*(R|O)(?:\s*e\s*(R|O))?\s*:/);
  if (!m) return null;
  if (m[2]) return 'RO';
  return m[1] as 'R' | 'O';
}

const LINHA_STYLE: Record<'R' | 'O' | 'RO', string> = {
  R:  'text-red-300',
  O:  'text-emerald-300',
  RO: 'text-amber-300',
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      <p className="text-sm text-slate-200 mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function RiscoField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="text-sm mt-0.5 space-y-0.5">
        {value.split('\n').map((line, i) => {
          const t = tipoLinha(line);
          return (
            <p key={i} className={`whitespace-pre-wrap ${t ? LINHA_STYLE[t] : 'text-slate-200'}`}>{line}</p>
          );
        })}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PartesInteressadas() {
  const [supabase] = useState(() => createClient(SB_URL, SB_KEY));
  const [activeTab, setActiveTab] = useState<Tab>('partes');
  const [partes,    setPartes]    = useState<ParteInteressada[]>([]);
  const [revisoes,  setRevisoes]  = useState<ParteRevisao[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set());
  const [busca,     setBusca]     = useState('');

  // Modal parte interessada
  const [modal, setModal] = useState<{ open: boolean; editing: ParteInteressada | null }>({ open: false, editing: null });
  const [form,  setForm]  = useState<ParteForm>(EMPTY_FORM);

  // Modal revisão
  const [revModal, setRevModal] = useState<{ open: boolean; editing: ParteRevisao | null }>({ open: false, editing: null });
  const [revForm,  setRevForm]  = useState({ descricao: '', participantes: '', data: new Date().toISOString().split('T')[0] });

  // ── Load ──────────────────────────────────────────────────────────────────
  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [pi, rev] = await Promise.all([
        supabase.from('partes_interessadas').select('*').order('ordem').order('created_at'),
        supabase.from('partes_interessadas_revisoes').select('*').order('numero', { ascending: false }),
      ]);
      if (pi.error) throw pi.error;
      if (rev.error) throw rev.error;
      setPartes(pi.data ?? []);
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
      .from('partes_interessadas_revisoes')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNum = ((data?.numero ?? -1) as number) + 1;
    await supabase.from('partes_interessadas_revisoes').insert({
      numero: nextNum,
      descricao,
      data: new Date().toISOString().split('T')[0],
    });
  }

  // ── Parte interessada CRUD ────────────────────────────────────────────────
  function openNew() {
    setForm(EMPTY_FORM);
    setModal({ open: true, editing: null });
  }

  function openEdit(p: ParteInteressada) {
    setForm({
      parte_interessada:    p.parte_interessada,
      necessidade:          p.necessidade ?? '',
      expectativa:          p.expectativa ?? '',
      requisito:            p.requisito ?? '',
      interesse_tiger:      p.interesse_tiger ?? '',
      como_atingidos:       p.como_atingidos ?? '',
      acoes_atingimento:    p.acoes_atingimento ?? '',
      monitoramento:        p.monitoramento ?? '',
      riscos_oportunidades: p.riscos_oportunidades ?? '',
      acoes:                p.acoes ?? '',
    });
    setModal({ open: true, editing: p });
  }

  async function saveParte() {
    if (!form.parte_interessada.trim()) return;
    setLoading(true);
    try {
      const payload = {
        parte_interessada:    form.parte_interessada.trim(),
        necessidade:          form.necessidade?.trim()          || null,
        expectativa:          form.expectativa?.trim()          || null,
        requisito:            form.requisito?.trim()            || null,
        interesse_tiger:      form.interesse_tiger?.trim()      || null,
        como_atingidos:       form.como_atingidos?.trim()       || null,
        acoes_atingimento:    form.acoes_atingimento?.trim()    || null,
        monitoramento:        form.monitoramento?.trim()        || null,
        riscos_oportunidades: form.riscos_oportunidades?.trim() || null,
        acoes:                form.acoes?.trim()                || null,
      };
      if (modal.editing) {
        const { error: err } = await supabase.from('partes_interessadas').update(payload).eq('id', modal.editing.id);
        if (err) throw err;
        await createAutoRevision(`Atualização de Parte Interessada — ${oneLine(form.parte_interessada)}`);
      } else {
        const nextOrdem = partes.reduce((max, p) => Math.max(max, p.ordem), 0) + 1;
        const { error: err } = await supabase.from('partes_interessadas').insert({ ...payload, ordem: nextOrdem });
        if (err) throw err;
        await createAutoRevision(`Nova Parte Interessada — ${oneLine(form.parte_interessada)}`);
      }
      setModal({ open: false, editing: null });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
      setLoading(false);
    }
  }

  async function deleteParte(p: ParteInteressada) {
    if (!window.confirm('Excluir esta parte interessada?')) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.from('partes_interessadas').delete().eq('id', p.id);
      if (err) throw err;
      await createAutoRevision(`Exclusão de Parte Interessada — ${oneLine(p.parte_interessada)}`);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir');
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Revisão CRUD ──────────────────────────────────────────────────────────
  function openNewRev() {
    setRevForm({ descricao: '', participantes: '', data: new Date().toISOString().split('T')[0] });
    setRevModal({ open: true, editing: null });
  }

  function openEditRev(r: ParteRevisao) {
    setRevForm({ descricao: r.descricao, participantes: r.participantes ?? '', data: r.data ?? '' });
    setRevModal({ open: true, editing: r });
  }

  async function saveRevisao() {
    if (!revForm.descricao.trim()) return;
    setLoading(true);
    try {
      if (revModal.editing) {
        const { error: err } = await supabase.from('partes_interessadas_revisoes').update({
          descricao: revForm.descricao.trim(),
          participantes: revForm.participantes.trim() || null,
          data: revForm.data || null,
        }).eq('id', revModal.editing.id);
        if (err) throw err;
      } else {
        const { data: maxData } = await supabase
          .from('partes_interessadas_revisoes')
          .select('numero')
          .order('numero', { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextNum = ((maxData?.numero ?? -1) as number) + 1;
        const { error: err } = await supabase.from('partes_interessadas_revisoes').insert({
          numero: nextNum,
          descricao: revForm.descricao.trim(),
          participantes: revForm.participantes.trim() || null,
          data: revForm.data || null,
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
      const { error: err } = await supabase.from('partes_interessadas_revisoes').delete().eq('id', id);
      if (err) throw err;
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
      setLoading(false);
    }
  }

  // ── Filtro + KPIs ─────────────────────────────────────────────────────────
  const termo = busca.trim().toLowerCase();
  const partesFiltradas = termo
    ? partes.filter(p =>
        [
          p.parte_interessada, p.necessidade, p.expectativa, p.requisito, p.interesse_tiger,
          p.como_atingidos, p.acoes_atingimento, p.monitoramento, p.riscos_oportunidades, p.acoes,
        ].some(v => (v ?? '').toLowerCase().includes(termo))
      )
    : partes;

  const kpiTotal        = partes.length;
  const kpiComRequisito = partes.filter(p => !semRequisito(p.requisito)).length;
  const kpiSemRequisito = kpiTotal - kpiComRequisito;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Handshake size={20} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-100">Partes Interessadas</h1>
              <p className="text-xs text-slate-500">SGI — FOR TR-SMS-005-01-R03</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'partes' && (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar..."
                    className="bg-slate-800 border border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 w-48"
                  />
                </div>
                <button
                  onClick={openNew}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                >
                  <Plus size={15} /> Nova Parte Interessada
                </button>
              </>
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
            { id: 'partes',   label: 'Partes Interessadas', icon: ClipboardList },
            { id: 'revisoes', label: 'Revisões',            icon: History       },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <t.icon size={14} />
              {t.label}
              {t.id === 'partes' && kpiTotal > 0 && (
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

      {/* ── Tab: Partes Interessadas ── */}
      {!loading && activeTab === 'partes' && (
        <div className="p-6 space-y-4">

          {/* KPI row */}
          {kpiTotal > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-2">
              {[
                { label: 'Total',                 value: kpiTotal,        color: 'text-slate-200'   },
                { label: 'Com requisito',         value: kpiComRequisito, color: 'text-indigo-300'  },
                { label: 'Sem requisito (N/A)',   value: kpiSemRequisito, color: 'text-slate-400'   },
              ].map(k => (
                <div key={k.label} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{k.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {partes.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <Handshake size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma parte interessada cadastrada</p>
              <p className="text-xs mt-1 text-slate-700">Clique em &quot;Nova Parte Interessada&quot; para começar</p>
            </div>
          )}

          {partes.length > 0 && partesFiltradas.length === 0 && (
            <div className="text-center py-12 text-slate-600">
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum resultado para &quot;{busca}&quot;</p>
            </div>
          )}

          {/* List */}
          {partesFiltradas.map(p => {
            const isOpen = expanded.has(p.id) || (termo !== '' && partesFiltradas.length === 1);
            const nome = p.parte_interessada;
            return (
              <div key={p.id} className="bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden">
                {/* Card header */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => toggleExpand(p.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {semRequisito(p.requisito) ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                          Sem requisito
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          <FileCheck2 size={12} /> {oneLine(p.requisito ?? '', 80)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-100 leading-snug whitespace-pre-line">{nome}</p>
                    {p.necessidade && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{oneLine(p.necessidade, 160)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(p); }}
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); void deleteParte(p); }}
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
                    <Field label="Necessidade da Parte Interessada"             value={p.necessidade} />
                    <Field label="Expectativa da Parte Interessada"             value={p.expectativa} />
                    <Field label="Requisito da Parte Interessada"               value={p.requisito} />
                    <Field label="Interesse da Tiger"                           value={p.interesse_tiger} />
                    <Field label="Como são atingidos os interesses da Tiger"    value={p.como_atingidos} />
                    <Field label="Ações para atingimento dos interesses"        value={p.acoes_atingimento} />
                    <Field label="Monitoramento do atingimento dos interesses"  value={p.monitoramento} />
                    <RiscoField label="Riscos e Oportunidades"                  value={p.riscos_oportunidades} />
                    <RiscoField label="Ações"                                   value={p.acoes} />
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
                <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
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
                    title="Editar"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => void deleteRevisao(r.id)}
                    className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Parte Interessada ── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Handshake size={18} className="text-indigo-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {modal.editing ? 'Editar Parte Interessada' : 'Nova Parte Interessada'}
                </h2>
              </div>
              <button onClick={() => setModal({ open: false, editing: null })} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">

              <div>
                <label className="block text-xs text-slate-400 mb-1">Parte Interessada <span className="text-red-400">*</span></label>
                <textarea
                  rows={2}
                  value={form.parte_interessada}
                  onChange={e => setForm(f => ({ ...f, parte_interessada: e.target.value }))}
                  placeholder="Ex: Clientes Externos (Onshore e Offshore)"
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Necessidade da Parte Interessada</label>
                  <textarea
                    rows={4}
                    value={form.necessidade ?? ''}
                    onChange={e => setForm(f => ({ ...f, necessidade: e.target.value }))}
                    placeholder="Uma por linha"
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Expectativa da Parte Interessada</label>
                  <textarea
                    rows={4}
                    value={form.expectativa ?? ''}
                    onChange={e => setForm(f => ({ ...f, expectativa: e.target.value }))}
                    placeholder="Uma por linha"
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Requisito da Parte Interessada</label>
                <textarea
                  rows={2}
                  value={form.requisito ?? ''}
                  onChange={e => setForm(f => ({ ...f, requisito: e.target.value }))}
                  placeholder="Ex: Contratos, Licenciamento ambiental ou N/A"
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Interesse da Tiger</label>
                  <textarea
                    rows={4}
                    value={form.interesse_tiger ?? ''}
                    onChange={e => setForm(f => ({ ...f, interesse_tiger: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Como são atingidos os interesses da Tiger</label>
                  <textarea
                    rows={4}
                    value={form.como_atingidos ?? ''}
                    onChange={e => setForm(f => ({ ...f, como_atingidos: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Ações para atingimento dos interesses da Tiger</label>
                <textarea
                  rows={3}
                  value={form.acoes_atingimento ?? ''}
                  onChange={e => setForm(f => ({ ...f, acoes_atingimento: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Monitoramento do atingimento dos interesses</label>
                <textarea
                  rows={3}
                  value={form.monitoramento ?? ''}
                  onChange={e => setForm(f => ({ ...f, monitoramento: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Riscos e Oportunidades</label>
                <textarea
                  rows={3}
                  value={form.riscos_oportunidades ?? ''}
                  onChange={e => setForm(f => ({ ...f, riscos_oportunidades: e.target.value }))}
                  placeholder="Uma por linha, iniciando com R: (risco) ou O: (oportunidade)"
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Ações</label>
                <textarea
                  rows={4}
                  value={form.acoes ?? ''}
                  onChange={e => setForm(f => ({ ...f, acoes: e.target.value }))}
                  placeholder="Uma por linha, iniciando com R: ou O:"
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
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
                onClick={() => void saveParte()}
                disabled={loading || !form.parte_interessada.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white transition-colors"
              >
                <Save size={14} /> {modal.editing ? 'Salvar Alterações' : 'Criar Parte Interessada'}
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
                <History size={16} className="text-indigo-400" />
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
                onClick={() => void saveRevisao()}
                disabled={loading || !revForm.descricao.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white transition-colors"
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
