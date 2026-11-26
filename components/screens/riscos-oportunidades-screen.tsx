'use client';

import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  Zap,
  Target,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  History,
  FileText,
  ThumbsUp,
  ThumbsDown,
  ClipboardCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SwotItem {
  id: string;
  quadrante: 'forca' | 'fraqueza' | 'oportunidade' | 'ameaca';
  descricao: string;
  ordem: number;
}

interface AnaliseItem {
  id: string;
  requisito: string;
  descricao: string;
  tipo: 'Risco' | 'Oportunidade' | 'Não identificado';
  consequencia: string | null;
  s_antes: number;
  p_antes: number;
  risco_antes: number;
  acao: string | null;
  s_depois: number;
  p_depois: number;
  risco_depois: number;
}

interface PlanoItem {
  id: string;
  origem: 'forca_oportunidade' | 'fraqueza_ameaca';
  item_num: number;
  descricao: string;
  acao: string | null;
  responsavel: string | null;
  prazo: string | null;
  recurso: string | null;
  custo: string | null;
  status: 'Pendente' | 'Em andamento' | 'Concluído' | 'Cancelado';
}

interface RiscoEficacia {
  id: string;
  plano_id: string;
  eficaz: boolean;
  observacao: string | null;
  data_avaliacao: string;
  avaliado_por: string | null;
  created_at: string;
}

interface RiscoRevisao {
  id: string;
  numero: number;
  descricao: string;
  participantes: string | null;
  data: string;
  tabela_afetada: string | null;
  created_by: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function riskScore(score: number): { label: string; bg: string; text: string } {
  if (score === 0) return { label: 'N/A',  bg: 'bg-slate-800',      text: 'text-slate-400'  };
  if (score <= 4)  return { label: 'Baixo', bg: 'bg-green-900/50',   text: 'text-green-300'  };
  if (score <= 9)  return { label: 'Médio', bg: 'bg-yellow-900/50',  text: 'text-yellow-300' };
  return               { label: 'Alto',  bg: 'bg-red-900/50',      text: 'text-red-300'    };
}

function tipoCls(tipo: string): string {
  if (tipo === 'Risco')        return 'bg-rose-900/50 text-rose-300 border-rose-700/40';
  if (tipo === 'Oportunidade') return 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40';
  return 'bg-slate-800 text-slate-400 border-slate-700/40';
}

function statusCls(status: string): string {
  switch (status) {
    case 'Concluído':    return 'bg-green-900/50 text-green-300 border-green-700/40';
    case 'Em andamento': return 'bg-blue-900/50 text-blue-300 border-blue-700/40';
    case 'Cancelado':    return 'bg-slate-800 text-slate-400 border-slate-700/40';
    default:             return 'bg-yellow-900/50 text-yellow-300 border-yellow-700/40';
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'Concluído')    return <CheckCircle2 className="w-3 h-3" />;
  if (status === 'Em andamento') return <RefreshCw className="w-3 h-3" />;
  if (status === 'Cancelado')    return <XCircle className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}

// ─── SWOT Config ─────────────────────────────────────────────────────────────

type Quadrante = 'forca' | 'fraqueza' | 'oportunidade' | 'ameaca';

const QUADRANTS: Array<{
  key: Quadrante;
  label: string;
  sublabel: string;
  bg: string;
  border: string;
  badge: string;
  icon: React.ElementType;
}> = [
  { key: 'forca',        label: 'Forças',        sublabel: 'Strengths',     bg: 'bg-blue-950/40',    border: 'border-blue-800/40',    badge: 'bg-blue-900/60 text-blue-300',       icon: TrendingUp  },
  { key: 'fraqueza',     label: 'Fraquezas',     sublabel: 'Weaknesses',    bg: 'bg-rose-950/40',    border: 'border-rose-800/40',    badge: 'bg-rose-900/60 text-rose-300',       icon: AlertTriangle },
  { key: 'oportunidade', label: 'Oportunidades', sublabel: 'Opportunities', bg: 'bg-emerald-950/40', border: 'border-emerald-800/40', badge: 'bg-emerald-900/60 text-emerald-300', icon: Zap         },
  { key: 'ameaca',       label: 'Ameaças',       sublabel: 'Threats',       bg: 'bg-amber-950/40',   border: 'border-amber-800/40',   badge: 'bg-amber-900/60 text-amber-300',     icon: Target      },
];

// ─── Default form values ──────────────────────────────────────────────────────

const defaultAnalise = {
  requisito: '', descricao: '', tipo: 'Risco' as const, consequencia: '',
  s_antes: 0, p_antes: 0, acao: '', s_depois: 0, p_depois: 0,
};

const defaultPlano = {
  origem: 'forca_oportunidade' as const,
  item_num: 1, descricao: '', acao: '',
  responsavel: '', prazo: '', recurso: '', custo: '', status: 'Pendente' as const,
};

const defaultRevisao = {
  descricao: '', participantes: '',
};

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputCls    = 'w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-colors';
const selectCls   = 'w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-colors';
const labelCls    = 'block text-xs font-medium text-slate-400 mb-1';
const textareaCls = 'w-full bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-colors resize-none';

// ─── Component ───────────────────────────────────────────────────────────────

type ActiveTab = 'swot' | 'analise' | 'planos' | 'eficacia' | 'revisoes';
type AnaliseForm = Partial<AnaliseItem> & { risco_antes: number; risco_depois: number };

export default function RiscosOportunidadesScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analise');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Data
  const [swotItems,    setSwotItems]    = useState<SwotItem[]>([]);
  const [analiseItems, setAnaliseItems] = useState<AnaliseItem[]>([]);
  const [planoItems,   setPlanoItems]   = useState<PlanoItem[]>([]);
  const [eficacias,    setEficacias]    = useState<RiscoEficacia[]>([]);
  const [revisoes,     setRevisoes]     = useState<RiscoRevisao[]>([]);

