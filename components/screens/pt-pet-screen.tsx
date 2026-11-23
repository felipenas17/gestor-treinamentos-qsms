'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FileCheck2,
  Plus,
  Printer,
  Edit2,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Search,
  X,
  Save,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Zap,
  Flame,
  Wind,
  Anchor,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  WorkPermit,
  WorkPermitTipo,
  WorkPermitSubtipo,
  WorkPermitStatus,
} from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const EPI_OPTIONS = [
  'Capacete',
  'Óculos de proteção',
  'Protetor auricular',
  'Luvas de proteção',
  'Calçado de segurança',
  'Uniforme / macacão',
  'Cinto de segurança',
  'Talabarte',
  'Linha de vida',
  'Trava-quedas',
  'Detector de gases (4 gases)',
  'Máscara respiratória',
  'Avental de solda',
  'Protetor facial',
  'Luvas dielétricas',
  'Detector de tensão',
  'Extintor portátil',
];

const PET_SUBTIPOS: Record<WorkPermitSubtipo, { label: string; icon: React.ElementType; nr: string }> = {
  altura:    { label: 'Trabalho em Altura',  icon: ShieldAlert, nr: 'NR-35' },
  confinado: { label: 'Espaço Confinado',    icon: Wind,        nr: 'NR-33' },
  quente:    { label: 'Trabalho a Quente',   icon: Flame,       nr: 'NR-34' },
  eletrico:  { label: 'Trabalho Elétrico',   icon: Zap,         nr: 'NR-10' },
  icamento:  { label: 'Içamento de Cargas',  icon: Anchor,      nr: 'NR-11' },
};

