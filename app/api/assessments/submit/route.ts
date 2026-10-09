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

  // ── Mock mode quando Supabase não configurado ─────────────────────────────
  if (!supabase) {
    const totalQuestions = Object.keys(answers).length || 10;
    const correctCount = Math.round(totalQuestions * 0.85);
    const score = Math.round((correctCount / totalQuestions) * 100);
    const minScore = 80;
    return NextResponse.json({
      passed: score >= minScore,
      score,
      minScore,
      correctCount,
      totalQuestions,
      source: 'mock',
    });
  }

  // ── Resolve assessment via assessment_links.token_uuid (fluxo normal) ────
  let assessmentId: string = token;
  let linkId: string | null = null;

  const { data: link } = await supabase
    .from('assessment_links')
    .select('id, assessment_id, expires_at, is_active, max_uses, uses_count')
    .eq('token_uuid', token)
    .maybeSingle();

  if (link) {
    // Validações do link
    if (!link.is_active) {
      return NextResponse.json({ error: 'Link desativado' }, { status: 403 });
    }
    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expirado' }, { status: 403 });
    }
    if (link.uses_count >= link.max_uses) {
      return NextResponse.json({ error: 'Limite de usos atingido' }, { status: 403 });
    }
    assessmentId = link.assessment_id;
    linkId = link.id;
  }
  // Se não achou pelo token_uuid, trata token como id direto da avaliação (compatibilidade)

  // ── Busca avaliação com questões e respostas corretas ─────────────────────
  const { data, error } = await supabase
    .from('assessments')
    .select('*, assessment_questions(*)')
    .eq('id', assessmentId)
    .eq('status', 'Ativa')
    .maybeSingle();

  if (error || !data) {
    console.error('[submit] assessment not found:', { assessmentId, error });
    return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
  }

  // ── Calcula score ─────────────────────────────────────────────────────────
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

  // ── Incrementa uses_count no link ─────────────────────────────────────────
  if (linkId) {
    const { error: usesErr } = await supabase
      .from('assessment_links')
      .update({ uses_count: (link?.uses_count ?? 0) + 1 })
      .eq('id', linkId);
    if (usesErr) console.error('[submit] uses_count update:', usesErr);
  }

  // ── Garante um link_id para inserir em responses ──────────────────────────
  if (!linkId) {
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
  }

  // ── Insere resposta ───────────────────────────────────────────────────────
  if (linkId) {
    const { error: respErr } = await supabase
      .from('responses')
      .insert({
        link_id: linkId,
        score_percent: score,
        status: passed ? 'Entregue' : 'Reprovado',
        answers,
        completed_at: new Date().toISOString(),
      });
    if (respErr) console.error('[submit] responses insert:', respErr);
  }

  // ── Atualiza trainings se aprovado ────────────────────────────────────────
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
      console.error('[submit] trainings update:', updateErr);
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
