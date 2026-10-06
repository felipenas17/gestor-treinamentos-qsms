'use client';

import React, { useState } from 'react';
import { X, Sparkles, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { Procedure, Sector } from '@/types';

interface NewProcedureAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcedureCreated: (procedure: Procedure) => void;
}

export function NewProcedureAiModal({
  isOpen,
  onClose,
  onProcedureCreated,
}: NewProcedureAiModalProps) {
  const [title, setTitle] = useState('');
  const [sector, setSector] = useState<Sector>('Operações Offshore');
  const [associatedRole, setAssociatedRole] = useState('Operador de Convés / Guindasteiro');
  const [keyHazards, setKeyHazards] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/generate-procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          sector,
          associatedRole,
          keyHazards,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao gerar procedimento via IA');
      }

      const newProc: Procedure = {
        ...data.procedure,
        id: `proc-${Date.now()}`,
      };

      onProcedureCreated(newProc);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Erro ao gerar procedimento com Inteligência Artificial. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gerar Procedimento Operacional (POP) via IA
              </h2>
              <p className="text-xs text-slate-500">
                A IA estrutura o procedimento técnico, riscos críticos e sugestão de banco de questões.
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
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Procedimento / Tema Técnico *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Operações com Cabos de Aço e Olhais Padronizados em Convés Molhado"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Setor Responsável
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
                <option value="Meio Ambiente">Meio Ambiente</option>
                <option value="RH">RH</option>
                <option value="Segurança Patrimonial">Segurança Patrimonial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cargo Associado
              </label>
              <input
                type="text"
                value={associatedRole}
                onChange={(e) => setAssociatedRole(e.target.value)}
                placeholder="Ex: Guindasteiro / Rigger"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Riscos Críticos e Escopo de Operação (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Trabalho em altura sobre mar aberto, risco de aprisionamento de membros em guinchos hidráulicos, mar com pitch > 3 graus..."
              value={keyHazards}
              onChange={(e) => setKeyHazards(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              O modelo gerará o código sequencial de documento, escopo de aplicação, criticidade, vigência e previsão de banco de questões para o Repositório Oficial.
            </p>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gerando POP com IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar Procedimento Padrão</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
