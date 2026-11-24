import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

function normalizeName(name: string): string {
  return name.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ── POST /api/votar/identificar ────────────────────────────────────────────
// Identifica o eleitor por CPF + nome completo na eleição informada
// Body: { eleicao_id: string, cpf: string, nome: string }
// Returns: { token, eleitorNome, eleicao, chapas } | error
export async function POST(req: NextRequest) {
  if (!supabase) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 });

  let body: { eleicao_id?: string; cpf?: string; nome?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const { eleicao_id, cpf, nome } = body;
  if (!eleicao_id || !cpf || !nome)
    return NextResponse.json({ error: 'Campos obrigatórios: eleicao_id, cpf, nome' }, { status: 400 });

  const cpfNorm = normalizeCpf(cpf);
  if (cpfNorm.length !== 11)
    return NextResponse.json({ error: 'CPF inválido. Informe os 11 dígitos.' }, { status: 400 });

  // 1. Verificar se a eleição existe
  const { data: eleicao } = await supabase
    .from('cipa_eleicoes')
    .select('id, ano, data_eleicao, status, observacoes')
    .eq('id', eleicao_id)
    .maybeSingle();

  if (!eleicao)
    return NextResponse.json({ error: 'Eleição não encontrada.' }, { status: 404 });

  if (eleicao.status !== 'em_andamento')
    return NextResponse.json({ error: 'closed', eleicao }, { status: 403 });

  // 2. Buscar funcionário pelo CPF
  const { data: employee } = await supabase
    .from('employees')
    .select('id, name')
    .eq('cpf_masked', cpfNorm)
    .eq('status', 'Ativo')
    .maybeSingle();

  if (!employee)
    return NextResponse.json({ error: 'CPF não encontrado na lista de colaboradores ativos.' }, { status: 404 });

  // 3. Verificar nome (leniência: comparar normalizado)
  const nomeInformado = normalizeName(nome);
  const nomeCadastrado = normalizeName(employee.name);

  if (nomeInformado !== nomeCadastrado) {
    // Tentar match parcial: todas as palavras do nome informado presentes no nome cadastrado
    const palavrasInformadas = nomeInformado.split(/\s+/).filter(Boolean);
    const palavrasCadastradas = new Set(nomeCadastrado.split(/\s+/).filter(Boolean));
    const todosBatem = palavrasInformadas.every(p => palavrasCadastradas.has(p));

    if (!todosBatem)
      return NextResponse.json({ error: 'Nome não confere com o cadastro. Verifique e tente novamente.' }, { status: 401 });
  }

  // 4. Buscar o registro de eleitor desta pessoa nesta eleição
  const { data: eleitor } = await supabase
    .from('cipa_eleitores')
    .select('id, nome, votou, token_voto, employee_id')
    .eq('eleicao_id', eleicao_id)
    .eq('employee_id', employee.id)
    .maybeSingle();

  // Fallback: buscar por nome (para eleitores sincronizados antes da migration)
  let eleitorFinal = eleitor;
  if (!eleitorFinal) {
    const { data: eleitorByName } = await supabase
      .from('cipa_eleitores')
      .select('id, nome, votou, token_voto, employee_id')
      .eq('eleicao_id', eleicao_id)
      .eq('nome', employee.name)
      .maybeSingle();
    eleitorFinal = eleitorByName;
  }

  if (!eleitorFinal)
    return NextResponse.json({ error: 'Você não está na lista de eleitores desta eleição.' }, { status: 403 });

  // 5. Se já votou, informar
  if (eleitorFinal.votou)
    return NextResponse.json({ votou: true, eleitorNome: eleitorFinal.nome, eleicao }, { status: 200 });

  // 6. Buscar chapas
  const { data: chapas } = await supabase
    .from('cipa_chapas')
    .select('id, numero_chapa, nome, candidato_titular, candidato_suplente')
    .eq('eleicao_id', eleicao_id)
    .order('numero_chapa');

  return NextResponse.json({
    token: eleitorFinal.token_voto,
    eleitorNome: eleitorFinal.nome,
    eleicao,
    chapas: chapas ?? [],
  });
}
