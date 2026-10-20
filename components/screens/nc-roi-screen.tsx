'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Filter, X, ChevronDown, Save, Trash2,
  FileText, Calendar, MapPin, AlertTriangle, Loader2,
  ClipboardList, SlidersHorizontal,
} from 'lucide-react';
import {
  fetchROIRecords,
  saveROIRecord,
  updateROIRecord,
  deleteROIRecord,
  searchEquipmentBySerial,
  type ROIRow,
} from '@/lib/supabase';

// ─── Constantes de domínio ────────────────────────────────────────────────────

const SITES = ['RDO', 'MC', 'CLIENTE'] as const;

const LOCAIS = [
  'ESTOQUE', 'TRANSBORDO', 'CARREGAMENTO',
  'RECEBIMENTO', 'DESCONTAMINAÇÃO', 'LOGÍSTICA', 'N/A',
] as const;

const TEMAS = [
  'VAZAMENTO',
  'PROCESSO',
  'DANO / AVARIA NA ESTRUTURA',
  'REVESTIMENTO',
  'ETIQUETA',
  'PLACAS / VALIDADE',
] as const;

const SUBTEMAS: Record<string, string[]> = {
  'VAZAMENTO': [
    'VÁLVULA DE DESCARGA', 'TAMPA', 'TAMPA DE 18"', 'TAMPA DE 7"',
    'VEDAÇÃO', 'VÁLVULA DE ALÍVIO', 'VÁLVULA VENT', 'FURO NO VASO',
  ],
  'PROCESSO': [
    'FALHA OPERACIONAL', 'FALHA NA INSPEÇÃO', 'SUJIDADE', 'PROCEDIMENTO NÃO SEGUIDO',
    'ESLINGA', 'ESLINGA SEM CUPILHA', 'ESLINGA RASUDARA', 'CORDOALHA SOLTA',
    'LACRE', 'LOTE', 'TARA DIVERGÊNTE', 'FIXAÇÃO/PARAFUSOS',
    'TAMPA', 'VÁLVULA SEM CAP', 'ETIQUETA', 'AUSÊNCIA DE PLACA', 'PINTURA ERRADA', 'VALIDADE DOS TESTES',
  ],
  'DANO / AVARIA NA ESTRUTURA': [
    'AMASSADO', 'CORROSÃO', 'TRINCA', 'VASO AMASSADO', 'ESTRUTURA',
    'GUIA DE EMPILHADEIRA', 'PRESILHA TRAVADA', 'FIXAÇÃO/PARAFUSOS',
    'FURO NO VASO', 'PLACA', 'TAMPA DE 18"', 'VÁLVULA DE ALÍVIO', 'VÁLVULA DE DESCARGA',
  ],
  'REVESTIMENTO': ['PINTURA ERRADA', 'OXIDAÇÃO', 'SUJIDADE'],
  'ETIQUETA': ['ETIQUETAGEM', 'DIVERGÊNCIA', 'LOTE', 'FALHA OPERACIONAL', 'PROCEDIMENTO NÃO SEGUIDO'],
  'PLACAS / VALIDADE': [
    'AUSÊNCIA DE PLACA', 'TANQUE SEM PLACA', 'PLACA',
    'VALIDADE DOS TESTES', 'DIVERGÊNCIA', 'FALHA OPERACIONAL',
  ],
};

const SETORES = [
  'ESTANQUEIDADE', 'DESCONTAMINAÇÃO', 'ASS. TÉCNICA',
  'MANUTENÇÃO', 'PINTURA', 'TRANSBORDO RDO',
  'INTERTANK', 'CLARIANT', 'ESLINGA',
] as const;

