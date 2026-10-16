'use client';

import React, { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { Procedure, ProcedureStatus } from '@/types';

const DOC_TYPES = [
  'Procedimento',
  'Instrução de Trabalho',
  'Manual',
  'Formulário',
  'Política',
  'Plano',
  'Norma Interna',
  'Outro',
];

const REVISION_OPTIONS = [
  { value: 12, label: '12 meses (anual)' },
  { value: 24, label: '24 meses (bienal)' },
  { value: 36, label: '36 meses (trienal)' },
  { value: 48, label: '48 meses' },
  { value: 60, label: '60 meses (quinquenal)' },
];

interface FormData {
  name: string;
  revision: string;
  status: ProcedureStatus;
  criticality: 'Alta' | 'Média' | 'Baixa';
  docType: string;
  docLastRevisionDate: string;
  docRevisionMonths: string;
  docResponsible: string;
  revisionNotes: string;
}

export interface EditProcedurePayload {
  name: string;
  revision: string;
  status: ProcedureStatus;
  criticality: 'Alta' | 'Média' | 'Baixa';
  docType: string;
  docLastRevisionDate: string;
  docRevisionMonths: number;
  docResponsible: string;
  revisionNotes: string;
  procedureCode: string;
}

interface EditProcedureModalProps {
  procedure: Procedure;
  onSaved: (id: string, data: EditProcedurePayload) => Promise<void>;
  onClose: () => void;
}

export function EditProcedureModal({ procedure, onSaved, onClose }: EditProcedureModalProps) {
  const [form, setForm] = useState<FormData>({
    name: procedure.name,
    revision: procedure.revision ?? 'R00',
    status: procedure.status,
    criticality: procedure.criticality,
    docType: procedure.docType ?? 'Procedimento',
    docLastRevisionDate: procedure.docLastRevisionDate ?? '',
    docRevisionMonths: String(procedure.docRevisionMonths ?? 36),
    docResponsible: procedure.docResponsible ?? '',
    revisionNotes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // Preview data de próxima revisão
  const previewNextRevision = (() => {
    if (!form.docLastRevisionDate) return null;
    const d = new Date(form.docLastRevisionDate + 'T00:00:00');
    d.setMonth(d.getMonth() + Number(form.docRevisionMonths));
    return d.toLocaleDateString('pt-BR');
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onSaved(procedure.id, {
      ...form,
      docRevisionMonths: Number(form.docRevisionMonths),
      procedureCode: procedure.code,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Editar Procedimento</h2>
              <p className="text-xs text-slate-400 font-mono">{procedure.code}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* Identificação básica */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identificação</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Procedimento *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Revisão</label>
                <input
                  type="text"
                  value={form.revision}
                  onChange={e => set('revision', e.target.value)}
                  placeholder="R00"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value as ProcedureStatus)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Em Revisão">Em Revisão</option>
                  <option value="Arquivado">Arquivado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Criticidade</label>
                <select
                  value={form.criticality}
                  onChange={e => set('criticality', e.target.value as 'Alta' | 'Média' | 'Baixa')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>
            </div>
          </section>

          {/* Controle Documental */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Controle Documental</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Documento</label>
                <select
                  value={form.docType}
                  onChange={e => set('docType', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ciclo de Revisão</label>
                <select
                  value={form.docRevisionMonths}
                  onChange={e => set('docRevisionMonths', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {REVISION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Última Revisão</label>
                <input
                  type="date"
                  value={form.docLastRevisionDate}
                  onChange={e => set('docLastRevisionDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {previewNextRevision && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <span className="font-semibold">Próx. revisão:</span>{' '}
                  {previewNextRevision}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Responsável pela Revisão</label>
              <input
                type="text"
                value={form.docResponsible}
                onChange={e => set('docResponsible', e.target.value)}
                placeholder="Ex: Felipe Nascimento"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notas desta revisão
                <span className="ml-1 text-slate-400 font-normal">(opcional — ficará no histórico)</span>
              </label>
              <textarea
                rows={2}
                value={form.revisionNotes}
                onChange={e => set('revisionNotes', e.target.value)}
                placeholder="Ex: Atualizado conforme nova NR-10, incluída seção 4.3 sobre EPI…"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !form.name.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg">
              {saving ? 'Salvando…' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
