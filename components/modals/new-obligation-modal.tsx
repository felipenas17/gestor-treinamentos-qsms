'use client';

import React, { useState } from 'react';
import { X, ClipboardCheck } from 'lucide-react';
import { DocControl } from '@/types';

const BASES = [
  'Base Macaé',
  'Base Rio das Ostras',
  'Base Duque de Caxias',
  'Base Bahia',
];

const FREQUENCIES = [
  'Mensal',
  'Bimestral',
  'Trimestral',
  'Semestral',
  'Anual',
  'Bienal',
];

interface FormData {
  title: string;
  description: string;
  frequency: string;
  responsible: string;
  lastDoneDate: string;
  base: string;
  docControlId: string;
  notes: string;
}

interface NewObligationModalProps {
  documents: DocControl[];   // para vínculo opcional com doc_control
  onSaved: (data: FormData) => Promise<void>;
  onClose: () => void;
}

export function NewObligationModal({ documents, onSaved, onClose }: NewObligationModalProps) {
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    frequency: 'Anual',
    responsible: '',
    lastDoneDate: '',
    base: '',
    docControlId: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await onSaved(form);
    setSaving(false);
    onClose();
  };

  // Preview: calcula próxima data estimada (informativo)
  const previewNext = (() => {
    if (!form.lastDoneDate || !form.frequency) return null;
    const months: Record<string, number> = {
      Mensal: 1, Bimestral: 2, Trimestral: 3, Semestral: 6, Anual: 12, Bienal: 24,
    };
    const m = months[form.frequency] ?? 12;
    const d = new Date(form.lastDoneDate + 'T00:00:00');
    d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString('pt-BR');
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Nova Obrigação Legal</h2>
              <p className="text-xs text-slate-400">Cumprimento periódico de requisito</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* Identificação */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identificação</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Título da Obrigação *</label>
              <input
                type="text"
                placeholder="Ex: Controle de Pragas e Vetores"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição / Requisito</label>
              <textarea
                rows={2}
                placeholder="Descreva o que precisa ser feito, a norma ou exigência que origina essa obrigação…"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Frequência *</label>
                <select
                  value={form.frequency}
                  onChange={e => set('frequency', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base</label>
                <select
                  value={form.base}
                  onChange={e => set('base', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">— Todas as bases —</option>
                  {BASES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Responsável</label>
              <input
                type="text"
                placeholder="Ex: Felipe Nascimento"
                value={form.responsible}
                onChange={e => set('responsible', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </section>

          {/* Última Realização */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Última Realização</h3>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data da Última Realização</label>
                <input
                  type="date"
                  value={form.lastDoneDate}
                  onChange={e => set('lastDoneDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {previewNext && (
                <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700">
                  <span className="font-semibold">Próxima estimada:</span>{' '}
                  {previewNext}
                </div>
              )}
            </div>
          </section>

          {/* Vínculo com Documento */}
          {documents.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vínculo com Controle Documental</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Licença / Documento de Origem (opcional)</label>
                <select
                  value={form.docControlId}
                  onChange={e => set('docControlId', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">— Sem vínculo —</option>
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Vincule à licença ou autorização que exige este cumprimento.
                </p>
              </div>
            </section>
          )}

          {/* Observações */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações</h3>
            <textarea
              rows={2}
              placeholder="Empresa prestadora, número do relatório, condições específicas…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !form.title.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg">
              {saving ? 'Salvando…' : 'Salvar Obrigação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
