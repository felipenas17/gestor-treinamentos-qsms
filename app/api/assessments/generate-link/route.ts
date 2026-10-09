import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { assessmentId, employeeId } = await req.json();

    if (!assessmentId) {
      return NextResponse.json({ error: 'assessmentId obrigatório' }, { status: 400 });
    }

    if (!supabase) {
      // Mock: retorna um UUID falso para testes sem Supabase
      return NextResponse.json({
        tokenUuid: `mock-${assessmentId.slice(0, 8)}-${Date.now()}`,
        source: 'mock',
      });
    }

    const { data, error } = await supabase
      .from('assessment_links')
      .insert({
        assessment_id: assessmentId,
        employee_id: employeeId || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        max_uses: 2,
        is_active: true,
      })
      .select('token_uuid')
      .single();

    if (error || !data) {
      console.error('[generate-link]', error);
      return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 });
    }

    return NextResponse.json({ tokenUuid: data.token_uuid });
  } catch (err) {
    console.error('[generate-link] unexpected:', err);
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 });
  }
}
