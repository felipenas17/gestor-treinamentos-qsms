'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  FileCheck2, 
  Download, 
  PlusCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  Send,
  Printer
} from 'lucide-react';
import { TrainingRecord, ComplianceStatus, Sector } from '@/types';

interface MatrixScreenProps {
  records: TrainingRecord[];
  onRegisterTraining: () => void;
  onExportData: (format: 'csv' | 'json' | 'print') => void;
  onScheduleExam: (record: TrainingRecord) => void;
  onNotifyEmployee: (record: TrainingRecord) => void;
}

export function MatrixScreen({
  records,
  onRegisterTraining,
  onExportData,
  onScheduleExam,
  onNotifyEmployee,
}: MatrixScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('Todos');
  const [selectedRole, setSelectedRole] = useState<string>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');

  // Filter options
  const sectors = useMemo(() => {
    const list = Array.from(new Set(records.map((r) => r.sector)));
    return ['Todos', ...list];
  }, [records]);

  const roles = useMemo(() => {
    const list = Array.from(new Set(records.map((r) => r.employeeRole)));
    return ['Todos', ...list];
  }, [records]);

  // Filtered list
  const filtered = useMemo(() => {
    return records.filter((rec) => {
      const matchSearch =
        rec.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.employeeRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.procedureCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.procedureName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSector = selectedSector === 'Todos' || rec.sector === selectedSector;
      const matchRole = selectedRole === 'Todos' || rec.employeeRole === selectedRole;
      const matchStatus = selectedStatus === 'Todos' || rec.status === selectedStatus;

      return matchSearch && matchSector && matchRole && matchStatus;
    });
  }, [records, searchTerm, selectedSector, selectedRole, selectedStatus]);

  const getStatusBadge = (status: ComplianceStatus) => {
    switch (status) {
      case 'Certificado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Reciclar':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Vencido':
        return 'bg-red-50 text-red-700 border-red-200';
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
            Matriz de Treinamentos & Colaboradores
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registro de prontidão individual e conformidade da tripulação marítima
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <button
              onClick={() => onExportData('csv')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exportar Dados</span>
            </button>
          </div>

          <button
            onClick={onRegisterTraining}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Treinamento</span>
          </button>
        </div>
      </div>

      {/* KPI Row (4 KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Certificações
          </span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
            478
          </p>
          <span className="text-[11px] text-slate-500 font-medium">Histórico acumulado</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Certificações Ativas
          </span>
          <p className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums mt-1">
            428
          </p>
          <span className="text-[11px] text-blue-700 font-medium">89.5% da meta anual</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Vencendo (60 dias)
          </span>
          <p className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">
            38
          </p>
          <span className="text-[11px] text-amber-700 font-medium">Reciclagens agendadas</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Vencidas
          </span>
          <p className="text-2xl font-extrabold text-red-600 font-mono tabular-nums mt-1">
            12
          </p>
          <span className="text-[11px] text-red-700 font-medium">Bloqueio operacional</span>
        </div>
      </div>

      {/* Filters Row */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar colaborador, cargo ou POP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter selects */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Cargo setor */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Cargo:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[140px] truncate"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Setor/Área */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Setor/Área:</span>
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

            {/* Status Cargo */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todos">Todos</option>
                <option value="Certificado">Certificado</option>
                <option value="Reciclar">Reciclar</option>
                <option value="Vencido">Vencido</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Setor</th>
                <th className="py-3 px-4">Treinamento/POP</th>
                <th className="py-3 px-4">Data Conclusão</th>
                <th className="py-3 px-4">Validade</th>
                <th className="py-3 px-4 text-center">Dias Restantes</th>
                <th className="py-3 px-4 text-center">Conformidade %</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-6 h-6 text-slate-300"/>
                      <p className="text-sm font-semibold text-slate-500">Nenhum registro encontrado</p>
                      <p className="text-xs text-slate-400">
                        {records.length === 0
                          ? 'Cadastre os procedimentos e colaboradores para gerar a matriz automaticamente.'
                          : 'Nenhum registro corresponde aos filtros aplicados.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((rec) => {
                const isOverdue = rec.daysRemaining < 0;
                return (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Colaborador: Avatar + Name + Cargo */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={rec.employeeAvatar}
                            alt={rec.employeeName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {rec.employeeName}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {rec.employeeRole}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Setor */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {rec.sector}
                    </td>

                    {/* Treinamento / POP */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-blue-700 font-semibold block">
                        {rec.procedureCode}
                      </span>
                      <span className="text-slate-600 block max-w-[180px] truncate">
                        {rec.procedureName}
                      </span>
                    </td>

                    {/* Data Conclusão */}
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {rec.completionDate}
                    </td>

                    {/* Validade */}
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {rec.validityDate}
                    </td>

                    {/* Dias Restantes */}
                    <td className="py-3 px-4 text-center font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          isOverdue
                            ? 'text-red-600'
                            : rec.daysRemaining <= 60
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {isOverdue ? `${Math.abs(rec.daysRemaining)}d vencido` : `${rec.daysRemaining}d`}
                      </span>
                    </td>

                    {/* Conformidade % */}
                    <td className="py-3 px-4 text-center font-mono font-bold tabular-nums whitespace-nowrap">
                      <span
                        className={
                          rec.complianceRate >= 90
                            ? 'text-emerald-700'
                            : rec.complianceRate >= 70
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }
                      >
                        {rec.complianceRate}%
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          rec.status
                        )}`}
                      >
                        {rec.status}
                      </span>
                    </td>

                    {/* Ação: Agendar Prova | Notificar */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => onScheduleExam(rec)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                        >
                          Agendar Prova
                        </button>
                        <button
                          onClick={() => onNotifyEmployee(rec)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                        >
                          Notificar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
