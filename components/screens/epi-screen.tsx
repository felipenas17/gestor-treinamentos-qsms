'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Plus, Search, X, Edit2, Trash2, AlertTriangle,
  CheckCircle2, Clock, Shield, Package, ChevronDown, ChevronUp,
  Grid3x3, List, FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Epi, EpiTipo, EpiStatus, EpiCaStatus } from '@/types';

// ─── helpers ────────────────────────────────────────────────────────────────

function caStatus(validade: string | null): EpiCaStatus {
  if (!validade) return 'sem_ca';
  const diff = (new Date(validade).getTime() - Date.now()) / 86_400_000;
  if (diff < 0)  return 'vencido';
  if (diff < 90) return 'a_vencer';
  return 'vigente';
}

function caLabel(status: EpiCaStatus) {
  switch (status) {
    case 'vigente':  return { text: 'Vigente',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
    case 'a_vencer': return { text: 'A vencer',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'vencido':  return { text: 'Vencido',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    case 'sem_ca':   return { text: 'Sem CA',    cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
  }
}

const CATEGORIAS = [
  'Proteção da Cabeça',
  'Proteção dos Olhos',
  'Proteção Auditiva',
  'Proteção Respiratória',
  'Proteção das Mãos',
  'Proteção dos Pés',
  'Proteção Contra Quedas',
  'Segurança Aquática',
  'Detecção de Gases',
  'Proteção do Corpo',
  'Proteção Coletiva',
  'Outro',
];

// ─── modal ───────────────────────────────────────────────────────────────────

interface ModalProps {
  epi: Partial<Epi> | null;
  onClose: () => void;
  onSave: (data: Partial<Epi>) => Promise<void>;
  saving: boolean;
}

function EpiModal({ epi, onClose, onSave, saving }: ModalProps) {
  const isNew = !epi?.id;
  const [form, setForm] = useState<Partial<Epi>>({
    nome: '', tipo: 'EPI', categoria: '', caNumero: '', caValidade: '',
    fabricante: '', fornecedor: '', normaTecnica: '', vidaUtilMeses: null,
    funcoes: [], observacoes: '', status: 'ativo',
    ...epi,
  });
  const [funcaoInput, setFuncaoInput] = useState('');

  const set = (k: keyof Epi, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const addFuncao = () => {
    const f = funcaoInput.trim();
    if (!f || form.funcoes?.includes(f)) return;
    set('funcoes', [...(form.funcoes ?? []), f]);
    setFuncaoInput('');
  };

  const removeFuncao = (f: string) =>
    set('funcoes', (form.funcoes ?? []).filter(x => x !== f));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {isNew ? 'Novo EPI/EPC' : 'Editar EPI/EPC'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* nome + tipo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome *</label>
              <input
                value={form.nome ?? ''}
                onChange={e => set('nome', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Capacete de Segurança"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tipo *</label>
              <select
                value={form.tipo}
                onChange={e => set('tipo', e.target.value as EpiTipo)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EPI">EPI</option>
                <option value="EPC">EPC</option>
              </select>
            </div>
          </div>

          {/* categoria */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Categoria *</label>
            <select
              value={form.categoria ?? ''}
              onChange={e => set('categoria', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecionar categoria</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* CA */}
          {form.tipo === 'EPI' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nº CA</label>
                <input
                  value={form.caNumero ?? ''}
                  onChange={e => set('caNumero', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 12345"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Validade CA</label>
                <input
                  type="date"
                  value={form.caValidade ?? ''}
                  onChange={e => set('caValidade', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* fabricante + fornecedor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Fabricante</label>
              <input
                value={form.fabricante ?? ''}
                onChange={e => set('fabricante', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 3M"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Fornecedor</label>
              <input
                value={form.fornecedor ?? ''}
                onChange={e => set('fornecedor', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: EPI Sul"
              />
            </div>
          </div>

          {/* norma + vida útil */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Norma Técnica</label>
              <input
                value={form.normaTecnica ?? ''}
                onChange={e => set('normaTecnica', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: NR-6 / ABNT NBR 8221"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Vida Útil (meses)</label>
              <input
                type="number"
                min={1}
                value={form.vidaUtilMeses ?? ''}
                onChange={e => set('vidaUtilMeses', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 24"
              />
            </div>
          </div>

          {/* funções */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Funções / Cargos obrigatórios</label>
            <div className="flex gap-2 mb-2">
              <input
                value={funcaoInput}
                onChange={e => setFuncaoInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFuncao())}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Operador de Guindaste"
              />
              <button
                onClick={addFuncao}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {(form.funcoes ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(form.funcoes ?? []).map(f => (
                  <span key={f} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    {f}
                    <button onClick={() => removeFuncao(f)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* observações + status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Observações</label>
              <textarea
                value={form.observacoes ?? ''}
                onChange={e => set('observacoes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as EpiStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.nome?.trim() || !form.tipo || !form.categoria}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2"
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {isNew ? 'Cadastrar' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

interface Props {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function EpiScreen({ onToast }: Props) {
  const [epis, setEpis]         = useState<Epi[]>([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState<'catalogo' | 'matriz'>('catalogo');
  const [search, setSearch]     = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'EPI' | 'EPC'>('todos');
  const [filterCa, setFilterCa] = useState<'todos' | 'vigente' | 'a_vencer' | 'vencido' | 'sem_ca'>('todos');
  const [modal, setModal]       = useState<{ open: boolean; epi: Partial<Epi> | null }>({ open: false, epi: null });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── load ──
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('epis')
      .select('*')
      .order('tipo')
      .order('categoria')
      .order('nome');
    if (error) { onToast('Erro ao carregar EPIs', 'error'); }
    else {
      setEpis((data ?? []).map((r: Record<string, unknown>) => ({
        id:            r.id as string,
        nome:          r.nome as string,
        tipo:          r.tipo as 'EPI' | 'EPC',
        categoria:     r.categoria as string,
        caNumero:      r.ca_numero as string | null,
        caValidade:    r.ca_validade as string | null,
        fabricante:    r.fabricante as string | null,
        fornecedor:    r.fornecedor as string | null,
        normaTecnica:  r.norma_tecnica as string | null,
        vidaUtilMeses: r.vida_util_meses as number | null,
        funcoes:       (r.funcoes as string[]) ?? [],
        observacoes:   r.observacoes as string | null,
        status:        r.status as 'ativo' | 'inativo',
        createdAt:     r.created_at as string,
        updatedAt:     r.updated_at as string,
      })));
    }
    setLoading(false);
  }, [onToast]); // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  // ── save ──
  const handleSave = async (form: Partial<Epi>) => {
    if (!supabase) { onToast('Supabase não configurado', 'error'); return; }
    setSaving(true);
    const payload = {
      nome:            form.nome,
      tipo:            form.tipo,
      categoria:       form.categoria,
      ca_numero:       form.caNumero || null,
      ca_validade:     form.caValidade || null,
      fabricante:      form.fabricante || null,
      fornecedor:      form.fornecedor || null,
      norma_tecnica:   form.normaTecnica || null,
      vida_util_meses: form.vidaUtilMeses ?? null,
      funcoes:         form.funcoes ?? [],
      observacoes:     form.observacoes || null,
      status:          form.status ?? 'ativo',
    };
    if (form.id) {
      const { error } = await supabase.from('epis').update(payload).eq('id', form.id);
      if (error) { onToast('Erro ao salvar', 'error'); setSaving(false); return; }
      onToast('EPI atualizado com sucesso');
    } else {
      const { error } = await supabase.from('epis').insert(payload);
      if (error) { onToast('Erro ao cadastrar', 'error'); setSaving(false); return; }
      onToast('EPI cadastrado com sucesso');
    }
    setSaving(false);
    setModal({ open: false, epi: null });
    load();
  };

  // ── delete ──
  const handleDelete = async (id: string) => {
    if (!supabase) { onToast('Supabase não configurado', 'error'); return; }
    const { error } = await supabase.from('epis').delete().eq('id', id);
    if (error) { onToast('Erro ao excluir', 'error'); return; }
    onToast('EPI excluído');
    setConfirmDelete(null);
    load();
  };

  // ── derived ──
  const ativos = epis.filter(e => e.status === 'ativo');
  const stats = {
    totalEpi: ativos.filter(e => e.tipo === 'EPI').length,
    totalEpc: ativos.filter(e => e.tipo === 'EPC').length,
    aVencer:  ativos.filter(e => caStatus(e.caValidade) === 'a_vencer').length,
    vencidos: ativos.filter(e => caStatus(e.caValidade) === 'vencido').length,
  };

  const filtered = epis.filter(e => {
    if (filterTipo !== 'todos' && e.tipo !== filterTipo) return false;
    if (filterCa !== 'todos' && caStatus(e.caValidade) !== filterCa) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.nome.toLowerCase().includes(q) ||
             (e.categoria ?? '').toLowerCase().includes(q) ||
             (e.caNumero ?? '').toLowerCase().includes(q) ||
             (e.fabricante ?? '').toLowerCase().includes(q) ||
             e.funcoes.some(f => f.toLowerCase().includes(q));
    }
    return true;
  });

  // ── matriz: unique funcoes → EPIs ──
  const todasFuncoes = Array.from(new Set(ativos.flatMap(e => e.funcoes))).sort();
  const epiAtivos = ativos.filter(e => e.tipo === 'EPI');

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Gestão de EPI/EPC</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Catálogo, controle de CA e matriz por função</p>
          </div>
        </div>
        <button
          onClick={() => setModal({ open: true, epi: null })}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-xl"
        >
          <Plus className="w-4 h-4" /> Novo EPI/EPC
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'EPIs ativos',  value: stats.totalEpi, icon: Shield,       color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20'    },
          { label: 'EPCs ativos',  value: stats.totalEpc, icon: Package,      color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'CA a vencer',  value: stats.aVencer,  icon: Clock,        color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20'   },
          { label: 'CA vencido',   value: stats.vencidos, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20'       },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
            <Icon className={`w-5 h-5 ${color} shrink-0`} />
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {([
          { id: 'catalogo', label: 'Catálogo', icon: List },
          { id: 'matriz',   label: 'Matriz por Função', icon: Grid3x3 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              tab === id
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ── TAB: CATÁLOGO ── */}
      {tab === 'catalogo' && (
        <div className="space-y-3">
          {/* filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, categoria, CA, fabricante..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value as typeof filterTipo)}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none"
            >
              <option value="todos">Tipo: Todos</option>
              <option value="EPI">EPI</option>
              <option value="EPC">EPC</option>
            </select>
            <select
              value={filterCa}
              onChange={e => setFilterCa(e.target.value as typeof filterCa)}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none"
            >
              <option value="todos">CA: Todos</option>
              <option value="vigente">Vigente</option>
              <option value="a_vencer">A vencer</option>
              <option value="vencido">Vencido</option>
              <option value="sem_ca">Sem CA</option>
            </select>
          </div>

          {/* table */}
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm gap-2">
              <ShieldCheck className="w-8 h-8 opacity-30" />
              <span>Nenhum EPI/EPC encontrado</span>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-semibold">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Categoria</th>
                    <th className="px-4 py-3 text-center font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Nº CA</th>
                    <th className="px-4 py-3 text-center font-semibold hidden lg:table-cell">Validade CA</th>
                    <th className="px-4 py-3 text-center font-semibold">Status CA</th>
                    <th className="px-4 py-3 text-left font-semibold hidden xl:table-cell">Fabricante</th>
                    <th className="px-4 py-3 text-left font-semibold hidden xl:table-cell">Funções</th>
                    <th className="px-4 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(epi => {
                    const cs = caStatus(epi.caValidade);
                    const cl = caLabel(cs);
                    return (
                      <tr key={epi.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`font-medium text-slate-800 dark:text-slate-100 ${epi.status === 'inativo' ? 'opacity-50' : ''}`}>
                            {epi.nome}
                          </span>
                          {epi.status === 'inativo' && (
                            <span className="ml-2 text-xs text-slate-400">(inativo)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">{epi.categoria}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                            epi.tipo === 'EPI'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          }`}>
                            {epi.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell font-mono text-xs">
                          {epi.caNumero ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 hidden lg:table-cell text-xs">
                          {epi.caValidade ? new Date(epi.caValidade + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${cl.cls}`}>
                            {cl.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden xl:table-cell text-xs">
                          {epi.fabricante ?? '—'}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {epi.funcoes.slice(0, 2).map(f => (
                              <span key={f} className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                                {f}
                              </span>
                            ))}
                            {epi.funcoes.length > 2 && (
                              <span className="text-xs text-slate-400">+{epi.funcoes.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setModal({ open: true, epi })}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(epi.id)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: MATRIZ ── */}
      {tab === 'matriz' && (
        <div className="space-y-3">
          {todasFuncoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm gap-2">
              <Grid3x3 className="w-8 h-8 opacity-30" />
              <span>Nenhuma função cadastrada nos EPIs</span>
              <p className="text-xs text-slate-400">Adicione funções nos EPIs para visualizar a matriz</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <table className="text-xs min-w-max">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-800 min-w-[200px] border-r border-slate-200 dark:border-slate-700">
                      Função / Cargo
                    </th>
                    {epiAtivos.map(e => (
                      <th key={e.id} className="px-3 py-3 text-center font-medium text-slate-500 dark:text-slate-400 max-w-[90px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-block w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${e.tipo === 'EPI' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                            {e.tipo === 'EPI' ? 'E' : 'C'}
                          </span>
                          <span className="leading-tight text-center" style={{ writingMode: 'initial' }}>
                            {e.nome.length > 20 ? e.nome.substring(0, 18) + '…' : e.nome}
                          </span>
                          {e.caNumero && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${caLabel(caStatus(e.caValidade)).cls}`}>
                              CA {e.caNumero}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {todasFuncoes.map(funcao => (
                    <tr key={funcao} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
                        {funcao}
                      </td>
                      {epiAtivos.map(e => {
                        const obrigatorio = e.funcoes.includes(funcao);
                        return (
                          <td key={e.id} className="px-3 py-3 text-center">
                            {obrigatorio
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                              : <span className="text-slate-200 dark:text-slate-700 text-base">—</span>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* legend */}
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Obrigatório para a função</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-300">—</span>
              <span>Não obrigatório</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">E</span>
              <span>EPI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-bold">C</span>
              <span>EPC</span>
            </div>
          </div>
        </div>
      )}

      {/* modal */}
      {modal.open && (
        <EpiModal
          epi={modal.epi}
          onClose={() => setModal({ open: false, epi: null })}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">Excluir EPI/EPC?</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
