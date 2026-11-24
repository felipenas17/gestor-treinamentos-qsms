'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Calendar, Vote, Megaphone, BookOpen,
  ClipboardList, Map, Newspaper, Plus, RefreshCw,
  ChevronDown, ChevronUp, Pencil, Trash2, Check, X,
  FileText, AlertCircle, Clock, Printer, Upload, Eye,
  BarChart2, UserCheck, ExternalLink, ChevronRight,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────

interface CipaMandato {
  id: string;
  titulo: string;
  ano: number;
  data_inicio: string | null;
  data_fim: string | null;
  status: 'ativo' | 'encerrado';
  observacoes: string | null;
  created_at: string;
}

interface CipaMembro {
  id: string;
  mandato_id: string;
  nome: string;
  cargo: string | null;
  funcao: 'presidente' | 'vice-presidente' | 'secretario' | 'membro' | 'suplente' | null;
  tipo: 'empregador' | 'eleito' | null;
  email: string | null;
  telefone: string | null;
  created_at: string;
}

interface CipaReuniao {
  id: string;
  mandato_id: string | null;
  numero_reuniao: number | null;
  tipo: 'ordinaria' | 'extraordinaria';
  data_reuniao: string | null;
  horario: string | null;
  local: string | null;
  pauta: string | null;
  deliberacoes: string | null;
  proxima_reuniao: string | null;
  status: 'agendada' | 'realizada' | 'cancelada';
  arquivo_url: string | null;
  created_at: string;
}

interface CipaAcao {
  id: string;
  reuniao_id: string;
  descricao: string;
  responsavel: string | null;
  prazo: string | null;
  status: 'pendente' | 'concluido' | 'cancelado';
  created_at: string;
}

interface CipaEleicao {
  id: string;
  mandato_id: string | null;
  ano: number;
  data_eleicao: string | null;
  total_votantes: number | null;
  total_votos: number | null;
  status: 'planejada' | 'em_andamento' | 'concluida';
  edital_url: string | null;
  ata_url: string | null;
  observacoes: string | null;
  created_at: string;
}

interface CipaSipat {
  id: string;
  ano: number;
  data_inicio: string | null;
  data_fim: string | null;
  tema: string | null;
  status: 'planejada' | 'em_andamento' | 'concluida';
  observacoes: string | null;
  created_at: string;
}

interface CipaSipatAtividade {
  id: string;
  sipat_id: string;
  titulo: string;
  data: string | null;
  horario: string | null;
  local: string | null;
  palestrante: string | null;
  participantes_estimados: number | null;
  participantes_real: number | null;
  status: 'planejada' | 'realizada' | 'cancelada';
  created_at: string;
}

interface CipaPlano {
  id: string;
  ano: number;
  mes: number;
  atividade_prevista: string | null;
  atividade_realizada: string | null;
  responsavel: string | null;
  status: 'pendente' | 'concluido' | 'cancelado';
  created_at: string;
}

interface CipaMapaRisco {
  id: string;
  ano: number;
  area: string;
  descricao: string | null;
  arquivo_url: string | null;
  data_elaboracao: string | null;
  revisao_prevista: string | null;
  status: 'vigente' | 'em_revisao' | 'obsoleto';
  created_at: string;
}

interface CipaInformativo {
  id: string;
  titulo: string;
  categoria: string | null;
  arquivo_url: string | null;
  data_publicacao: string | null;
  created_at: string;
}

interface CipaChapa {
  id: string;
  eleicao_id: string;
  numero_chapa: number;
  nome: string | null;
  candidato_titular: string;
  candidato_suplente: string | null;
  created_at: string;
}

interface CipaEleitor {
  id: string;
  eleicao_id: string;
  nome: string;
  token_voto: string;
  votou: boolean;
  data_voto: string | null;
  created_at: string;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface CipaScreenProps {
  onToast?: (msg: string, type?: 'success' | 'error') => void;
}

// ─── Helper components ──────────────────────────────────────────────────────

function FLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 disabled:opacity-60"
    />
  );
}

function FTextarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 resize-none disabled:opacity-60"
    />
  );
}

function FSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400"
    >
      {children}
    </select>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ativo:        { label: 'Ativo',        cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    encerrado:    { label: 'Encerrado',    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
    agendada:     { label: 'Agendada',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    realizada:    { label: 'Realizada',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    cancelada:    { label: 'Cancelada',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    pendente:     { label: 'Pendente',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    concluido:    { label: 'Concluído',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    planejada:    { label: 'Planejada',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    em_andamento: { label: 'Em andamento', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    concluida:    { label: 'Concluída',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    vigente:      { label: 'Vigente',      cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    em_revisao:   { label: 'Em revisão',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    obsoleto:     { label: 'Obsoleto',     cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
      <Icon className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmtDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'painel',         label: 'Painel',           icon: LayoutDashboardIcon },
  { id: 'mandatos',       label: 'Mandatos',          icon: Users },
  { id: 'reunioes',       label: 'Reuniões',          icon: Calendar },
  { id: 'eleicoes',       label: 'Eleições',          icon: Vote },
  { id: 'sipat',          label: 'SIPAT',             icon: Megaphone },
  { id: 'plano',          label: 'Plano de Trabalho', icon: ClipboardList },
  { id: 'mapa-risco',     label: 'Mapa de Risco',     icon: Map },
  { id: 'informativos',   label: 'Informativos',      icon: Newspaper },
] as const;

type TabId = typeof TABS[number]['id'];

function LayoutDashboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

export function CipaScreen({ onToast }: CipaScreenProps) {
  const [activeTab, setActiveTab] = useState<TabId>('painel');

  // ── global data ──
  const [mandatos, setMandatos] = useState<CipaMandato[]>([]);
  const [membros,  setMembros]  = useState<CipaMembro[]>([]);
  const [reunioes, setReunioes] = useState<CipaReuniao[]>([]);
  const [acoes,    setAcoes]    = useState<CipaAcao[]>([]);
  const [eleicoes, setEleicoes] = useState<CipaEleicao[]>([]);
  const [sipats,   setSipats]   = useState<CipaSipat[]>([]);
  const [sipatAtividades, setSipatAtividades] = useState<CipaSipatAtividade[]>([]);
  const [planos,   setPlanos]   = useState<CipaPlano[]>([]);
  const [mapas,    setMapas]    = useState<CipaMapaRisco[]>([]);
  const [informativos, setInformativos] = useState<CipaInformativo[]>([]);
  const [loading,  setLoading]  = useState(true);

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    onToast?.(msg, type);
  }, [onToast]);

  const loadAll = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) return;
    setLoading(true);
    const [
      { data: m },
      { data: mb },
      { data: r },
      { data: a },
      { data: e },
      { data: s },
      { data: sa },
      { data: p },
      { data: mr },
      { data: i },
    ] = await Promise.all([
      supabase.from('cipa_mandatos').select('*').order('ano', { ascending: false }),
      supabase.from('cipa_membros').select('*').order('funcao'),
      supabase.from('cipa_reunioes').select('*').order('data_reuniao', { ascending: false }),
      supabase.from('cipa_reuniao_acoes').select('*').order('prazo'),
      supabase.from('cipa_eleicoes').select('*').order('ano', { ascending: false }),
      supabase.from('cipa_sipat').select('*').order('ano', { ascending: false }),
      supabase.from('cipa_sipat_atividades').select('*').order('data'),
      supabase.from('cipa_plano_trabalho').select('*').order('ano,mes'),
      supabase.from('cipa_mapa_risco').select('*').order('ano', { ascending: false }),
      supabase.from('cipa_informativos').select('*').order('data_publicacao', { ascending: false }),
    ]);
    setMandatos(m ?? []);
    setMembros(mb ?? []);
    setReunioes(r ?? []);
    setAcoes(a ?? []);
    setEleicoes(e ?? []);
    setSipats(s ?? []);
    setSipatAtividades(sa ?? []);
    setPlanos(p ?? []);
    setMapas(mr ?? []);
    setInformativos(i ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAll(); }, [loadAll]);

  const mandatoAtivo = mandatos.find(m => m.status === 'ativo');
  const membrosAtivos = mandatoAtivo ? membros.filter(m => m.mandato_id === mandatoAtivo.id) : [];
  const proximaReuniao = reunioes.find(r => r.status === 'agendada');
  const acoesPendentes = acoes.filter(a => a.status === 'pendente');

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">CIPA</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Comissão Interna de Prevenção de Acidentes — NR-5</p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto flex-shrink-0">
        <div className="flex gap-0 min-w-max px-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'painel'       && <PainelTab mandatoAtivo={mandatoAtivo} membrosAtivos={membrosAtivos} proximaReuniao={proximaReuniao} acoesPendentes={acoesPendentes} reunioes={reunioes} />}
        {activeTab === 'mandatos'     && <MandatosTab mandatos={mandatos} membros={membros} onRefresh={loadAll} toast={toast} />}
        {activeTab === 'reunioes'     && <ReunioesTab mandatos={mandatos} reunioes={reunioes} acoes={acoes} onRefresh={loadAll} toast={toast} />}
        {activeTab === 'eleicoes'     && <EleicoesTab mandatos={mandatos} eleicoes={eleicoes} onRefresh={loadAll} toast={toast} />}
        {activeTab === 'sipat'        && <SipatTab sipats={sipats} atividades={sipatAtividades} onRefresh={loadAll} toast={toast} />}
        {activeTab === 'plano'        && <PlanoTab planos={planos} onRefresh={loadAll} toast={toast} />}
        {activeTab === 'mapa-risco'   && <MapaRiscoTab mapas={mapas} onRefresh={loadAll} toast={toast} />}
        {activeTab === 'informativos' && <InformativosTab informativos={informativos} onRefresh={loadAll} toast={toast} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABA 1 — PAINEL
// ═══════════════════════════════════════════════════════════════════════════

function PainelTab({
  mandatoAtivo, membrosAtivos, proximaReuniao, acoesPendentes, reunioes,
}: {
  mandatoAtivo: CipaMandato | undefined;
  membrosAtivos: CipaMembro[];
  proximaReuniao: CipaReuniao | undefined;
  acoesPendentes: CipaAcao[];
  reunioes: CipaReuniao[];
}) {
  const realizadas = reunioes.filter(r => r.status === 'realizada').length;
  const agendadas  = reunioes.filter(r => r.status === 'agendada').length;

  function diasParaReuniao() {
    if (!proximaReuniao?.data_reuniao) return null;
    // eslint-disable-next-line react-hooks/purity
    const diff = Math.ceil((new Date(proximaReuniao.data_reuniao).getTime() - Date.now()) / 86400000);
    return diff;
  }
  const dias = diasParaReuniao();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Mandato ativo */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Mandato Atual</h2>
        {mandatoAtivo ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-gray-900 dark:text-white">{mandatoAtivo.titulo}</span>
              <StatusBadge status={mandatoAtivo.status} />
            </div>
            <div className="flex gap-6 text-xs text-gray-500 dark:text-gray-400">
              <span>Início: <b className="text-gray-700 dark:text-gray-200">{fmtDate(mandatoAtivo.data_inicio)}</b></span>
              <span>Fim: <b className="text-gray-700 dark:text-gray-200">{fmtDate(mandatoAtivo.data_fim)}</b></span>
              <span>Membros: <b className="text-gray-700 dark:text-gray-200">{membrosAtivos.length}</b></span>
            </div>
            {membrosAtivos.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {['presidente','vice-presidente','secretario'].map(f => {
                  const m = membrosAtivos.find(mb => mb.funcao === f);
                  if (!m) return null;
                  return (
                    <div key={f} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{f}</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{m.nome}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum mandato ativo. Cadastre um na aba Mandatos.</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Calendar} label="Reuniões realizadas" value={String(realizadas)} color="text-green-600 dark:text-green-400" />
        <KpiCard icon={Clock}    label="Agendadas"           value={String(agendadas)}  color="text-blue-600 dark:text-blue-400" />
        <KpiCard icon={AlertCircle} label="Ações pendentes"  value={String(acoesPendentes.length)} color="text-amber-600 dark:text-amber-400" />
        <KpiCard icon={Users}    label="Cipeiros ativos"     value={String(membrosAtivos.length)} color="text-orange-600 dark:text-orange-400" />
      </div>

      {/* Próxima reunião */}
      {proximaReuniao && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">Próxima Reunião</h2>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {proximaReuniao.numero_reuniao}ª Reunião {proximaReuniao.tipo === 'ordinaria' ? 'Ordinária' : 'Extraordinária'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {fmtDate(proximaReuniao.data_reuniao)}{proximaReuniao.horario ? ` às ${proximaReuniao.horario}` : ''}{proximaReuniao.local ? ` — ${proximaReuniao.local}` : ''}
              </p>
            </div>
            {dias !== null && (
              <span className={`text-sm font-bold ${dias <= 3 ? 'text-red-600' : dias <= 7 ? 'text-orange-600' : 'text-gray-600 dark:text-gray-400'}`}>
                {dias === 0 ? 'Hoje' : dias < 0 ? 'Atrasada' : `${dias}d`}
              </span>
            )}
          </div>
          {proximaReuniao.pauta && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 border-t border-orange-200 dark:border-orange-800/50 pt-2">
              <span className="font-medium">Pauta:</span> {proximaReuniao.pauta}
            </p>
          )}
        </div>
      )}

      {/* Ações pendentes */}
      {acoesPendentes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Ações Pendentes ({acoesPendentes.length})</h2>
          <div className="space-y-2">
            {acoesPendentes.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="flex-1 text-gray-700 dark:text-gray-200 truncate">{a.descricao}</span>
                {a.responsavel && <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{a.responsavel}</span>}
                {a.prazo && <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{fmtDate(a.prazo)}</span>}
              </div>
            ))}
            {acoesPendentes.length > 5 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">+{acoesPendentes.length - 5} mais — veja na aba Reuniões</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <Icon className={`w-5 h-5 mb-2 ${color}`} />
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABA 2 — MANDATOS
// ═══════════════════════════════════════════════════════════════════════════

type MandatoForm = {
  titulo: string; ano: string; data_inicio: string; data_fim: string;
  status: 'ativo' | 'encerrado'; observacoes: string;
};
const EMPTY_MANDATO: MandatoForm = { titulo: '', ano: String(new Date().getFullYear()), data_inicio: '', data_fim: '', status: 'ativo', observacoes: '' };

type MembroForm = {
  nome: string; cargo: string; funcao: CipaMembro['funcao'] | ''; tipo: CipaMembro['tipo'] | '';
  email: string; telefone: string;
};
const EMPTY_MEMBRO: MembroForm = { nome: '', cargo: '', funcao: '', tipo: '', email: '', telefone: '' };

function MandatosTab({ mandatos, membros, onRefresh, toast }: {
  mandatos: CipaMandato[];
  membros: CipaMembro[];
  onRefresh: () => Promise<void>;
  toast: (m: string, t?: 'success'|'error') => void;
}) {
  const [selectedMandatoId, setSelectedMandatoId] = useState<string | null>(mandatos[0]?.id ?? null);
  const [showMandatoForm, setShowMandatoForm] = useState(false);
  const [showMembroForm, setShowMembroForm] = useState(false);
  const [editingMandato, setEditingMandato] = useState<CipaMandato | null>(null);
  const [editingMembro, setEditingMembro]   = useState<CipaMembro | null>(null);
  const [mandatoForm, setMandatoForm] = useState<MandatoForm>(EMPTY_MANDATO);
  const [membroForm,  setMembroForm]  = useState<MembroForm>(EMPTY_MEMBRO);
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!selectedMandatoId && mandatos.length > 0) setSelectedMandatoId(mandatos[0].id); }, [mandatos, selectedMandatoId]);

  const selectedMandato = mandatos.find(m => m.id === selectedMandatoId);
  const selectedMembros = membros.filter(m => m.mandato_id === selectedMandatoId);

  function openNewMandato() {
    setEditingMandato(null);
    setMandatoForm(EMPTY_MANDATO);
    setShowMandatoForm(true);
  }
  function openEditMandato(m: CipaMandato) {
    setEditingMandato(m);
    setMandatoForm({ titulo: m.titulo, ano: String(m.ano), data_inicio: m.data_inicio ?? '', data_fim: m.data_fim ?? '', status: m.status, observacoes: m.observacoes ?? '' });
    setShowMandatoForm(true);
  }
  async function saveMandato() {
    if (!supabase) return;
    if (!mandatoForm.titulo.trim()) { toast('Título obrigatório', 'error'); return; }
    setSaving(true);
    const payload = { titulo: mandatoForm.titulo, ano: Number(mandatoForm.ano), data_inicio: mandatoForm.data_inicio || null, data_fim: mandatoForm.data_fim || null, status: mandatoForm.status, observacoes: mandatoForm.observacoes || null };
    if (editingMandato) {
      await supabase.from('cipa_mandatos').update(payload).eq('id', editingMandato.id);
    } else {
      const { data } = await supabase.from('cipa_mandatos').insert([payload]).select().single();
      if (data) setSelectedMandatoId(data.id);
    }
    setShowMandatoForm(false);
    setSaving(false);
    toast(editingMandato ? 'Mandato atualizado' : 'Mandato criado');
    await onRefresh();
  }

  function openNewMembro() {
    setEditingMembro(null);
    setMembroForm(EMPTY_MEMBRO);
    setShowMembroForm(true);
  }
  function openEditMembro(m: CipaMembro) {
    setEditingMembro(m);
    setMembroForm({ nome: m.nome, cargo: m.cargo ?? '', funcao: m.funcao ?? '', tipo: m.tipo ?? '', email: m.email ?? '', telefone: m.telefone ?? '' });
    setShowMembroForm(true);
  }
  async function saveMembro() {
    if (!supabase) return;
    if (!membroForm.nome.trim() || !selectedMandatoId) { toast('Nome obrigatório', 'error'); return; }
    setSaving(true);
    const payload = { mandato_id: selectedMandatoId, nome: membroForm.nome, cargo: membroForm.cargo || null, funcao: (membroForm.funcao || null) as CipaMembro['funcao'], tipo: (membroForm.tipo || null) as CipaMembro['tipo'], email: membroForm.email || null, telefone: membroForm.telefone || null };
    if (editingMembro) {
      await supabase.from('cipa_membros').update(payload).eq('id', editingMembro.id);
    } else {
      await supabase.from('cipa_membros').insert([payload]);
    }
    setShowMembroForm(false);
    setSaving(false);
    toast(editingMembro ? 'Membro atualizado' : 'Membro adicionado');
    await onRefresh();
  }
  async function deleteMembro(id: string) {
    if (!supabase) return;
    await supabase.from('cipa_membros').delete().eq('id', id);
    toast('Membro removido');
    await onRefresh();
  }

  const funcaoOrder = ['presidente','vice-presidente','secretario','membro','suplente'];
  const sortedMembros = [...selectedMembros].sort((a, b) => funcaoOrder.indexOf(a.funcao ?? '') - funcaoOrder.indexOf(b.funcao ?? ''));

  return (
    <div className="max-w-4xl space-y-6">
      {/* Mandatos list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mandatos</h2>
          <button onClick={openNewMandato} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Novo Mandato
          </button>
        </div>
        {mandatos.length === 0 ? (
          <EmptyState icon={Users} text="Nenhum mandato cadastrado" />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {mandatos.map(m => (
              <div
                key={m.id}
                onClick={() => setSelectedMandatoId(m.id)}
                className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${selectedMandatoId === m.id ? 'bg-orange-50 dark:bg-orange-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{m.titulo}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{m.ano} · {fmtDate(m.data_inicio)} – {fmtDate(m.data_fim)}</p>
                </div>
                <StatusBadge status={m.status} />
                <button onClick={e => { e.stopPropagation(); openEditMandato(m); }} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Membros do mandato selecionado */}
      {selectedMandato && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Composição — {selectedMandato.titulo}</h2>
            <button onClick={openNewMembro} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Adicionar Membro
            </button>
          </div>
          {sortedMembros.length === 0 ? (
            <EmptyState icon={Users} text="Nenhum membro cadastrado" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-2.5 text-left font-medium">Nome</th>
                    <th className="px-4 py-2.5 text-left font-medium">Função</th>
                    <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
                    <th className="px-4 py-2.5 text-left font-medium">Cargo na empresa</th>
                    <th className="px-4 py-2.5 text-left font-medium">Contato</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {sortedMembros.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">{m.nome}</td>
                      <td className="px-4 py-2.5 capitalize text-gray-600 dark:text-gray-300">{m.funcao ?? '—'}</td>
                      <td className="px-4 py-2.5 capitalize text-gray-600 dark:text-gray-300">{m.tipo ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{m.cargo ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{m.email ?? m.telefone ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => openEditMembro(m)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => deleteMembro(m.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal mandato */}
      {showMandatoForm && (
        <Modal title={editingMandato ? 'Editar Mandato' : 'Novo Mandato'} onClose={() => setShowMandatoForm(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><FLabel required>Título</FLabel><FInput value={mandatoForm.titulo} onChange={e => setMandatoForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Mandato CIPA 2026" /></div>
            <div><FLabel required>Ano</FLabel><FInput type="number" value={mandatoForm.ano} onChange={e => setMandatoForm(p => ({ ...p, ano: e.target.value }))} /></div>
            <div><FLabel>Status</FLabel><FSelect value={mandatoForm.status} onChange={e => setMandatoForm(p => ({ ...p, status: e.target.value as 'ativo'|'encerrado' }))}><option value="ativo">Ativo</option><option value="encerrado">Encerrado</option></FSelect></div>
            <div><FLabel>Data início</FLabel><FInput type="date" value={mandatoForm.data_inicio} onChange={e => setMandatoForm(p => ({ ...p, data_inicio: e.target.value }))} /></div>
            <div><FLabel>Data fim</FLabel><FInput type="date" value={mandatoForm.data_fim} onChange={e => setMandatoForm(p => ({ ...p, data_fim: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Observações</FLabel><FTextarea rows={2} value={mandatoForm.observacoes} onChange={e => setMandatoForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <ModalButtons onCancel={() => setShowMandatoForm(false)} onSave={saveMandato} saving={saving} />
        </Modal>
      )}

      {/* Modal membro */}
      {showMembroForm && (
        <Modal title={editingMembro ? 'Editar Membro' : 'Adicionar Membro'} onClose={() => setShowMembroForm(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><FLabel required>Nome</FLabel><FInput value={membroForm.nome} onChange={e => setMembroForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><FLabel>Função na CIPA</FLabel><FSelect value={membroForm.funcao ?? ''} onChange={e => setMembroForm(p => ({ ...p, funcao: e.target.value as MembroForm['funcao'] }))}><option value="">Selecione</option><option value="presidente">Presidente</option><option value="vice-presidente">Vice-presidente</option><option value="secretario">Secretário</option><option value="membro">Membro</option><option value="suplente">Suplente</option></FSelect></div>
            <div><FLabel>Tipo</FLabel><FSelect value={membroForm.tipo ?? ''} onChange={e => setMembroForm(p => ({ ...p, tipo: e.target.value as MembroForm['tipo'] }))}><option value="">Selecione</option><option value="empregador">Indicado pelo empregador</option><option value="eleito">Eleito pelos trabalhadores</option></FSelect></div>
            <div><FLabel>Cargo na empresa</FLabel><FInput value={membroForm.cargo} onChange={e => setMembroForm(p => ({ ...p, cargo: e.target.value }))} /></div>
            <div><FLabel>E-mail</FLabel><FInput type="email" value={membroForm.email} onChange={e => setMembroForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Telefone</FLabel><FInput value={membroForm.telefone} onChange={e => setMembroForm(p => ({ ...p, telefone: e.target.value }))} /></div>
          </div>
          <ModalButtons onCancel={() => setShowMembroForm(false)} onSave={saveMembro} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABA 3 — REUNIÕES
// ═══════════════════════════════════════════════════════════════════════════

type ReuniaoForm = {
  mandato_id: string; numero_reuniao: string; tipo: 'ordinaria'|'extraordinaria';
  data_reuniao: string; horario: string; local: string; pauta: string;
  deliberacoes: string; proxima_reuniao: string; status: 'agendada'|'realizada'|'cancelada'; arquivo_url: string;
};
const EMPTY_REUNIAO: ReuniaoForm = { mandato_id: '', numero_reuniao: '', tipo: 'ordinaria', data_reuniao: '', horario: '', local: '', pauta: '', deliberacoes: '', proxima_reuniao: '', status: 'agendada', arquivo_url: '' };

type AcaoForm = { descricao: string; responsavel: string; prazo: string; status: 'pendente'|'concluido'|'cancelado' };
const EMPTY_ACAO: AcaoForm = { descricao: '', responsavel: '', prazo: '', status: 'pendente' };

function ReunioesTab({ mandatos, reunioes, acoes, onRefresh, toast }: {
  mandatos: CipaMandato[]; reunioes: CipaReuniao[]; acoes: CipaAcao[];
  onRefresh: () => Promise<void>;
  toast: (m: string, t?: 'success'|'error') => void;
}) {
  const [showForm, setShowForm]       = useState(false);
  const [showAcaoForm, setShowAcaoForm] = useState(false);
  const [editing, setEditing]         = useState<CipaReuniao | null>(null);
  const [editingAcao, setEditingAcao] = useState<CipaAcao | null>(null);
  const [form, setForm]               = useState<ReuniaoForm>(EMPTY_REUNIAO);
  const [acaoForm, setAcaoForm]       = useState<AcaoForm>(EMPTY_ACAO);
  const [selectedReuniaoId, setSelectedReuniaoId] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [ataFile, setAtaFile]         = useState<File | null>(null);

  function openNew() {
    const mandatoAtivo = mandatos.find(m => m.status === 'ativo');
    setEditing(null);
    setForm({ ...EMPTY_REUNIAO, mandato_id: mandatoAtivo?.id ?? mandatos[0]?.id ?? '' });
    setAtaFile(null);
    setShowForm(true);
  }
  function openEdit(r: CipaReuniao) {
    setEditing(r);
    setForm({ mandato_id: r.mandato_id ?? '', numero_reuniao: String(r.numero_reuniao ?? ''), tipo: r.tipo, data_reuniao: r.data_reuniao ?? '', horario: r.horario ?? '', local: r.local ?? '', pauta: r.pauta ?? '', deliberacoes: r.deliberacoes ?? '', proxima_reuniao: r.proxima_reuniao ?? '', status: r.status, arquivo_url: r.arquivo_url ?? '' });
    setAtaFile(null);
    setShowForm(true);
  }
  async function saveReuniao() {
    if (!supabase) return;
    if (!form.data_reuniao) { toast('Data obrigatória', 'error'); return; }
    setSaving(true);
    let arquivo_url = form.arquivo_url;
    if (ataFile) {
      const path = `atas/${Date.now()}-${ataFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('cipa-docs').upload(path, ataFile, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('cipa-docs').getPublicUrl(path);
        arquivo_url = urlData?.publicUrl ?? arquivo_url;
      } else {
        toast('Erro ao enviar arquivo', 'error');
      }
    }
    const payload = { mandato_id: form.mandato_id || null, numero_reuniao: form.numero_reuniao ? Number(form.numero_reuniao) : null, tipo: form.tipo, data_reuniao: form.data_reuniao, horario: form.horario || null, local: form.local || null, pauta: form.pauta || null, deliberacoes: form.deliberacoes || null, proxima_reuniao: form.proxima_reuniao || null, status: form.status, arquivo_url: arquivo_url || null };
    if (editing) await supabase.from('cipa_reunioes').update(payload).eq('id', editing.id);
    else await supabase.from('cipa_reunioes').insert([payload]);
    setShowForm(false); setAtaFile(null);
    setSaving(false);
    toast(editing ? 'Reunião atualizada' : 'Reunião criada');
    await onRefresh();
  }

  function openNewAcao(reuniaoId: string) {
    setSelectedReuniaoId(reuniaoId);
    setEditingAcao(null);
    setAcaoForm(EMPTY_ACAO);
    setShowAcaoForm(true);
  }
  function openEditAcao(a: CipaAcao) {
    setEditingAcao(a);
    setAcaoForm({ descricao: a.descricao, responsavel: a.responsavel ?? '', prazo: a.prazo ?? '', status: a.status });
    setShowAcaoForm(true);
  }
  async function saveAcao() {
    if (!supabase) return;
    if (!acaoForm.descricao.trim()) { toast('Descrição obrigatória', 'error'); return; }
    setSaving(true);
    const payload = { reuniao_id: editingAcao?.reuniao_id ?? selectedReuniaoId, descricao: acaoForm.descricao, responsavel: acaoForm.responsavel || null, prazo: acaoForm.prazo || null, status: acaoForm.status };
    if (editingAcao) await supabase.from('cipa_reuniao_acoes').update(payload).eq('id', editingAcao.id);
    else await supabase.from('cipa_reuniao_acoes').insert([payload]);
    setShowAcaoForm(false);
    setSaving(false);
    toast(editingAcao ? 'Ação atualizada' : 'Ação criada');
    await onRefresh();
  }
  async function deleteReuniao(id: string) {
    if (!supabase) return;
    await supabase.from('cipa_reunioes').delete().eq('id', id);
    toast('Reunião removida');
    await onRefresh();
  }
  async function deleteAcao(id: string) {
    if (!supabase) return;
    await supabase.from('cipa_reuniao_acoes').delete().eq('id', id);
    toast('Ação removida');
    await onRefresh();
  }
  async function toggleAcaoStatus(a: CipaAcao) {
    if (!supabase) return;
    const next = a.status === 'pendente' ? 'concluido' : 'pendente';
    await supabase.from('cipa_reuniao_acoes').update({ status: next }).eq('id', a.id);
    await onRefresh();
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex justify-end">
        <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors">
          <Plus className="w-4 h-4" /> Nova Reunião
        </button>
      </div>

      {reunioes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <EmptyState icon={Calendar} text="Nenhuma reunião cadastrada" />
        </div>
      ) : (
        <div className="space-y-3">
          {reunioes.map(r => {
            const reuniaoAcoes = acoes.filter(a => a.reuniao_id === r.id);
            const expanded = expandedId === r.id;
            return (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {r.numero_reuniao ? `${r.numero_reuniao}ª ` : ''}{r.tipo === 'ordinaria' ? 'Reunião Ordinária' : 'Reunião Extraordinária'}
                      </p>
                      <StatusBadge status={r.status} />
                      {reuniaoAcoes.length > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{reuniaoAcoes.filter(a => a.status === 'pendente').length}/{reuniaoAcoes.length} ações pendentes</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {fmtDate(r.data_reuniao)}{r.horario ? ` às ${r.horario}` : ''}{r.local ? ` — ${r.local}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={e => { e.stopPropagation(); deleteReuniao(r.id); }} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-4">
                    {r.pauta && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Pauta</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{r.pauta}</p>
                      </div>
                    )}
                    {r.deliberacoes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Deliberações</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{r.deliberacoes}</p>
                      </div>
                    )}
                    {r.proxima_reuniao && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Próxima reunião: <b className="text-gray-700 dark:text-gray-200">{fmtDate(r.proxima_reuniao)}</b></p>
                    )}
                    {r.arquivo_url && (
                      <a href={r.arquivo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-orange-600 dark:text-orange-400 hover:underline text-sm">
                        <Eye className="w-4 h-4" />Visualizar ata
                      </a>
                    )}

                    {/* Ações */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ações ({reuniaoAcoes.length})</p>
                        <button onClick={() => openNewAcao(r.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                          <Plus className="w-3 h-3" /> Adicionar ação
                        </button>
                      </div>
                      {reuniaoAcoes.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma ação registrada</p>
                      ) : (
                        <div className="space-y-1.5">
                          {reuniaoAcoes.map(a => (
                            <div key={a.id} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                              <button onClick={() => toggleAcaoStatus(a)} className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${a.status === 'concluido' ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-500'}`}>
                                {a.status === 'concluido' && <Check className="w-2.5 h-2.5 text-white" />}
                              </button>
                              <span className={`flex-1 ${a.status === 'concluido' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{a.descricao}</span>
                              {a.responsavel && <span className="text-gray-400 flex-shrink-0">{a.responsavel}</span>}
                              {a.prazo && <span className="text-gray-400 flex-shrink-0">{fmtDate(a.prazo)}</span>}
                              <button onClick={() => openEditAcao(a)} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => deleteAcao(a.id)} className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal reunião */}
      {showForm && (
        <Modal title={editing ? 'Editar Reunião' : 'Nova Reunião'} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div><FLabel>Mandato</FLabel><FSelect value={form.mandato_id} onChange={e => setForm(p => ({ ...p, mandato_id: e.target.value }))}><option value="">Nenhum</option>{mandatos.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}</FSelect></div>
            <div><FLabel>Nº da reunião</FLabel><FInput type="number" value={form.numero_reuniao} onChange={e => setForm(p => ({ ...p, numero_reuniao: e.target.value }))} placeholder="Ex: 1" /></div>
            <div><FLabel>Tipo</FLabel><FSelect value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as 'ordinaria'|'extraordinaria' }))}><option value="ordinaria">Ordinária</option><option value="extraordinaria">Extraordinária</option></FSelect></div>
            <div><FLabel>Status</FLabel><FSelect value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as ReuniaoForm['status'] }))}><option value="agendada">Agendada</option><option value="realizada">Realizada</option><option value="cancelada">Cancelada</option></FSelect></div>
            <div><FLabel required>Data</FLabel><FInput type="date" value={form.data_reuniao} onChange={e => setForm(p => ({ ...p, data_reuniao: e.target.value }))} /></div>
            <div><FLabel>Horário</FLabel><FInput type="time" value={form.horario} onChange={e => setForm(p => ({ ...p, horario: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Local</FLabel><FInput value={form.local} onChange={e => setForm(p => ({ ...p, local: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Pauta</FLabel><FTextarea rows={3} value={form.pauta} onChange={e => setForm(p => ({ ...p, pauta: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Deliberações</FLabel><FTextarea rows={3} value={form.deliberacoes} onChange={e => setForm(p => ({ ...p, deliberacoes: e.target.value }))} /></div>
            <div><FLabel>Próxima reunião</FLabel><FInput type="date" value={form.proxima_reuniao} onChange={e => setForm(p => ({ ...p, proxima_reuniao: e.target.value }))} /></div>
            <div className="col-span-2">
              <FLabel>Ata da reunião (PDF/imagem)</FLabel>
              <div className="mt-1 space-y-1.5">
                {form.arquivo_url && (
                  <a href={form.arquivo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-orange-600 dark:text-orange-400 hover:underline text-sm">
                    <Eye className="w-4 h-4" />Visualizar ata atual
                  </a>
                )}
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 transition-colors">
                  <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{ataFile ? ataFile.name : form.arquivo_url ? 'Trocar arquivo...' : 'Escolher PDF ou imagem...'}</span>
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setAtaFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          </div>
          <ModalButtons onCancel={() => setShowForm(false)} onSave={saveReuniao} saving={saving} />
        </Modal>
      )}

      {/* Modal ação */}
      {showAcaoForm && (
        <Modal title={editingAcao ? 'Editar Ação' : 'Nova Ação'} onClose={() => setShowAcaoForm(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><FLabel required>Descrição</FLabel><FTextarea rows={2} value={acaoForm.descricao} onChange={e => setAcaoForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div><FLabel>Responsável</FLabel><FInput value={acaoForm.responsavel} onChange={e => setAcaoForm(p => ({ ...p, responsavel: e.target.value }))} /></div>
            <div><FLabel>Prazo</FLabel><FInput type="date" value={acaoForm.prazo} onChange={e => setAcaoForm(p => ({ ...p, prazo: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Status</FLabel><FSelect value={acaoForm.status} onChange={e => setAcaoForm(p => ({ ...p, status: e.target.value as AcaoForm['status'] }))}><option value="pendente">Pendente</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option></FSelect></div>
          </div>
          <ModalButtons onCancel={() => setShowAcaoForm(false)} onSave={saveAcao} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABA 4 — ELEIÇÕES
// ═══════════════════════════════════════════════════════════════════════════

type EleicaoForm = {
  mandato_id: string; ano: string; data_eleicao: string; total_votantes: string;
  total_votos: string; status: CipaEleicao['status']; edital_url: string; ata_url: string; observacoes: string;
};
const EMPTY_ELEICAO: EleicaoForm = { mandato_id: '', ano: String(new Date().getFullYear()), data_eleicao: '', total_votantes: '', total_votos: '', status: 'planejada', edital_url: '', ata_url: '', observacoes: '' };

function EleicoesTab({ mandatos, eleicoes, onRefresh, toast }: {
  mandatos: CipaMandato[]; eleicoes: CipaEleicao[];
  onRefresh: () => Promise<void>;
  toast: (m: string, t?: 'success'|'error') => void;
}) {
  // ── Election CRUD ──────────────────────────────────────────────────────────
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<CipaEleicao | null>(null);
  const [form, setForm]           = useState<EleicaoForm>(EMPTY_ELEICAO);
  const [saving, setSaving]       = useState(false);

  // ── Drill-down ─────────────────────────────────────────────────────────────
  const [selectedEleicaoId, setSelectedEleicaoId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'chapas' | 'eleitores' | 'resultados'>('chapas');

  // ── Chapas ─────────────────────────────────────────────────────────────────
  const [chapas, setChapas]             = useState<CipaChapa[]>([]);
  const [showChapaForm, setShowChapaForm] = useState(false);
  const [chapaForm, setChapaForm]       = useState({ nome: '', candidato_titular: '', candidato_suplente: '' });

  // ── Eleitores ──────────────────────────────────────────────────────────────
  const [eleitores, setEleitores]           = useState<CipaEleitor[]>([]);

  // ── Results ────────────────────────────────────────────────────────────────
  const [resultados, setResultados] = useState<Record<string, number>>({});

  // ── Misc ───────────────────────────────────────────────────────────────────
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [origin, setOrigin] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const selectedEleicao = eleicoes.find(e => e.id === selectedEleicaoId) ?? null;

  // ── Load detail data (auto-sync employees as eleitores) ────────────────────
  const loadDetail = useCallback(async (eleicaoId: string) => {
    if (!supabase) return;
    setLoadingDetail(true);
    const [{ data: c }, { data: el }, { data: votos }, { data: emps }] = await Promise.all([
      supabase.from('cipa_chapas').select('*').eq('eleicao_id', eleicaoId).order('numero_chapa'),
      supabase.from('cipa_eleitores').select('*').eq('eleicao_id', eleicaoId).order('nome'),
      supabase.from('cipa_votos').select('chapa_id').eq('eleicao_id', eleicaoId),
      supabase.from('employees').select('id,name,role').eq('status', 'Ativo').order('name'),
    ]);
    setChapas(c ?? []);

    // Auto-sync: add any active employee not yet registered as eleitor
    const jaAdicionados = new Set((el ?? []).map((e: CipaEleitor) => e.nome));
    const novos = (emps ?? []).filter((e: { id: string; name: string }) => !jaAdicionados.has(e.name));
    let elFinal = el ?? [];
    if (novos.length > 0) {
      await supabase.from('cipa_eleitores').insert(novos.map((e: { id: string; name: string }) => ({ eleicao_id: eleicaoId, nome: e.name, employee_id: e.id })));
      const { data: elUpdated } = await supabase.from('cipa_eleitores').select('*').eq('eleicao_id', eleicaoId).order('nome');
      elFinal = elUpdated ?? [];
    }

    // Backfill employee_id for existing eleitores that have it null
    const semEmployeeId = (elFinal).filter((e: CipaEleitor & { employee_id?: string | null }) => !e.employee_id);
    if (semEmployeeId.length > 0 && emps) {
      const empByName: Record<string, string> = {};
      (emps as { id: string; name: string }[]).forEach(e => { empByName[e.name] = e.id; });
      await Promise.all(
        semEmployeeId.map((el: CipaEleitor) => {
          const empId = empByName[el.nome];
          if (!empId) return Promise.resolve();
          return supabase!.from('cipa_eleitores').update({ employee_id: empId }).eq('id', el.id);
        })
      );
      const { data: elUpdated2 } = await supabase.from('cipa_eleitores').select('*').eq('eleicao_id', eleicaoId).order('nome');
      elFinal = elUpdated2 ?? elFinal;
    }

    setEleitores(elFinal);

    const counts: Record<string, number> = {};
    (votos ?? []).forEach((v: { chapa_id: string }) => { counts[v.chapa_id] = (counts[v.chapa_id] ?? 0) + 1; });
    setResultados(counts);
    setLoadingDetail(false);
  }, []);

  function selectEleicao(id: string) {
    setSelectedEleicaoId(id);
    setSubTab('chapas');
    loadDetail(id);
  }

  // ── Status control ─────────────────────────────────────────────────────────
  async function changeStatus(eleicao: CipaEleicao, newStatus: CipaEleicao['status']) {
    if (!supabase) return;
    await supabase.from('cipa_eleicoes').update({ status: newStatus }).eq('id', eleicao.id);
    toast(newStatus === 'em_andamento' ? '✓ Votação aberta!' : '✓ Votação encerrada', 'success');
    await onRefresh();
    loadDetail(eleicao.id);
  }

  // ── Election CRUD ──────────────────────────────────────────────────────────
  function openNew() { setEditing(null); setForm({ ...EMPTY_ELEICAO, mandato_id: '' }); setShowForm(true); }
  function openEdit(e: CipaEleicao) {
    setEditing(e);
    setForm({ mandato_id: e.mandato_id ?? '', ano: String(e.ano), data_eleicao: e.data_eleicao ?? '', total_votantes: '', total_votos: '', status: e.status, edital_url: e.edital_url ?? '', ata_url: e.ata_url ?? '', observacoes: e.observacoes ?? '' });
    setShowForm(true);
  }
  async function save() {
    if (!supabase) return;
    setSaving(true);
    const payload = {
      mandato_id: form.mandato_id || null,
      ano: Number(form.ano),
      data_eleicao: form.data_eleicao || null,
      status: editing ? form.status : 'planejada' as const,
      edital_url: editing ? (form.edital_url || null) : null,
      ata_url: editing ? (form.ata_url || null) : null,
      observacoes: form.observacoes || null,
    };
    if (editing) {
      await supabase.from('cipa_eleicoes').update(payload).eq('id', editing.id);
      setShowForm(false); setSaving(false);
      toast('Eleição atualizada');
      await onRefresh();
    } else {
      const { data: row } = await supabase.from('cipa_eleicoes').insert([payload]).select('id').single();
      setShowForm(false); setSaving(false);
      toast('Eleição criada! Adicione chapas e eleitores.', 'success');
      await onRefresh();
      if (row?.id) selectEleicao(row.id);
    }
  }
  async function del(id: string) { if (!supabase) return; await supabase.from('cipa_eleicoes').delete().eq('id', id); toast('Removido'); await onRefresh(); }

  // ── Chapa CRUD ─────────────────────────────────────────────────────────────
  async function saveChapa() {
    if (!supabase || !selectedEleicaoId || !chapaForm.candidato_titular.trim()) return;
    setSaving(true);
    const nextNum = chapas.length > 0 ? Math.max(...chapas.map(c => c.numero_chapa)) + 1 : 1;
    await supabase.from('cipa_chapas').insert([{
      eleicao_id: selectedEleicaoId,
      numero_chapa: nextNum,
      nome: chapaForm.nome.trim() || null,
      candidato_titular: chapaForm.candidato_titular.trim(),
      candidato_suplente: chapaForm.candidato_suplente.trim() || null,
    }]);
    setShowChapaForm(false);
    setChapaForm({ nome: '', candidato_titular: '', candidato_suplente: '' });
    setSaving(false);
    toast('Chapa registrada');
    await loadDetail(selectedEleicaoId);
  }
  async function deleteChapa(id: string) {
    if (!supabase || !selectedEleicaoId) return;
    await supabase.from('cipa_chapas').delete().eq('id', id);
    toast('Chapa removida');
    await loadDetail(selectedEleicaoId);
  }

  // ── Eleitor CRUD ───────────────────────────────────────────────────────────
  async function deleteEleitor(id: string) {
    if (!supabase || !selectedEleicaoId) return;
    await supabase.from('cipa_eleitores').delete().eq('id', id);
    toast('Eleitor removido');
    await loadDetail(selectedEleicaoId);
  }

  // ── Print QR Code (único por eleição) ─────────────────────────────────────
  function printQrCodes() {
    if (!selectedEleicao || !selectedEleicaoId || !origin) return;
    const url = `${origin}/votar/eleicao/${selectedEleicaoId}`;
    const html = `<!doctype html><html><head><title>QR Code Votação CIPA ${selectedEleicao.ano}</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:40px;background:#fff;color:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh}
  h2{text-align:center;margin-bottom:4px;font-size:28px}
  p.sub{text-align:center;color:#666;margin:0 0 32px;font-size:16px}
  .box{border:3px solid #ea580c;border-radius:16px;padding:32px;text-align:center;max-width:420px}
  .url{font-size:11px;color:#888;margin-top:16px;word-break:break-all;font-family:monospace}
  .inst{margin-top:20px;font-size:14px;color:#444;line-height:1.6}
  img{display:block;margin:0 auto}
  @media print{body{padding:24px}}
</style></head><body>
<div class="box">
  <h2>Eleição CIPA ${selectedEleicao.ano}</h2>
  <p class="sub">Escaneie para votar</p>
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&color=000000&bgcolor=ffffff&margin=10" width="280" height="280" alt="QR Code Votação" />
  <div class="url">${url}</div>
  <div class="inst">
    1. Aponte a câmera do celular para o QR Code<br>
    2. Informe seu CPF e nome completo<br>
    3. Escolha sua chapa e confirme o voto
  </div>
</div>
<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),400)})<\/script>
</body></html>`;
    const pw = window.open('', '_blank');
    if (!pw) { toast('Permita pop-ups para imprimir', 'error'); return; }
    pw.document.write(html);
    pw.document.close();
  }

  // ── Total votes helper ─────────────────────────────────────────────────────
  const totalVotos = Object.values(resultados).reduce((a, b) => a + b, 0);
  const maxVotos   = Math.max(1, ...Object.values(resultados));

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (!selectedEleicaoId) return (
    <div className="max-w-4xl space-y-4">
      <div className="flex justify-end">
        <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"><Plus className="w-4 h-4" /> Nova Eleição</button>
      </div>
      {eleicoes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState icon={Vote} text="Nenhuma eleição registrada" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 text-left font-medium">Ano</th>
              <th className="px-4 py-3 text-left font-medium">Data</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Votantes</th>
              <th className="px-4 py-3 text-left font-medium">Votos</th>
              <th className="px-4 py-3 text-left font-medium">Mandato</th>
              <th className="px-4 py-3 text-left font-medium">Ações</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {eleicoes.map(e => {
                const mandato = mandatos.find(m => m.id === e.mandato_id);
                return (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">{e.ano}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtDate(e.data_eleicao)}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.total_votantes ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.total_votos ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{mandato?.titulo ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => selectEleicao(e.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                        >
                          Gerenciar <ChevronRight className="w-3 h-3" />
                        </button>
                        <button onClick={() => openEdit(e)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => del(e.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <Modal title={editing ? 'Editar Eleição' : 'Nova Eleição'} onClose={() => setShowForm(false)}>
          {!editing && (
            <div className="mb-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-3 text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
              Depois de criar, você será levado direto para gerenciar a eleição — onde adiciona as <strong>chapas</strong>, os <strong>eleitores</strong> e gera os <strong>QR Codes</strong>.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><FLabel required>Ano</FLabel><FInput type="number" value={form.ano} onChange={e => setForm(p => ({ ...p, ano: e.target.value }))} autoFocus /></div>
            <div><FLabel>Data da eleição</FLabel><FInput type="date" value={form.data_eleicao} onChange={e => setForm(p => ({ ...p, data_eleicao: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Mandato vinculado</FLabel><FSelect value={form.mandato_id} onChange={e => setForm(p => ({ ...p, mandato_id: e.target.value }))}><option value="">Nenhum (definir depois)</option>{mandatos.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}</FSelect></div>
            {editing && (
              <>
                <div><FLabel>Status</FLabel><FSelect value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as EleicaoForm['status'] }))}><option value="planejada">Planejada</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option></FSelect></div>
                <div></div>
                <div><FLabel>URL do edital</FLabel><FInput value={form.edital_url} onChange={e => setForm(p => ({ ...p, edital_url: e.target.value }))} placeholder="https://..." /></div>
                <div><FLabel>URL da ata</FLabel><FInput value={form.ata_url} onChange={e => setForm(p => ({ ...p, ata_url: e.target.value }))} placeholder="https://..." /></div>
              </>
            )}
            <div className="col-span-2"><FLabel>Observações</FLabel><FTextarea rows={2} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <ModalButtons onCancel={() => setShowForm(false)} onSave={save} saving={saving} saveLabel={editing ? 'Salvar' : 'Criar Eleição'} />
        </Modal>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-4xl space-y-4" ref={printRef}>

      {/* Breadcrumb + header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => { setSelectedEleicaoId(null); }} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors mb-1">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Eleições
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Eleição CIPA {selectedEleicao?.ano}
            {selectedEleicao && <StatusBadge status={selectedEleicao.status} />}
          </h2>
          {selectedEleicao?.data_eleicao && (
            <p className="text-xs text-gray-500 mt-0.5">{fmtDate(selectedEleicao.data_eleicao)}</p>
          )}
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-2">
          {selectedEleicao?.status === 'planejada' && (
            <button
              onClick={() => changeStatus(selectedEleicao, 'em_andamento')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              <Vote className="w-3.5 h-3.5" /> Abrir Votação
            </button>
          )}
          {selectedEleicao?.status === 'em_andamento' && (
            <button
              onClick={() => changeStatus(selectedEleicao, 'concluida')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Encerrar Votação
            </button>
          )}
          {selectedEleicao && (
            <button
              onClick={() => openEdit(selectedEleicao)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          )}
          <button
            onClick={() => { if (selectedEleicaoId) loadDetail(selectedEleicaoId); }}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDetail ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {selectedEleicao && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-2xl font-black text-orange-600">{chapas.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Chapas</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-2xl font-black text-blue-600">{eleitores.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Eleitores</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-2xl font-black text-green-600">{totalVotos}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Votos {eleitores.length > 0 && <span className="text-gray-400">({Math.round(totalVotos / eleitores.length * 100)}%)</span>}
            </p>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {([
            { id: 'chapas',    label: 'Chapas',    icon: Users },
            { id: 'eleitores', label: 'Eleitores', icon: UserCheck },
            { id: 'resultados', label: 'Resultados', icon: BarChart2 },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSubTab(id)}
              className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                subTab === id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* ── Chapas ──────────────────────────────────────────────────── */}
          {subTab === 'chapas' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => { setChapaForm({ nome: '', candidato_titular: '', candidato_suplente: '' }); setShowChapaForm(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Nova Chapa
                </button>
              </div>
              {chapas.length === 0 ? (
                <EmptyState icon={Users} text="Nenhuma chapa registrada" />
              ) : (
                <div className="space-y-2">
                  {chapas.map(chapa => (
                    <div key={chapa.id} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 font-black text-lg flex items-center justify-center flex-shrink-0">
                        {String(chapa.numero_chapa).padStart(2, '0')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                          {chapa.nome ?? `Chapa ${String(chapa.numero_chapa).padStart(2, '0')}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{chapa.candidato_titular}</p>
                        {chapa.candidato_suplente && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">Suplente: {chapa.candidato_suplente}</p>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                        {resultados[chapa.id] ?? 0} voto{(resultados[chapa.id] ?? 0) !== 1 ? 's' : ''}
                      </div>
                      <button onClick={() => deleteChapa(chapa.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Eleitores ───────────────────────────────────────────────── */}
          {subTab === 'eleitores' && (
            <div className="space-y-4">

              {/* QR Code único da eleição */}
              {origin && selectedEleicaoId && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl p-2 border border-orange-200 dark:border-orange-700">
                      <QRCodeSVG
                        value={`${origin}/votar/eleicao/${selectedEleicaoId}`}
                        size={100}
                        includeMargin={false}
                        level="M"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">QR Code da Votação</p>
                      <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5 mb-2">
                        Exiba ou imprima este QR. O eleitor escaneia, digita CPF + nome e vota.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all leading-tight">
                        {`${origin}/votar/eleicao/${selectedEleicaoId}`}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={printQrCodes}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> Imprimir QR
                        </button>
                        <a
                          href={`${origin}/votar/eleicao/${selectedEleicaoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 text-xs font-medium hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Abrir link
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Header: contagem */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {eleitores.filter(e => e.votou).length}/{eleitores.length} votaram
                </p>
              </div>

              {eleitores.length === 0 ? (
                <EmptyState icon={UserCheck} text="Nenhum eleitor registrado" />
              ) : (
                <div className="space-y-1.5">
                  {eleitores.map(el => (
                    <div key={el.id} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                      {/* Vote status dot */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${el.votou ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{el.nome}</p>
                        <p className="text-xs text-gray-400">{el.votou ? `Votou em ${fmtDate(el.data_voto)}` : 'Aguardando voto'}</p>
                      </div>
                      <button onClick={() => deleteEleitor(el.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Resultados ──────────────────────────────────────────────── */}
          {subTab === 'resultados' && (
            <div className="space-y-4">
              {chapas.length === 0 ? (
                <EmptyState icon={BarChart2} text="Nenhuma chapa registrada" />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Apuração — {totalVotos} voto{totalVotos !== 1 ? 's' : ''} computado{totalVotos !== 1 ? 's' : ''}
                    </p>
                    {eleitores.length > 0 && (
                      <span className="text-xs text-gray-500">
                        Participação: {Math.round(totalVotos / eleitores.length * 100)}%
                        ({eleitores.filter(e => e.votou).length}/{eleitores.length})
                      </span>
                    )}
                  </div>

                  {/* Sort chapas by votes descending */}
                  {[...chapas]
                    .sort((a, b) => (resultados[b.id] ?? 0) - (resultados[a.id] ?? 0))
                    .map((chapa, idx) => {
                      const votes = resultados[chapa.id] ?? 0;
                      const pct = totalVotos > 0 ? Math.round(votes / totalVotos * 100) : 0;
                      const barW = maxVotos > 0 ? Math.round(votes / maxVotos * 100) : 0;
                      const isLeading = idx === 0 && votes > 0;
                      return (
                        <div key={chapa.id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isLeading && <span className="text-xs">🏆</span>}
                              <span className={`text-sm font-semibold ${isLeading ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                Chapa {String(chapa.numero_chapa).padStart(2, '0')} — {chapa.candidato_titular}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                              {votes} voto{votes !== 1 ? 's' : ''} <span className="text-xs font-normal text-gray-400">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isLeading ? 'bg-orange-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                              style={{ width: `${barW}%` }}
                            />
                          </div>
                          {chapa.candidato_suplente && (
                            <p className="text-xs text-gray-400">Suplente: {chapa.candidato_suplente}</p>
                          )}
                        </div>
                      );
                    })}

                  {/* Blank votes info */}
                  {totalVotos === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhum voto registrado ainda</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showForm && editing && (
        <Modal title="Editar Eleição" onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div><FLabel required>Ano</FLabel><FInput type="number" value={form.ano} onChange={e => setForm(p => ({ ...p, ano: e.target.value }))} autoFocus /></div>
            <div><FLabel>Data da eleição</FLabel><FInput type="date" value={form.data_eleicao} onChange={e => setForm(p => ({ ...p, data_eleicao: e.target.value }))} /></div>
            <div><FLabel>Status</FLabel><FSelect value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as EleicaoForm['status'] }))}><option value="planejada">Planejada</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option></FSelect></div>
            <div><FLabel>Mandato</FLabel><FSelect value={form.mandato_id} onChange={e => setForm(p => ({ ...p, mandato_id: e.target.value }))}><option value="">Nenhum</option>{mandatos.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}</FSelect></div>
            <div><FLabel>URL do edital</FLabel><FInput value={form.edital_url} onChange={e => setForm(p => ({ ...p, edital_url: e.target.value }))} placeholder="https://..." /></div>
            <div><FLabel>URL da ata</FLabel><FInput value={form.ata_url} onChange={e => setForm(p => ({ ...p, ata_url: e.target.value }))} placeholder="https://..." /></div>
            <div className="col-span-2"><FLabel>Observações</FLabel><FTextarea rows={2} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <ModalButtons onCancel={() => setShowForm(false)} onSave={save} saving={saving} />
        </Modal>
      )}

      {showChapaForm && (
        <Modal title="Nova Chapa" onClose={() => setShowChapaForm(false)}>
          <div className="space-y-3">
            <div>
              <FLabel required>Nome da Chapa</FLabel>
              <FInput
                placeholder="Ex: Chapa Verde, Chapa Roberto, Chapa Azul…"
                value={chapaForm.nome}
                onChange={e => setChapaForm(p => ({ ...p, nome: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <FLabel required>Candidato Titular</FLabel>
              <FInput
                placeholder="Nome completo do titular"
                value={chapaForm.candidato_titular}
                onChange={e => setChapaForm(p => ({ ...p, candidato_titular: e.target.value }))}
              />
            </div>
            <div>
              <FLabel>Candidato Suplente</FLabel>
              <FInput
                placeholder="Nome completo do suplente (opcional)"
                value={chapaForm.candidato_suplente}
                onChange={e => setChapaForm(p => ({ ...p, candidato_suplente: e.target.value }))}
              />
            </div>
            <p className="text-xs text-gray-400">Nº da chapa atribuído automaticamente ({chapas.length + 1}).</p>
          </div>
          <ModalButtons onCancel={() => setShowChapaForm(false)} onSave={saveChapa} saving={saving} saveLabel="Registrar Chapa" />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABA 5 — SIPAT
// ═══════════════════════════════════════════════════════════════════════════

type SipatForm = { ano: string; data_inicio: string; data_fim: string; tema: string; status: CipaSipat['status']; observacoes: string };
const EMPTY_SIPAT: SipatForm = { ano: String(new Date().getFullYear()), data_inicio: '', data_fim: '', tema: '', status: 'planejada', observacoes: '' };

type AtivForm = { titulo: string; data: string; horario: string; local: string; palestrante: string; participantes_estimados: string; participantes_real: string; status: CipaSipatAtividade['status'] };
const EMPTY_ATIV: AtivForm = { titulo: '', data: '', horario: '', local: '', palestrante: '', participantes_estimados: '', participantes_real: '', status: 'planejada' };

function SipatTab({ sipats, atividades, onRefresh, toast }: {
  sipats: CipaSipat[]; atividades: CipaSipatAtividade[];
  onRefresh: () => Promise<void>;
  toast: (m: string, t?: 'success'|'error') => void;
}) {
  const [showForm, setShowForm]     = useState(false);
  const [showAtivForm, setShowAtivForm] = useState(false);
  const [editing, setEditing]       = useState<CipaSipat | null>(null);
  const [editingAtiv, setEditingAtiv] = useState<CipaSipatAtividade | null>(null);
  const [form, setForm]             = useState<SipatForm>(EMPTY_SIPAT);
  const [ativForm, setAtivForm]     = useState<AtivForm>(EMPTY_ATIV);
  const [selectedSipatId, setSelectedSipatId] = useState<string | null>(sipats[0]?.id ?? null);
  const [saving, setSaving]         = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!selectedSipatId && sipats.length > 0) setSelectedSipatId(sipats[0].id); }, [sipats, selectedSipatId]);

  async function saveSipat() {
    if (!supabase) return;
    setSaving(true);
    const payload = { ano: Number(form.ano), data_inicio: form.data_inicio || null, data_fim: form.data_fim || null, tema: form.tema || null, status: form.status, observacoes: form.observacoes || null };
    if (editing) await supabase.from('cipa_sipat').update(payload).eq('id', editing.id);
    else { const { data } = await supabase.from('cipa_sipat').insert([payload]).select().single(); if (data) setSelectedSipatId(data.id); }
    setShowForm(false); setSaving(false);
    toast(editing ? 'SIPAT atualizada' : 'SIPAT criada');
    await onRefresh();
  }
  async function saveAtiv() {
    if (!supabase) return;
    if (!ativForm.titulo.trim() || !selectedSipatId) { toast('Título obrigatório', 'error'); return; }
    setSaving(true);
    const payload = { sipat_id: editingAtiv?.sipat_id ?? selectedSipatId, titulo: ativForm.titulo, data: ativForm.data || null, horario: ativForm.horario || null, local: ativForm.local || null, palestrante: ativForm.palestrante || null, participantes_estimados: ativForm.participantes_estimados ? Number(ativForm.participantes_estimados) : null, participantes_real: ativForm.participantes_real ? Number(ativForm.participantes_real) : null, status: ativForm.status };
    if (editingAtiv) await supabase.from('cipa_sipat_atividades').update(payload).eq('id', editingAtiv.id);
    else await supabase.from('cipa_sipat_atividades').insert([payload]);
    setShowAtivForm(false); setSaving(false);
    toast(editingAtiv ? 'Atividade atualizada' : 'Atividade criada');
    await onRefresh();
  }
  async function delSipat(id: string) { if (!supabase) return; await supabase.from('cipa_sipat').delete().eq('id', id); toast('SIPAT removida'); await onRefresh(); }
  async function delAtiv(id: string) { if (!supabase) return; await supabase.from('cipa_sipat_atividades').delete().eq('id', id); toast('Atividade removida'); await onRefresh(); }

  const selectedSipat = sipats.find(s => s.id === selectedSipatId);
  const selectedAtividades = atividades.filter(a => a.sipat_id === selectedSipatId);

  return (
    <div className="max-w-4xl space-y-6">
      {/* SIPATs list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">SIPATs</h2>
          <button onClick={() => { setEditing(null); setForm(EMPTY_SIPAT); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors"><Plus className="w-3.5 h-3.5" /> Nova SIPAT</button>
        </div>
        {sipats.length === 0 ? <EmptyState icon={Megaphone} text="Nenhuma SIPAT cadastrada" /> : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sipats.map(s => (
              <div key={s.id} onClick={() => setSelectedSipatId(s.id)} className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${selectedSipatId === s.id ? 'bg-orange-50 dark:bg-orange-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">SIPAT {s.ano}{s.tema ? ` — ${s.tema}` : ''}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(s.data_inicio)} – {fmtDate(s.data_fim)}</p>
                </div>
                <StatusBadge status={s.status} />
                <button onClick={e => { e.stopPropagation(); setEditing(s); setForm({ ano: String(s.ano), data_inicio: s.data_inicio ?? '', data_fim: s.data_fim ?? '', tema: s.tema ?? '', status: s.status, observacoes: s.observacoes ?? '' }); setShowForm(true); }} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={e => { e.stopPropagation(); delSipat(s.id); }} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Atividades */}
      {selectedSipat && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Atividades — SIPAT {selectedSipat.ano}</h2>
            <button onClick={() => { setEditingAtiv(null); setAtivForm(EMPTY_ATIV); setShowAtivForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors"><Plus className="w-3.5 h-3.5" /> Nova Atividade</button>
          </div>
          {selectedAtividades.length === 0 ? <EmptyState icon={BookOpen} text="Nenhuma atividade cadastrada" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2.5 text-left font-medium">Atividade</th>
                  <th className="px-4 py-2.5 text-left font-medium">Data/Hora</th>
                  <th className="px-4 py-2.5 text-left font-medium">Palestrante</th>
                  <th className="px-4 py-2.5 text-left font-medium">Participantes</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="w-16"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {selectedAtividades.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">{a.titulo}{a.local ? <span className="font-normal text-gray-400"> — {a.local}</span> : ''}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{fmtDate(a.data)}{a.horario ? ` ${a.horario}` : ''}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{a.palestrante ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{a.participantes_real != null ? `${a.participantes_real}/${a.participantes_estimados ?? '?'}` : (a.participantes_estimados != null ? `Prev: ${a.participantes_estimados}` : '—')}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingAtiv(a); setAtivForm({ titulo: a.titulo, data: a.data ?? '', horario: a.horario ?? '', local: a.local ?? '', palestrante: a.palestrante ?? '', participantes_estimados: String(a.participantes_estimados ?? ''), participantes_real: String(a.participantes_real ?? ''), status: a.status }); setShowAtivForm(true); }} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => delAtiv(a.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar SIPAT' : 'Nova SIPAT'} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div><FLabel required>Ano</FLabel><FInput type="number" value={form.ano} onChange={e => setForm(p => ({ ...p, ano: e.target.value }))} /></div>
            <div><FLabel>Status</FLabel><FSelect value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as SipatForm['status'] }))}><option value="planejada">Planejada</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option></FSelect></div>
            <div><FLabel>Data início</FLabel><FInput type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} /></div>
            <div><FLabel>Data fim</FLabel><FInput type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Tema da SIPAT</FLabel><FInput value={form.tema} onChange={e => setForm(p => ({ ...p, tema: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Observações</FLabel><FTextarea rows={2} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <ModalButtons onCancel={() => setShowForm(false)} onSave={saveSipat} saving={saving} />
        </Modal>
      )}
      {showAtivForm && (
        <Modal title={editingAtiv ? 'Editar Atividade' : 'Nova Atividade'} onClose={() => setShowAtivForm(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><FLabel required>Título</FLabel><FInput value={ativForm.titulo} onChange={e => setAtivForm(p => ({ ...p, titulo: e.target.value }))} /></div>
            <div><FLabel>Data</FLabel><FInput type="date" value={ativForm.data} onChange={e => setAtivForm(p => ({ ...p, data: e.target.value }))} /></div>
            <div><FLabel>Horário</FLabel><FInput type="time" value={ativForm.horario} onChange={e => setAtivForm(p => ({ ...p, horario: e.target.value }))} /></div>
            <div><FLabel>Local</FLabel><FInput value={ativForm.local} onChange={e => setAtivForm(p => ({ ...p, local: e.target.value }))} /></div>
            <div><FLabel>Palestrante</FLabel><FInput value={ativForm.palestrante} onChange={e => setAtivForm(p => ({ ...p, palestrante: e.target.value }))} /></div>
            <div><FLabel>Participantes estimados</FLabel><FInput type="number" value={ativForm.participantes_estimados} onChange={e => setAtivForm(p => ({ ...p, participantes_estimados: e.target.value }))} /></div>
            <div><FLabel>Participantes reais</FLabel><FInput type="number" value={ativForm.participantes_real} onChange={e => setAtivForm(p => ({ ...p, participantes_real: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Status</FLabel><FSelect value={ativForm.status} onChange={e => setAtivForm(p => ({ ...p, status: e.target.value as AtivForm['status'] }))}><option value="planejada">Planejada</option><option value="realizada">Realizada</option><option value="cancelada">Cancelada</option></FSelect></div>
          </div>
          <ModalButtons onCancel={() => setShowAtivForm(false)} onSave={saveAtiv} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABA 6 — PLANO DE TRABALHO
// ═══════════════════════════════════════════════════════════════════════════

type PlanoForm = { ano: string; mes: string; atividade_prevista: string; atividade_realizada: string; responsavel: string; status: CipaPlano['status'] };
const EMPTY_PLANO: PlanoForm = { ano: String(new Date().getFullYear()), mes: String(new Date().getMonth() + 1), atividade_prevista: '', atividade_realizada: '', responsavel: '', status: 'pendente' };

function PlanoTab({ planos, onRefresh, toast }: {
  planos: CipaPlano[];
  onRefresh: () => Promise<void>;
  toast: (m: string, t?: 'success'|'error') => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<CipaPlano | null>(null);
  const [form, setForm]         = useState<PlanoForm>(EMPTY_PLANO);
  const [saving, setSaving]     = useState(false);
  const [anoFiltro, setAnoFiltro] = useState(String(new Date().getFullYear()));

  const anos = [...new Set(planos.map(p => p.ano))].sort((a, b) => b - a);
  const filtrados = planos.filter(p => String(p.ano) === anoFiltro);
  const porMes: Record<number, CipaPlano[]> = {};
  filtrados.forEach(p => { if (!porMes[p.mes]) porMes[p.mes] = []; porMes[p.mes].push(p); });

  async function save() {
    if (!supabase) return;
    setSaving(true);
    const payload = { ano: Number(form.ano), mes: Number(form.mes), atividade_prevista: form.atividade_prevista || null, atividade_realizada: form.atividade_realizada || null, responsavel: form.responsavel || null, status: form.status };
    if (editing) await supabase.from('cipa_plano_trabalho').update(payload).eq('id', editing.id);
    else await supabase.from('cipa_plano_trabalho').insert([payload]);
    setShowForm(false); setSaving(false);
    toast(editing ? 'Atividade atualizada' : 'Atividade criada');
    await onRefresh();
  }
  async function del(id: string) { if (!supabase) return; await supabase.from('cipa_plano_trabalho').delete().eq('id', id); toast('Removido'); await onRefresh(); }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Ano:</span>
          <FSelect value={anoFiltro} onChange={e => setAnoFiltro(e.target.value)} style={{ width: 90 }}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
            {!anos.includes(Number(anoFiltro)) && <option value={anoFiltro}>{anoFiltro}</option>}
          </FSelect>
        </div>
        <button onClick={() => { setEditing(null); setForm({ ...EMPTY_PLANO, ano: anoFiltro }); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"><Plus className="w-4 h-4" /> Nova Atividade</button>
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState icon={ClipboardList} text={`Nenhuma atividade para ${anoFiltro}`} /></div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
            const items = porMes[mes];
            if (!items?.length) return null;
            return (
              <div key={mes} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{MESES[mes - 1]}</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map(p => (
                    <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        {p.atividade_prevista && <p className="text-xs text-gray-500 dark:text-gray-400"><span className="font-medium text-gray-600 dark:text-gray-300">Previsto:</span> {p.atividade_prevista}</p>}
                        {p.atividade_realizada && <p className="text-xs text-gray-500 dark:text-gray-400"><span className="font-medium text-gray-600 dark:text-gray-300">Realizado:</span> {p.atividade_realizada}</p>}
                        {p.responsavel && <p className="text-xs text-gray-400 dark:text-gray-500">Resp.: {p.responsavel}</p>}
                      </div>
                      <StatusBadge status={p.status} />
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setEditing(p); setForm({ ano: String(p.ano), mes: String(p.mes), atividade_prevista: p.atividade_prevista ?? '', atividade_realizada: p.atividade_realizada ?? '', responsavel: p.responsavel ?? '', status: p.status }); setShowForm(true); }} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => del(p.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar Atividade' : 'Nova Atividade'} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div><FLabel required>Ano</FLabel><FInput type="number" value={form.ano} onChange={e => setForm(p => ({ ...p, ano: e.target.value }))} /></div>
            <div><FLabel required>Mês</FLabel><FSelect value={form.mes} onChange={e => setForm(p => ({ ...p, mes: e.target.value }))}>{MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}</FSelect></div>
            <div className="col-span-2"><FLabel>Atividade prevista</FLabel><FTextarea rows={2} value={form.atividade_prevista} onChange={e => setForm(p => ({ ...p, atividade_prevista: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Atividade realizada</FLabel><FTextarea rows={2} value={form.atividade_realizada} onChange={e => setForm(p => ({ ...p, atividade_realizada: e.target.value }))} /></div>
            <div><FLabel>Responsável</FLabel><FInput value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} /></div>
            <div><FLabel>Status</FLabel><FSelect value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as PlanoForm['status'] }))}><option value="pendente">Pendente</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option></FSelect></div>
          </div>
          <ModalButtons onCancel={() => setShowForm(false)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABA 7 — MAPA DE RISCO
// ═══════════════════════════════════════════════════════════════════════════

type MapaForm = { ano: string; area: string; descricao: string; arquivo_url: string; data_elaboracao: string; revisao_prevista: string; status: CipaMapaRisco['status'] };
const EMPTY_MAPA: MapaForm = { ano: String(new Date().getFullYear()), area: '', descricao: '', arquivo_url: '', data_elaboracao: '', revisao_prevista: '', status: 'vigente' };

function MapaRiscoTab({ mapas, onRefresh, toast }: {
  mapas: CipaMapaRisco[];
  onRefresh: () => Promise<void>;
  toast: (m: string, t?: 'success'|'error') => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<CipaMapaRisco | null>(null);
  const [form, setForm]         = useState<MapaForm>(EMPTY_MAPA);
  const [saving, setSaving]     = useState(false);
  const [mapaFile, setMapaFile] = useState<File | null>(null);

  async function save() {
    if (!supabase) return;
    if (!form.area.trim()) { toast('Área obrigatória', 'error'); return; }
    setSaving(true);
    let arquivo_url = form.arquivo_url;
    if (mapaFile) {
      const path = `mapas/${Date.now()}-${mapaFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('cipa-docs').upload(path, mapaFile, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('cipa-docs').getPublicUrl(path);
        arquivo_url = urlData?.publicUrl ?? arquivo_url;
      } else {
        toast('Erro ao enviar arquivo', 'error');
      }
    }
    const payload = { ano: Number(form.ano), area: form.area, descricao: form.descricao || null, arquivo_url: arquivo_url || null, data_elaboracao: form.data_elaboracao || null, revisao_prevista: form.revisao_prevista || null, status: form.status };
    if (editing) await supabase.from('cipa_mapa_risco').update(payload).eq('id', editing.id);
    else await supabase.from('cipa_mapa_risco').insert([payload]);
    setShowForm(false); setMapaFile(null); setSaving(false);
    toast(editing ? 'Mapa atualizado' : 'Mapa criado');
    await onRefresh();
  }
  async function del(id: string) { if (!supabase) return; await supabase.from('cipa_mapa_risco').delete().eq('id', id); toast('Removido'); await onRefresh(); }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setForm(EMPTY_MAPA); setMapaFile(null); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors"><Plus className="w-4 h-4" /> Novo Mapa de Risco</button>
      </div>
      {mapas.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState icon={Map} text="Nenhum mapa de risco cadastrado" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 text-left font-medium">Área</th>
              <th className="px-4 py-3 text-left font-medium">Ano</th>
              <th className="px-4 py-3 text-left font-medium">Elaboração</th>
              <th className="px-4 py-3 text-left font-medium">Próx. revisão</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Arquivo</th>
              <th className="w-20"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {mapas.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{m.area}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.ano}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtDate(m.data_elaboracao)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtDate(m.revisao_prevista)}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3">{m.arquivo_url ? <a href={m.arquivo_url} target="_blank" rel="noopener noreferrer" title="Visualizar arquivo" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"><Eye className="w-4 h-4" /></a> : <span className="text-gray-400 text-xs">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(m); setForm({ ano: String(m.ano), area: m.area, descricao: m.descricao ?? '', arquivo_url: m.arquivo_url ?? '', data_elaboracao: m.data_elaboracao ?? '', revisao_prevista: m.revisao_prevista ?? '', status: m.status }); setMapaFile(null); setShowForm(true); }} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del(m.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <Modal title={editing ? 'Editar Mapa de Risco' : 'Novo Mapa de Risco'} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><FLabel required>Área / Setor</FLabel><FInput value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} placeholder="Ex: Almoxarifado, Pátio, Escritório" /></div>
            <div><FLabel required>Ano</FLabel><FInput type="number" value={form.ano} onChange={e => setForm(p => ({ ...p, ano: e.target.value }))} /></div>
            <div><FLabel>Status</FLabel><FSelect value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as MapaForm['status'] }))}><option value="vigente">Vigente</option><option value="em_revisao">Em revisão</option><option value="obsoleto">Obsoleto</option></FSelect></div>
            <div><FLabel>Data de elaboração</FLabel><FInput type="date" value={form.data_elaboracao} onChange={e => setForm(p => ({ ...p, data_elaboracao: e.target.value }))} /></div>
            <div><FLabel>Próxima revisão</FLabel><FInput type="date" value={form.revisao_prevista} onChange={e => setForm(p => ({ ...p, revisao_prevista: e.target.value }))} /></div>
            <div className="col-span-2"><FLabel>Descrição</FLabel><FTextarea rows={2} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div className="col-span-2">
              <FLabel>Arquivo do mapa (PDF/imagem)</FLabel>
              <div className="mt-1 space-y-1.5">
                {form.arquivo_url && (
                  <a href={form.arquivo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-orange-600 dark:text-orange-400 hover:underline text-sm">
                    <Eye className="w-4 h-4" />Visualizar arquivo atual
                  </a>
                )}
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 transition-colors">
                  <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{mapaFile ? mapaFile.name : form.arquivo_url ? 'Trocar arquivo...' : 'Escolher PDF ou imagem...'}</span>
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setMapaFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          </div>
          <ModalButtons onCancel={() => setShowForm(false)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABA 8 — INFORMATIVOS
// ═══════════════════════════════════════════════════════════════════════════

type InfoForm = { titulo: string; categoria: string; arquivo_url: string; data_publicacao: string };
const EMPTY_INFO: InfoForm = { titulo: '', categoria: '', arquivo_url: '', data_publicacao: '' };

function InformativosTab({ informativos, onRefresh, toast }: {
  informativos: CipaInformativo[];
  onRefresh: () => Promise<void>;
  toast: (m: string, t?: 'success'|'error') => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<CipaInformativo | null>(null);
  const [form, setForm]         = useState<InfoForm>(EMPTY_INFO);
  const [saving, setSaving]     = useState(false);
  const [busca, setBusca]       = useState('');
  const [infoFile, setInfoFile] = useState<File | null>(null);

  const categorias = [...new Set(informativos.map(i => i.categoria).filter(Boolean) as string[])].sort();
  const filtrados = busca.trim()
    ? informativos.filter(i => i.titulo.toLowerCase().includes(busca.toLowerCase()) || i.categoria?.toLowerCase().includes(busca.toLowerCase()))
    : informativos;

  async function save() {
    if (!supabase) return;
    if (!form.titulo.trim()) { toast('Título obrigatório', 'error'); return; }
    setSaving(true);
    let arquivo_url = form.arquivo_url;
    if (infoFile) {
      const path = `informativos/${Date.now()}-${infoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('cipa-docs').upload(path, infoFile, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('cipa-docs').getPublicUrl(path);
        arquivo_url = urlData?.publicUrl ?? arquivo_url;
      } else {
        toast('Erro ao enviar arquivo', 'error');
      }
    }
    const payload = { titulo: form.titulo, categoria: form.categoria || null, arquivo_url: arquivo_url || null, data_publicacao: form.data_publicacao || null };
    if (editing) await supabase.from('cipa_informativos').update(payload).eq('id', editing.id);
    else await supabase.from('cipa_informativos').insert([payload]);
    setShowForm(false); setInfoFile(null); setSaving(false);
    toast(editing ? 'Informativo atualizado' : 'Informativo cadastrado');
    await onRefresh();
  }
  async function del(id: string) { if (!supabase) return; await supabase.from('cipa_informativos').delete().eq('id', id); toast('Removido'); await onRefresh(); }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <FInput className="flex-1" placeholder="Buscar informativo..." value={busca} onChange={e => setBusca(e.target.value)} />
        <button onClick={() => { setEditing(null); setForm(EMPTY_INFO); setInfoFile(null); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors whitespace-nowrap"><Plus className="w-4 h-4" /> Novo Informativo</button>
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"><EmptyState icon={Newspaper} text="Nenhum informativo cadastrado" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 text-left font-medium">Título</th>
              <th className="px-4 py-3 text-left font-medium">Categoria</th>
              <th className="px-4 py-3 text-left font-medium">Publicação</th>
              <th className="px-4 py-3 text-left font-medium">Arquivo</th>
              <th className="w-20"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtrados.map(i => (
                <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{i.titulo}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{i.categoria ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtDate(i.data_publicacao)}</td>
                  <td className="px-4 py-3">{i.arquivo_url ? <a href={i.arquivo_url} target="_blank" rel="noopener noreferrer" title="Visualizar arquivo" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"><Eye className="w-4 h-4" /></a> : <span className="text-gray-400 text-xs">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(i); setForm({ titulo: i.titulo, categoria: i.categoria ?? '', arquivo_url: i.arquivo_url ?? '', data_publicacao: i.data_publicacao ?? '' }); setInfoFile(null); setShowForm(true); }} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del(i.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar Informativo' : 'Novo Informativo'} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><FLabel required>Título</FLabel><FInput value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} /></div>
            <div>
              <FLabel>Categoria</FLabel>
              <input list="categorias-list" value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} placeholder="Ex: EPI, Incêndio, Ergonomia" className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400" />
              <datalist id="categorias-list">{categorias.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div><FLabel>Data de publicação</FLabel><FInput type="date" value={form.data_publicacao} onChange={e => setForm(p => ({ ...p, data_publicacao: e.target.value }))} /></div>
            <div className="col-span-2">
              <FLabel>Arquivo do informativo (PDF/imagem)</FLabel>
              <div className="mt-1 space-y-1.5">
                {form.arquivo_url && (
                  <a href={form.arquivo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-orange-600 dark:text-orange-400 hover:underline text-sm">
                    <Eye className="w-4 h-4" />Visualizar arquivo atual
                  </a>
                )}
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 transition-colors">
                  <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{infoFile ? infoFile.name : form.arquivo_url ? 'Trocar arquivo...' : 'Escolher PDF ou imagem...'}</span>
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setInfoFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          </div>
          <ModalButtons onCancel={() => setShowForm(false)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED — Modal
// ═══════════════════════════════════════════════════════════════════════════

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">{children}</div>
      </div>
    </div>
  );
}

function ModalButtons({ onCancel, onSave, saving, saveLabel }: { onCancel: () => void; onSave: () => void; saving: boolean; saveLabel?: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
      <button onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
      <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 transition-colors">
        {saving ? 'Salvando...' : (saveLabel ?? 'Salvar')}
      </button>
    </div>
  );
}
