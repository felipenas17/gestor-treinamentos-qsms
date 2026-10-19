'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  Anchor,
  Award,
  GraduationCap,
  FolderOpen,
  Shield,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
}

interface Module {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

const MODULES: Module[] = [
  {
    id: 'treinamento',
    label: 'Treinamento',
    icon: GraduationCap,
    items: [
      { id: 'dashboard',     label: 'Dashboard',            sublabel: 'Painel Geral',           icon: LayoutDashboard },
      { id: 'provas',        label: 'Provas & Links',       sublabel: 'Avaliações de Eficácia', icon: CheckSquare     },
      { id: 'certificados',  label: 'Certificados',         sublabel: 'Internos e Normativos',  icon: Award           },
      { id: 'matriz',        label: 'Matriz & Colaboradores', sublabel: 'Conformidade de Equipes', icon: Users         },
    ],
  },
  {
    id: 'documentacao',
    label: 'Documentação & Controle',
    icon: FolderOpen,
    items: [
      { id: 'procedimentos',    label: 'Procedimentos & POPs',  sublabel: 'Revisões e Vigência',      icon: FileText },
      { id: 'doc-controle',     label: 'Controle Documental',   sublabel: 'Licenças e Autorizações',  icon: Shield          },
      { id: 'obrigacoes-legais', label: 'Obrigações Legais',    sublabel: 'Cumprimento e Prazos',     icon: ClipboardCheck  },
    ],
  },
  {
    id: 'sgi',
    label: 'SGI / Conformidade',
    icon: ShieldCheck,
    items: [
      { id: 'conformidade', label: 'Score de Conformidade', sublabel: 'Índice Global do SGI',      icon: ShieldCheck   },
      { id: 'nc-capa',      label: 'NC / CAPA',             sublabel: 'Não Conformidades & Ações', icon: AlertTriangle },
      { id: 'relatorio',    label: 'Relatório Gerencial',   sublabel: 'Visão Consolidada',         icon: BarChart3     },
    ],
  },
];

export function Sidebar({ currentTab, onSelectTab }: SidebarProps) {
  const activeModuleId = useMemo(() => {
    for (const mod of MODULES) {
      if (mod.items.some(item => item.id === currentTab)) return mod.id;
    }
    return MODULES[0].id;
  }, [currentTab]);

  const [openModules, setOpenModules] = useState<Set<string>>(
    () => new Set([activeModuleId])
  );

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleSelectTab = (tabId: string, moduleId: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      next.add(moduleId);
      return next;
    });
    onSelectTab(tabId);
  };

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
              Tiger Rentank — Offshore
            </p>
          </div>
        </div>
      </div>

      {/* Modules Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {MODULES.map((mod) => {
          const ModIcon = mod.icon;
          const isOpen = openModules.has(mod.id);
          const hasActive = mod.items.some(item => item.id === currentTab);

          return (
            <div key={mod.id}>
              {/* Module Header */}
              <button
                onClick={() => toggleModule(mod.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left mb-0.5 group ${
                  hasActive
                    ? 'text-blue-300 bg-blue-950/60'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <ModIcon className={`w-3.5 h-3.5 shrink-0 ${hasActive ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-widest">
                  {mod.label}
                </span>
                {isOpen
                  ? <ChevronDown className="w-3 h-3 shrink-0 text-slate-600" />
                  : <ChevronRight className="w-3 h-3 shrink-0 text-slate-600" />
                }
              </button>

              {/* Module Items */}
              {isOpen && (
                <div className="ml-2 pl-3 border-l border-slate-800/70 space-y-0.5 mb-2">
                  {mod.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id, mod.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left group ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                          }`}
                        />
                        <div className="flex-1 truncate">
                          <div className="truncate leading-tight font-medium">{item.label}</div>
                          <div className={`text-[11px] truncate ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                            {item.sublabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </aside>
  );
}
