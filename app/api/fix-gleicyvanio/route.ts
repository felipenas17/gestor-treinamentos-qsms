import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Temporary fix route — DELETE THIS FILE after use
// Strategy: trigger uses validity_date to compute status:
//   validity_date < today        → 'Vencido'
//   validity_date <= today+60d   → 'Reciclar'   ← we want this
//   else                         → 'Certificado'
// Setting validity_date = completion_date = today makes validity_date == today
// → falls in the "Reciclar" branch without being "Vencido" (not strictly <)
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });

  const admin = createClient(url, serviceKey);

  // 1) Ver estado atual
  const { data: before } = await admin
    .from('trainings')
    .select('id, status, compliance_rate, validity_date, completion_date, procedures(code)')
    .eq('employee_id', '0150e37e-b0bd-4b99-a969-c0acb024cfed');

  // 2) Corrigir: setar completion_date = validity_date = data real da prova (2026-10-15)
  //    O trigger verá validity_date IS NOT NULL → não recalcula, depois:
  //    '2026-10-15' <= '2026-12-14' (hoje+60d) → status = 'Reciclar'
  const targetDate = '2026-10-15'; // data real que Gleicyvânio fez a prova
  const { data: fixed, error: updErr } = await admin
    .from('trainings')
    .update({
      completion_date: targetDate,
      validity_date: targetDate,
      compliance_rate: 50,
    })
    .eq('id', 'f933a60b-f165-41b2-9900-fc99425556f9')
    .select('id, status, compliance_rate, validity_date, completion_date');

  // 3) Confirmar resultado
  const { data: after } = await admin
    .from('trainings')
    .select('id, status, compliance_rate, validity_date, completion_date, procedures(code)')
    .eq('employee_id', '0150e37e-b0bd-4b99-a969-c0acb024cfed');

  return NextResponse.json({ before, fixed, updErr: updErr?.message ?? null, after });
}
