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
  Shield,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  Activity,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
}

interface SubGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

type ModuleChild = NavItem | SubGroup;

function isSubGroup(child: ModuleChild): child is SubGroup {
  return 'items' in child;
}

function getAllItemIds(mod: Module): string[] {
  const ids: string[] = [];
  mod.items?.forEach(item => ids.push(item.id));
  mod.groups?.forEach(g => g.items.forEach(item => ids.push(item.id)));
  mod.children?.forEach(child => {
    if (isSubGroup(child)) child.items.forEach(item => ids.push(item.id));
    else ids.push(child.id);
  });
  return ids;
}

interface Module {
  id: string;
  label: string;
  icon: React.ElementType;
  children?: ModuleChild[]; // ordered mix: NavItem | SubGroup
  items?: NavItem[];         // legacy flat list
  groups?: SubGroup[];       // legacy grouped list
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

const MODULES: Module[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    icon: BarChart3,
    items: [
      { id: 'relatorio', label: 'Painel Geral', sublabel: 'Visão Consolidada', icon: BarChart3 },
    ],
  },
  {
    id: 'sgi',
    label: 'SGI',
    icon: ShieldCheck,
    children: [
      { id: 'conformidade',      label: 'Score de Conformidade', sublabel: 'Índice Global do SGI',     icon: ShieldCheck    },
      {
        id: 'nao-conformidade',
        label: 'Não Conformidade',
        icon: AlertTriangle,
        items: [
          { id: 'nc-capa',      label: 'RNC',       sublabel: 'Registro de Não Conformidade',  icon: AlertTriangle },
          { id: 'nc-roi',       label: 'ROI',       sublabel: 'Registro de Ocorrência Interna', icon: FileText     },
          { id: 'nc-dashboard', label: 'Dashboard', sublabel: 'RNC × ROI — Indicadores',        icon: BarChart3    },
        ],
      },
      { id: 'auditoria-interna', label: 'Auditoria Interna',    sublabel: 'Diagnóstico Automático',  icon: ClipboardCheck },
      { id: 'procedimentos',     label: 'Procedimentos & POPs', sublabel: 'Revisões e Vigência',     icon: FileText       },
      { id: 'doc-controle',      label: 'Controle Documental',  sublabel: 'Licenças e Autorizações', icon: Shield         },
      { id: 'obrigacoes-legais', label: 'Obrigações Legais',    sublabel: 'Cumprimento e Prazos',    icon: ClipboardCheck },
    ],
  },
  {
    id: 'sms',
    label: 'SMS',
    icon: Shield,
    groups: [
      {
        id: 'treinamentos',
        label: 'Treinamentos',
        icon: GraduationCap,
        items: [
          { id: 'dashboard',    label: 'Dashboard',              sublabel: 'Painel Geral',            icon: LayoutDashboard },
          { id: 'provas',       label: 'Provas & Links',         sublabel: 'Avaliações de Eficácia',  icon: CheckSquare     },
          { id: 'certificados', label: 'Certificados',           sublabel: 'Internos e Normativos',   icon: Award           },
          { id: 'matriz',       label: 'Matriz & Colaboradores', sublabel: 'Conformidade de Equipes', icon: Users           },
        ],
      },
      {
        id: 'programas-sst',
        label: 'Programas SST',
        icon: ShieldCheck,
        items: [
          { id: 'programas-sst', label: 'Programas SST', sublabel: 'Documentos e Laudos', icon: FileText },
          { id: 'acidentes-indicadores', label: 'TFCA / TFSA', sublabel: 'Indicadores de Acidentes', icon: Activity },
        ],
      },
    ],
  },
];

export function Sidebar({ currentTab, onSelectTab }: SidebarProps) {
  const activeModuleId = useMemo(() => {
    for (const mod of MODULES) {
      if (getAllItemIds(mod).includes(currentTab)) return mod.id;
    }
    return MODULES[0].id;
  }, [currentTab]);

  const activeGroupId = useMemo(() => {
    for (const mod of MODULES) {
      for (const g of mod.groups ?? []) {
        if (g.items.some(item => item.id === currentTab)) return g.id;
      }
      for (const child of mod.children ?? []) {
        if (isSubGroup(child) && child.items.some(item => item.id === currentTab)) return child.id;
      }
    }
    return null;
  }, [currentTab]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeGroupId ? [activeGroupId] : [])
  );

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  };

  const [openModules, setOpenModules] = useState<Set<string>>(
    () => new Set([activeModuleId])
  );

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId); else next.add(moduleId);
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

  const renderNavItem = (item: NavItem, moduleId: string) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleSelectTab(item.id, moduleId)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left group ${
          isActive
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
        <div className="flex-1 truncate">
          <div className="truncate leading-tight font-medium">{item.label}</div>
          <div className={`text-[11px] truncate ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>{item.sublabel}</div>
        </div>
      </button>
    );
  };

  const renderSubGroup = (group: SubGroup, moduleId: string) => {
    const GIcon = group.icon;
    const isGroupOpen = openGroups.has(group.id);
    const groupHasActive = group.items.some(item => item.id === currentTab);
    return (
      <div key={group.id}>
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left group ${
            groupHasActive
              ? 'text-blue-300 bg-blue-950/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <GIcon className={`w-4 h-4 shrink-0 ${groupHasActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
          <span className="flex-1 truncate text-[12px] font-semibold">{group.label}</span>
          {isGroupOpen
            ? <ChevronDown className="w-3 h-3 shrink-0 text-slate-600" />
            : <ChevronRight className="w-3 h-3 shrink-0 text-slate-600" />
          }
        </button>
        {isGroupOpen && (
          <div className="ml-2 pl-3 border-l border-slate-800/50 space-y-0.5 mt-0.5 mb-1">
            {group.items.map(item => renderNavItem(item, moduleId))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-72 bg-[#0c1222] border-r border-slate-800 text-slate-300 flex flex-col shrink-0 h-full overflow-y-auto select-none">

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
          const hasActive = getAllItemIds(mod).includes(currentTab);

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

              {/* Module Content */}
              {isOpen && (
                <div className="ml-2 pl-3 border-l border-slate-800/70 space-y-0.5 mb-2">

                  {/* Ordered children (NavItem | SubGroup mixed) */}
                  {mod.children?.map(child =>
                    isSubGroup(child)
                      ? renderSubGroup(child, mod.id)
                      : renderNavItem(child, mod.id)
                  )}

                  {/* Legacy: direct items */}
                  {mod.items?.map(item => renderNavItem(item, mod.id))}

                  {/* Legacy: sub-groups */}
                  {mod.groups?.map(group => renderSubGroup(group, mod.id))}

                </div>
              )}
            </div>
          );
        })}
      </div>

    </aside>
  );
}
