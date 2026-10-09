import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  let body: {
    token: string;
    answers: Record<string, number>;
    employeeName: string;
    signature: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token, answers, employeeName, signature } = body;

  if (!token || !answers || !employeeName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // ── Mock mode when Supabase is not configured ────────────────────────────────
  if (!supabase) {
    const totalQuestions = Object.keys(answers).length || 10;
    const correctCount = Math.round(totalQuestions * 0.85);
    const score = Math.round((correctCount / totalQuestions) * 100);
    return NextResponse.json({
      passed: score >= 80,
      score,
      minScore: 80,
      correctCount,
      totalQuestions,
      source: 'mock',
    });
  }

  // ── Fetch full assessment with correct answers ────────────────────────────────
  const { data, error } = await supabase
    .from('assessments')
    .select('*, assessment_questions(*)')
    .eq('token_uuid', token)
    .eq('status', 'Ativa')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  const questions: any[] = data.assessment_questions || [];
  const totalQuestions = questions.length;
  let correctCount = 0;

  for (const q of questions) {
    const userAnswer = answers[q.id];
    if (typeof userAnswer === 'number' && userAnswer === q.correct_index) {
      correctCount++;
    }
  }

  const minScore: number = data.min_score_percent ?? 80;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = score >= minScore;

  // ── Insert response record ────────────────────────────────────────────────────
  try {
    await supabase.from('responses').insert({
      assessment_id: data.id,
      employee_name: employeeName,
      score_percent: score,
      status: passed ? 'Entregue' : 'Reprovado',
      answers,
      completed_at: new Date().toISOString(),
      signature_data: signature,
    });
  } catch (insertErr) {
    console.error('[submit] responses insert error:', insertErr);
  }

  // ── Update trainings if passed ────────────────────────────────────────────────
  if (passed && data.procedure_code) {
    try {
      const { data: proc } = await supabase
        .from('procedures')
        .select('id, validity_months')
        .eq('code', data.procedure_code)
        .maybeSingle();

      if (proc) {
        const today = new Date();
        const completionDate = today.toISOString().split('T')[0];
        const validityDate = new Date(today);
        validityDate.setMonth(validityDate.getMonth() + (proc.validity_months || 12));
        const validityDateStr = validityDate.toISOString().split('T')[0];

        await supabase
          .from('trainings')
          .update({
            status: 'Certificado',
            completion_date: completionDate,
            validity_date: validityDateStr,
            compliance_rate: 100,
          })
          .eq('procedure_id', proc.id);
      }
    } catch (updateErr) {
      console.error('[submit] trainings update error:', updateErr);
    }
  }

  return NextResponse.json({
    passed,
    score,
    minScore,
    correctCount,
    totalQuestions,
  });
}
