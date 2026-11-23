'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileCheck2, Plus, Printer, Edit2, CheckCircle2, XCircle,
  PlayCircle, Search, X, Save, Clock, ShieldAlert, Zap,
  Flame, Wind, Anchor,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { WorkPermit, WorkPermitTipo, WorkPermitSubtipo, WorkPermitStatus } from '@/types';

// ─── Template constants (FOR-TR-SMS-042) ─────────────────────────────────────

const RISCOS_COL1 = [
  'Trabalho em Altura',
  'Queda em Diferença de Nível',
  'Espaço Confinado',
  'Produtos Inflamáveis / Combustíveis',
  'Trabalho com Eletricidade',
  'Ruído',
  'Movimentação de Cargas',
  'Incêndio / Explosão',
  'Construção Civil / Infra Estrutura',
  'Choque Elétrico',
  'Queda de Objetos em Geral',
  'Presença de Vapores Químicos',
  'Manipulação de Produtos Químicos',
  'Movimentação Manual de Cargas',
  'Utilização de Máquinas / Equipamentos',
];

const RISCOS_COL2 = [
  'Trabalho em Andaimes / Queda',
  'Utilização de Escadas / Queda',
  'Radiação Não Ionizante',
  'Queda de Homem ao Mar',
  'Exposição a Fumos Metálicos',
  'Exposição a Poeira Metálica',
  'Exposição ao Sol',
  'Exposição à Animais Peçonhentos',
  'Trabalho a Quente',
  'Utilização de Ferramentas Rotativas',
  'Trabalhos Simultâneos',
  'Utilização de Mangotes / Rompimento',
  'Vazamento / Derramamento',
  'Atropelamento',
  'Emissão de Resíduos',
];

const RISCOS_COL3 = [
  'Incompatibilidade Química',
  'Utilização de Ferramentas Manuais',
  'Rompimento de Tubulações / Mangotes',
  'Utilização de Equipamentos Suspensos',
  'Utilização de Equipamentos Pneumáticos',
  'Utilização / Contato c/ Equip. Energizados',
  'Circulação de Pedestres',
  'Atividades Manuais',
  'Materiais Espalhados pela Área',
  'Projeção de Fragmentos',
];

const ALL_RISCOS = [...RISCOS_COL1, ...RISCOS_COL2, ...RISCOS_COL3];

const EPI_LIST = [
  'Capacete c/ Jugular',
  'Bota de Couro c/ Biqueira',
  'Protetor Auricular Plug ou Concha',
  'Bota PVC',
  'Protetor Facial',
  'Luva para Eletricidade',
  'Máscara Semi Facial p/ Químicos',
  'Filtro de Linha ou Ar Mandado',
  'Luva p/ Químicos',
  'Colete Salva Vidas',
  'Luva de Vaqueta',
  'Luva de Raspa',
  'Luva Pigmentada',
  'Avental PVC',
  'Avental de Raspa',
  'TYVEK',
  'Máscara de Solda',
  'Cinto Tipo Paraquedista',
  'Talabarte em Y',
];

const EPC_LIST = [
  'Balde ou Bacia de Contenção',
  'Cabos de Aterramento',
  'Linha de Vida',
  'Fita Zebrada',
  'Cones para Sinalização',
  'Ferramenta Anti Faísca',
  'Material Absorvente',
  'Mão Amiga',
  'Equip. de Combate a Incêndio',
  'Rádio de Comunicação',
  'Isolamento de Área',
  'Ferramentas Isoladas e Adequadas',
  'Bloqueios / Travamentos',
];

const MEDIDAS_COL1 = [
  'Avaliar o Local Antes da Atividade',
  'Sinalizar e Isolar a Área',
  'Interromper Atividades Simultâneas',
  'Utilizar os EPI Determinados nesta PT',
  'Utilizar os EPC Determinados nesta PT',
  'Inspecionar os Equipamentos / Ferramentas',
  'Realizar o Aterramento',
  'Operadores de Equip. de Movimentação Treinados e Habilitados',
  'Equip. e Acessórios de Movimentação Compatíveis e em Boas Condições',
  'Realizar a Abertura da PET',
  'Para Trab. em Altura: Trabalhador Treinado e Certificado',
  'Para Trab. em Esp. Confinado: Trabalhador Treinado e Certificado',
  'Colaboradores com ASO Atualizado',
  'Desenergizar Sistemas Elétricos',
  'Somente Profissional Habilitado em Instalações Elétricas',
  'Não Transportar Cargas Soltas ou Desamarradas',
  'Inspecionar Condições Gerais das Escadas',
  'Realizar o Travamento Correto do Andaime',
  'Consultar a FISPQ do Produto Químico',
  'Disponibilidade de Chuveiro e Lava Olhos',
  'Não Realizar Trabalho a Quente Próximo a Inflamáveis',
  'Verificar as Condições Climáticas (Sol, Chuva e Vento)',
  'Instalar a Mão Amiga em Mangotes',
  'Instalar Bandejas de Contenção Abaixo de Conexões',
];

