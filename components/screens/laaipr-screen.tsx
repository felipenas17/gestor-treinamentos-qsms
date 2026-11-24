'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, X, Layers, Leaf, Shield, RefreshCw, Eye,
  ChevronDown, ChevronLeft, ChevronRight, Loader2, Plus, Pencil, Save,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LaaiprRecord {
  id: string;
  setor: string;
  atividade: string | null;
  aspecto_perigo: string | null;
  situacao: string | null;
  impacto_risco: string | null;
  referencia: string | null;
  origem: string | null;
  classe: string | null;
  temporalidade: string | null;
  abrangencia: number | null;
  freq_prob: number | null;
  severidade: number | null;
  partes_interessadas: string | null;
  requisito_legal: string | null;
  importancia: number | null;
  significancia: string | null;
  controles_disponiveis: string | null;
  ciclo_vida: string | null;
  created_at: string;
}

type FormData = Omit<LaaiprRecord, 'id' | 'created_at'>;

const EMPTY_FORM: FormData = {
  setor: '',
  atividade: '',
  aspecto_perigo: '',
  situacao: 'N',
  impacto_risco: '',
  referencia: 'SS',
  origem: 'D',
  classe: 'A',
  temporalidade: 'A',
  abrangencia: 1,
  freq_prob: 1,
  severidade: 1,
  partes_interessadas: 'N',
  requisito_legal: '',
  importancia: 2,
  significancia: 'N',
  controles_disponiveis: '',
  ciclo_vida: '',
};

