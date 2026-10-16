'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  ClipboardCheck, Search, Plus, AlertCircle,
  CheckCircle2, Clock, HelpCircle, User, Calendar,
  RefreshCw, Filter, Link2, History, FileText, X,
  Paperclip, ExternalLink,
} from 'lucide-react';
import { LegalObligation, ObligationStatus, ExecutionStatus, ObligationRealization, DocControl } from '@/types';
import { NewObligationModal } from '@/components/modals/new-obligation-modal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

function getStatusBadge(s: ObligationStatus) {
  switch (s) {
    case 'Vigente':
      return {
        label: 'Vigente',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    case 'Próximo':
      return {
        label: 'Vence em breve',
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Clock className="w-3 h-3" />,
      };
    case 'Vencido':
      return {
        label: 'Vencido',
        classes: 'bg-red-50 text-red-700 border-red-200',
        icon: <AlertCircle className="w-3 h-3" />,
      };
    default:
      return {
        label: 'Indefinido',
        classes: 'bg-slate-100 text-slate-500 border-slate-200',
        icon: <HelpCircle className="w-3 h-3" />,
      };
  }
}

function getExecBadge(s: ExecutionStatus) {
  switch (s) {
    case 'Concluído':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Em andamento':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Parcial':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-500 border-slate-200';
  }
}

// ─── Summary Tile ─────────────────────────────────────────────────────────────

interface TileProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  colorClasses: string;
  active: boolean;
  onClick: () => void;
}