const STATUS_CFG: Record<WorkPermitStatus, { label: string; badgeCls: string }> = {
  emitida:     { label: 'Emitida',       badgeCls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  em_execucao: { label: 'Em Execução',   badgeCls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  encerrada:   { label: 'Encerrada',     badgeCls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  cancelada:   { label: 'Cancelada',     badgeCls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function mapRow(r: Record<string, unknown>): WorkPermit {
  return {
    id:                   r.id as string,
    numero:               r.numero as string,
    tipo:                 r.tipo as WorkPermitTipo,
    subtipo:              (r.subtipo as WorkPermitSubtipo) ?? null,
    dataEmissao:          r.data_emissao as string,
    horaInicio:           r.hora_inicio as string,
    horaFimPrevista:      r.hora_fim_prevista as string,
    unidade:              (r.unidade as string) ?? null,
    localTrabalho:        r.local_trabalho as string,
    descricaoAtividade:   r.descricao_atividade as string,
    empresaExecutante:    (r.empresa_executante as string) ?? null,
    responsavelExecucao:  r.responsavel_execucao as string,
    equipe:               (r.equipe as string) ?? null,
    riscos:               (r.riscos as string) ?? null,
    medidasControle:      (r.medidas_controle as string) ?? null,
    episSelecionados:     (r.epis_selecionados as string) ?? null,
    autorizadorNome:      (r.autorizador_nome as string) ?? null,
    autorizadorFuncao:    (r.autorizador_funcao as string) ?? null,
    status:               r.status as WorkPermitStatus,
    horaEncerramento:     (r.hora_encerramento as string) ?? null,
    observacoes:          (r.observacoes as string) ?? null,
    createdAt:            r.created_at as string,
    updatedAt:            r.updated_at as string,
  };
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormData {
  numero:               string;
  tipo:                 WorkPermitTipo;
  subtipo:              WorkPermitSubtipo | '';
  dataEmissao:          string;
  horaInicio:           string;
  horaFimPrevista:      string;
  unidade:              string;
  localTrabalho:        string;
  descricaoAtividade:   string;
  empresaExecutante:    string;
  responsavelExecucao:  string;
  equipe:               string;
  riscos:               string;
  medidasControle:      string;
  episSelecionados:     string[];
  autorizadorNome:      string;
  autorizadorFuncao:    string;
  observacoes:          string;
}

function emptyForm(tipo: WorkPermitTipo = 'PT'): FormData {
  return {
    numero:               '',
    tipo,
    subtipo:              '',
    dataEmissao:          new Date().toISOString().split('T')[0],
    horaInicio:           '08:00',
    horaFimPrevista:      '17:00',
    unidade:              '',
    localTrabalho:        '',
    descricaoAtividade:   '',
    empresaExecutante:    'Tiger Rentank do Brasil',
    responsavelExecucao:  '',
    equipe:               '',
    riscos:               '',
    medidasControle:      '',
    episSelecionados:     [],
    autorizadorNome:      '',
    autorizadorFuncao:    '',
    observacoes:          '',
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PtPetScreen({ onToast }: Props) {
  const [permits, setPermits]           = useState<WorkPermit[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState<WorkPermitStatus | 'all'>('all');
  const [filterTipo, setFilterTipo]     = useState<WorkPermitTipo | 'all'>('all');
  const [search, setSearch]             = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState<WorkPermit | null>(null);
  const [form, setForm]                 = useState<FormData>(emptyForm());
  const [saving, setSaving]             = useState(false);
  const [printTarget, setPrintTarget]   = useState<WorkPermit | null>(null);
  const [confirm, setConfirm]           = useState<{
    permit: WorkPermit;
    action: 'iniciar' | 'encerrar' | 'cancelar';
  } | null>(null);

  // ─── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('work_permits')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { onToast('Erro ao carregar permissões', 'error'); }
    setPermits((data ?? []).map(mapRow));
    setLoading(false);
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  // ─── KPIs ─────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => ({
    emitidas:    permits.filter(p => p.status === 'emitida').length,
    emExecucao:  permits.filter(p => p.status === 'em_execucao').length,
    encerradas:  permits.filter(p => p.status === 'encerrada').length,
    ptAtivas:    permits.filter(p => p.tipo === 'PT' && (p.status === 'emitida' || p.status === 'em_execucao')).length,
    petAtivas:   permits.filter(p => p.tipo === 'PET' && (p.status === 'emitida' || p.status === 'em_execucao')).length,
  }), [permits]);

  // ─── Filtered ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => permits.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterTipo   !== 'all' && p.tipo   !== filterTipo)   return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.numero.toLowerCase().includes(q) ||
        p.localTrabalho.toLowerCase().includes(q) ||
        p.responsavelExecucao.toLowerCase().includes(q) ||
        (p.empresaExecutante ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [permits, filterStatus, filterTipo, search]);

  // ─── Auto-number ──────────────────────────────────────────────────────────

  const nextNumber = useCallback((tipo: WorkPermitTipo) => {
    const year   = new Date().getFullYear();
    const prefix = `${tipo}-${year}-`;
    const nums   = permits
      .map(p => p.numero)
      .filter(n => n.startsWith(prefix))
      .map(n => parseInt(n.slice(prefix.length), 10))
      .filter(n => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
  }, [permits]);

  // ─── Open modal ───────────────────────────────────────────────────────────

  const openCreate = useCallback((tipo: WorkPermitTipo) => {
    setEditing(null);
    setForm({ ...emptyForm(tipo), numero: nextNumber(tipo) });
    setShowModal(true);
  }, [nextNumber]);

  const openEdit = useCallback((p: WorkPermit) => {
    setEditing(p);
    setForm({
      numero:               p.numero,
      tipo:                 p.tipo,
      subtipo:              p.subtipo ?? '',
      dataEmissao:          p.dataEmissao,
      horaInicio:           p.horaInicio,
      horaFimPrevista:      p.horaFimPrevista,
      unidade:              p.unidade ?? '',
      localTrabalho:        p.localTrabalho,
      descricaoAtividade:   p.descricaoAtividade,
      empresaExecutante:    p.empresaExecutante ?? '',
      responsavelExecucao:  p.responsavelExecucao,
      equipe:               p.equipe ?? '',
      riscos:               p.riscos ?? '',
      medidasControle:      p.medidasControle ?? '',
      episSelecionados:     p.episSelecionados
        ? p.episSelecionados.split(',').map(e => e.trim()).filter(Boolean)
        : [],
      autorizadorNome:      p.autorizadorNome ?? '',
      autorizadorFuncao:    p.autorizadorFuncao ?? '',
      observacoes:          p.observacoes ?? '',
    });
    setShowModal(true);
  }, []);

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!supabase) return;
    if (!form.localTrabalho || !form.descricaoAtividade || !form.responsavelExecucao) {
      onToast('Preencha os campos obrigatórios (*)','error'); return;
    }
    if (form.tipo === 'PET' && !form.subtipo) {
      onToast('Selecione o tipo de PET', 'error'); return;
    }
    setSaving(true);

    const payload = {
      numero:               form.numero,
      tipo:                 form.tipo,
      subtipo:              form.subtipo || null,
      data_emissao:         form.dataEmissao,
      hora_inicio:          form.horaInicio,
      hora_fim_prevista:    form.horaFimPrevista,
      unidade:              form.unidade || null,
      local_trabalho:       form.localTrabalho,
      descricao_atividade:  form.descricaoAtividade,
      empresa_executante:   form.empresaExecutante || null,
      responsavel_execucao: form.responsavelExecucao,
      equipe:               form.equipe || null,
      riscos:               form.riscos || null,
      medidas_controle:     form.medidasControle || null,
      epis_selecionados:    form.episSelecionados.length ? form.episSelecionados.join(', ') : null,
      autorizador_nome:     form.autorizadorNome || null,
      autorizador_funcao:   form.autorizadorFuncao || null,
      observacoes:          form.observacoes || null,
    };

    if (editing) {
      const { error } = await supabase.from('work_permits').update(payload).eq('id', editing.id);
      if (error) { onToast('Erro ao atualizar', 'error'); setSaving(false); return; }
      onToast('Permissão atualizada', 'success');
    } else {
      const { error } = await supabase.from('work_permits').insert({ ...payload, status: 'emitida' });
      if (error) { onToast('Erro ao emitir permissão', 'error'); setSaving(false); return; }
      onToast(`${form.tipo} ${form.numero} emitida`, 'success');
    }

    setSaving(false);
    setShowModal(false);
    load();
  };

  // ─── Status actions ───────────────────────────────────────────────────────

  const changeStatus = async (p: WorkPermit, s: WorkPermitStatus) => {
    if (!supabase) return;
    const upd: Record<string, unknown> = { status: s };
    if (s === 'encerrada' || s === 'cancelada') upd.hora_encerramento = new Date().toISOString();
    const { error } = await supabase.from('work_permits').update(upd).eq('id', p.id);
    if (error) { onToast('Erro ao atualizar status', 'error'); return; }
    onToast(
      s === 'em_execucao' ? 'Trabalho iniciado' :
      s === 'encerrada'   ? 'Permissão encerrada' : 'Permissão cancelada',
      s === 'cancelada' ? 'info' : 'success'
    );
    setConfirm(null);
    load();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!isSupabaseConfigured) {
    return <div className="p-8 text-center text-gray-400">Supabase não configurado.</div>;
  }

  return (
    <div className="flex flex-col h-full gap-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">PT / PET</h2>
          <p className="text-xs text-gray-500">Permissões de Trabalho · Permissões Especiais</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openCreate('PT')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova PT
          </button>
          <button
            onClick={() => openCreate('PET')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova PET
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Emitidas',     value: kpis.emitidas,   cls: 'text-blue-600 dark:text-blue-400' },
          { label: 'Em Execução',  value: kpis.emExecucao, cls: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Encerradas',   value: kpis.encerradas, cls: 'text-green-600 dark:text-green-400' },
          { label: 'PTs Ativas',   value: kpis.ptAtivas,   cls: 'text-blue-600 dark:text-blue-400' },
          { label: 'PETs Ativas',  value: kpis.petAtivas,  cls: 'text-orange-600 dark:text-orange-400' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-44"
          />
        </div>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value as WorkPermitTipo | 'all')}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">PT + PET</option>
          <option value="PT">PT</option>
          <option value="PET">PET</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as WorkPermitStatus | 'all')}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">Todos os status</option>
          <option value="emitida">Emitida</option>
          <option value="em_execucao">Em Execução</option>
          <option value="encerrada">Encerrada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
            <FileCheck2 className="w-8 h-8 opacity-30" />
            <p className="text-sm">Nenhuma permissão encontrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500 uppercase sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">Número</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Local</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Responsável</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(p => {
                const sc = STATUS_CFG[p.status];
                const subLabel = p.subtipo ? PET_SUBTIPOS[p.subtipo] : null;
                const active = p.status === 'emitida' || p.status === 'em_execucao';
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white whitespace-nowrap">{p.numero}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium gap-1 ${
                        p.tipo === 'PT'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                      }`}>
                        {p.tipo}
                        {subLabel && <span className="opacity-70">· {subLabel.nr}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[160px] truncate">{p.localTrabalho}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(p.dataEmissao)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[140px] truncate hidden md:table-cell">{p.responsavelExecucao}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sc.badgeCls}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Imprimir */}
                        <button
                          onClick={() => setPrintTarget(p)}
                          title="Imprimir"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {/* Editar */}
                        {active && (
                          <button
                            onClick={() => openEdit(p)}
                            title="Editar"
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {/* Iniciar */}
                        {p.status === 'emitida' && (
                          <button
                            onClick={() => setConfirm({ permit: p, action: 'iniciar' })}
                            title="Iniciar execução"
                            className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded transition-colors"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        )}
                        {/* Encerrar / Cancelar */}
                        {active && (
                          <>
                            <button
                              onClick={() => setConfirm({ permit: p, action: 'encerrar' })}
                              title="Encerrar"
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirm({ permit: p, action: 'cancelar' })}
                              title="Cancelar"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modals ── */}
      {showModal && (
        <PermitModal
          form={form}
          setForm={setForm}
          isEditing={!!editing}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}

      {printTarget && (
        <PrintModal permit={printTarget} onClose={() => setPrintTarget(null)} />
      )}

      {confirm && (
        <ConfirmModal
          confirm={confirm}
          onConfirm={() => changeStatus(
            confirm.permit,
            confirm.action === 'iniciar' ? 'em_execucao' :
            confirm.action === 'encerrar' ? 'encerrada' : 'cancelada'
          )}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── PermitModal ──────────────────────────────────────────────────────────────

function PermitModal({
  form, setForm, isEditing, onSave, onClose, saving,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  isEditing: boolean;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const toggleEpi = (epi: string) =>
    setForm(f => ({
      ...f,
      episSelecionados: f.episSelecionados.includes(epi)
        ? f.episSelecionados.filter(e => e !== epi)
        : [...f.episSelecionados, epi],
    }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Editar Permissão' : `Emitir ${form.tipo}`}
            </h3>
            <p className="text-xs text-gray-500">{form.numero}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Tipo / Subtipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({
                  ...f,
                  tipo: e.target.value as WorkPermitTipo,
                  subtipo: '',
                }))}
                disabled={isEditing}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-60"
              >
                <option value="PT">PT — Permissão de Trabalho</option>
                <option value="PET">PET — Permissão Especial</option>
              </select>
            </div>
            {form.tipo === 'PET' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo PET *</label>
                <select
                  value={form.subtipo}
                  onChange={e => setForm(f => ({ ...f, subtipo: e.target.value as WorkPermitSubtipo | '' }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Selecione...</option>
                  {(Object.entries(PET_SUBTIPOS) as [WorkPermitSubtipo, typeof PET_SUBTIPOS[WorkPermitSubtipo]][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} ({v.nr})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Identificação */}
          <Section title="Identificação">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data *">
                <input type="date" value={form.dataEmissao} onChange={set('dataEmissao')} className={inputCls} />
              </Field>
              <Field label="Unidade / Base">
                <input type="text" value={form.unidade} onChange={set('unidade')} placeholder="Ex: Macaé" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora início *">
                <input type="time" value={form.horaInicio} onChange={set('horaInicio')} className={inputCls} />
              </Field>
              <Field label="Hora fim prevista *">
                <input type="time" value={form.horaFimPrevista} onChange={set('horaFimPrevista')} className={inputCls} />
              </Field>
            </div>
            <Field label="Local de trabalho *">
              <input type="text" value={form.localTrabalho} onChange={set('localTrabalho')} placeholder="Ex: Pátio / Área de Manutenção" className={inputCls} />
            </Field>
          </Section>

          {/* Atividade */}
          <Section title="Atividade">
            <Field label="Descrição da atividade *">
              <textarea rows={3} value={form.descricaoAtividade} onChange={set('descricaoAtividade')} placeholder="Descreva detalhadamente o trabalho a ser realizado..." className={`${inputCls} resize-none`} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Empresa executante">
                <input type="text" value={form.empresaExecutante} onChange={set('empresaExecutante')} className={inputCls} />
              </Field>
              <Field label="Responsável pela execução *">
                <input type="text" value={form.responsavelExecucao} onChange={set('responsavelExecucao')} placeholder="Nome completo" className={inputCls} />
              </Field>
            </div>
            <Field label="Equipe">
              <textarea rows={2} value={form.equipe} onChange={set('equipe')} placeholder="Nome dos executantes (um por linha ou separados por vírgula)" className={`${inputCls} resize-none`} />
            </Field>
          </Section>

          {/* Segurança */}
          <Section title="Análise de Riscos e Controles">
            <Field label="Riscos identificados">
              <textarea rows={3} value={form.riscos} onChange={set('riscos')} placeholder="Liste os riscos associados à atividade..." className={`${inputCls} resize-none`} />
            </Field>
            <Field label="Medidas de controle">
              <textarea rows={3} value={form.medidasControle} onChange={set('medidasControle')} placeholder="Descreva as medidas preventivas e de controle..." className={`${inputCls} resize-none`} />
            </Field>
          </Section>

          {/* EPIs */}
          <Section title="EPIs Necessários">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EPI_OPTIONS.map(epi => (
                <label key={epi} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.episSelecionados.includes(epi)}
                    onChange={() => toggleEpi(epi)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  {epi}
                </label>
              ))}
            </div>
          </Section>

          {/* Autorização */}
          <Section title="Autorização">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Autorizador">
                <input type="text" value={form.autorizadorNome} onChange={set('autorizadorNome')} placeholder="Nome do autorizador" className={inputCls} />
              </Field>
              <Field label="Função">
                <input type="text" value={form.autorizadorFuncao} onChange={set('autorizadorFuncao')} placeholder="Ex: Responsável QSMS" className={inputCls} />
              </Field>
            </div>
            <Field label="Observações">
              <textarea rows={2} value={form.observacoes} onChange={set('observacoes')} placeholder="Observações adicionais..." className={`${inputCls} resize-none`} />
            </Field>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Emitir permissão'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PrintModal ───────────────────────────────────────────────────────────────

function PrintModal({ permit, onClose }: { permit: WorkPermit; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  const subInfo = permit.subtipo ? PET_SUBTIPOS[permit.subtipo] : null;
  const episList = permit.episSelecionados
    ? permit.episSelecionados.split(',').map(e => e.trim()).filter(Boolean)
    : [];
  const equipeList = permit.equipe
    ? permit.equipe.split(/[\n,]/).map(e => e.trim()).filter(Boolean)
    : [];

  const doPrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${permit.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
    .pt-doc { width: 190mm; margin: 10mm auto; padding: 0; }
    .header { border: 2px solid #000; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; }
    .header-title { text-align: center; flex: 1; }
    .header-title .company { font-size: 13px; font-weight: bold; letter-spacing: 1px; }
    .header-title .doc-type { font-size: 16px; font-weight: bold; margin-top: 2px; }
    .header-title .nr-ref { font-size: 10px; color: #555; margin-top: 2px; }
    .numero-box { border: 2px solid #000; padding: 6px 10px; text-align: center; min-width: 120px; }
    .numero-box .label { font-size: 9px; text-transform: uppercase; color: #666; }
    .numero-box .value { font-size: 14px; font-weight: bold; font-family: monospace; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid currentColor; }
    .status-emitida { color: #1d4ed8; }
    .status-em_execucao { color: #d97706; }
    .status-encerrada { color: #15803d; }
    .status-cancelada { color: #dc2626; }
    table.info { width: 100%; border-collapse: collapse; margin-top: 0; }
    table.info td, table.info th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
    table.info th { background: #e5e7eb; font-weight: bold; font-size: 10px; text-transform: uppercase; width: 25%; }
    .section-title { background: #1e3a5f; color: white; padding: 4px 8px; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #000; border-top: none; }
    .epi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px 8px; padding: 6px; border: 1px solid #000; border-top: none; }
    .epi-item { display: flex; align-items: center; gap: 4px; font-size: 10px; }
    .epi-check { width: 12px; height: 12px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; }
    .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #000; border-top: none; }
    .sig-cell { padding: 6px 8px; min-height: 60px; display: flex; flex-direction: column; justify-content: flex-end; }
    .sig-cell:first-child { border-right: 1px solid #000; }
    .sig-label { font-size: 9px; text-transform: uppercase; color: #666; border-top: 1px solid #000; padding-top: 3px; margin-top: 20px; }
    .sig-name { font-size: 10px; font-weight: bold; }
    .sig-role { font-size: 9px; color: #555; }
    .obs-box { border: 1px solid #000; border-top: none; padding: 6px 8px; min-height: 40px; font-size: 10px; }
    .enc-row { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; border-top: none; }
    .enc-cell { padding: 5px 8px; min-height: 50px; display: flex; flex-direction: column; justify-content: flex-end; }
    .enc-cell:first-child { border-right: 1px solid #000; }
    .enc-label { font-size: 9px; text-transform: uppercase; color: #666; border-top: 1px solid #000; padding-top: 3px; margin-top: 15px; }
    .footer-note { text-align: center; font-size: 9px; color: #888; margin-top: 8px; }
    @media print { body { margin: 0; } .pt-doc { margin: 5mm auto; } }
  </style>
</head>
<body>
  <div class="pt-doc">
    <!-- Header -->
    <div class="header">
      <div style="min-width:80px; text-align:left;">
        <div style="font-size:9px;color:#666;">Doc. Nº</div>
        <div class="status-badge status-${permit.status}">${STATUS_CFG[permit.status].label}</div>
      </div>
      <div class="header-title">
        <div class="company">TIGER RENTANK DO BRASIL</div>
        <div class="doc-type">${permit.tipo === 'PT' ? 'PERMISSÃO DE TRABALHO' : `PERMISSÃO ESPECIAL DE TRABALHO${subInfo ? ` — ${subInfo.label.toUpperCase()}` : ''}`}</div>
        ${subInfo ? `<div class="nr-ref">Conforme ${subInfo.nr}</div>` : ''}
      </div>
      <div class="numero-box">
        <div class="label">Número</div>
        <div class="value">${permit.numero}</div>
      </div>
    </div>

    <!-- Identificação -->
    <div class="section-title">1. Identificação</div>
    <table class="info">
      <tr>
        <th>Data de emissão</th><td>${fmtDate(permit.dataEmissao)}</td>
        <th>Validade</th><td>${permit.horaInicio} às ${permit.horaFimPrevista}</td>
      </tr>
      <tr>
        <th>Unidade / Base</th><td>${permit.unidade ?? '—'}</td>
        <th>Local de trabalho</th><td>${permit.localTrabalho}</td>
      </tr>
    </table>

    <!-- Atividade -->
    <div class="section-title">2. Descrição da Atividade</div>
    <table class="info">
      <tr><th style="width:25%">Atividade</th><td colspan="3">${permit.descricaoAtividade}</td></tr>
      <tr>
        <th>Empresa executante</th><td>${permit.empresaExecutante ?? '—'}</td>
        <th>Responsável</th><td>${permit.responsavelExecucao}</td>
      </tr>
      ${equipeList.length > 0 ? `<tr><th>Equipe</th><td colspan="3">${equipeList.join(' · ')}</td></tr>` : ''}
    </table>

    <!-- Riscos -->
    <div class="section-title">3. Análise de Riscos e Medidas de Controle</div>
    <table class="info">
      <tr><th>Riscos identificados</th><td>${permit.riscos ?? '—'}</td></tr>
      <tr><th>Medidas de controle</th><td>${permit.medidasControle ?? '—'}</td></tr>
    </table>

    <!-- EPIs -->
    <div class="section-title">4. EPIs Necessários</div>
    <div class="epi-grid">
      ${EPI_OPTIONS.map(epi => `
        <div class="epi-item">
          <div class="epi-check">${episList.includes(epi) ? '✓' : ''}</div>
          <span>${epi}</span>
        </div>`).join('')}
    </div>

    <!-- Autorização / Assinaturas -->
    <div class="section-title">5. Autorização e Assinaturas</div>
    <div class="sig-row">
      <div class="sig-cell">
        <div class="sig-name">${permit.responsavelExecucao}</div>
        <div class="sig-role">Responsável pela execução</div>
        <div class="sig-label">Assinatura / Data e Hora</div>
      </div>
      <div class="sig-cell">
        <div class="sig-name">${permit.autorizadorNome ?? '_________________________________'}</div>
        <div class="sig-role">${permit.autorizadorFuncao ?? 'Autorizador'}</div>
        <div class="sig-label">Assinatura / Data e Hora</div>
      </div>
    </div>

    <!-- Encerramento -->
    <div class="section-title">6. Encerramento</div>
    <div class="enc-row">
      <div class="enc-cell">
        <div>${permit.horaEncerramento ? fmtDateTime(permit.horaEncerramento) : ''}</div>
        <div class="enc-label">Data e hora de encerramento</div>
      </div>
      <div class="enc-cell">
        <div class="enc-label">Assinatura do autorizador no encerramento</div>
      </div>
    </div>

    <!-- Observações -->
    ${permit.observacoes ? `
    <div class="section-title">7. Observações</div>
    <div class="obs-box">${permit.observacoes}</div>` : ''}

    <div class="footer-note">
      Tiger Rentank do Brasil · SGI — Sistema de Gestão Integrada · ISO 9001 / ISO 14001 / ISO 45001<br/>
      Emitido em: ${new Date().toLocaleString('pt-BR')}
    </div>
  </div>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{permit.numero}</h3>
            <p className="text-xs text-gray-500">{permit.localTrabalho} · {fmtDate(permit.dataEmissao)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={doPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div ref={printRef} className="overflow-y-auto flex-1 px-6 py-4 space-y-3 text-sm text-gray-800 dark:text-gray-200">
          {/* Type badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded font-semibold text-xs ${
              permit.tipo === 'PT'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
            }`}>
              {permit.tipo === 'PT' ? 'Permissão de Trabalho' : `Permissão Especial — ${permit.subtipo ? PET_SUBTIPOS[permit.subtipo].label : ''}`}
            </span>
            <span className={`px-2.5 py-1 rounded text-xs font-medium ${STATUS_CFG[permit.status].badgeCls}`}>
              {STATUS_CFG[permit.status].label}
            </span>
          </div>

          <PreviewBlock label="Identificação">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <KV k="Número" v={permit.numero} />
              <KV k="Data" v={fmtDate(permit.dataEmissao)} />
              <KV k="Validade" v={`${permit.horaInicio} – ${permit.horaFimPrevista}`} />
              <KV k="Unidade" v={permit.unidade ?? '—'} />
              <KV k="Local" v={permit.localTrabalho} />
            </div>
          </PreviewBlock>

          <PreviewBlock label="Atividade">
            <KV k="Descrição" v={permit.descricaoAtividade} />
            <KV k="Empresa" v={permit.empresaExecutante ?? '—'} />
            <KV k="Responsável" v={permit.responsavelExecucao} />
            {permit.equipe && <KV k="Equipe" v={permit.equipe} />}
          </PreviewBlock>

          <PreviewBlock label="Riscos e Controles">
            <KV k="Riscos" v={permit.riscos ?? '—'} />
            <KV k="Medidas de controle" v={permit.medidasControle ?? '—'} />
          </PreviewBlock>

          {permit.episSelecionados && (
            <PreviewBlock label="EPIs">
              <div className="flex flex-wrap gap-1.5 mt-1">
                {permit.episSelecionados.split(',').map(e => e.trim()).filter(Boolean).map(epi => (
                  <span key={epi} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                    <CheckCircle2 className="w-3 h-3" /> {epi}
                  </span>
                ))}
              </div>
            </PreviewBlock>
          )}

          <PreviewBlock label="Autorização">
            <KV k="Autorizador" v={permit.autorizadorNome ?? '—'} />
            <KV k="Função" v={permit.autorizadorFuncao ?? '—'} />
          </PreviewBlock>

          {permit.horaEncerramento && (
            <PreviewBlock label="Encerramento">
              <KV k="Data/hora" v={fmtDateTime(permit.horaEncerramento)} />
            </PreviewBlock>
          )}

          {permit.observacoes && (
            <PreviewBlock label="Observações">
              <p className="text-sm">{permit.observacoes}</p>
            </PreviewBlock>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  confirm, onConfirm, onClose,
}: {
  confirm: { permit: WorkPermit; action: 'iniciar' | 'encerrar' | 'cancelar' };
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cfg = {
    iniciar:   { title: 'Iniciar execução?',   desc: 'marcada como Em Execução',  btnCls: 'bg-yellow-600 hover:bg-yellow-700' },
    encerrar:  { title: 'Encerrar permissão?', desc: 'encerrada definitivamente',  btnCls: 'bg-green-600 hover:bg-green-700'  },
    cancelar:  { title: 'Cancelar permissão?', desc: 'cancelada',                 btnCls: 'bg-red-600 hover:bg-red-700'      },
  }[confirm.action];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{cfg.title}</h3>
        <p className="text-sm text-gray-500 mb-5">
          <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{confirm.permit.numero}</span> será {cfg.desc}.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Voltar
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${cfg.btnCls}`}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-1 border-b border-gray-100 dark:border-gray-700">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function PreviewBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 shrink-0">{k}:</span>
      <span className="text-gray-800 dark:text-gray-200">{v}</span>
    </div>
  );
}
