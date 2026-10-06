'use client';

import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Procedure } from '@/types';

interface ImportDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcedureImported: (procedure: Procedure) => void;
}

export function ImportDocumentModal({
  isOpen,
  onClose,
  onProcedureImported,
}: ImportDocumentModalProps) {
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'done'>('upload');

  if (!isOpen) return null;

  const handleSimulateUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName) return;

    setUploading(true);
    setStep('processing');

    setTimeout(() => {
      const newProc: Procedure = {
        id: `proc-${Date.now()}`,
        code: `POP-EXT-${Math.floor(100 + Math.random() * 899)}`,
        name: fileName.replace(/\.[^/.]+$/, ''),
        sector: 'Operações Offshore',
        associatedRole: 'Técnico Especialista / Convés',
        application: 'Procedimento importado via documento digitalizado com banco de questões gerado por IA.',
        complianceRate: 100,
        lastRevision: new Date().toLocaleDateString('pt-BR'),
        status: 'Ativo',
        questionsCount: 12,
        criticality: 'Alta',
        description: 'Documento homologado no repositório com validação de assinatura e integridade SHA-256.',
        validityMonths: 12,
      };

      onProcedureImported(newProc);
      setUploading(false);
      setStep('done');

      setTimeout(() => {
        onClose();
        setStep('upload');
      }, 1500);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Importar Procedimento (PDF / Word)
              </h2>
              <p className="text-xs text-slate-500">
                Extração automática de requisitos e banco de questões
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

        {/* Content */}
        <div className="p-6">
          {step === 'upload' && (
            <form onSubmit={handleSimulateUpload} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  Arraste o arquivo ou clique para selecionar
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Formatos suportados: PDF, DOCX, ODT (máx. 25MB)
                </p>
                <input
                  type="file"
                  id="file-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFileName(e.target.files[0].name);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('file-input')?.click()}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Selecionar Arquivo
                </button>
              </div>

              {fileName && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
                  <span className="font-semibold truncate">{fileName}</span>
                  <span className="text-[11px] font-mono text-blue-700">Pronto</span>
                </div>
              )}

              {/* Preset examples */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Ou selecione um documento modelo offshore:
                </span>
                <div className="flex flex-col gap-1.5">
                  {[
                    'POP-ST-025_Trabalho_em_Altura_Convés_Molhado.pdf',
                    'POP-SUB-009_Operacao_Garras_Hidraulicas_ROV.pdf',
                    'POP-EMER-012_Evacuacao_Baleeiras_Lifeboat.pdf',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFileName(preset)}
                      className="text-left text-xs text-slate-600 hover:text-blue-700 hover:bg-slate-50 p-1.5 rounded transition-colors truncate border border-slate-100"
                    >
                      📄 {preset}
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
                  disabled={!fileName}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar e Gerar Banco</span>
                </button>
              </div>
            </form>
          )}

          {step === 'processing' && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-900">
                Processando Documento e Gerando Questões...
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Binarizando cláusulas de segurança, calculando vigência e cadastrando no Supabase.
              </p>
            </div>
          )}

          {step === 'done' && (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-slate-900">
                Documento Importado com Sucesso!
              </p>
              <p className="text-xs text-slate-500">
                O novo POP e seu banco de 12 questões já estão disponíveis na biblioteca.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
