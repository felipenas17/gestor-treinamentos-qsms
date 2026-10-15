import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Temporary fix route — DELETE THIS FILE after use
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });

  const admin = createClient(url, serviceKey);

  // 1) Ver o que está no banco para Gleicyvânio
  const { data: before } = await admin
    .from('trainings')
    .select('id, status, compliance_rate, validity_date, procedures(code)')
    .eq('employee_id', '0150e37e-b0bd-4b99-a969-c0acb024cfed');

  // 2) Corrigir: Certificado com < 80% → Reciclar
  const { data: fixed, error: updErr } = await admin
    .from('trainings')
    .update({ status: 'Reciclar', validity_date: null })
    .eq('employee_id', '0150e37e-b0bd-4b99-a969-c0acb024cfed')
    .eq('status', 'Certificado')
    .lt('compliance_rate', 80)
    .select('id, status, compliance_rate');

  // 3) Confirmar
  const { data: after } = await admin
    .from('trainings')
    .select('id, status, compliance_rate, validity_date, procedures(code)')
    .eq('employee_id', '0150e37e-b0bd-4b99-a969-c0acb024cfed');

  return NextResponse.json({ before, fixed, updErr: updErr?.message ?? null, after });
}
