'use client';

import React from 'react';

interface HeaderProps {
  currentTab: string;
  onOpenSchemaModal?: () => void;
  onOpenImagesModal?: () => void;
  isSupabaseConnected?: boolean;
}

export function Header({
  currentTab,
  isSupabaseConnected = false,
}: HeaderProps) {
  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Painel Geral de Conformidade Operacional';
      case 'procedimentos':
        return 'Biblioteca de Procedimentos & POPs';
      case 'provas':
        return 'Gestão de Provas & Links de Avaliação';
      case 'matriz':
        return 'Matriz de Treinamentos & Colaboradores';
      default:
        return 'Gestor de Treinamentos Internos';
    }
  };

  const getBreadcrumb = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'QSMS / Monitoramento Geral';
      case 'procedimentos':
        return 'Documentação / Procedimentos Operacionais';
      case 'provas':
        return 'Avaliações / Links Seguros UUID';
      case 'matriz':
        return 'Recursos Humanos & Operações / Matriz de Habilidades';
      default:
        return 'Offshore / QSMS';
    }
  };

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
      {/* Zone 1: Breadcrumb and Title */}
      <div className="flex flex-col min-w-0 pr-4">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">
          {getBreadcrumb()}
        </span>
        <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
          {getTabTitle()}
        </h1>
      </div>

      {/* Zone 3: Status + Perfil */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Supabase status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isSupabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-[11px] font-medium text-slate-600">
            {isSupabaseConnected ? 'Supabase conectado' : 'Offline'}
          </span>
        </div>

        {/* Perfil */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/avatar_engineer.jpg"
              alt="Luiz Felipe"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>
          <div className="hidden md:block min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate leading-tight">Luiz Felipe</p>
            <p className="text-[11px] text-slate-500 truncate leading-tight">Assistente QSMS</p>
          </div>
        </div>
      </div>
    </header>
  );
}
