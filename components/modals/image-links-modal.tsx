'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Image as ImageIcon, Code2 } from 'lucide-react';

interface ImageLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLinksModal({ isOpen, onClose }: ImageLinksModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const images = [
    {
      id: 'banner',
      title: 'Banner da Plataforma Offshore (16:9)',
      description: 'Imagem cinematográfica da unidade offshore e supply vessel para cabeçalhos e intranet.',
      url: '/images/banner_offshore.jpg',
      fullUrl: '/images/offshore_platform_banner_1791311188326.jpg',
      alt: 'Plataforma Offshore de Petróleo e Gás em Alto Mar',
    },
    {
      id: 'avatar_engineer',
      title: 'Avatar - Supervisor de Convés / Engenheiro QSMS (1:1)',
      description: 'Foto em alta resolução de profissional offshore com capacete de proteção.',
      url: '/images/avatar_engineer.jpg',
      fullUrl: '/images/avatar_offshore_engineer_1791311197918.jpg',
      alt: 'Engenheiro Supervisor QSMS Offshore',
    },
    {
      id: 'avatar_operator',
      title: 'Avatar - Operador de Guindaste / Convés (1:1)',
      description: 'Retrato de operador marítimo com capacete laranja e colete refletivo.',
      url: '/images/avatar_operator.jpg',
      fullUrl: '/images/avatar_marine_operator_1791311206258.jpg',
      alt: 'Operador Marítimo de Convés e Guindaste',
    },
    {
      id: 'avatar_inspector',
      title: 'Avatar - Inspetora de Qualidade e Segurança (1:1)',
      description: 'Retrato de técnica de conformidade com óculos de segurança e prancheta.',
      url: '/images/avatar_inspector.jpg',
      fullUrl: '/images/avatar_safety_inspector_1791311217055.jpg',
      alt: 'Inspetora Técnica de Segurança do Trabalho e Qualidade',
    },
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Links Diretos para Imagens do HTML
              </h2>
              <p className="text-xs text-slate-500">
                Copie os links diretos ou o código HTML &lt;img&gt; pronto para uso em intranet, e-mails ou relatórios.
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
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-130px)]">
          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 leading-relaxed">
            <span className="font-semibold">Dica de Integração:</span> Todas as imagens são servidas diretamente da pasta pública da aplicação. Você pode copiar a URL direta ou o snippet HTML completo com política de segurança de referência já configurada.
          </div>

          <div className="grid grid-cols-1 gap-4">
            {images.map((img) => {
              const htmlSnippet = `<img src="${img.url}" alt="${img.alt}" loading="lazy" referrerpolicy="no-referrer" />`;
              return (
                <div
                  key={img.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                >
                  {/* Thumbnail */}
                  <div className="w-24 h-24 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{img.title}</h3>
                      <p className="text-xs text-slate-500">{img.description}</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {/* URL Box */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-500 w-16 shrink-0">URL Direta:</span>
                        <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-800 truncate flex-1 border border-slate-200">
                          {img.url}
                        </code>
                        <button
                          onClick={() => handleCopy(img.url, `url-${img.id}`)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors flex items-center gap-1 shrink-0"
                        >
                          {copiedKey === `url-${img.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar URL</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* HTML Tag Box */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-500 w-16 shrink-0">Tag HTML:</span>
                        <code className="text-[11px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 truncate flex-1 border border-slate-200">
                          {htmlSnippet}
                        </code>
                        <button
                          onClick={() => handleCopy(htmlSnippet, `html-${img.id}`)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors flex items-center gap-1 shrink-0"
                        >
                          {copiedKey === `html-${img.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Code2 className="w-3.5 h-3.5" />
                              <span>Copiar HTML</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total de 4 recursos de imagem de alta fidelidade
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
