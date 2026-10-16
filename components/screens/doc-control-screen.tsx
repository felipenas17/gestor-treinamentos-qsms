'use client';

import React, { useState, useMemo } from 'react';
import {
  Shield, Search, LayoutList, LayoutGrid, Plus, AlertCircle,
  CheckCircle2, Clock, HelpCircle, FileText, Calendar, User,
  Building2, ExternalLink, Filter,
} from 'lucide-react';
import { DocControl, DocStatus } from '@/types';
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocControlScreenProps {
  documents: DocControl[];
  onDocumentSaved: (data: {
    code: string; name: string; docType: string; issuingBody?: string;
    issueDate?: string; expiryDate?: string; renewalMonths?: number;
    responsible?: string; notes?: string; file?: File | null; base?: string;
  }) => Promise<void>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DocControlScreen({ documents, onDocumentSaved }: DocControlScreenProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState<DocStatus | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<DocStatus | null>(null);
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);

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
        <ListView docs={filtered} />
      ) : (
        <GridView docs={filtered} />
      )}

      {isNewDocOpen && (
        <NewDocModal
          onSaved={handleSaved}
          onClose={() => setIsNewDocOpen(false)}
        />
      )}
    </div>
  );
}

// ─── List View ───────────────────────────────────────────────────────────────

function ListView({ docs }: { docs: DocControl[] }) {
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
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Emissão</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Vencimento</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Responsável</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Arquivo</th>
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
                  <td className="px-4 py-3 max-w-[220px]">
                    <span className="font-medium text-slate-800 line-clamp-2">{d.name}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{d.docType}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">{d.issuingBody || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">{fmtDate(d.issueDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">{fmtDate(d.expiryDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.classes}`}>
                      {badge.icon}{badge.label}
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
