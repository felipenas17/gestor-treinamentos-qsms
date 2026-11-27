'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Scale, Plus, Edit2, Trash2, X, Save, FileText, ExternalLink,
  Upload, AlertCircle, RefreshCw, MapPin, CalendarDays, Layers,
} from 'lucide-react';

// ── Supabase ─────────────────────────────────────────────────────────────────
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = 'grl-relatorios';
const MAX_BYTES = 50 * 1024 * 1024; // limite do bucket

// ── Types ─────────────────────────────────────────────────────────────────────
interface GrlRelatorio {
  id: string;
  ano: number;
  tipo: string;
  unidade: string | null;
  titulo: string;
  data_relatorio: string;
  arquivo_url: string;
  arquivo_nome: string | null;
  tamanho_bytes: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

const TIPOS = ['Implantação', 'Revisão', 'Auditoria de Requisitos'];
const UNIDADES = ['Macaé', 'Rio das Ostras', 'Macaé e Rio das Ostras'];

const TITULO_PADRAO: Record<string, string> = {
  'Implantação':             'Relatório de Implantação do Gerenciamento de Requisitos Legais - GRL',
  'Revisão':                 'Relatório de Revisão do Gerenciamento de Requisitos Legais - GRL',
  'Auditoria de Requisitos': 'Auditoria de Requisitos Legais',
};

const TIPO_STYLE: Record<string, string> = {
  'Implantação':             'bg-violet-500/15 text-violet-300 border border-violet-500/30',
  'Revisão':                 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  'Auditoria de Requisitos': 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
};

interface FormState {
  ano: number;
  tipo: string;
  unidade: string;
  titulo: string;
  data_relatorio: string;
  observacoes: string;
}

function hoje() {
  return new Date().toISOString().split('T')[0];
}

function emptyForm(): FormState {
  const d = hoje();
  return {
    ano: Number(d.slice(0, 4)),
    tipo: 'Revisão',
    unidade: '',
    titulo: TITULO_PADRAO['Revisão'],
    data_relatorio: d,
    observacoes: '',
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function fmtSize(bytes: number | null) {
  if (!bytes) return null;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function safeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

function PdfButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-200 text-xs font-medium transition-colors"
    >
      <ExternalLink size={13} /> Abrir PDF
    </a>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GrlRelatorios() {
  const [supabase] = useState(() => createClient(SB_URL, SB_KEY));
  const [relatorios, setRelatorios] = useState<GrlRelatorio[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const [modal, setModal] = useState<{ open: boolean; editing: GrlRelatorio | null }>({ open: false, editing: null });
  const [form,  setForm]  = useState<FormState>(emptyForm);
  const [file,  setFile]  = useState<File | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('grl_relatorios')
        .select('*')
        .order('data_relatorio', { ascending: false })
        .order('created_at', { ascending: false });
      if (err) throw err;
      setRelatorios(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  }

  // Initial load — avoids react-hooks/set-state-in-effect
  useState(() => { void loadAll(); return null; });

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openNew() {
    setForm(emptyForm());
    setFile(null);
    setModal({ open: true, editing: null });
  }

  function openEdit(r: GrlRelatorio) {
    setForm({
      ano: r.ano,
      tipo: r.tipo,
      unidade: r.unidade ?? '',
      titulo: r.titulo,
      data_relatorio: r.data_relatorio,
      observacoes: r.observacoes ?? '',
    });
    setFile(null);
    setModal({ open: true, editing: r });
  }

  function closeModal() {
    if (saving) return;
    setModal({ open: false, editing: null });
    setFile(null);
  }

  function changeTipo(tipo: string) {
    setForm(f => {
      const tituloEhPadrao = !f.titulo.trim() || Object.values(TITULO_PADRAO).includes(f.titulo);
      return { ...f, tipo, titulo: tituloEhPadrao ? (TITULO_PADRAO[tipo] ?? f.titulo) : f.titulo };
    });
  }

  function changeData(data: string) {
    setForm(f => ({ ...f, data_relatorio: data, ano: data ? Number(data.slice(0, 4)) : f.ano }));
  }

  function pickFile(f: File | null) {
    if (!f) { setFile(null); return; }
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) { setError('Envie o relatório em PDF.'); return; }
    if (f.size > MAX_BYTES) { setError('Arquivo maior que 50 MB.'); return; }
    setError(null);
    setFile(f);
  }

  // ── Save / Delete ─────────────────────────────────────────────────────────
  async function saveRelatorio() {
    if (!form.titulo.trim() || !form.data_relatorio) return;
    if (!modal.editing && !file) { setError('Anexe o PDF do relatório.'); return; }
    setSaving(true);
    setError(null);
    try {
      let arquivo_url = modal.editing?.arquivo_url ?? '';
      let arquivo_nome = modal.editing?.arquivo_nome ?? null;
      let tamanho_bytes = modal.editing?.tamanho_bytes ?? null;

      if (file) {
        const path = `${form.ano}/${Date.now()}-${safeFileName(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: 'application/pdf' });
        if (upErr) throw new Error(`Falha ao enviar o PDF: ${upErr.message}`);
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        arquivo_url = urlData.publicUrl;
        arquivo_nome = file.name;
        tamanho_bytes = file.size;
      }

      const payload = {
        ano: form.ano,
        tipo: form.tipo,
        unidade: form.unidade || null,
        titulo: form.titulo.trim(),
        data_relatorio: form.data_relatorio,
        observacoes: form.observacoes.trim() || null,
        arquivo_url,
        arquivo_nome,
        tamanho_bytes,
      };

      if (modal.editing) {
        const { error: err } = await supabase.from('grl_relatorios').update(payload).eq('id', modal.editing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('grl_relatorios').insert(payload);
        if (err) throw err;
      }
      setModal({ open: false, editing: null });
      setFile(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRelatorio(r: GrlRelatorio) {
    if (!window.confirm('Remover este relatório da lista?')) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.from('grl_relatorios').delete().eq('id', r.id);
      if (err) throw err;
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
      setLoading(false);
    }
  }

  // ── Derivados ─────────────────────────────────────────────────────────────
  const revisoes = relatorios.filter(r => r.tipo === 'Revisão');
  const ultimaRevisaoData = revisoes.reduce<string | null>(
    (max, r) => (max === null || r.data_relatorio > max ? r.data_relatorio : max), null
  );
  const ultimasRevisoes = ultimaRevisaoData
    ? revisoes.filter(r => r.data_relatorio === ultimaRevisaoData)
    : [];

  const anos = Array.from(new Set(relatorios.map(r => r.ano))).sort((a, b) => b - a);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/50 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Scale size={20} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-100">Requisitos Legais — GRL</h1>
              <p className="text-xs text-slate-500">SGI — Relatórios do Gerenciamento de Requisitos Legais</p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Novo Relatório
          </button>
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

      {!loading && (
        <div className="p-6 space-y-6">

          {/* Empty */}
          {relatorios.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <Scale size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum relatório cadastrado</p>
              <p className="text-xs mt-1 text-slate-700">Clique em &quot;Novo Relatório&quot; para anexar o primeiro PDF</p>
            </div>
          )}

          {relatorios.length > 0 && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Relatórios',     value: String(relatorios.length),      color: 'text-slate-200', icon: FileText     },
                  { label: 'Anos cobertos',  value: String(anos.length),            color: 'text-amber-300', icon: Layers       },
                  { label: 'Última revisão', value: fmtDate(ultimaRevisaoData),     color: 'text-slate-200', icon: CalendarDays },
                ].map(k => (
                  <div key={k.label} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Última revisão em destaque */}
              {ultimasRevisoes.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-400 font-semibold mb-3">
                    Última revisão do GRL · {fmtDate(ultimaRevisaoData)}
                  </p>
                  <div className="space-y-3">
                    {ultimasRevisoes.map(r => (
                      <div key={r.id} className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-100 leading-snug">{r.titulo}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                            {r.unidade && <span className="inline-flex items-center gap-1"><MapPin size={11} />{r.unidade}</span>}
                            {fmtSize(r.tamanho_bytes) && <span>{fmtSize(r.tamanho_bytes)}</span>}
                          </div>
                        </div>
                        <PdfButton url={r.arquivo_url} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico por ano */}
              <div className="space-y-5">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Histórico de relatórios</p>
                {anos.map(ano => (
                  <div key={ano}>
                    <h2 className="text-sm font-semibold text-slate-300 mb-2">{ano}</h2>
                    <div className="space-y-2">
                      {relatorios.filter(r => r.ano === ano).map(r => (
                        <div key={r.id} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 p-2 rounded-lg bg-slate-800 border border-slate-700/60">
                              <FileText size={16} className="text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_STYLE[r.tipo] ?? TIPO_STYLE['Revisão']}`}>
                                  {r.tipo}
                                </span>
                                {r.unidade && (
                                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                                    <MapPin size={10} /> {r.unidade}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium text-slate-100 leading-snug">{r.titulo}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1"><CalendarDays size={11} />{fmtDate(r.data_relatorio)}</span>
                                {fmtSize(r.tamanho_bytes) && <span>{fmtSize(r.tamanho_bytes)}</span>}
                              </div>
                              {r.observacoes && (
                                <p className="text-xs text-slate-500 mt-1.5 whitespace-pre-wrap">{r.observacoes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <PdfButton url={r.arquivo_url} />
                              <button
                                onClick={() => openEdit(r)}
                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => void deleteRelatorio(r)}
                                className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                                title="Remover"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modal: Relatório ── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-amber-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  {modal.editing ? 'Editar Relatório' : 'Novo Relatório'}
                </h2>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={e => changeTipo(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unidade</label>
                  <select
                    value={form.unidade}
                    onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    <option value="">Não especificada</option>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Data do relatório <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    value={form.data_relatorio}
                    onChange={e => changeData(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ano</label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={form.ano}
                    onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Título <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Arquivo PDF {!modal.editing && <span className="text-red-400">*</span>}
                </label>
                <label className="flex items-center gap-3 w-full cursor-pointer bg-slate-800 border border-dashed border-slate-600 hover:border-amber-500/60 rounded-lg px-3 py-3 text-sm text-slate-300 transition-colors">
                  <Upload size={16} className="text-amber-400 shrink-0" />
                  <span className="flex-1 min-w-0 truncate">
                    {file
                      ? `${file.name} (${fmtSize(file.size)})`
                      : modal.editing
                        ? 'Substituir o PDF atual (opcional)'
                        : 'Selecionar arquivo PDF (até 50 MB)'}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={e => pickFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {modal.editing && !file && (
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    Atual: {modal.editing.arquivo_nome ?? 'arquivo anexado'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-800/60">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={() => void saveRelatorio()}
                disabled={saving || !form.titulo.trim() || !form.data_relatorio || (!modal.editing && !file)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white transition-colors"
              >
                {saving
                  ? <><RefreshCw size={14} className="animate-spin" /> Enviando...</>
                  : <><Save size={14} /> {modal.editing ? 'Salvar Alterações' : 'Salvar Relatório'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