function SummaryTile({ label, count, icon, colorClasses, active, onClick }: TileProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[130px] flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left
        ${active ? 'ring-2 ring-offset-1 ring-indigo-500 shadow-sm' : 'hover:shadow-sm'}
        ${colorClasses}`}
    >
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-xl font-bold leading-none">{count}</div>
        <div className="text-xs mt-0.5 opacity-80">{label}</div>
      </div>
    </button>
  );
}

// ─── Registrar Realização Modal ───────────────────────────────────────────────

interface RegisterRealizationModalProps {
  obligation: LegalObligation;
  onConfirm: (data: {
    obligationId: string;
    doneDate: string;
    notes?: string;
    executionStatus: string;
    file?: File | null;
  }) => Promise<void>;
  onClose: () => void;
}

const EXEC_STATUSES: ExecutionStatus[] = ['Pendente', 'Em andamento', 'Parcial', 'Concluído'];

function RegisterRealizationModal({ obligation, onConfirm, onClose }: RegisterRealizationModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [execStatus, setExecStatus] = useState<ExecutionStatus>(
    obligation.executionStatus === 'Concluído' ? 'Concluído' : 'Em andamento'
  );
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!date) return;
    setSaving(true);
    await onConfirm({
      obligationId: obligation.id,
      doneDate: date,
      notes: notes.trim() || undefined,
      executionStatus: execStatus,
      file: file || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registrar Realização</h3>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">{obligation.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Data */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Realização *</label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              A próxima data de vencimento será recalculada automaticamente.
            </p>
          </div>

          {/* Status de Execução */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status de Execução</label>
            <div className="grid grid-cols-2 gap-2">
              {EXEC_STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setExecStatus(s)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    execStatus === s
                      ? `${getExecBadge(s)} ring-2 ring-offset-1 ring-current`
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observações</label>
            <textarea
              rows={3}
              placeholder="Empresa prestadora, nº do relatório, condições observadas…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Anexo PDF */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Relatório / Evidência (PDF)</label>
            <div
              className={`flex items-center gap-3 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                file ? 'border-emerald-300 bg-emerald-50' : 'border-dashed border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
              }`}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className={`w-4 h-4 shrink-0 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className={`text-xs flex-1 truncate ${file ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                {file ? file.name : 'Clique para selecionar um PDF…'}
              </span>
              {file && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !date}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg"
            >
              {saving ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Histórico Modal ──────────────────────────────────────────────────────────

interface HistoryModalProps {
  obligation: LegalObligation;
  onLoad: (obligationId: string) => Promise<ObligationRealization[]>;
  onClose: () => void;
}

function HistoryModal({ obligation, onLoad, onClose }: HistoryModalProps) {
  const [realizations, setRealizations] = useState<ObligationRealization[] | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let cancelled = false;
    onLoad(obligation.id).then(data => {
      if (!cancelled) {
        setRealizations(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [obligation.id, onLoad]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <History className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Histórico de Realizações</h3>
              <p className="text-xs text-slate-400 truncate max-w-[260px]">{obligation.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="w-5 h-5 text-slate-300 animate-spin" />
            </div>
          ) : !realizations || realizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-400">Nenhuma realização registrada</p>
              <p className="text-xs text-slate-300 mt-1">Use o botão &quot;Registrar&quot; para iniciar o histórico.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {realizations.map((r, idx) => (
                <div
                  key={r.id}
                  className="relative pl-5 border-l-2 border-slate-200 pb-3 last:pb-0"
                >
                  {/* Timeline dot */}
                  <span className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${idx === 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {fmtDate(r.doneDate)}
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                            Mais recente
                          </span>
                        )}
                      </div>
                      {r.notes && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{r.notes}</p>
                      )}
                    </div>
                    {r.fileUrl && (
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg"
                      >
                        <FileText className="w-3 h-3" />
                        {r.fileName ? r.fileName.split('.')[0].slice(0, 16) : 'PDF'}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-300 mt-1">
                    Registrado em {fmtDate(r.createdAt?.split('T')[0])}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LegalObligationsScreenProps {
  obligations: LegalObligation[];
  documents: DocControl[];
  onObligationSaved: (data: {
    title: string; description?: string; frequency: string;
    responsible?: string; lastDoneDate?: string;
    base?: string; docControlId?: string; notes?: string;
  }) => Promise<void>;
  onAddRealization: (data: {
    obligationId: string;
    doneDate: string;
    notes?: string;
    executionStatus: string;
    file?: File | null;
  }) => Promise<void>;
  onLoadRealizations: (obligationId: string) => Promise<ObligationRealization[]>;
}

// ─── Component ───────────────────────────────────────────────────────────────

const BASES = ['Base Macaé', 'Base Rio das Ostras', 'Base Duque de Caxias', 'Base Bahia'];

export function LegalObligationsScreen({
  obligations,
  documents,
  onObligationSaved,
  onAddRealization,
  onLoadRealizations,
}: LegalObligationsScreenProps) {
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [registerTarget, setRegisterTarget] = useState<LegalObligation | null>(null);
  const [historyTarget, setHistoryTarget] = useState<LegalObligation | null>(null);
  const [search, setSearch] = useState('');
  const [filterBase, setFilterBase] = useState('');
  const [filterStatus, setFilterStatus] = useState<ObligationStatus | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<ObligationStatus | null>(null);

  // ── Counts for summary strip ──
  const counts = useMemo(() => ({
    vencido: obligations.filter(o => o.status === 'Vencido').length,
    proximo: obligations.filter(o => o.status === 'Próximo').length,
    vigente: obligations.filter(o => o.status === 'Vigente').length,
    indefinido: obligations.filter(o => o.status === 'Indefinido').length,
  }), [obligations]);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const activeStatus = selectedStatus || filterStatus;
    return obligations.filter(o => {
      const matchSearch = !q || [o.title, o.description, o.responsible, o.frequency, o.base]
        .some(f => f?.toLowerCase().includes(q));
      const matchBase = !filterBase || o.base === filterBase;
      const matchStatus = !activeStatus || o.status === activeStatus;
      return matchSearch && matchBase && matchStatus;
    });
  }, [obligations, search, filterBase, filterStatus, selectedStatus]);

  const toggleStatus = (s: ObligationStatus) => {
    setSelectedStatus(prev => prev === s ? null : s);
    setFilterStatus('');
  };

  const handleSaved = async (form: any) => {
    await onObligationSaved({
      title: form.title,
      description: form.description || undefined,
      frequency: form.frequency,
      responsible: form.responsible || undefined,
      lastDoneDate: form.lastDoneDate || undefined,
      base: form.base || undefined,
      docControlId: form.docControlId || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Obrigações Legais</h1>
            <p className="text-xs text-slate-400">Controle de cumprimento de requisitos periódicos</p>
          </div>
        </div>
        <button
          onClick={() => setIsNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Obrigação
        </button>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        <SummaryTile
          label="Vencidas"
          count={counts.vencido}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          colorClasses="bg-red-50 border-red-200 text-red-800"
          active={selectedStatus === 'Vencido'}
          onClick={() => toggleStatus('Vencido')}
        />
        <SummaryTile
          label="Vence em Breve"
          count={counts.proximo}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          colorClasses="bg-amber-50 border-amber-200 text-amber-800"
          active={selectedStatus === 'Próximo'}
          onClick={() => toggleStatus('Próximo')}
        />
        <SummaryTile
          label="Em Dia"
          count={counts.vigente}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          colorClasses="bg-emerald-50 border-emerald-200 text-emerald-800"
          active={selectedStatus === 'Vigente'}
          onClick={() => toggleStatus('Vigente')}
        />
        <SummaryTile
          label="Sem Registro"
          count={counts.indefinido}
          icon={<HelpCircle className="w-5 h-5 text-slate-500" />}
          colorClasses="bg-slate-50 border-slate-200 text-slate-600"
          active={selectedStatus === 'Indefinido'}
          onClick={() => toggleStatus('Indefinido')}
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar obrigação, responsável…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          <select
            value={filterBase}
            onChange={e => setFilterBase(e.target.value)}
            className="pl-7 pr-6 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none"
          >
            <option value="">Todas as Bases</option>
            {BASES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value as ObligationStatus | ''); setSelectedStatus(null); }}
          className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Todos os Status</option>
          <option value="Vigente">Em Dia</option>
          <option value="Próximo">Vence em Breve</option>
          <option value="Vencido">Vencido</option>
          <option value="Indefinido">Sem Registro</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardCheck className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-400">Nenhuma obrigação encontrada</p>
          <p className="text-xs text-slate-300 mt-1">
            {obligations.length === 0
              ? 'Cadastre os requisitos periódicos das licenças da empresa.'
              : 'Tente outros filtros.'}
          </p>
          {obligations.length === 0 && (
            <button
              onClick={() => setIsNewOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
            >
              + Nova Obrigação
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Obrigação</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Frequência</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Base</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Responsável</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Última Realização</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Próxima Data</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Status Prazo</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Execução</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Vínculo</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => {
                  const badge = getStatusBadge(o.status);
                  const execClasses = getExecBadge(o.executionStatus);
                  const linkedDoc = documents.find(d => d.id === o.docControlId);
                  return (
                    <tr
                      key={o.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/60 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                    >
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="font-medium text-slate-800 line-clamp-2">{o.title}</span>
                        {o.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{o.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{o.frequency}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{o.base || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {o.responsible
                          ? <span className="flex items-center gap-1"><User className="w-3 h-3" />{o.responsible}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {o.lastDoneDate
                          ? <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(o.lastDoneDate)}</span>
                          : <span className="text-slate-300">Não registrado</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        <span className={
                          o.status === 'Vencido' ? 'text-red-600' :
                          o.status === 'Próximo' ? 'text-amber-600' : 'text-slate-700'
                        }>
                          {fmtDate(o.nextDueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.classes}`}>
                          {badge.icon}{badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${execClasses}`}>
                          {o.executionStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {linkedDoc
                          ? <span className="flex items-center gap-1 text-slate-500"><Link2 className="w-3 h-3 text-indigo-400" />{linkedDoc.code}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setRegisterTarget(o)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Registrar
                          </button>
                          <button
                            onClick={() => setHistoryTarget(o)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            title="Histórico de realizações"
                          >
                            <History className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} obrigação{filtered.length !== 1 ? 'ões' : ''}
          </div>
        </div>
      )}

      {/* Modals */}
      {isNewOpen && (
        <NewObligationModal
          documents={documents}
          onSaved={handleSaved}
          onClose={() => setIsNewOpen(false)}
        />
      )}
      {registerTarget && (
        <RegisterRealizationModal
          obligation={registerTarget}
          onConfirm={onAddRealization}
          onClose={() => setRegisterTarget(null)}
        />
      )}
      {historyTarget && (
        <HistoryModal
          obligation={historyTarget}
          onLoad={onLoadRealizations}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}
