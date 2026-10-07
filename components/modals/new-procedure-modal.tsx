'use client';
import React, { useState } from 'react';
import { X, FileText, Check } from 'lucide-react';

const SETORES = ['Operacional','Brascabo','Operacional RDO','Transbordo MC','CS','QSMS','Suprimentos'];

export interface ProcedureFormData {
  code: string;
  name: string;
  description: string;
  hours: string;
  validityMonths: string;
  criticality: 'Alta' | 'Média' | 'Baixa';
  sectors: string[];
}

interface NewProcedureModalProps {
  onSaved: (data: ProcedureFormData) => void;
  onClose: () => void;
}

export function NewProcedureModal({ onSaved, onClose }: NewProcedureModalProps) {
  const [f, setF] = useState<ProcedureFormData>({
    code: '', name: '', description: '', hours: '',
    validityMonths: '12', criticality: 'Média', sectors: []
  });

  const set = (k: keyof ProcedureFormData, v: string | string[]) =>
    setF(p => ({ ...p, [k]: v }));

  const toggleSector = (s: string) =>
    setF(p => ({
      ...p,
      sectors: p.sectors.includes(s) ? p.sectors.filter(x => x !== s) : [...p.sectors, s]
    }));

  const save = () => {
    if (!f.name || !f.code) return;
    onSaved(f);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600"/>
            <span className="font-semibold text-slate-800">Novo procedimento</span>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400"/></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Code + Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Código</label>
              <input value={f.code} onChange={e => set('code', e.target.value)}
                placeholder="POP-001"
                className="h-9 px-3 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Carga horária (h)</label>
              <input value={f.hours} onChange={e => set('hours', e.target.value)}
                placeholder="8"
                className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Nome do procedimento</label>
            <input value={f.name} onChange={e => set('name', e.target.value)}
              placeholder="Ex: Operação segura de empilhadeira"
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Descrição</label>
            <textarea value={f.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Descreva o objetivo e escopo do procedimento..."
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"/>
          </div>

          {/* Validity + Criticality */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Validade</label>
              <select value={f.validityMonths} onChange={e => set('validityMonths', e.target.value)}
                className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
                <option value="24">24 meses</option>
                <option value="36">36 meses</option>
                <option value="60">60 meses</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Criticidade</label>
              <div className="flex gap-1">
                {(['Alta','Média','Baixa'] as const).map(c => (
                  <button key={c} onClick={() => set('criticality', c)}
                    className={`flex-1 h-9 text-xs font-medium rounded-lg border transition-colors ${
                      f.criticality === c
                        ? c === 'Alta' ? 'bg-red-600 text-white border-red-600'
                          : c === 'Média' ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>{c}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Sectors */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-600">Setores que utilizam este procedimento</label>
            <div className="grid grid-cols-2 gap-2">
              {SETORES.map(s => {
                const selected = f.sectors.includes(s);
                return (
                  <button key={s} onClick={() => toggleSector(s)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                      selected
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                      selected ? 'bg-blue-600' : 'border border-slate-300'
                    }`}>
                      {selected && <Check className="w-3 h-3 text-white"/>}
                    </div>
                    {s}
                  </button>
                );
              })}
            </div>
            {f.sectors.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                Ao cadastrar um colaborador nesses setores, este procedimento será adicionado automaticamente à matriz dele.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-4 pt-2 sticky bottom-0 bg-white border-t border-slate-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={save}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Salvar procedimento
          </button>
        </div>
      </div>
    </div>
  );
}
