'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  FileText,
  ClipboardList,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Plus,
  RefreshCw,
  FolderOpen,
  ChevronDown,
  X,
  Save,
  Upload,
  ExternalLink,
  Trash2,
  FileUp,
  Pencil,
  History,
} from 'lucide-react';
import { SstProgram, SstProgramCategory, SstProgramStatus, SstProgramHistoryEntry } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── helpers ─────────────────────────────────────────────────────────────────

function computeStatus(p: Omit<SstProgram, 'status' | 'daysUntilExpiry'>): {
  status: SstProgramStatus;
  daysUntilExpiry: number | undefined;
} {
  if (!p.validity_end) return { status: 'Indefinido', daysUntilExpiry: undefined };
  const days = Math.floor(
    (new Date(p.validity_end).getTime() - Date.now()) / 86400000,
  );
  const status: SstProgramStatus =
    days < 0 ? 'Vencido' : days <= 60 ? 'Vencendo' : 'Vigente';
  return { status, daysUntilExpiry: days };
}

function enrichProgram(raw: Omit<SstProgram, 'status' | 'daysUntilExpiry'>): SstProgram {
  const { status, daysUntilExpiry } = computeStatus(raw);
  return { ...raw, status, daysUntilExpiry };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function daysLabel(days: number | undefined): string {
  if (days === undefined) return 'Validade indefinida';
  if (days < 0) return `Vencido há ${Math.abs(days)} dias`;
  if (days === 0) return 'Vence hoje';
  return `Vence em ${days} dias`;
}

function fileNameFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return url;
  }
}

const CATEGORY_ICONS: Record<SstProgramCategory, React.ElementType> = {
  Programa: ShieldCheck,
  Laudo: FileText,
  Plano: ClipboardList,
  Controle: Layers,
};

