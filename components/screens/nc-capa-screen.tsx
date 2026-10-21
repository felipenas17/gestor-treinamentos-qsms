'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle, Plus, CheckCircle2, Clock, XCircle,
  ChevronDown, ChevronUp, Search, Filter, Edit2, Trash2,
  AlertOctagon, Info, TrendingUp, X, Save, ChevronRight,
} from 'lucide-react';
import {
  NonConformity, NCType, NCSeverity, NCSource, NCStatus,
  NCEffectiveness, NCStatusHistoryEntry,
} from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const NC_TYPES: NCType[] = ['NC', 'Observação', 'Oportunidade de Melhoria'];
const NC_SEVERITIES: NCSeverity[] = ['Crítica', 'Moderada', 'Leve'];
const NC_SOURCES: NCSource[] = [
  'Auditoria Interna', 'Auditoria Externa', 'Inspeção',
  'Reclamação', 'Análise Crítica', 'Outro',
];
const NC_STATUSES: NCStatus[] = ['Aberta', 'Em tratamento', 'Aguardando verificação', 'Encerrada'];

const NC_ORIGINS = [
  'NC de processo',
  'OBS de processo',
  'NC de auditoria',
  'OBS ou OM de auditoria',
  'NC motivada por reclamação',
  'OBS motivada por reclamação',
];

// ─── Style helpers ────────────────────────────────────────────────────────────

