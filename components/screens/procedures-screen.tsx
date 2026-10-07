'use client';
'use client';
import { NewProcedureModal } from '@/components/modals/new-procedure-modal';
import { saveProcedure } from '@/lib/supabase';

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Search, 
  SlidersHorizontal, 
  LayoutList, 
  LayoutGrid, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  FileCheck2,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { Procedure, Sector, ProcedureStatus } from '@/types';

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
    const list = Array.from(new Set(procedures.map((p) => p.sector)));
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

        const matchesSector = selectedSector === 'Todos' || p.sector === selectedSector;
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

  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return { bar: 'bg-emerald-500', text: 'text-emerald-700' };
    if (rate >= 75) return { bar: 'bg-amber-500', text: 'text-amber-700' };
    return { bar: 'bg-red-500', text: 'text-red-700' };
  };

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
          <button
            onClick={onImportDocument}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Importar Documentos (PDF/Doc)</span>
          </button>

          <button
            onClick={() => setShowNewProc(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Gerar Procedimento c/ IA</span>
          </button>
        </div>
      </div>

      {/* Info Banner (Blue) */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-blue-950">
            Repositório oficial que centraliza todos os setores.
          </p>
          <p className="text-blue-800">
            Cada documento gera banco de questões automaticamente via IA para avaliação de eficácia no retorno de embarque.
          </p>
        </div>
      </div>

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

      {/* Results view: List or Grid */}
      {viewMode === 'list' ? (
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Nome do Procedimento</th>
                  <th className="py-3 px-4">Setor</th>
                  <th className="py-3 px-4">Cargo Associado</th>
                  <th className="py-3 px-4">Aplicação</th>
                  <th className="py-3 px-4 text-center">Conformidade %</th>
                  <th className="py-3 px-4">Última Revisão</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Cobertura de Avaliações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {filtered.map((proc) => {
                  const colors = getComplianceColor(proc.complianceRate);
                  return (
                    <tr
                      key={proc.id}
                      onClick={() => onSelectProcedure(proc)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Código */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-700 group-hover:underline">
                          {proc.code}
                        </span>
                      </td>

                      {/* Nome do Procedimento */}
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                        {proc.name}
                      </td>

                      {/* Setor */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {proc.sector}
                      </td>

                      {/* Cargo Associado */}
                      <td className="py-3 px-4 text-slate-600 max-w-[150px] truncate">
                        {proc.associatedRole}
                      </td>

                      {/* Aplicação */}
                      <td className="py-3 px-4 text-slate-500 max-w-[240px] truncate">
                        {proc.application}
                      </td>

                      {/* Conformidade % com barra */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1 w-24 mx-auto">
                          <span className={`font-mono font-bold text-[11px] tabular-nums ${colors.text}`}>
                            {proc.complianceRate}%
                          </span>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              style={{ width: `${proc.complianceRate}%` }}
                              className={`h-full rounded-full ${colors.bar}`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Última Revisão */}
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {proc.lastRevision}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            proc.status
                          )}`}
                        >
                          {proc.status}
                        </span>
                      </td>

                      {/* Cobertura de Avaliações */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-semibold font-mono text-[11px] border border-blue-200">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>{proc.questionsCount} questões</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proc) => {
            const colors = getComplianceColor(proc.complianceRate);
            return (
              <div
                key={proc.id}
                onClick={() => onSelectProcedure(proc)}
                className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {proc.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                        proc.status
                      )}`}
                    >
                      {proc.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {proc.name}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {proc.application}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Setor:</span>
                    <span className="font-semibold text-slate-800">{proc.sector}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Cargo:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                      {proc.associatedRole}
                    </span>
                  </div>

                  {/* Compliance bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-500">Conformidade:</span>
                      <span className={`font-bold ${colors.text}`}>{proc.complianceRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        style={{ width: `${proc.complianceRate}%` }}
                        className={`h-full rounded-full ${colors.bar}`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Rev: {proc.lastRevision}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {proc.questionsCount} questões
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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