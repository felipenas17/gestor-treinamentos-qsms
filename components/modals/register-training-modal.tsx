'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, UserCheck, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { Procedure } from '@/types';
import { supabase } from '@/lib/supabase';

interface RegisterTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedures: Procedure[];
  /** Chamado após persistir no banco com sucesso — passa o ID do training atualizado */
  onSaved: () => void;
  initialEmployeeName?: string;
  initialProcedureCode?: string;
}

export function RegisterTrainingModal({
  isOpen,
  onClose,
  procedures,
  onSaved,
  initialEmployeeName,
  initialProcedureCode,
}: RegisterTrainingModalProps) {
  const [employeeName, setEmployeeName] = useState(initialEmployeeName || '');
  const [procedureCode, setProcedureCode] = useState(
    initialProcedureCode || procedures[0]?.code || ''
  );
  const [completionDate, setCompletionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [instructor, setInstructor] = useState('');
  const [complianceRate, setComplianceRate] = useState<number>(100);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim() || !supabase) return;

    setSaving(true);
    setError(null);

    try {
      const matchedProc = procedures.find((p) => p.code === procedureCode);

      // 1. Busca o procedimento no banco para obter o ID e validity_months
      const { data: procRow, error: procErr } = await supabase
        .from('procedures')
        .select('id, validity_months')
        .eq('code', procedureCode)
        .maybeSingle();

      if (procErr || !procRow) {
        setError(`Procedimento "${procedureCode}" não encontrado no banco.`);
        return;
      }

      // 2. Calcula validity_date com base em validity_months
      const validityMonths = procRow.validity_months || matchedProc?.validityMonths || 12;
      const compDateObj = new Date(completionDate);
      const validDateObj = new Date(compDateObj);
      validDateObj.setMonth(validDateObj.getMonth() + validityMonths);
      const validityDate = validDateObj.toISOString().split('T')[0];

      // 3. Busca o colaborador por nome (case-insensitive)
      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('id, name')
        .ilike('name', `%${employeeName.trim()}%`)
        .limit(5);

      if (empErr) {
        setError('Erro ao buscar colaborador: ' + empErr.message);
        return;
      }

      if (!employees || employees.length === 0) {
        setError(
          `Colaborador "${employeeName}" não encontrado no banco. Cadastre o colaborador primeiro na aba Colaboradores.`
        );
        return;
      }

      // Se achou mais de um, usa o match exato ou o primeiro
      const exactMatch = employees.find(
        (e: any) => e.name.toLowerCase() === employeeName.trim().toLowerCase()
      );
      const employee = exactMatch || employees[0];

      // 4. Verifica se existe registro na matriz para este colaborador + procedimento
      const { data: existingTraining } = await supabase
        .from('trainings')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('procedure_id', procRow.id)
        .maybeSingle();

      if (existingTraining) {
        // 5a. Atualiza o registro existente
        const { error: updErr } = await supabase
          .from('trainings')
          .update({
            status: 'Certificado',
            completion_date: completionDate,
            validity_date: validityDate,
            compliance_rate: complianceRate,
            instructor: instructor || null,
          })
          .eq('id', existingTraining.id);

        if (updErr) {
          setError('Erro ao atualizar treinamento: ' + updErr.message);
          return;
        }
      } else {
        // 5b. Insere novo registro (colaborador que não estava na matriz)
        const { error: insErr } = await supabase
          .from('trainings')
          .insert({
            employee_id: employee.id,
            procedure_id: procRow.id,
            status: 'Certificado',
            completion_date: completionDate,
            validity_date: validityDate,
            compliance_rate: complianceRate,
            instructor: instructor || null,
          });

        if (insErr) {
          setError('Erro ao inserir treinamento: ' + insErr.message);
          return;
        }
      }

      // 6. Notifica o pai para recarregar dados
      onSaved();
      onClose();
    } catch (err: any) {
      setError('Erro inesperado: ' + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
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
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

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
            <p className="text-[10px] text-slate-400 mt-1">
              Nome deve corresponder ao cadastro na aba Colaboradores.
            </p>
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
                Aproveitamento (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={complianceRate}
                onChange={(e) => setComplianceRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instrutor Credenciado
            </label>
            <input
              type="text"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="Nome do instrutor (opcional)"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Validade calculada automaticamente e status atualizado diretamente na matriz.</span>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!employeeName.trim() || saving}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Registrar Certificação
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
