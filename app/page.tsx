'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { DashboardScreen } from '@/components/screens/dashboard-screen';
import { ProceduresScreen } from '@/components/screens/procedures-screen';
import { AssessmentsScreen } from '@/components/screens/assessments-screen';
import { MatrixScreen } from '@/components/screens/matrix-screen';

import { ImageLinksModal } from '@/components/modals/image-links-modal';
import { SupabaseSchemaModal } from '@/components/modals/supabase-schema-modal';
import { AssessmentTakerModal } from '@/components/modals/assessment-taker-modal';
import { NewProcedureAiModal } from '@/components/modals/new-procedure-ai-modal';
import { NewTrainingPlanModal } from '@/components/modals/new-training-plan-modal';
import { ProcedureDetailsModal } from '@/components/modals/procedure-details-modal';
import { ProcedureExamModal } from '@/components/modals/procedure-exam-modal';
import { RegisterTrainingModal } from '@/components/modals/register-training-modal';
import { NotifyModal } from '@/components/modals/notify-modal';
import { TrainingHistoryModal } from '@/components/modals/training-history-modal';
import { EmployeesScreen } from '@/components/screens/employees-screen';
import { CertificatesScreen } from '@/components/screens/certificates-screen';
import { DocControlScreen } from '@/components/screens/doc-control-screen';
import { LegalObligationsScreen } from '@/components/screens/legal-obligations-screen';
// import { ImportDocumentModal } from '@/components/modals/import-document-modal'; // modal não ativo

import {
  INITIAL_METRICS,
  SECTOR_CHART_DATA,
} from '@/lib/mock-data';

import {
  supabase,
  isSupabaseConfigured,
  fetchDashboardMetrics,
  fetchProcedures,
  fetchTrainingRecords,
  fetchSectorChartData,
  fetchAllAssessments,
  fetchEmployees,
  updateAssessmentStatus,
  saveAssessmentDraft,
  deleteAssessment,
  autoGenerateMatrixForProcedure,
  syncMatrixForAllActiveProcedures,
  fetchNormativeCerts,
  saveNormativeCert,
  fetchComplianceHistory,
  saveComplianceSnapshot,
  fetchDocuments,
  saveDocument,
  fetchLegalObligations,
  saveLegalObligation,
  updateLegalObligationDone,
  updateProcedure,
  saveRevisionHistory,
  type NormativeCertRow,
} from '@/lib/supabase';

