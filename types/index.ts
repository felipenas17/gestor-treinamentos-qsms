export type Sector = 
  | 'Operacional'
  | 'Brascabo'
  | 'RDO'
  | 'QSMS'
  | 'Suprimentos'
  | 'Transbordo'
  | 'Segurança do Trabalho'
  | 'Qualidade'
  | 'Operações Offshore'
  | 'Logística'
  | 'Tecnologia'
  | 'Meio Ambiente'
  | 'RH'
  | 'Segurança Patrimonial';

export type ComplianceStatus = 'Certificado' | 'Reciclar' | 'Vencido' | 'Pendente';
export type ProcedureStatus = 'Ativo' | 'Em Revisão' | 'Arquivado';
export type DocRevisionStatus = 'Vigente' | 'Para Revisão' | 'Vencido' | 'Indefinido';
export type DocStatus = 'Vigente' | 'Para Renovar' | 'Vencido' | 'Indefinido';
export type RenewalStatus = 'Não iniciado' | 'Em processo' | 'Aguardando aprovação' | 'Concluído';

export interface DocControl {
  id: string;
  code: string;
  name: string;
  docType: string;
  issuingBody?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  renewalMonths?: number;
  docStatus?: DocStatus;
  renewalStatus: RenewalStatus;
  responsible?: string | null;
  fileUrl?: string | null;
  notes?: string | null;
  base?: string | null;
}

export interface DocControlRenewal {
  id: string;
  docControlId: string;
  eventDate: string;
  notes?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  renewalStatus: RenewalStatus;
  createdAt: string;
}

export interface Procedure {
  id: string;
  code: string;
  revision?: string;
  name: string;
  sector: Sector;
  associatedRole: string;
  application: string;
  complianceRate: number; // 0 - 100
  lastRevision: string;
  status: ProcedureStatus;
  questionsCount: number;
  criticality: 'Alta' | 'Média' | 'Baixa';
  description?: string;
  validityMonths: number;
  fileUrl?: string;
  sectors?: string[];
  // Controle documental
  docType?: string;
  docLastRevisionDate?: string | null;
  docRevisionMonths?: number;
  docNextRevisionDate?: string | null;
  docRevisionStatus?: DocRevisionStatus;
  docResponsible?: string | null;
  programContent?: string[];
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  sector: Sector;
  avatarUrl: string;
  admissionDate: string;
  cpfMasked: string;
  email: string;
  phone?: string;
  status?: 'Ativo' | 'Embarcado' | 'Desembarcado' | 'Afastado';
}

export interface TrainingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  employeeAvatar: string;
  sector: Sector;
  procedureCode: string;
  procedureName: string;
  completionDate: string;
  validityDate: string;
  daysRemaining: number;
  complianceRate: number;
  status: ComplianceStatus;
  instructor?: string;
  certificateHash?: string;
  hours?: number;
  procedureRevision?: string;
  programContent?: string[];
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface Assessment {
  id: string;
  code: string;
  title: string;
  procedureCode: string;
  procedureTitle: string;
  questionsCount: number;
  minScorePercent: number;
  durationMinutes: number;
  maxAttempts: number;
  tokenUuid: string;
  status: 'Ativa' | 'Rascunho' | 'Encerrada';
  questions: AssessmentQuestion[];
  approvalRate: number;
  totalSubmissions: number;
  avgDurationMinutes: number;
}

export interface RespondentStatus {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  sector: Sector;
  scorePercent: number | null;
  status: 'Entregue' | 'Pendente' | 'Reprovado' | 'Em Andamento';
  submissionDate: string | null;
  dueDate: string;
  attemptsUsed: number;
}

export interface DashboardMetrics {
  generalCompliance: number;
  activeCertifications: number;
  expiringIn60Days: number;
  expiredDocuments: number;
}

export interface ChartSectorMetric {
  sector: string;
  certificados: number;
  falhas: number;
}

export interface ChartProjectionMetric {
  month: string;
  reciclagens: number;
  vencimentos: number;
}

export type ObligationStatus = 'Vigente' | 'Próximo' | 'Vencido' | 'Indefinido';
export type ExecutionStatus = 'Pendente' | 'Em andamento' | 'Parcial' | 'Concluído';

export interface LegalObligation {
  id: string;
  title: string;
  description?: string | null;
  frequency: string;
  responsible?: string | null;
  lastDoneDate?: string | null;
  nextDueDate?: string | null;
  status: ObligationStatus;
  executionStatus: ExecutionStatus;
  base?: string | null;
  docControlId?: string | null;
  docControlCode?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface ObligationRealization {
  id: string;
  obligationId: string;
  doneDate: string;
  notes?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  createdAt: string;
}

// ─── NC / CAPA ───────────────────────────────────────────────────────────────

export type NCType = 'NC' | 'Observação' | 'Oportunidade de Melhoria';
export type NCSeverity = 'Crítica' | 'Moderada' | 'Leve';
export type NCSource =
  | 'Auditoria Interna'
  | 'Auditoria Externa'
  | 'Inspeção'
  | 'Reclamação'
  | 'Análise Crítica'
  | 'Outro';
export type NCStatus =
  | 'Aberta'
  | 'Em Investigação'
  | 'Em Andamento'
  | 'Concluída';

export type NCEffectiveness = 'Eficaz' | 'Não Eficaz';

export interface NCStatusHistoryEntry {
  status: NCStatus;
  changedAt: string;   // ISO timestamp
  note?: string;
}

export interface NonConformity {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  type: NCType;
  severity: NCSeverity;
  source: NCSource;
  detectedDate: string;
  deadline?: string | null;
  status: NCStatus;
  responsible?: string | null;
  sector?: string | null;