  // Modals
  const [swotModal, setSwotModal] = useState<{ open: boolean; item: Partial<SwotItem>; isNew: boolean }>(
    { open: false, item: {}, isNew: true }
  );
  const [analiseModal, setAnaliseModal] = useState<{ open: boolean; item: AnaliseForm; isNew: boolean }>(
    { open: false, item: { ...defaultAnalise, risco_antes: 0, risco_depois: 0 }, isNew: true }
  );
  const [planoModal, setPlanoModal] = useState<{ open: boolean; item: Partial<PlanoItem>; isNew: boolean }>(
    { open: false, item: { ...defaultPlano }, isNew: true }
  );
  const [revisaoModal, setRevisaoModal] = useState<{ open: boolean; item: Partial<RiscoRevisao>; isNew: boolean }>(
    { open: false, item: { ...defaultRevisao, data: new Date().toISOString().split('T')[0] }, isNew: true }
  );
  const [eficaciaModal, setEficaciaModal] = useState<{
    open: boolean;
    plano: PlanoItem | null;
    existing: RiscoEficacia | null;
  }>({ open: false, plano: null, existing: null });
  const [eficaciaForm, setEficaciaForm] = useState<{ eficaz: boolean; observacao: string }>({ eficaz: true, observacao: '' });

  // ── Load ─────────────────────────────────────────────────────────────────────

  async function loadAll() {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const [s, a, p, e, r] = await Promise.all([
        supabase.from('riscos_swot').select('*').order('quadrante').order('ordem'),
        supabase.from('riscos_analise').select('*').order('requisito').order('created_at'),
        supabase.from('riscos_planos').select('*').order('origem').order('item_num'),
        supabase.from('riscos_eficacia').select('*'),
        supabase.from('riscos_revisoes').select('*').order('numero', { ascending: false }),
      ]);
      if (s.error) throw s.error;
      if (a.error) throw a.error;
      if (p.error) throw p.error;
      if (e.error) throw e.error;
      if (r.error) throw r.error;
      setSwotItems(s.data as SwotItem[]);
      setAnaliseItems(a.data as AnaliseItem[]);
      setPlanoItems(p.data as PlanoItem[]);
      setEficacias(e.data as RiscoEficacia[]);
      setRevisoes(r.data as RiscoRevisao[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  // Lazy initializer runs synchronously on first render — AFTER function declaration
  useState(() => { void loadAll(); return null; });

  // ── Auto-Revision ──────────────────────────────────────────────────────────

  async function createAutoRevision(descricao: string, tabelaAfetada: string) {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('riscos_revisoes')
        .select('numero')
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNum = ((data?.numero ?? -1) as number) + 1;
      await supabase.from('riscos_revisoes').insert({
        numero: nextNum,
        descricao,
        data: new Date().toISOString().split('T')[0],
        tabela_afetada: tabelaAfetada,
      });
    } catch {
      // non-critical
    }
  }

  // ── SWOT CRUD ─────────────────────────────────────────────────────────────────

  async function saveSwot() {
    if (!supabase) return;
    const item = swotModal.item;
    if (!item.descricao?.trim() || !item.quadrante) return;
    setLoading(true);
    try {
      if (swotModal.isNew) {
        const maxOrdem = swotItems.filter(i => i.quadrante === item.quadrante).length;
        const { error: err } = await supabase.from('riscos_swot').insert({ ...item, ordem: maxOrdem });
        if (err) throw err;
        const qLabel = QUADRANTS.find(q => q.key === item.quadrante)?.label ?? item.quadrante;
        await createAutoRevision(`Inclusão de item na Matriz SWOT — ${qLabel}: ${(item.descricao ?? '').substring(0, 80)}`, 'riscos_swot');
      } else {
        const { error: err } = await supabase.from('riscos_swot').update({ descricao: item.descricao, ordem: item.ordem }).eq('id', item.id!);
        if (err) throw err;
        await createAutoRevision(`Atualização de item na Matriz SWOT: ${(item.descricao ?? '').substring(0, 80)}`, 'riscos_swot');
      }
      setSwotModal({ open: false, item: {}, isNew: true });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
      setLoading(false);
    }
  }

  async function deleteSwot(id: string, descricao: string) {
    if (!supabase) return;
    if (!window.confirm('Remover este item da Matriz SWOT?')) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.from('riscos_swot').delete().eq('id', id);
      if (err) throw err;
      await createAutoRevision(`Exclusão de item na Matriz SWOT: ${descricao.substring(0, 80)}`, 'riscos_swot');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
      setLoading(false);
    }
  }

  // ── Analise CRUD ──────────────────────────────────────────────────────────────

  async function saveAnalise() {
    if (!supabase) return;
    const item = analiseModal.item;
    if (!item.requisito?.trim() || !item.descricao?.trim()) return;
    const payload = {
      requisito:    item.requisito,
      descricao:    item.descricao,
      tipo:         item.tipo ?? 'Risco',
      consequencia: item.consequencia?.trim() || null,
      s_antes:      item.s_antes ?? 0,
      p_antes:      item.p_antes ?? 0,
      acao:         item.acao?.trim() || null,
      s_depois:     item.s_depois ?? 0,
      p_depois:     item.p_depois ?? 0,
    };
    setLoading(true);
    try {
      if (analiseModal.isNew) {
        const { error: err } = await supabase.from('riscos_analise').insert(payload);
        if (err) throw err;
        await createAutoRevision(`Inclusão de ${payload.tipo} na Análise de Riscos — ${payload.requisito}: ${payload.descricao.substring(0, 60)}`, 'riscos_analise');
      } else {
        const { error: err } = await supabase.from('riscos_analise').update(payload).eq('id', item.id!);
        if (err) throw err;
        await createAutoRevision(`Atualização de ${payload.tipo} na Análise de Riscos: ${payload.descricao.substring(0, 80)}`, 'riscos_analise');
      }
      setAnaliseModal({ open: false, item: { ...defaultAnalise, risco_antes: 0, risco_depois: 0 }, isNew: true });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
      setLoading(false);
    }
  }

  async function deleteAnalise(id: string, descricao: string) {
    if (!supabase) return;
    if (!window.confirm('Remover esta análise de risco/oportunidade?')) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.from('riscos_analise').delete().eq('id', id);
      if (err) throw err;
      await createAutoRevision(`Exclusão de item da Análise de Riscos: ${descricao.substring(0, 80)}`, 'riscos_analise');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
      setLoading(false);
    }
  }

