import { NextResponse } from 'next/server';

// Rota temporária para aplicar migration via Supabase Management API
// REMOVER após execução bem-sucedida

const PROJECT_REF = 'zwmqiuemrsyjauvohgtl';

const STATEMENTS = [
  // 1. Torna colunas nullable
  `ALTER TABLE public.trainings ALTER COLUMN completion_date DROP NOT NULL`,
  `ALTER TABLE public.trainings ALTER COLUMN validity_date DROP NOT NULL`,

  // 2. Corrige trigger
  `CREATE OR REPLACE FUNCTION public.calculate_training_validity()
RETURNS trigger AS $$
DECLARE
  v_months integer;
BEGIN
  IF NEW.completion_date IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.validity_date IS NULL THEN
    SELECT validity_months INTO v_months
    FROM public.procedures
    WHERE id = NEW.procedure_id;
    v_months := COALESCE(v_months, 12);
    NEW.validity_date := NEW.completion_date + (v_months || ' months')::INTERVAL;
  END IF;
  IF NEW.validity_date < CURRENT_DATE THEN
    NEW.status := 'Vencido';
  ELSIF NEW.validity_date <= (CURRENT_DATE + INTERVAL '60 days') THEN
    NEW.status := 'Reciclar';
  ELSE
    NEW.status := 'Certificado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`,

  // 3. Função atômica uses_count
  `CREATE OR REPLACE FUNCTION public.increment_assessment_uses(p_link_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.assessment_links
  SET uses_count = uses_count + 1
  WHERE id = p_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER`,

  // 4. Tabela compliance_snapshots
  `CREATE TABLE IF NOT EXISTS public.compliance_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  general_compliance numeric(5,2) NOT NULL,
  active_certifications integer NOT NULL DEFAULT 0,
  expiring_in_60_days integer NOT NULL DEFAULT 0,
  expired_documents integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_snapshots_date_unique
   ON public.compliance_snapshots(snapshot_date)`,

  // 5. Corrige registros Pendentes com sentinel date
  `UPDATE public.trainings
   SET completion_date = NULL,
       validity_date = NULL,
       status = 'Pendente'
   WHERE status IN ('Reciclar','Certificado','Vencido')
     AND compliance_rate = 0
     AND completion_date IS NOT NULL
     AND completion_date = validity_date`,
];

async function runStatement(sql: string, serviceKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    const text = await res.text();
    if (!res.ok) return { ok: false, error: text };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 });
  }

  const results: { stmt: string; ok: boolean; error?: string }[] = [];

  for (const stmt of STATEMENTS) {
    const label = stmt.trim().slice(0, 80).replace(/\s+/g, ' ');
    const result = await runStatement(stmt, serviceKey);
    results.push({ stmt: label, ...result });
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ allOk, results }, { status: allOk ? 200 : 207 });
}
