'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, Loader2, X, ChevronRight, ChevronLeft, Check,
  RefreshCw, Pencil, Trash2, AlertCircle, Building2,
  Calendar, Hash, FileText, DollarSign, User, Users,
  ClipboardList, FileCheck, CheckCircle2, XCircle,
  ArrowRight, Shield, Wrench, AlertTriangle, Eye,
} from 'lucide-react';

// ─── Shared input styles ────────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-transparent';
const inputClsSmall =
  'w-full px-2 py-1.5 text-xs border border-slate-700 rounded-md bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-transparent';
const labelCls =
  'block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider';
const selectCls =
  'w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-transparent';
const textareaCls =
  'w-full px-3 py-2 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-transparent resize-none';

// ─── Types ───────────────────────────────────────────────────────────────────
type Carater = 'PERMANENTE' | 'TEMPORARIO';
type StatusMudanca =
  | 'ABERTO'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'EM_IMPLANTACAO'
  | 'CONCLUIDO'
  | 'CANCELADO';

interface Responsavel {
  id?: string;
  nome: string;
  funcao: string;
}

interface GimResposta {
  [key: string]: 'SIM' | 'NAO' | null;
}

interface FamItem {
  id?: string;
  item_numero: string;
  topico: string;
  responsavel?: string;
  acao?: string;
  prazo?: string;
  status_item?: string;
  condicao_impeditiva?: string;
  is_predefined?: boolean;
  sort_order?: number;
}

interface Participante {
  id?: string;
  referencia?: number;
  nome: string;
  matricula?: string;
  funcao?: string;
  data_avaliacao_inicial?: string;
  data_mudanca_aprovada?: string;
  data_vistoria_encerramento?: string;
}

interface PlanoAcaoItem {
  id?: string;
  descricao: string;
  responsavel?: string;
  data_inicio?: string;
  data_conclusao?: string;
  custos?: number;
  conclusao?: string;
  observacao?: string;
  sort_order?: number;
}