  // ── Plano CRUD ────────────────────────────────────────────────────────────────

  async function savePlano() {
    if (!supabase) return;
    const item = planoModal.item;
    if (!item.descricao?.trim()) return;
    const payload = {
      origem:      item.origem ?? 'forca_oportunidade',
      item_num:    item.item_num ?? 1,
      descricao:   item.descricao,
      acao:        item.acao?.trim() || null,
      responsavel: item.responsavel?.trim() || null,
      prazo:       item.prazo || null,
      recurso:     item.recurso?.trim() || null,
      custo:       item.custo?.trim() || null,
      status:      item.status ?? 'Pendente',
    };
    setLoading(true);
    try {
      const origemLabel = payload.origem === 'forca_oportunidade' ? 'FO' : 'FA';
      if (planoModal.isNew) {
        const { error: err } = await supabase.from('riscos_planos').insert(payload);
        if (err) throw err;
        await createAutoRevision(`Inclusão de Plano de Ação ${origemLabel} #${payload.item_num}: ${payload.descricao.substring(0, 60)}`, 'riscos_planos');
      } else {
        const { error: err } = await supabase.from('riscos_planos').update(payload).eq('id', item.id!);
        if (err) throw err;
        await createAutoRevision(`Atualização de Plano de Ação ${origemLabel} #${payload.item_num}: ${payload.descricao.substring(0, 60)}`, 'riscos_planos');
      }
      setPlanoModal({ open: false, item: { ...defaultPlano }, isNew: true });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
      setLoading(false);
    }
  }

