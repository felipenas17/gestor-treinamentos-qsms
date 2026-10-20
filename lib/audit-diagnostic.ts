/**
 * audit-diagnostic.ts
 * Motor de diagnóstico automático da auditoria interna.
 * Para cada um dos 47 itens do checklist ISO, varre os dados do sistema
 * (procedures, doc_control, legal_obligations, normative_certs, trainings,
 * non_conformities) e sugere OK / OM / NC com as evidências encontradas.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ─── Tipos de dados do sistema ────────────────────────────────────────────────

export interface SystemData {
  procedures: ProcedureRow[];
  docControl: DocControlRow[];
  legalObligations: LegalObligationRow[];
  normativeCerts: NormativeCertRow[];
  trainings: TrainingRow[];
  nonConformities: NCRow[];
}

interface ProcedureRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  doc_type: string | null;
  status: string;
  program_content: string[] | null;
}

interface DocControlRow {
  id: string;
  code: string;
  name: string;
  doc_type: string | null;
  issuing_body: string | null;
  expiry_date: string | null;
  renewal_status: string | null;
  notes: string | null;
  base: string | null;
}

interface LegalObligationRow {
  id: string;
  title: string;
  description: string | null;
  base: string | null;
  execution_status: string | null;
  last_done_date: string | null;
  next_due_date: string | null;
  frequency: string;
}

interface NormativeCertRow {
  id: string;
  employee_name: string;
  training_name: string;
  training_code: string | null;
  status: string;
  validity_date: string;
  days_remaining: number;
}

interface TrainingRow {
  id: string;
  status: string;
  completion_date: string | null;
  validity_date: string | null;
  procedures?: { name: string; code: string } | null;
}

interface NCRow {
  id: string;
  title: string;
  type: string;
  severity: string;
  source: string;
  status: string;
  corrective_action: string | null;
  root_cause: string | null;
}

// ─── Resultado do diagnóstico ─────────────────────────────────────────────────

export type AutoAvaliacao = 'OK' | 'OM' | 'NC';

export interface DiagnosticResult {
  sugestao: AutoAvaliacao;
  evidencias: string[];   // registros encontrados no sistema
  total: number;          // quantidade de registros encontrados
}

export type DiagnosticMap = Record<string, DiagnosticResult>;

// ─── Funções auxiliares ───────────────────────────────────────────────────────

const today = new Date();
const in90days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

function parseDate(d: string | null): Date | null {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Busca documentos por palavras-chave no nome, tipo, notas ou base */
function findDocs(
  docs: DocControlRow[],
  keywords: string[],
  wantTypes?: string[]
): DocControlRow[] {
  const kw = keywords.map(k => k.toLowerCase());
  return docs.filter(d => {
    const haystack = [
      d.name, d.doc_type, d.issuing_body, d.notes, d.base, d.code
    ].filter(Boolean).join(' ').toLowerCase();
    const kwMatch = kw.some(k => haystack.includes(k));
    const typeMatch = !wantTypes || wantTypes.some(t =>
      (d.doc_type || '').toLowerCase().includes(t.toLowerCase())
    );
    return kwMatch && typeMatch;
  });
}

/** Busca procedimentos por palavras-chave */
function findProcs(procs: ProcedureRow[], keywords: string[]): ProcedureRow[] {
  const kw = keywords.map(k => k.toLowerCase());
  return procs.filter(p => {
    const haystack = [p.name, p.description, p.doc_type, ...(p.program_content || [])]
      .filter(Boolean).join(' ').toLowerCase();
    return kw.some(k => haystack.includes(k));
  });
}

/** Busca obrigações legais por palavras-chave */
function findObligations(obs: LegalObligationRow[], keywords: string[]): LegalObligationRow[] {
  const kw = keywords.map(k => k.toLowerCase());
  return obs.filter(o => {
    const haystack = [o.title, o.description, o.base].filter(Boolean).join(' ').toLowerCase();
    return kw.some(k => haystack.includes(k));
  });
}

/** Busca certificados normativos por palavras-chave no nome ou código */
function findCerts(certs: NormativeCertRow[], keywords: string[]): NormativeCertRow[] {
  const kw = keywords.map(k => k.toLowerCase());
  return certs.filter(c => {
    const haystack = [c.training_name, c.training_code].filter(Boolean).join(' ').toLowerCase();
    return kw.some(k => haystack.includes(k));
  });
}

