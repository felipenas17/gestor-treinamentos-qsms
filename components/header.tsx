'use client';

import React from 'react';
import { 
  Bell, 
  Search, 
  ExternalLink, 
  Database, 
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onOpenSchemaModal: () => void;
  onOpenImagesModal: () => void;
}

export function Header({
  currentTab,
  onOpenSchemaModal,
  onOpenImagesModal,
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

      {/* Zone 2: Informational / System markers — oculto até modal estar ativo */}
      <div className="hidden" />

      {/* Zone 3: Primary and Secondary Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Botões Links Imagens e Esquema SQL — ocultos até modal estar ativo */}
      </div>
    </header>
  );
}