  async function deletePlano(id: string, origemLabel: string, itemNum: number, descricao: string) {
    if (!supabase) return;
    if (!window.confirm('Remover este plano de ação?')) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.from('riscos_planos').delete().eq('id', id);
      if (err) throw err;
      await createAutoRevision(`Exclusão de Plano de Ação ${origemLabel} #${itemNum}: ${descricao.substring(0, 60)}`, 'riscos_planos');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
      setLoading(false);
    }
  }

  // ── Eficácia CRUD ─────────────────────────────────────────────────────────────

  function openEficaciaModal(plano: PlanoItem) {
    const existing = eficacias.find(e => e.plano_id === plano.id) ?? null;
    setEficaciaForm({
      eficaz: existing ? existing.eficaz : true,
      observacao: existing?.observacao ?? '',
    });
    setEficaciaModal({ open: true, plano, existing });
  }

  async function saveEficacia() {
    if (!supabase || !eficaciaModal.plano) return;
    setLoading(true);
    try {
      const payload = {
        plano_id: eficaciaModal.plano.id,
        eficaz: eficaciaForm.eficaz,
        observacao: eficaciaForm.observacao.trim() || null,
        data_avaliacao: new Date().toISOString().split('T')[0],
      };
      if (eficaciaModal.existing) {
        const { error: err } = await supabase.from('riscos_eficacia').update(payload).eq('id', eficaciaModal.existing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('riscos_eficacia').insert(payload);
        if (err) throw err;
      }
      const origemLabel = eficaciaModal.plano.origem === 'forca_oportunidade' ? 'FO' : 'FA';
      const result = eficaciaForm.eficaz ? 'Eficaz' : 'Não eficaz';
      await createAutoRevision(
        `Avaliação de Eficácia — Plano ${origemLabel} #${eficaciaModal.plano.item_num}: ${result}`,
        'riscos_eficacia'
      );
      setEficaciaModal({ open: false, plano: null, existing: null });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar eficácia');
      setLoading(false);
    }
  }

  async function deleteEficacia(id: string, plano: PlanoItem) {
    if (!supabase) return;
    if (!window.confirm('Remover avaliação de eficácia?')) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.from('riscos_eficacia').delete().eq('id', id);
      if (err) throw err;
      const origemLabel = plano.origem === 'forca_oportunidade' ? 'FO' : 'FA';
      await createAutoRevision(
        `Exclusão de Avaliação de Eficácia — Plano ${origemLabel} #${plano.item_num}`,
        'riscos_eficacia'
      );
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
      setLoading(false);
    }
  }

  // ── Revisão CRUD ──────────────────────────────────────────────────────────────

  async function saveRevisao() {
    if (!supabase) return;
    const item = revisaoModal.item;
    if (!item.descricao?.trim() || !item.data) return;
    setLoading(true);
    try {
      const { data: maxData } = await supabase
        .from('riscos_revisoes')
        .select('numero')
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNum = ((maxData?.numero ?? -1) as number) + 1;
      const { error: err } = await supabase.from('riscos_revisoes').insert({
        numero: nextNum,
        descricao: item.descricao,
        participantes: item.participantes?.trim() || null,
        data: item.data,
      });
      if (err) throw err;
      setRevisaoModal({ open: false, item: { ...defaultRevisao, data: new Date().toISOString().split('T')[0] }, isNew: true });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar revisão');
      setLoading(false);
    }
  }

  async function deleteRevisao(id: string) {
    if (!supabase) return;
    if (!window.confirm('Remover esta entrada do histórico de revisões?')) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.from('riscos_revisoes').delete().eq('id', id);
      if (err) throw err;
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
      setLoading(false);
    }
  }

  // ── Computed stats ────────────────────────────────────────────────────────────

  const totalRiscos        = analiseItems.filter(a => a.tipo === 'Risco').length;
  const totalOportunidades = analiseItems.filter(a => a.tipo === 'Oportunidade').length;
  const altosRiscos        = analiseItems.filter(a => a.risco_antes >= 10).length;
  const riscosReduzidos    = analiseItems.filter(a => a.risco_antes > 0 && a.risco_antes > a.risco_depois).length;

  const ultimaRevisao = revisoes.length > 0 ? revisoes[0] : null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center shadow-lg shadow-rose-900/30 shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Riscos e Oportunidades</h1>
              <p className="text-xs text-slate-400">Matriz SWOT · Análise de Riscos · Planos de Ação · Revisões</p>
            </div>
          </div>
          {ultimaRevisao && (
            <div className="text-right hidden md:block">
              <p className="text-[11px] text-slate-500">Última revisão</p>
              <p className="text-xs font-medium text-slate-300">Rev. {ultimaRevisao.numero} — {fmtDate(ultimaRevisao.data)}</p>
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Riscos',        value: totalRiscos,        sub: 'identificados',  colorTxt: 'text-rose-400',    colorBg: 'bg-rose-900/20'    },
          { label: 'Oportunidades', value: totalOportunidades, sub: 'identificadas',  colorTxt: 'text-emerald-400', colorBg: 'bg-emerald-900/20' },
          { label: 'Riscos Altos',  value: altosRiscos,        sub: 'score ≥ 10',     colorTxt: 'text-red-400',     colorBg: 'bg-red-900/20'     },
          { label: 'Reduzidos',     value: riscosReduzidos,    sub: 'após controle',  colorTxt: 'text-blue-400',    colorBg: 'bg-blue-900/20'    },
        ].map(k => (
          <div key={k.label} className={`${k.colorBg} border border-slate-800/60 rounded-xl p-4`}>
            <p className="text-xs text-slate-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.colorTxt}`}>{k.value}</p>
            <p className="text-[11px] text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-900/60 rounded-xl p-1 w-fit flex-wrap">
        {([
          { key: 'swot'    as const, label: 'Matriz SWOT'            },
          { key: 'analise' as const, label: 'Riscos & Oportunidades' },
          { key: 'planos'   as const, label: 'Planos de Ação'          },
          { key: 'eficacia' as const, label: 'Eficácia'              },
          { key: 'revisoes' as const, label: 'Revisões'              },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.key === 'revisoes' && <History className="w-3.5 h-3.5" />}
            {tab.label}
            {tab.key === 'eficacia' && (() => {
              const concluidos = planoItems.filter(p => p.status === 'Concluído').length;
              const avaliados  = eficacias.length;
              if (concluidos === 0) return null;
              const all = avaliados >= concluidos;
              return (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === 'eficacia'
                    ? (all ? 'bg-green-800 text-green-200' : 'bg-rose-800 text-rose-200')
                    : (all ? 'bg-green-900 text-green-400' : 'bg-slate-700 text-slate-400')
                }`}>{avaliados}/{concluidos}</span>
              );
            })()}
            {tab.key === 'revisoes' && revisoes.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === 'revisoes' ? 'bg-rose-800 text-rose-200' : 'bg-slate-700 text-slate-400'
              }`}>{revisoes.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-0.5 hover:bg-red-800/40 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Carregando...
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          Tab: Matriz SWOT
      ══════════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'swot' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUADRANTS.map(q => {
            const QIcon = q.icon;
            const items = swotItems.filter(i => i.quadrante === q.key);
            return (
              <div key={q.key} className={`${q.bg} ${q.border} border rounded-xl p-4`}>
                {/* Quadrant header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${q.badge}`}>
                      <QIcon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{q.label}</p>
                      <p className="text-[11px] text-slate-500">{q.sublabel}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSwotModal({ open: true, item: { quadrante: q.key, ordem: items.length }, isNew: true })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${q.badge} border border-white/10 hover:opacity-80 transition-opacity`}
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar
                  </button>
                </div>

                {/* Items */}
                <div className="space-y-1.5 min-h-[60px]">
                  {items.length === 0 && (
                    <p className="text-xs text-slate-500 italic py-3 text-center">Nenhum item registrado</p>
                  )}
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-2 group bg-slate-900/50 hover:bg-slate-900/70 rounded-lg px-3 py-2 transition-colors">
                      <span className="text-[11px] text-slate-500 mt-0.5 w-4 shrink-0 font-mono">{idx + 1}.</span>
                      <span className="text-xs text-slate-300 flex-1 leading-relaxed">{item.descricao}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => setSwotModal({ open: true, item: { ...item }, isNew: false })}
                          className="p-1 hover:bg-slate-700 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400" />
                        </button>
                        <button
                          onClick={() => deleteSwot(item.id, item.descricao)}
                          className="p-1 hover:bg-rose-900/40 rounded"
                          title="Remover"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          Tab: Riscos & Oportunidades
      ══════════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'analise' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setAnaliseModal({ open: true, item: { ...defaultAnalise, risco_antes: 0, risco_depois: 0 }, isNew: true })}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-rose-900/30"
            >
              <Plus className="w-4 h-4" />
              Nova Análise
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-slate-900/80">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Requisito</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Descrição / Consequência</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Tipo</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">S×P</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Antes</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Ação de Controle</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Depois</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-20">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {analiseItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-sm text-slate-500">
                        Nenhuma análise registrada
                      </td>
                    </tr>
                  )}
                  {analiseItems.map(item => {
                    const antes  = riskScore(item.risco_antes);
                    const depois = riskScore(item.risco_depois);
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-4 py-3 align-top">
                          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{item.requisito}</span>
                        </td>
                        <td className="px-4 py-3 align-top max-w-xs">
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{item.descricao}</p>
                          {item.consequencia && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">↳ {item.consequencia}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${tipoCls(item.tipo)}`}>
                            {item.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center align-top">
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {item.s_antes > 0 ? `${item.s_antes}×${item.p_antes}` : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center align-top">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${antes.bg} ${antes.text}`}>
                            {item.risco_antes > 0 ? item.risco_antes : '—'}
                            {item.risco_antes > 0 && <span className="text-[10px] opacity-70">{antes.label}</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top max-w-[200px]">
                          <p className="text-xs text-slate-400 line-clamp-2">{item.acao || '—'}</p>
                        </td>
                        <td className="px-3 py-3 text-center align-top">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${depois.bg} ${depois.text}`}>
                            {item.risco_depois > 0 ? item.risco_depois : '—'}
                            {item.risco_depois > 0 && <span className="text-[10px] opacity-70">{depois.label}</span>}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setAnaliseModal({ open: true, item: { ...item }, isNew: false })}
                              className="p-1.5 hover:bg-slate-700 rounded-lg"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                            <button
                              onClick={() => deleteAnalise(item.id, item.descricao)}
                              className="p-1.5 hover:bg-rose-900/40 rounded-lg"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          Tab: Planos de Ação
      ══════════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'planos' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setPlanoModal({ open: true, item: { ...defaultPlano }, isNew: true })}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-rose-900/30"
            >
              <Plus className="w-4 h-4" />
              Novo Plano
            </button>
          </div>

          {/* Two sections: FO and FA */}
          {([
            { key: 'forca_oportunidade' as const, label: 'Força + Oportunidade (FO)', bg: 'bg-emerald-950/40', border: 'border-emerald-800/40', textCl: 'text-emerald-300' },
            { key: 'fraqueza_ameaca'    as const, label: 'Fraqueza + Ameaça (FA)',    bg: 'bg-amber-950/40',   border: 'border-amber-800/40',   textCl: 'text-amber-300'   },
          ]).map(sec => {
            const items = planoItems.filter(p => p.origem === sec.key);
            const origemLabel = sec.key === 'forca_oportunidade' ? 'FO' : 'FA';
            return (
              <div key={sec.key} className={`mb-5 ${sec.bg} ${sec.border} border rounded-xl overflow-hidden`}>
                <div className="px-4 py-3 border-b border-slate-800/40 flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${sec.textCl}`}>{sec.label}</h3>
                  <span className="text-xs text-slate-500">{items.length} plano{items.length !== 1 ? 's' : ''}</span>
                </div>

                {items.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 italic">Nenhum plano registrado para esta estratégia</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800/40 bg-slate-900/40">
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400 w-8">#</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400">Descrição</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400">Ação</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400 whitespace-nowrap">Responsável</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400 whitespace-nowrap">Prazo</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400">Recurso</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400">Custo</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-400">Status</th>
                          <th className="w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {items.map(item => (
                          <tr key={item.id} className="hover:bg-slate-800/20 transition-colors group">
                            <td className="px-3 py-2.5 text-slate-500 font-mono">{item.item_num}</td>
                            <td className="px-3 py-2.5 text-slate-300 max-w-[180px]">
                              <span className="line-clamp-2">{item.descricao}</span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-400 max-w-[160px]">
                              <span className="line-clamp-2">{item.acao || '—'}</span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{item.responsavel || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{fmtDate(item.prazo)}</td>
                            <td className="px-3 py-2.5 text-slate-400">{item.recurso || '—'}</td>
                            <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{item.custo || '—'}</td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusCls(item.status)}`}>
                                <StatusIcon status={item.status} />
                                {item.status}
                              </span>
                            </td>
                            <td className="px-2 py-2.5">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setPlanoModal({ open: true, item: { ...item }, isNew: false })}
                                  className="p-1 hover:bg-slate-700 rounded"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3 h-3 text-slate-400" />
                                </button>
                                <button
                                  onClick={() => deletePlano(item.id, origemLabel, item.item_num, item.descricao)}
                                  className="p-1 hover:bg-rose-900/40 rounded"
                                  title="Remover"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          Tab: Eficácia
      ══════════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'eficacia' && (() => {
        const concluidos = planoItems.filter(p => p.status === 'Concluído');
        const naoAvaliados = concluidos.filter(p => !eficacias.find(e => e.plano_id === p.id));
        const eficazCount  = eficacias.filter(e => e.eficaz).length;
        const naoEficazCount = eficacias.filter(e => !e.eficaz).length;

        return (
          <div>
            {/* KPI row */}
            {concluidos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-200">{concluidos.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Planos concluídos</p>
                </div>
                <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{eficazCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Eficaz</p>
                </div>
                <div className="bg-rose-900/20 border border-rose-800/40 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-rose-400">{naoEficazCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Não eficaz</p>
                </div>
              </div>
            )}

            {/* Pending evaluation banner */}
            {naoAvaliados.length > 0 && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-yellow-900/20 border border-yellow-700/40 rounded-xl text-xs text-yellow-300">
                <ClipboardCheck className="w-4 h-4 shrink-0" />
                <span><strong>{naoAvaliados.length}</strong> plano{naoAvaliados.length > 1 ? 's' : ''} concluído{naoAvaliados.length > 1 ? 's' : ''} aguardando avaliação de eficácia.</span>
              </div>
            )}

            {concluidos.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl py-14 text-center">
                <ClipboardCheck className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Nenhum plano de ação concluído ainda.</p>
                <p className="text-xs text-slate-600 mt-1">A avaliação de eficácia estará disponível quando planos forem marcados como "Concluído".</p>
              </div>
            ) : (
              <div className="space-y-3">
                {([
                  { key: 'forca_oportunidade' as const, label: 'Força + Oportunidade (FO)' },
                  { key: 'fraqueza_ameaca'    as const, label: 'Fraqueza + Ameaça (FA)'    },
                ]).map(sec => {
                  const items = concluidos.filter(p => p.origem === sec.key);
                  if (items.length === 0) return null;
                  const origemLabel = sec.key === 'forca_oportunidade' ? 'FO' : 'FA';

                  return (
                    <div key={sec.key} className="bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-800/40">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{sec.label}</h3>
                      </div>
                      <div className="divide-y divide-slate-800/40">
                        {items.map(plano => {
                          const aval = eficacias.find(e => e.plano_id === plano.id);
                          return (
                            <div key={plano.id} className="px-4 py-3 flex items-start gap-4 group hover:bg-slate-800/20 transition-colors">
                              {/* Número */}
                              <span className="text-xs text-slate-500 font-mono mt-0.5 w-6 shrink-0">{origemLabel}{plano.item_num}</span>

                              {/* Descrição */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-300 leading-snug">{plano.descricao}</p>
                                {aval && aval.observacao && (
                                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    <span className="text-slate-600">↳</span> {aval.observacao}
                                  </p>
                                )}
                                {aval && (
                                  <p className="text-[11px] text-slate-600 mt-0.5">Avaliado em {fmtDate(aval.data_avaliacao)}</p>
                                )}
                              </div>

                              {/* Badge eficácia */}
                              <div className="shrink-0 flex items-center gap-2">
                                {aval ? (
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                    aval.eficaz
                                      ? 'bg-green-900/40 text-green-300 border-green-700/40'
                                      : 'bg-rose-900/40 text-rose-300 border-rose-700/40'
                                  }`}>
                                    {aval.eficaz
                                      ? <><ThumbsUp className="w-3 h-3" /> Eficaz</>
                                      : <><ThumbsDown className="w-3 h-3" /> Não eficaz</>
                                    }
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/30">
                                    <Clock className="w-3 h-3" />
                                    Pendente
                                  </span>
                                )}

                                {/* Actions */}
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => openEficaciaModal(plano)}
                                    className="p-1.5 hover:bg-slate-700 rounded-lg"
                                    title={aval ? 'Editar avaliação' : 'Avaliar eficácia'}
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                  </button>
                                  {aval && (
                                    <button
                                      onClick={() => deleteEficacia(aval.id, plano)}
                                      className="p-1.5 hover:bg-rose-900/40 rounded-lg"
                                      title="Remover avaliação"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════════
          Tab: Revisões
      ══════════════════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'revisoes' && (
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-400">
                Histórico de revisões do documento — gerado automaticamente a cada alteração.
              </p>
            </div>
            <button
              onClick={() => setRevisaoModal({ open: true, item: { ...defaultRevisao, data: new Date().toISOString().split('T')[0] }, isNew: true })}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-rose-900/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nova Revisão
            </button>
          </div>

          {/* Revision table */}
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-slate-900/80">
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">Rev.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Descrição da Alteração</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Participantes / Responsável</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Data</th>
                    <th className="text-center px-3 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {revisoes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                        Nenhuma revisão registrada ainda
                      </td>
                    </tr>
                  )}
                  {revisoes.map(rev => (
                    <tr key={rev.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-900/40 border border-rose-700/40 text-rose-300 text-sm font-bold">
                          {rev.numero}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top max-w-xs">
                        <div className="flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                          <p className="text-sm text-slate-300 leading-relaxed">{rev.descricao}</p>
                        </div>
                        {rev.tabela_afetada && rev.tabela_afetada !== 'auto' && (
                          <p className="text-[11px] text-slate-600 mt-0.5 ml-5">↳ {rev.tabela_afetada}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-xs text-slate-400">{rev.participantes || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        <span className="text-xs text-slate-400 font-mono whitespace-nowrap">{fmtDate(rev.data)}</span>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => deleteRevisao(rev.id)}
                            className="p-1.5 hover:bg-rose-900/40 rounded-lg"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          Modal: SWOT Item
      ══════════════════════════════════════════════════════════════════════════ */}
      {swotModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white">
                {swotModal.isNew ? 'Adicionar Item SWOT' : 'Editar Item SWOT'}
              </h2>
              <button onClick={() => setSwotModal({ open: false, item: {}, isNew: true })} className="p-1.5 hover:bg-slate-800 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Quadrante</label>
                <select
                  className={selectCls}
                  value={swotModal.item.quadrante ?? 'forca'}
                  onChange={e => setSwotModal(m => ({ ...m, item: { ...m.item, quadrante: e.target.value as Quadrante } }))}
                  disabled={!swotModal.isNew}
                >
                  {QUADRANTS.map(q => <option key={q.key} value={q.key}>{q.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Descrição *</label>
                <textarea
                  className={textareaCls}
                  rows={4}
                  placeholder="Descreva o item..."
                  value={swotModal.item.descricao ?? ''}
                  onChange={e => setSwotModal(m => ({ ...m, item: { ...m.item, descricao: e.target.value } }))}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end p-5 pt-0">
              <button
                onClick={() => setSwotModal({ open: false, item: {}, isNew: true })}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveSwot}
                disabled={!swotModal.item.descricao?.trim() || loading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          Modal: Análise
      ══════════════════════════════════════════════════════════════════════════ */}
      {analiseModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h2 className="text-base font-semibold text-white">
                {analiseModal.isNew ? 'Nova Análise de Risco/Oportunidade' : 'Editar Análise'}
              </h2>
              <button
                onClick={() => setAnaliseModal({ open: false, item: { ...defaultAnalise, risco_antes: 0, risco_depois: 0 }, isNew: true })}
                className="p-1.5 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Row 1: Requisito + Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Requisito *</label>
                  <input
                    className={inputCls}
                    placeholder="ex: CONTEXTO (4.1) SWOT"
                    value={analiseModal.item.requisito ?? ''}
                    onChange={e => setAnaliseModal(m => ({ ...m, item: { ...m.item, requisito: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tipo *</label>
                  <select
                    className={selectCls}
                    value={analiseModal.item.tipo ?? 'Risco'}
                    onChange={e => setAnaliseModal(m => ({ ...m, item: { ...m.item, tipo: e.target.value as AnaliseItem['tipo'] } }))}
                  >
                    <option>Risco</option>
                    <option>Oportunidade</option>
                    <option>Não identificado</option>
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className={labelCls}>Descrição *</label>
                <textarea
                  className={textareaCls}
                  rows={2}
                  placeholder="Descrição do risco ou oportunidade..."
                  value={analiseModal.item.descricao ?? ''}
                  onChange={e => setAnaliseModal(m => ({ ...m, item: { ...m.item, descricao: e.target.value } }))}
                />
              </div>

              {/* Consequência */}
              <div>
                <label className={labelCls}>Consequência</label>
                <input
                  className={inputCls}
                  placeholder="Possível consequência ou impacto..."
                  value={analiseModal.item.consequencia ?? ''}
                  onChange={e => setAnaliseModal(m => ({ ...m, item: { ...m.item, consequencia: e.target.value } }))}
                />
              </div>

              {/* Avaliação ANTES */}
              <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
                <p className="text-xs font-semibold text-slate-300 mb-3">Avaliação ANTES do Controle</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Severidade (S)</label>
                    <select
                      className={selectCls}
                      value={analiseModal.item.s_antes ?? 0}
                      onChange={e => {
                        const s = +e.target.value;
                        setAnaliseModal(m => ({ ...m, item: { ...m.item, s_antes: s, risco_antes: s * (m.item.p_antes ?? 0) } }));
                      }}
                    >
                      <option value={0}>0 — N/A</option>
                      <option value={1}>1 — Insignificante</option>
                      <option value={2}>2 — Marginal</option>
                      <option value={3}>3 — Crítico</option>
                      <option value={4}>4 — Catastrófico</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Probabilidade (P)</label>
                    <select
                      className={selectCls}
                      value={analiseModal.item.p_antes ?? 0}
                      onChange={e => {
                        const p = +e.target.value;
                        setAnaliseModal(m => ({ ...m, item: { ...m.item, p_antes: p, risco_antes: (m.item.s_antes ?? 0) * p } }));
                      }}
                    >
                      <option value={0}>0 — N/A</option>
                      <option value={1}>1 — Improvável</option>
                      <option value={2}>2 — Possível</option>
                      <option value={3}>3 — Provável</option>
                      <option value={4}>4 — Frequente</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Score (S×P)</label>
                    {(() => {
                      const sc = (analiseModal.item.s_antes ?? 0) * (analiseModal.item.p_antes ?? 0);
                      const { label, bg, text } = riskScore(sc);
                      return (
                        <div className={`${bg} ${text} rounded-lg px-3 py-2 text-center font-bold text-xl border border-white/5`}>
                          {sc}
                          <span className="text-xs font-normal ml-1.5 opacity-80">{label}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Ação de Controle */}
              <div>
                <label className={labelCls}>Ação de Controle</label>
                <textarea
                  className={textareaCls}
                  rows={2}
                  placeholder="Ação implementada para mitigar o risco ou potencializar a oportunidade..."
                  value={analiseModal.item.acao ?? ''}
                  onChange={e => setAnaliseModal(m => ({ ...m, item: { ...m.item, acao: e.target.value } }))}
                />
              </div>

              {/* Avaliação DEPOIS */}
              <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
                <p className="text-xs font-semibold text-slate-300 mb-3">Avaliação APÓS o Controle</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Severidade (S)</label>
                    <select
                      className={selectCls}
                      value={analiseModal.item.s_depois ?? 0}
                      onChange={e => {
                        const s = +e.target.value;
                        setAnaliseModal(m => ({ ...m, item: { ...m.item, s_depois: s, risco_depois: s * (m.item.p_depois ?? 0) } }));
                      }}
                    >
                      <option value={0}>0 — N/A</option>
                      <option value={1}>1 — Insignificante</option>
                      <option value={2}>2 — Marginal</option>
                      <option value={3}>3 — Crítico</option>
                      <option value={4}>4 — Catastrófico</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Probabilidade (P)</label>
                    <select
                      className={selectCls}
                      value={analiseModal.item.p_depois ?? 0}
                      onChange={e => {
                        const p = +e.target.value;
                        setAnaliseModal(m => ({ ...m, item: { ...m.item, p_depois: p, risco_depois: (m.item.s_depois ?? 0) * p } }));
                      }}
                    >
                      <option value={0}>0 — N/A</option>
                      <option value={1}>1 — Improvável</option>
                      <option value={2}>2 — Possível</option>
                      <option value={3}>3 — Provável</option>
                      <option value={4}>4 — Frequente</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Score (S×P)</label>
                    {(() => {
                      const sc = (analiseModal.item.s_depois ?? 0) * (analiseModal.item.p_depois ?? 0);
                      const { label, bg, text } = riskScore(sc);
                      return (
                        <div className={`${bg} ${text} rounded-lg px-3 py-2 text-center font-bold text-xl border border-white/5`}>
                          {sc}
                          <span className="text-xs font-normal ml-1.5 opacity-80">{label}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end p-5 pt-0">
              <button
                onClick={() => setAnaliseModal({ open: false, item: { ...defaultAnalise, risco_antes: 0, risco_depois: 0 }, isNew: true })}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveAnalise}
                disabled={!analiseModal.item.requisito?.trim() || !analiseModal.item.descricao?.trim() || loading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          Modal: Plano de Ação
      ══════════════════════════════════════════════════════════════════════════ */}
      {planoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h2 className="text-base font-semibold text-white">
                {planoModal.isNew ? 'Novo Plano de Ação' : 'Editar Plano de Ação'}
              </h2>
              <button onClick={() => setPlanoModal({ open: false, item: { ...defaultPlano }, isNew: true })} className="p-1.5 hover:bg-slate-800 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Estratégia</label>
                  <select
                    className={selectCls}
                    value={planoModal.item.origem ?? 'forca_oportunidade'}
                    onChange={e => setPlanoModal(m => ({ ...m, item: { ...m.item, origem: e.target.value as PlanoItem['origem'] } }))}
                  >
                    <option value="forca_oportunidade">Força + Oportunidade (FO)</option>
                    <option value="fraqueza_ameaca">Fraqueza + Ameaça (FA)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Nº do Item</label>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={planoModal.item.item_num ?? 1}
                    onChange={e => setPlanoModal(m => ({ ...m, item: { ...m.item, item_num: +e.target.value } }))}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Descrição *</label>
                <textarea
                  className={textareaCls}
                  rows={2}
                  placeholder="Descreva o plano de ação..."
                  value={planoModal.item.descricao ?? ''}
                  onChange={e => setPlanoModal(m => ({ ...m, item: { ...m.item, descricao: e.target.value } }))}
                />
              </div>

              <div>
                <label className={labelCls}>Ação</label>
                <textarea
                  className={textareaCls}
                  rows={2}
                  placeholder="Ação a ser executada..."
                  value={planoModal.item.acao ?? ''}
                  onChange={e => setPlanoModal(m => ({ ...m, item: { ...m.item, acao: e.target.value } }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Responsável</label>
                  <input
                    className={inputCls}
                    placeholder="Nome ou cargo..."
                    value={planoModal.item.responsavel ?? ''}
                    onChange={e => setPlanoModal(m => ({ ...m, item: { ...m.item, responsavel: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Prazo</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={planoModal.item.prazo ?? ''}
                    onChange={e => setPlanoModal(m => ({ ...m, item: { ...m.item, prazo: e.target.value } }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Recurso</label>
                  <input
                    className={inputCls}
                    placeholder="Recurso necessário..."
                    value={planoModal.item.recurso ?? ''}
                    onChange={e => setPlanoModal(m => ({ ...m, item: { ...m.item, recurso: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Custo Estimado</label>
                  <input
                    className={inputCls}
                    placeholder="R$ 0,00"
                    value={planoModal.item.custo ?? ''}
                    onChange={e => setPlanoModal(m => ({ ...m, item: { ...m.item, custo: e.target.value } }))}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Status</label>
                <select
                  className={selectCls}
                  value={planoModal.item.status ?? 'Pendente'}
                  onChange={e => setPlanoModal(m => ({ ...m, item: { ...m.item, status: e.target.value as PlanoItem['status'] } }))}
                >
                  <option>Pendente</option>
                  <option>Em andamento</option>
                  <option>Concluído</option>
                  <option>Cancelado</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end p-5 pt-0">
              <button
                onClick={() => setPlanoModal({ open: false, item: { ...defaultPlano }, isNew: true })}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={savePlano}
                disabled={!planoModal.item.descricao?.trim() || loading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          Modal: Avaliação de Eficácia
      ══════════════════════════════════════════════════════════════════════════ */}
      {eficaciaModal.open && eficaciaModal.plano && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-teal-400" />
                {eficaciaModal.existing ? 'Editar Avaliação de Eficácia' : 'Avaliar Eficácia'}
              </h2>
              <button
                onClick={() => setEficaciaModal({ open: false, plano: null, existing: null })}
                className="p-1.5 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Plano info */}
            <div className="mx-5 mt-4 px-3 py-2.5 bg-slate-800/60 border border-slate-700/40 rounded-xl">
              <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold mb-0.5">
                {eficaciaModal.plano.origem === 'forca_oportunidade' ? 'Força + Oportunidade' : 'Fraqueza + Ameaça'} · #{eficaciaModal.plano.item_num}
              </p>
              <p className="text-sm text-slate-300 leading-snug">{eficaciaModal.plano.descricao}</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Eficaz toggle */}
              <div>
                <label className={labelCls}>O plano foi eficaz? *</label>
                <div className="flex gap-3 mt-1">
                  <button
                    onClick={() => setEficaciaForm(f => ({ ...f, eficaz: true }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                      eficaciaForm.eficaz
                        ? 'bg-green-900/60 border-green-600 text-green-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" /> Sim, foi eficaz
                  </button>
                  <button
                    onClick={() => setEficaciaForm(f => ({ ...f, eficaz: false }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                      !eficaciaForm.eficaz
                        ? 'bg-rose-900/60 border-rose-600 text-rose-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" /> Não foi eficaz
                  </button>
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className={labelCls}>Observação da Eficácia</label>
                <textarea
                  className={textareaCls}
                  rows={3}
                  placeholder={eficaciaForm.eficaz
                    ? 'ex: Foi atendido pois as ações de controle reduziram o risco, foram implementados novos procedimentos...'
                    : 'ex: Não foi eficaz pois o problema persiste, as ações não foram suficientes para...'
                  }
                  value={eficaciaForm.observacao}
                  onChange={e => setEficaciaForm(f => ({ ...f, observacao: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end p-5 pt-0">
              <button
                onClick={() => setEficaciaModal({ open: false, plano: null, existing: null })}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEficacia}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white transition-colors"
              >
                {eficaciaModal.existing ? 'Atualizar Avaliação' : 'Registrar Avaliação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          Modal: Nova Revisão
      ══════════════════════════════════════════════════════════════════════════ */}
      {revisaoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-rose-400" />
                Nova Revisão Manual
              </h2>
              <button
                onClick={() => setRevisaoModal({ open: false, item: { ...defaultRevisao, data: new Date().toISOString().split('T')[0] }, isNew: true })}
                className="p-1.5 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Descrição da Alteração *</label>
                <textarea
                  className={textareaCls}
                  rows={3}
                  placeholder="ex: Revisão para inclusão de novos itens de risco identificados na auditoria..."
                  value={revisaoModal.item.descricao ?? ''}
                  onChange={e => setRevisaoModal(m => ({ ...m, item: { ...m.item, descricao: e.target.value } }))}
                />
              </div>
              <div>
                <label className={labelCls}>Participantes / Responsável</label>
                <input
                  className={inputCls}
                  placeholder="Nome, Cargo... (separados por vírgula)"
                  value={revisaoModal.item.participantes ?? ''}
                  onChange={e => setRevisaoModal(m => ({ ...m, item: { ...m.item, participantes: e.target.value } }))}
                />
              </div>
              <div>
                <label className={labelCls}>Data *</label>
                <input
                  type="date"
                  className={inputCls}
                  value={revisaoModal.item.data ?? ''}
                  onChange={e => setRevisaoModal(m => ({ ...m, item: { ...m.item, data: e.target.value } }))}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end p-5 pt-0">
              <button
                onClick={() => setRevisaoModal({ open: false, item: { ...defaultRevisao, data: new Date().toISOString().split('T')[0] }, isNew: true })}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveRevisao}
                disabled={!revisaoModal.item.descricao?.trim() || !revisaoModal.item.data || loading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition-colors"
              >
                Registrar Revisão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