interface Props {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function situacaoInfo(s: string | null) {
  if (s === 'N') return { label: 'Normal',    classes: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (s === 'A') return { label: 'Anormal',   classes: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (s === 'E') return { label: 'Emergência', classes: 'bg-red-50 text-red-700 border-red-200' };
  return           { label: s || '—',         classes: 'bg-slate-100 text-slate-500 border-slate-200' };
}

function refInfo(r: string | null) {
  if (r === 'MA') return { label: 'MA', full: 'Meio Ambiente',      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (r === 'SS') return { label: 'SS', full: 'Saúde e Segurança',  classes: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  return           { label: r || '—',  full: r || '—',              classes: 'bg-slate-100 text-slate-500 border-slate-200' };
}

function sigClasses(s: string | null) {
  if (s === 'S') return 'bg-red-50 text-red-700 border-red-300 font-semibold';
  if (s === 'N') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function impClasses(v: number | null) {
  if (v == null) return 'bg-slate-100 text-slate-500';
  if (v >= 5)   return 'bg-red-100 text-red-700';
  if (v >= 4)   return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function freqLabel(v: number | null) {
  if (v === 1) return 'Baixa (1)';
  if (v === 2) return 'Média (2)';
  if (v === 3) return 'Alta (3)';
  return v != null ? String(v) : '—';
}

function sevLabel(v: number | null) {
  if (v === 1) return 'Não Causa Dano (1)';
  if (v === 2) return 'Dano Leve (2)';
  if (v === 3) return 'Dano Moderado (3)';
  if (v === 4) return 'Dano Grave (4)';
  if (v === 5) return 'Catastrófico (5)';
  return v != null ? String(v) : '—';
}

function origemLabel(v: string | null) {
  if (v === 'D') return 'Direta';
  if (v === 'I') return 'Indireta';
  return v || '—';
}

function classeLabel(v: string | null) {
  if (v === 'A') return 'Adverso';
  if (v === 'B') return 'Benéfico';
  return v || '—';
}

function temporalidadeLabel(v: string | null) {
  if (v === 'P') return 'Passado';
  if (v === 'A') return 'Atual';
  if (v === 'F') return 'Futuro';
  return v || '—';
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-slate-700 leading-snug">{value || '—'}</div>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, borderClass, valueClass }: {
  label: string; value: number; sub: string;
  borderClass: string; valueClass: string;
}) {
  return (
    <div className={`flex flex-col px-4 py-3 rounded-xl border bg-white shadow-sm ${borderClass}`}>
      <div className={`text-2xl font-bold leading-none ${valueClass}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-700 mt-1 leading-tight">{label}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

// ─── Filter Select ────────────────────────────────────────────────────────────

function FilterSelect({ placeholder, value, options, onChange }: {
  placeholder: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer hover:bg-slate-50 max-w-[180px]"
      >
        <option value="Todos">{placeholder}: Todos</option>
        {options.filter(o => o !== 'Todos').map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
    </div>
  );
}

// ─── Toggle Group ─────────────────────────────────────────────────────────────

function ToggleGroup<T extends string>({ prefix, options, value, onChange }: {
  prefix: string;
  options: { val: T; label: string; activeClass: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden text-xs font-medium">
      {prefix && <span className="px-2 py-2 text-slate-400 text-[11px] border-r border-slate-200">{prefix}</span>}
      {options.map((opt) => (
        <button
          key={opt.val}
          onClick={() => onChange(opt.val)}
          className={`px-3 py-2 transition-colors ${value === opt.val ? opt.activeClass : 'text-slate-500 hover:bg-slate-100'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Form label helper ────────────────────────────────────────────────────────

function FLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{children}</label>;
}

function FInput({
  value, onChange, placeholder, required,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
    />
  );
}

function FTextarea({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
    />
  );
}

function FSelect({ value, onChange, children }: {
  value: string | number; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none pl-3 pr-7 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function FormModal({
  initial,
  setores,
  saving,
  onSave,
  onClose,
}: {
  initial: FormData;
  setores: string[];
  saving: boolean;
  onSave: (data: FormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormData>(initial);

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      // Auto-calculate importancia = freq_prob + severidade
      const freq = key === 'freq_prob' ? (val as number) : (prev.freq_prob ?? 1);
      const sev  = key === 'severidade' ? (val as number) : (prev.severidade ?? 1);
      next.importancia = freq + sev;
      // Auto-suggest significancia (can be overridden)
      if (key === 'freq_prob' || key === 'severidade') {
        next.significancia = (freq + sev) >= 4 ? 'S' : 'N';
      }
      return next;
    });
  }

  const imp = (form.freq_prob ?? 1) + (form.severidade ?? 1);
  const impColor = imp >= 5 ? 'text-red-700 bg-red-100' : imp >= 4 ? 'text-amber-700 bg-amber-100' : 'text-slate-700 bg-slate-100';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.setor.trim()) return;
    onSave(form);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 leading-tight">
                {initial.setor ? 'Editar Registro' : 'Novo Registro LAAIPR'}
              </h2>
              <p className="text-[11px] text-slate-500">ISO 14001 · ISO 45001</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* ── Seção 1: Identificação ─── */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100">
              Identificação
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FLabel>Setor *</FLabel>
                <FSelect value={form.setor} onChange={(v) => set('setor', v)}>
                  <option value="">— Selecione ou digite —</option>
                  {setores.filter(s => s !== 'Todos').map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </FSelect>
                {/* Allow custom setor */}
                {!setores.includes(form.setor) && (
                  <input
                    type="text"
                    value={form.setor}
                    onChange={(e) => set('setor', e.target.value)}
                    placeholder="Ou digite um novo setor"
                    className="mt-1.5 w-full px-3 py-1.5 text-sm border border-indigo-300 rounded-lg bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                )}
                <input
                  type="text"
                  placeholder="Novo setor (nome livre)"
                  onFocus={() => set('setor', '')}
                  onBlur={(e) => { if (!e.target.value) set('setor', setores[1] ?? ''); }}
                  onChange={(e) => set('setor', e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder-slate-400"
                  value={!setores.filter(s => s !== 'Todos').includes(form.setor) ? form.setor : ''}
                  style={{ display: setores.filter(s => s !== 'Todos').includes(form.setor) ? 'none' : 'block' }}
                />
              </div>
              <div>
                <FLabel>Atividade</FLabel>
                <FInput value={form.atividade ?? ''} onChange={(v) => set('atividade', v)} placeholder="Ex: Movimentação de Cargas" />
              </div>
              <div>
                <FLabel>Aspecto / Perigo</FLabel>
                <FInput value={form.aspecto_perigo ?? ''} onChange={(v) => set('aspecto_perigo', v)} placeholder="Ex: Trabalho em Altura" />
              </div>
              <div>
                <FLabel>Impacto / Risco</FLabel>
                <FInput value={form.impacto_risco ?? ''} onChange={(v) => set('impacto_risco', v)} placeholder="Ex: Queda de Nível Diferente" />
              </div>
            </div>
          </div>

          {/* ── Seção 2: Classificação ─── */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100">
              Classificação
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FLabel>Referência (MA / SS)</FLabel>
                <FSelect value={form.referencia ?? 'SS'} onChange={(v) => set('referencia', v)}>
                  <option value="SS">SS — Saúde e Segurança</option>
                  <option value="MA">MA — Meio Ambiente</option>
                </FSelect>
              </div>
              <div>
                <FLabel>Situação</FLabel>
                <FSelect value={form.situacao ?? 'N'} onChange={(v) => set('situacao', v)}>
                  <option value="N">Normal</option>
                  <option value="A">Anormal</option>
                  <option value="E">Emergência</option>
                </FSelect>
              </div>
              <div>
                <FLabel>Partes Interessadas</FLabel>
                <FSelect value={form.partes_interessadas ?? 'N'} onChange={(v) => set('partes_interessadas', v)}>
                  <option value="N">N — Não Identificado</option>
                  <option value="I">I — Identificado</option>
                </FSelect>
              </div>
              <div>
                <FLabel>Origem</FLabel>
                <FSelect value={form.origem ?? 'D'} onChange={(v) => set('origem', v)}>
                  <option value="D">Direta</option>
                  <option value="I">Indireta</option>
                </FSelect>
              </div>
              <div>
                <FLabel>Classe</FLabel>
                <FSelect value={form.classe ?? 'A'} onChange={(v) => set('classe', v)}>
                  <option value="A">Adverso</option>
                  <option value="B">Benéfico</option>
                </FSelect>
              </div>
              <div>
                <FLabel>Temporalidade</FLabel>
                <FSelect value={form.temporalidade ?? 'A'} onChange={(v) => set('temporalidade', v)}>
                  <option value="P">Passado</option>
                  <option value="A">Atual</option>
                  <option value="F">Futuro</option>
                </FSelect>
              </div>
            </div>
          </div>

          {/* ── Seção 3: Avaliação de Risco ─── */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100">
              Avaliação de Risco / Impacto
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <FLabel>Frequência / Probabilidade</FLabel>
                <FSelect value={form.freq_prob ?? 1} onChange={(v) => set('freq_prob', Number(v))}>
                  <option value={1}>1 — Baixa</option>
                  <option value={2}>2 — Média</option>
                  <option value={3}>3 — Alta</option>
                </FSelect>
              </div>
              <div>
                <FLabel>Severidade</FLabel>
                <FSelect value={form.severidade ?? 1} onChange={(v) => set('severidade', Number(v))}>
                  <option value={1}>1 — Não Causa Dano</option>
                  <option value={2}>2 — Dano Leve</option>
                  <option value={3}>3 — Dano Moderado</option>
                  <option value={4}>4 — Dano Grave</option>
                  <option value={5}>5 — Catastrófico</option>
                </FSelect>
              </div>
            </div>

            {/* Importância calculada + Significância */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Importância</div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${impColor}`}>
                  {imp}
                </div>
                <div className="text-xs text-slate-400">= freq + sev<br />({form.freq_prob} + {form.severidade})</div>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="flex-1">
                <FLabel>Significância (ajuste manual se necessário)</FLabel>
                <FSelect value={form.significancia ?? 'N'} onChange={(v) => set('significancia', v)}>
                  <option value="S">S — Significativo</option>
                  <option value="N">N — Não Significativo</option>
                </FSelect>
              </div>
              <div className="flex-1">
                <FLabel>Abrangência (1–3)</FLabel>
                <FSelect value={form.abrangencia ?? 1} onChange={(v) => set('abrangencia', Number(v))}>
                  <option value={1}>1 — Local</option>
                  <option value={2}>2 — Regional</option>
                  <option value={3}>3 — Global</option>
                </FSelect>
              </div>
            </div>
          </div>

          {/* ── Seção 4: Requisitos e Controles ─── */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100">
              Requisitos e Controles
            </div>
            <div className="space-y-3">
              <div>
                <FLabel>Requisito Legal</FLabel>
                <FTextarea
                  value={form.requisito_legal ?? ''}
                  onChange={(v) => set('requisito_legal', v)}
                  placeholder="Ex: NR 35 - NR 06 - ISO 45001"
                />
              </div>
              <div>
                <FLabel>Controles Disponíveis</FLabel>
                <FTextarea
                  value={form.controles_disponiveis ?? ''}
                  onChange={(v) => set('controles_disponiveis', v)}
                  placeholder="Ex: Treinamento (4), Procedimento PG-TR-SMS-011 (4), EPI (5)"
                  rows={3}
                />
              </div>
              <div>
                <FLabel>Ciclo de Vida / Observações</FLabel>
                <FTextarea
                  value={form.ciclo_vida ?? ''}
                  onChange={(v) => set('ciclo_vida', v)}
                  placeholder="Observações sobre o ciclo de vida ou controles existentes"
                />
              </div>
            </div>
          </div>

          {/* ── Actions ─── */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.setor.trim()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  record, onClose, onEdit,
}: {
  record: LaaiprRecord;
  onClose: () => void;
  onEdit: () => void;
}) {
  const ref = refInfo(record.referencia);
  const sit = situacaoInfo(record.situacao);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${ref.classes}`}>
                {record.referencia === 'MA'
                  ? <Leaf className="w-3 h-3" />
                  : <Shield className="w-3 h-3" />}
                {ref.full}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${sit.classes}`}>
                {sit.label}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${sigClasses(record.significancia)}`}>
                {record.significancia === 'S' ? '⚠ Significativo' : '✓ Não Significativo'}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-800 leading-snug">
              {record.aspecto_perigo || record.impacto_risco || 'Detalhe do Registro'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{record.setor}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Editar
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Setor" value={record.setor} />
            <Field label="Atividade" value={record.atividade} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Aspecto / Perigo" value={record.aspecto_perigo} />
            <Field label="Impacto / Risco" value={record.impacto_risco} />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Field label="Situação" value={situacaoInfo(record.situacao).label} />
            <Field label="Referência" value={refInfo(record.referencia).full} />
            <Field label="Origem" value={origemLabel(record.origem)} />
            <Field label="Classe" value={classeLabel(record.classe)} />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Field label="Temporalidade" value={temporalidadeLabel(record.temporalidade)} />
            <Field label="Abrangência" value={record.abrangencia != null ? String(record.abrangencia) : null} />
            <Field label="Partes Interessadas" value={record.partes_interessadas} className="col-span-2" />
          </div>

          {/* Risk Assessment Panel */}
          <div className="bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Avaliação de Risco
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Freq / Prob</div>
                <div className="text-sm text-slate-700 font-medium">{freqLabel(record.freq_prob)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Severidade</div>
                <div className="text-sm text-slate-700 font-medium">{sevLabel(record.severidade)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Importância</div>
                <div className="text-3xl font-bold text-slate-800">{record.importancia ?? '—'}</div>
                <div className="text-[10px] text-slate-400">freq + sev</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Significância</div>
                <span className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${sigClasses(record.significancia)}`}>
                  {record.significancia === 'S'
                    ? 'Significativo'
                    : record.significancia === 'N'
                      ? 'Não Significativo'
                      : '—'}
                </span>
              </div>
            </div>
          </div>

          {record.requisito_legal && (
            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Requisito Legal</div>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-200">
                {record.requisito_legal}
              </p>
            </div>
          )}

          {record.controles_disponiveis && (
            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Controles Disponíveis</div>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-200">
                {record.controles_disponiveis}
              </p>
            </div>
          )}

          {record.ciclo_vida && (
            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Ciclo de Vida</div>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-200">
                {record.ciclo_vida}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export function LaaiprScreen({ onToast }: Props) {
  const [records,  setRecords]  = useState<LaaiprRecord[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [selected, setSelected] = useState<LaaiprRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<LaaiprRecord | null>(null);
  const [page,     setPage]     = useState(1);

  // Filters
  const [search,     setSearch]     = useState('');
  const [fSetor,     setFSetor]     = useState('Todos');
  const [fRef,       setFRef]       = useState<'Todos' | 'MA' | 'SS'>('Todos');
  const [fSig,       setFSig]       = useState<'Todos' | 'S' | 'N'>('Todos');
  const [fSit,       setFSit]       = useState<'Todos' | 'N' | 'A' | 'E'>('Todos');

  const load = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      onToast('Supabase não configurado', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('laaipr_records')
        .select('*')
        .order('setor', { ascending: true })
        .order('atividade', { ascending: true });
      if (error) throw error;
      setRecords((data ?? []) as LaaiprRecord[]);
    } catch (err: any) {
      onToast('Erro ao carregar LAAIPR: ' + (err?.message ?? String(err)), 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Unique setor list
  const setores = useMemo(() => {
    const s = Array.from(new Set(records.map((r) => r.setor))).sort();
    return ['Todos', ...s];
  }, [records]);

  // Filtered
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (fSetor !== 'Todos' && r.setor !== fSetor) return false;
      if (fRef   !== 'Todos' && r.referencia !== fRef)    return false;
      if (fSig   !== 'Todos' && r.significancia !== fSig) return false;
      if (fSit   !== 'Todos' && r.situacao !== fSit)      return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.setor?.toLowerCase().includes(q) ||
          r.atividade?.toLowerCase().includes(q) ||
          r.aspecto_perigo?.toLowerCase().includes(q) ||
          r.impacto_risco?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, fSetor, fRef, fSig, fSit, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPage() { setPage(1); }

  // Summary counts
  const total   = records.length;
  const sigS    = records.filter((r) => r.significancia === 'S').length;
  const maTotal = records.filter((r) => r.referencia === 'MA').length;
  const ssTotal = records.filter((r) => r.referencia === 'SS').length;
  const maSig   = records.filter((r) => r.referencia === 'MA' && r.significancia === 'S').length;
  const ssSig   = records.filter((r) => r.referencia === 'SS' && r.significancia === 'S').length;

  // ── Save handler ────────────────────────────────────────────────────────────

  async function handleSave(formData: FormData) {
    if (!supabase || !isSupabaseConfigured) {
      onToast('Supabase não configurado', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        // Update existing
        const { error } = await supabase
          .from('laaipr_records')
          .update(formData)
          .eq('id', editing.id);
        if (error) throw error;
        onToast('Registro atualizado com sucesso ✓', 'success');
      } else {
        // Insert new
        const { error } = await supabase
          .from('laaipr_records')
          .insert([formData]);
        if (error) throw error;
        onToast('Novo registro adicionado ✓', 'success');
      }
      setShowForm(false);
      setEditing(null);
      setSelected(null);
      await load();
    } catch (err: any) {
      onToast('Erro ao salvar: ' + (err?.message ?? String(err)), 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Open form for edit ───────────────────────────────────────────────────────

  function openEdit(rec: LaaiprRecord) {
    setEditing(rec);
    setSelected(null);
    setShowForm(true);
  }

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  // ── Build initial form from record ──────────────────────────────────────────

  function formInitial(): FormData {
    if (!editing) return { ...EMPTY_FORM };
    const { id: _id, created_at: _ca, ...rest } = editing;
    return rest as FormData;
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/20">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">LAAIPR</h1>
          </div>
          <p className="text-sm text-slate-500 ml-0.5">
            Levantamento e Avaliação de Aspectos e Impactos / Perigos e Riscos — ISO 14001 + ISO 45001
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { load(); onToast('Dados atualizados ✓'); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm shadow-teal-600/20"
          >
            <Plus className="w-4 h-4" />
            Novo Registro
          </button>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total de Registros" value={total}   sub="levantados"           borderClass="border-slate-200" valueClass="text-slate-800" />
        <SummaryCard label="Significativos"      value={sigS}   sub={`de ${total} total`}   borderClass="border-red-200"   valueClass="text-red-700"   />
        <SummaryCard label="MA — Aspectos"       value={maTotal} sub="Meio Ambiente"         borderClass="border-emerald-200" valueClass="text-emerald-700" />
        <SummaryCard label="SS — Perigos"        value={ssTotal} sub="Saúde e Segurança"     borderClass="border-indigo-200" valueClass="text-indigo-700" />
        <SummaryCard label="Sig. MA + SS"        value={maSig + ssSig} sub={`${maSig} MA · ${ssSig} SS`} borderClass="border-orange-200" valueClass="text-orange-700" />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar setor, aspecto, perigo, risco..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); resetPage(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        {/* Setor */}
        <FilterSelect
          placeholder="Setor"
          value={fSetor}
          options={setores}
          onChange={(v) => { setFSetor(v); resetPage(); }}
        />

        {/* Referência */}
        <ToggleGroup<'Todos' | 'MA' | 'SS'>
          prefix=""
          value={fRef}
          onChange={(v) => { setFRef(v); resetPage(); }}
          options={[
            { val: 'Todos', label: 'Ref.: Todos', activeClass: 'bg-slate-800 text-white' },
            { val: 'MA',    label: 'MA',           activeClass: 'bg-emerald-600 text-white' },
            { val: 'SS',    label: 'SS',            activeClass: 'bg-indigo-600 text-white' },
          ]}
        />

        {/* Significância */}
        <ToggleGroup<'Todos' | 'S' | 'N'>
          prefix="Sig:"
          value={fSig}
          onChange={(v) => { setFSig(v); resetPage(); }}
          options={[
            { val: 'Todos', label: 'Todos', activeClass: 'bg-slate-800 text-white' },
            { val: 'S',     label: 'Sig.',  activeClass: 'bg-red-600 text-white' },
            { val: 'N',     label: 'Não',   activeClass: 'bg-emerald-600 text-white' },
          ]}
        />

        {/* Situação */}
        <ToggleGroup<'Todos' | 'N' | 'A' | 'E'>
          prefix="Sit:"
          value={fSit}
          onChange={(v) => { setFSit(v); resetPage(); }}
          options={[
            { val: 'Todos', label: 'Todos',      activeClass: 'bg-slate-800 text-white' },
            { val: 'N',     label: 'Normal',     activeClass: 'bg-blue-600 text-white' },
            { val: 'A',     label: 'Anormal',    activeClass: 'bg-amber-600 text-white' },
            { val: 'E',     label: 'Emergência', activeClass: 'bg-red-700 text-white' },
          ]}
        />

        <span className="text-xs text-slate-400 ml-auto shrink-0">
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          <span className="ml-2.5 text-sm text-slate-500">Carregando registros LAAIPR...</span>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {!loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Setor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Aspecto / Perigo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Impacto / Risco</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ref.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Situação</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Imp.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Significância</th>
                  <th className="w-10 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400 text-sm">
                      Nenhum registro encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : paginated.map((rec) => {
                  const ref = refInfo(rec.referencia);
                  const sit = situacaoInfo(rec.situacao);
                  const isSig = rec.significancia === 'S';
                  return (
                    <tr
                      key={rec.id}
                      onClick={() => setSelected(rec)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${isSig ? 'border-l-2 border-l-red-400' : ''}`}
                    >
                      <td className="px-4 py-3 text-xs font-medium text-slate-700 max-w-[150px]">
                        <span className="line-clamp-2">{rec.setor}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">
                        <span className="line-clamp-2 leading-relaxed">{rec.aspecto_perigo || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px]">
                        <span className="line-clamp-2 leading-relaxed">{rec.impacto_risco || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${ref.classes}`}>
                          {rec.referencia === 'MA'
                            ? <Leaf   className="w-2.5 h-2.5" />
                            : <Shield className="w-2.5 h-2.5" />}
                          {ref.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${sit.classes}`}>
                          {sit.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${impClasses(rec.importancia)}`}>
                          {rec.importancia ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${sigClasses(rec.significancia)}`}>
                          {rec.significancia === 'S' ? '⚠ Significativo' : rec.significancia === 'N' ? '✓ Não Sig.' : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} registros
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <span className="text-xs text-slate-600 px-2 font-medium">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      {selected && (
        <DetailModal
          record={selected}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
        />
      )}

      {/* ── Form Modal (Novo / Editar) ────────────────────────────────────────── */}
      {showForm && (
        <FormModal
          initial={formInitial()}
          setores={setores}
          saving={saving}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
