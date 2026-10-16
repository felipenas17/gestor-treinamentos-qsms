'use client';

import React, { useState } from 'react';
import { X, Shield } from 'lucide-react';

const DOC_TYPES = [
  'Licença Polícia Federal',
  'Licença Exército (SIGMA)',
  'Alvará de Funcionamento',
  'Licença Ambiental (IBAMA/INEA)',
  'Certificado de Registro DPC',
  'Licença Sanitária (ANVISA)',
  'Certificado INMETRO',
  'Certificado de Empresa',
  'Autorização Especial',
  'Outro',
];

const RENEWAL_OPTIONS = [
  { value: 6,  label: '6 meses' },
  { value: 12, label: '1 ano'   },
  { value: 24, label: '2 anos'  },
  { value: 36, label: '3 anos'  },
  { value: 60, label: '5 anos'  },
];

interface FormData {
  code: string;
  name: string;
  docType: string;
  issuingBody: string;
  issueDate: string;
  expiryDate: string;
  renewalMonths: string;
  responsible: string;
  notes: string;
}

interface NewDocModalProps {
  onSaved: (data: FormData) => void;
  onClose: () => void;
}

export function NewDocModal({ onSaved, onClose }: NewDocModalProps) {
  const [form, setForm] = useState<FormData>({
    code: '',
    name: '',
    docType: 'Licença Polícia Federal',
    issuingBody: '',
    issueDate: '',
    expiryDate: '',
    renewalMonths: '12',
    responsible: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    setSaving(true);
    await onSaved(form);
    setSaving(false);
    onClose();
  };

  // Preview da próxima renovação (informativo)
  const previewNextRenewal = (() => {
    if (!form.issueDate) return null;
    const d = new Date(form.issueDate + 'T00:00:00');
    d.setMonth(d.getMonth() + Number(form.renewalMonths));
    return d.toLocaleDateString('pt-BR');
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Novo Documento / Licença</h2>
              <p className="text-xs text-slate-400">Controle documental institucional</p>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Código *</label>
                <input
                  type="text"
                  placeholder="Ex: LIC-PF-001"
                  value={form.code}
                  onChange={e => set('code', e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Documento *</label>
                <select
                  value={form.docType}
                  onChange={e => set('docType', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome / Descrição *</label>
              <input
                type="text"
                placeholder="Ex: Licença para Transporte de Produto Controlado — Tiger Rentank"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Órgão Emissor</label>
              <input
                type="text"
                placeholder="Ex: Polícia Federal — SR/RJ"
                value={form.issuingBody}
                onChange={e => set('issuingBody', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </section>

          {/* Datas e Validade */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Datas e Validade</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Emissão</label>
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={e => set('issueDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Vencimento</label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={e => set('expiryDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ciclo de Renovação</label>
                <select
                  value={form.renewalMonths}
                  onChange={e => set('renewalMonths', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {RENEWAL_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {previewNextRenewal && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <span className="font-semibold">Próxima renovação estimada:</span>{' '}
                  {previewNextRenewal}
                </div>
              )}
            </div>
          </section>

          {/* Responsável e Observações */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Responsável e Observações</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Responsável pela Renovação</label>
              <input
                type="text"
                placeholder="Ex: Felipe Nascimento"
                value={form.responsible}
                onChange={e => set('responsible', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observações</label>
              <textarea
                rows={2}
                placeholder="Número do processo, condições, restrições…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
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
            <button type="submit" disabled={saving || !form.code.trim() || !form.name.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg">
              {saving ? 'Salvando…' : 'Salvar Documento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
