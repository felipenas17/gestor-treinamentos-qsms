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
    .eq('id', token)
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

  // ── Get or create an assessment_link for this assessment ─────────────────────
  let linkId: string | null = null;
  try {
    // Look for an existing active link for this assessment
    const { data: existingLink } = await supabase
      .from('assessment_links')
      .select('id')
      .eq('assessment_id', data.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingLink) {
      linkId = existingLink.id;
    } else {
      // Create a link on the fly
      const { data: newLink } = await supabase
        .from('assessment_links')
        .insert({
          assessment_id: data.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          max_uses: 999,
        })
        .select('id')
        .single();
      linkId = newLink?.id ?? null;
    }
  } catch (linkErr) {
    console.error('[submit] assessment_link error:', linkErr);
  }

  // ── Insert response record ────────────────────────────────────────────────────
  if (linkId) {
    try {
      await supabase.from('responses').insert({
        link_id: linkId,
        score_percent: score,
        status: passed ? 'Entregue' : 'Reprovado',
        answers,
        completed_at: new Date().toISOString(),
      });
    } catch (insertErr) {
      console.error('[submit] responses insert error:', insertErr);
    }
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
