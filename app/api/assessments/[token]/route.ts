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

  // Busca o link pelo token_uuid na tabela assessment_links
  const { data: link, error: linkError } = await supabase
    .from('assessment_links')
    .select('id, assessment_id, expires_at, is_active, max_uses, uses_count')
    .eq('token_uuid', token)
    .maybeSingle();

  // Se não achou pelo token_uuid, tenta pelo id da avaliação diretamente (compatibilidade)
  let assessmentId: string | null = link?.assessment_id ?? null;
  let linkId: string | null = link?.id ?? null;

  if (!link || linkError) {
    // Fallback: tenta tratar o token como id direto da avaliação
    assessmentId = token;
  }

  // Validações do link (só aplica se veio de assessment_links)
  if (link) {
    if (!link.is_active) {
      return NextResponse.json({ error: 'Link desativado' }, { status: 404 });
    }
    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expirado' }, { status: 404 });
    }
    if (link.uses_count >= link.max_uses) {
      return NextResponse.json({ error: 'Limite de usos atingido' }, { status: 404 });
    }
  }

  // Busca a avaliação com as questões
  const { data, error } = await supabase
    .from('assessments')
    .select('*, assessment_questions(*)')
    .eq('id', assessmentId)
    .eq('status', 'Ativa')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Strip correct answers — nunca expõe ao cliente
  const questions = (data.assessment_questions || []).map((q: any) => ({
    id: q.id,
    question: q.question,
    options: q.options,
  }));

  return NextResponse.json({
    id: data.id,
    linkId,
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