/** Determina sugestão com base em documentos encontrados */
function scoreDoc(docs: DocControlRow[]): AutoAvaliacao {
  if (!docs.length) return 'NC';
  const valid = docs.filter(d => {
    if (!d.expiry_date) return true; // sem validade = sem prazo = ok
    const exp = parseDate(d.expiry_date);
    return exp && exp > in90days;
  });
  if (valid.length > 0) return 'OK';
  // encontrou mas vencido ou vencendo em 90 dias
  return 'OM';
}

/** Determina sugestão com base em certificados normativos */
function scoreCerts(certs: NormativeCertRow[]): AutoAvaliacao {
  if (!certs.length) return 'NC';
  const validos = certs.filter(c => c.status === 'Certificado' || c.days_remaining > 30);
  if (!validos.length) return 'NC';
  const pct = validos.length / certs.length;
  if (pct >= 0.9) return 'OK';
  if (pct >= 0.5) return 'OM';
  return 'NC';
}

/** Descreve documento encontrado */
function descDoc(d: DocControlRow): string {
  const exp = d.expiry_date ? ` (val: ${d.expiry_date})` : '';
  const st = d.renewal_status ? ` [${d.renewal_status}]` : '';
  return `${d.code} – ${d.name}${exp}${st}`;
}

/** Descreve obrigação encontrada */
function descOb(o: LegalObligationRow): string {
  const st = o.execution_status ? ` [${o.execution_status}]` : '';
  const last = o.last_done_date ? ` | último: ${o.last_done_date}` : '';
  return `${o.title}${st}${last}`;
}

/** Descreve procedimento encontrado */
function descProc(p: ProcedureRow): string {
  return `${p.code} – ${p.name} [${p.status}]`;
}

/** Descreve certificado normativo */
function descCert(c: NormativeCertRow): string {
  return `${c.training_name} – ${c.employee_name} (val: ${c.validity_date}) [${c.status}]`;
}

// ─── Motor de diagnóstico ─────────────────────────────────────────────────────