const MEDIDAS_COL2 = [
  'Verificar Recipiente para Descarte dos Resíduos',
  'Manter Equipe de Emergência de Prontidão',
  'Manter Equip. de Combate a Incêndio Disponível',
  'Somente Permitir Presença de Pessoas Autorizadas',
  'Manter Produtos Inflamáveis Distantes de Fontes de Ignição',
  'Certificar que Colaboradores Possuem Treinamentos',
  'Não Portar Celular, Tablet ou Outro Eletroeletrônico',
  'Providenciar a Limpeza do Local Após a Atividade',
];

const ALL_MEDIDAS = [...MEDIDAS_COL1, ...MEDIDAS_COL2];

const PET_SUBTIPOS: Record<WorkPermitSubtipo, { label: string; icon: React.ElementType; nr: string }> = {
  altura:    { label: 'Trabalho em Altura', icon: ShieldAlert, nr: 'NR-35' },
  confinado: { label: 'Espaço Confinado',   icon: Wind,        nr: 'NR-33' },
  quente:    { label: 'Trabalho a Quente',  icon: Flame,       nr: 'NR-34' },
  eletrico:  { label: 'Trabalho Elétrico',  icon: Zap,         nr: 'NR-10' },
  icamento:  { label: 'Içamento de Cargas', icon: Anchor,      nr: 'NR-11' },
};

