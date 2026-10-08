'use client';
import { NewProcedureModal } from '@/components/modals/new-procedure-modal';
import { saveProcedure } from '@/lib/supabase';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Sparkles,
  Search,
  LayoutList,
  LayoutGrid,
  HelpCircle,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';
import { Procedure, ProcedureStatus } from '@/types';

interface ProceduresScreenProps {
  procedures: Procedure[];
  onOpenNewProcedureAiModal: () => void;
  onSelectProcedure: (procedure: Procedure) => void;
  onImportDocument: () => void;
}

export function ProceduresScreen({
  procedures,
  onOpenNewProcedureAiModal,
  onSelectProcedure,
  onImportDocument,
}: ProceduresScreenProps) {
  const [showNewProc, setShowNewProc] = useState(false);

  const handleProcSaved = async (data: any) => {
    await saveProcedure(data);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('Todos');
  const [selectedRole, setSelectedRole] = useState<string>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [selectedOrder, setSelectedOrder] = useState<'Completo' | 'Maior Conformidade' | 'Menor Conformidade'>('Completo');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Available filters
  const roles = useMemo(() => {
    const list = Array.from(new Set(procedures.map((p) => p.associatedRole)));
    return ['Todos', ...list];
  }, [procedures]);

  const sectors = useMemo(() => {
    const list = Array.from(new Set(procedures.flatMap((p) => p.sectors ?? [p.sector])));
    return ['Todos', ...list];
  }, [procedures]);

  // Filtered procedures
  const filtered = useMemo(() => {
    return procedures
      .filter((p) => {
        const matchesSearch =
          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.application.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSector = selectedSector === 'Todos' || (p.sectors ?? [p.sector]).includes(selectedSector);
        const matchesRole = selectedRole === 'Todos' || p.associatedRole === selectedRole;
        const matchesStatus = selectedStatus === 'Todos' || p.status === selectedStatus;

        return matchesSearch && matchesSector && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        if (selectedOrder === 'Maior Conformidade') return b.complianceRate - a.complianceRate;
        if (selectedOrder === 'Menor Conformidade') return a.complianceRate - b.complianceRate;
        return a.code.localeCompare(b.code);
      });
  }, [procedures, searchTerm, selectedSector, selectedRole, selectedStatus, selectedOrder]);

  const getStatusBadge = (status: ProcedureStatus) => {
    switch (status) {
      case 'Ativo':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Em Revisão':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Arquivado':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Biblioteca de Procedimentos & POPs
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Acervo unificado de Procedimentos Operacionais Padrão e banco de questões normativas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botão Importar Documentos — modal não ativo */}
          <button
            onClick={() => setShowNewProc(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Gerar Procedimento c/ IA</span>
          </button>
        </div>
      </div>

      {/* Info Banner — oculto até modal estar ativo */}

      {/* Filters Row */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código (ex: POP-OP-014), nome ou aplicação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Ordem */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Ordem:</span>
              <select
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value as any)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Completo">Completo</option>
                <option value="Maior Conformidade">Maior Conformidade</option>
                <option value="Menor Conformidade">Menor Conformidade</option>
              </select>
            </div>

            {/* Setor */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Setor:</span>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Cargo Associado */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Cargo:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[140px] truncate"
              >
                {[...new Set(roles)].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Status Gestão */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Gestão:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Em Revisão">Em Revisão</option>
                <option value="Arquivado">Arquivado</option>
              </select>
            </div>

            {/* Lista/Grid toggle */}
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50 p-0.5 ml-auto sm:ml-0">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white shadow-xs text-blue-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Modo Lista"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-xs text-blue-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Modo Grade"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results view */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-slate-300 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-slate-400"/>
          </div>
          <p className="text-sm font-semibold text-slate-700">Nenhum procedimento cadastrado</p>
          <p className="text-xs text-slate-400 max-w-xs">
            {searchTerm || selectedStatus !== 'Todos' || selectedSector !== 'Todos'
              ? 'Nenhum procedimento encontrado com os filtros atuais.'
              : 'Clique em "Gerar Procedimento c/ IA" para cadastrar o primeiro.'}
          </p>
          {!searchTerm && selectedStatus === 'Todos' && selectedSector === 'Todos' && (
            <button onClick={() => setShowNewProc(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
              <PlusCircle className="w-4 h-4"/> Cadastrar procedimento
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4 text-center">Rev.</th>
                  <th className="py-3 px-4">Nome do Procedimento</th>
                  <th className="py-3 px-4">Setores</th>
                  <th className="py-3 px-4 text-center">Criticidade</th>
                  <th className="py-3 px-4 text-center">Validade</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">PDF</th>
                  <th className="py-3 px-4 text-center">Questões</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {filtered.map((proc) => (
                  <tr key={proc.id}
                    onClick={() => onSelectProcedure(proc)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-blue-700 group-hover:underline">
                        {proc.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {proc.revision ?? 'R00'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[220px] truncate">
                      {proc.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[180px]">
                      {proc.sectors && proc.sectors.length > 0
                        ? proc.sectors.map(s => (
                          <span key={s} className="inline-block mr-1 mb-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">{s}</span>
                        ))
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        proc.criticality === 'Alta' ? 'bg-red-50 text-red-700 border-red-200'
                        : proc.criticality === 'Média' ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>{proc.criticality}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {proc.validityMonths}m
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(proc.status)}`}>
                        {proc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                      {proc.fileUrl
                        ? <a href={proc.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 text-[10px] font-semibold">
                            <ExternalLink className="w-3 h-3"/> Ver
                          </a>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-semibold font-mono text-[11px] border border-blue-200">
                        <HelpCircle className="w-3.5 h-3.5"/>
                        {proc.questionsCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proc) => (
            <div key={proc.id}
              onClick={() => onSelectProcedure(proc)}
              className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {proc.code}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(proc.status)}`}>
                    {proc.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{proc.name}</h3>
                {proc.description && <p className="text-xs text-slate-500 line-clamp-2">{proc.description}</p>}
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                {proc.sectors && proc.sectors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {proc.sectors.map(s => (
                      <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">{s}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    proc.criticality === 'Alta' ? 'bg-red-50 text-red-700 border-red-200'
                    : proc.criticality === 'Média' ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>{proc.criticality}</span>
                  <span className="text-[11px] font-mono text-slate-400">{proc.validityMonths} meses</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  {proc.fileUrl
                    ? <a href={proc.fileUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-blue-600 text-[11px] font-medium hover:underline">
                        <ExternalLink className="w-3 h-3"/> Ver PDF
                      </a>
                    : <span/>}
                  <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {proc.questionsCount} questões
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showNewProc && (
        <NewProcedureModal
          onSaved={handleProcSaved}
          onClose={() => setShowNewProc(false)}
        />
      )}
    </div>
  );
}