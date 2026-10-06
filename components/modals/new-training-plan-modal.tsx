'use client';

import React, { useState } from 'react';
import { X, Calendar, Users, CheckCircle2, Award, Clock } from 'lucide-react';
import { Procedure, TrainingRecord, Sector } from '@/types';

interface NewTrainingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  procedures: Procedure[];
  onPlanScheduled: (planName: string, count: number) => void;
}

export function NewTrainingPlanModal({
  isOpen,
  onClose,
  procedures,
  onPlanScheduled,
}: NewTrainingPlanModalProps) {
  const [selectedProc, setSelectedProc] = useState(procedures[0]?.code || 'POP-OP-014');
  const [sector, setSector] = useState<Sector>('Operações Offshore');
  const [targetCount, setTargetCount] = useState('14');
  const [instructor, setInstructor] = useState('Eng. Roberto Vasconcelos');
  const [startDate, setStartDate] = useState('2026-10-15');
  const [format, setFormat] = useState<'Híbrido' | 'E-learning com Prova UUID' | 'Prático em Convés'>('E-learning com Prova UUID');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPlanScheduled(`Turma ${selectedProc} (${sector})`, parseInt(targetCount, 10) || 10);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gerar Novo Plano de Treino
              </h2>
              <p className="text-xs text-slate-500">
                Planejamento de reciclagem e certificação para turmas offshore.
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
              Procedimento / Treinamento Normativo *
            </label>
            <select
              value={selectedProc}
              onChange={(e) => setSelectedProc(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {procedures.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code} - {p.name} ({p.sector})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Setor Prioritário
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as Sector)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Operacional">Operacional</option>
                <option value="Brascabo">Brascabo</option>
                <option value="RDO">RDO</option>
                <option value="QSMS">QSMS</option>
                <option value="Suprimentos">Suprimentos</option>
                <option value="Transbordo">Transbordo</option>
                <option value="Operações Offshore">Operações Offshore</option>
                <option value="Logística">Logística</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nº de Colaboradores
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data Prevista de Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instrutor / Responsável QSMS
              </label>
              <input
                type="text"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Metodologia de Aplicação
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['E-learning com Prova UUID', 'Híbrido', 'Prático em Convés'] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setFormat(m)}
                  className={`p-2 rounded-lg text-[11px] font-medium border text-center transition-all ${
                    format === m
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              Criar e Emitir Convites
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