const STATUS_CFG: Record<WorkPermitStatus, { label: string; badgeCls: string }> = {
  emitida:     { label: 'Emitida',     badgeCls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  em_execucao: { label: 'Em Execução', badgeCls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  encerrada:   { label: 'Encerrada',   badgeCls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  cancelada:   { label: 'Cancelada',   badgeCls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

// ─── DB row mapper ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): WorkPermit {
  return {
    id:                   r.id,
    numero:               r.numero,
    tipo:                 r.tipo,
    subtipo:              r.subtipo ?? null,
    dataEmissao:          r.data_emissao,
    horaInicio:           r.hora_inicio,
    horaFimPrevista:      r.hora_fim_prevista,
    unidade:              r.unidade ?? null,
    localTrabalho:        r.local_trabalho,
    descricaoAtividade:   r.descricao_atividade,
    empresaExecutante:    r.empresa_tipo ?? r.empresa_executante ?? null,
    responsavelExecucao:  r.responsavel_execucao,
    equipe:               r.envolvidos ?? r.equipe ?? null,
    riscos:               r.riscos ?? null,
    medidasControle:      r.medidas_controle ?? null,
    episSelecionados:     r.epis_selecionados ?? null,
    autorizadorNome:      r.autorizador_nome ?? null,
    autorizadorFuncao:    r.autorizador_funcao ?? null,
    status:               r.status,
    horaEncerramento:     r.hora_encerramento ?? null,
    observacoes:          r.observacoes ?? null,
    createdAt:            r.created_at,
    updatedAt:            r.updated_at,
  };
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  tipo:                WorkPermitTipo;
  subtipo:             WorkPermitSubtipo | '';
  dataEmissao:         string;
  horaInicio:          string;
  horaFimPrevista:     string;
  unidade:             string;
  empresaTipo:         'Tiger Rentank' | 'Terceiros';
  localTrabalho:       string;
  descricaoAtividade:  string;
  responsavelExecucao: string;
  autorizadorNome:     string;
  autorizadorFuncao:   string;
  riscosSelected:      string[];
  riscosExtra:         string;
  episSelected:        string[];
  epcsSelected:        string[];
  medidasSelected:     string[];
  medidasExtra:        string;
  envolvidos:          string[];  // 8 names
  qsmsNome:            string;
  observacoes:         string;
}

function emptyForm(): FormState {
  return {
    tipo: 'PT', subtipo: '', dataEmissao: todayISO(),
    horaInicio: '', horaFimPrevista: '', unidade: '',
    empresaTipo: 'Tiger Rentank',
    localTrabalho: '', descricaoAtividade: '',
    responsavelExecucao: '', autorizadorNome: '', autorizadorFuncao: '',
    riscosSelected: [], riscosExtra: '',
    episSelected: [], epcsSelected: [],
    medidasSelected: [], medidasExtra: '',
    envolvidos: ['','','','','','','',''],
    qsmsNome: '',
    observacoes: '',
  };
}

function permitToForm(p: WorkPermit): FormState {
  const riscosArr = parseJson<string[]>(p.riscos, []);
  const riscosKnown = riscosArr.filter(r => ALL_RISCOS.includes(r));
  const riscosExtra = riscosArr.filter(r => !ALL_RISCOS.includes(r)).join('\n');

  const medidasArr = parseJson<string[]>(p.medidasControle, []);
  const medidasKnown = medidasArr.filter(m => ALL_MEDIDAS.includes(m));
  const medidasExtra = medidasArr.filter(m => !ALL_MEDIDAS.includes(m)).join('\n');

  const episArr = parseJson<string[]>(p.episSelecionados, []);
  const epcsArr = parseJson<string[]>(
    // new field stored separately — for now fall back to empty
    null, []
  );

  const envolvidosArr = parseJson<{ nome: string }[]>(p.equipe, []);
  const env = Array.from({ length: 8 }, (_, i) => envolvidosArr[i]?.nome ?? '');

  return {
    tipo: p.tipo, subtipo: p.subtipo ?? '',
    dataEmissao: p.dataEmissao, horaInicio: p.horaInicio,
    horaFimPrevista: p.horaFimPrevista, unidade: p.unidade ?? '',
    empresaTipo: (p.empresaExecutante === 'Terceiros' ? 'Terceiros' : 'Tiger Rentank'),
    localTrabalho: p.localTrabalho, descricaoAtividade: p.descricaoAtividade,
    responsavelExecucao: p.responsavelExecucao,
    autorizadorNome: p.autorizadorNome ?? '', autorizadorFuncao: p.autorizadorFuncao ?? '',
    riscosSelected: riscosKnown, riscosExtra,
    episSelected: episArr, epcsSelected: epcsArr,
    medidasSelected: medidasKnown, medidasExtra,
    envolvidos: env,
    qsmsNome: '',
    observacoes: p.observacoes ?? '',
  };
}

// ─── Print ────────────────────────────────────────────────────────────────────

function doPrint(p: WorkPermit, extraData?: {
  epcs: string[]; envolvidos: string[]; qsmsNome: string;
  riscosExtra: string; medidasExtra: string;
}) {
  const riscos = parseJson<string[]>(p.riscos, []);
  const epis   = parseJson<string[]>(p.episSelecionados, []);
  const medidas = parseJson<string[]>(p.medidasControle, []);
  const envArr = extraData?.envolvidos ?? parseJson<{ nome: string }[]>(p.equipe, []).map(e => e.nome);
  const epcs   = extraData?.epcs ?? [];
  const qsmsNome = extraData?.qsmsNome ?? '';

  function chk(list: string[], item: string) {
    return list.includes(item) ? '☑' : '☐';
  }

  function riscoRow(col1: string[], col2: string[], col3: string[]) {
    const maxLen = Math.max(col1.length, col2.length, col3.length);
    return Array.from({ length: maxLen }, (_, i) => `
      <tr>
        <td>${col1[i] ? `${chk(riscos, col1[i])} ${col1[i]}` : ''}</td>
        <td>${col2[i] ? `${chk(riscos, col2[i])} ${col2[i]}` : ''}</td>
        <td>${col3[i] ? `${chk(riscos, col3[i])} ${col3[i]}` : ''}</td>
      </tr>`).join('');
  }

  function epiRows() {
    const half = Math.ceil(EPI_LIST.length / 2);
    const left = EPI_LIST.slice(0, half);
    const right = EPI_LIST.slice(half);
    const maxLen = Math.max(left.length, right.length);
    return Array.from({ length: maxLen }, (_, i) => `
      <tr>
        <td>${left[i] ? `${chk(epis, left[i])} ${left[i]}` : ''}</td>
        <td>${right[i] ? `${chk(epis, right[i])} ${right[i]}` : ''}</td>
        <td style="border-left:1pt solid #333">${EPC_LIST[i] ? `${chk(epcs, EPC_LIST[i])} ${EPC_LIST[i]}` : ''}</td>
      </tr>`).join('');
  }

  function medidasRows() {
    const maxLen = Math.max(MEDIDAS_COL1.length, MEDIDAS_COL2.length);
    return Array.from({ length: maxLen }, (_, i) => `
      <tr>
        <td>${MEDIDAS_COL1[i] ? `${chk(medidas, MEDIDAS_COL1[i])} ${MEDIDAS_COL1[i]}` : ''}</td>
        <td>${MEDIDAS_COL2[i] ? `${chk(medidas, MEDIDAS_COL2[i])} ${MEDIDAS_COL2[i]}` : ''}</td>
      </tr>`).join('');
  }

  const extraRiscos = extraData?.riscosExtra ?? '';
  const extraMedidas = extraData?.medidasExtra ?? '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${p.numero}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 8pt; margin: 0; padding: 10mm; color: #000; }
  h1 { font-size: 10pt; text-align: center; margin: 0; }
  .page-break { page-break-before: always; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4pt; }
  th, td { border: 0.5pt solid #333; padding: 2pt 3pt; vertical-align: top; font-size: 7.5pt; }
  th { background: #d9d9d9; font-weight: bold; text-align: left; }
  .header-table th { text-align: center; vertical-align: middle; }
  .section-title { background: #bfbfbf; font-weight: bold; font-size: 8pt; text-align: center; padding: 2pt; border: 0.5pt solid #333; margin-bottom: 0; }
  .label { font-weight: bold; font-size: 7pt; color: #333; }
  .sig-line { border-bottom: 0.5pt solid #333; height: 18pt; }
  .sig-label { font-size: 6.5pt; text-align: center; }
  @media print {
    body { margin: 0; padding: 8mm; }
    @page { size: A4; margin: 8mm; }
  }
</style>
</head>
<body>

<!-- ══ CABEÇALHO ══ -->
<table class="header-table">
  <tr>
    <td style="width:25%;text-align:center;font-weight:bold;font-size:9pt;">TIGER RENTANK<br>DO BRASIL</td>
    <td style="text-align:center;font-weight:bold;font-size:11pt;">PERMISSÃO PARA TRABALHO — ${p.tipo}${p.subtipo ? ` (${PET_SUBTIPOS[p.subtipo as WorkPermitSubtipo]?.label ?? p.subtipo})` : ''}</td>
    <td style="width:22%;font-size:7pt;">
      FOR-TR-SMS-042<br>Revisão: 02<br>Data: 20/11/2020<br>Página: 1/2
    </td>
  </tr>
</table>

<!-- ══ ABERTURA / ENCERRAMENTO ══ -->
<table>
  <tr>
    <th colspan="4" style="background:#bfbfbf;">ABERTURA</th>
    <th colspan="2" style="background:#bfbfbf;">ENCERRAMENTO</th>
  </tr>
  <tr>
    <td><span class="label">Nº PT:</span><br>${p.numero}</td>
    <td><span class="label">Data:</span><br>${fmtDate(p.dataEmissao)}</td>
    <td><span class="label">Hora Início:</span><br>${p.horaInicio}</td>
    <td><span class="label">Hora Final Prevista:</span><br>${p.horaFimPrevista}</td>
    <td><span class="label">Data:</span><br>${p.horaEncerramento ? fmtDateTime(p.horaEncerramento).split(' ')[0] : '___________'}</td>
    <td><span class="label">Hora:</span><br>${p.horaEncerramento ? fmtDateTime(p.horaEncerramento).split(' ')[1] : '___________'}</td>
  </tr>
  <tr>
    <td colspan="2"><span class="label">Empresa:</span><br>${p.empresaExecutante ?? 'Tiger Rentank'}</td>
    <td colspan="2"><span class="label">Unidade / Base:</span><br>${p.unidade ?? ''}</td>
    <td colspan="2"><span class="label">Responsável pela Atividade:</span><br>${p.responsavelExecucao}</td>
  </tr>
  <tr>
    <td colspan="6"><span class="label">Área / Local da Atividade:</span><br>${p.localTrabalho}</td>
  </tr>
  <tr>
    <td colspan="6"><span class="label">Descrição da Atividade:</span><br>${p.descricaoAtividade}</td>
  </tr>
</table>

<!-- ══ RISCOS ══ -->
<div class="section-title">ASPECTOS E IMPACTOS / PERIGOS E RISCOS</div>
<table>
  <tr>
    <th style="width:34%">Riscos</th>
    <th style="width:33%">Riscos</th>
    <th style="width:33%">Riscos</th>
  </tr>
  ${riscoRow(RISCOS_COL1, RISCOS_COL2, RISCOS_COL3)}
  ${extraRiscos ? `<tr><td colspan="3"><span class="label">Outros:</span> ${extraRiscos}</td></tr>` : ''}
</table>

<!-- ══ EQUIPAMENTOS ══ -->
<div class="section-title">EQUIPAMENTOS DE PROTEÇÃO</div>
<table>
  <tr>
    <th colspan="2" style="text-align:center;">EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL — EPI</th>
    <th style="text-align:center;border-left:1pt solid #333">EQUIPAMENTO DE PROTEÇÃO COLETIVA — EPC</th>
  </tr>
  ${epiRows()}
</table>

<!-- ══ PÁGINA 2 ══ -->
<div class="page-break"></div>

<!-- Cabeçalho p2 -->
<table class="header-table">
  <tr>
    <td style="width:25%;text-align:center;font-weight:bold;font-size:9pt;">TIGER RENTANK<br>DO BRASIL</td>
    <td style="text-align:center;font-weight:bold;font-size:11pt;">PERMISSÃO PARA TRABALHO — ${p.tipo}</td>
    <td style="width:22%;font-size:7pt;">
      FOR-TR-SMS-042<br>Revisão: 02<br>Data: 20/11/2020<br>Página: 2/2
    </td>
  </tr>
</table>

<!-- ══ MEDIDAS ══ -->
<div class="section-title">MEDIDAS DE SEGURANÇA / PREVENTIVAS</div>
<table>
  <tr>
    <th style="width:60%">Medidas</th>
    <th style="width:40%">Medidas</th>
  </tr>
  ${medidasRows()}
  ${extraMedidas ? `<tr><td colspan="2"><span class="label">Outras:</span> ${extraMedidas}</td></tr>` : ''}
</table>

<!-- ══ ENVOLVIDOS ══ -->
<div class="section-title">ENVOLVIDOS NA ATIVIDADE</div>
<table>
  <tr>
    <th style="width:5%">Nº</th><th style="width:35%">Nome</th><th style="width:10%">Assinatura</th>
    <th style="width:5%">Nº</th><th style="width:35%">Nome</th><th style="width:10%">Assinatura</th>
  </tr>
  ${[0,1,2,3].map(i => `
  <tr>
    <td style="text-align:center">${i+1}</td>
    <td>${envArr[i] ?? ''}</td>
    <td class="sig-line"></td>
    <td style="text-align:center">${i+5}</td>
    <td>${envArr[i+4] ?? ''}</td>
    <td class="sig-line"></td>
  </tr>`).join('')}
  <tr>
    <td colspan="2" style="font-weight:bold">EMITENTE: ${p.responsavelExecucao}</td>
    <td class="sig-line"></td>
    <td colspan="2" style="font-weight:bold">QSMS: ${qsmsNome}</td>
    <td class="sig-line"></td>
  </tr>
</table>

${p.observacoes ? `<table><tr><th>Observações</th></tr><tr><td>${p.observacoes}</td></tr></table>` : ''}

<p style="font-size:6pt;text-align:right;margin-top:4pt;font-style:italic;">Make it happen.</p>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function PtPetScreen({ onToast }: Props) {
  const [permits, setPermits]       = useState<WorkPermit[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterTipo, setFilterTipo] = useState<WorkPermitTipo | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<WorkPermitStatus | 'all'>('all');

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<WorkPermit | null>(null);
  const [form, setForm]             = useState<FormState>(emptyForm());
  const [saving, setSaving]         = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    permit: WorkPermit;
    action: 'iniciar' | 'encerrar' | 'cancelar';
  } | null>(null);

  // ── load ──
  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('work_permits')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { onToast('Erro ao carregar permissões', 'error'); }
    else setPermits((data ?? []).map(mapRow));
    setLoading(false);
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  // ── next number ──
  const nextNumber = useCallback(async (tipo: WorkPermitTipo): Promise<string> => {
    const year = new Date().getFullYear();
    const prefix = `${tipo}-${year}-`;
    const { data } = await supabase
      .from('work_permits')
      .select('numero')
      .like('numero', `${prefix}%`);
    let max = 0;
    for (const row of data ?? []) {
      const n = parseInt(row.numero.split('-').pop() ?? '0', 10);
      if (n > max) max = n;
    }
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  }, []);

  // ── save ──
  async function handleSave() {
    if (!form.localTrabalho || !form.descricaoAtividade || !form.responsavelExecucao || !form.horaInicio || !form.horaFimPrevista) {
      onToast('Preencha os campos obrigatórios', 'error'); return;
    }
    setSaving(true);
    try {
      const riscosAll = [
        ...form.riscosSelected,
        ...form.riscosExtra.split('\n').map(s => s.trim()).filter(Boolean),
      ];
      const medidasAll = [
        ...form.medidasSelected,
        ...form.medidasExtra.split('\n').map(s => s.trim()).filter(Boolean),
      ];
      const envolvidosJson = JSON.stringify(
        form.envolvidos.filter(n => n.trim()).map(nome => ({ nome }))
      );

      const payload = {
        tipo:                 form.tipo,
        subtipo:              form.subtipo || null,
        data_emissao:         form.dataEmissao,
        hora_inicio:          form.horaInicio,
        hora_fim_prevista:    form.horaFimPrevista,
        unidade:              form.unidade || null,
        empresa_tipo:         form.empresaTipo,
        empresa_executante:   form.empresaTipo,
        local_trabalho:       form.localTrabalho,
        descricao_atividade:  form.descricaoAtividade,
        responsavel_execucao: form.responsavelExecucao,
        autorizador_nome:     form.autorizadorNome || null,
        autorizador_funcao:   form.autorizadorFuncao || null,
        riscos:               JSON.stringify(riscosAll),
        medidas_controle:     JSON.stringify(medidasAll),
        epis_selecionados:    JSON.stringify(form.episSelected),
        epcs_selecionados:    JSON.stringify(form.epcsSelected),
        envolvidos:           envolvidosJson,
        qsms_nome:            form.qsmsNome || null,
        observacoes:          form.observacoes || null,
      };

      if (editing) {
        const { error } = await supabase.from('work_permits').update(payload).eq('id', editing.id);
        if (error) throw error;
        onToast('Permissão atualizada', 'success');
      } else {
        const numero = await nextNumber(form.tipo);
        const { error } = await supabase.from('work_permits').insert({ ...payload, numero, status: 'emitida' });
        if (error) throw error;
        onToast(`${numero} emitida com sucesso`, 'success');
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      onToast((e as Error).message ?? 'Erro ao salvar', 'error');
    } finally { setSaving(false); }
  }

  // ── status transitions ──
  async function handleStatusChange(permit: WorkPermit, action: 'iniciar' | 'encerrar' | 'cancelar') {
    const newStatus = action === 'iniciar' ? 'em_execucao' : action === 'encerrar' ? 'encerrada' : 'cancelada';
    const extra = action === 'encerrar' ? { hora_encerramento: new Date().toISOString() } : {};
    const { error } = await supabase.from('work_permits')
      .update({ status: newStatus, ...extra })
      .eq('id', permit.id);
    if (error) { onToast('Erro ao atualizar status', 'error'); return; }
    onToast(`${permit.numero} — ${STATUS_CFG[newStatus].label}`, 'success');
    setConfirmAction(null);
    load();
  }

  // ── open modal ──
  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(p: WorkPermit) {
    setEditing(p);
    setForm(permitToForm(p));
    setModalOpen(true);
  }

  // ── filtered list ──
  const filtered = useMemo(() => permits.filter(p => {
    if (filterTipo !== 'all' && p.tipo !== filterTipo) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.numero.toLowerCase().includes(q) ||
             p.localTrabalho.toLowerCase().includes(q) ||
             p.descricaoAtividade.toLowerCase().includes(q) ||
             p.responsavelExecucao.toLowerCase().includes(q);
    }
    return true;
  }), [permits, filterTipo, filterStatus, search]);

  // ── KPIs ──
  const kpi = useMemo(() => ({
    total:   permits.length,
    emitida: permits.filter(p => p.status === 'emitida').length,
    exec:    permits.filter(p => p.status === 'em_execucao').length,
    enc:     permits.filter(p => p.status === 'encerrada').length,
  }), [permits]);

  // ─── Checkbox toggle helper ─────────────────────────────────────────────────
  function toggleCheck(key: 'riscosSelected' | 'episSelected' | 'epcsSelected' | 'medidasSelected', val: string) {
    setForm(f => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-blue-400" />
            PT / PET — Permissões de Trabalho
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">FOR-TR-SMS-042 · Gestão e emissão de permissões</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Permissão
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',         value: kpi.total,   cls: 'text-slate-200' },
          { label: 'Emitidas',      value: kpi.emitida, cls: 'text-blue-400'  },
          { label: 'Em Execução',   value: kpi.exec,    cls: 'text-yellow-400'},
          { label: 'Encerradas',    value: kpi.enc,     cls: 'text-green-400' },
        ].map(k => (
          <div key={k.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs text-slate-400">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número, local, atividade…"
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value as WorkPermitTipo | 'all')}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none">
          <option value="all">Todos os tipos</option>
          <option value="PT">PT</option>
          <option value="PET">PET</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as WorkPermitStatus | 'all')}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none">
          <option value="all">Todos os status</option>
          {(Object.keys(STATUS_CFG) as WorkPermitStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Clock className="w-5 h-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileCheck2 className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma permissão encontrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {['Nº Permissão','Tipo','Data','Local','Atividade','Responsável','Status','Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map(p => {
                const cfg = STATUS_CFG[p.status];
                const SubIcon = p.subtipo ? PET_SUBTIPOS[p.subtipo]?.icon : null;
                const active = p.status === 'emitida' || p.status === 'em_execucao';
                return (
                  <tr key={p.id} className="hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-300 font-medium">{p.numero}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {SubIcon && <SubIcon className="w-3.5 h-3.5 text-slate-400" />}
                        <span className="text-white font-medium">{p.tipo}</span>
                        {p.subtipo && <span className="text-slate-400 text-xs">({PET_SUBTIPOS[p.subtipo]?.nr})</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{fmtDate(p.dataEmissao)}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-[140px] truncate">{p.localTrabalho}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">{p.descricaoAtividade}</td>
                    <td className="px-4 py-3 text-slate-300">{p.responsavelExecucao}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badgeCls}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => doPrint(p)}
                          title="Imprimir"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                          <Printer className="w-4 h-4" />
                        </button>
                        {active && (
                          <button onClick={() => openEdit(p)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {p.status === 'emitida' && (
                          <button onClick={() => setConfirmAction({ permit: p, action: 'iniciar' })}
                            title="Iniciar execução"
                            className="p-1.5 rounded-lg text-yellow-500 hover:text-yellow-300 hover:bg-slate-700 transition-colors">
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        )}
                        {p.status === 'em_execucao' && (
                          <button onClick={() => setConfirmAction({ permit: p, action: 'encerrar' })}
                            title="Encerrar"
                            className="p-1.5 rounded-lg text-green-500 hover:text-green-300 hover:bg-slate-700 transition-colors">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {active && (
                          <button onClick={() => setConfirmAction({ permit: p, action: 'cancelar' })}
                            title="Cancelar"
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-300 hover:bg-slate-700 transition-colors">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── CONFIRM MODAL ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-white mb-2">
              {confirmAction.action === 'iniciar'   && 'Iniciar Execução'}
              {confirmAction.action === 'encerrar'  && 'Encerrar Permissão'}
              {confirmAction.action === 'cancelar'  && 'Cancelar Permissão'}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Confirma a ação para <span className="text-white font-medium">{confirmAction.permit.numero}</span>?
              {confirmAction.action === 'encerrar' && ' A hora de encerramento será registrada automaticamente.'}
              {confirmAction.action === 'cancelar' && ' Esta ação não pode ser desfeita.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => handleStatusChange(confirmAction.permit, confirmAction.action)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  confirmAction.action === 'cancelar' ? 'bg-red-600 hover:bg-red-700' :
                  confirmAction.action === 'encerrar' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-yellow-600 hover:bg-yellow-700'
                }`}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FORM MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 my-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">
                {editing ? `Editar — ${editing.numero}` : 'Nova Permissão de Trabalho'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

              {/* ── Tipo ── */}
              <Section title="Tipo de Permissão">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo *</Label>
                    <div className="flex gap-3 mt-1">
                      {(['PT','PET'] as WorkPermitTipo[]).map(t => (
                        <label key={t} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" checked={form.tipo === t}
                            onChange={() => setForm(f => ({ ...f, tipo: t, subtipo: '' }))}
                            className="accent-blue-500" />
                          <span className="text-sm text-white font-medium">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {form.tipo === 'PET' && (
                    <div>
                      <Label>Subtipo PET *</Label>
                      <select value={form.subtipo}
                        onChange={e => setForm(f => ({ ...f, subtipo: e.target.value as WorkPermitSubtipo | '' }))}
                        className={inputCls}>
                        <option value="">Selecione…</option>
                        {(Object.entries(PET_SUBTIPOS) as [WorkPermitSubtipo, typeof PET_SUBTIPOS[WorkPermitSubtipo]][]).map(([k, v]) => (
                          <option key={k} value={k}>{v.label} ({v.nr})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </Section>

              {/* ── Identificação ── */}
              <Section title="Identificação">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Emissão *</Label>
                    <input type="date" value={form.dataEmissao}
                      onChange={e => setForm(f => ({ ...f, dataEmissao: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <Label>Empresa</Label>
                    <div className="flex gap-4 mt-2">
                      {(['Tiger Rentank','Terceiros'] as const).map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" checked={form.empresaTipo === opt}
                            onChange={() => setForm(f => ({ ...f, empresaTipo: opt }))}
                            className="accent-blue-500" />
                          <span className="text-sm text-white">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Hora Início *</Label>
                    <input type="time" value={form.horaInicio}
                      onChange={e => setForm(f => ({ ...f, horaInicio: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <Label>Hora Final Prevista *</Label>
                    <input type="time" value={form.horaFimPrevista}
                      onChange={e => setForm(f => ({ ...f, horaFimPrevista: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <Label>Unidade / Base</Label>
                    <input type="text" value={form.unidade}
                      onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                      placeholder="Ex: RDO, Macaé, CS…"
                      className={inputCls} />
                  </div>
                  <div>
                    <Label>Responsável pela Atividade *</Label>
                    <input type="text" value={form.responsavelExecucao}
                      onChange={e => setForm(f => ({ ...f, responsavelExecucao: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <Label>Área / Local da Atividade *</Label>
                    <input type="text" value={form.localTrabalho}
                      onChange={e => setForm(f => ({ ...f, localTrabalho: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <Label>Descrição da Atividade *</Label>
                    <textarea value={form.descricaoAtividade} rows={2}
                      onChange={e => setForm(f => ({ ...f, descricaoAtividade: e.target.value }))}
                      className={textareaCls} />
                  </div>
                </div>
              </Section>

              {/* ── Riscos ── */}
              <Section title="Aspectos e Impactos / Perigos e Riscos">
                <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                  {[RISCOS_COL1, RISCOS_COL2, RISCOS_COL3].map((col, ci) => (
                    <div key={ci} className="space-y-1">
                      {col.map(r => (
                        <label key={r} className="flex items-start gap-2 cursor-pointer group">
                          <input type="checkbox"
                            checked={form.riscosSelected.includes(r)}
                            onChange={() => toggleCheck('riscosSelected', r)}
                            className="mt-0.5 accent-blue-500 shrink-0" />
                          <span className="text-xs text-slate-300 group-hover:text-white leading-tight">{r}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <Label>Outros riscos (um por linha)</Label>
                  <textarea value={form.riscosExtra} rows={2}
                    onChange={e => setForm(f => ({ ...f, riscosExtra: e.target.value }))}
                    className={textareaCls} />
                </div>
              </Section>

              {/* ── EPIs ── */}
              <Section title="Equipamentos de Proteção Individual — EPI">
                <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                  {EPI_LIST.map(e => (
                    <label key={e} className="flex items-start gap-2 cursor-pointer group">
                      <input type="checkbox"
                        checked={form.episSelected.includes(e)}
                        onChange={() => toggleCheck('episSelected', e)}
                        className="mt-0.5 accent-blue-500 shrink-0" />
                      <span className="text-xs text-slate-300 group-hover:text-white leading-tight">{e}</span>
                    </label>
                  ))}
                </div>
              </Section>

              {/* ── EPCs ── */}
              <Section title="Equipamentos de Proteção Coletiva — EPC">
                <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                  {EPC_LIST.map(e => (
                    <label key={e} className="flex items-start gap-2 cursor-pointer group">
                      <input type="checkbox"
                        checked={form.epcsSelected.includes(e)}
                        onChange={() => toggleCheck('epcsSelected', e)}
                        className="mt-0.5 accent-green-500 shrink-0" />
                      <span className="text-xs text-slate-300 group-hover:text-white leading-tight">{e}</span>
                    </label>
                  ))}
                </div>
              </Section>

              {/* ── Medidas ── */}
              <Section title="Medidas de Segurança / Preventivas">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {ALL_MEDIDAS.map(m => (
                    <label key={m} className="flex items-start gap-2 cursor-pointer group">
                      <input type="checkbox"
                        checked={form.medidasSelected.includes(m)}
                        onChange={() => toggleCheck('medidasSelected', m)}
                        className="mt-0.5 accent-blue-500 shrink-0" />
                      <span className="text-xs text-slate-300 group-hover:text-white leading-tight">{m}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <Label>Outras medidas (uma por linha)</Label>
                  <textarea value={form.medidasExtra} rows={2}
                    onChange={e => setForm(f => ({ ...f, medidasExtra: e.target.value }))}
                    className={textareaCls} />
                </div>
              </Section>

              {/* ── Envolvidos ── */}
              <Section title="Envolvidos na Atividade">
                <div className="grid grid-cols-2 gap-3">
                  {form.envolvidos.map((nome, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-4 text-right">{i + 1}</span>
                      <input type="text" value={nome}
                        onChange={e => {
                          const arr = [...form.envolvidos];
                          arr[i] = e.target.value;
                          setForm(f => ({ ...f, envolvidos: arr }));
                        }}
                        placeholder={`Colaborador ${i + 1}`}
                        className={inputCls + ' flex-1'} />
                    </div>
                  ))}
                </div>
              </Section>

              {/* ── Autorizador / QSMS ── */}
              <Section title="Autorizador e QSMS">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Autorizador</Label>
                    <input type="text" value={form.autorizadorNome}
                      onChange={e => setForm(f => ({ ...f, autorizadorNome: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <Label>Função do Autorizador</Label>
                    <input type="text" value={form.autorizadorFuncao}
                      onChange={e => setForm(f => ({ ...f, autorizadorFuncao: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <Label>Responsável QSMS (para impressão)</Label>
                    <input type="text" value={form.qsmsNome}
                      onChange={e => setForm(f => ({ ...f, qsmsNome: e.target.value }))}
                      placeholder="Nome do QSMS que assina"
                      className={inputCls} />
                  </div>
                </div>
              </Section>

              {/* ── Observações ── */}
              <Section title="Observações">
                <textarea value={form.observacoes} rows={2}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  className={textareaCls} />
              </Section>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-700">
              <button onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Cancelar
              </button>
              <div className="flex gap-3">
                {editing && (
                  <button
                    onClick={() => {
                      const riscosAll = [...form.riscosSelected, ...form.riscosExtra.split('\n').map(s=>s.trim()).filter(Boolean)];
                      const medidasAll = [...form.medidasSelected, ...form.medidasExtra.split('\n').map(s=>s.trim()).filter(Boolean)];
                      const p = { ...editing,
                        riscos: JSON.stringify(riscosAll),
                        medidasControle: JSON.stringify(medidasAll),
                        episSelecionados: JSON.stringify(form.episSelected),
                        responsavelExecucao: form.responsavelExecucao,
                        localTrabalho: form.localTrabalho,
                        descricaoAtividade: form.descricaoAtividade,
                        empresaExecutante: form.empresaTipo,
                      };
                      doPrint(p, {
                        epcs: form.epcsSelected,
                        envolvidos: form.envolvidos.filter(Boolean),
                        qsmsNome: form.qsmsNome,
                        riscosExtra: form.riscosExtra,
                        medidasExtra: form.medidasExtra,
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors">
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                )}
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Emitir permissão'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers de estilo ────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500';
const textareaCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 pb-2 border-b border-slate-700/60">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400 mb-1">{children}</p>;
}