export function buildDiagnostic(data: SystemData): DiagnosticMap {
  const { procedures, docControl, legalObligations, normativeCerts, trainings, nonConformities } = data;
  const map: DiagnosticMap = {};

  function set(id: string, sugestao: AutoAvaliacao, evidencias: string[]) {
    map[id] = { sugestao, evidencias, total: evidencias.length };
  }

  // ── QUALIDADE ────────────────────────────────────────────────────────────────

  // Q1 – 4.1 Contexto da organização (SWOT, PESTEL, análise de contexto)
  {
    const docs = findDocs(docControl, ['swot', 'pestel', 'contexto', 'context', 'análise de contexto']);
    const procs = findProcs(procedures, ['contexto', 'swot', 'pestel']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('Q1', docs.length + procs.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // Q2 – 4.3 Escopo do SGQ
  {
    const docs = findDocs(docControl, ['escopo', 'scope', 'manual da qualidade', 'manual sgq']);
    const procs = findProcs(procedures, ['escopo', 'manual da qualidade']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('Q2', all.length > 0 ? 'OK' : 'NC', all);
  }

  // Q3 – 4.4 Mapa de processos / fluxogramas
  {
    const docs = findDocs(docControl, ['mapa de processo', 'fluxograma', 'macrofluxo', 'bpmn', 'processo-chave', 'processo chave', 'turtle', 'tartaruga de processo']);
    const procs = findProcs(procedures, ['mapa de processo', 'fluxograma', 'macrofluxo', 'bpmn', 'processo-chave']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('Q3', all.length >= 3 ? 'OK' : all.length > 0 ? 'OM' : 'NC', all);
  }

  // Q4 – 5.3 Responsabilidades e autoridades
  {
    const docs = findDocs(docControl, ['organograma', 'responsabilidade', 'autoridade', 'descrição de cargo', 'designação']);
    const procs = findProcs(procedures, ['responsabilidade', 'organograma', 'autoridade']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('Q4', all.length > 0 ? 'OK' : 'NC', all);
  }

  // Q5 – 6.3 Gestão de mudanças
  {
    const docs = findDocs(docControl, ['gestão de mudança', 'controle de mudança', 'moc', 'change management']);
    const procs = findProcs(procedures, ['gestão de mudança', 'mudança', 'moc']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('Q5', all.length > 0 ? 'OK' : 'NC', all);
  }

  // Q6 – 7.1 Recursos / infraestrutura
  {
    const docs = findDocs(docControl, ['manutenção', 'infraestrutura', 'plano de manutenção', 'cronograma manutenção']);
    const procs = findProcs(procedures, ['manutenção', 'infraestrutura']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('Q6', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // Q7 – 7.1.5 Calibração de instrumentos
  {
    const docs = findDocs(docControl, ['calibração', 'calibracao', 'instrumento', 'equipamento medição', 'inmetro', 'rbc']);
    const obs = findObligations(legalObligations, ['calibração', 'instrumento', 'metrologia']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    const hasValid = docs.some(d => {
      if (!d.expiry_date) return true;
      const exp = parseDate(d.expiry_date);
      return exp && exp > today;
    });
    set('Q7', all.length > 0 ? (hasValid ? 'OK' : 'OM') : 'NC', all);
  }

  // Q8 – 7.5 Informação documentada (procedimentos ativos)
  {
    const ativos = procedures.filter(p => p.status === 'Ativo');
    const docTypes = findDocs(docControl, ['procedimento', 'instrução', 'pop', 'registro', 'formulário', 'lista mestre', 'listagem de documentos']);
    const all = [
      ...ativos.map(descProc),
      ...docTypes.map(descDoc),
    ];
    set('Q8',
      ativos.length >= 5 ? 'OK' : ativos.length > 0 ? 'OM' : 'NC',
      all.length ? all : []
    );
  }

  // Q9 – 7.4 Comunicação interna/externa
  {
    const docs = findDocs(docControl, ['comunicação', 'comunicacao', 'dds', 'diálogo', 'reunião', 'ata']);
    const procs = findProcs(procedures, ['comunicação', 'dds', 'diálogo']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('Q9', all.length > 0 ? 'OK' : 'NC', all);
  }

  // Q10 – 8.1 Controle operacional (POPs em vigor)
  {
    const ativos = procedures.filter(p => p.status === 'Ativo' &&
      ['Procedimento', 'POP', 'Instrução de Trabalho', 'IT'].some(t =>
        (p.doc_type || '').toLowerCase().includes(t.toLowerCase())
      )
    );
    set('Q10',
      ativos.length >= 5 ? 'OK' : ativos.length > 0 ? 'OM' : 'NC',
      ativos.map(descProc)
    );
  }

  // Q11 – 8.2 Requisitos de produto/serviço (contratos, especificações)
  {
    const docs = findDocs(docControl, ['contrato', 'especificação', 'requisito cliente', 'cliente', 'petrobras', 'modec', 'prio']);
    const procs = findProcs(procedures, ['cliente', 'contrato', 'especificação']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('Q11', all.length > 0 ? 'OK' : 'NC', all);
  }

  // Q12 – 8.4 Controle de fornecedores/prestadores externos
  {
    const docs = findDocs(docControl, ['fornecedor', 'prestador', 'contratado', 'qualificação fornecedor', 'homologação']);
    const procs = findProcs(procedures, ['fornecedor', 'prestador', 'contratado']);
    const obs = findObligations(legalObligations, ['fornecedor', 'prestador', 'contratado']);
    const all = [...docs.map(descDoc), ...procs.map(descProc), ...obs.map(descOb)];
    set('Q12', all.length > 0 ? 'OK' : 'NC', all);
  }

  // Q13 – 8.7 Controle de produto/serviço não conforme
  {
    const ncs = nonConformities.filter(nc => ['Produto', 'Serviço', 'Operação'].some(t =>
      nc.type?.toLowerCase().includes(t.toLowerCase())
    ));
    const withCapa = ncs.filter(nc => nc.corrective_action);
    const all = ncs.map(nc => `NC ${nc.title} [${nc.status}]`);
    const docs = findDocs(docControl, ['não conformidade', 'produto não conforme', 'devolução']);
    set('Q13',
      docs.length > 0 || withCapa.length > 0 ? 'OK' : ncs.length > 0 ? 'OM' : 'NC',
      [...all, ...docs.map(descDoc)]
    );
  }

  // Q14 – 9.1.2 Satisfação do cliente (pesquisas)
  {
    const docs = findDocs(docControl, ['satisfação', 'pesquisa', 'feedback', 'cliente', 'nps']);
    const procs = findProcs(procedures, ['satisfação', 'pesquisa cliente', 'feedback']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('Q14', all.length > 0 ? 'OK' : 'NC', all);
  }

  // Q15 – 9.3 Análise crítica da direção
  {
    const docs = findDocs(docControl, ['análise crítica', 'reunião de direção', 'reunião de análise', 'revisão gerencial']);
    const procs = findProcs(procedures, ['análise crítica', 'revisão gerencial']);
    const obs = findObligations(legalObligations, ['análise crítica', 'reunião de direção']);
    const all = [...docs.map(descDoc), ...procs.map(descProc), ...obs.map(descOb)];
    set('Q15', all.length > 0 ? 'OK' : 'NC', all);
  }

  // Q16 – 10.2 NC e CAPA registradas e tratadas
  {
    const open = nonConformities.filter(nc => nc.status !== 'Fechada' && nc.status !== 'Encerrada');
    const withCapa = nonConformities.filter(nc => nc.corrective_action && nc.root_cause);
    const total = nonConformities.length;
    const evids = nonConformities.map(nc =>
      `${nc.title} [${nc.type || ''}] – ${nc.status}${nc.corrective_action ? ' (CAPA)' : ''}`
    );
    set('Q16',
      total > 0 && withCapa.length > 0 ? (open.length <= 3 ? 'OK' : 'OM') : total > 0 ? 'OM' : 'NC',
      evids
    );
  }

  // Q17 – 10.3 Melhoria contínua
  {
    const docs = findDocs(docControl, ['plano de ação', 'melhoria contínua', 'objetivo', 'meta', '5w2h', 'pdca']);
    const procs = findProcs(procedures, ['melhoria', 'plano de ação', 'objetivo', 'pdca']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('Q17', all.length > 0 ? 'OK' : 'NC', all);
  }

  // Q18 – NBR 16001 / ODS 8 (Responsabilidade Social)
  {
    const docs = findDocs(docControl, ['responsabilidade social', 'ods', 'objetivos do desenvolvimento', 'nbr 16001', 'sri']);
    const obs = findObligations(legalObligations, ['responsabilidade social', 'ods']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    set('Q18', all.length > 0 ? 'OK' : 'NC', all);
  }

  // Q19 – 8.4 Terceiros conforme contrato (Petrobras/PRIO/MODEC)
  {
    const docs = findDocs(docControl, ['petrobras', 'prio', 'modec', 'clariant', 'contrato', 'cliente', 'offshore']);
    const obs = findObligations(legalObligations, ['petrobras', 'prio', 'modec', 'contrato', 'cliente']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    set('Q19', all.length > 0 ? 'OK' : 'NC', all);
  }

  // Q20 – Legislação Brasileira (obrigações legais cadastradas)
  {
    const total = legalObligations.length;
    const cumpridas = legalObligations.filter(o =>
      ['Cumprida', 'Em dia', 'Concluída', 'OK'].some(s =>
        (o.execution_status || '').toLowerCase().includes(s.toLowerCase())
      )
    );
    const vencidas = legalObligations.filter(o =>
      o.next_due_date && parseDate(o.next_due_date)! < today
    );
    set('Q20',
      total >= 5 ? (vencidas.length === 0 ? 'OK' : 'OM') : total > 0 ? 'OM' : 'NC',
      legalObligations.map(descOb)
    );
  }

  // ── SEGURANÇA ─────────────────────────────────────────────────────────────────

  // S1 – 5.4 Política SSO / ISO 45001
  {
    const docs = findDocs(docControl, ['política sso', 'política de segurança', 'política de saúde', 'política ssma', 'política qsms']);
    const procs = findProcs(procedures, ['política sso', 'política ssma', 'política qsms']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('S1', all.length > 0 ? 'OK' : 'NC', all);
  }

  // S2 – NR-01:2024 Inventário de perigos e riscos (APR, GRO, Matriz de Riscos)
  {
    const docs = findDocs(docControl, ['apr', 'análise preliminar de risco', 'perigo', 'risco', 'matrix de risco', 'gro', 'grisco', 'pgrco', 'pgrtr', 'nr-01']);
    const procs = findProcs(procedures, ['apr', 'perigo', 'risco', 'análise de risco', 'nr-01', 'nr01']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('S2', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // S3 – ISO 45001 7.3 / NR-01 Comunicação de riscos aos trabalhadores (DDS, integração)
  {
    const docs = findDocs(docControl, ['dds', 'diálogo diário', 'integração', 'comunicação de risco', 'nr-01']);
    const procs = findProcs(procedures, ['dds', 'diálogo diário', 'integração', 'nr-01']);
    const certs = findCerts(normativeCerts, ['nr-01', 'nr01', 'integração', 'indução']);
    const all = [...docs.map(descDoc), ...procs.map(descProc), ...certs.map(descCert)];
    set('S3', all.length > 0 ? 'OK' : 'NC', all);
  }

  // S4 – NR-07 PCMSO vigente
  {
    const docs = findDocs(docControl, ['pcmso', 'programa de controle médico', 'saúde ocupacional']);
    const obs = findObligations(legalObligations, ['pcmso', 'saúde ocupacional', 'nr-07', 'nr07']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    set('S4', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // S5 – NR-07 ASO vigentes para todos os colaboradores
  {
    const docs = findDocs(docControl, ['aso', 'atestado de saúde', 'admissional', 'periódico', 'exame médico']);
    const obs = findObligations(legalObligations, ['aso', 'exame médico', 'nr-07', 'atestado de saúde']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    // Verificar se há obrigação de ASO em dia
    const emDia = obs.some(o => o.execution_status?.toLowerCase().includes('cumpr') ||
      o.execution_status?.toLowerCase().includes('em dia'));
    set('S5', all.length > 0 ? (emDia ? 'OK' : 'OM') : 'NC', all);
  }

  // S6 – NR-07/NR-15 LTCAT / laudos de insalubridade e periculosidade
  {
    const docs = findDocs(docControl, ['ltcat', 'insalubridade', 'periculosidade', 'laudo', 'laudo técnico', 'nr-15', 'nr-16', 'nr15', 'nr16']);
    const obs = findObligations(legalObligations, ['ltcat', 'insalubridade', 'periculosidade', 'nr-15']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    set('S6', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // S7 – NR-06 EPIs com CA válido e controle de entrega
  {
    const docs = findDocs(docControl, ['epi', 'equipamento de proteção', 'ca ', 'controle de epi', 'ficha de epi']);
    const procs = findProcs(procedures, ['epi', 'equipamento de proteção individual', 'ca ']);
    const obs = findObligations(legalObligations, ['epi', 'nr-06', 'nr06']);
    const all = [...docs.map(descDoc), ...procs.map(descProc), ...obs.map(descOb)];
    set('S7', all.length > 0 ? 'OK' : 'NC', all);
  }

  // S8 – NR-12/NR-26 Sinalização de segurança
  {
    const docs = findDocs(docControl, ['sinalização', 'sinalizacao', 'nr-26', 'nr26', 'mapa de risco', 'nr-12']);
    const procs = findProcs(procedures, ['sinalização', 'nr-26', 'mapa de risco']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('S8', all.length > 0 ? 'OK' : 'NC', all);
  }

  // S9 – NR-23/ABNT NBR 12693 Combate a incêndio / extintores (foco em inspeção de equipamentos)
  {
    // Evidências primárias: documentos de inspeção/manutenção de extintores e hidrantes
    const docs = findDocs(docControl, ['extintor', 'combate a incêndio', 'ppci', 'hidrante', 'inspeção de extintor', 'manutenção de extintor', 'nr-23', 'nbr 12693', 'nbr12693', 'carga de extintor', 'plano de combate']);
    const obs = findObligations(legalObligations, ['extintor', 'combate a incêndio', 'nr-23', 'ppci', 'hidrante', 'inspeção de equipamento de incêndio']);
    // Evidências complementares: treinamento de brigada (mostra que há brigada constituída)
    const certs = findCerts(normativeCerts, ['brigada de incêndio', 'nr-23', 'combate a incêndio']);
    const all = [...docs.map(descDoc), ...obs.map(descOb), ...certs.map(c => `Brigada: ${descCert(c)}`)];
    set('S9', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // S10 – NR-10/NR-33/NR-35/NR-12 Treinamentos específicos
  {
    const kws = ['nr-10', 'nr10', 'nr-33', 'nr33', 'nr-35', 'nr35', 'nr-12', 'nr12',
                 'elétrica', 'eletrica', 'espaço confinado', 'trabalho em altura', 'caldeiraria'];
    const certs = findCerts(normativeCerts, kws);
    const procs = findProcs(procedures, kws);
    const all = [...certs.map(descCert), ...procs.map(descProc)];
    const validos = certs.filter(c => c.status === 'Certificado');
    set('S10',
      validos.length > 0 ? (validos.length >= 5 ? 'OK' : 'OM') : certs.length > 0 ? 'OM' : 'NC',
      all
    );
  }

  // S11 – NR-05 CIPA constituída / ata
  {
    const docs = findDocs(docControl, ['cipa', 'nr-05', 'nr05', 'cipeiro', 'comissão interna']);
    const certs = findCerts(normativeCerts, ['cipa', 'nr-05', 'nr05']);
    const obs = findObligations(legalObligations, ['cipa', 'nr-05', 'cipeiro']);
    const all = [...docs.map(descDoc), ...certs.map(descCert), ...obs.map(descOb)];
    set('S11', all.length > 0 ? 'OK' : 'NC', all);
  }

  // S12 – NR-05 SIPAT realizada
  {
    const docs = findDocs(docControl, ['sipat', 'semana interna', 'prevenção de acidentes', 'nr-05']);
    const obs = findObligations(legalObligations, ['sipat', 'semana interna', 'nr-05']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    set('S12', all.length > 0 ? 'OK' : 'NC', all);
  }

  // S13 – ABNT NBR 14276 Plano de Emergência / PPAE
  {
    const docs = findDocs(docControl, ['ppae', 'plano de emergência', 'brigada de emergência', 'nbr 14276', 'simulado']);
    const procs = findProcs(procedures, ['ppae', 'emergência', 'simulado', 'brigada']);
    const obs = findObligations(legalObligations, ['simulado', 'emergência', 'ppae', 'brigada']);
    const all = [...docs.map(descDoc), ...procs.map(descProc), ...obs.map(descOb)];
    set('S13', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // S14 – ISO 45001 Investigação de acidentes/incidentes
  {
    const ncs = nonConformities.filter(nc =>
      ['acidente', 'incidente', 'quase acidente', 'near miss'].some(t =>
        (nc.type || nc.source || nc.title).toLowerCase().includes(t)
      )
    );
    const docs = findDocs(docControl, ['investigação de acidente', 'investigação de incidente', 'rai', 'rii', 'acidente']);
    const procs = findProcs(procedures, ['investigação de acidente', 'incidente', 'acidente']);
    const all = [
      ...ncs.map(nc => `NC: ${nc.title} [${nc.status}]`),
      ...docs.map(descDoc),
      ...procs.map(descProc),
    ];
    set('S14', all.length > 0 ? 'OK' : 'NC', all);
  }

  // S15 – ISO 45001 9.1 Indicadores de SSO (taxa de acidente, HH sem acidente)
  {
    const docs = findDocs(docControl, ['indicador', 'taxa de acidente', 'horas homem', 'tfca', 'tgca', 'painel', 'kpi sso', 'dashboard sso']);
    const procs = findProcs(procedures, ['indicador', 'taxa de acidente', 'horas homem']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('S15', all.length > 0 ? 'OK' : 'NC', all);
  }

  // S16 – NR-12 Segurança em máquinas e equipamentos
  {
    const docs = findDocs(docControl, ['nr-12', 'nr12', 'máquina', 'maquina', 'equipamento', 'inventário de máquinas', 'proteção de máquina']);
    const certs = findCerts(normativeCerts, ['nr-12', 'nr12', 'máquina', 'maquina']);
    const obs = findObligations(legalObligations, ['nr-12', 'máquina', 'equipamento']);
    const all = [...docs.map(descDoc), ...certs.map(descCert), ...obs.map(descOb)];
    set('S16', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // S17 – NR-33 Espaço confinado
  {
    const docs = findDocs(docControl, ['nr-33', 'nr33', 'espaço confinado', 'espaco confinado', 'permissão de entrada', 'pet ']);
    const certs = findCerts(normativeCerts, ['nr-33', 'nr33', 'espaço confinado', 'espaco confinado']);
    const obs = findObligations(legalObligations, ['nr-33', 'espaço confinado']);
    const procs = findProcs(procedures, ['nr-33', 'espaço confinado', 'espaco confinado']);
    const all = [...docs.map(descDoc), ...certs.map(descCert), ...obs.map(descOb), ...procs.map(descProc)];
    set('S17', all.length > 0 ? scoreCerts(certs) !== 'NC' ? scoreCerts(certs) : scoreDoc(docs) : 'NC', all);
  }

  // S18 – NR-35 Trabalho em altura
  {
    const docs = findDocs(docControl, ['nr-35', 'nr35', 'trabalho em altura', 'apt ', 'autorização para trabalho em altura']);
    const certs = findCerts(normativeCerts, ['nr-35', 'nr35', 'trabalho em altura', 'altura']);
    const obs = findObligations(legalObligations, ['nr-35', 'trabalho em altura']);
    const procs = findProcs(procedures, ['nr-35', 'trabalho em altura', 'altura']);
    const all = [...docs.map(descDoc), ...certs.map(descCert), ...obs.map(descOb), ...procs.map(descProc)];
    set('S18', all.length > 0 ? scoreCerts(certs) !== 'NC' ? scoreCerts(certs) : scoreDoc(docs) : 'NC', all);
  }

  // ── AMBIENTAL ─────────────────────────────────────────────────────────────────

  // A1 – CONAMA 237/97 Licença Ambiental (LAO, LO, LI)
  {
    const docs = findDocs(docControl, ['licença ambiental', 'lao', 'licença de operação', 'lo ', 'li ', 'licença de instalação', 'conama 237', 'ibama', 'inea']);
    const obs = findObligations(legalObligations, ['licença ambiental', 'lao', 'licença de operação', 'ibama', 'inea']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    set('A1', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // A2 – Lei 12.305/2010 PNRS — PGRS (Plano de Gerenciamento de Resíduos)
  {
    const docs = findDocs(docControl, ['pgrs', 'plano de gerenciamento de resíduo', 'gestão de resíduo', 'gerenciamento de resíduo', 'pnrs']);
    const procs = findProcs(procedures, ['pgrs', 'resíduo', 'gerenciamento de resíduo']);
    const obs = findObligations(legalObligations, ['pgrs', 'resíduo', 'pnrs', 'lei 12305', '12.305']);
    const all = [...docs.map(descDoc), ...procs.map(descProc), ...obs.map(descOb)];
    set('A2', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // A3 – NBR 10004 / CONAMA 313 Inventário de resíduos / MTR
  {
    const docs = findDocs(docControl, ['inventário de resíduo', 'mtr', 'manifesto de transporte', 'nbr 10004', 'conama 313', 'cadastro técnico']);
    const obs = findObligations(legalObligations, ['inventário de resíduo', 'mtr', 'manifesto de transporte', 'nbr 10004']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    set('A3', all.length > 0 ? 'OK' : 'NC', all);
  }

  // A4 – CONAMA 313 / SIGOR — lançamento no sistema SIGOR
  {
    const docs = findDocs(docControl, ['sigor', 'conama 313', 'sistema integrado', 'destinação de resíduo']);
    const obs = findObligations(legalObligations, ['sigor', 'conama 313', 'destinação', 'resíduo industrial']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    set('A4', all.length > 0 ? 'OK' : 'NC', all);
  }

  // A5 – Lei 12.305 Art.33 Logística reversa (óleos, pneus, embalagens)
  {
    const docs = findDocs(docControl, ['logística reversa', 'logistica reversa', 'óleo lubrificante', 'pneu', 'embalagem', 'lei 12305', 'art. 33']);
    const obs = findObligations(legalObligations, ['logística reversa', 'óleo', 'pneu', 'embalagem', 'lei 12.305']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    set('A5', all.length > 0 ? 'OK' : 'NC', all);
  }

  // A6 – CONAMA 430/2011 Efluentes líquidos
  {
    const docs = findDocs(docControl, ['efluente', 'conama 430', 'esgoto', 'tratamento de efluente', 'eta', 'ete', 'ana ']);
    const obs = findObligations(legalObligations, ['efluente', 'conama 430', 'tratamento de efluente', 'ana ']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    set('A6', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // A7 – CONAMA 382/2006 Emissões atmosféricas
  {
    const docs = findDocs(docControl, ['emissão atmosférica', 'emissoes atmosfericas', 'conama 382', 'laudo de emissão', 'stack test', 'gerador', 'caldeira']);
    const obs = findObligations(legalObligations, ['emissão atmosférica', 'conama 382', 'gerador', 'caldeira']);
    const all = [...docs.map(descDoc), ...obs.map(descOb)];
    set('A7', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  // A8 – ABNT NBR 14725 / NR-26 FDS/FISPQ produtos químicos
  {
    const docs = findDocs(docControl, ['fds', 'fispq', 'ficha de segurança', 'produto químico', 'nbr 14725', 'nr-26', 'nr26']);
    const procs = findProcs(procedures, ['fds', 'fispq', 'produto químico', 'nr-26']);
    const all = [...docs.map(descDoc), ...procs.map(descProc)];
    set('A8', all.length > 0 ? 'OK' : 'NC', all);
  }

  // A9 – NR-20 / NR-26 / ABNT NBR 17505 Armazenamento de inflamáveis
  {
    const docs = findDocs(docControl, ['inflamável', 'inflamavel', 'combustível', 'combustivel', 'nr-20', 'nr20', 'nbr 17505', 'armazenamento de líquido', 'tanque']);
    const certs = findCerts(normativeCerts, ['nr-20', 'nr20', 'inflamável', 'combustível', 'tanque']);
    const obs = findObligations(legalObligations, ['nr-20', 'inflamável', 'combustível', 'tanque', 'nbr 17505']);
    const all = [...docs.map(descDoc), ...certs.map(descCert), ...obs.map(descOb)];
    set('A9', all.length > 0 ? scoreDoc(docs) : 'NC', all);
  }

  return map;
}

// ─── Busca todos os dados do sistema necessários para o diagnóstico ───────────

export async function loadSystemData(supabase: SupabaseClient): Promise<SystemData> {
  const [
    { data: procedures },
    { data: docControl },
    { data: legalObligations },
    { data: normativeCerts },
    { data: trainings },
    { data: nonConformities },
  ] = await Promise.all([
    supabase.from('procedures').select('id,code,name,description,doc_type,status,program_content').eq('status', 'Ativo'),
    supabase.from('doc_control').select('id,code,name,doc_type,issuing_body,expiry_date,renewal_status,notes,base'),
    supabase.from('legal_obligations').select('id,title,description,base,execution_status,last_done_date,next_due_date,frequency'),
    supabase.from('normative_certs').select('id,employee_name,training_name,training_code,status,validity_date,days_remaining'),
    supabase.from('trainings').select('id,status,completion_date,validity_date,procedures(name,code)'),
    supabase.from('non_conformities').select('id,title,type,severity,source,status,corrective_action,root_cause'),
  ]);

  return {
    procedures: (procedures ?? []) as ProcedureRow[],
    docControl: (docControl ?? []) as DocControlRow[],
    legalObligations: (legalObligations ?? []) as LegalObligationRow[],
    normativeCerts: (normativeCerts ?? []) as NormativeCertRow[],
    trainings: (trainings ?? []) as unknown as TrainingRow[],
    nonConformities: (nonConformities ?? []) as NCRow[],
  };
}

/** Função de entrada: carrega dados + roda diagnóstico */
export async function runAuditDiagnostic(supabase: SupabaseClient): Promise<DiagnosticMap> {
  const data = await loadSystemData(supabase);
  return buildDiagnostic(data);
}
