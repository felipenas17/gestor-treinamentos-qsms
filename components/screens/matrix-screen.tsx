'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Link2,
  ClipboardCheck,
  Loader2,
  History,
  Download,
  FileSpreadsheet,
  LayoutList,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TrainingRecord, ComplianceStatus, Assessment, Employee } from '@/types';

interface MatrixScreenProps {
  records: TrainingRecord[];
  assessments: Assessment[];
  employees?: Employee[];
  onRegisterEmployee: () => void;
  onSendLink: (assessmentId: string, employeeId: string) => Promise<string | null>;
  onRegisterTraining: (rec: TrainingRecord) => void;
  onViewHistory?: (rec: TrainingRecord) => void;
}

export function MatrixScreen({
  records,
  assessments,
  employees = [],
  onRegisterEmployee,
  onSendLink,
  onRegisterTraining,
  onViewHistory,
}: MatrixScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('Todos');
  const [selectedRole, setSelectedRole] = useState<string>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [linkGenerating, setLinkGenerating] = useState<string | null>(null); // rec.id
  const [linkCopied, setLinkCopied] = useState<string | null>(null); // rec.id
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Filter options
  const sectors = useMemo(() => {
    const list = Array.from(new Set(records.map((r) => r.sector)));
    return ['Todos', ...list];
  }, [records]);

  const roles = useMemo(() => {
    const list = Array.from(new Set(records.map((r) => r.employeeRole)));
    return ['Todos', ...list];
  }, [records]);

  // KPI counts derived from real data
  const totalColaboradores = new Set(records.map((r) => r.employeeId)).size;
  const ativas = records.filter((r) => r.status === 'Certificado').length;
  const vencendo = records.filter((r) => r.status === 'Reciclar').length;
  const vencidas = records.filter((r) => r.status === 'Vencido').length;
  const total = records.length;
  const ativasPercent = total > 0 ? ((ativas / total) * 100).toFixed(1) : '0.0';

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

  // ─── Grouped by employee ─────────────────────────────────────────────────────
  const groupedByEmployee = useMemo(() => {
    const map = new Map<string, { name: string; role: string; sector: string; avatar: string; records: TrainingRecord[] }>();
    filtered.forEach((r) => {
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, { name: r.employeeName, role: r.employeeRole, sector: r.sector, avatar: r.employeeAvatar, records: [] });
      }
      map.get(r.employeeId)!.records.push(r);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  // ─── Export handlers ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const data = filtered.map((r) => ({
      Colaborador: r.employeeName,
      Cargo: r.employeeRole,
      Setor: r.sector,
      'Código POP': r.procedureCode,
      Treinamento: r.procedureName,
      'Data Conclusão': r.completionDate,
      'Data Validade': r.validityDate,
      'Dias Restantes': r.daysRemaining,
      'Conformidade %': r.complianceRate,
      Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    // Column widths
    ws['!cols'] = [22, 22, 18, 12, 36, 14, 14, 14, 14, 14].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz de Treinamentos');
    XLSX.writeFile(wb, `matriz-treinamentos-tiger-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPdf = async () => {
    if (!tableRef.current) return;
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(tableRef.current, { scale: 1.5, useCORS: true, backgroundColor: '#f8fafc', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const imgW = canvas.width;
      const imgH = canvas.height;
      const pageW = 297; // A4 landscape mm
      const pageH = 210;
      const margin = 8;
      const printW = pageW - margin * 2;
      const printH = (imgH * printW) / imgW;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      let yOffset = margin;
      let remaining = printH;
      while (remaining > 0) {
        const sliceH = Math.min(pageH - margin * 2, remaining);
        const srcY = ((printH - remaining) / printH) * imgH;
        const srcH = (sliceH / printH) * imgH;
        const sc = document.createElement('canvas');
        sc.width = imgW; sc.height = srcH;
        sc.getContext('2d')!.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, srcH);
        pdf.addImage(sc.toDataURL('image/png'), 'PNG', margin, yOffset, printW, sliceH);
        remaining -= sliceH;
        if (remaining > 0) { pdf.addPage(); yOffset = margin; }
      }
      pdf.save(`matriz-treinamentos-tiger-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const toggleEmployee = (name: string) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

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

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              title="Vista em lista"
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              title="Agrupar por colaborador"
              className={`p-2 transition-colors ${viewMode === 'grouped' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Export buttons */}
          <button
            onClick={handleExportExcel}
            title="Exportar Excel"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            title="Exportar PDF"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-60"
          >
            {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isExportingPdf ? 'Gerando...' : 'PDF'}</span>
          </button>
          <button
            onClick={onRegisterEmployee}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Colaborador</span>
          </button>
        </div>
      </div>

      {/* KPI Row (4 KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Colaboradores
          </span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
            {totalColaboradores}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">Cadastrados na matriz</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Certificações Ativas
          </span>
          <p className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums mt-1">
            {ativas}
          </p>
          <span className="text-[11px] text-blue-700 font-medium">{ativasPercent}% do total</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Vencendo (60 dias)
          </span>
          <p className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">
            {vencendo}
          </p>
          <span className="text-[11px] text-amber-700 font-medium">Reciclagens agendadas</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Vencidas
          </span>
          <p className="text-2xl font-extrabold text-red-600 font-mono tabular-nums mt-1">
            {vencidas}
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

      {/* Results count */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Exibindo <strong className="text-slate-700">{filtered.length}</strong> de{' '}
          <strong className="text-slate-700">{records.length}</strong> registros
          {viewMode === 'grouped' && (
            <span> · <strong className="text-slate-700">{groupedByEmployee.length}</strong> colaboradores</span>
          )}
        </span>
        {filtered.length !== records.length && (
          <button
            onClick={() => { setSearchTerm(''); setSelectedSector('Todos'); setSelectedRole('Todos'); setSelectedStatus('Todos'); }}
            className="text-blue-600 hover:underline font-medium"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Main Matrix — List or Grouped */}
      <div ref={tableRef}>

      {/* ── List view ── */}
      {viewMode === 'list' && (
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
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-mono font-bold text-xs ${rec.complianceRate >= 90 ? 'text-emerald-700' : rec.complianceRate >= 70 ? 'text-amber-700' : 'text-red-700'}`}>
                          {rec.complianceRate}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${rec.complianceRate >= 90 ? 'bg-emerald-500' : rec.complianceRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${rec.complianceRate}%` }}
                          />
                        </div>
                      </div>
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

                    {/* Ação */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {(rec.status === 'Pendente' || rec.status === 'Reciclar' || rec.status === 'Vencido') && (
                        <button
                          disabled={linkGenerating === rec.id}
                          onClick={async () => {
                            const assessment = assessments.find(
                              (a) => a.procedureCode === rec.procedureCode && a.status === 'Ativa'
                            );
                            if (!assessment) {
                              alert('Nenhuma avaliação ativa para este procedimento.');
                              return;
                            }
                            setLinkGenerating(rec.id);
                            const token = await onSendLink(assessment.id, rec.employeeId);
                            setLinkGenerating(null);
                            if (token) {
                              const url = `${window.location.origin}/avaliar/${token}`;
                              const msg = encodeURIComponent(
                                `Olá, ${rec.employeeName}! 👷\n\nVocê tem uma avaliação pendente referente ao procedimento *${rec.procedureCode} – ${rec.procedureName}*.\n\nAcesse pelo link abaixo para responder:\n${url}`
                              );
                              const emp = employees.find(e => e.id === rec.employeeId);
                              const rawPhone = emp?.phone ? emp.phone.replace(/\D/g, '') : '';
                              // Add Brazil country code (55) if number is local (10-11 digits)
                              const phone = rawPhone.length >= 10 && rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
                              const waUrl = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
                              window.open(waUrl, '_blank');
                              setLinkCopied(rec.id);
                              setTimeout(() => setLinkCopied(null), 2500);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
                        >
                          {linkGenerating === rec.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : linkCopied === rec.id ? (
                            <ClipboardCheck className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Link2 className="w-3 h-3" />
                          )}
                          {linkCopied === rec.id ? 'Copiado!' : 'Enviar Link'}
                        </button>
                      )}
                      {onViewHistory && (
                        <button
                          onClick={() => onViewHistory(rec)}
                          title="Ver histórico de tentativas"
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 transition-colors"
                        >
                          <History className="w-3 h-3" />
                          <span className="hidden sm:inline">Histórico</span>
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )} {/* end list view */}

      {/* ── Grouped view ── */}
      {viewMode === 'grouped' && (
        <div className="space-y-3">
          {groupedByEmployee.length === 0 && (
            <div className="rounded-xl bg-white border border-slate-200 py-16 text-center">
              <Users className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500">Nenhum colaborador encontrado</p>
            </div>
          )}
          {groupedByEmployee.map((emp) => {
            const certOk = emp.records.filter((r) => r.status === 'Certificado').length;
            const pct = emp.records.length > 0 ? Math.round((certOk / emp.records.length) * 100) : 0;
            const isExpanded = expandedEmployees.has(emp.name);
            return (
              <div key={emp.name} className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                {/* Employee header row */}
                <button
                  onClick={() => toggleEmployee(emp.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                  <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{emp.name}</p>
                    <p className="text-[11px] text-slate-500">{emp.role} · {emp.sector}</p>
                  </div>
                  {/* Mini compliance */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</p>
                      <p className="text-[10px] text-slate-400">{certOk}/{emp.records.length} certs</p>
                    </div>
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {emp.records.filter(r => r.status === 'Certificado').length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        {emp.records.filter(r => r.status === 'Certificado').length} ok
                      </span>
                    )}
                    {emp.records.filter(r => r.status === 'Reciclar').length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                        {emp.records.filter(r => r.status === 'Reciclar').length} reciclar
                      </span>
                    )}
                    {emp.records.filter(r => r.status === 'Vencido').length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 rounded-full border border-red-200">
                        {emp.records.filter(r => r.status === 'Vencido').length} vencido
                      </span>
                    )}
                  </div>
                </button>
                {/* Expanded: training records */}
                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {emp.records.map((rec) => (
                      <div key={rec.id} className="flex items-center gap-3 px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-blue-700 font-semibold mr-2">{rec.procedureCode}</span>
                          <span className="text-slate-600 truncate">{rec.procedureName}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 text-slate-500">
                          <span className="hidden md:block">Conclusão: <strong className="text-slate-700">{rec.completionDate}</strong></span>
                          <span>Validade: <strong className={rec.daysRemaining < 0 ? 'text-red-600' : rec.daysRemaining <= 60 ? 'text-amber-600' : 'text-slate-700'}>{rec.validityDate}</strong></span>
                          <span className={`font-bold ${rec.daysRemaining < 0 ? 'text-red-600' : rec.daysRemaining <= 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {rec.daysRemaining < 0 ? `${Math.abs(rec.daysRemaining)}d vencido` : `${rec.daysRemaining}d restantes`}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] ${getStatusBadge(rec.status)}`}>
                          {rec.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )} {/* end grouped view */}

      </div> {/* end tableRef */}
    </div>
  );
}
