'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, UserCheck, ShieldCheck } from 'lucide-react';
import { Procedure, TrainingRecord, Sector, ComplianceStatus } from '@/types';

interface RegisterTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedures: Procedure[];
  onSaveRecord: (record: TrainingRecord) => void;
}

export function RegisterTrainingModal({
  isOpen,
  onClose,
  procedures,
  onSaveRecord,
}: RegisterTrainingModalProps) {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeRole, setEmployeeRole] = useState('Marinheiro de Convés');
  const [sector, setSector] = useState<Sector>('Operações Offshore');
  const [procedureCode, setProcedureCode] = useState(procedures[0]?.code || 'POP-OP-014');
  const [completionDate, setCompletionDate] = useState('2026-10-06');
  const [instructor, setInstructor] = useState('Eng. Roberto Vasconcelos');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) return;

    const matchedProc = procedures.find((p) => p.code === procedureCode);
    const validityMonths = matchedProc?.validityMonths || 12;

    // Calculate validity date server/client side
    const compDateObj = new Date(completionDate);
    const validDateObj = new Date(compDateObj);
    validDateObj.setMonth(validDateObj.getMonth() + validityMonths);

    const now = new Date();
    const diffTime = validDateObj.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: ComplianceStatus = 'Certificado';
    if (diffDays < 0) status = 'Vencido';
    else if (diffDays <= 60) status = 'Reciclar';

    const newRec: TrainingRecord = {
      id: `rec-${Date.now()}`,
      employeeId: `emp-${Date.now()}`,
      employeeName,
      employeeRole,
      employeeAvatar: '/images/avatar_operator.jpg',
      sector,
      procedureCode,
      procedureName: matchedProc?.name || 'Treinamento Operacional',
      completionDate: compDateObj.toLocaleDateString('pt-BR'),
      validityDate: validDateObj.toLocaleDateString('pt-BR'),
      daysRemaining: diffDays,
      complianceRate: 100,
      status,
      instructor,
      certificateHash: `CERT-2026-BR-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    onSaveRecord(newRec);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Registrar Conclusão de Treinamento
              </h2>
              <p className="text-xs text-slate-500">
                Lançamento de certificado na matriz de conformidade offshore.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Colaborador *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Gabriel Fontenele"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cargo / Função
              </label>
              <input
                type="text"
                value={employeeRole}
                onChange={(e) => setEmployeeRole(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Setor / Embarcação
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as Sector)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Operações Offshore">Operações Offshore</option>
                <option value="Segurança do Trabalho">Segurança do Trabalho</option>
                <option value="Qualidade">Qualidade</option>
                <option value="Logística">Logística</option>
                <option value="Tecnologia">Tecnologia</option>
                <option value="QSMS">QSMS</option>
                <option value="Operacional">Operacional</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Treinamento / Procedimento POP *
            </label>
            <select
              value={procedureCode}
              onChange={(e) => setProcedureCode(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {procedures.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Conclusão
              </label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instrutor Credenciado
              </label>
              <input
                type="text"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Validade calculada automaticamente de acordo com as regras de vigência do POP.</span>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!employeeName.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              Registrar Certificação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