  // Item da Ocorrência (checkboxes)
  itemQualidade?: boolean;
  itemAmbiental?: boolean;
  itemSSO?: boolean;

  // Origem específica (FOR-TR-SMS-006)
  origin?: string | null;

  // Fase 1 — Registro
  immediateAction?: string | null;

  // Fase 2 — Investigação & CAPA
  rootCause?: string | null;
  correctiveAction?: string | null;
  actionResponsible?: string | null;
  actionDeadline?: string | null;
  riskReviewRequired?: boolean;
  changeManagementRequired?: boolean;

  // Follow-up
  actionImplemented?: string | null;
  implementationDate?: string | null;
  followUpStatus?: string | null;

  // Análise de Causas — Ishikawa 6M
  ishikawaManpower?: string | null;
  ishikawaEnvironment?: string | null;
  ishikawaMaterials?: string | null;
  ishikawaMachinery?: string | null;
  ishikawaMeasurement?: string | null;
  ishikawaMethods?: string | null;

  // 5 Porquês
  why1?: string | null;
  why2?: string | null;
  why3?: string | null;
  why4?: string | null;
  why5?: string | null;

  // 5W2H
  w2h_what?: string | null;
  w2h_why?: string | null;
  w2h_where?: string | null;
  w2h_when?: string | null;
  w2h_who?: string | null;
  w2h_how?: string | null;
  w2h_howMuch?: string | null;

  // Causa Raiz Identificada (síntese)
  rootCauseIdentified?: string | null;

  // Verificação & Eficácia
  effectiveness?: NCEffectiveness | null;
  effectivenessDate?: string | null;
  qsmsResponsible?: string | null;
  effectivenessCheck?: string | null;

  // Campos legados / extras
  preventiveAction?: string | null;
  closedDate?: string | null;
  notes?: string | null;
  createdAt: string;
  statusHistory?: NCStatusHistoryEntry[];

  // Cliente (geral)
  client?: string | null;

  // Campos específicos Clariant
  qnsNumber?: string | null;
  endCustomer?: string | null;
  chemicalProduct?: string | null;
  originLocation?: string | null;

  // Controle de prazo D1 / D5 / D7 (Clariant)
  responseD1?: string | null;
  responseD5?: string | null;
  responseD7?: string | null;
  statusD1?: string | null;
  statusD5?: string | null;
  statusD7?: string | null;
}

// ─── ROI — Registro de Ocorrência Interna ────────────────────────────────────

export type ROISite = 'RDO' | 'MC' | 'CLIENTE';

export type ROILocal =
  | 'ESTOQUE'
  | 'TRANSBORDO'
  | 'CARREGAMENTO'
  | 'RECEBIMENTO'
  | 'DESCONTAMINAÇÃO'
  | 'LOGÍSTICA'
  | 'N/A';

export type ROITema =
  | 'VAZAMENTO'
  | 'PROCESSO'
  | 'DANO / AVARIA NA ESTRUTURA'
  | 'REVESTIMENTO'
  | 'ETIQUETA'
  | 'PLACAS / VALIDADE';

export type ROISetor =
  | 'ESTANQUEIDADE'
  | 'DESCONTAMINAÇÃO'
  | 'ASS. TÉCNICA'
  | 'MANUTENÇÃO'
  | 'PINTURA'
  | 'TRANSBORDO RDO'
  | 'INTERTANK'
  | 'CLARIANT'
  | 'ESLINGA';

export interface ROIRecord {
  id: string;
  registration_number?: number | null;
  serial_number?: string | null;
  equipment_desc?: string | null;
  recorded_date: string;           // YYYY-MM-DD
  site?: ROISite | null;
  local?: ROILocal | null;
  tema?: ROITema | null;
  subtema?: string | null;
  setor_responsavel?: ROISetor | null;
  tipo_processo: boolean;
  tipo_vazamento: boolean;
  tipo_revestimento: boolean;
  tipo_etiquetas: boolean;
  tipo_dano_avaria: boolean;
  tipo_placas: boolean;
  descricao?: string | null;
  created_at: string;
}

export interface EquipmentSuggestion {
  serial_number: string;
  description: string;
}

// ─── Score de Conformidade ────────────────────────────────────────────────────

export interface BreakdownItem {
  label: string;
  count: number;
  variant: 'green' | 'yellow' | 'red' | 'gray';
}

export interface AlertItem {
  id: string;
  module: string;
  label: string;
  daysUntilExpiry: number; // negative = already expired
  severity: 'expired' | 'critical' | 'warning';
}

export interface ModuleScore {
  module: string;
  compliant: number;
  total: number;
  score: number; // 0-100
  breakdown?: BreakdownItem[];
}

export interface GlobalComplianceScore {
  overall: number; // 0-100
  modules: ModuleScore[];
  generatedAt: string;
  alerts?: AlertItem[];
}
