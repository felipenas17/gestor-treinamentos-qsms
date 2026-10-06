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
    .select('*')
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
