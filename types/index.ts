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

export type ComplianceStatus = 'Certificado' | 'Reciclar' | 'Vencido';
export type ProcedureStatus = 'Ativo' | 'Em Revisão' | 'Arquivado';

export interface Procedure {
  id: string;
  code: string;
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
