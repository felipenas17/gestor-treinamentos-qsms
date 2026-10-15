import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Rota temporária one-time — remove após uso
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== 'tigertank-fix-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
  }

  // Busca todos os responses com link que tem employee_id
  const { data: responses, error: respErr } = await supabase
    .from('responses')
    .select(`
      id, score_percent, status, completed_at,
      assessment_links!inner(
        id, employee_id, assessment_id,
        assessments!inner(procedure_code, min_score_percent)
      )
    `)
    .order('completed_at', { ascending: false });

  if (respErr) {
    return NextResponse.json({ error: respErr.message }, { status: 500 });
  }

  const log: string[] = [];
  const fixed: object[] = [];

  for (const resp of (responses ?? [])) {
    const link = (resp as any).assessment_links;
    if (!link?.employee_id) {
      log.push(`Resp ${resp.id}: sem employee_id no link — ignorado`);
      continue;
    }
    const assessment = link.assessments;
    if (!assessment?.procedure_code) {
      log.push(`Resp ${resp.id}: sem procedure_code — ignorado`);
      continue;
    }

    const { data: proc } = await supabase
      .from('procedures')
      .select('id, validity_months')
      .eq('code', assessment.procedure_code)
      .maybeSingle();

    if (!proc) {
      log.push(`Resp ${resp.id}: procedure ${assessment.procedure_code} não encontrado`);
      continue;
    }

    const minScore: number = assessment.min_score_percent ?? 80;
    const score: number = resp.score_percent;
    const passed = score >= minScore;
    const completedAt = new Date(resp.completed_at);
    const completionDate = completedAt.toISOString().split('T')[0];

    if (passed) {
      const validityDate = new Date(completedAt);
      validityDate.setMonth(validityDate.getMonth() + (proc.validity_months || 12));
      const { error: updErr } = await supabase
        .from('trainings')
        .update({
          status: 'Certificado',
          completion_date: completionDate,
          validity_date: validityDate.toISOString().split('T')[0],
          compliance_rate: score,
        })
        .eq('procedure_id', proc.id)
        .eq('employee_id', link.employee_id);

      const msg = updErr
        ? `ERRO employee ${link.employee_id} proc ${assessment.procedure_code}: ${updErr.message}`
        : `OK: employee ${link.employee_id} | proc ${assessment.procedure_code} | ${score}% | Certificado | val ${validityDate.toISOString().split('T')[0]}`;
      log.push(msg);
      if (!updErr) fixed.push({ responseId: resp.id, employeeId: link.employee_id, score, status: 'Certificado' });
    } else {
      const { error: updErr } = await supabase
        .from('trainings')
        .update({
          compliance_rate: score,
          completion_date: completionDate,
          status: 'Reciclar',
        })
        .eq('procedure_id', proc.id)
        .eq('employee_id', link.employee_id);

      const msg = updErr
        ? `ERRO employee ${link.employee_id} proc ${assessment.procedure_code}: ${updErr.message}`
        : `OK: employee ${link.employee_id} | proc ${assessment.procedure_code} | ${score}% | Reciclar`;
      log.push(msg);
      if (!updErr) fixed.push({ responseId: resp.id, employeeId: link.employee_id, score, status: 'Reciclar' });
    }
  }

  return NextResponse.json({ fixed, log });
}
