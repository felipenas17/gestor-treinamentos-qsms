import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ── GET /api/votar?token=<uuid> ────────────────────────────────────────────
// Carrega dados do eleitor + eleição + chapas para a página de votação
export async function GET(req: NextRequest) {
  if (!supabase) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });

  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });

  const { data: eleitor, error: e1 } = await supabase
    .from('cipa_eleitores')
    .select('id, nome, votou, eleicao_id')
    .eq('token_voto', token)
    .maybeSingle();

  if (e1 || !eleitor) return NextResponse.json({ error: 'Token inválido' }, { status: 404 });

  const { data: eleicao } = await supabase
    .from('cipa_eleicoes')
    .select('id, ano, data_eleicao, status, observacoes')
    .eq('id', eleitor.eleicao_id)
    .maybeSingle();

  if (!eleicao) return NextResponse.json({ error: 'Eleição não encontrada' }, { status: 404 });

  const { data: chapas } = await supabase
    .from('cipa_chapas')
    .select('id, numero_chapa, candidato_titular, candidato_suplente')
    .eq('eleicao_id', eleitor.eleicao_id)
    .order('numero_chapa');

  return NextResponse.json({
    eleitor: { id: eleitor.id, nome: eleitor.nome, votou: eleitor.votou },
    eleicao,
    chapas: chapas ?? [],
  });
}

// ── POST /api/votar ────────────────────────────────────────────────────────
// Registra o voto: { token, chapa_id }
export async function POST(req: NextRequest) {
  if (!supabase) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });

  let body: { token?: string; chapa_id?: string; vice_presidente_voto?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const { token, chapa_id, vice_presidente_voto } = body;
  if (!token || !chapa_id)
    return NextResponse.json({ error: 'Campos obrigatórios: token, chapa_id' }, { status: 400 });

  if (!vice_presidente_voto || !['titular', 'suplente'].includes(vice_presidente_voto))
    return NextResponse.json({ error: 'Informe o voto para vice-presidente (titular ou suplente)' }, { status: 400 });

  // 1. Buscar eleitor pelo token
  const { data: eleitor } = await supabase
    .from('cipa_eleitores')
    .select('id, eleicao_id, votou')
    .eq('token_voto', token)
    .maybeSingle();

  if (!eleitor) return NextResponse.json({ error: 'Token inválido' }, { status: 404 });
  if (eleitor.votou) return NextResponse.json({ error: 'Você já votou nesta eleição' }, { status: 409 });

  // 2. Verificar que a eleição está em andamento
  const { data: eleicao } = await supabase
    .from('cipa_eleicoes')
    .select('id, status')
    .eq('id', eleitor.eleicao_id)
    .maybeSingle();

  if (!eleicao || eleicao.status !== 'em_andamento')
    return NextResponse.json({ error: 'A votação não está aberta no momento' }, { status: 403 });

  // 3. Verificar que a chapa pertence a esta eleição
  const { data: chapa } = await supabase
    .from('cipa_chapas')
    .select('id')
    .eq('id', chapa_id)
    .eq('eleicao_id', eleitor.eleicao_id)
    .maybeSingle();

  if (!chapa) return NextResponse.json({ error: 'Chapa inválida para esta eleição' }, { status: 400 });

  // 4. Registrar o voto
  const { error: voteErr } = await supabase
    .from('cipa_votos')
    .insert({ eleicao_id: eleitor.eleicao_id, chapa_id, eleitor_id: eleitor.id, vice_presidente_voto });

  if (voteErr) {
    if (voteErr.code === '23505')
      return NextResponse.json({ error: 'Você já votou nesta eleição' }, { status: 409 });
    console.error('Erro ao inserir voto:', voteErr);
    return NextResponse.json({ error: 'Erro ao registrar voto' }, { status: 500 });
  }

  // 5. Marcar eleitor como "votou"
  await supabase
    .from('cipa_eleitores')
    .update({ votou: true, data_voto: new Date().toISOString() })
    .eq('id', eleitor.id);

  // 6. Atualizar total_votos na eleição
  const { count } = await supabase
    .from('cipa_votos')
    .select('*', { count: 'exact', head: true })
    .eq('eleicao_id', eleitor.eleicao_id);

  await supabase
    .from('cipa_eleicoes')
    .update({ total_votos: count ?? 0 })
    .eq('id', eleitor.eleicao_id);

  return NextResponse.json({ success: true, message: 'Voto registrado com sucesso!' });
}
