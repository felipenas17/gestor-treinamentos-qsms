import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Temporary admin fix route — DELETE THIS FILE after use
// POST { "key": "<supabase service role key>" }
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return NextResponse.json({ error: 'No Supabase URL' }, { status: 500 });

  let body: { key?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }

  const serviceKey = body.key ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'No service key provided' }, { status: 400 });

  const admin = createClient(url, serviceKey);

  // 1) Diagnose
  const { data: before, error: selErr } = await admin
    .from('trainings')
    .select('id, status, compliance_rate, validity_date, completion_date, procedures(code)')
    .eq('employee_id', '0150e37e-b0bd-4b99-a969-c0acb024cfed');

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  // 2) Fix: change any Certificado row with compliance_rate < 80 → Reciclar
  const { data: fixed, error: updErr } = await admin
    .from('trainings')
    .update({ status: 'Reciclar', validity_date: null })
    .eq('employee_id', '0150e37e-b0bd-4b99-a969-c0acb024cfed')
    .eq('status', 'Certificado')
    .lt('compliance_rate', 80)
    .select('id, status, compliance_rate');

  // 3) Re-read to confirm
  const { data: after } = await admin
    .from('trainings')
    .select('id, status, compliance_rate, validity_date, procedures(code)')
    .eq('employee_id', '0150e37e-b0bd-4b99-a969-c0acb024cfed');

  return NextResponse.json({ before, fixed, updErr: updErr?.message ?? null, after });
}