function statusStyle(status: NCStatus) {
  switch (status) {
    case 'Aberta':                 return 'bg-red-100 text-red-800 border-red-200';
    case 'Em tratamento':          return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Aguardando verificação': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Encerrada':              return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:                       return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function statusIcon(status: NCStatus) {
  switch (status) {
    case 'Aberta':                 return <XCircle className="w-3 h-3" />;
    case 'Em tratamento':          return <Clock className="w-3 h-3" />;
    case 'Aguardando verificação': return <AlertTriangle className="w-3 h-3" />;
    case 'Encerrada':              return <CheckCircle2 className="w-3 h-3" />;
    default:                       return null;
  }
}

function severityStyle(severity: NCSeverity) {
  switch (severity) {
    case 'Crítica':  return 'bg-red-500 text-white';
    case 'Moderada': return 'bg-amber-500 text-white';
    case 'Leve':     return 'bg-emerald-500 text-white';
    default:         return 'bg-slate-400 text-white';
  }
}

function typeIcon(type: NCType) {
  switch (type) {
    case 'NC':                       return <AlertOctagon className="w-4 h-4 text-red-500" />;
    case 'Observação':               return <Info className="w-4 h-4 text-blue-500" />;
    case 'Oportunidade de Melhoria': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    default:                         return null;
  }
}

// ─── Form type ────────────────────────────────────────────────────────────────

type NCFormData = {
  // Identificação
  code: string;
  title: string;
  description: string;
  type: NCType;
  severity: NCSeverity;
  source: NCSource;
  status: NCStatus;
  detectedDate: string;
  deadline: string;
  responsible: string;
  sector: string;
  itemQualidade: boolean;
  itemAmbiental: boolean;
  itemSSO: boolean;
  origin: string;
  immediateAction: string;
  // Investigação & CAPA
  rootCause: string;
  correctiveAction: string;
  actionResponsible: string;
  actionDeadline: string;
  riskReviewRequired: boolean;
  changeManagementRequired: boolean;
  actionImplemented: string;
  implementationDate: string;
  followUpStatus: string;
  // Análise de Causas
  ishikawaManpower: string;
  ishikawaEnvironment: string;
  ishikawaMaterials: string;
  ishikawaMachinery: string;
  ishikawaMeasurement: string;
  ishikawaMethods: string;
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
  w2h_what: string;
  w2h_why: string;
  w2h_where: string;
  w2h_when: string;
  w2h_who: string;
  w2h_how: string;
  w2h_howMuch: string;
  rootCauseIdentified: string;
  // Verificação & Eficácia
  effectiveness: '' | NCEffectiveness;
  effectivenessDate: string;
  qsmsResponsible: string;
  effectivenessCheck: string;
  // Extras
  notes: string;
  preventiveAction: string;
  // Cliente (geral)
  client: string;
  // Campos específicos Clariant
  qnsNumber: string;
  endCustomer: string;
  chemicalProduct: string;
  originLocation: string;
  // D1 / D5 / D7
  responseD1: string;
  responseD5: string;
  responseD7: string;
  statusD1: string;
  statusD5: string;
  statusD7: string;
};

function emptyForm(): NCFormData {
  return {
    code: '', title: '', description: '',
    type: 'NC', severity: 'Moderada', source: 'Auditoria Interna', status: 'Aberta',
    detectedDate: new Date().toISOString().split('T')[0],
    deadline: '', responsible: '', sector: '',
    itemQualidade: false, itemAmbiental: false, itemSSO: false,
    origin: '', immediateAction: '',
    rootCause: '', correctiveAction: '', actionResponsible: '',
    actionDeadline: '', riskReviewRequired: false, changeManagementRequired: false,
    actionImplemented: '', implementationDate: '', followUpStatus: '',
    ishikawaManpower: '', ishikawaEnvironment: '', ishikawaMaterials: '',
    ishikawaMachinery: '', ishikawaMeasurement: '', ishikawaMethods: '',
    why1: '', why2: '', why3: '', why4: '', why5: '',
    w2h_what: '', w2h_why: '', w2h_where: '', w2h_when: '',
    w2h_who: '', w2h_how: '', w2h_howMuch: '',
    rootCauseIdentified: '',
    effectiveness: '', effectivenessDate: '', qsmsResponsible: '',
    effectivenessCheck: '',
    notes: '', preventiveAction: '',
    client: '',
    qnsNumber: '', endCustomer: '', chemicalProduct: '', originLocation: '',
    responseD1: '', responseD5: '', responseD7: '',
    statusD1: '', statusD5: '', statusD7: '',
  };
}

function formFromNC(nc: NonConformity): NCFormData {
  return {
    code: nc.code,
    title: nc.title,
    description: nc.description ?? '',
    type: nc.type,
    severity: nc.severity,
    source: nc.source,
    status: nc.status,
    detectedDate: nc.detectedDate,
    deadline: nc.deadline ?? '',
    responsible: nc.responsible ?? '',
    sector: nc.sector ?? '',
    itemQualidade: nc.itemQualidade ?? false,
    itemAmbiental: nc.itemAmbiental ?? false,
    itemSSO: nc.itemSSO ?? false,
    origin: nc.origin ?? '',
    immediateAction: nc.immediateAction ?? '',
    rootCause: nc.rootCause ?? '',
    correctiveAction: nc.correctiveAction ?? '',
    actionResponsible: nc.actionResponsible ?? '',
    actionDeadline: nc.actionDeadline ?? '',
    riskReviewRequired: nc.riskReviewRequired ?? false,
    changeManagementRequired: nc.changeManagementRequired ?? false,
    actionImplemented: nc.actionImplemented ?? '',
    implementationDate: nc.implementationDate ?? '',
    followUpStatus: nc.followUpStatus ?? '',
    ishikawaManpower: nc.ishikawaManpower ?? '',
    ishikawaEnvironment: nc.ishikawaEnvironment ?? '',
    ishikawaMaterials: nc.ishikawaMaterials ?? '',
    ishikawaMachinery: nc.ishikawaMachinery ?? '',
    ishikawaMeasurement: nc.ishikawaMeasurement ?? '',
    ishikawaMethods: nc.ishikawaMethods ?? '',
    why1: nc.why1 ?? '',
    why2: nc.why2 ?? '',
    why3: nc.why3 ?? '',
    why4: nc.why4 ?? '',
    why5: nc.why5 ?? '',
    w2h_what: nc.w2h_what ?? '',
    w2h_why: nc.w2h_why ?? '',
    w2h_where: nc.w2h_where ?? '',
    w2h_when: nc.w2h_when ?? '',
    w2h_who: nc.w2h_who ?? '',
    w2h_how: nc.w2h_how ?? '',
    w2h_howMuch: nc.w2h_howMuch ?? '',
    rootCauseIdentified: nc.rootCauseIdentified ?? '',
    effectiveness: (nc.effectiveness as '' | NCEffectiveness) ?? '',
    effectivenessDate: nc.effectivenessDate ?? '',
    qsmsResponsible: nc.qsmsResponsible ?? '',
    effectivenessCheck: nc.effectivenessCheck ?? '',
    notes: nc.notes ?? '',
    preventiveAction: nc.preventiveAction ?? '',
    client: nc.client ?? '',
    qnsNumber: nc.qnsNumber ?? '',
    endCustomer: nc.endCustomer ?? '',
    chemicalProduct: nc.chemicalProduct ?? '',
    originLocation: nc.originLocation ?? '',
    responseD1: nc.responseD1 ?? '',
    responseD5: nc.responseD5 ?? '',
    responseD7: nc.responseD7 ?? '',
    statusD1: nc.statusD1 ?? '',
    statusD5: nc.statusD5 ?? '',
    statusD7: nc.statusD7 ?? '',
  };
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type TabId = 'identificacao' | 'investigacao' | 'analise' | 'eficacia';

const TABS: { id: TabId; label: string }[] = [
  { id: 'identificacao', label: 'Identificação' },
  { id: 'investigacao',  label: 'Investigação & CAPA' },
  { id: 'analise',       label: 'Análise de Causas' },
  { id: 'eficacia',      label: 'Verificação & Eficácia' },
];

// ─── Modal ────────────────────────────────────────────────────────────────────

interface NCModalProps {
  initial?: NonConformity | null;
  onSave: (data: NCFormData) => void;
  onClose: () => void;
}

function NCModal({ initial, onSave, onClose }: NCModalProps) {
  const [form, setForm] = useState<NCFormData>(() =>
    initial ? formFromNC(initial) : emptyForm()
  );
  const [tab, setTab] = useState<TabId>('identificacao');

  const set = <K extends keyof NCFormData>(field: K, value: NCFormData[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim() || !form.detectedDate) return;
    onSave(form);
  };

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all';
  const textareaCls = inputCls + ' resize-none';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';
  const selectCls = inputCls + ' bg-white';
  const sectionTitle = 'text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {typeIcon(form.type)}
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {initial ? 'Editar Não Conformidade' : 'Registrar Não Conformidade'}
              </h2>
              <p className="text-xs text-slate-500">
                FOR-TR-SMS-006 · {form.code || 'Novo registro'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 shrink-0 overflow-x-auto">
          {TABS.map((t, idx) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                tab === t.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>{idx + 1}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── TAB 1: IDENTIFICAÇÃO ── */}
          {tab === 'identificacao' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Número do Relatório *</label>
                  <input
                    className={inputCls + ' font-mono'}
                    placeholder="NC-2024-001"
                    value={form.code}
                    onChange={(e) => set('code', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Data *</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.detectedDate}
                    onChange={(e) => set('detectedDate', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Departamento / Setor</label>
                <input
                  className={inputCls}
                  placeholder="Ex: Operações Offshore"
                  value={form.sector}
                  onChange={(e) => set('sector', e.target.value)}
                />
              </div>

              {/* Item da Ocorrência */}
              <div>
                <p className={labelCls}>Item da Ocorrência</p>
                <div className="flex gap-4">
                  {([
                    { field: 'itemQualidade' as const, label: 'Qualidade' },
                    { field: 'itemAmbiental' as const, label: 'Ambiental' },
                    { field: 'itemSSO' as const, label: 'SSO' },
                  ]).map(({ field, label }) => (
                    <label key={field} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form[field] as boolean}
                        onChange={(e) => set(field, e.target.checked as any)}
                        className="w-3.5 h-3.5 rounded text-blue-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Tipo, Severidade, Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Tipo *</label>
                  <select
                    className={selectCls}
                    value={form.type}
                    onChange={(e) => set('type', e.target.value as NCType)}
                  >
                    {NC_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Severidade *</label>
                  <select
                    className={selectCls}
                    value={form.severity}
                    onChange={(e) => set('severity', e.target.value as NCSeverity)}
                  >
                    {NC_SEVERITIES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status *</label>
                  <select
                    className={selectCls}
                    value={form.status}
                    onChange={(e) => set('status', e.target.value as NCStatus)}
                  >
                    {NC_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Origem */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Fonte *</label>
                  <select
                    className={selectCls}
                    value={form.source}
                    onChange={(e) => set('source', e.target.value as NCSource)}
                  >
                    {NC_SOURCES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Origem da Ocorrência</label>
                  <select
                    className={selectCls}
                    value={form.origin}
                    onChange={(e) => set('origin', e.target.value)}
                  >
                    <option value="">— Selecionar —</option>
                    {NC_ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Título e Descrição */}
              <div>
                <label className={labelCls}>Título / Resumo *</label>
                <input
                  className={inputCls}
                  placeholder="Descrição resumida da não conformidade"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Descrição detalhada</label>
                <textarea
                  className={textareaCls}
                  rows={3}
                  placeholder="Descreva em detalhes o problema identificado, o que ocorreu, onde, quando…"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>

              {/* Ação de Correção Imediata */}
              <div>
                <label className={labelCls}>Ação de Correção Imediata</label>
                <textarea
                  className={textareaCls}
                  rows={2}
                  placeholder="O que foi feito imediatamente para conter o problema?"
                  value={form.immediateAction}
                  onChange={(e) => set('immediateAction', e.target.value)}
                />
              </div>

              {/* Cliente */}
              <div>
                <label className={labelCls}>Cliente</label>
                <input
                  className={inputCls}
                  placeholder="Ex: Clariant, Shell, Petrobras, Prio…"
                  value={form.client}
                  onChange={(e) => set('client', e.target.value)}
                />
              </div>

              {/* Responsável e Prazo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Responsável</label>
                  <input
                    className={inputCls}
                    placeholder="Nome do responsável"
                    value={form.responsible}
                    onChange={(e) => set('responsible', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Prazo para Resolução</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.deadline}
                    onChange={(e) => set('deadline', e.target.value)}
                  />
                </div>
              </div>

              {/* ── Controle D1 / D5 / D7 ── */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className={sectionTitle}>⏱ Controle de Prazo D1 / D5 / D7</p>
                <div className="grid grid-cols-3 gap-3">
                  {/* D1 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">D1 — 1 dia</span>
                      {(() => {
                        const d1Status = form.statusD1 || (form.responseD1 && form.detectedDate
                          ? (() => {
                              const open = new Date(form.detectedDate);
                              const resp = new Date(form.responseD1);
                              const diff = Math.round((resp.getTime() - open.getTime()) / 86400000);
                              return diff <= 1 ? 'No Prazo' : 'Fora do Prazo';
                            })()
                          : form.detectedDate
                            ? (() => {
                                const open = new Date(form.detectedDate);
                                const today = new Date();
                                const diff = Math.round((today.getTime() - open.getTime()) / 86400000);
                                return diff > 1 ? 'Fora do Prazo' : 'Pendente';
                              })()
                            : 'Pendente');
                        const color = d1Status === 'No Prazo' ? 'bg-emerald-100 text-emerald-700' : d1Status === 'Fora do Prazo' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                        return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{d1Status}</span>;
                      })()}
                    </div>
                    <label className="block text-[10px] text-slate-500">Retorno D1</label>
                    <input type="date" className={inputCls + ' text-xs py-1'} value={form.responseD1} onChange={(e) => set('responseD1', e.target.value)} />
                  </div>
                  {/* D5 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">D5 — 5 dias</span>
                      {(() => {
                        const d5Status = form.statusD5 || (form.responseD5 && form.detectedDate
                          ? (() => {
                              const open = new Date(form.detectedDate);
                              const resp = new Date(form.responseD5);
                              const diff = Math.round((resp.getTime() - open.getTime()) / 86400000);
                              return diff <= 5 ? 'No Prazo' : 'Fora do Prazo';
                            })()
                          : form.detectedDate
                            ? (() => {
                                const open = new Date(form.detectedDate);
                                const today = new Date();
                                const diff = Math.round((today.getTime() - open.getTime()) / 86400000);
                                return diff > 5 ? 'Fora do Prazo' : 'Pendente';
                              })()
                            : 'Pendente');
                        const color = d5Status === 'No Prazo' ? 'bg-emerald-100 text-emerald-700' : d5Status === 'Fora do Prazo' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                        return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{d5Status}</span>;
                      })()}
                    </div>
                    <label className="block text-[10px] text-slate-500">Retorno D5</label>
                    <input type="date" className={inputCls + ' text-xs py-1'} value={form.responseD5} onChange={(e) => set('responseD5', e.target.value)} />
                  </div>
                  {/* D7 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">D7 — 7 dias</span>
                      {(() => {
                        const d7Status = form.statusD7 || (form.responseD7 && form.detectedDate
                          ? (() => {
                              const open = new Date(form.detectedDate);
                              const resp = new Date(form.responseD7);
                              const diff = Math.round((resp.getTime() - open.getTime()) / 86400000);
                              return diff <= 7 ? 'No Prazo' : 'Fora do Prazo';
                            })()
                          : form.detectedDate
                            ? (() => {
                                const open = new Date(form.detectedDate);
                                const today = new Date();
                                const diff = Math.round((today.getTime() - open.getTime()) / 86400000);
                                return diff > 7 ? 'Fora do Prazo' : 'Pendente';
                              })()
                            : 'Pendente');
                        const color = d7Status === 'No Prazo' ? 'bg-emerald-100 text-emerald-700' : d7Status === 'Fora do Prazo' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                        return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{d7Status}</span>;
                      })()}
                    </div>
                    <label className="block text-[10px] text-slate-500">Retorno D7</label>
                    <input type="date" className={inputCls + ' text-xs py-1'} value={form.responseD7} onChange={(e) => set('responseD7', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* ── Bloco Clariant (visível quando cliente = Clariant) ── */}
              {form.client.toLowerCase().includes('clariant') && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-3">🔬 Campos Específicos Clariant</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Nº QNS (Clariant)</label>
                      <input
                        className={inputCls}
                        placeholder="QNS-XXXXX"
                        value={form.qnsNumber}
                        onChange={(e) => set('qnsNumber', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Cliente Final</label>
                      <input
                        className={inputCls}
                        placeholder="Shell, Petrobras, Prio…"
                        value={form.endCustomer}
                        onChange={(e) => set('endCustomer', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Produto Químico</label>
                      <input
                        className={inputCls}
                        placeholder="Nome do produto químico"
                        value={form.chemicalProduct}
                        onChange={(e) => set('chemicalProduct', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Local de Origem</label>
                      <input
                        className={inputCls}
                        placeholder="Local onde ocorreu"
                        value={form.originLocation}
                        onChange={(e) => set('originLocation', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── TAB 2: INVESTIGAÇÃO & CAPA ── */}
          {tab === 'investigacao' && (
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <strong>Fase 2 — Investigação & CAPA.</strong> Preencha após investigação da causa raiz.
                A NC deve estar em <em>Em Investigação</em> ou posterior para este conteúdo.
              </div>

              <div>
                <label className={labelCls}>Investigação da Causa</label>
                <textarea
                  className={textareaCls}
                  rows={3}
                  placeholder="Descreva a investigação realizada, os fatos levantados e as hipóteses de causa…"
                  value={form.rootCause}
                  onChange={(e) => set('rootCause', e.target.value)}
                />
              </div>

              <div>
                <label className={labelCls}>Ação Corretiva (elimina a causa raiz)</label>
                <textarea
                  className={textareaCls}
                  rows={3}
                  placeholder="Descreva a ação corretiva planejada para eliminar a causa raiz…"
                  value={form.correctiveAction}
                  onChange={(e) => set('correctiveAction', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Responsável pela Ação</label>
                  <input
                    className={inputCls}
                    placeholder="Nome / cargo"
                    value={form.actionResponsible}
                    onChange={(e) => set('actionResponsible', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Prazo da Ação Corretiva</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.actionDeadline}
                    onChange={(e) => set('actionDeadline', e.target.value)}
                  />
                </div>
              </div>

              {/* Revisão de Análise de Risco e Gestão de Mudanças */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-medium text-slate-700 mb-2">Revisão de Análise de Risco</p>
                  <div className="flex gap-4">
                    {(['Sim', 'Não'] as const).map((v) => (
                      <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="riskReview"
                          checked={form.riskReviewRequired === (v === 'Sim')}
                          onChange={() => set('riskReviewRequired', v === 'Sim')}
                          className="text-blue-600"
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-medium text-slate-700 mb-2">Gestão de Mudanças</p>
                  <div className="flex gap-4">
                    {(['Sim', 'Não'] as const).map((v) => (
                      <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="changeMgmt"
                          checked={form.changeManagementRequired === (v === 'Sim')}
                          onChange={() => set('changeManagementRequired', v === 'Sim')}
                          className="text-blue-600"
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Follow-up */}
              <div className="pt-1">
                <p className={sectionTitle}>Follow-up — Implementação</p>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Ação Implementada</label>
                    <textarea
                      className={textareaCls}
                      rows={2}
                      placeholder="Descreva o que foi efetivamente implementado…"
                      value={form.actionImplemented}
                      onChange={(e) => set('actionImplemented', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Data da Implementação</label>
                      <input
                        type="date"
                        className={inputCls}
                        value={form.implementationDate}
                        onChange={(e) => set('implementationDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Status do Follow-up</label>
                      <input
                        className={inputCls}
                        placeholder="Ex: Concluído, Pendente, Em andamento"
                        value={form.followUpStatus}
                        onChange={(e) => set('followUpStatus', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Ação Preventiva (evita recorrência)</label>
                <textarea
                  className={textareaCls}
                  rows={2}
                  placeholder="Ação para prevenir recorrência em outros processos/áreas…"
                  value={form.preventiveAction}
                  onChange={(e) => set('preventiveAction', e.target.value)}
                />
              </div>

              <div>
                <label className={labelCls}>Observações adicionais</label>
                <textarea
                  className={textareaCls}
                  rows={2}
                  placeholder="Notas, referências normativas, evidências coletadas…"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── TAB 3: ANÁLISE DE CAUSAS ── */}
          {tab === 'analise' && (
            <>
              {/* Ishikawa 6M */}
              <div>
                <p className={sectionTitle}>Diagrama de Ishikawa — 6M</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { field: 'ishikawaManpower'   as const, label: 'Mão de Obra' },
                    { field: 'ishikawaEnvironment' as const, label: 'Meio Ambiente' },
                    { field: 'ishikawaMaterials'   as const, label: 'Materiais' },
                    { field: 'ishikawaMachinery'   as const, label: 'Máquinas' },
                    { field: 'ishikawaMeasurement' as const, label: 'Medição' },
                    { field: 'ishikawaMethods'     as const, label: 'Métodos' },
                  ]).map(({ field, label }) => (
                    <div key={field}>
                      <label className={labelCls}>{label}</label>
                      <textarea
                        className={textareaCls}
                        rows={2}
                        placeholder={`Causas relacionadas a ${label.toLowerCase()}…`}
                        value={form[field] as string}
                        onChange={(e) => set(field, e.target.value as any)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 5 Porquês */}
              <div>
                <p className={sectionTitle}>Análise dos 5 Porquês</p>
                <div className="space-y-3">
                  {([
                    { field: 'why1' as const, n: 1 },
                    { field: 'why2' as const, n: 2 },
                    { field: 'why3' as const, n: 3 },
                    { field: 'why4' as const, n: 4 },
                    { field: 'why5' as const, n: 5 },
                  ]).map(({ field, n }) => (
                    <div key={field} className="flex items-start gap-3">
                      <span className="mt-2 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                        {n}
                      </span>
                      <div className="flex-1">
                        <label className={labelCls}>Por quê {n}?</label>
                        <input
                          className={inputCls}
                          placeholder={n === 1 ? 'Por que o problema ocorreu?' : `Por que a resposta ${n - 1} aconteceu?`}
                          value={form[field] as string}
                          onChange={(e) => set(field, e.target.value as any)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5W2H */}
              <div>
                <p className={sectionTitle}>5W2H — Plano de Ação</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { field: 'w2h_what'    as const, label: 'O quê?',           placeholder: 'O que será feito?' },
                    { field: 'w2h_why'     as const, label: 'Por quê?',         placeholder: 'Por que será feito?' },
                    { field: 'w2h_where'   as const, label: 'Onde?',            placeholder: 'Onde será executado?' },
                    { field: 'w2h_when'    as const, label: 'Quando?',          placeholder: 'Quando será concluído?' },
                    { field: 'w2h_who'     as const, label: 'Quem?',            placeholder: 'Quem será responsável?' },
                    { field: 'w2h_how'     as const, label: 'Como?',            placeholder: 'Como será executado?' },
                    { field: 'w2h_howMuch' as const, label: 'Quanto custa?',    placeholder: 'Recursos necessários…' },
                  ]).map(({ field, label, placeholder }) => (
                    <div key={field} className={field === 'w2h_howMuch' ? 'col-span-2' : ''}>
                      <label className={labelCls}>{label}</label>
                      <input
                        className={inputCls}
                        placeholder={placeholder}
                        value={form[field] as string}
                        onChange={(e) => set(field, e.target.value as any)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Causa Raiz Identificada */}
              <div>
                <label className={labelCls}>Causa Raiz Identificada (síntese)</label>
                <textarea
                  className={textareaCls}
                  rows={3}
                  placeholder="Com base nas análises acima, descreva a causa raiz identificada…"
                  value={form.rootCauseIdentified}
                  onChange={(e) => set('rootCauseIdentified', e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── TAB 4: VERIFICAÇÃO & EFICÁCIA ── */}
          {tab === 'eficacia' && (
            <>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                A <strong>verificação de eficácia</strong> ocorre normalmente 90 dias após a implementação
                da ação corretiva. Confirma que o problema não recorreu.
              </div>

              <div>
                <label className={labelCls}>Verificação de Eficácia — Resultado</label>
                <textarea
                  className={textareaCls}
                  rows={3}
                  placeholder="Descreva como foi verificada a eficácia. Inclua evidências, data de verificação e resultado observado…"
                  value={form.effectivenessCheck}
                  onChange={(e) => set('effectivenessCheck', e.target.value)}
                />
              </div>

              {/* Eficaz / Não Eficaz */}
              <div>
                <p className={labelCls}>Resultado da Eficácia (após 90 dias)</p>
                <div className="flex gap-4">
                  {(['Eficaz', 'Não Eficaz'] as const).map((v) => (
                    <label
                      key={v}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                        form.effectiveness === v
                          ? v === 'Eficaz'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-red-400 bg-red-50 text-red-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="effectiveness"
                        value={v}
                        checked={form.effectiveness === v}
                        onChange={() => set('effectiveness', v)}
                        className="sr-only"
                      />
                      {v === 'Eficaz'
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <XCircle className="w-4 h-4" />}
                      {v}
                    </label>
                  ))}
                  {form.effectiveness && (
                    <button
                      type="button"
                      onClick={() => set('effectiveness', '')}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Data de Encerramento</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.effectivenessDate}
                    onChange={(e) => set('effectivenessDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Responsável QSMS</label>
                  <input
                    className={inputCls}
                    placeholder="Nome do responsável QSMS"
                    value={form.qsmsResponsible}
                    onChange={(e) => set('qsmsResponsible', e.target.value)}
                  />
                </div>
              </div>

              {/* Checklist de encerramento */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700 mb-2">Para concluir a Não Conformidade:</p>
                {[
                  'Todas as ações estão implementadas e documentadas',
                  'A causa raiz foi identificada e registrada',
                  'A verificação de eficácia foi realizada',
                  'O resultado da eficácia (Eficaz / Não Eficaz) foi preenchido',
                  'O status deve ser alterado para Concluída na aba Identificação',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-2">
            {/* Navigate between tabs */}
            {tab !== 'identificacao' && (
              <button
                type="button"
                onClick={() => {
                  const idx = TABS.findIndex((t) => t.id === tab);
                  if (idx > 0) setTab(TABS[idx - 1].id);
                }}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ← Anterior
              </button>
            )}
            {tab !== 'eficacia' && (
              <button
                type="button"
                onClick={() => {
                  const idx = TABS.findIndex((t) => t.id === tab);
                  if (idx < TABS.length - 1) setTab(TABS[idx + 1].id);
                }}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Próxima →
              </button>
            )}
            <button
              onClick={handleSubmit as any}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {initial ? 'Salvar alterações' : 'Registrar NC'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface NCCAPAScreenProps {
  items: NonConformity[];
  onSave: (data: NCFormData, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function NCCAPAScreen({ items, onSave, onDelete }: NCCAPAScreenProps) {
  type MainTab = 'todos' | 'clariant';
  const [activeTab, setActiveTab]       = useState<MainTab>('todos');
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState<NCStatus | 'Todos'>('Todos');
  const [filterPrazo, setFilterPrazo]   = useState<'Todos' | 'No Prazo' | 'Fora do Prazo'>('Todos');
  const [filterCliente, setFilterCliente] = useState('Todos');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editItem, setEditItem]         = useState<NonConformity | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const ativas    = items.filter((i) => i.status !== 'Encerrada');
    const foraD1    = ativas.filter((i) => i.statusD1 === 'Fora do Prazo').length;
    const foraD7    = ativas.filter((i) => i.statusD7 === 'Fora do Prazo').length;
    const foraDoPrazo = ativas.filter(
      (i) => i.statusD1 === 'Fora do Prazo' || i.statusD7 === 'Fora do Prazo'
    ).length;
    const noPrazo   = ativas.length - foraDoPrazo;
    const pct       = ativas.length > 0 ? Math.round((noPrazo / ativas.length) * 100) : 0;
    return {
      totalAbertas: ativas.length,
      foraDoPrazo, foraD1, foraD7,
      noPrazo, pct,
      concluidas: items.filter((i) => i.status === 'Encerrada').length,
      criticas:   ativas.filter((i) => i.severity === 'Crítica').length,
    };
  }, [items]);

  // ─── Clariant subsets ─────────────────────────────────────────────────────
  const clariantItems  = useMemo(() => items.filter((i) => i.client === 'Clariant'), [items]);
  const clariantAtivas = useMemo(() => clariantItems.filter((i) => i.status !== 'Encerrada'), [clariantItems]);

  const endCustomers = useMemo(() => {
    const s = new Set(clariantItems.map((i) => i.endCustomer).filter(Boolean) as string[]);
    return Array.from(s);
  }, [clariantItems]);

  const clariantClientesSummary = useMemo(
    () => endCustomers.slice(0, 4).join(', '),
    [endCustomers]
  );

  // ─── Filtered lists ───────────────────────────────────────────────────────
  const q = search.toLowerCase();

  const filteredAll = useMemo(() => items.filter((item) => {
    if (filterStatus !== 'Todos' && item.status !== filterStatus) return false;
    if (filterPrazo === 'No Prazo' && item.statusD1 !== 'No Prazo') return false;
    if (filterPrazo === 'Fora do Prazo' && item.statusD1 !== 'Fora do Prazo' && item.statusD7 !== 'Fora do Prazo') return false;
    if (q && !item.title.toLowerCase().includes(q) && !item.code.toLowerCase().includes(q) && !(item.client ?? '').toLowerCase().includes(q)) return false;
    return true;
  }), [items, filterStatus, filterPrazo, q]);

  const filteredClariant = useMemo(() => clariantItems.filter((item) => {
    if (filterCliente !== 'Todos' && item.endCustomer !== filterCliente) return false;
    if (filterPrazo === 'No Prazo' && item.statusD1 !== 'No Prazo') return false;
    if (filterPrazo === 'Fora do Prazo' && item.statusD1 !== 'Fora do Prazo' && item.statusD7 !== 'Fora do Prazo') return false;
    if (q && !item.title.toLowerCase().includes(q)
          && !(item.qnsNumber ?? '').toLowerCase().includes(q)
          && !(item.chemicalProduct ?? '').toLowerCase().includes(q)
          && !(item.originLocation ?? '').toLowerCase().includes(q)) return false;
    return true;
  }), [clariantItems, filterCliente, filterPrazo, q]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSave = async (data: NCFormData) => {
    await onSave(data, editItem?.id);
    setIsModalOpen(false);
    setEditItem(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function dBadge(status: string | undefined | null) {
    if (!status || status === 'Pendente') return <span className="text-slate-300 text-xs">—</span>;
    const ok = status === 'No Prazo';
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}>
        {ok ? 'OK' : 'Fora'}
      </span>
    );
  }

  function rowNum(idx: number) {
    return `#${String(idx + 1).padStart(3, '0')}`;
  }

  function fmtDate(d: string | undefined | null) {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Não Conformidade · CAPA
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro, Investigação & Ações Corretivas (FOR-TR-SMS-006)
          </p>
        </div>
        <button
          onClick={() => { setEditItem(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova RNC
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Abertas</p>
          <p className="text-3xl font-bold text-slate-800">{stats.totalAbertas}</p>
          <p className="text-xs text-slate-400 mt-1">em andamento</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wide mb-1">Fora do Prazo</p>
          <p className="text-3xl font-bold text-red-700">{stats.foraDoPrazo}</p>
          <p className="text-xs text-red-400 mt-1">D1: {stats.foraD1} · D7: {stats.foraD7}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wide mb-1">No Prazo</p>
          <p className="text-3xl font-bold text-emerald-700">{stats.noPrazo}</p>
          <p className="text-xs text-emerald-400 mt-1">{stats.pct}% dentro do prazo</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide mb-1">Concluídas</p>
          <p className="text-3xl font-bold text-blue-700">{stats.concluidas}</p>
          <p className="text-xs text-blue-400 mt-1">Jan–Out 2026</p>
        </div>
      </div>

      {/* ── Alert críticas ── */}
      {stats.criticas > 0 && (
        <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>
            <strong>{stats.criticas}</strong> NC{stats.criticas > 1 ? 's' : ''} crítica{stats.criticas > 1 ? 's' : ''} em aberto — atenção imediata necessária.
          </span>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="border-b border-slate-200">
        <div className="flex items-center">
          {([
            { id: 'todos',    label: 'Todos os Clientes', count: items.length,          active: 'border-blue-600 text-blue-700',   badge: 'bg-blue-100 text-blue-700' },
            { id: 'clariant', label: '◆ Clariant',        count: clariantAtivas.length, active: 'border-orange-500 text-orange-700', badge: 'bg-orange-100 text-orange-700' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? tab.active
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.id ? tab.badge : 'bg-slate-100 text-slate-500'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          TAB: TODOS OS CLIENTES
      ══════════════════════════════════════════ */}
      {activeTab === 'todos' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Buscar por título, código ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as NCStatus | 'Todos')}
            >
              <option value="Todos">Todos os status</option>
              {NC_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={filterPrazo}
              onChange={(e) => setFilterPrazo(e.target.value as typeof filterPrazo)}
            >
              <option value="Todos">Todos os prazos</option>
              <option value="No Prazo">No Prazo</option>
              <option value="Fora do Prazo">Fora do Prazo</option>
            </select>
          </div>

          {/* Table */}
          {filteredAll.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhuma não conformidade encontrada</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-3 w-12">N°</th>
                      <th className="text-left px-4 py-3 w-20">Abertura</th>
                      <th className="text-left px-4 py-3 w-28">Cliente</th>
                      <th className="text-left px-4 py-3">Descrição</th>
                      <th className="text-left px-4 py-3 w-32">Responsável</th>
                      <th className="text-left px-4 py-3 w-28">Prazo D1</th>
                      <th className="text-left px-4 py-3 w-36">Status</th>
                      <th className="px-4 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAll.map((nc, idx) => (
                      <tr key={nc.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-slate-400">{rowNum(idx)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(nc.detectedDate)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-slate-700">{nc.client || '—'}</span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-sm font-medium text-slate-800 truncate">{nc.title}</p>
                          {nc.code && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{nc.code}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{nc.responsible || '—'}</td>
                        <td className="px-4 py-3">
                          {nc.statusD1 ? (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              nc.statusD1 === 'No Prazo'      ? 'bg-emerald-100 text-emerald-700' :
                              nc.statusD1 === 'Fora do Prazo' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>{nc.statusD1}</span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusStyle(nc.status)}`}>
                            {statusIcon(nc.status)} {nc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => { setEditItem(nc); setIsModalOpen(true); }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(nc.id)}
                              disabled={deletingId === nc.id}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: CLARIANT
      ══════════════════════════════════════════ */}
      {activeTab === 'clariant' && (
        <div className="space-y-3">
          {/* Summary bar */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex flex-wrap gap-4 text-sm items-center">
            <span className="font-medium text-orange-800">
              <strong>{clariantAtivas.length}</strong> abertas
            </span>
            <span className="text-red-600 font-medium">
              <strong>{clariantAtivas.filter((i) => i.statusD1 === 'Fora do Prazo').length}</strong> fora do prazo D1
            </span>
            <span className="text-amber-600 font-medium">
              <strong>{clariantAtivas.filter((i) => i.statusD7 === 'Fora do Prazo').length}</strong> fora do prazo D7
            </span>
            {clariantClientesSummary && (
              <span className="text-slate-500 ml-auto text-xs">
                Clientes finais: <span className="font-semibold text-slate-700">{clariantClientesSummary}</span>
              </span>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                placeholder="Buscar por QNS, descrição, equipamento, químico..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
            >
              <option value="Todos">Todos os clientes finais</option>
              {endCustomers.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              value={filterPrazo}
              onChange={(e) => setFilterPrazo(e.target.value as typeof filterPrazo)}
            >
              <option value="Todos">Todos os prazos</option>
              <option value="No Prazo">No Prazo</option>
              <option value="Fora do Prazo">Fora do Prazo</option>
            </select>
          </div>

          {/* Clariant table */}
          {filteredClariant.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum registro Clariant encontrado</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: '900px' }}>
                  <thead>
                    <tr className="bg-orange-50 border-b border-orange-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-3 py-3 w-10">N°</th>
                      <th className="text-left px-3 py-3 w-32">QNS</th>
                      <th className="text-left px-3 py-3 w-20">Abertura</th>
                      <th className="text-left px-3 py-3 w-24">Cli. Final</th>
                      <th className="text-left px-3 py-3">Descrição</th>
                      <th className="text-left px-3 py-3 w-28">Equipamento</th>
                      <th className="text-left px-3 py-3 w-28">Químico</th>
                      <th className="text-center px-3 py-3 w-14">D1</th>
                      <th className="text-center px-3 py-3 w-14">D5</th>
                      <th className="text-center px-3 py-3 w-14">D7</th>
                      <th className="px-3 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClariant.map((nc, idx) => (
                      <tr key={nc.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="px-3 py-3 text-xs font-mono text-slate-400">{rowNum(idx)}</td>
                        <td className="px-3 py-3">
                          <span className="text-xs font-mono font-medium text-slate-700">{nc.qnsNumber || '—'}</span>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(nc.detectedDate)}</td>
                        <td className="px-3 py-3 text-xs font-medium text-slate-700">{nc.endCustomer || '—'}</td>
                        <td className="px-3 py-3 max-w-[200px]">
                          <p className="text-sm font-medium text-slate-800 truncate">{nc.title}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">{nc.originLocation || '—'}</td>
                        <td className="px-3 py-3 text-xs text-slate-600">{nc.chemicalProduct || '—'}</td>
                        <td className="px-3 py-3 text-center">{dBadge(nc.statusD1)}</td>
                        <td className="px-3 py-3 text-center">{dBadge(nc.statusD5)}</td>
                        <td className="px-3 py-3 text-center">{dBadge(nc.statusD7)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => { setEditItem(nc); setIsModalOpen(true); }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(nc.id)}
                              disabled={deletingId === nc.id}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <NCModal
          initial={editItem}
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

export type { NCFormData };
