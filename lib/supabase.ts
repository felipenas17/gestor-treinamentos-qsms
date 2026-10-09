import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// ─── Helpers tipados ────────────────────────────────────────────────────────

export async function fetchProcedures() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('procedures')
    .select('*, sector_procedure_matrix(sector)')
    .order('code');
  if (error) { console.error('fetchProcedures:', error); return null; }
  return data;
}

export async function fetchTrainingRecords() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('trainings')
    .select(`
      *,
      employees (id, name, role, sector, email, avatar_url),
      procedures (id, code, name, sector)
    `)
    .order('validity_date');
  if (error) { console.error('fetchTrainingRecords:', error); return null; }
  return data;
}

export async function fetchDashboardMetrics() {
  if (!supabase) return null;
  const today = new Date().toISOString().split('T')[0];
  const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [active, expiring, expired] = await Promise.all([
    supabase.from('trainings').select('id', { count: 'exact', head: true }).eq('status', 'Certificado'),
    supabase.from('trainings').select('id', { count: 'exact', head: true }).eq('status', 'Reciclar'),
    supabase.from('trainings').select('id', { count: 'exact', head: true }).eq('status', 'Vencido'),
  ]);

  const total = (active.count || 0) + (expiring.count || 0) + (expired.count || 0);
  const compliance = total > 0 ? Math.round(((active.count || 0) / total) * 1000) / 10 : 100;

  return {
    generalCompliance: compliance,
    activeCertifications: active.count || 0,
    expiringIn60Days: expiring.count || 0,
    expiredDocuments: expired.count || 0,
  };
}

export async function fetchSectorChartData() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('trainings')
    .select('status, employees(sector)');
  if (error || !data) return null;

  const map: Record<string, { certificados: number; falhas: number }> = {};
  for (const row of data as any[]) {
    const sector = row.employees?.sector || 'Outros';
    if (!map[sector]) map[sector] = { certificados: 0, falhas: 0 };
    if (row.status === 'Certificado') map[sector].certificados++;
    else map[sector].falhas++;
  }
  return Object.entries(map).map(([sector, v]) => ({ sector, ...v }));
}

export async function insertTraining(payload: {
  employee_id: string;
  procedure_id: string;
  completion_date: string;
  validity_date: string;
  compliance_rate: number;
  instructor?: string;
}) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('trainings')
    .insert({ ...payload, status: 'Certificado' })
    .select()
    .single();
  if (error) { console.error('insertTraining:', error); return null; }
  return data;
}

export async function generateAssessmentLink(assessmentId: string, employeeId?: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('assessment_links')
    .insert({
      assessment_id: assessmentId,
      employee_id: employeeId || null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      max_uses: 2,
    })
    .select('token_uuid')
    .single();
  if (error) { console.error('generateAssessmentLink:', error); return null; }
  return data?.token_uuid;
}

// ─── Employees ──────────────────────────────────────────────────────────────

export async function fetchEmployees() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name');
  if (error) { console.error('fetchEmployees:', error); return null; }
  return data;
}

export async function upsertEmployee(payload: {
  id?: string;
  name: string;
  role: string;
  sector: string;
  email: string;
  phone?: string;
  cpf_masked?: string;
  admission_date?: string;
  status?: string;
}) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('employees')
    .upsert({
      ...payload,
      admission_date: payload.admission_date || new Date().toISOString().split('T')[0],
      status: payload.status || 'Ativo',
    }, { onConflict: 'id' })
    .select()
    .single();
  if (error) { console.error('upsertEmployee:', error); return null; }
  return data;
}

export async function deleteEmployee(id: string) {
  if (!supabase) return false;
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) { console.error('deleteEmployee:', error); return false; }
  return true;
}

// ─── Auto-Matriz: gera registros pendentes ao cadastrar colaborador ─────────

