'use client';

import { useState, useCallback } from 'react';
import {
  GitBranch,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ChevronRight,
  Check,
  X,
  Search,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Layers,
  Tag,
  ArrowRight,
  ChevronLeft,
  ChevronDown,
  Users,
  Info,
  FileText,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ─── Style constants (matching other screens) ──────────────────────────────
const inputCls =
  'w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors';
const inputClsSmall =
  'bg-slate-800/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors';
const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide';
const selectCls =
  'w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors';
const textareaCls =
  'w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors resize-none';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Processo {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  versao: string;
  status: 'ativo' | 'em_revisao' | 'obsoleto';
  tipo: 'customizado' | 'importado';
  imagem_url: string | null;
  created_at: string;
}

interface Swimlane {
  id: string;
  processo_id: string;
  nome: string;
  cor: string;
  ordem: number;
}

interface Etapa {
  id: string;
  processo_id: string;
  swimlane_id: string | null;
  tipo: 'inicio' | 'fim' | 'task' | 'decisao';
  label: string;
  descricao: string;
  ordem: number;
}

interface BuilderSwimlane {
  tempId: string;
  nome: string;
  cor: string;
}

interface BuilderEtapa {
  tempId: string;
  swTempId: string;
  tipo: 'inicio' | 'fim' | 'task' | 'decisao';
  label: string;
  descricao: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const LANE_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#6366f1',
];

const CATEGORIAS = [
  { value: 'operacional', label: 'Operacional' },
  { value: 'fabricacao', label: 'Fabricação' },
  { value: 'ambiental', label: 'Ambiental' },
  { value: 'sgi', label: 'SGI' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'logistica', label: 'Logística' },
];

const CAT_LABEL: Record<string, string> = {
  operacional: 'Operacional', fabricacao: 'Fabricação', ambiental: 'Ambiental',
  sgi: 'SGI', manutencao: 'Manutenção', logistica: 'Logística',
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ativo: { label: 'Ativo', cls: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40' },
  em_revisao: { label: 'Em Revisão', cls: 'bg-amber-900/50 text-amber-300 border border-amber-700/40' },
  obsoleto: { label: 'Obsoleto', cls: 'bg-slate-800 text-slate-400 border border-slate-700/40' },
};

const TIPO_ETAPA = [
  { value: 'inicio', label: 'Início' },
  { value: 'task', label: 'Tarefa' },
  { value: 'decisao', label: 'Decisão' },
  { value: 'fim', label: 'Fim' },
];

const QUICK_LANES = ['Cliente', 'Administrativo', 'Operações', 'QSMS', 'Laboratório', 'Logística'];

// ─── Flowchart SVG renderer ──────────────────────────────────────────────────
const SW = 140, SH = 46, GX = 70, LH = 110, LW = 110, PAD = 16;

function getPos(etapa: Etapa, idx: number, swimlanes: Swimlane[]) {
  const li = swimlanes.findIndex((s) => s.id === etapa.swimlane_id);
  const laneIdx = li < 0 ? 0 : li;
  return {
    x: LW + PAD + idx * (SW + GX),
    y: PAD + laneIdx * LH + (LH - SH) / 2,
    cx: LW + PAD + idx * (SW + GX) + SW / 2,
    cy: PAD + laneIdx * LH + LH / 2,
    laneIdx,
  };
}

function wrapText(text: string, maxChars = 16): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

function FlowchartSVG({ swimlanes, etapas }: { swimlanes: Swimlane[]; etapas: Etapa[] }) {
  if (etapas.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-slate-500 text-sm">
        Nenhuma etapa definida. Adicione etapas ao processo.
      </div>
    );
  }

  const laneCount = Math.max(swimlanes.length, 1);
  const svgW = LW + PAD * 2 + etapas.length * (SW + GX) - GX + PAD;
  const svgH = PAD * 2 + laneCount * LH;

  return (
    <div className="overflow-auto pb-2">
      <svg width={svgW} height={svgH} style={{ minWidth: svgW }}>
        <defs>
          <marker id="arrowViolet" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#7c3aed" />
          </marker>
        </defs>

        {/* Swimlane backgrounds and labels */}
        {Array.from({ length: laneCount }, (_, i) => {
          const lane = swimlanes[i];
          const laneColor = lane?.cor ?? '#6366f1';
          return (
            <g key={i}>
              <rect
                x={0} y={PAD + i * LH} width={svgW} height={LH}
                fill={i % 2 === 0 ? '#1e293b' : '#0f172a'} opacity="0.6"
              />
              {i > 0 && (
                <line x1={0} y1={PAD + i * LH} x2={svgW} y2={PAD + i * LH}
                  stroke="#334155" strokeWidth="1" />
              )}
              {/* Label panel */}
              <rect x={0} y={PAD + i * LH} width={LW} height={LH}
                fill={laneColor + '18'} />
              <line x1={LW} y1={PAD + i * LH} x2={LW} y2={PAD + (i + 1) * LH}
                stroke="#475569" strokeWidth="1" />
              {lane && (
                <text x={LW / 2} y={PAD + i * LH + LH / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={laneColor} fontSize="10" fontWeight="600"
                  style={{ userSelect: 'none' }}>
                  {lane.nome.length > 13 ? lane.nome.slice(0, 12) + '…' : lane.nome}
                </text>
              )}
            </g>
          );
        })}

        {/* Outer border */}
        <rect x={0} y={PAD} width={svgW} height={laneCount * LH}
          fill="none" stroke="#475569" strokeWidth="1" rx="4" />

        {/* Arrows */}
        {etapas.slice(0, -1).map((e, i) => {
          const from = getPos(e, i, swimlanes);
          const to = getPos(etapas[i + 1], i + 1, swimlanes);
          const fX = from.x + SW;
          const fY = from.cy;
          const tX = to.x;
          const tY = to.cy;
          const mid = fX + GX / 2;

          if (from.laneIdx === to.laneIdx) {
            return (
              <line key={i} x1={fX} y1={fY} x2={tX} y2={tY}
                stroke="#7c3aed" strokeWidth="1.5" markerEnd="url(#arrowViolet)" />
            );
          }
          return (
            <path key={i}
              d={`M ${fX} ${fY} H ${mid} V ${tY} H ${tX}`}
              fill="none" stroke="#7c3aed" strokeWidth="1.5" markerEnd="url(#arrowViolet)" />
          );
        })}

        {/* Step shapes */}
        {etapas.map((e, i) => {
          const { x, y, cx, cy, laneIdx } = getPos(e, i, swimlanes);
          const lc = swimlanes[laneIdx]?.cor ?? '#6366f1';

          if (e.tipo === 'inicio') {
            return (
              <g key={e.id}>
                <circle cx={cx} cy={cy} r={22} fill="#14532d" stroke="#22c55e" strokeWidth="2" />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="9" fontWeight="700" style={{ userSelect: 'none' }}>
                  INÍCIO
                </text>
              </g>
            );
          }

          if (e.tipo === 'fim') {
            return (
              <g key={e.id}>
                <circle cx={cx} cy={cy} r={24} fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
                <circle cx={cx} cy={cy} r={17} fill="#991b1b" />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="9" fontWeight="700" style={{ userSelect: 'none' }}>
                  FIM
                </text>
              </g>
            );
          }

          if (e.tipo === 'decisao') {
            const dh = SH / 2 + 6;
            const dw = SW / 2 - 2;
            const pts = `${cx},${cy - dh} ${cx + dw},${cy} ${cx},${cy + dh} ${cx - dw},${cy}`;
            const lines = wrapText(e.label, 14);
            return (
              <g key={e.id}>
                <polygon points={pts} fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                {lines.map((line, li) => (
                  <text key={li} x={cx}
                    y={cy + (li - (lines.length - 1) / 2) * 12}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#c7d2fe" fontSize="9" fontWeight="500"
                    style={{ userSelect: 'none' }}>
                    {line}
                  </text>
                ))}
              </g>
            );
          }

          // task
          const lines = wrapText(e.label, 16);
          return (
            <g key={e.id}>
              <rect x={x} y={y} width={SW} height={SH} rx={6}
                fill="#1e293b" stroke={lc} strokeWidth="1.5" />
              {lines.map((line, li) => (
                <text key={li} x={cx}
                  y={cy + (li - (lines.length - 1) / 2) * 14}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#e2e8f0" fontSize="10" fontWeight="500"
                  style={{ userSelect: 'none' }}>
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function MapeamentoProcessosScreen() {
  // ── Data state ──────────────────────────────────────────────────────────
  const [processos, setProcessos] = useState<Processo[]>(() => {
    void loadProcessos();
    return [];
  });
  const [swimlaneMap, setSwimlaneMap] = useState<Record<string, Swimlane[]>>({});
  const [etapaMap, setEtapaMap] = useState<Record<string, Etapa[]>>({});

  // ── UI state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterCat, setFilterCat] = useState('todos');
  const [imageZoom, setImageZoom] = useState(80);

  // ── Modal state ─────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────
  const [fNome, setFNome] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fCat, setFCat] = useState('operacional');
  const [fVersao, setFVersao] = useState('1.0');
  const [fStatus, setFStatus] = useState<'ativo' | 'em_revisao' | 'obsoleto'>('ativo');
  const [fLanes, setFLanes] = useState<BuilderSwimlane[]>([]);
  const [fEtapas, setFEtapas] = useState<BuilderEtapa[]>([]);

  // ── Delete confirm ──────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── Load processos ──────────────────────────────────────────────────────
  async function loadProcessos() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('mapeamento_processos')
        .select('*')
        .order('tipo', { ascending: false })
        .order('created_at');
      setProcessos(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(processoId: string) {
    if (!supabase) return;
    if (swimlaneMap[processoId]) return; // cached
    const [{ data: sws }, { data: etps }] = await Promise.all([
      supabase.from('mapeamento_swimlanes').select('*').eq('processo_id', processoId).order('ordem'),
      supabase.from('mapeamento_etapas').select('*').eq('processo_id', processoId).order('ordem'),
    ]);
    setSwimlaneMap((prev) => ({ ...prev, [processoId]: sws ?? [] }));
    setEtapaMap((prev) => ({ ...prev, [processoId]: etps ?? [] }));
  }

  const handleSelect = async (p: Processo) => {
    setSelectedId(p.id);
    setImageZoom(80);
    if (p.tipo === 'customizado') {
      await loadDetail(p.id);
    }
  };

  // ── Filtered list ───────────────────────────────────────────────────────
  const filtered = processos.filter((p) => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.categoria.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || p.status === filterStatus;
    const matchCat = filterCat === 'todos' || p.categoria === filterCat;
    return matchSearch && matchStatus && matchCat;
  });

  const selected = processos.find((p) => p.id === selectedId) ?? null;
  const selSwimlanes = selected ? (swimlaneMap[selected.id] ?? []) : [];
  const selEtapas = selected ? (etapaMap[selected.id] ?? []) : [];

  // ── KPIs ────────────────────────────────────────────────────────────────
  const kpis = {
    total: processos.length,
    importados: processos.filter((p) => p.tipo === 'importado').length,
    customizados: processos.filter((p) => p.tipo === 'customizado').length,
    emRevisao: processos.filter((p) => p.status === 'em_revisao').length,
  };

  // ── Modal helpers ───────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setFNome(''); setFDesc(''); setFCat('operacional');
    setFVersao('1.0'); setFStatus('ativo');
    setFLanes([]);
    setFEtapas([]);
    setModalStep(0);
    setShowModal(true);
  }

  function openEdit(p: Processo) {
    setEditingId(p.id);
    setFNome(p.nome); setFDesc(p.descricao); setFCat(p.categoria);
    setFVersao(p.versao); setFStatus(p.status);
    // Populate lanes and etapas from cached data
    const sws = swimlaneMap[p.id] ?? [];
    const etps = etapaMap[p.id] ?? [];
    setFLanes(sws.map((s) => ({ tempId: s.id, nome: s.nome, cor: s.cor })));
    setFEtapas(etps.map((e) => ({
      tempId: e.id,
      swTempId: e.swimlane_id ?? '',
      tipo: e.tipo,
      label: e.label,
      descricao: e.descricao,
    })));
    setModalStep(0);
    setShowModal(true);
  }

  function addLane() {
    const colorIdx = fLanes.length % LANE_COLORS.length;
    setFLanes((prev) => [...prev, {
      tempId: `tmp-${Date.now()}`,
      nome: '',
      cor: LANE_COLORS[colorIdx],
    }]);
  }

  function addQuickLane(nome: string) {
    if (fLanes.some((l) => l.nome === nome)) return;
    const colorIdx = fLanes.length % LANE_COLORS.length;
    setFLanes((prev) => [...prev, { tempId: `tmp-${Date.now()}`, nome, cor: LANE_COLORS[colorIdx] }]);
  }

  function removeLane(tempId: string) {
    setFLanes((prev) => prev.filter((l) => l.tempId !== tempId));
    setFEtapas((prev) => prev.map((e) => e.swTempId === tempId ? { ...e, swTempId: '' } : e));
  }

  function addEtapa() {
    setFEtapas((prev) => [...prev, {
      tempId: `tmp-${Date.now()}`,
      swTempId: fLanes[0]?.tempId ?? '',
      tipo: 'task',
      label: '',
      descricao: '',
    }]);
  }

  function removeEtapa(tempId: string) {
    setFEtapas((prev) => prev.filter((e) => e.tempId !== tempId));
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!supabase || !fNome.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        // Update main record
        await supabase.from('mapeamento_processos').update({
          nome: fNome.trim(), descricao: fDesc, categoria: fCat,
          versao: fVersao, status: fStatus, updated_at: new Date().toISOString(),
        }).eq('id', editingId);

        // Delete and re-create swimlanes + etapas
        await supabase.from('mapeamento_etapas').delete().eq('processo_id', editingId);
        await supabase.from('mapeamento_swimlanes').delete().eq('processo_id', editingId);

        await saveSubData(editingId);

        // Clear cache
        setSwimlaneMap((prev) => { const n = { ...prev }; delete n[editingId]; return n; });
        setEtapaMap((prev) => { const n = { ...prev }; delete n[editingId]; return n; });
      } else {
        // Insert new processo
        const { data: newP } = await supabase.from('mapeamento_processos').insert({
          nome: fNome.trim(), descricao: fDesc, categoria: fCat,
          versao: fVersao, status: fStatus, tipo: 'customizado',
        }).select().single();

        if (newP) await saveSubData(newP.id);
      }

      await loadProcessos();
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function saveSubData(processoId: string) {
    if (!supabase) return;
    // Insert swimlanes and build tempId → real id map
    const laneIdMap: Record<string, string> = {};
    if (fLanes.length > 0) {
      const { data: insertedLanes } = await supabase.from('mapeamento_swimlanes').insert(
        fLanes.map((l, i) => ({ processo_id: processoId, nome: l.nome || 'Swimlane', cor: l.cor, ordem: i }))
      ).select();
      (insertedLanes ?? []).forEach((lane: Swimlane, i: number) => {
        laneIdMap[fLanes[i].tempId] = lane.id;
      });
    }

    // Insert etapas
    if (fEtapas.length > 0) {
      await supabase.from('mapeamento_etapas').insert(
        fEtapas.map((e, i) => ({
          processo_id: processoId,
          swimlane_id: laneIdMap[e.swTempId] ?? null,
          tipo: e.tipo,
          label: e.label || 'Etapa',
          descricao: e.descricao,
          ordem: i,
        }))
      );
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!supabase) return;
    await supabase.from('mapeamento_processos').delete().eq('id', id);
    setProcessos((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    setConfirmDelete(null);
  }

  // ── Build preview swimlanes/etapas for modal step 2 ─────────────────────
  const previewSwimlanes: Swimlane[] = fLanes.map((l, i) => ({
    id: l.tempId, processo_id: '', nome: l.nome || `Swimlane ${i + 1}`, cor: l.cor, ordem: i,
  }));
  const previewEtapas: Etapa[] = fEtapas.map((e, i) => ({
    id: e.tempId, processo_id: '', swimlane_id: e.swTempId || null,
    tipo: e.tipo, label: e.label || '...', descricao: e.descricao, ordem: i,
  }));

  // ── MODAL STEPS ──────────────────────────────────────────────────────────
  const STEPS = ['Informações', 'Swimlanes', 'Etapas'];
  const canNext0 = fNome.trim().length > 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-slate-950">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 border-b border-slate-800/60 px-6 pt-6 pb-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
                <GitBranch className="w-4 h-4 text-violet-400" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Mapeamento de Processos</h1>
            </div>
            <p className="text-sm text-slate-400 ml-10">
              Fluxogramas operacionais e construtores de processos BPMN
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-violet-900/30"
          >
            <Plus className="w-4 h-4" />
            Novo Processo
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: kpis.total, color: 'text-violet-300' },
            { label: 'Importados', value: kpis.importados, color: 'text-blue-300' },
            { label: 'Customizados', value: kpis.customizados, color: 'text-emerald-300' },
            { label: 'Em Revisão', value: kpis.emRevisao, color: 'text-amber-300' },
          ].map((k) => (
            <div key={k.label} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────── */}
      <div className="flex gap-0 h-[calc(100vh-220px)] min-h-[500px]">

        {/* Left panel: list */}
        <div className="w-80 shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/30">
          {/* Search + filters */}
          <div className="p-3 border-b border-slate-800/60 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                placeholder="Buscar processo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              {['todos', 'ativo', 'em_revisao'].map((s) => (
                <button key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`flex-1 text-[11px] py-1 rounded-md font-medium transition-colors ${
                    filterStatus === s
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}>
                  {s === 'todos' ? 'Todos' : s === 'ativo' ? 'Ativos' : 'Revisão'}
                </button>
              ))}
            </div>
          </div>

          {/* Process list */}
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5">
            {loading && (
              <div className="text-center text-slate-500 text-sm py-8">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                Carregando...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center text-slate-500 text-sm py-8">
                Nenhum processo encontrado
              </div>
            )}
            {filtered.map((p) => {
              const isActive = selectedId === p.id;
              const sCfg = STATUS_CFG[p.status] ?? STATUS_CFG.ativo;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={`w-full text-left rounded-xl p-3 transition-all border ${
                    isActive
                      ? 'bg-violet-900/30 border-violet-700/50 shadow-lg shadow-violet-900/10'
                      : 'bg-slate-800/20 border-slate-700/30 hover:bg-slate-800/40 hover:border-slate-700/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      p.tipo === 'importado' ? 'bg-blue-900/40' : 'bg-violet-900/40'
                    }`}>
                      {p.tipo === 'importado'
                        ? <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                        : <GitBranch className="w-3.5 h-3.5 text-violet-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-100 leading-tight truncate">
                        {p.nome}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                          {CAT_LABEL[p.categoria] ?? p.categoria}
                        </span>
                        <span className="text-[10px] text-slate-500">v{p.versao}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${sCfg.cls}`}>
                      {sCfg.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel: detail */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <GitBranch className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Selecione um processo para visualizar</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* Detail header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold text-white">{selected.nome}</h2>
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${STATUS_CFG[selected.status]?.cls}`}>
                      {STATUS_CFG[selected.status]?.label}
                    </span>
                    {selected.tipo === 'importado' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-900/40 text-blue-300 border border-blue-700/40">
                        Importado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{CAT_LABEL[selected.categoria] ?? selected.categoria}</span>
                    <span>·</span>
                    <span>Versão {selected.versao}</span>
                    {selected.descricao && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-xs">{selected.descricao.slice(0, 60)}{selected.descricao.length > 60 ? '…' : ''}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selected.tipo === 'customizado' && (
                    <button
                      onClick={() => openEdit(selected)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(selected.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm transition-colors border border-red-800/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>

              {/* Imported: show image viewer */}
              {selected.tipo === 'importado' && selected.imagem_url && (
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-800/40">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      Fluxograma BPMN
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{imageZoom}%</span>
                      <button
                        onClick={() => setImageZoom((z) => Math.max(30, z - 10))}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setImageZoom((z) => Math.min(200, z + 10))}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setImageZoom(100)}
                        className="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                      >
                        1:1
                      </button>
                      <button
                        onClick={() => setImageZoom(80)}
                        className="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                      >
                        Ajustar
                      </button>
                    </div>
                  </div>
                  <div className="overflow-auto max-h-[60vh] bg-white/5 p-2">
                    <img
                      src={selected.imagem_url}
                      alt={`Fluxograma: ${selected.nome}`}
                      style={{ width: `${imageZoom}%`, minWidth: '400px' }}
                      className="rounded select-none"
                    />
                  </div>
                </div>
              )}

              {/* Custom: show flowchart + step list */}
              {selected.tipo === 'customizado' && (
                <>
                  {/* Flowchart */}
                  <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-800/40">
                      <GitBranch className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                        Fluxograma do Processo
                      </span>
                      <span className="text-xs text-slate-500 ml-auto">
                        {selEtapas.length} etapa{selEtapas.length !== 1 ? 's' : ''}
                        {selSwimlanes.length > 0 && ` · ${selSwimlanes.length} swimlane${selSwimlanes.length !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <div className="p-4 bg-slate-950/50 overflow-auto">
                      <FlowchartSVG swimlanes={selSwimlanes} etapas={selEtapas} />
                    </div>
                  </div>

                  {/* Step list */}
                  {selEtapas.length > 0 && (
                    <div className="bg-slate-900 rounded-xl border border-slate-800">
                      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/30">
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                          Lista de Etapas
                        </span>
                      </div>
                      <div className="divide-y divide-slate-800/50">
                        {selEtapas.map((e, i) => {
                          const lane = selSwimlanes.find((s) => s.id === e.swimlane_id);
                          const typeCls: Record<string, string> = {
                            inicio: 'text-emerald-400 bg-emerald-900/30',
                            fim: 'text-red-400 bg-red-900/30',
                            task: 'text-blue-400 bg-blue-900/30',
                            decisao: 'text-purple-400 bg-purple-900/30',
                          };
                          const typeLabel: Record<string, string> = {
                            inicio: 'Início', fim: 'Fim', task: 'Tarefa', decisao: 'Decisão',
                          };
                          return (
                            <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                              <span className="text-xs text-slate-600 font-mono w-5 text-right shrink-0">
                                {i + 1}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${typeCls[e.tipo]}`}>
                                {typeLabel[e.tipo]}
                              </span>
                              <span className="text-sm text-slate-200 flex-1 truncate">{e.label}</span>
                              {lane && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md text-slate-400 shrink-0"
                                  style={{ backgroundColor: lane.cor + '20', color: lane.cor, borderColor: lane.cor + '40', border: '1px solid' }}>
                                  {lane.nome}
                                </span>
                              )}
                              {e.descricao && (
                                <span className="text-xs text-slate-500 truncate max-w-[180px]">{e.descricao}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selEtapas.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                      <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Este processo não tem etapas definidas.</p>
                      <button
                        onClick={() => openEdit(selected)}
                        className="mt-3 text-sm text-violet-400 hover:text-violet-300"
                      >
                        + Adicionar etapas
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CONFIRM DELETE ──────────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-slate-400 mb-5">
              Tem certeza que deseja excluir este processo? Todas as etapas e swimlanes serão removidas. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUILDER MODAL ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl my-4">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">
                  {editingId ? 'Editar Processo' : 'Novo Processo'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Construtor de fluxo de processo</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-0 px-6 py-4 border-b border-slate-800/60">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center">
                  <button
                    onClick={() => { if (i <= modalStep || (i === 1 && canNext0) || (i === 2 && canNext0)) setModalStep(i); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      i === modalStep
                        ? 'bg-violet-600 text-white'
                        : i < modalStep
                        ? 'bg-emerald-800/40 text-emerald-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {i < modalStep ? <Check className="w-3.5 h-3.5" /> : <span className="w-4 text-center">{i + 1}</span>}
                    {s}
                  </button>
                  {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-700 mx-1" />}
                </div>
              ))}
            </div>

            {/* Step 0 – Informações */}
            {modalStep === 0 && (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className={labelCls}>Nome do Processo *</label>
                  <input className={inputCls} placeholder="Ex.: Processo de Fabricação – Mistura Simples"
                    value={fNome} onChange={(e) => setFNome(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Descrição</label>
                  <textarea className={textareaCls} rows={3}
                    placeholder="Descreva o objetivo e escopo do processo..."
                    value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Categoria</label>
                    <select className={selectCls} value={fCat} onChange={(e) => setFCat(e.target.value)}>
                      {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Versão</label>
                    <input className={inputCls} placeholder="1.0" value={fVersao}
                      onChange={(e) => setFVersao(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <select className={selectCls} value={fStatus}
                      onChange={(e) => setFStatus(e.target.value as typeof fStatus)}>
                      <option value="ativo">Ativo</option>
                      <option value="em_revisao">Em Revisão</option>
                      <option value="obsoleto">Obsoleto</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1 – Swimlanes */}
            {modalStep === 1 && (
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Definir Swimlanes (Responsáveis)</p>
                    <p className="text-xs text-slate-500 mt-0.5">Cada swimlane representa um ator ou área responsável no processo.</p>
                  </div>
                  <button onClick={addLane}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-700/40 rounded-lg text-sm transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>

                {/* Quick add */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">Adicionar rapidamente:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_LANES.map((ql) => (
                      <button key={ql}
                        onClick={() => addQuickLane(ql)}
                        disabled={fLanes.some((l) => l.nome === ql)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          fLanes.some((l) => l.nome === ql)
                            ? 'text-slate-600 border-slate-700 cursor-not-allowed'
                            : 'text-slate-300 border-slate-700 hover:border-violet-600 hover:text-violet-300'
                        }`}>
                        + {ql}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lane rows */}
                <div className="space-y-2">
                  {fLanes.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
                      Nenhuma swimlane definida. O processo será exibido em uma única faixa.
                    </div>
                  )}
                  {fLanes.map((lane, i) => (
                    <div key={lane.tempId} className="flex items-center gap-3 bg-slate-800/40 rounded-lg p-2.5">
                      <span className="text-xs text-slate-600 font-mono w-4 text-right shrink-0">{i + 1}</span>
                      {/* Color picker */}
                      <div className="flex gap-1 shrink-0">
                        {LANE_COLORS.map((c) => (
                          <button key={c}
                            onClick={() => setFLanes((prev) => prev.map((l) => l.tempId === lane.tempId ? { ...l, cor: c } : l))}
                            style={{ backgroundColor: c }}
                            className={`w-4 h-4 rounded-full border-2 transition-all ${lane.cor === c ? 'border-white scale-110' : 'border-transparent'}`}
                          />
                        ))}
                      </div>
                      <input
                        className={`${inputClsSmall} flex-1`}
                        placeholder={`Swimlane ${i + 1}`}
                        value={lane.nome}
                        onChange={(e) => setFLanes((prev) => prev.map((l) => l.tempId === lane.tempId ? { ...l, nome: e.target.value } : l))}
                      />
                      <button onClick={() => removeLane(lane.tempId)}
                        className="p-1 hover:bg-red-900/40 text-slate-500 hover:text-red-400 rounded transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 – Etapas */}
            {modalStep === 2 && (
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Definir Etapas do Processo</p>
                    <p className="text-xs text-slate-500 mt-0.5">Adicione as etapas em ordem de execução. Use Início e Fim para marcar o fluxo.</p>
                  </div>
                  <button onClick={addEtapa}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-700/40 rounded-lg text-sm transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Etapa
                  </button>
                </div>

                {/* Quick add start/end */}
                {fEtapas.length === 0 && (
                  <div className="flex gap-2">
                    <button onClick={() => setFEtapas([
                      { tempId: `tmp-${Date.now()}`, swTempId: fLanes[0]?.tempId ?? '', tipo: 'inicio', label: 'Início', descricao: '' },
                      { tempId: `tmp-${Date.now() + 1}`, swTempId: fLanes[0]?.tempId ?? '', tipo: 'fim', label: 'Fim', descricao: '' },
                    ])}
                      className="flex-1 py-2 border border-dashed border-slate-700 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:border-violet-600 transition-colors">
                      + Início automático com Início/Fim
                    </button>
                  </div>
                )}

                {/* Etapa rows */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {fEtapas.map((e, i) => (
                    <div key={e.tempId} className="bg-slate-800/40 rounded-lg p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 font-mono w-4 text-right shrink-0">{i + 1}</span>
                        <select
                          value={e.tipo}
                          onChange={(ev) => setFEtapas((prev) => prev.map((et) => et.tempId === e.tempId ? { ...et, tipo: ev.target.value as typeof e.tipo } : et))}
                          className="bg-slate-900 border border-slate-700/50 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none shrink-0 w-24">
                          {TIPO_ETAPA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <input
                          className={`${inputClsSmall} flex-1`}
                          placeholder="Label da etapa..."
                          value={e.label}
                          onChange={(ev) => setFEtapas((prev) => prev.map((et) => et.tempId === e.tempId ? { ...et, label: ev.target.value } : et))}
                        />
                        {fLanes.length > 0 && (
                          <select
                            value={e.swTempId}
                            onChange={(ev) => setFEtapas((prev) => prev.map((et) => et.tempId === e.tempId ? { ...et, swTempId: ev.target.value } : et))}
                            className="bg-slate-900 border border-slate-700/50 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none shrink-0 max-w-[130px]">
                            <option value="">— Sem swimlane —</option>
                            {fLanes.map((l) => <option key={l.tempId} value={l.tempId}>{l.nome || `Swimlane ${fLanes.indexOf(l) + 1}`}</option>)}
                          </select>
                        )}
                        <button onClick={() => removeEtapa(e.tempId)}
                          className="p-1 hover:bg-red-900/40 text-slate-500 hover:text-red-400 rounded transition-colors shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="pl-7">
                        <input
                          className={`${inputClsSmall} w-full text-xs`}
                          placeholder="Descrição opcional..."
                          value={e.descricao}
                          onChange={(ev) => setFEtapas((prev) => prev.map((et) => et.tempId === e.tempId ? { ...et, descricao: ev.target.value } : et))}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live preview */}
                {fEtapas.length > 0 && (
                  <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3">
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-semibold">
                      Preview do Fluxo
                    </p>
                    <FlowchartSVG swimlanes={previewSwimlanes} etapas={previewEtapas} />
                  </div>
                )}
              </div>
            )}

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
              <button
                onClick={() => setModalStep((s) => Math.max(0, s - 1))}
                disabled={modalStep === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>

              <div className="flex items-center gap-3">
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm transition-colors">
                  Cancelar
                </button>
                {modalStep < STEPS.length - 1 ? (
                  <button
                    onClick={() => setModalStep((s) => s + 1)}
                    disabled={modalStep === 0 && !canNext0}
                    className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving || !fNome.trim()}
                    className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Processo'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