interface GestaoMudanca {
  id: string;
  numero?: string;
  instalacao?: string;
  data_emissao?: string;
  carater: Carater;
  data_limite?: string;
  razao?: string;
  local_sistema?: string;
  escopo_detalhado?: string;
  cenario_atual?: string;
  cenario_previsto?: string;
  custo_mao_obra?: number;
  custo_equipamentos?: number;
  custo_servicos?: number;
  custo_diversos?: number;
  custo_diversos_detalhes?: string;
  status: StatusMudanca;
  gim_respostas?: GimResposta;
  autorizacao_data?: string;
  autorizacao_nome?: string;
  resultados_obtidos?: string;
  declaracao_nome?: string;
  declaracao_data?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── GIM questions ───────────────────────────────────────────────────────────
const GIM_QUESTIONS = [
  { key: 'q1', text: 'Mudança no padrão de operação / funcionamento da empresa e/ou equipamentos?' },
  { key: 'q2', text: 'Mudança na rotina de manutenção de equipamentos / inspeção e testes?' },
  { key: 'q3', text: 'Mudança na Matéria Prima? Metodologia analítica? Na sistemática de análise? Utilização de novos reagentes?' },
  { key: 'q4', text: 'Nos parâmetros operacionais de processos / equipamentos, por exemplo, temperatura, pressão, vazão, velocidade?' },
  { key: 'q5', text: 'Aspectos e Impactos a novos riscos associados no processo / tarefa / produtos?' },
  { key: 'q6', text: 'Em equipamentos instalados ou componentes, no modelo de equipamento, dimensões ou fornecedores? No layout ou localização de equipamentos? Diâmetro? Espessura?' },
  { key: 'q7', text: 'Mudanças nos procedimentos operacionais?' },
  { key: 'q8', text: 'Instalação de novo equipamento / software?' },
  { key: 'q9', text: 'Mudanças nas características originais do local designado para execução do serviço?' },
  { key: 'q10', text: 'Mudança no sistema de gestão da qualidade?' },
  { key: 'q11', text: 'Nas condições ambientais do local de trabalho, por exemplo, nível de iluminamento, nível de ruído, ventilação, temperatura, umidade, particulados, gases, condições ergonômicas?' },
  { key: 'q12', text: 'Nos equipamentos de combate a incêndio (por exemplo, no número de extintores de incêndio disponíveis, na localização e acesso)?' },
  { key: 'q13', text: 'Mudanças na sinalização?' },
  { key: 'q14', text: 'Nas saídas de emergência, rotas de fuga e pontos de encontro?' },
  { key: 'q15', text: 'No ponto / localização de acionamento de alarmes de emergência?' },
  { key: 'q16', text: 'Em áreas demarcadas e sinalizadas para circulação de pedestres?' },
  { key: 'q17', text: 'Em áreas demarcadas e sinalizadas para circulação de veículos?' },
  { key: 'q18', text: 'Em áreas demarcadas e sinalizadas para armazenamento e movimentação de materiais, tubos, tambores e bombonas com produtos químicos? Capacidade de armazenamento?' },
  { key: 'q19', text: 'Mudanças nas condições de execução em relação as condições previstas no procedimento da atividade?' },
  { key: 'q20', text: 'Em softwares instalados?' },
  { key: 'q21', text: 'Na estrutura básica de construções / prédios? Ampliações e / ou demolições?' },
  { key: 'q22', text: 'A mudança pode introduzir sujidades, resíduos de produtos ou outras contaminações no processo?' },
  { key: 'q23', text: 'Pode alterar características do produto final?' },
  { key: 'q24', text: 'Significativa no número de empregados envolvidos na realização das tarefas normais, de manutenção, inspeção, controle de emergências etc. e que acarretem riscos ou impactos as operações?' },
  { key: 'q25', text: 'Alteração no número de postos de trabalho?' },
  { key: 'q26', text: 'Outros?' },
];

// ─── FAM predefined topics ───────────────────────────────────────────────────
const FAM_PREDEFINED: FamItem[] = [
  { item_numero: '1', topico: 'No planejamento para executar a mudança, foi considerado:', is_predefined: true, sort_order: 1 },
  { item_numero: '1.1', topico: 'Modificações nas condições operacionais, condições do local do equipamento, do local de trabalho, alteração na rotina da equipe.', is_predefined: true, sort_order: 2 },
  { item_numero: '1.2', topico: 'Procedimento de segurança abrangendo: bloqueio, isolamento (raquete), desenergização, neutralização, limpeza, purga de equipamentos, descontaminação, trabalho em espaços confinados, etc.', is_predefined: true, sort_order: 3 },
  { item_numero: '1.3', topico: 'Disposição dos resíduos/entulhos liberados durante a execução da mudança, considerar riscos de impacto do Meio Ambiente.', is_predefined: true, sort_order: 4 },
  { item_numero: '1.4', topico: 'Influência da mudança em procedimento.', is_predefined: true, sort_order: 5 },
  { item_numero: '1.5', topico: 'Interferência da mudança nas alterações das variáveis de processo.', is_predefined: true, sort_order: 6 },
  { item_numero: '1.6', topico: 'Interferência da mudança nas condições de descarte de produtos ou resíduos.', is_predefined: true, sort_order: 7 },
  { item_numero: '1.7', topico: 'Preparação do local que será realizada a mudança.', is_predefined: true, sort_order: 8 },
  { item_numero: '1.8', topico: 'Interferência com outras gerências, outros setores, outras atividades.', is_predefined: true, sort_order: 9 },
  { item_numero: '1.9', topico: 'Local para armazenamento de equipamentos, peças que serão utilizados para a execução da mudança.', is_predefined: true, sort_order: 10 },
  { item_numero: '1.10', topico: 'Interrupção de atividades de rotina durante a execução da mudança.', is_predefined: true, sort_order: 11 },
  { item_numero: '2', topico: 'Quanto aos riscos / impactos identificados:', is_predefined: true, sort_order: 12 },
  { item_numero: '2.1', topico: 'Foram identificados novos riscos à segurança, saúde ou meio ambiente?', is_predefined: true, sort_order: 13 },
  { item_numero: '2.2', topico: 'As medidas de controle existentes são adequadas para os novos riscos?', is_predefined: true, sort_order: 14 },
  { item_numero: '2.3', topico: 'É necessário elaborar ou revisar APR / HAZOP / Plano de Ação?', is_predefined: true, sort_order: 15 },
  { item_numero: '3', topico: 'Quanto à comunicação e treinamento:', is_predefined: true, sort_order: 16 },
  { item_numero: '3.1', topico: 'Os envolvidos foram comunicados sobre a mudança e seus impactos?', is_predefined: true, sort_order: 17 },
  { item_numero: '3.2', topico: 'É necessário treinamento ou reciclagem para os envolvidos?', is_predefined: true, sort_order: 18 },
  { item_numero: '3.3', topico: 'Os documentos / procedimentos afetados foram atualizados?', is_predefined: true, sort_order: 19 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function statusConfig(status: StatusMudanca) {
  const map: Record<StatusMudanca, { label: string; cls: string }> = {
    ABERTO: { label: 'Aberto', cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
    EM_ANALISE: { label: 'Em Análise', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
    APROVADO: { label: 'Aprovado', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
    EM_IMPLANTACAO: { label: 'Em Implantação', cls: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' },
    CONCLUIDO: { label: 'Concluído', cls: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' },
    CANCELADO: { label: 'Cancelado', cls: 'bg-slate-500/15 text-slate-400 border border-slate-500/30' },
  };
  return map[status] ?? map.ABERTO;
}

function fmt(date?: string) {
  if (!date) return '—';
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
}

function fmtBRL(val?: number) {
  if (!val && val !== 0) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Empty form state ─────────────────────────────────────────────────────────
function emptyForm(): GestaoMudanca {
  return {
    id: '',
    numero: '',
    instalacao: '',
    data_emissao: new Date().toISOString().slice(0, 10),
    carater: 'PERMANENTE',
    data_limite: '',
    razao: '',
    local_sistema: '',
    escopo_detalhado: '',
    cenario_atual: '',
    cenario_previsto: '',
    custo_mao_obra: 0,
    custo_equipamentos: 0,
    custo_servicos: 0,
    custo_diversos: 0,
    custo_diversos_detalhes: '',
    status: 'ABERTO',
    gim_respostas: {},
    autorizacao_data: '',
    autorizacao_nome: '',
    resultados_obtidos: '',
    declaracao_nome: '',
    declaracao_data: '',
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GestaoMudancasScreen() {
  const [mudancas, setMudancas] = useState<GestaoMudanca[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [viewMode, setViewMode] = useState(false);

  // Form data
  const [form, setForm] = useState<GestaoMudanca>(emptyForm);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([{ nome: '', funcao: '' }]);
  const [famItems, setFamItems] = useState<FamItem[]>(FAM_PREDEFINED.map(i => ({ ...i })));
  const [participantes, setParticipantes] = useState<Participante[]>([{ nome: '', matricula: '', funcao: '' }]);
  const [planoAcao, setPlanoAcao] = useState<PlanoAcaoItem[]>([{ descricao: '', responsavel: '', data_inicio: '', data_conclusao: '', custos: 0, conclusao: '', observacao: '' }]);

  // Load all data
  const loadAll = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from('gestao_mudancas')
      .select('*')
      .order('created_at', { ascending: false });
    if (e) setError(e.message);
    else setMudancas(data ?? []);
    setLoading(false);
  }, []);

  useState(() => { void loadAll(); return null; });

  // Load sub-tables for a record
  const loadSubData = useCallback(async (id: string) => {
    if (!supabase) return;
    const [
      { data: resp },
      { data: fam },
      { data: part },
      { data: plano },
    ] = await Promise.all([
      supabase.from('gestao_mudancas_responsaveis').select('*').eq('mudanca_id', id).order('created_at'),
      supabase.from('gestao_mudancas_fam_items').select('*').eq('mudanca_id', id).order('sort_order'),
      supabase.from('gestao_mudancas_participantes').select('*').eq('mudanca_id', id).order('referencia'),
      supabase.from('gestao_mudancas_plano_acao').select('*').eq('mudanca_id', id).order('sort_order'),
    ]);
    setResponsaveis(resp && resp.length > 0 ? resp : [{ nome: '', funcao: '' }]);
    setFamItems(fam && fam.length > 0 ? fam : FAM_PREDEFINED.map(i => ({ ...i })));
    setParticipantes(part && part.length > 0 ? part : [{ nome: '', matricula: '', funcao: '' }]);
    setPlanoAcao(plano && plano.length > 0 ? plano : [{ descricao: '', responsavel: '', data_inicio: '', data_conclusao: '', custos: 0, conclusao: '', observacao: '' }]);
  }, []);

  // Open modal to create
  function openCreate() {
    setForm(emptyForm());
    setResponsaveis([{ nome: '', funcao: '' }]);
    setFamItems(FAM_PREDEFINED.map(i => ({ ...i })));
    setParticipantes([{ nome: '', matricula: '', funcao: '' }]);
    setPlanoAcao([{ descricao: '', responsavel: '', data_inicio: '', data_conclusao: '', custos: 0, conclusao: '', observacao: '' }]);
    setModalStep(1);
    setViewMode(false);
    setModalOpen(true);
  }

  // Open modal to edit/view
  async function openEdit(m: GestaoMudanca, view = false) {
    setForm(m);
    setModalStep(1);
    setViewMode(view);
    setModalOpen(true);
    await loadSubData(m.id);
  }

  // Close modal
  function closeModal() {
    setModalOpen(false);
    setError(null);
  }

  // Save main record and return id
  async function saveMainRecord(): Promise<string | null> {
    if (!supabase) { setError('Supabase não inicializado'); return null; }
    const payload: Partial<GestaoMudanca> = {
      numero: form.numero || undefined,
      instalacao: form.instalacao || undefined,
      data_emissao: form.data_emissao || undefined,
      carater: form.carater,
      data_limite: form.carater === 'TEMPORARIO' ? form.data_limite || undefined : undefined,
      razao: form.razao || undefined,
      local_sistema: form.local_sistema || undefined,
      escopo_detalhado: form.escopo_detalhado || undefined,
      cenario_atual: form.cenario_atual || undefined,
      cenario_previsto: form.cenario_previsto || undefined,
      custo_mao_obra: form.custo_mao_obra ?? 0,
      custo_equipamentos: form.custo_equipamentos ?? 0,
      custo_servicos: form.custo_servicos ?? 0,
      custo_diversos: form.custo_diversos ?? 0,
      custo_diversos_detalhes: form.custo_diversos_detalhes || undefined,
      status: form.status,
      gim_respostas: form.gim_respostas ?? {},
      autorizacao_data: form.autorizacao_data || undefined,
      autorizacao_nome: form.autorizacao_nome || undefined,
      resultados_obtidos: form.resultados_obtidos || undefined,
      declaracao_nome: form.declaracao_nome || undefined,
      declaracao_data: form.declaracao_data || undefined,
    };

    if (form.id) {
      const { error: e } = await supabase
        .from('gestao_mudancas')
        .update(payload)
        .eq('id', form.id);
      if (e) { setError(e.message); return null; }
      return form.id;
    } else {
      const { data, error: e } = await supabase
        .from('gestao_mudancas')
        .insert(payload)
        .select('id')
        .single();
      if (e) { setError(e.message); return null; }
      setForm(prev => ({ ...prev, id: data.id }));
      return data.id;
    }
  }

  // Save all sub-tables
  async function saveSubTables(id: string) {
    if (!supabase) return;
    // Responsáveis
    const validResp = responsaveis.filter(r => r.nome.trim());
    await supabase.from('gestao_mudancas_responsaveis').delete().eq('mudanca_id', id);
    if (validResp.length > 0) {
      await supabase.from('gestao_mudancas_responsaveis').insert(
        validResp.map(r => ({ mudanca_id: id, nome: r.nome, funcao: r.funcao }))
      );
    }

    // FAM items
    const validFam = famItems.filter(f => f.topico.trim());
    await supabase.from('gestao_mudancas_fam_items').delete().eq('mudanca_id', id);
    if (validFam.length > 0) {
      await supabase.from('gestao_mudancas_fam_items').insert(
        validFam.map((f, idx) => ({
          mudanca_id: id,
          item_numero: f.item_numero,
          topico: f.topico,
          responsavel: f.responsavel || null,
          acao: f.acao || null,
          prazo: f.prazo || null,
          status_item: f.status_item || null,
          condicao_impeditiva: f.condicao_impeditiva || null,
          is_predefined: f.is_predefined ?? false,
          sort_order: f.sort_order ?? idx,
        }))
      );
    }

    // Participantes
    const validPart = participantes.filter(p => p.nome.trim());
    await supabase.from('gestao_mudancas_participantes').delete().eq('mudanca_id', id);
    if (validPart.length > 0) {
      await supabase.from('gestao_mudancas_participantes').insert(
        validPart.map((p, idx) => ({
          mudanca_id: id,
          referencia: idx + 1,
          nome: p.nome,
          matricula: p.matricula || null,
          funcao: p.funcao || null,
          data_avaliacao_inicial: p.data_avaliacao_inicial || null,
          data_mudanca_aprovada: p.data_mudanca_aprovada || null,
          data_vistoria_encerramento: p.data_vistoria_encerramento || null,
        }))
      );
    }

    // Plano de ação
    const validPlano = planoAcao.filter(p => p.descricao.trim());
    await supabase.from('gestao_mudancas_plano_acao').delete().eq('mudanca_id', id);
    if (validPlano.length > 0) {
      await supabase.from('gestao_mudancas_plano_acao').insert(
        validPlano.map((p, idx) => ({
          mudanca_id: id,
          descricao: p.descricao,
          responsavel: p.responsavel || null,
          data_inicio: p.data_inicio || null,
          data_conclusao: p.data_conclusao || null,
          custos: p.custos ?? 0,
          conclusao: p.conclusao || null,
          observacao: p.observacao || null,
          sort_order: idx,
        }))
      );
    }
  }

  // Full save
  async function handleSave() {
    setSaving(true);
    setError(null);
    const id = await saveMainRecord();
    if (!id) { setSaving(false); return; }
    await saveSubTables(id);
    setSaving(false);
    await loadAll();
    closeModal();
  }

  // Delete
  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm('Excluir esta gestão de mudança? Esta ação não pode ser desfeita.')) return;
    await supabase.from('gestao_mudancas').delete().eq('id', id);
    await loadAll();
  }

  // KPIs
  const kpis = useMemo(() => {
    const total = mudancas.length;
    const abertas = mudancas.filter(m => m.status === 'ABERTO').length;
    const emAnalise = mudancas.filter(m => m.status === 'EM_ANALISE').length;
    const aprovadas = mudancas.filter(m => m.status === 'APROVADO' || m.status === 'EM_IMPLANTACAO').length;
    const concluidas = mudancas.filter(m => m.status === 'CONCLUIDO').length;
    return { total, abertas, emAnalise, aprovadas, concluidas };
  }, [mudancas]);

  // Computed total cost
  const totalCusto = (
    (form.custo_mao_obra ?? 0) +
    (form.custo_equipamentos ?? 0) +
    (form.custo_servicos ?? 0) +
    (form.custo_diversos ?? 0)
  );

  // GIM computed result
  const gimSimCount = useMemo(() => {
    return GIM_QUESTIONS.filter(q => form.gim_respostas?.[q.key] === 'SIM').length;
  }, [form.gim_respostas]);

  // ─── Loading / Error ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-full bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 border-b border-slate-800/60">
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Governança · QSMS</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-100">Gestão de Mudanças</h1>
              <p className="text-sm text-slate-400 mt-0.5">Controle e análise de mudanças conforme PG-TR-SMS-013</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              Nova Mudança
            </button>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-6">
            {[
              { label: 'Total', value: kpis.total, icon: ClipboardList, color: 'text-slate-300', glow: 'bg-slate-500/50' },
              { label: 'Abertas', value: kpis.abertas, icon: AlertCircle, color: 'text-blue-400', glow: 'bg-blue-500/50' },
              { label: 'Em Análise', value: kpis.emAnalise, icon: FileCheck, color: 'text-amber-400', glow: 'bg-amber-500/50' },
              { label: 'Concluídas', value: kpis.concluidas, icon: CheckCircle2, color: 'text-emerald-400', glow: 'bg-emerald-500/50' },
            ].map(({ label, value, icon: Icon, color, glow }) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${glow} rounded-t-2xl`} />
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                </div>
                <div className={`text-3xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {mudancas.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
            <RefreshCw className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Nenhuma gestão de mudança registrada</p>
            <p className="text-slate-600 text-sm mt-1">Clique em &quot;Nova Mudança&quot; para começar</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Nº', 'Instalação', 'Emissão', 'Caráter', 'Status', 'Custo Total', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {mudancas.map(m => {
                    const sc = statusConfig(m.status);
                    const total =
                      (m.custo_mao_obra ?? 0) +
                      (m.custo_equipamentos ?? 0) +
                      (m.custo_servicos ?? 0) +
                      (m.custo_diversos ?? 0);
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="px-4 py-3 text-sm font-mono text-amber-400 font-semibold whitespace-nowrap">
                          {m.numero || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 max-w-xs truncate">
                          {m.instalacao || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                          {fmt(m.data_emissao)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            m.carater === 'PERMANENTE'
                              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                              : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                          }`}>
                            {m.carater === 'PERMANENTE' ? 'Permanente' : 'Temporário'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.cls}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap font-mono">
                          {total > 0 ? fmtBRL(total) : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(m, true)}
                              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-lg transition-colors"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEdit(m, false)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-700/60 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
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
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MODAL — multi-step form
      ═══════════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  {viewMode ? 'Visualizar' : form.id ? 'Editar' : 'Nova'} Gestão de Mudança
                </h2>
                {form.numero && (
                  <p className="text-xs text-amber-400 font-mono mt-0.5">Nº {form.numero}</p>
                )}
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="px-6 py-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                {[
                  { step: 1, label: 'CAPA', icon: FileText },
                  { step: 2, label: 'GIM', icon: ClipboardList },
                  { step: 3, label: 'FAM', icon: FileCheck },
                  { step: 4, label: 'Plano de Ação', icon: CheckCircle2 },
                ].map(({ step, label, icon: Icon }, idx) => (
                  <React.Fragment key={step}>
                    <button
                      onClick={() => setModalStep(step)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        modalStep === step
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : modalStep > step
                          ? 'text-emerald-400 border border-emerald-500/20 bg-emerald-500/10'
                          : 'text-slate-500 border border-transparent hover:text-slate-300'
                      }`}
                    >
                      {modalStep > step ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                      {step}. {label}
                    </button>
                    {idx < 3 && <ChevronRight className="w-4 h-4 text-slate-700 shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Modal body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ── STEP 1: CAPA ── */}
              {modalStep === 1 && (
                <div className="space-y-5">
                  {/* Row 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Número da GM</label>
                      <input
                        disabled={viewMode}
                        className={inputCls}
                        placeholder="GM-2024-001"
                        value={form.numero ?? ''}
                        onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Instalação</label>
                      <input
                        disabled={viewMode}
                        className={inputCls}
                        placeholder="Nome da instalação"
                        value={form.instalacao ?? ''}
                        onChange={e => setForm(p => ({ ...p, instalacao: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Data de Emissão</label>
                      <input
                        disabled={viewMode}
                        type="date"
                        className={inputCls}
                        value={form.data_emissao ?? ''}
                        onChange={e => setForm(p => ({ ...p, data_emissao: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Caráter */}
                  <div className="flex flex-1 h-px bg-slate-800" />
                  <div>
                    <label className={labelCls}>Caráter da Mudança</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['PERMANENTE', 'TEMPORARIO'] as Carater[]).map(c => (
                        <button
                          key={c}
                          disabled={viewMode}
                          onClick={() => setForm(p => ({ ...p, carater: c }))}
                          className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left ${
                            form.carater === c
                              ? c === 'PERMANENTE'
                                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                                : 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {form.carater === c && <Check className="w-4 h-4" />}
                            {c === 'PERMANENTE' ? '♾ Permanente' : '⏱ Temporário'}
                          </div>
                        </button>
                      ))}
                    </div>
                    {form.carater === 'TEMPORARIO' && (
                      <div className="mt-3">
                        <label className={labelCls}>Data Limite *</label>
                        <input
                          disabled={viewMode}
                          type="date"
                          className={inputCls}
                          value={form.data_limite ?? ''}
                          onChange={e => setForm(p => ({ ...p, data_limite: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 h-px bg-slate-800" />

                  {/* Text fields */}
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Razão para Executar a Mudança</label>
                      <textarea
                        disabled={viewMode}
                        className={textareaCls}
                        rows={2}
                        placeholder="Descreva o motivo da mudança..."
                        value={form.razao ?? ''}
                        onChange={e => setForm(p => ({ ...p, razao: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Local / Sistema onde irá ocorrer a Mudança</label>
                      <textarea
                        disabled={viewMode}
                        className={textareaCls}
                        rows={2}
                        placeholder="Informe o local ou sistema afetado..."
                        value={form.local_sistema ?? ''}
                        onChange={e => setForm(p => ({ ...p, local_sistema: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Escopo Detalhado da Mudança</label>
                      <textarea
                        disabled={viewMode}
                        className={textareaCls}
                        rows={3}
                        placeholder="Descreva o escopo completo..."
                        value={form.escopo_detalhado ?? ''}
                        onChange={e => setForm(p => ({ ...p, escopo_detalhado: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Cenário Atual</label>
                        <textarea
                          disabled={viewMode}
                          className={textareaCls}
                          rows={3}
                          placeholder="Situação atual..."
                          value={form.cenario_atual ?? ''}
                          onChange={e => setForm(p => ({ ...p, cenario_atual: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Cenário Previsto</label>
                        <textarea
                          disabled={viewMode}
                          className={textareaCls}
                          rows={3}
                          placeholder="Situação após a mudança..."
                          value={form.cenario_previsto ?? ''}
                          onChange={e => setForm(p => ({ ...p, cenario_previsto: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 h-px bg-slate-800" />

                  {/* Custos */}
                  <div>
                    <label className={labelCls + ' mb-3'}>Custo Estimado</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      {[
                        { label: 'Mão de Obra', key: 'custo_mao_obra' as const },
                        { label: 'Equipamentos', key: 'custo_equipamentos' as const },
                        { label: 'Serviços', key: 'custo_servicos' as const },
                        { label: 'Diversos', key: 'custo_diversos' as const },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <label className="block text-xs text-slate-500 mb-1">{label}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>
                            <input
                              disabled={viewMode}
                              type="number"
                              min="0"
                              step="0.01"
                              className={inputCls + ' pl-8'}
                              value={form[key] ?? 0}
                              onChange={e => setForm(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {(form.custo_diversos ?? 0) > 0 && (
                      <div className="mb-3">
                        <label className="block text-xs text-slate-500 mb-1">Detalhar Diversos</label>
                        <input
                          disabled={viewMode}
                          className={inputCls}
                          placeholder="Descreva os itens diversos..."
                          value={form.custo_diversos_detalhes ?? ''}
                          onChange={e => setForm(p => ({ ...p, custo_diversos_detalhes: e.target.value }))}
                        />
                      </div>
                    )}
                    <div className="bg-slate-800/60 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-400">Total Estimado</span>
                      <span className="text-lg font-bold text-amber-400 font-mono">{fmtBRL(totalCusto)}</span>
                    </div>
                  </div>

                  <div className="flex flex-1 h-px bg-slate-800" />

                  {/* Status */}
                  <div>
                    <label className={labelCls}>Status</label>
                    <select
                      disabled={viewMode}
                      className={selectCls}
                      value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value as StatusMudanca }))}
                    >
                      <option value="ABERTO">Aberto</option>
                      <option value="EM_ANALISE">Em Análise</option>
                      <option value="APROVADO">Aprovado</option>
                      <option value="EM_IMPLANTACAO">Em Implantação</option>
                      <option value="CONCLUIDO">Concluído</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                  </div>

                  <div className="flex flex-1 h-px bg-slate-800" />

                  {/* Responsáveis */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className={labelCls + ' mb-0'}>Responsáveis</label>
                      {!viewMode && (
                        <button
                          onClick={() => setResponsaveis(p => [...p, { nome: '', funcao: '' }])}
                          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {responsaveis.map((r, idx) => (
                        <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                          <div className="col-span-2">
                            <input
                              disabled={viewMode}
                              className={inputClsSmall}
                              placeholder="Nome"
                              value={r.nome}
                              onChange={e => setResponsaveis(p => p.map((x, i) => i === idx ? { ...x, nome: e.target.value } : x))}
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              disabled={viewMode}
                              className={inputClsSmall}
                              placeholder="Função"
                              value={r.funcao}
                              onChange={e => setResponsaveis(p => p.map((x, i) => i === idx ? { ...x, funcao: e.target.value } : x))}
                            />
                          </div>
                          {!viewMode && (
                            <button
                              onClick={() => setResponsaveis(p => p.filter((_, i) => i !== idx))}
                              className="p-1.5 text-slate-600 hover:text-red-400 rounded-md transition-colors justify-self-center"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: GIM ── */}
              {modalStep === 2 && (
                <div className="space-y-5">
                  {/* Context */}
                  <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardList className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-slate-300">Guia de Identificação de Mudança — GIM</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Responda SIM ou NÃO para cada item. Se respondeu NÃO para todos, o serviço não caracteriza uma mudança.
                      Se respondeu SIM para pelo menos um, é mandatório aplicar o FAM.
                    </p>
                  </div>

                  {/* Summary banner */}
                  {gimSimCount > 0 && (
                    <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-sm text-amber-300 font-medium">
                        {gimSimCount} resposta{gimSimCount > 1 ? 's' : ''} SIM — FAM é mandatório
                      </span>
                    </div>
                  )}

                  {/* Questions */}
                  <div className="space-y-1.5">
                    {GIM_QUESTIONS.map((q, idx) => {
                      const val = form.gim_respostas?.[q.key] ?? null;
                      return (
                        <div
                          key={q.key}
                          className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors ${
                            val === 'SIM'
                              ? 'bg-amber-500/8 border-amber-500/25'
                              : val === 'NAO'
                              ? 'bg-slate-800/40 border-slate-700/40'
                              : 'bg-slate-800/20 border-slate-800'
                          }`}
                        >
                          <span className="text-xs text-slate-600 font-mono mt-0.5 shrink-0 w-6">{idx + 1}.</span>
                          <span className="flex-1 text-sm text-slate-300 leading-relaxed">{q.text}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {(['SIM', 'NAO'] as const).map(opt => (
                              <button
                                key={opt}
                                disabled={viewMode}
                                onClick={() => setForm(p => ({
                                  ...p,
                                  gim_respostas: { ...p.gim_respostas, [q.key]: val === opt ? null : opt }
                                }))}
                                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                                  val === opt
                                    ? opt === 'SIM'
                                      ? 'bg-amber-500 border-amber-500 text-slate-950'
                                      : 'bg-slate-500 border-slate-500 text-white'
                                    : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Result note */}
                  <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 text-xs text-slate-500 space-y-1">
                    <p><strong className="text-slate-400">NOTA 1:</strong> Se você respondeu &quot;NÃO&quot; a todas as perguntas acima, o serviço não caracteriza uma mudança e, portanto, não há necessidade de aplicar a GESTÃO DE MUDANÇAS.</p>
                    <p><strong className="text-slate-400">NOTA 2:</strong> Se você respondeu &quot;SIM&quot; a pelo menos uma das perguntas, é mandatório aplicar a GESTÃO DE MUDANÇAS, sendo mandatório responder o FAM.</p>
                  </div>
                </div>
              )}

              {/* ── STEP 3: FAM ── */}
              {modalStep === 3 && (
                <div className="space-y-5">
                  <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FileCheck className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-slate-300">Formulário de Análise de Mudança — FAM</span>
                    </div>
                    <p className="text-xs text-slate-500">Preencha os tópicos de análise, designando responsável, ação, prazo e status para cada item.</p>
                  </div>

                  {/* FAM items table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800 border-b border-slate-700">
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-16">Item</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider min-w-[300px]">Tópico</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-28">Resp.</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-36">Ação</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-28">Prazo</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-28">Status</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-24">Impeditivo</th>
                          {!viewMode && <th className="px-3 py-2 w-10" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {famItems.map((item, idx) => {
                          const isHeader = item.is_predefined && !item.item_numero.includes('.');
                          return (
                            <tr
                              key={idx}
                              className={isHeader ? 'bg-slate-800/60' : 'hover:bg-slate-800/20 transition-colors'}
                            >
                              <td className="px-3 py-2 font-mono text-slate-500">{item.item_numero}</td>
                              <td className={`px-3 py-2 ${isHeader ? 'font-semibold text-slate-300' : 'text-slate-400'} leading-snug`}>
                                {isHeader ? item.topico : (
                                  viewMode ? item.topico : (
                                    <input
                                      className={inputClsSmall}
                                      value={item.topico}
                                      onChange={e => setFamItems(p => p.map((x, i) => i === idx ? { ...x, topico: e.target.value } : x))}
                                    />
                                  )
                                )}
                              </td>
                              {isHeader ? (
                                <td colSpan={viewMode ? 5 : 6} />
                              ) : (
                                <>
                                  <td className="px-3 py-2">
                                    {viewMode ? (
                                      <span className="text-slate-400">{item.responsavel || '—'}</span>
                                    ) : (
                                      <input
                                        className={inputClsSmall}
                                        placeholder="Resp."
                                        value={item.responsavel ?? ''}
                                        onChange={e => setFamItems(p => p.map((x, i) => i === idx ? { ...x, responsavel: e.target.value } : x))}
                                      />
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    {viewMode ? (
                                      <span className="text-slate-400">{item.acao || '—'}</span>
                                    ) : (
                                      <input
                                        className={inputClsSmall}
                                        placeholder="Ação"
                                        value={item.acao ?? ''}
                                        onChange={e => setFamItems(p => p.map((x, i) => i === idx ? { ...x, acao: e.target.value } : x))}
                                      />
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    {viewMode ? (
                                      <span className="text-slate-400">{item.prazo ? fmt(item.prazo) : '—'}</span>
                                    ) : (
                                      <input
                                        type="date"
                                        className={inputClsSmall}
                                        value={item.prazo ?? ''}
                                        onChange={e => setFamItems(p => p.map((x, i) => i === idx ? { ...x, prazo: e.target.value } : x))}
                                      />
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    {viewMode ? (
                                      <span className="text-slate-400">{item.status_item || '—'}</span>
                                    ) : (
                                      <select
                                        className={inputClsSmall}
                                        value={item.status_item ?? ''}
                                        onChange={e => setFamItems(p => p.map((x, i) => i === idx ? { ...x, status_item: e.target.value } : x))}
                                      >
                                        <option value="">—</option>
                                        <option>Pendente</option>
                                        <option>Em Andamento</option>
                                        <option>Concluído</option>
                                        <option>N/A</option>
                                      </select>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    {viewMode ? (
                                      <span className={item.condicao_impeditiva === 'Sim' ? 'text-red-400' : 'text-slate-400'}>
                                        {item.condicao_impeditiva || '—'}
                                      </span>
                                    ) : (
                                      <select
                                        className={inputClsSmall}
                                        value={item.condicao_impeditiva ?? ''}
                                        onChange={e => setFamItems(p => p.map((x, i) => i === idx ? { ...x, condicao_impeditiva: e.target.value } : x))}
                                      >
                                        <option value="">—</option>
                                        <option>Sim</option>
                                        <option>Não</option>
                                      </select>
                                    )}
                                  </td>
                                  {!viewMode && (
                                    <td className="px-2 py-2">
                                      {!item.is_predefined && (
                                        <button
                                          onClick={() => setFamItems(p => p.filter((_, i) => i !== idx))}
                                          className="p-1 text-slate-600 hover:text-red-400 rounded transition-colors"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </td>
                                  )}
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {!viewMode && (
                    <button
                      onClick={() => setFamItems(p => [...p, {
                        item_numero: String(p.filter(x => !x.is_predefined).length + 1),
                        topico: '',
                        is_predefined: false,
                        sort_order: p.length,
                      }])}
                      className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      <Plus className="w-4 h-4" /> Adicionar item personalizado
                    </button>
                  )}

                  <div className="flex flex-1 h-px bg-slate-800" />

                  {/* Participantes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className={labelCls + ' mb-0'}>Participantes da Análise</label>
                      {!viewMode && (
                        <button
                          onClick={() => setParticipantes(p => [...p, { nome: '', matricula: '', funcao: '' }])}
                          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-800 border-b border-slate-700">
                            <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider">Ref.</th>
                            <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider">Nome</th>
                            <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider">Matrícula</th>
                            <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider">Função</th>
                            <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider">Dt. Avaliação</th>
                            <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider">Dt. Aprovação</th>
                            <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider">Dt. Vistoria</th>
                            {!viewMode && <th className="px-3 py-2 w-10" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {participantes.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/20">
                              <td className="px-3 py-2 text-slate-500 font-mono">{idx + 1}</td>
                              {(['nome', 'matricula', 'funcao'] as const).map(field => (
                                <td key={field} className="px-3 py-2">
                                  {viewMode ? (
                                    <span className="text-slate-400">{p[field] || '—'}</span>
                                  ) : (
                                    <input
                                      className={inputClsSmall}
                                      placeholder={field === 'nome' ? 'Nome completo' : field === 'matricula' ? 'Matrícula' : 'Função'}
                                      value={p[field] ?? ''}
                                      onChange={e => setParticipantes(prev => prev.map((x, i) => i === idx ? { ...x, [field]: e.target.value } : x))}
                                    />
                                  )}
                                </td>
                              ))}
                              {(['data_avaliacao_inicial', 'data_mudanca_aprovada', 'data_vistoria_encerramento'] as const).map(field => (
                                <td key={field} className="px-3 py-2">
                                  {viewMode ? (
                                    <span className="text-slate-400">{p[field] ? fmt(p[field]) : '—'}</span>
                                  ) : (
                                    <input
                                      type="date"
                                      className={inputClsSmall}
                                      value={p[field] ?? ''}
                                      onChange={e => setParticipantes(prev => prev.map((x, i) => i === idx ? { ...x, [field]: e.target.value } : x))}
                                    />
                                  )}
                                </td>
                              ))}
                              {!viewMode && (
                                <td className="px-2 py-2">
                                  <button
                                    onClick={() => setParticipantes(prev => prev.filter((_, i) => i !== idx))}
                                    className="p-1 text-slate-600 hover:text-red-400 rounded transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex flex-1 h-px bg-slate-800" />

                  {/* Authorization & Closing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Autorização para Mudança — Nome do Responsável</label>
                      <input
                        disabled={viewMode}
                        className={inputCls}
                        placeholder="Nome completo"
                        value={form.autorizacao_nome ?? ''}
                        onChange={e => setForm(p => ({ ...p, autorizacao_nome: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Data da Autorização</label>
                      <input
                        disabled={viewMode}
                        type="date"
                        className={inputCls}
                        value={form.autorizacao_data ?? ''}
                        onChange={e => setForm(p => ({ ...p, autorizacao_data: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Resultados esperados foram obtidos? (análise crítica)</label>
                    <textarea
                      disabled={viewMode}
                      className={textareaCls}
                      rows={2}
                      placeholder="Descreva se os resultados foram obtidos ou análise crítica..."
                      value={form.resultados_obtidos ?? ''}
                      onChange={e => setForm(p => ({ ...p, resultados_obtidos: e.target.value }))}
                    />
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
                    <p className="text-xs text-slate-500 italic mb-3">
                      DECLARO QUE A MUDANÇA FOI EXECUTADA CONFORME ESTA ANÁLISE DE MUDANÇA – F.A.M. – E QUE AS RECOMENDAÇÕES ACIMA FORAM IMPLEMENTADAS.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Nome (Responsável pela aprovação)</label>
                        <input
                          disabled={viewMode}
                          className={inputClsSmall}
                          placeholder="Nome do responsável"
                          value={form.declaracao_nome ?? ''}
                          onChange={e => setForm(p => ({ ...p, declaracao_nome: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Data</label>
                        <input
                          disabled={viewMode}
                          type="date"
                          className={inputClsSmall}
                          value={form.declaracao_data ?? ''}
                          onChange={e => setForm(p => ({ ...p, declaracao_data: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 4: Plano de Ação ── */}
              {modalStep === 4 && (
                <div className="space-y-5">
                  <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-slate-300">Plano de Ação — Gestão de Mudanças</span>
                    </div>
                    <p className="text-xs text-slate-500">Registre as ações necessárias para implementação da mudança, com responsáveis, prazos e custos.</p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800 border-b border-slate-700">
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider min-w-[200px]">Descrição</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-32">Responsável</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-28">Dt. Início</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-28">Dt. Conclusão</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-28">Custos (R$)</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-24">Conclusão</th>
                          <th className="px-3 py-2 text-left text-slate-400 font-semibold uppercase tracking-wider w-36">Observação</th>
                          {!viewMode && <th className="px-3 py-2 w-10" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {planoAcao.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/20">
                            <td className="px-3 py-2">
                              {viewMode ? (
                                <span className="text-slate-300">{item.descricao || '—'}</span>
                              ) : (
                                <input
                                  className={inputClsSmall}
                                  placeholder="Descreva a ação..."
                                  value={item.descricao}
                                  onChange={e => setPlanoAcao(p => p.map((x, i) => i === idx ? { ...x, descricao: e.target.value } : x))}
                                />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {viewMode ? (
                                <span className="text-slate-400">{item.responsavel || '—'}</span>
                              ) : (
                                <input
                                  className={inputClsSmall}
                                  placeholder="Responsável"
                                  value={item.responsavel ?? ''}
                                  onChange={e => setPlanoAcao(p => p.map((x, i) => i === idx ? { ...x, responsavel: e.target.value } : x))}
                                />
                              )}
                            </td>
                            {(['data_inicio', 'data_conclusao'] as const).map(f => (
                              <td key={f} className="px-3 py-2">
                                {viewMode ? (
                                  <span className="text-slate-400">{item[f] ? fmt(item[f]) : '—'}</span>
                                ) : (
                                  <input
                                    type="date"
                                    className={inputClsSmall}
                                    value={item[f] ?? ''}
                                    onChange={e => setPlanoAcao(p => p.map((x, i) => i === idx ? { ...x, [f]: e.target.value } : x))}
                                  />
                                )}
                              </td>
                            ))}
                            <td className="px-3 py-2">
                              {viewMode ? (
                                <span className="text-slate-400 font-mono">{item.custos ? fmtBRL(item.custos) : '—'}</span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className={inputClsSmall}
                                  value={item.custos ?? 0}
                                  onChange={e => setPlanoAcao(p => p.map((x, i) => i === idx ? { ...x, custos: parseFloat(e.target.value) || 0 } : x))}
                                />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {viewMode ? (
                                <span className={item.conclusao === 'Concluído' ? 'text-emerald-400' : 'text-slate-400'}>
                                  {item.conclusao || '—'}
                                </span>
                              ) : (
                                <select
                                  className={inputClsSmall}
                                  value={item.conclusao ?? ''}
                                  onChange={e => setPlanoAcao(p => p.map((x, i) => i === idx ? { ...x, conclusao: e.target.value } : x))}
                                >
                                  <option value="">—</option>
                                  <option>Pendente</option>
                                  <option>Em Andamento</option>
                                  <option>Concluído</option>
                                  <option>Cancelado</option>
                                </select>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {viewMode ? (
                                <span className="text-slate-400">{item.observacao || '—'}</span>
                              ) : (
                                <input
                                  className={inputClsSmall}
                                  placeholder="Observação"
                                  value={item.observacao ?? ''}
                                  onChange={e => setPlanoAcao(p => p.map((x, i) => i === idx ? { ...x, observacao: e.target.value } : x))}
                                />
                              )}
                            </td>
                            {!viewMode && (
                              <td className="px-2 py-2">
                                <button
                                  onClick={() => setPlanoAcao(p => p.filter((_, i) => i !== idx))}
                                  className="p-1 text-slate-600 hover:text-red-400 rounded transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!viewMode && (
                    <button
                      onClick={() => setPlanoAcao(p => [...p, { descricao: '', responsavel: '', data_inicio: '', data_conclusao: '', custos: 0, conclusao: '', observacao: '' }])}
                      className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      <Plus className="w-4 h-4" /> Adicionar ação
                    </button>
                  )}

                  {/* Plano summary */}
                  <div className="bg-slate-800/60 border border-amber-500/20 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{planoAcao.filter(p => p.descricao.trim()).length} ações</span>
                        <span className="text-emerald-400">{planoAcao.filter(p => p.conclusao === 'Concluído').length} concluídas</span>
                        <span className="text-amber-400">{planoAcao.filter(p => p.conclusao === 'Em Andamento').length} em andamento</span>
                      </div>
                      <span className="text-sm font-bold text-amber-400 font-mono">
                        {fmtBRL(planoAcao.reduce((s, p) => s + (p.custos ?? 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                onClick={() => modalStep > 1 ? setModalStep(s => s - 1 as 1|2|3|4) : closeModal()}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {modalStep === 1 ? 'Cancelar' : 'Anterior'}
              </button>

              <div className="flex items-center gap-3">
                {!viewMode && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-sm font-bold rounded-xl transition-all"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                )}
                {modalStep < 4 && (
                  <button
                    onClick={() => setModalStep(s => s + 1 as 1|2|3|4)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl transition-colors"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
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
