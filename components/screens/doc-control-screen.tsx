'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Shield, Search, LayoutList, LayoutGrid, Plus, AlertCircle,
  CheckCircle2, Clock, HelpCircle, FileText, Calendar, User,
  Building2, ExternalLink, Filter, History, RefreshCw, X,
  Paperclip,
} from 'lucide-react';
import { DocControl, DocStatus, RenewalStatus, DocControlRenewal } from '@/types';
import { NewDocModal } from '@/components/modals/new-doc-modal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR');
}

function getDocStatusBadge(s?: DocStatus) {
  switch (s) {
    case 'Vigente':
      return {
        label: 'Vigente',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    case 'Para Renovar':
      return {
        label: 'Para Renovar',
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

function getRenewalBadge(s: RenewalStatus): string {
  switch (s) {
    case 'Concluído':         return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Em processo':       return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Aguardando aprovação': return 'bg-amber-50 text-amber-700 border-amber-200';
    default:                  return 'bg-slate-100 text-slate-500 border-slate-200';
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
        ${active ? 'ring-2 ring-offset-1 ring-blue-500 shadow-sm' : 'hover:shadow-sm'}
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

// ─── Registrar Renovação Modal ────────────────────────────────────────────────

interface RegisterRenewalModalProps {
  doc: DocControl;
  onConfirm: (data: {
    docControlId: string;
    eventDate: string;
    notes?: string;
    renewalStatus: string;
    file?: File | null;
  }) => Promise<void>;
  onClose: () => void;
}

const RENEWAL_STATUSES: RenewalStatus[] = [
  'Não iniciado',
  'Em processo',
  'Aguardando aprovação',
  'Concluído',
];

function RegisterRenewalModal({ doc, onConfirm, onClose }: RegisterRenewalModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [renewalStatus, setRenewalStatus] = useState<RenewalStatus>(
    doc.renewalStatus === 'Não iniciado' ? 'Em processo' : doc.renewalStatus
  );
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!date) return;
    setSaving(true);
    await onConfirm({
      docControlId: doc.id,
      eventDate: date,
      notes: notes.trim() || undefined,
      renewalStatus,
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
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registrar Renovação</h3>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">{doc.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Data */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data do Evento *</label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status de Renovação */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Etapa da Renovação</label>
            <div className="grid grid-cols-2 gap-2">
              {RENEWAL_STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRenewalStatus(s)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    renewalStatus === s
                      ? `${getRenewalBadge(s)} ring-2 ring-offset-1 ring-current`
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
              placeholder="Protocolo entregue, nº de processo, órgão responsável…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Anexo PDF */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Documento / Protocolo (PDF)</label>
            <div
              className={`flex items-center gap-3 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                file ? 'border-blue-300 bg-blue-50' : 'border-dashed border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              }`}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className={`w-4 h-4 shrink-0 ${file ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-xs flex-1 truncate ${file ? 'text-blue-700 font-medium' : 'text-slate-400'}`}>
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
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
            >
              {saving ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Histórico de Renovações Modal ───────────────────────────────────────────

interface RenewalHistoryModalProps {
  doc: DocControl;
  onLoad: (docControlId: string) => Promise<DocControlRenewal[]>;
  onClose: () => void;
}

function RenewalHistoryModal({ doc, onLoad, onClose }: RenewalHistoryModalProps) {
  const [renewals, setRenewals] = useState<DocControlRenewal[] | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let cancelled = false;
    onLoad(doc.id).then(data => {
      if (!cancelled) {
        setRenewals(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [doc.id, onLoad]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center">
              <History className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Histórico de Renovações</h3>
              <p className="text-xs text-slate-400 truncate max-w-[260px]">{doc.name}</p>
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
          ) : !renewals || renewals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-400">Nenhum evento registrado</p>
              <p className="text-xs text-slate-300 mt-1">Use o botão &quot;Renovar&quot; para iniciar o histórico.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {renewals.map((r, idx) => (
                <div
                  key={r.id}
                  className="relative pl-5 border-l-2 border-slate-200 pb-3 last:pb-0"
                >
                  {/* Timeline dot */}
                  <span className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${idx === 0 ? 'bg-blue-500' : 'bg-slate-300'}`} />

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {fmtDate(r.eventDate)}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full border ${getRenewalBadge(r.renewalStatus)}`}>
                          {r.renewalStatus}
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
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
                        className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
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

interface DocControlScreenProps {
  documents: DocControl[];
  onDocumentSaved: (data: {
    code: string; name: string; docType: string; issuingBody?: string;
    issueDate?: string; expiryDate?: string; renewalMonths?: number;
    responsible?: string; notes?: string; file?: File | null; base?: string;
  }) => Promise<void>;
  onAddRenewal?: (data: {
    docControlId: string; eventDate: string; notes?: string;
    renewalStatus: string; file?: File | null;
  }) => Promise<void>;
  onLoadRenewals?: (docControlId: string) => Promise<DocControlRenewal[]>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DocControlScreen({
  documents,
  onDocumentSaved,
  onAddRenewal,
  onLoadRenewals,
}: DocControlScreenProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState<DocStatus | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<DocStatus | null>(null);
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);

  // Renewal modals
  const [renewalDoc, setRenewalDoc] = useState<DocControl | null>(null);
  const [historyDoc, setHistoryDoc] = useState<DocControl | null>(null);

  // ── Counts for summary strip ──
  const counts = useMemo(() => ({
    vencido: documents.filter(d => d.docStatus === 'Vencido').length,
    paraRenovar: documents.filter(d => d.docStatus === 'Para Renovar').length,
    vigente: documents.filter(d => d.docStatus === 'Vigente').length,
    indefinido: documents.filter(d => !d.docStatus || d.docStatus === 'Indefinido').length,
  }), [documents]);

  // ── All distinct doc types ──
  const docTypes = useMemo(() =>
    Array.from(new Set(documents.map(d => d.docType))).sort(),
    [documents]
  );

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const activeStatus = selectedStatus || filterStatus;
    return documents.filter(d => {
      const matchesSearch = !q || [d.code, d.name, d.docType, d.issuingBody, d.responsible]
        .some(f => f?.toLowerCase().includes(q));
      const matchesType = !filterType || d.docType === filterType;
      const matchesStatus = !activeStatus
        || (activeStatus === 'Indefinido' ? (!d.docStatus || d.docStatus === 'Indefinido') : d.docStatus === activeStatus);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [documents, search, filterType, filterStatus, selectedStatus]);

  const toggleStatus = (s: DocStatus) => {
    setSelectedStatus(prev => prev === s ? null : s);
    setFilterStatus('');
  };

  const handleSaved = async (form: any) => {
    await onDocumentSaved({
      code: form.code,
      name: form.name,
      docType: form.docType,
      issuingBody: form.issuingBody || undefined,
      issueDate: form.issueDate || undefined,
      expiryDate: form.expiryDate || undefined,
      renewalMonths: form.renewalMonths ? Number(form.renewalMonths) : 12,
      responsible: form.responsible || undefined,
      notes: form.notes || undefined,
      file: form.file ?? undefined,
      base: form.base || undefined,
    });
  };

  const handleAddRenewal = async (data: {
    docControlId: string; eventDate: string; notes?: string;
    renewalStatus: string; file?: File | null;
  }) => {
    if (onAddRenewal) await onAddRenewal(data);
    setRenewalDoc(null);
  };

  const handleLoadRenewals = async (docControlId: string): Promise<DocControlRenewal[]> => {
    if (onLoadRenewals) return onLoadRenewals(docControlId);
    return [];
  };

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Controle Documental</h1>
            <p className="text-xs text-slate-400">Licenças, alvarás e autorizações institucionais</p>
          </div>
        </div>
        <button
          onClick={() => setIsNewDocOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Documento
        </button>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        <SummaryTile
          label="Vencidos"
          count={counts.vencido}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          colorClasses="bg-red-50 border-red-200 text-red-800"
          active={selectedStatus === 'Vencido'}
          onClick={() => toggleStatus('Vencido')}
        />
        <SummaryTile
          label="Para Renovar"
          count={counts.paraRenovar}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          colorClasses="bg-amber-50 border-amber-200 text-amber-800"
          active={selectedStatus === 'Para Renovar'}
          onClick={() => toggleStatus('Para Renovar')}
        />
        <SummaryTile
          label="Vigentes"
          count={counts.vigente}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          colorClasses="bg-emerald-50 border-emerald-200 text-emerald-800"
          active={selectedStatus === 'Vigente'}
          onClick={() => toggleStatus('Vigente')}
        />
        <SummaryTile
          label="Indefinidos"
          count={counts.indefinido}
          icon={<HelpCircle className="w-5 h-5 text-slate-500" />}
          colorClasses="bg-slate-50 border-slate-200 text-slate-600"
          active={selectedStatus === 'Indefinido'}
          onClick={() => toggleStatus('Indefinido')}
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar documento, código…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Type filter */}
        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="pl-7 pr-6 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
          >
            <option value="">Todos os Tipos</option>
            {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value as DocStatus | ''); setSelectedStatus(null); }}
          className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos os Status</option>
          <option value="Vigente">Vigente</option>
          <option value="Para Renovar">Para Renovar</option>
          <option value="Vencido">Vencido</option>
          <option value="Indefinido">Indefinido</option>
        </select>

        {/* View toggle */}
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Shield className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-400">Nenhum documento encontrado</p>
          <p className="text-xs text-slate-300 mt-1">
            {documents.length === 0
              ? 'Comece cadastrando a primeira licença ou alvará.'
              : 'Tente outros filtros.'}
          </p>
          {documents.length === 0 && (
            <button
              onClick={() => setIsNewDocOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
            >
              + Novo Documento
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <ListView
          docs={filtered}
          onRenew={onAddRenewal ? d => setRenewalDoc(d) : undefined}
          onHistory={onLoadRenewals ? d => setHistoryDoc(d) : undefined}
        />
      ) : (
        <GridView docs={filtered} />
      )}

      {isNewDocOpen && (
        <NewDocModal
          onSaved={handleSaved}
          onClose={() => setIsNewDocOpen(false)}
        />
      )}

      {renewalDoc && (
        <RegisterRenewalModal
          doc={renewalDoc}
          onConfirm={handleAddRenewal}
          onClose={() => setRenewalDoc(null)}
        />
      )}

      {historyDoc && (
        <RenewalHistoryModal
          doc={historyDoc}
          onLoad={handleLoadRenewals}
          onClose={() => setHistoryDoc(null)}
        />
      )}
    </div>
  );
}

// ─── List View ───────────────────────────────────────────────────────────────

interface ListViewProps {
  docs: DocControl[];
  onRenew?: (doc: DocControl) => void;
  onHistory?: (doc: DocControl) => void;
}

function ListView({ docs, onRenew, onHistory }: ListViewProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Código</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Nome / Descrição</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Tipo</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Órgão Emissor</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Vencimento</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Renovação</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Responsável</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Arquivo</th>
              {(onRenew || onHistory) && (
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {docs.map((d, i) => {
              const badge = getDocStatusBadge(d.docStatus);
              return (
                <tr key={d.id} className={`border-b border-slate-50 hover:bg-slate-50/60 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                      {d.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="font-medium text-slate-800 line-clamp-2">{d.name}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{d.docType}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">{d.issuingBody || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">{fmtDate(d.expiryDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.classes}`}>
                      {badge.icon}{badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getRenewalBadge(d.renewalStatus)}`}>
                      {d.renewalStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {d.responsible
                      ? <span className="flex items-center gap-1"><User className="w-3 h-3" />{d.responsible}</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {d.fileUrl
                      ? <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                          <ExternalLink className="w-3 h-3" />Abrir
                        </a>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  {(onRenew || onHistory) && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {onRenew && (
                          <button
                            onClick={() => onRenew(d)}
                            title="Registrar renovação"
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Renovar
                          </button>
                        )}
                        {onHistory && (
                          <button
                            onClick={() => onHistory(d)}
                            title="Ver histórico"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-transparent hover:border-blue-200"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
        {docs.length} documento{docs.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// ─── Grid View ───────────────────────────────────────────────────────────────

function GridView({ docs }: { docs: DocControl[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {docs.map(d => {
        const badge = getDocStatusBadge(d.docStatus);
        return (
          <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 hover:shadow-sm">
            {/* Header: code + status */}
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {d.code}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${badge.classes}`}>
                {badge.icon}{badge.label}
              </span>
            </div>

            {/* Name */}
            <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{d.name}</p>

            {/* Renewal status */}
            <span className={`self-start inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getRenewalBadge(d.renewalStatus)}`}>
              Renovação: {d.renewalStatus}
            </span>

            {/* Type + issuing body */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <FileText className="w-3 h-3 shrink-0" />
              <span className="truncate">{d.docType}</span>
            </div>
            {d.issuingBody && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 -mt-2">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{d.issuingBody}</span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-2 mt-auto space-y-1">
              {/* Expiry */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-slate-400"><Calendar className="w-3 h-3" />Vencimento</span>
                <span className={`font-semibold ${d.docStatus === 'Vencido' ? 'text-red-600' : d.docStatus === 'Para Renovar' ? 'text-amber-600' : 'text-slate-700'}`}>
                  {fmtDate(d.expiryDate)}
                </span>
              </div>

              {/* Responsible */}
              {d.responsible && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <User className="w-3 h-3" />
                  <span className="truncate">{d.responsible}</span>
                </div>
              )}

              {/* File link */}
              {d.fileUrl && (
                <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1">
                  <ExternalLink className="w-3 h-3" />Abrir arquivo
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