import { Employee, Procedure, TrainingRecord, Assessment, RespondentStatus, ChartProjectionMetric, DocControl, LegalObligation } from '@/types';
import { CertificateRecord } from '@/components/screens/certificates-screen';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function GestorTreinamentosApp() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  // Core reactive data states (inicia com mock, substitui com Supabase quando disponível)
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [sectorData, setSectorData] = useState(SECTOR_CHART_DATA);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedAssessmentForTaker, setSelectedAssessmentForTaker] = useState<Assessment | null>(null);
  const [respondents, setRespondents] = useState<RespondentStatus[]>([]);
  const [documents, setDocuments] = useState<DocControl[]>([]);
  const [obligations, setObligations] = useState<LegalObligation[]>([]);

  // Normative certifications (Supabase-persisted; localStorage as offline fallback)
  const [normativeCerts, setNormativeCerts] = useState<CertificateRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('tiger-normative-certs');
      return stored ? (JSON.parse(stored) as CertificateRecord[]) : [];
    } catch { return []; }
  });

  // Helper: map DB row → CertificateRecord
  const mapNormativeRow = useCallback((row: NormativeCertRow): CertificateRecord => ({
    id: row.id,
    employeeName: row.employee_name,
    employeeCpf: row.employee_cpf ?? '',
    sector: row.sector,
    trainingName: row.training_name,
    trainingCode: row.training_code ?? '',
    completionDate: row.completion_date,
    validityDate: row.validity_date,
    daysRemaining: row.days_remaining,
    hours: row.hours,
    type: 'normativo',
    provider: row.provider ?? undefined,
    status: row.status as CertificateRecord['status'],
    certificateHash: row.certificate_hash ?? `CERT-${row.id}`,
    certificateFileUrl: row.certificate_file_url ?? undefined,
  }), []);

  // Modal states
  const [isImagesModalOpen, setIsImagesModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [isNewProcedureModalOpen, setIsNewProcedureModalOpen] = useState(false);
  const [isAssessmentTakerOpen, setIsAssessmentTakerOpen] = useState(false);
  const [isRegisterTrainingOpen, setIsRegisterTrainingOpen] = useState(false);
  const [prefillTrainingRecord, setPrefillTrainingRecord] = useState<TrainingRecord | null>(null);
  const [notifyRecord, setNotifyRecord] = useState<TrainingRecord | null>(null);
  const [isImportDocOpen, setIsImportDocOpen] = useState(false);
  const [selectedProcedureDetails, setSelectedProcedureDetails] = useState<Procedure | null>(null);
  const [selectedExamProcedure, setSelectedExamProcedure] = useState<Procedure | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [complianceDelta, setComplianceDelta] = useState<number | null>(null);
  const [historyRecord, setHistoryRecord] = useState<TrainingRecord | null>(null);

  // ─── Merge normative certs into dashboard data ───────────────────────────
  const adjustedMetrics = useMemo(() => {
    const active = normativeCerts.filter((c) => c.status === 'Certificado').length;
    const expiring = normativeCerts.filter((c) => c.daysRemaining >= 0 && c.daysRemaining <= 60).length;
    const expired = normativeCerts.filter((c) => c.status === 'Vencido').length;
    return {
      ...metrics,
      activeCertifications: metrics.activeCertifications + active,
      expiringIn60Days: metrics.expiringIn60Days + expiring,
      expiredDocuments: metrics.expiredDocuments + expired,
    };
  }, [metrics, normativeCerts]);

  // ─── Projection chart: compute from real records + normative certs ─────────
  const projectionData = useMemo<ChartProjectionMetric[]>(() => {
    const ptMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const today = new Date();

    // Parse both "DD/MM/YYYY" (TrainingRecord) and "YYYY-MM-DD" (CertificateRecord from DB)
    function parseDate(s: string): Date | null {
      if (!s || s === '—') return null;
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
      const p = s.split('/');
      if (p.length === 3) return new Date(+p[2], +p[1] - 1, +p[0]);
      return null;
    }

    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();

      let vencimentos = 0;
      let reciclagens = 0;

      for (const rec of records) {
        const vd = parseDate(rec.validityDate);
        if (!vd) continue;
        if (vd.getFullYear() === y && vd.getMonth() === m) {
          vencimentos++;
          if (rec.status === 'Reciclar' || rec.status === 'Vencido') reciclagens++;
        }
      }

      for (const cert of normativeCerts) {
        const vd = parseDate(cert.validityDate);
        if (!vd) continue;
        if (vd.getFullYear() === y && vd.getMonth() === m) {
          vencimentos++;
          if (cert.status === 'Reciclar' || cert.status === 'Vencido') reciclagens++;
        }
      }

      return { month: ptMonths[m], reciclagens, vencimentos };
    });
  }, [records, normativeCerts]);

  // Convert normative certs to TrainingRecord shape for the critical table
  const normativeAsTraining = useMemo<TrainingRecord[]>(() =>
    normativeCerts
      .filter((c) => c.status !== 'Certificado' || c.daysRemaining <= 90)
      .map((c) => ({
        id: c.id,
        employeeId: c.id,
        employeeName: c.employeeName,
        employeeRole: c.provider || 'Externo',
        employeeAvatar: '/images/avatar_operator.jpg',
        sector: c.sector as any,
        procedureCode: c.trainingCode,
        procedureName: c.trainingName,
        completionDate: c.completionDate,
        validityDate: c.validityDate,
        daysRemaining: c.daysRemaining,
        complianceRate: 100,
        status: c.status,
        instructor: c.provider || 'Externo',
        certificateHash: c.certificateHash,
      })),
    [normativeCerts],
  );

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const handleSaveNormativeCert = useCallback(async (cert: CertificateRecord, file?: File) => {
    // Optimistic local update
    setNormativeCerts((prev) => {
      const next = [cert, ...prev];
      try { localStorage.setItem('tiger-normative-certs', JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
    // Persist to Supabase
    if (isSupabaseConfigured) {
      const result = await saveNormativeCert({
        id: cert.id,
        employee_name: cert.employeeName,
        employee_cpf: cert.employeeCpf ?? null,
        sector: cert.sector,
        training_name: cert.trainingName,
        training_code: cert.trainingCode ?? null,
        completion_date: cert.completionDate,
        validity_date: cert.validityDate,
        days_remaining: cert.daysRemaining,
        hours: cert.hours,
        provider: cert.provider ?? null,
        status: cert.status,
        certificate_hash: cert.certificateHash,
        certificate_file_url: cert.certificateFileUrl ?? null,
      }, file);

      if (result === false) {
        showToast('⚠️ Erro ao salvar no Supabase. Verifique se a tabela normative_certs foi criada.', 'error');
        return;
      }

      showToast('Certificado normativo salvo ✓', 'success');

      // If file was uploaded, update the cert with the permanent Supabase Storage URL
      if (result && result !== cert.certificateFileUrl) {
        setNormativeCerts((prev) => {
          const next = prev.map((c) => c.id === cert.id ? { ...c, certificateFileUrl: result } : c);
          try { localStorage.setItem('tiger-normative-certs', JSON.stringify(next)); } catch { /* noop */ }
          return next;
        });
      }
    }
  }, [showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAttachNormativeCert = useCallback(async (id: string, file: File) => {
    if (!isSupabaseConfigured) { showToast('Supabase não configurado', 'error'); return; }
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const ext = file.name.split('.').pop() || 'pdf';
    const path = `certs/${id}.${ext}`;
    const { error: upErr } = await sb.storage.from('normative-certificates').upload(path, file, { upsert: true });
    if (upErr) { showToast('Erro ao enviar arquivo: ' + upErr.message, 'error'); return; }
    const { data: urlData } = sb.storage.from('normative-certificates').getPublicUrl(path);
    const fileUrl = urlData?.publicUrl;
    if (!fileUrl) { showToast('Erro ao obter URL do arquivo', 'error'); return; }
    const { error: updErr } = await sb.from('normative_certs').update({ certificate_file_url: fileUrl }).eq('id', id);
    if (updErr) { showToast('Erro ao atualizar registro: ' + updErr.message, 'error'); return; }
    setNormativeCerts((prev) => {
      const next = prev.map((c) => c.id === id ? { ...c, certificateFileUrl: fileUrl } : c);
      try { localStorage.setItem('tiger-normative-certs', JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
    showToast('Arquivo anexado com sucesso ✓', 'success');
  }, [showToast]);

  // ─── Carrega dados reais do Supabase (se configurado) ────────────────────
  const mapProcedures = useCallback((raw: any[]) => {
    return raw.map((p: any) => {
      const sectors: string[] = (p.sector_procedure_matrix || []).map((s: any) => s.sector);
      return {
        id: p.id,
        code: p.code,
        revision: p.revision || 'R00',
        name: p.name,
        sector: (sectors[0] || 'Geral') as any,
        sectors,
        associatedRole: sectors.join(', ') || '—',
        application: p.description || '—',
        complianceRate: 0,
        lastRevision: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—',
        status: (p.status === 'active' ? 'Ativo' : (p.status || 'Ativo')) as any,
        questionsCount: 0,
        criticality: p.criticality || 'Média',
        description: p.description,
        validityMonths: p.validity_months || 12,
        fileUrl: p.file_url || undefined,
        // Controle documental
        docType: p.doc_type || undefined,
        docLastRevisionDate: p.doc_last_revision_date || null,
        docRevisionMonths: p.doc_revision_months || undefined,
        docNextRevisionDate: p.doc_next_revision_date || null,
        docRevisionStatus: p.doc_revision_status || undefined,
        docResponsible: p.doc_responsible || null,
      };
    });
  }, []);

  const mapDocuments = useCallback((raw: any[]): DocControl[] =>
    raw.map((d: any) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      docType: d.doc_type,
      issuingBody: d.issuing_body || null,
      issueDate: d.issue_date || null,
      expiryDate: d.expiry_date || null,
      renewalMonths: d.renewal_months ?? 12,
      docStatus: d.doc_status || 'Indefinido',
      responsible: d.responsible || null,
      fileUrl: d.file_url || null,
      notes: d.notes || null,
      base: d.base || null,
    })),
  []);

  const mapObligations = useCallback((raw: any[]): LegalObligation[] =>
    raw.map((o: any) => ({
      id: o.id,
      title: o.title,
      description: o.description || null,
      frequency: o.frequency,
      responsible: o.responsible || null,
      lastDoneDate: o.last_done_date || null,
      nextDueDate: o.next_due_date || null,
      status: (o.obligation_status || 'Indefinido') as LegalObligation['status'],
      base: o.base || null,
      docControlId: o.doc_control_id || null,
      notes: o.notes || null,
      createdAt: o.created_at,
    })),
  []);

  const loadProceduresFromDB = useCallback(async () => {
    const dbProcedures = await fetchProcedures();
    if (dbProcedures) setProcedures(mapProcedures(dbProcedures));
  }, [mapProcedures]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadAll = async () => {
      setIsLoading(true);
      try {
        const [dbMetrics, dbProcedures, dbRecords, dbSector, dbAssessmentList, dbEmployees] = await Promise.all([
          fetchDashboardMetrics(),
          fetchProcedures(),
          fetchTrainingRecords(),
          fetchSectorChartData(),
          fetchAllAssessments(),
          fetchEmployees(),
        ]);

        if (dbMetrics) {
          setMetrics(dbMetrics);
          // Persiste snapshot diário para cálculo real do delta
          saveComplianceSnapshot({
            general_compliance: dbMetrics.generalCompliance,
            active_certifications: dbMetrics.activeCertifications,
            expiring_in_60_days: dbMetrics.expiringIn60Days,
            expired_documents: dbMetrics.expiredDocuments,
            pending_count: 0,
          }).catch(() => { /* não-crítico */ });
          // Calcula delta vs. 30 dias atrás
          fetchComplianceHistory().then(({ today: todayVal, thirtyDaysAgo }) => {
            if (todayVal !== null && thirtyDaysAgo !== null) {
              setComplianceDelta(parseFloat((todayVal - thirtyDaysAgo).toFixed(1)));
            }
          }).catch(() => { /* não-crítico */ });
        }
        if (dbSector && dbSector.length > 0) setSectorData(dbSector);

        if (dbProcedures) {
          setProcedures(mapProcedures(dbProcedures));
        }

        if (dbRecords && dbRecords.length > 0) {
          setRecords(dbRecords.map((r: any) => {
            const isPendente = r.status === 'Pendente';
            return {
              id: r.id,
              employeeId: r.employee_id,
              employeeName: r.employees?.name || '—',
              employeeRole: r.employees?.role || '—',
              employeeAvatar: r.employees?.avatar_url || '/images/avatar_engineer.svg',
              sector: r.employees?.sector || '—',
              procedureCode: r.procedures?.code || '—',
              procedureRevision: r.procedures?.revision || undefined,
              procedureName: r.procedures?.name || '—',
              completionDate: isPendente ? '—' : (r.completion_date ? new Date(r.completion_date).toLocaleDateString('pt-BR') : '—'),
              validityDate: isPendente ? '—' : (r.validity_date ? new Date(r.validity_date).toLocaleDateString('pt-BR') : '—'),
              daysRemaining: isPendente ? 0 : (r.days_remaining ?? (r.validity_date ? Math.floor((new Date(r.validity_date).getTime() - Date.now()) / 86400000) : 0)),
              complianceRate: r.compliance_rate,
              status: r.status,
              instructor: r.instructor,
              certificateHash: r.certificate_hash,
              hours: r.procedures?.hours || 8,
            };
          }));
        }
        if (dbAssessmentList && dbAssessmentList.length > 0) {
          setAssessments(dbAssessmentList.map((a: any) => {
            const qs = (a.assessment_questions || []).map((q: any) => ({
              id: q.id,
              question: q.question,
              options: Array.isArray(q.options) ? q.options : [],
              correctOptionIndex: q.correct_index ?? 0,
              explanation: q.explanation || '',
            }));
            return {
              id: a.id,
              code: `AVAL-${a.procedure_code || a.id.slice(0, 6).toUpperCase()}`,
              title: a.title,
              procedureCode: a.procedure_code || '',
              procedureTitle: a.title,
              questionsCount: qs.length,
              minScorePercent: a.min_score_percent ?? 80,
              durationMinutes: a.duration_minutes ?? 20,
              maxAttempts: a.max_attempts ?? 2,
              tokenUuid: a.id,
              status: a.status as Assessment['status'],
              questions: qs,
              approvalRate: 0,
              totalSubmissions: 0,
              avgDurationMinutes: 0,
            };
          }));
        }
        if (dbEmployees) {
          setEmployees(dbEmployees.map((e: any) => ({
            id: e.id,
            name: e.name,
            role: e.role || '—',
            sector: e.sector || 'Operacional',
            avatarUrl: e.avatar_url || '/images/avatar_engineer.svg',
            admissionDate: e.admission_date ? new Date(e.admission_date).toLocaleDateString('pt-BR') : '—',
            cpfMasked: e.cpf ? `***.***.${e.cpf.slice(-6, -2)}-${e.cpf.slice(-2)}` : '—',
            email: e.email || '',
            phone: e.phone || undefined,
            status: e.status || 'Ativo',
          })));
        }

        // Load doc_control documents
        const dbDocuments = await fetchDocuments();
        if (dbDocuments) setDocuments(mapDocuments(dbDocuments));

        // Load legal obligations
        const dbObligations = await fetchLegalObligations();
        if (dbObligations) setObligations(mapObligations(dbObligations));

        // Load normative certs from Supabase (primary source of truth)
        const dbNormative = await fetchNormativeCerts();
        if (dbNormative.length > 0) {
          const mapped = dbNormative.map(mapNormativeRow);
          setNormativeCerts(mapped);
          // Keep localStorage in sync as offline fallback
          try { localStorage.setItem('tiger-normative-certs', JSON.stringify(mapped)); } catch { /* noop */ }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do Supabase:', err);
        showToast('Usando dados locais — verifique conexão com Supabase.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, [showToast, mapProcedures, mapNormativeRow, mapDocuments, mapObligations]);

  // ─── Realtime: atualiza trainings/metrics quando qualquer linha mudar ────
  const reloadLiveData = useCallback(async () => {
    try {
      const [dbRecords, dbMetrics, dbSector] = await Promise.all([
        fetchTrainingRecords(),
        fetchDashboardMetrics(),
        fetchSectorChartData(),
      ]);
      if (dbMetrics) setMetrics(dbMetrics);
      if (dbSector && dbSector.length > 0) setSectorData(dbSector);
      if (dbRecords) {
        setRecords(dbRecords.map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id,
          employeeName: r.employees?.name || '—',
          employeeRole: r.employees?.role || '—',
          employeeAvatar: r.employees?.avatar_url || '/images/avatar_engineer.svg',
          sector: r.employees?.sector || '—',
          procedureCode: r.procedures?.code || '—',
          procedureRevision: r.procedures?.revision || undefined,
          procedureName: r.procedures?.name || '—',
          completionDate: r.completion_date
            ? new Date(r.completion_date).toLocaleDateString('pt-BR')
            : '—',
          validityDate: r.validity_date
            ? new Date(r.validity_date).toLocaleDateString('pt-BR')
            : '—',
          daysRemaining: r.days_remaining ?? (r.validity_date ? Math.floor((new Date(r.validity_date).getTime() - Date.now()) / 86400000) : 0),
          complianceRate: r.compliance_rate,
          status: r.status,
          instructor: r.instructor,
          certificateHash: r.certificate_hash,
          hours: r.procedures?.hours || 8,
        })));
      }
    } catch (err) {
      console.error('[realtime] reload failed:', err);
    }
  }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    const channel = supabase
      .channel('live-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trainings' },
        () => { reloadLiveData(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'responses' },
        () => { reloadLiveData(); }
      )
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, [reloadLiveData]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleImportCert = (rec: TrainingRecord) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === rec.id
          ? { ...r, status: 'Certificado', daysRemaining: 365, complianceRate: 100, validityDate: new Date(Date.now() + 365 * 86400000).toLocaleDateString('pt-BR'), certificateHash: `CERT-${new Date().getFullYear()}-BR-${Math.floor(1000 + Math.random() * 9000)}` }
          : r
      )
    );
    showToast(`Certificado de ${rec.employeeName} homologado!`);
  };

  const handlePlanScheduled = (planName: string, count: number) => {
    showToast(`Plano "${planName}" gerado para ${count} colaboradores!`);
  };

  const handleProcedureCreated = (newProc: Procedure) => {
    setProcedures((prev) => [newProc, ...prev]);
    const sectors = newProc.sectors?.length ? newProc.sectors.join(', ') : newProc.sector;
    showToast(`Procedimento ${newProc.code} criado! Gerando avaliação para ${sectors}...`);
    // Dispara geração automática de avaliação logo após criar o procedimento
    handleGenerateAssessmentForProcedure(newProc);
  };

  const handleProcedureImported = (importedProc: Procedure) => {
    setProcedures((prev) => [importedProc, ...prev]);
    showToast(`Procedimento ${importedProc.code} importado com ${importedProc.questionsCount} questões!`);
  };

  const handleViewHistory = useCallback((rec: TrainingRecord) => {
    setHistoryRecord(rec);
  }, []);

  const handleSaveTrainingRecord = useCallback(async () => {
    showToast('Certificação registrada com sucesso!');
    await reloadLiveData();
  }, [showToast, reloadLiveData]);

  const handleAssessmentCompleted = useCallback((score: number, passed: boolean) => {
    if (passed) {
      showToast(`Aprovado com ${score}%! Certificado emitido.`);
      reloadLiveData();
    } else {
      showToast(`Nota ${score}% — abaixo do mínimo de ${selectedAssessmentForTaker?.minScorePercent ?? 80}%. Reteste disponível.`, 'error');
    }
  }, [showToast, reloadLiveData, selectedAssessmentForTaker]);

  const handleApproveAssessment = async (id: string) => {
    const ok = await updateAssessmentStatus(id, 'Ativa');
    if (!ok) {
      showToast('Erro ao aprovar avaliação.', 'error');
      return;
    }

    setAssessments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'Ativa' } : a));
    showToast('Avaliação aprovada! Vinculando aos colaboradores dos setores...');

    // Busca a avaliação aprovada para encontrar o procedimento e seus setores
    const assessment = assessments.find((a) => a.id === id);
    if (!assessment) {
      console.warn('handleApproveAssessment: avaliação não encontrada no estado', id);
      return;
    }

    const proc = procedures.find((p) => p.code === assessment.procedureCode);
    if (!proc) {
      console.warn('handleApproveAssessment: procedimento não encontrado para código', assessment.procedureCode);
      showToast('Avaliação ativa! (Procedimento não localizado — recarregue a página para vincular colaboradores.)', 'error');
      return;
    }

    const sectors = proc.sectors?.length ? proc.sectors : (proc.sector ? [proc.sector] : []);
    if (sectors.length === 0) {
      showToast('Avaliação ativa! Nenhum setor configurado para este procedimento.');
      return;
    }

    const { count } = await autoGenerateMatrixForProcedure(proc.id, sectors);
    if (count > 0) {
      // Recarrega os registros da matriz para refletir os novos pendentes
      const updated = await fetchTrainingRecords();
      if (updated) {
        setRecords(updated.map((r: any) => {
          const isPendente = r.status === 'Pendente';
          return {
            id: r.id,
            employeeId: r.employee_id,
            employeeName: r.employees?.name || '—',
            employeeRole: r.employees?.role || '—',
            employeeAvatar: r.employees?.avatar_url || '/images/avatar_engineer.svg',
            sector: r.employees?.sector || '—',
            procedureCode: r.procedures?.code || '—',
            procedureRevision: r.procedures?.revision || undefined,
            procedureName: r.procedures?.name || '—',
            completionDate: isPendente ? '—' : (r.completion_date ? new Date(r.completion_date).toLocaleDateString('pt-BR') : '—'),
            validityDate: isPendente ? '—' : (r.validity_date ? new Date(r.validity_date).toLocaleDateString('pt-BR') : '—'),
            daysRemaining: isPendente ? 0 : (r.days_remaining ?? (r.validity_date ? Math.floor((new Date(r.validity_date).getTime() - Date.now()) / 86400000) : 0)),
            status: r.status || 'Pendente',
            complianceRate: r.compliance_rate ?? 0,
            instructor: r.instructor,
            certificateHash: r.certificate_hash || undefined,
            hours: r.procedures?.hours || 8,
          };
        }));
      }
      showToast(`✅ Avaliação ativa! ${count} colaborador(es) de "${sectors.join(', ')}" vinculado(s) automaticamente.`);
    } else {
      showToast('Avaliação ativa! Todos os colaboradores do setor já estão na matriz.');
    }
  };

  const handleArchiveAssessment = async (id: string) => {
    const ok = await updateAssessmentStatus(id, 'Encerrada');
    if (ok) {
      setAssessments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'Encerrada' } : a));
      showToast('Avaliação encerrada.');
    } else {
      showToast('Erro ao encerrar avaliação.', 'error');
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    const ok = await deleteAssessment(id);
    if (ok) {
      setAssessments((prev) => prev.filter((a) => a.id !== id));
      showToast('Rascunho descartado. Você pode gerar novamente.');
    } else {
      showToast('Erro ao descartar avaliação.', 'error');
    }
  };

  const handleGenerateEmployeeLink = async (assessmentId: string, employeeId: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/assessments/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, employeeId }),
      });
      const data = await res.json();
      if (!res.ok || !data.tokenUuid) {
        showToast('Erro ao gerar link para o colaborador.', 'error');
        return null;
      }
      return data.tokenUuid as string;
    } catch {
      showToast('Erro ao gerar link.', 'error');
      return null;
    }
  };

  const handleGenerateAssessmentForProcedure = async (proc: Procedure) => {
    try {
      const res = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: [
            `Procedimento: ${proc.name}`,
            `Código: ${proc.code}`,
            proc.revision ? `Revisão: ${proc.revision}` : '',
            proc.criticality ? `Criticidade: ${proc.criticality}` : '',
            proc.sectors?.length ? `Setores: ${proc.sectors.join(', ')}` : '',
            (proc.description || proc.application)
              ? `Descrição/Conteúdo: ${proc.description || proc.application}`
              : '',
          ].filter(Boolean).join('\n'),
          procedureCode: proc.code,
          procedureName: proc.name,
          fileUrl: proc.fileUrl ?? null,
        }),
      });
      const qData = await res.json();
      if (!qData.questions?.length) {
        const errMsg = qData.error || 'IA não retornou questões. Tente novamente.';
        showToast(errMsg, 'error');
        return;
      }
      // Avisa se usou questões padrão (Gemini indisponível ou sem chave configurada)
      if (qData.source === 'mock') {
        const reason = qData.geminiError || 'IA indisponível';
        console.warn('Usando questões padrão. Motivo:', reason);
        showToast(`Questões padrão geradas — IA indisponível. Configure GEMINI_API_KEY no Vercel para questões personalizadas ao procedimento.`, 'error');
        // Continua — salva as questões padrão mesmo assim
      }
      const newId = await saveAssessmentDraft({
        procedure_code: proc.code,
        title: proc.name,
        questions: qData.questions.map((q: any) => ({
          question: q.question,
          options: q.options,
          correct_index: q.correctOptionIndex ?? 0,
          explanation: q.explanation || '',
        })),
      });
      if (!newId) { showToast('Erro ao salvar avaliação.', 'error'); return; }
      const qs = qData.questions.map((q: any, i: number) => ({
        id: `q-${newId}-${i}`,
        question: q.question,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex ?? 0,
        explanation: q.explanation || '',
      }));
      const newAssessment: Assessment = {
        id: newId,
        code: `AVAL-${proc.code}`,
        title: proc.name,
        procedureCode: proc.code,
        procedureTitle: proc.name,
        questionsCount: qs.length,
        minScorePercent: 80,
        durationMinutes: Math.max(20, Math.round(qs.length * 2)),
        maxAttempts: 2,
        tokenUuid: newId,
        status: 'Rascunho',
        questions: qs,
        approvalRate: 0,
        totalSubmissions: 0,
        avgDurationMinutes: 0,
      };
      setAssessments((prev) => [newAssessment, ...prev]);
      showToast(`Avaliação de "${proc.code}" gerada! Revise e aprove.`);
    } catch (err) {
      console.error('handleGenerateAssessmentForProcedure:', err);
      showToast('Erro ao gerar avaliação via IA.', 'error');
    }
  };

  const handleProcedureUpdated = useCallback(async (id: string, data: {
    name?: string; revision?: string; status?: string; criticality?: string;
    docType?: string; docLastRevisionDate?: string | null;
    docRevisionMonths?: number; docResponsible?: string | null;
    revisionNotes?: string; procedureCode?: string;
  }) => {
    const result = await updateProcedure(id, data);
    if (result.error) {
      showToast('Erro ao atualizar procedimento: ' + result.error, 'error');
      return;
    }
    // Registra histórico de revisão quando há data de última revisão
    if (data.docLastRevisionDate && data.procedureCode) {
      await saveRevisionHistory({
        procedureId: id,
        procedureCode: data.procedureCode,
        revision: data.revision,
        revisionDate: data.docLastRevisionDate,
        responsible: data.docResponsible,
        notes: data.revisionNotes,
      });
    }
    showToast('Procedimento atualizado ✓');
    // Reload procedures from DB so trigger-computed fields refresh
    const dbProcs = await fetchProcedures();
    if (dbProcs) setProcedures(mapProcedures(dbProcs));
  }, [showToast]);

  const handleSaveDocument = useCallback(async (data: {
    code: string; name: string; docType: string; issuingBody?: string;
    issueDate?: string; expiryDate?: string; renewalMonths?: number;
    responsible?: string; notes?: string; file?: File | null; base?: string;
  }) => {
    const result = await saveDocument(data);
    if (result.error) {
      showToast('Erro ao salvar documento: ' + result.error, 'error');
      return;
    }
    showToast(`Documento ${data.code} cadastrado ✓`);
    // Reload from DB to get trigger-computed status
    const dbDocs = await fetchDocuments();
    if (dbDocs) setDocuments(mapDocuments(dbDocs));
  }, [showToast, mapDocuments]);

  const handleSaveObligation = useCallback(async (data: {
    title: string; description?: string; frequency: string;
    responsible?: string; lastDoneDate?: string;
    base?: string; docControlId?: string; notes?: string;
  }) => {
    const result = await saveLegalObligation(data);
    if (result.error) {
      showToast('Erro ao salvar obrigação: ' + result.error, 'error');
      return;
    }
    showToast(`Obrigação "${data.title}" cadastrada ✓`);
    const dbObs = await fetchLegalObligations();
    if (dbObs) setObligations(mapObligations(dbObs));
  }, [showToast, mapObligations]);

  const handleObligationDone = useCallback(async (id: string, date: string) => {
    const result = await updateLegalObligationDone(id, date);
    if (result.error) {
      showToast('Erro ao registrar realização: ' + result.error, 'error');
      return;
    }
    showToast('Realização registrada ✓');
    const dbObs = await fetchLegalObligations();
    if (dbObs) setObligations(mapObligations(dbObs));
  }, [showToast, mapObligations]);

  const handleExportData = (format: 'csv' | 'json' | 'print') => {
    if (format === 'csv') {
      const headers = 'Colaborador,Cargo,Setor,Procedimento,DataConclusao,Validade,DiasRestantes,Conformidade,Status\n';
      const rows = records
        .map((r) => `"${r.employeeName}","${r.employeeRole}","${r.sector}","${r.procedureCode}","${r.completionDate}","${r.validityDate}",${r.daysRemaining},${r.complianceRate}%,"${r.status}"`)
        .join('\n');
      const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `matriz_conformidade_qsms_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Download da matriz CSV iniciado!');
    } else if (format === 'json') {
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `matriz_qsms_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Download JSON iniciado!');
    } else {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex font-sans antialiased">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <Header
          currentTab={currentTab}
          isSupabaseConnected={isSupabaseConfigured}
        />

        {isLoading && (
          <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Carregando dados do Supabase...
          </div>
        )}

        <main className="flex-1 pb-12">
          {currentTab === 'dashboard' && (
            <DashboardScreen
              metrics={adjustedMetrics}
              sectorData={sectorData}
              projectionData={projectionData}
              criticalTrainings={[
                ...records.filter((r) => r.status !== 'Certificado' || r.daysRemaining <= 90),
                ...normativeAsTraining,
              ]}
              onOpenNewPlanModal={() => setIsNewPlanModalOpen(true)}
              onImportCert={handleImportCert}
              complianceDelta={complianceDelta}
            />
          )}
          {currentTab === 'procedimentos' && (
            <ProceduresScreen
              procedures={procedures}
              onOpenNewProcedureAiModal={() => setIsNewProcedureModalOpen(true)}
              onSelectProcedure={(p) => setSelectedProcedureDetails(p)}
              onImportDocument={() => setIsImportDocOpen(true)}
              onManageExam={(p) => setSelectedExamProcedure(p)}
              onProcedureCreated={loadProceduresFromDB}
              onEditProcedure={handleProcedureUpdated}
            />
          )}
          {currentTab === 'provas' && (
            <AssessmentsScreen
              procedures={procedures}
              assessments={assessments}
              records={records}
              employees={employees}
              onApproveAssessment={handleApproveAssessment}
              onArchiveAssessment={handleArchiveAssessment}
              onDeleteAssessment={handleDeleteAssessment}
              onOpenAssessmentTaker={(a) => {
                setSelectedAssessmentForTaker(a);
                setIsAssessmentTakerOpen(true);
              }}
              onGenerateAssessment={handleGenerateAssessmentForProcedure}
              onGenerateEmployeeLink={handleGenerateEmployeeLink}
              onSyncMatrix={async () => {
                showToast('Sincronizando matriz com procedimentos ativos...');
                const { total } = await syncMatrixForAllActiveProcedures();
                if (total > 0) {
                  const updated = await fetchTrainingRecords();
                  if (updated) {
                    setRecords(updated.map((r: any) => {
                      const isPendente = r.status === 'Pendente';
                      return {
                        id: r.id,
                        employeeId: r.employee_id,
                        employeeName: r.employees?.name || '—',
                        employeeRole: r.employees?.role || '—',
                        employeeAvatar: r.employees?.avatar_url || '/images/avatar_engineer.svg',
                        sector: r.employees?.sector || '—',
                        procedureCode: r.procedures?.code || '—',
                        procedureRevision: r.procedures?.revision || undefined,
                        procedureName: r.procedures?.name || '—',
                        completionDate: isPendente ? '—' : (r.completion_date ? new Date(r.completion_date).toLocaleDateString('pt-BR') : '—'),
                        validityDate: isPendente ? '—' : (r.validity_date ? new Date(r.validity_date).toLocaleDateString('pt-BR') : '—'),
                        daysRemaining: isPendente ? 0 : (r.days_remaining ?? 0),
                        complianceRate: r.compliance_rate ?? 0,
                        status: r.status || 'Pendente',
                        instructor: r.instructor,
                        certificateHash: r.certificate_hash || undefined,
                        hours: r.procedures?.hours || 8,
                      };
                    }));
                  }
                  showToast(`✅ ${total} registro(s) criado(s) na matriz.`);
                } else {
                  showToast('Matriz já está sincronizada.');
                }
              }}
            />
          )}
          {currentTab === 'doc-controle' && (
            <DocControlScreen
              documents={documents}
              onDocumentSaved={handleSaveDocument}
            />
          )}
          {currentTab === 'obrigacoes-legais' && (
            <LegalObligationsScreen
              obligations={obligations}
              documents={documents}
              onObligationSaved={handleSaveObligation}
              onObligationDone={handleObligationDone}
            />
          )}
          {currentTab === 'colaboradores' && <EmployeesScreen />}
          {currentTab === 'certificados' && (
            <CertificatesScreen
              records={records}
              normativeCerts={normativeCerts}
              onSaveNormativeCert={handleSaveNormativeCert}
              onAttachNormativeCert={handleAttachNormativeCert}
            />
          )}
          {currentTab === 'matriz' && (
            <MatrixScreen
              records={records}
              assessments={assessments}
              onRegisterEmployee={() => setCurrentTab('colaboradores')}
              employees={employees}
              onSendLink={handleGenerateEmployeeLink}
              onRegisterTraining={(rec) => {
                setPrefillTrainingRecord(rec);
                setIsRegisterTrainingOpen(true);
              }}
              onViewHistory={handleViewHistory}
            />
          )}
        </main>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 text-white text-xs font-medium rounded-xl shadow-xl border animate-slide-up ${toastType === 'error' ? 'bg-red-900 border-red-700' : 'bg-slate-900 border-slate-700'}`}>
          {toastType === 'error'
            ? <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <ImageLinksModal isOpen={isImagesModalOpen} onClose={() => setIsImagesModalOpen(false)} />
      <SupabaseSchemaModal isOpen={isSchemaModalOpen} onClose={() => setIsSchemaModalOpen(false)} />
      {selectedAssessmentForTaker && <AssessmentTakerModal isOpen={isAssessmentTakerOpen} onClose={() => { setIsAssessmentTakerOpen(false); setSelectedAssessmentForTaker(null); }} assessment={selectedAssessmentForTaker} onComplete={handleAssessmentCompleted} />}
      <NewProcedureAiModal isOpen={isNewProcedureModalOpen} onClose={() => setIsNewProcedureModalOpen(false)} onProcedureCreated={handleProcedureCreated} />
      <NewTrainingPlanModal isOpen={isNewPlanModalOpen} onClose={() => setIsNewPlanModalOpen(false)} procedures={procedures} onPlanScheduled={handlePlanScheduled} />
      <ProcedureDetailsModal procedure={selectedProcedureDetails} onClose={() => setSelectedProcedureDetails(null)} />
      <ProcedureExamModal
        procedure={selectedExamProcedure}
        onClose={() => setSelectedExamProcedure(null)}
        onGoToAssessments={() => setCurrentTab('provas')}
      />
      <RegisterTrainingModal
        key={prefillTrainingRecord?.id ?? 'default'}
        isOpen={isRegisterTrainingOpen}
        onClose={() => { setIsRegisterTrainingOpen(false); setPrefillTrainingRecord(null); }}
        procedures={procedures}
        onSaved={handleSaveTrainingRecord}
        initialEmployeeName={prefillTrainingRecord?.employeeName}
        initialProcedureCode={prefillTrainingRecord?.procedureCode}
      />
      <NotifyModal isOpen={notifyRecord !== null} onClose={() => setNotifyRecord(null)} record={notifyRecord} assessments={assessments} />
      {historyRecord && (
        <TrainingHistoryModal
          isOpen={historyRecord !== null}
          onClose={() => setHistoryRecord(null)}
          employeeId={historyRecord.employeeId}
          employeeName={historyRecord.employeeName}
          procedureCode={historyRecord.procedureCode}
          procedureName={historyRecord.procedureName}
        />
      )}
      {/* <ImportDocumentModal isOpen={isImportDocOpen} onClose={() => setIsImportDocOpen(false)} onProcedureImported={handleProcedureImported} /> */}
    </div>
  );
}
