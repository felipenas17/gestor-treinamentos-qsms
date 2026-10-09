'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { EmployeesScreen } from '@/components/screens/employees-screen';
import { CertificatesScreen } from '@/components/screens/certificates-screen';
// import { ImportDocumentModal } from '@/components/modals/import-document-modal'; // modal não ativo

import {
  INITIAL_METRICS,
  SECTOR_CHART_DATA,
  PROJECTION_CHART_DATA,
} from '@/lib/mock-data';

import {
  isSupabaseConfigured,
  fetchDashboardMetrics,
  fetchProcedures,
  fetchTrainingRecords,
  fetchSectorChartData,
  fetchAllAssessments,
  updateAssessmentStatus,
  saveAssessmentDraft,
  deleteAssessment,
} from '@/lib/supabase';

import { Procedure, TrainingRecord, Assessment, RespondentStatus } from '@/types';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function GestorTreinamentosApp() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  // Core reactive data states (inicia com mock, substitui com Supabase quando disponível)
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [sectorData, setSectorData] = useState(SECTOR_CHART_DATA);
  const [projectionData, setProjectionData] = useState(PROJECTION_CHART_DATA);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentForTaker, setSelectedAssessmentForTaker] = useState<Assessment | null>(null);
  const [respondents, setRespondents] = useState<RespondentStatus[]>([]);

  // Modal states
  const [isImagesModalOpen, setIsImagesModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [isNewProcedureModalOpen, setIsNewProcedureModalOpen] = useState(false);
  const [isAssessmentTakerOpen, setIsAssessmentTakerOpen] = useState(false);
  const [isRegisterTrainingOpen, setIsRegisterTrainingOpen] = useState(false);
  const [isImportDocOpen, setIsImportDocOpen] = useState(false);
  const [selectedProcedureDetails, setSelectedProcedureDetails] = useState<Procedure | null>(null);
  const [selectedExamProcedure, setSelectedExamProcedure] = useState<Procedure | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

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
      };
    });
  }, []);

  const loadProceduresFromDB = useCallback(async () => {
    const dbProcedures = await fetchProcedures();
    if (dbProcedures) setProcedures(mapProcedures(dbProcedures));
  }, [mapProcedures]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadAll = async () => {
      setIsLoading(true);
      try {
        const [dbMetrics, dbProcedures, dbRecords, dbSector, dbAssessmentList] = await Promise.all([
          fetchDashboardMetrics(),
          fetchProcedures(),
          fetchTrainingRecords(),
          fetchSectorChartData(),
          fetchAllAssessments(),
        ]);

        if (dbMetrics) setMetrics(dbMetrics);
        if (dbSector && dbSector.length > 0) setSectorData(dbSector);

        if (dbProcedures) {
          setProcedures(mapProcedures(dbProcedures));
        }

        if (dbRecords && dbRecords.length > 0) {
          setRecords(dbRecords.map((r: any) => ({
            id: r.id,
            employeeId: r.employee_id,
            employeeName: r.employees?.name || '—',
            employeeRole: r.employees?.role || '—',
            employeeAvatar: r.employees?.avatar_url || '/images/avatar_engineer.svg',
            sector: r.employees?.sector || '—',
            procedureCode: r.procedures?.code || '—',
            procedureName: r.procedures?.name || '—',
            completionDate: new Date(r.completion_date).toLocaleDateString('pt-BR'),
            validityDate: new Date(r.validity_date).toLocaleDateString('pt-BR'),
            daysRemaining: r.days_remaining,
            complianceRate: r.compliance_rate,
            status: r.status,
            instructor: r.instructor,
            certificateHash: r.certificate_hash,
          })));
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
      } catch (err) {
        console.error('Erro ao carregar dados do Supabase:', err);
        showToast('Usando dados locais — verifique conexão com Supabase.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, [showToast, mapProcedures]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleScheduleExam = (rec: TrainingRecord) => {
    setIsAssessmentTakerOpen(true);
    showToast(`Avaliação aberta para ${rec.employeeName} — token UUID gerado.`);
  };

  const handleNotifyEmployee = (rec: TrainingRecord) => {
    showToast(`Notificação enviada para ${rec.employeeName} por e-mail.`);
  };

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
    showToast(`Procedimento ${newProc.code} criado via IA!`);
  };

  const handleProcedureImported = (importedProc: Procedure) => {
    setProcedures((prev) => [importedProc, ...prev]);
    showToast(`Procedimento ${importedProc.code} importado com ${importedProc.questionsCount} questões!`);
  };

  const handleSaveTrainingRecord = (newRec: TrainingRecord) => {
    setRecords((prev) => [newRec, ...prev]);
    showToast(`Certificação de ${newRec.employeeName} registrada!`);
  };

  const handleAssessmentCompleted = (score: number, passed: boolean) => {
    if (passed) {
      showToast(`Aprovado com ${score}%! Certificado emitido.`);
      setRespondents((prev) => [
        {
          id: `resp-${Date.now()}`,
          employeeId: 'emp-sim',
          name: 'Colaborador (Simulação)',
          role: 'Operador',
          sector: 'Operações Offshore',
          scorePercent: score,
          status: 'Entregue',
          submissionDate: new Date().toLocaleDateString('pt-BR'),
          dueDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString('pt-BR'),
          attemptsUsed: 1,
        },
        ...prev,
      ]);
    } else {
      showToast(`Nota ${score}% — abaixo do mínimo de ${selectedAssessmentForTaker?.minScorePercent ?? 80}%. Reteste disponível.`, 'error');
    }
  };

  const handleApproveAssessment = async (id: string) => {
    const ok = await updateAssessmentStatus(id, 'Ativa');
    if (ok) {
      setAssessments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'Ativa' } : a));
      showToast('Avaliação aprovada e ativada com sucesso!');
    } else {
      showToast('Erro ao aprovar avaliação.', 'error');
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
        }),
      });
      const qData = await res.json();
      if (!qData.questions?.length) {
        const errMsg = qData.error || 'IA não retornou questões. Tente novamente.';
        showToast(errMsg, 'error');
        return;
      }
      // Avisa se usou mock (Gemini falhou mas salvou assim mesmo)
      if (qData.source === 'mock' && qData.geminiError) {
        console.warn('Gemini falhou, usando mock. Erro:', qData.geminiError);
        showToast(`Gemini indisponível (${qData.geminiError.slice(0, 60)}). Usando questões padrão.`, 'error');
        // Continua — salva as questões mock mesmo assim
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
        onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
        onOpenImagesModal={() => setIsImagesModalOpen(true)}
        isSupabaseConnected={isSupabaseConfigured}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <Header
          currentTab={currentTab}
          onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
          onOpenImagesModal={() => setIsImagesModalOpen(true)}
          onQuickAction={
            currentTab === 'dashboard' ? () => setIsNewPlanModalOpen(true)
            : currentTab === 'procedimentos' ? () => setIsNewProcedureModalOpen(true)
            : currentTab === 'provas' ? () => setIsAssessmentTakerOpen(true)
            : () => setIsRegisterTrainingOpen(true)
          }
          quickActionLabel={
            currentTab === 'dashboard' ? 'Gerar Novo Plano de Treino'
            : currentTab === 'procedimentos' ? '+ Gerar POP c/ IA'
            : currentTab === 'provas' ? 'Simular Link de Prova'
            : 'Registrar Treinamento'
          }
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
              metrics={metrics}
              sectorData={sectorData}
              projectionData={projectionData}
              criticalTrainings={records.filter((r) => r.status !== 'Certificado' || r.daysRemaining <= 90)}
              onOpenNewPlanModal={() => setIsNewPlanModalOpen(true)}
              onScheduleExam={handleScheduleExam}
              onNotifyEmployee={handleNotifyEmployee}
              onImportCert={handleImportCert}
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
            />
          )}
          {currentTab === 'provas' && (
            <AssessmentsScreen
              procedures={procedures}
              assessments={assessments}
              onApproveAssessment={handleApproveAssessment}
              onArchiveAssessment={handleArchiveAssessment}
              onDeleteAssessment={handleDeleteAssessment}
              onOpenAssessmentTaker={(a) => {
                setSelectedAssessmentForTaker(a);
                setIsAssessmentTakerOpen(true);
              }}
              onGenerateAssessment={handleGenerateAssessmentForProcedure}
            />
          )}
          {currentTab === 'colaboradores' && <EmployeesScreen />}
          {currentTab === 'certificados' && <CertificatesScreen />}
          {currentTab === 'matriz' && (
            <MatrixScreen
              records={records}
              onRegisterEmployee={() => setCurrentTab('colaboradores')}
              onScheduleExam={handleScheduleExam}
              onNotifyEmployee={handleNotifyEmployee}
            />
          )}
        </main>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 text-white text-xs font-medium rounded-xl shadow-xl border animate-slide-up ${toastType === 'error' ? 'bg-red-900 border-red-700' : 'bg-slate-900 border-slate-700'}`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
      <RegisterTrainingModal isOpen={isRegisterTrainingOpen} onClose={() => setIsRegisterTrainingOpen(false)} procedures={procedures} onSaveRecord={handleSaveTrainingRecord} />
      {/* <ImportDocumentModal isOpen={isImportDocOpen} onClose={() => setIsImportDocOpen(false)} onProcedureImported={handleProcedureImported} /> */}
    </div>
  );
}
