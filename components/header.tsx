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
      // Visão Geral
      case 'relatorio':          return 'Painel Geral de Conformidade Operacional';
      // SGI
      case 'conformidade':       return 'Score de Conformidade — Índice Global SGI';
      case 'nc-capa':            return 'RNC — Registro de Não Conformidade';
      case 'nc-roi':             return 'ROI — Registro de Ocorrência Interna';
      case 'nc-dashboard':       return 'Dashboard de Não Conformidades';
      case 'auditoria-interna':  return 'Auditoria Interna — Diagnóstico Automático';
      case 'procedimentos':      return 'Procedimentos & POPs — Biblioteca Documental';
      case 'doc-controle':       return 'Controle Documental — Licenças e Autorizações';
      case 'obrigacoes-legais':  return 'Obrigações Legais — Cumprimento e Prazos';
      // SMS / Treinamentos
      case 'dashboard':          return 'Dashboard de Treinamentos — Painel Geral';
      case 'provas':             return 'Gestão de Provas & Links de Avaliação';
      case 'certificados':       return 'Certificados — Internos e Normativos';
      case 'matriz':             return 'Matriz de Treinamentos & Colaboradores';
      // SMS / Programas SST
      case 'programas-sst':      return 'Programas SST — Documentos e Laudos';
      case 'acidentes-indicadores': return 'TFCA / TFSA — Indicadores de Acidentes';
      case 'pt-pet':             return 'PT / PET — Permissões de Trabalho';
      case 'epi-epc':            return 'EPI / EPC — Gestão de Equipamentos';
      // SMS / Gestão de Riscos
      case 'laaipr':             return 'LAAIPR — Aspectos, Impactos e Riscos';
      case 'cipa':               return 'CIPA — Comissão Interna de Prevenção';
      // SMS / Gestão Ambiental
      case 'indicadores-ambientais': return 'Indicadores Ambientais — ISO 14001';
      case 'residuos-ete':       return 'Resíduos / ETE — NBR 10004 · CONAMA';
      default:                   return 'SGI — Sistema de Gestão Integrado';
    }
  };

  const getBreadcrumb = () => {
    switch (currentTab) {
      // Visão Geral
      case 'relatorio':          return 'SGI / Visão Geral';
      // SGI
      case 'conformidade':       return 'SGI / Score de Conformidade';
      case 'nc-capa':            return 'SGI / Não Conformidade / RNC';
      case 'nc-roi':             return 'SGI / Não Conformidade / ROI';
      case 'nc-dashboard':       return 'SGI / Não Conformidade / Dashboard';
      case 'auditoria-interna':  return 'SGI / Auditoria Interna';
      case 'procedimentos':      return 'SGI / Procedimentos & POPs';
      case 'doc-controle':       return 'SGI / Controle Documental';
      case 'obrigacoes-legais':  return 'SGI / Obrigações Legais';
      // SMS / Treinamentos
      case 'dashboard':          return 'SMS / Treinamentos / Dashboard';
      case 'provas':             return 'SMS / Treinamentos / Provas & Links';
      case 'certificados':       return 'SMS / Treinamentos / Certificados';
      case 'matriz':             return 'SMS / Treinamentos / Matriz & Colaboradores';
      // SMS / Programas SST
      case 'programas-sst':      return 'SMS / Programas SST';
      case 'acidentes-indicadores': return 'SMS / Programas SST / TFCA·TFSA';
      case 'pt-pet':             return 'SMS / Programas SST / PT·PET';
      case 'epi-epc':            return 'SMS / Programas SST / EPI·EPC';
      // SMS / Gestão de Riscos
      case 'laaipr':             return 'SMS / Gestão de Riscos / LAAIPR';
      case 'cipa':               return 'SMS / Gestão de Riscos / CIPA';
      // SMS / Gestão Ambiental
      case 'indicadores-ambientais': return 'SMS / Gestão Ambiental / Indicadores';
      case 'residuos-ete':       return 'SMS / Gestão Ambiental / Resíduos · ETE';
      default:                   return 'Tiger Rentank / QSMS';
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
            <p className="text-[11px] text-slate-500 truncate leading-tight">Analista QSMS</p>
          </div>
        </div>
      </div>
    </header>
  );
}