export async function autoGenerateMatrixForEmployee(employeeId: string, sector: string) {
  if (!supabase) return { count: 0 };

  // 1. Busca todos os procedimentos obrigatórios para o setor
  const { data: matrix, error: matrixError } = await supabase
    .from('sector_procedure_matrix')
    .select('procedure_id')
    .eq('sector', sector);

  if (matrixError || !matrix || matrix.length === 0) {
    console.warn('autoGenerateMatrixForEmployee: sem procedimentos para setor', sector, matrixError);
    return { count: 0 };
  }

  // 2. Verifica quais treinamentos o colaborador já tem (evita duplicatas)
  const procedureIds = matrix.map((m: any) => m.procedure_id);
  const { data: existing } = await supabase
    .from('trainings')
    .select('procedure_id')
    .eq('employee_id', employeeId)
    .in('procedure_id', procedureIds);

  const existingIds = new Set((existing || []).map((t: any) => t.procedure_id));
  const missing = procedureIds.filter((id: string) => !existingIds.has(id));

  if (missing.length === 0) return { count: 0 };

  // 3. Insere registros pendentes para os procedimentos que faltam
  const records = missing.map((procedure_id: string) => ({
    employee_id: employeeId,
    procedure_id,
    status: 'Pendente',
    completion_date: null,
    validity_date: null,
    compliance_rate: 0,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('trainings')
    .insert(records)
    .select('id');

  if (insertError) {
    console.error('autoGenerateMatrixForEmployee insert error:', insertError);
    return { count: 0 };
  }

  return { count: inserted?.length ?? 0 };
}

export async function fetchAssessmentByProcedureCode(procedureCode: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('assessments')
    .select('*, assessment_questions(*)')
    .eq('procedure_code', procedureCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error('fetchAssessmentByProcedureCode:', error); return null; }
  return data;
}

export async function fetchLatestAssessment() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('assessments')
    .select('*, assessment_questions(*)')
    .eq('status', 'Ativa')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error('fetchLatestAssessment:', error); return null; }
  return data;
}

export async function fetchRespondentsByAssessment(assessmentId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('assessment_links')
    .select('*, employees(name, role, sector, avatar_url)')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchRespondentsByAssessment:', error); return []; }
  return data || [];
}

export async function saveProcedure(data: {
  code: string; revision?: string; name: string; description: string;
  hours: string; validityMonths: string;
  criticality: string; sectors: string[];
  file?: File;
}) {
  if (!supabase) return { error: 'not configured' };

  // Upload do PDF para o Storage antes de inserir o registro
  let fileUrl: string | null = null;
  if (data.file) {
    const ext = data.file.name.split('.').pop() || 'pdf';
    const safeName = data.code.replace(/[^a-zA-Z0-9-]/g, '_');
    const path = `procedures/${safeName}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('procedure-docs')
      .upload(path, data.file, { upsert: true, contentType: data.file.type || 'application/pdf' });
    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('procedure-docs')
        .getPublicUrl(path);
      fileUrl = urlData.publicUrl;
    } else {
      console.warn('saveProcedure: upload falhou, procedimento será salvo sem arquivo', uploadError);
    }
  }

  const { data: proc, error } = await supabase
    .from('procedures')
    .insert({
      code: data.code,
      revision: data.revision || 'R00',
      name: data.name,
      description: data.description,
      hours: parseInt(data.hours) || 0,
      validity_months: parseInt(data.validityMonths),
      criticality: data.criticality,
      file_url: fileUrl,
      status: 'Ativo'
    })
    .select('id').single();
  if (error || !proc) return { error };
  if (data.sectors.length > 0) {
    await supabase.from('sector_procedure_matrix')
      .insert(data.sectors.map(sector => ({ sector, procedure_id: proc.id })));
  }
  return { id: proc.id };
}

// ─── Assessments (banco completo) ───────────────────────────────────────────

export async function fetchAllAssessments() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('assessments')
    .select('*, assessment_questions(*)')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchAllAssessments:', error); return null; }
  return data;
}

export async function saveAssessmentDraft(payload: {
  procedure_code: string;
  title: string;
  questions: Array<{
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }>;
}) {
  if (!supabase) return null;
  const { data: asmnt, error } = await supabase
    .from('assessments')
    .insert({
      procedure_code: payload.procedure_code,
      title: payload.title,
      status: 'Rascunho',
      min_score_percent: 80,
      duration_minutes: 20,
      max_attempts: 2,
    })
    .select('id')
    .single();
  if (error || !asmnt) { console.error('saveAssessmentDraft:', error); return null; }
  if (payload.questions.length > 0) {
    const qRecords = payload.questions.map((q) => ({
      assessment_id: asmnt.id,
      question: q.question,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
    }));
    const { error: qErr } = await supabase.from('assessment_questions').insert(qRecords);
    if (qErr) console.error('saveAssessmentDraft questions:', qErr);
  }
  return asmnt.id as string;
}

export async function updateAssessmentStatus(id: string, status: 'Ativa' | 'Rascunho' | 'Encerrada') {
  if (!supabase) return false;
  const { error } = await supabase.from('assessments').update({ status }).eq('id', id);
  if (error) { console.error('updateAssessmentStatus:', error); return false; }
  return true;
}

export async function deleteAssessment(id: string) {
  if (!supabase) return false;
  // Questions are deleted via ON DELETE CASCADE on assessment_id FK
  const { error } = await supabase.from('assessments').delete().eq('id', id);
  if (error) { console.error('deleteAssessment:', error); return false; }
  return true;
}