const CATEGORY_COLORS: Record<SstProgramCategory, string> = {
  Programa: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Laudo: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Plano: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Controle: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

const STATUS_META: Record<
  SstProgramStatus,
  { icon: React.ElementType; cls: string; dotCls: string; barCls: string }
> = {
  Vigente: {
    icon: CheckCircle2,
    cls: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    dotCls: 'bg-emerald-500',
    barCls: 'bg-emerald-500',
  },
  Vencendo: {
    icon: Clock,
    cls: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    dotCls: 'bg-amber-500',
    barCls: 'bg-amber-500',
  },
  Vencido: {
    icon: AlertTriangle,
    cls: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    dotCls: 'bg-red-500',
    barCls: 'bg-red-500',
  },
  Indefinido: {
    icon: HelpCircle,
    cls: 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    dotCls: 'bg-slate-400',
    barCls: 'bg-slate-400',
  },
};

// ─── Field label map (para histórico) ────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  name:           'Sigla / Código',
  full_name:      'Nome Completo',
  category:       'Categoria',
  client:         'Cliente / Unidade',
  responsible:    'Responsável',
  validity_start: 'Início de Validade',
  validity_end:   'Fim de Validade',
  notes:          'Observações',
  folder_ref:     'Referência de Pasta',
  file_url:       'Documento',
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ProgramFormData {
  name: string;
  full_name: string;
  category: SstProgramCategory;
  client: string;
  responsible: string;
  validity_start: string;
  validity_end: string;
  notes: string;
  folder_ref: string;
  file_url: string;
}

const EMPTY_FORM: ProgramFormData = {
  name: '',
  full_name: '',
  category: 'Programa',
  client: '',
  responsible: '',
  validity_start: '',
  validity_end: '',
  notes: '',
  folder_ref: '',
  file_url: '',
};

interface ProgramModalProps {
  isOpen: boolean;
  initial: SstProgram | null;
  onClose: () => void;
  onSave: (data: ProgramFormData, file: File | null, id?: string) => Promise<void>;
}

function ProgramModal({ isOpen, initial, onClose, onSave }: ProgramModalProps) {
  const [form, setForm] = useState<ProgramFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        full_name: initial.full_name,
        category: initial.category,
        client: initial.client ?? '',
        responsible: initial.responsible ?? '',
        validity_start: initial.validity_start ?? '',
        validity_end: initial.validity_end ?? '',
        notes: initial.notes ?? '',
        folder_ref: initial.folder_ref ?? '',
        file_url: initial.file_url ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setFileToUpload(null);
  }, [initial, isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOpen) return null;

  const set = (k: keyof ProgramFormData, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileToUpload(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form, fileToUpload, initial?.id);
    setSaving(false);
  };

  const InputCls =
    'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400';

  const hasExistingFile = !!form.file_url;
  const pendingFile = fileToUpload;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {initial ? `Editar — ${initial.name}` : 'Novo Programa SST'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sigla / Código *</label>
              <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="ex: PGR" className={InputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Categoria</label>
              <div className="relative">
                <select value={form.category} onChange={(e) => set('category', e.target.value as SstProgramCategory)} className={InputCls + ' appearance-none pr-8'}>
                  {(['Programa', 'Laudo', 'Plano', 'Controle'] as SstProgramCategory[]).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome Completo *</label>
            <input required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="ex: Programa de Gerenciamento de Riscos" className={InputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cliente / Unidade</label>
            <input value={form.client} onChange={(e) => set('client', e.target.value)} placeholder="ex: Petrobras, Clariant, PRIO, MODEC…" className={InputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Responsável</label>
            <input value={form.responsible} onChange={(e) => set('responsible', e.target.value)} placeholder="Empresa / profissional" className={InputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Início de Validade</label>
              <input type="date" value={form.validity_start} onChange={(e) => set('validity_start', e.target.value)} className={InputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Fim de Validade</label>
              <input type="date" value={form.validity_end} onChange={(e) => set('validity_end', e.target.value)} className={InputCls} />
            </div>
          </div>

          {/* ── Documento ───────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Documento</label>

            {/* arquivo existente */}
            {hasExistingFile && !pendingFile && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 mb-2">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="flex-1 text-xs text-blue-700 dark:text-blue-300 truncate">{fileNameFromUrl(form.file_url)}</span>
                <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button type="button" onClick={() => set('file_url', '')} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* arquivo selecionado para upload */}
            {pendingFile && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 mb-2">
                <Upload className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="flex-1 text-xs text-emerald-700 dark:text-emerald-300 truncate">{pendingFile.name}</span>
                <span className="text-[10px] text-emerald-600">Pronto para enviar</span>
                <button type="button" onClick={() => { setFileToUpload(null); if (fileRef.current) fileRef.current.value = ''; }} className="text-red-500 hover:text-red-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* input de upload */}
            {!pendingFile && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-xs font-medium"
              >
                <FileUp className="w-4 h-4" />
                {hasExistingFile ? 'Substituir documento' : 'Anexar documento (PDF, DOCX, imagem)'}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Referência de Pasta</label>
            <input value={form.folder_ref} onChange={(e) => set('folder_ref', e.target.value)} placeholder="ex: 1. PGR/2026 - 2027" className={InputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Observações</label>
            <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anotações adicionais" className={InputCls + ' resize-none'} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── HistoryModal ─────────────────────────────────────────────────────────────

interface HistoryModalProps {
  isOpen: boolean;
  programId: string | null;
  programName: string;
  onClose: () => void;
}

function HistoryModal({ isOpen, programId, programName, onClose }: HistoryModalProps) {
  const [entries, setEntries] = useState<SstProgramHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen || !programId || !supabase) return;
    setLoading(true);
    supabase
      .from('sst_program_history')
      .select('*')
      .eq('program_id', programId)
      .order('changed_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setEntries(data ?? []);
        setLoading(false);
      });
  }, [isOpen, programId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOpen) return null;

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return (
      d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[80vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-500" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Histórico — {programName}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* body */}
        <div className="overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" /> Carregando…
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <History className="w-8 h-8 opacity-30" />
              <p className="text-sm">Nenhum histórico registrado ainda.</p>
            </div>
          ) : (
            <div className="relative">
              {/* linha vertical da timeline */}
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-5">
                {entries.map((entry) => {
                  const isCreate = entry.event === 'create';
                  return (
                    <div key={entry.id} className="flex gap-4 relative">
                      {/* dot da timeline */}
                      <div
                        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center z-10 ${
                          isCreate
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {isCreate ? <Plus className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                      </div>

                      <div className="flex-1 min-w-0 pb-1">
                        {/* tipo + data */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                              isCreate
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {isCreate ? 'Cadastro inicial' : 'Atualização'}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {formatDateTime(entry.changed_at)}
                          </span>
                        </div>
                        {/* quem alterou */}
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">por</span>
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            {entry.changed_by ?? 'Sistema'}
                          </span>
                        </div>

                        {/* campos alterados */}
                        {entry.changes && Object.keys(entry.changes).length > 0 && (
                          <div className="space-y-1.5">
                            {Object.entries(entry.changes).map(([field, { from, to }]) => {
                              const label = FIELD_LABELS[field] ?? field;
                              const toDisplay =
                                field === 'file_url' && to ? 'Documento anexado' : (to ?? '—');
                              const fromDisplay =
                                field === 'file_url' && from ? 'Documento anterior' : (from ?? '—');
                              if (isCreate && !to) return null; // pula campos vazios no cadastro
                              return (
                                <div
                                  key={field}
                                  className="text-xs text-slate-600 dark:text-slate-400 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-1.5"
                                >
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {label}:
                                  </span>
                                  {isCreate ? (
                                    <span className="ml-1 text-emerald-700 dark:text-emerald-300">
                                      {toDisplay}
                                    </span>
                                  ) : (
                                    <>
                                      <span className="ml-1 line-through text-red-400 dark:text-red-500">
                                        {fromDisplay}
                                      </span>
                                      <span className="mx-1 text-slate-400">→</span>
                                      <span className="text-emerald-700 dark:text-emerald-300">
                                        {toDisplay}
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {entry.note && (
                          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 italic">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

interface SstProgramsScreenProps {
  onToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function SstProgramsScreen({ onToast }: SstProgramsScreenProps) {
  const [programs, setPrograms] = useState<SstProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SstProgram | null>(null);
  const [filterCategory, setFilterCategory] = useState<SstProgramCategory | 'Todos'>('Todos');
  const [filterStatus, setFilterStatus] = useState<SstProgramStatus | 'Todos'>('Todos');
  const [filterClient, setFilterClient] = useState<string>('Todos');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchPrograms = async () => {
    if (!isSupabaseConfigured || !supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('sst_programs')
      .select('*')
      .order('category')
      .order('name');
    if (error) {
      onToast?.('Erro ao carregar programas: ' + error.message, 'error');
    } else {
      setPrograms((data ?? []).map(enrichProgram));
    }
    setLoading(false);
  };

  useEffect(() => { fetchPrograms(); }, []); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  // ── summary counts ────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    total:    programs.length,
    vigente:  programs.filter((p) => p.status === 'Vigente').length,
    vencendo: programs.filter((p) => p.status === 'Vencendo').length,
    vencido:  programs.filter((p) => p.status === 'Vencido').length,
    comDoc:   programs.filter((p) => !!p.file_url).length,
  }), [programs]);

  // ── clientes únicos para filtro ───────────────────────────────────────────
  const clientOptions = useMemo(() => {
    const set = new Set(programs.map((p) => p.client).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [programs]);

  // ── filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    programs.filter((p) => {
      if (filterCategory !== 'Todos' && p.category !== filterCategory) return false;
      if (filterStatus   !== 'Todos' && p.status   !== filterStatus)   return false;
      if (filterClient   !== 'Todos' && p.client   !== filterClient)   return false;
      return true;
    }),
  [programs, filterCategory, filterStatus, filterClient]);

  // ── save (with optional file upload) ─────────────────────────────────────
  const handleSave = async (data: ProgramFormData, file: File | null, id?: string) => {
    if (!supabase) return;

    let fileUrl = data.file_url || null;

    // Upload novo arquivo
    if (file) {
      const ext  = file.name.split('.').pop() ?? 'bin';
      const slug = data.name
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
        .replace(/[^a-zA-Z0-9]+/g, '-')                   // só alfanumérico
        .replace(/-+/g, '-').replace(/^-|-$/g, '')         // normaliza hifens
        .toLowerCase();
      const path = `${slug}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('sst-documents')
        .upload(path, file, { upsert: true });

      if (upErr) {
        onToast?.('Erro ao enviar arquivo: ' + upErr.message, 'error');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('sst-documents')
        .getPublicUrl(path);

      fileUrl = urlData?.publicUrl ?? null;
    }

    const payload = {
      name:           data.name,
      full_name:      data.full_name,
      category:       data.category,
      client:         data.client         || null,
      responsible:    data.responsible    || null,
      validity_start: data.validity_start || null,
      validity_end:   data.validity_end   || null,
      notes:          data.notes          || null,
      folder_ref:     data.folder_ref     || null,
      file_url:       fileUrl,
      updated_at:     new Date().toISOString(),
    };

    if (id) {
      const oldProgram = editTarget; // captura antes de resetar o estado
      const { error } = await supabase.from('sst_programs').update(payload).eq('id', id);
      if (error) { onToast?.('Erro ao atualizar: ' + error.message, 'error'); return; }

      // ── registra apenas os campos que mudaram ──────────────────────────────
      if (oldProgram) {
        const newValues: Record<string, string | null> = {
          name:           payload.name,
          full_name:      payload.full_name,
          category:       payload.category,
          client:         payload.client         ?? null,
          responsible:    payload.responsible    ?? null,
          validity_start: payload.validity_start ?? null,
          validity_end:   payload.validity_end   ?? null,
          notes:          payload.notes          ?? null,
          folder_ref:     payload.folder_ref     ?? null,
          file_url:       fileUrl,
        };
        const changedFields: Record<string, { from: string | null; to: string | null }> = {};
        for (const [field, newVal] of Object.entries(newValues)) {
          const oldVal = (oldProgram as unknown as Record<string, string | null>)[field] ?? null;
          if (oldVal !== newVal) {
            changedFields[field] = { from: oldVal, to: newVal };
          }
        }
        if (Object.keys(changedFields).length > 0) {
          await supabase.from('sst_program_history').insert({
            program_id:  id,
            event:       'update',
            changes:     changedFields,
            changed_by:  'Sistema', // TODO: substituir pelo usuário logado
          });
        }
      }

      onToast?.(`${data.name} atualizado ✓`);
    } else {
      const { data: inserted, error } = await supabase
        .from('sst_programs')
        .insert(payload)
        .select('id')
        .single();
      if (error) { onToast?.('Erro ao criar: ' + error.message, 'error'); return; }

      // ── registra o cadastro inicial com todos os campos preenchidos ─────────
      if (inserted?.id) {
        const initialValues: Record<string, string | null> = {
          name:           payload.name,
          full_name:      payload.full_name,
          category:       payload.category,
          client:         payload.client         ?? null,
          responsible:    payload.responsible    ?? null,
          validity_start: payload.validity_start ?? null,
          validity_end:   payload.validity_end   ?? null,
          notes:          payload.notes          ?? null,
          folder_ref:     payload.folder_ref     ?? null,
          file_url:       fileUrl,
        };
        const initialChanges: Record<string, { from: string | null; to: string | null }> = {};
        for (const [k, v] of Object.entries(initialValues)) {
          if (v !== null && v !== '') initialChanges[k] = { from: null, to: v };
        }
        await supabase.from('sst_program_history').insert({
          program_id:  inserted.id,
          event:       'create',
          changes:     initialChanges,
          changed_by:  'Sistema', // TODO: substituir pelo usuário logado
        });
      }

      onToast?.(`${data.name} cadastrado ✓`);
    }

    setModalOpen(false);
    setEditTarget(null);
    fetchPrograms();
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Programas SST</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Documentos, laudos e programas de Saúde, Segurança e Trabalho
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPrograms} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Programa
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: counts.total,    icon: ShieldCheck,   cls: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20'    },
          { label: 'Vigente',  value: counts.vigente,  icon: CheckCircle2,  cls: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Vencendo', value: counts.vencendo, icon: Clock,         cls: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20'   },
          { label: 'Vencido',  value: counts.vencido,  icon: AlertTriangle, cls: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20'       },
        ].map(({ label, value, icon: Icon, cls, bg }) => (
          <div key={label} className={`rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3 ${bg}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm ${cls}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none">{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">Categoria:</span>
          {(['Todos', 'Programa', 'Laudo', 'Plano', 'Controle'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                filterCategory === c
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {c}
            </button>
          ))}
          <span className="text-xs text-slate-400 mx-1">|</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Status:</span>
          {(['Todos', 'Vigente', 'Vencendo', 'Vencido', 'Indefinido'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                filterStatus === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {clientOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">Cliente:</span>
            {(['Todos', ...clientOptions]).map((cl) => (
              <button
                key={cl}
                onClick={() => setFilterClient(cl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  filterClient === cl
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cl}
              </button>
            ))}
            {counts.comDoc < counts.total && (
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                {counts.comDoc}/{counts.total} com documento
              </span>
            )}
          </div>
        )}
      </div>

      {/* Program cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <ShieldCheck className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nenhum programa para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const status  = p.status ?? 'Indefinido';
            const meta    = STATUS_META[status];
            const CatIcon = CATEGORY_ICONS[p.category];
            const catCls  = CATEGORY_COLORS[p.category];
            const StatusIcon = meta.icon;
            const hasDoc  = !!p.file_url;

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                {/* top row: category icon + name + status badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${catCls}`}>
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${catCls}`}>{p.category}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border shrink-0 ${meta.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotCls}`} />
                    {status}
                  </span>
                </div>

                {/* full name */}
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{p.full_name}</p>

                {/* client badge */}
                {p.client && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                    {p.client}
                  </span>
                )}

                {/* validity */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {p.validity_start || p.validity_end
                      ? `${formatDate(p.validity_start)} → ${formatDate(p.validity_end)}`
                      : 'Validade não definida'}
                  </span>
                </div>

                {/* days badge */}
                {p.validity_end && (
                  <div className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 ${meta.cls} border`}>
                    <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                    {daysLabel(p.daysUntilExpiry)}
                  </div>
                )}

                {/* folder ref */}
                {p.folder_ref && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                    <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{p.folder_ref}</span>
                  </div>
                )}

                {/* notes */}
                {p.notes && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 italic leading-snug">{p.notes}</p>
                )}

                {/* actions: Abrir documento + Editar */}
                <div className="mt-auto flex gap-2 pt-1">
                  {hasDoc ? (
                    <a
                      href={p.file_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir documento
                    </a>
                  ) : (
                    <button
                      onClick={() => { setEditTarget(p); setModalOpen(true); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800 rounded-lg transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Anexar documento
                    </button>
                  )}
                  <button
                    onClick={() => { setEditTarget(p); setModalOpen(true); }}
                    title="Editar"
                    className="w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:border-blue-300 dark:hover:text-blue-400 dark:hover:border-blue-800 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setHistoryTarget({ id: p.id, name: p.name }); setHistoryOpen(true); }}
                    title="Histórico de mudanças"
                    className="w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-purple-600 hover:border-purple-300 dark:hover:text-purple-400 dark:hover:border-purple-800 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Painel de atenção */}
      {programs.some((p) => p.status === 'Vencendo' || p.status === 'Vencido') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Programas Requerendo Atenção
          </h3>
          <div className="space-y-2">
            {programs
              .filter((p) => p.status === 'Vencido' || p.status === 'Vencendo')
              .sort((a, b) => (a.daysUntilExpiry ?? 999) - (b.daysUntilExpiry ?? 999))
              .map((p) => {
                const meta    = STATUS_META[p.status ?? 'Indefinido'];
                const CatIcon = CATEGORY_ICONS[p.category];
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                  >
                    <CatIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {p.name}{p.client ? ` — ${p.client}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{p.full_name}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shrink-0 ${meta.cls}`}>
                      {daysLabel(p.daysUntilExpiry)}
                    </span>
                    {p.file_url && (
                      <a
                        href={p.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 shrink-0"
                        title="Abrir documento"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Modal edição */}
      <ProgramModal
        isOpen={modalOpen}
        initial={editTarget}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSave={handleSave}
      />

      {/* Modal histórico */}
      <HistoryModal
        isOpen={historyOpen}
        programId={historyTarget?.id ?? null}
        programName={historyTarget?.name ?? ''}
        onClose={() => { setHistoryOpen(false); setHistoryTarget(null); }}
      />
    </div>
  );
}
