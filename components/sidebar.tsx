'use client';

import React from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  Anchor,
  Award,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
}: SidebarProps) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      sublabel: 'Painel Geral',
      icon: LayoutDashboard,
    },
    {
      id: 'procedimentos',
      label: 'Procedimentos & POPs',
      sublabel: 'Biblioteca Oficial',
      icon: FileText,
    },
    {
      id: 'provas',
      label: 'Gestão de Provas & Links',
      sublabel: 'Avaliações de Eficácia',
      icon: CheckSquare,
    },
    {
      id: 'certificados',
      label: 'Certificados',
      sublabel: 'Internos e Normativos',
      icon: Award,
    },
    {
      id: 'matriz',
      label: 'Matriz & Colaboradores',
      sublabel: 'Conformidade de Equipes',
      icon: Users,
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
            </button>
          );
        })}

      </div>
    </aside>
  );
}