const TIPOS_LABELS: Array<{ key: keyof ROIFormState['tipos']; label: string }> = [
  { key: 'tipo_processo',     label: 'Processo'      },
  { key: 'tipo_vazamento',    label: 'Vazamento'     },
  { key: 'tipo_revestimento', label: 'Revestimento'  },
  { key: 'tipo_etiquetas',    label: 'Etiquetas'     },
  { key: 'tipo_dano_avaria',  label: 'Dano / Avaria' },
  { key: 'tipo_placas',       label: 'Placas'        },
];

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ROIFormState {
  serial_number: string;
  equipment_desc: string;
  recorded_date: string;
  site: string;
  local: string;
  tema: string;
  subtema: string;
  setor_responsavel: string;
  descricao: string;
  tipos: {
    tipo_processo: boolean;
    tipo_vazamento: boolean;
    tipo_revestimento: boolean;
    tipo_etiquetas: boolean;
    tipo_dano_avaria: boolean;
    tipo_placas: boolean;
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): ROIFormState {
  return {
    serial_number: '',
    equipment_desc: '',
    recorded_date: todayISO(),
    site: '',
    local: '',
    tema: '',
    subtema: '',
    setor_responsavel: '',
    descricao: '',
    tipos: {
      tipo_processo: false,
      tipo_vazamento: false,
      tipo_revestimento: false,
      tipo_etiquetas: false,
      tipo_dano_avaria: false,
      tipo_placas: false,
    },
  };
}

function rowToForm(row: ROIRow): ROIFormState {
  return {
    serial_number: row.serial_number ?? '',
    equipment_desc: row.equipment_desc ?? '',
    recorded_date: row.recorded_date,
    site: row.site ?? '',
    local: row.local ?? '',
    tema: row.tema ?? '',
    subtema: row.subtema ?? '',
    setor_responsavel: row.setor_responsavel ?? '',
    descricao: row.descricao ?? '',
    tipos: {
      tipo_processo:     row.tipo_processo,
      tipo_vazamento:    row.tipo_vazamento,
      tipo_revestimento: row.tipo_revestimento,
      tipo_etiquetas:    row.tipo_etiquetas,
      tipo_dano_avaria:  row.tipo_dano_avaria,
      tipo_placas:       row.tipo_placas,
    },
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function NCROIScreen() {
  const [rows, setRows]         = useState<ROIRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  // Modal
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [form, setForm]               = useState<ROIFormState>(emptyForm);

  // Autocomplete serial
  const [serialSuggestions, setSerialSuggestions] = useState<Array<{ serial_number: string; description: string }>>([]);
  const [serialLoading, setSerialLoading]         = useState(false);
  const serialDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filtros
  const [filterSite,  setFilterSite]  = useState('');
  const [filterLocal, setFilterLocal] = useState('');
  const [filterTema,  setFilterTema]  = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [search,      setSearch]      = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Carregar registros ─────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchROIRecords();
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Autocomplete serial ────────────────────────────────────────────────────
  const handleSerialChange = (val: string) => {
    setForm(f => ({ ...f, serial_number: val, equipment_desc: '' }));
    setSerialSuggestions([]);
    if (serialDebounce.current) clearTimeout(serialDebounce.current);
    if (val.trim().length < 3) return;
    serialDebounce.current = setTimeout(async () => {
      setSerialLoading(true);
      const suggestions = await searchEquipmentBySerial(val, 8);
      setSerialSuggestions(suggestions);
      setSerialLoading(false);
    }, 350);
  };

  const selectEquipment = (eq: { serial_number: string; description: string }) => {
    setForm(f => ({ ...f, serial_number: eq.serial_number, equipment_desc: eq.description }));
    setSerialSuggestions([]);
  };

  // ── Abrir modal ────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSerialSuggestions([]);
    setModalOpen(true);
  };

  const openEdit = (row: ROIRow) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
    setSerialSuggestions([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setSerialSuggestions([]);
  };

  // ── Salvar ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.recorded_date) return;
    setSaving(true);

    const payload = {
      registration_number: null,
      serial_number: form.serial_number || null,
      equipment_desc: form.equipment_desc || null,
      recorded_date: form.recorded_date,
      site: form.site || null,
      local: form.local || null,
      tema: form.tema || null,
      subtema: form.subtema || null,
      setor_responsavel: form.setor_responsavel || null,
      descricao: form.descricao || null,
      ...form.tipos,
    };

    if (editingId) {
      await updateROIRecord(editingId, payload);
    } else {
      await saveROIRecord(payload);
    }

    await load();
    setSaving(false);
    closeModal();
  };

  // ── Deletar ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro de ocorrência?')) return;
    await deleteROIRecord(id);
    setRows(r => r.filter(x => x.id !== id));
  };

  // ── Filtros aplicados ──────────────────────────────────────────────────────
  const filtered = rows.filter(r => {
    if (filterSite  && r.site  !== filterSite)  return false;
    if (filterLocal && r.local !== filterLocal)  return false;
    if (filterTema  && r.tema  !== filterTema)   return false;
    if (filterMonth) {
      const [fy, fm] = filterMonth.split('-').map(Number);
      const [ry, rm] = (r.recorded_date ?? '').split('-').map(Number);
      if (fy !== ry || fm !== rm) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = [
        r.serial_number, r.equipment_desc, r.site, r.local,
        r.tema, r.subtema, r.setor_responsavel, r.descricao,
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // ── Meses disponíveis ──────────────────────────────────────────────────────
  const availableMonths = Array.from(
    new Set(rows.map(r => r.recorded_date?.slice(0, 7)).filter(Boolean))
  ).sort().reverse();

  // ── Formatar data para exibição ────────────────────────────────────────────
  const fmtDate = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const fmtMonth = (ym: string) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${names[+m - 1]}/${y}`;
  };

  // ── Contagem de tipos ativos no ROI ────────────────────────────────────────
  const tipoCount = (r: ROIRow) =>
    [r.tipo_processo, r.tipo_vazamento, r.tipo_revestimento,
     r.tipo_etiquetas, r.tipo_dano_avaria, r.tipo_placas].filter(Boolean).length;

  // ── Cor do tema ────────────────────────────────────────────────────────────
  const temaColor: Record<string, string> = {
    'VAZAMENTO':                  'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'PROCESSO':                   'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'DANO / AVARIA NA ESTRUTURA': 'bg-red-500/20 text-red-300 border-red-500/30',
    'REVESTIMENTO':               'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'ETIQUETA':                   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'PLACAS / VALIDADE':          'bg-green-500/20 text-green-300 border-green-500/30',
  };

  const activeFiltersCount = [filterSite, filterLocal, filterTema, filterMonth].filter(Boolean).length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#0a0f1e] text-slate-200">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-[#0c1222] shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            ROI — Registro de Ocorrência Interna
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {rows.length} registro{rows.length !== 1 ? 's' : ''} no total
            {filtered.length !== rows.length && ` · ${filtered.length} filtrado${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo ROI
        </button>
      </div>

      {/* ── Barra de busca + filtros ────────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-slate-800/40 bg-[#0c1222]/60 shrink-0 space-y-2">
        <div className="flex gap-2">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por série, equipamento, tema…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:bg-slate-800"
            />
          </div>
          {/* Toggle filtros */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filtros expandidos */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-1">
            <FilterSelect label="Site"  value={filterSite}  onChange={setFilterSite}  options={SITES.map(s => s)} />
            <FilterSelect label="Local" value={filterLocal} onChange={setFilterLocal} options={LOCAIS.map(l => l)} />
            <FilterSelect label="Tema"  value={filterTema}  onChange={setFilterTema}  options={TEMAS.map(t => t)} />
            {/* Mês */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500">Mês</label>
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-200 px-2 py-1 focus:outline-none focus:border-blue-500"
              >
                <option value="">Todos</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{fmtMonth(m!)}</option>
                ))}
              </select>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setFilterSite(''); setFilterLocal(''); setFilterTema(''); setFilterMonth(''); }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors"
              >
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Tabela ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
            <FileText className="w-8 h-8 opacity-30" />
            <p className="text-sm">Nenhum registro encontrado</p>
            {(search || activeFiltersCount > 0) && (
              <p className="text-xs">Ajuste os filtros ou a busca</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-medium">Data</th>
                  <th className="text-left px-4 py-2.5 font-medium">Nº Série</th>
                  <th className="text-left px-4 py-2.5 font-medium">Equipamento</th>
                  <th className="text-left px-4 py-2.5 font-medium">Site</th>
                  <th className="text-left px-4 py-2.5 font-medium">Local</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tema</th>
                  <th className="text-left px-4 py-2.5 font-medium">Subtema</th>
                  <th className="text-left px-4 py-2.5 font-medium">Setor</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tipos</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-800/30 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/10'}`}
                    onClick={() => openEdit(r)}
                  >
                    <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap font-mono text-xs">
                      {fmtDate(r.recorded_date)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap font-mono text-xs">
                      {r.serial_number || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 max-w-[200px] truncate text-xs">
                      {r.equipment_desc || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.site ? (
                        <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded font-medium">
                          {r.site}
                        </span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                      {r.local || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.tema ? (
                        <span className={`text-[11px] border px-2 py-0.5 rounded-full font-medium ${temaColor[r.tema] ?? 'bg-slate-700/40 text-slate-400 border-slate-600/40'}`}>
                          {r.tema}
                        </span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[140px] truncate">
                      {r.subtema || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                      {r.setor_responsavel || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-slate-400">
                        {tipoCount(r)} tipo{tipoCount(r) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <ROIModal
          form={form}
          setForm={setForm}
          editingId={editingId}
          saving={saving}
          onClose={closeModal}
          onSave={handleSave}
          serialSuggestions={serialSuggestions}
          serialLoading={serialLoading}
          onSerialChange={handleSerialChange}
          onSelectEquipment={selectEquipment}
          onClearSuggestions={() => setSerialSuggestions([])}
        />
      )}
    </div>
  );
}

// ─── Modal ROI ────────────────────────────────────────────────────────────────

interface ROIModalProps {
  form: ROIFormState;
  setForm: React.Dispatch<React.SetStateAction<ROIFormState>>;
  editingId: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  serialSuggestions: Array<{ serial_number: string; description: string }>;
  serialLoading: boolean;
  onSerialChange: (v: string) => void;
  onSelectEquipment: (eq: { serial_number: string; description: string }) => void;
  onClearSuggestions: () => void;
}

function ROIModal({
  form, setForm, editingId, saving,
  onClose, onSave,
  serialSuggestions, serialLoading, onSerialChange, onSelectEquipment, onClearSuggestions,
}: ROIModalProps) {
  const set = <K extends keyof ROIFormState>(k: K, v: ROIFormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const setTipo = (k: keyof ROIFormState['tipos'], v: boolean) =>
    setForm(f => ({ ...f, tipos: { ...f.tipos, [k]: v } }));

  const subtemaOptions = form.tema ? (SUBTEMAS[form.tema] ?? []) : [];

  const isValid = Boolean(form.recorded_date);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1829] border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-semibold text-white">
              {editingId ? 'Editar Ocorrência' : 'Nova Ocorrência Interna'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Nº de Série + autocomplete */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Nº de Série</label>
            <div className="relative">
              <input
                type="text"
                value={form.serial_number}
                onChange={e => onSerialChange(e.target.value)}
                placeholder="Digite o número de série…"
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60"
              />
              {serialLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />
              )}
              {serialSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a2540] border border-slate-700 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                  {serialSuggestions.map(eq => (
                    <button
                      key={eq.serial_number}
                      type="button"
                      onMouseDown={() => onSelectEquipment(eq)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-700/60 transition-colors"
                    >
                      <div className="text-sm text-white font-medium">{eq.serial_number}</div>
                      <div className="text-xs text-slate-400 truncate">{eq.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Equipamento (auto-preenchido) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Equipamento</label>
            <input
              type="text"
              value={form.equipment_desc}
              onChange={e => set('equipment_desc', e.target.value)}
              placeholder="Preenchido automaticamente pelo número de série"
              className="w-full px-3 py-2 bg-slate-800/30 border border-slate-700/40 rounded-lg text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          {/* Data + Site */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data
                <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.recorded_date}
                onChange={e => set('recorded_date', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/60"
              />
            </div>
            <FieldSelect
              label="Site"
              value={form.site}
              onChange={v => set('site', v)}
              options={SITES.map(s => s)}
              placeholder="Selecionar…"
            />
          </div>

          {/* Local + Setor */}
          <div className="grid grid-cols-2 gap-4">
            <FieldSelect
              label="Local"
              value={form.local}
              onChange={v => set('local', v)}
              options={LOCAIS.map(l => l)}
              placeholder="Selecionar…"
              icon={<MapPin className="w-3 h-3" />}
            />
            <FieldSelect
              label="Setor Responsável"
              value={form.setor_responsavel}
              onChange={v => set('setor_responsavel', v)}
              options={SETORES.map(s => s)}
              placeholder="Selecionar…"
            />
          </div>

          {/* Tema + Subtema */}
          <div className="grid grid-cols-2 gap-4">
            <FieldSelect
              label="Tema"
              value={form.tema}
              onChange={v => { set('tema', v); set('subtema', ''); }}
              options={TEMAS.map(t => t)}
              placeholder="Selecionar…"
            />
            <FieldSelect
              label="Subtema"
              value={form.subtema}
              onChange={v => set('subtema', v)}
              options={subtemaOptions}
              placeholder={form.tema ? 'Selecionar…' : 'Selecione o tema primeiro'}
              disabled={!form.tema}
            />
          </div>

          {/* Tipos — checklist */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tipo da Ocorrência</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_LABELS.map(({ key, label }) => {
                const checked = form.tipos[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTipo(key, !checked)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                      checked
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      checked ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                    }`}>
                      {checked && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Descrição / O que aconteceu</label>
            <textarea
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              rows={3}
              placeholder="Descreva a ocorrência em detalhes…"
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!isValid || saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Registrar ocorrência'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-slate-500">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-200 px-2 py-1 focus:outline-none focus:border-blue-500"
      >
        <option value="">Todos</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

interface FieldSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

function FieldSelect({ label, value, onChange, options, placeholder, disabled, icon }: FieldSelectProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1">
        {icon} {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/60 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder ?? 'Selecionar…'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
