'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle, Plus, CheckCircle2, Clock, XCircle,
  ChevronDown, ChevronUp, Search, Filter, Edit2, Trash2,
  AlertOctagon, Info, TrendingUp, X, Save,
} from 'lucide-react';
import { NonConformity, NCType, NCSeverity, NCSource, NCStatus, NCStatusHistoryEntry } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const NC_TYPES: NCType[] = ['NC', 'Observação', 'Oportunidade de Melhoria'];
const NC_SEVERITIES: NCSeverity[] = ['Crítica', 'Moderada', 'Leve'];
const NC_SOURCES: NCSource[] = [
  'Auditoria Interna', 'Auditoria Externa', 'Inspeção',
  'Reclamação', 'Análise Crítica', 'Outro',
];
const NC_STATUSES: NCStatus[] = ['Aberta', 'Em tratamento', 'Aguardando verificação', 'Encerrada'];

// ─── Style helpers ────────────────────────────────────────────────────────────

function statusStyle(status: NCStatus) {
  switch (status) {
    case 'Aberta':                 return 'bg-red-100 text-red-800 border-red-200';
    case 'Em tratamento':          return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Aguardando verificação': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Encerrada':              return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:                       return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function statusIcon(status: NCStatus) {
  switch (status) {
    case 'Aberta':                 return <XCircle className="w-3 h-3" />;
    case 'Em tratamento':          return <Clock className="w-3 h-3" />;
    case 'Aguardando verificação': return <AlertTriangle className="w-3 h-3" />;
    case 'Encerrada':              return <CheckCircle2 className="w-3 h-3" />;
    default:                       return null;
  }
}

function severityStyle(severity: NCSeverity) {
  switch (severity) {
    case 'Crítica':  return 'bg-red-500 text-white';
    case 'Moderada': return 'bg-amber-500 text-white';
    case 'Leve':     return 'bg-emerald-500 text-white';
    default:         return 'bg-slate-400 text-white';
  }
}

function typeIcon(type: NCType) {
  switch (type) {
    case 'NC':                       return <AlertOctagon className="w-4 h-4 text-red-500" />;
    case 'Observação':               return <Info className="w-4 h-4 text-blue-500" />;
    case 'Oportunidade de Melhoria': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    default:                         return null;
  }
}

// ─── Empty form ───────────────────────────────────────────────────────────────

type NCFormData = {
  code: string; title: string; description: string;
  type: NCType; severity: NCSeverity; source: NCSource; status: NCStatus;
  detectedDate: string; deadline: string; responsible: string; sector: string;
  rootCause: string; immediateAction: string; correctiveAction: string;
  preventiveAction: string; effectivenessCheck: string; notes: string;
};

function emptyForm(): NCFormData {
  return {
    code: '', title: '', description: '',
    type: 'NC', severity: 'Moderada', source: 'Auditoria Interna', status: 'Aberta',
    detectedDate: new Date().toISOString().split('T')[0],
    deadline: '', responsible: '', sector: '',
    rootCause: '', immediateAction: '', correctiveAction: '',
    preventiveAction: '', effectivenessCheck: '', notes: '',
  };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface NCModalProps {
  initial?: NonConformity | null;
  onSave: (data: NCFormData) => void;
  onClose: () => void;
}

function NCModal({ initial, onSave, onClose }: NCModalProps) {
  const [form, setForm] = useState<NCFormData>(() =>
    initial
      ? {
          code: initial.code,
          title: initial.title,
          description: initial.description ?? '',
          type: initial.type,
          severity: initial.severity,
          source: initial.source,
          status: initial.status,
          detectedDate: initial.detectedDate,
          deadline: initial.deadline ?? '',
          responsible: initial.responsible ?? '',
          sector: initial.sector ?? '',
          rootCause: initial.rootCause ?? '',
          immediateAction: initial.immediateAction ?? '',
          correctiveAction: initial.correctiveAction ?? '',
          preventiveAction: initial.preventiveAction ?? '',
          effectivenessCheck: initial.effectivenessCheck ?? '',
          notes: initial.notes ?? '',
        }
      : emptyForm()
  );

  const [tab, setTab] = useState<'identificacao' | 'capa' | 'verificacao'>('identificacao');

  const set = (field: keyof NCFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim() || !form.detectedDate) return;
    onSave(form);
  };

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';
  const selectCls = inputCls;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {typeIcon(form.type)}
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {initial ? 'Editar NC / CAPA' : 'Registrar NC / CAPA'}
              </h2>
              <p className="text-xs text-slate-500">Não Conformidade, Observação ou Oportunidade de Melhoria</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
          {[
            { id: 'identificacao' as const, label: 'Identificação' },
            { id: 'capa' as const, label: 'Ação Corretiva (CAPA)' },
            { id: 'verificacao' as const, label: 'Verificação' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'identificacao' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Código *</label>
                  <input className={inputCls} placeholder="NC-2024-001" value={form.code}
                    onChange={(e) => set('code', e.target.value)} required />
                </div>
                <div>
                  <label className={labelCls}>Tipo *</label>
                  <select className={selectCls} value={form.type}
                    onChange={(e) => set('type', e.target.value as NCType)}>
                    {NC_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Título *</label>
                <input className={inputCls} placeholder="Descrição resumida da não conformidade" value={form.title}
                  onChange={(e) => set('title', e.target.value)} required />
              </div>

              <div>
                <label className={labelCls}>Descrição detalhada</label>
                <textarea className={inputCls} rows={2} placeholder="Descreva em detalhes o problema identificado..."
                  value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Severidade *</label>
                  <select className={selectCls} value={form.severity}
                    onChange={(e) => set('severity', e.target.value as NCSeverity)}>
                    {NC_SEVERITIES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Origem *</label>
                  <select className={selectCls} value={form.source}
                    onChange={(e) => set('source', e.target.value as NCSource)}>
                    {NC_SOURCES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status *</label>
                  <select className={selectCls} value={form.status}
                    onChange={(e) => set('status', e.target.value as NCStatus)}>
                    {NC_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Data de Detecção *</label>
                  <input type="date" className={inputCls} value={form.detectedDate}
                    onChange={(e) => set('detectedDate', e.target.value)} required />
                </div>
                <div>
                  <label className={labelCls}>Prazo para Resolução</label>
                  <input type="date" className={inputCls} value={form.deadline}
                    onChange={(e) => set('deadline', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Setor</label>
                  <input className={inputCls} placeholder="Ex: Operações Offshore" value={form.sector}
                    onChange={(e) => set('sector', e.target.value)} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Responsável pela Tratativa</label>
                <input className={inputCls} placeholder="Nome do responsável" value={form.responsible}
                  onChange={(e) => set('responsible', e.target.value)} />
              </div>

              <div>
                <label className={labelCls}>Causa Raiz</label>
                <textarea className={inputCls} rows={2} placeholder="Análise de causa raiz (5 Porquês, Ishikawa...)"
                  value={form.rootCause} onChange={(e) => set('rootCause', e.target.value)} />
              </div>
            </div>
          )}

          {tab === 'capa' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <strong>CAPA</strong> — Corrective and Preventive Action. Registre as ações imediatas,
                corretivas (elimina a causa) e preventivas (evita recorrência).
              </div>

              <div>
                <label className={labelCls}>Ação Imediata (contenção)</label>
                <textarea className={inputCls} rows={3}
                  placeholder="O que foi feito imediatamente para conter o problema?"
                  value={form.immediateAction} onChange={(e) => set('immediateAction', e.target.value)} />
              </div>

              <div>
                <label className={labelCls}>Ação Corretiva (elimina a causa)</label>
                <textarea className={inputCls} rows={3}
                  placeholder="Ação que elimina a causa raiz do problema..."
                  value={form.correctiveAction} onChange={(e) => set('correctiveAction', e.target.value)} />
              </div>

              <div>
                <label className={labelCls}>Ação Preventiva (evita recorrência)</label>
                <textarea className={inputCls} rows={3}
                  placeholder="Ação para prevenir que o problema ocorra em outros processos..."
                  value={form.preventiveAction} onChange={(e) => set('preventiveAction', e.target.value)} />
              </div>

              <div>
                <label className={labelCls}>Observações adicionais</label>
                <textarea className={inputCls} rows={2}
                  placeholder="Notas, referências normativas, evidências..."
                  value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>
            </div>
          )}

          {tab === 'verificacao' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                A <strong>verificação de eficácia</strong> confirma que a ação corretiva foi efetiva e
                que o problema não recorreu após o prazo de avaliação.
              </div>

              <div>
                <label className={labelCls}>Verificação de Eficácia</label>
                <textarea className={inputCls} rows={4}
                  placeholder="Descreva como foi verificada a eficácia das ações tomadas. Inclua evidências, datas de verificação e resultado..."
                  value={form.effectivenessCheck} onChange={(e) => set('effectivenessCheck', e.target.value)} />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                <p className="font-medium text-slate-700 mb-1">Para encerrar a NC/CAPA:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Todas as ações devem estar implementadas</li>
                  <li>A verificação de eficácia deve estar documentada</li>
                  <li>Altere o status para <strong>Encerrada</strong> na aba Identificação</li>
                </ul>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit as any}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {initial ? 'Salvar alterações' : 'Registrar NC/CAPA'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface NCCAPAScreenProps {
  items: NonConformity[];
  onSave: (data: NCFormData, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function NCCAPAScreen({ items, onSave, onDelete }: NCCAPAScreenProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<NCStatus | 'Todos'>('Todos');
  const [filterSeverity, setFilterSeverity] = useState<NCSeverity | 'Todos'>('Todos');
  const [filterType, setFilterType] = useState<NCType | 'Todos'>('Todos');
  const [filterSource, setFilterSource] = useState<NCSource | 'Todos'>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<NonConformity | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Summary stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: items.length,
    abertas: items.filter((i) => i.status === 'Aberta').length,
    em_tratamento: items.filter((i) => i.status === 'Em tratamento').length,
    aguardando: items.filter((i) => i.status === 'Aguardando verificação').length,
    encerradas: items.filter((i) => i.status === 'Encerrada').length,
    criticas: items.filter((i) => i.severity === 'Crítica' && i.status !== 'Encerrada').length,
  }), [items]);

  // ─── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      if (filterStatus !== 'Todos' && item.status !== filterStatus) return false;
      if (filterSeverity !== 'Todos' && item.severity !== filterSeverity) return false;
      if (filterType !== 'Todos' && item.type !== filterType) return false;
      if (filterSource !== 'Todos' && item.source !== filterSource) return false;
      if (q && !item.title.toLowerCase().includes(q) && !item.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, filterStatus, filterSeverity, filterType, filterSource]);

  const handleSave = async (data: NCFormData) => {
    await onSave(data, editItem?.id);
    setIsModalOpen(false);
    setEditItem(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  // ─── Deadline urgency ─────────────────────────────────────────────────────
  // Capture now once per render to keep the function pure
  const nowMs = useMemo(() => new Date().setHours(0, 0, 0, 0), []);
  const getDeadlineUrgency = useCallback((nc: NonConformity) => {
    if (!nc.deadline || nc.status === 'Encerrada') return null;
    const diff = Math.ceil((new Date(nc.deadline).getTime() - nowMs) / 86400000);
    if (diff < 0) return { label: `${Math.abs(diff)}d vencido`, cls: 'text-red-600 font-semibold' };
    if (diff <= 7) return { label: `${diff}d restantes`, cls: 'text-amber-600 font-semibold' };
    return { label: `${diff}d restantes`, cls: 'text-slate-500' };
  }, [nowMs]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            NC / CAPA
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Não Conformidades, Observações e Ações Corretivas/Preventivas
          </p>
        </div>
        <button
          onClick={() => { setEditItem(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova NC / CAPA
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, cls: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Abertas', value: stats.abertas, cls: 'text-red-700', bg: 'bg-red-50' },
          { label: 'Em Tratamento', value: stats.em_tratamento, cls: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Aguard. Verificação', value: stats.aguardando, cls: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Encerradas', value: stats.encerradas, cls: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-100`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {stats.criticas > 0 && (
        <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>
            <strong>{stats.criticas}</strong> NC{stats.criticas > 1 ? 's' : ''} crítica{stats.criticas > 1 ? 's' : ''} em aberto — atenção imediata necessária.
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            placeholder="Buscar por título ou código..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="Todos">Todos os status</option>
            {NC_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as any)}
          >
            <option value="Todos">Toda severidade</option>
            {NC_SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            value={filterType} onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="Todos">Todos os tipos</option>
            {NC_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            value={filterSource} onChange={(e) => setFilterSource(e.target.value as any)}
          >
            <option value="Todos">Todas as origens</option>
            {NC_SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma NC/CAPA encontrada</p>
          <p className="text-xs mt-1">Registre a primeira não conformidade usando o botão acima.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((nc) => {
            const expanded = expandedId === nc.id;
            const urgency = getDeadlineUrgency(nc);

            return (
              <div key={nc.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
                {/* Row header */}
                <div className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 shrink-0">{typeIcon(nc.type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-slate-500">{nc.code}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyle(nc.status)}`}>
                        {statusIcon(nc.status)} {nc.status}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${severityStyle(nc.severity)}`}>
                        {nc.severity}
                      </span>
                      {nc.source && (
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{nc.source}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{nc.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      {nc.detectedDate && (
                        <span>Detectada: {new Date(nc.detectedDate).toLocaleDateString('pt-BR')}</span>
                      )}
                      {nc.responsible && <span>Resp: {nc.responsible}</span>}
                      {nc.sector && <span>{nc.sector}</span>}
                      {urgency && <span className={urgency.cls}>{urgency.label}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditItem(nc); setIsModalOpen(true); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(nc.id)}
                      disabled={deletingId === nc.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setExpandedId(expanded ? null : nc.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {nc.description && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Descrição</p>
                        <p className="text-slate-700 text-sm">{nc.description}</p>
                      </div>
                    )}
                    {nc.rootCause && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Causa Raiz</p>
                        <p className="text-slate-700">{nc.rootCause}</p>
                      </div>
                    )}
                    {nc.immediateAction && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ação Imediata</p>
                        <p className="text-slate-700">{nc.immediateAction}</p>
                      </div>
                    )}
                    {nc.correctiveAction && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ação Corretiva (CAPA)</p>
                        <p className="text-slate-700">{nc.correctiveAction}</p>
                      </div>
                    )}
                    {nc.preventiveAction && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ação Preventiva</p>
                        <p className="text-slate-700">{nc.preventiveAction}</p>
                      </div>
                    )}
                    {nc.effectivenessCheck && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Verificação de Eficácia</p>
                        <p className="text-slate-700">{nc.effectivenessCheck}</p>
                      </div>
                    )}
                    {nc.notes && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notas</p>
                        <p className="text-slate-700">{nc.notes}</p>
                      </div>
                    )}

                    {/* Status History Timeline */}
                    {nc.statusHistory && nc.statusHistory.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Histórico de Status</p>
                        <ol className="relative border-l border-slate-200 ml-2 space-y-2">
                          {nc.statusHistory.map((entry: NCStatusHistoryEntry, idx: number) => (
                            <li key={idx} className="ml-4">
                              <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-white bg-blue-400" />
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusStyle(entry.status as NCStatus)}`}>
                                  {statusIcon(entry.status as NCStatus)}
                                  {entry.status}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {new Date(entry.changedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {entry.note && <span className="text-[11px] text-slate-500 italic">{entry.note}</span>}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <NCModal
          initial={editItem}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

export type { NCFormData };
