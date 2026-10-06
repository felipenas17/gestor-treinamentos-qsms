'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  Users, 
  Database, 
  Image as ImageIcon,
  ShieldCheck,
  Anchor,
  Sparkles,
  Radio,
  Award,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSchemaModal: () => void;
  onOpenImagesModal: () => void;
  isSupabaseConnected: boolean;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  onOpenSchemaModal,
  onOpenImagesModal,
  isSupabaseConnected,
}: SidebarProps) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      sublabel: 'Painel Geral',
      icon: LayoutDashboard,
      badge: '94.2%',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40',
    },
    {
      id: 'procedimentos',
      label: 'Procedimentos & POPs',
      sublabel: 'Biblioteca Oficial',
      icon: FileText,
      badge: '8 POPs',
      badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-800/40',
    },
    {
      id: 'provas',
      label: 'Gestão de Provas & Links',
      sublabel: 'Avaliações de Eficácia',
      icon: CheckSquare,
      badge: 'UUID Ativo',
      badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/40',
    },
    {
      id: 'certificados',
      label: 'Certificados',
      icon: Award,
      badge: '',
      description: 'Internos e Normativos',
    },
    {
      id: 'matriz',
      label: 'Matriz & Colaboradores',
      sublabel: 'Conformidade de Equipes',
      icon: Users,
      badge: '478 Cert.',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/40',
    },
  ];

  return (
    <aside className="w-72 bg-[#0c1222] border-r border-slate-800 text-slate-300 flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 bg-[#090e1a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-900/30 border border-blue-400/30">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base tracking-tight truncate">
                Gestor QSMS
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold text-blue-300 bg-blue-900/50 rounded border border-blue-700/50">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              Treinamentos Offshore
            </p>
          </div>
        </div>

        {/* Offshore vessel / telemetry pill */}
        <div className="mt-3.5 px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium truncate">FPSO Guanabara / DP2</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold tabular-nums">
            NR-37 OK
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
          Módulos Principais
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                }`}
              />
              <div className="flex-1 truncate">
                <div className="truncate leading-tight font-medium">{item.label}</div>
                <div className={`text-[11px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                  {item.sublabel}
                </div>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                  isActive
                    ? 'bg-blue-700/80 text-blue-100 border-blue-500'
                    : item.badgeColor
                }`}
              >
                {item.badge}
              </span>
            </button>
          );
        })}

        {/* Quick Tools Section */}
        <div className="pt-6 px-3 pb-2 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
          Recursos & Integrações
        </div>

        <button
          onClick={onOpenImagesModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <span>Links Diretos de Imagens</span>
          </div>
          <span className="text-[10px] text-purple-300 font-mono bg-purple-950/60 border border-purple-800/40 px-1.5 py-0.5 rounded">
            HTML
          </span>
        </button>

        <button
          onClick={onOpenSchemaModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Banco Supabase & DDL</span>
          </div>
          <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
            RLS SQL
          </span>
        </button>
      </div>

      {/* Database Status Indicator & Profile Footer */}
      <div className="p-4 border-t border-slate-800 bg-[#090e1a]/90 space-y-3">
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className="font-medium text-slate-300">
                {isSupabaseConnected ? 'Supabase Nuvem' : 'Armazenamento Reativo'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">UUID Seguro</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            {isSupabaseConnected ? 'Sincronização em tempo real ativa' : 'Simulação de DDL & RLS com tokens UUID'}
          </p>
        </div>

        {/* Current user */}
        <div className="flex items-center gap-3 pt-1">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-700 border border-slate-600 relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/images/avatar_engineer.jpg" 
              alt="Eng. Roberto Silva"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">Eng. Carlos Silva</p>
            <p className="text-[11px] text-slate-400 truncate">Coord. QSMS Offshore</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
