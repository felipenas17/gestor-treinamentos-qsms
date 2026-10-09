import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!supabase) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('assessments')
    .select('*, assessment_questions(*)')
    .eq('id', token)
    .eq('status', 'Ativa')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Strip correct answers — never expose to client
  const questions = (data.assessment_questions || []).map((q: any) => ({
    id: q.id,
    question: q.question,
    options: q.options,
  }));

  return NextResponse.json({
    id: data.id,
    title: data.title,
    procedureCode: data.procedure_code,
    procedureTitle: data.procedure_title || data.title,
    questionsCount: questions.length,
    minScorePercent: data.min_score_percent ?? 80,
    durationMinutes: data.duration_minutes ?? 20,
    maxAttempts: data.max_attempts ?? 2,
    questions,
  });
}
