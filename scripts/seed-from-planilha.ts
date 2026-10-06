/**
 * seed-from-planilha.ts
 * Importa os dados reais da planilha GESTÃO_DE_TREINAMENTO para o Supabase.
 * 
 * Executar: npx ts-node --project tsconfig.json scripts/seed-from-planilha.ts
 * Dependência extra: npm install xlsx (para ler o .xlsx)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // usar a service role key para seed (não a anon key)
);

// ─── Colaboradores reais extraídos da planilha (Normativos) ──────────────────
const EMPLOYEES = [
  { name: 'Altair da Conceição Filho', role: 'Assistente Técnico', sector: 'CS', email: 'altairdaconceicaofilho@gmail.com' },
  { name: 'Gabriel Bernardo Machado', role: 'Assistente Técnico', sector: 'CS', email: 'bernardoo.gbm@gmail.com' },
  { name: 'Diogo Sermoud', role: 'Assistente QSMS', sector: 'QSMS', email: 'diogo.sermoud@tigerrentank.com.br' },
  { name: 'José Hugo', role: 'Assistente QSMS', sector: 'QSMS', email: 'jose.hugo@tigerrentank.com.br' },
  { name: 'Ítalo Faturine', role: 'Assistente QSMS', sector: 'QSMS', email: 'italo.infante@tigerrentank.com.br' },
  { name: 'Luiz Felipe Nascimento', role: 'Assistente QSMS', sector: 'QSMS', email: 'luiz.felipe@tigerrentank.com.br' },
  { name: 'Kleber Borges', role: 'Assistente QSMS', sector: 'QSMS', email: 'kleber.borges@tigerrentank.com.br' },
  { name: 'Yago Coutinho', role: 'Assistente QSMS', sector: 'QSMS', email: 'yago.coutinho@tigerrentank.com.br' },
  { name: 'Filipe Santos Rocha', role: 'Operador CS', sector: 'CS', email: 'filipe.santos@tigerrentank.com.br' },
  { name: 'José Maicon Lopes dos Passos', role: 'Operador CS', sector: 'CS', email: 'jose.maicon@tigerrentank.com.br' },
  { name: 'Macson Santos', role: 'Operador CS', sector: 'CS', email: 'macson.santos@tigerrentank.com.br' },
  { name: 'Marcos Vinicius Azevedo', role: 'Operador CS', sector: 'CS', email: 'marcos.azevedo@tigerrentank.com.br' },
  { name: 'Roberto Lener', role: 'Operador CS', sector: 'CS', email: 'roberto.lener@tigerrentank.com.br' },
  { name: 'Yago Abreu', role: 'Operador CS', sector: 'CS', email: 'yago.abreu@tigerrentank.com.br' },
  { name: 'Anderson Soares', role: 'Operador RDO', sector: 'Operacional RDO', email: 'anderson.soares@tigerrentank.com.br' },
  { name: 'Brenner Francisco da Silva Conceição', role: 'Operador RDO', sector: 'Operacional RDO', email: 'brenner.conceicao@tigerrentank.com.br' },
  { name: 'Eduardo Junior Nunes de Castro', role: 'Operador RDO', sector: 'Operacional RDO', email: 'eduardo.castro@tigerrentank.com.br' },
  { name: 'Fernando Luiz da Silva Ribeiro', role: 'Operador RDO', sector: 'Operacional RDO', email: 'fernando.ribeiro@tigerrentank.com.br' },
  { name: 'Gleicyvanio Giulio Flores Silveira', role: 'Operador RDO', sector: 'Operacional RDO', email: 'gleicyvanio.silveira@tigerrentank.com.br' },
  { name: 'Dejair Antônio', role: 'Operador Brascabo', sector: 'Brascabo', email: 'dejair.antonio@tigerrentank.com.br' },
  { name: 'Edney Caetano', role: 'Operador Brascabo', sector: 'Brascabo', email: 'edney.caetano@tigerrentank.com.br' },
  { name: 'Gil Lourenço', role: 'Operador Brascabo', sector: 'Brascabo', email: 'gil.lourenco@tigerrentank.com.br' },
  { name: 'Jhonathan Teixeira', role: 'Operador Brascabo', sector: 'Brascabo', email: 'jhonathan.teixeira@tigerrentank.com.br' },
  { name: 'Rafael Ribeiro', role: 'Operador Brascabo', sector: 'Brascabo', email: 'rafael.ribeiro@tigerrentank.com.br' },
];

// ─── Procedimentos internos (top 20 da planilha Treinamento Internos) ─────────
const PROCEDURES = [
  { code: 'PG-TR-SMS-001', name: 'Manual SGI', sector: 'QSMS', role: 'Todos', validity_months: 12, criticality: 'Alta' },
  { code: 'PG-TR-SMS-002', name: 'APR / LAAIPR', sector: 'QSMS', role: 'Todos', validity_months: 12, criticality: 'Alta' },
  { code: 'PG-TR-SMS-003', name: 'Auditorias Internas', sector: 'QSMS', role: 'QSMS', validity_months: 24, criticality: 'Alta' },
  { code: 'PG-TR-SMS-004', name: 'Investigação de Incidentes', sector: 'QSMS', role: 'Todos', validity_months: 12, criticality: 'Alta' },
  { code: 'PG-TR-SMS-005', name: 'Controle de Documentos', sector: 'QSMS', role: 'QSMS', validity_months: 24, criticality: 'Média' },
  { code: 'PG-TR-SMS-008', name: 'PCIP', sector: 'QSMS', role: 'Operacional', validity_months: 12, criticality: 'Alta' },
  { code: 'PG-TR-SMS-011', name: 'Trabalho em Altura NR-35', sector: 'Segurança do Trabalho', role: 'Operacional', validity_months: 24, criticality: 'Alta' },
  { code: 'PG-TR-SMS-041', name: 'GRL - Gestão de Riscos Logísticos', sector: 'Operacional', role: 'Operacional', validity_months: 12, criticality: 'Alta' },
  { code: 'POL-TR-001', name: 'Política QSMS', sector: 'QSMS', role: 'Todos', validity_months: 12, criticality: 'Média' },
  { code: 'PO-TR-OPR-022', name: 'Inspeção Visual DNV 2.7-1', sector: 'Operacional', role: 'Inspetor', validity_months: 24, criticality: 'Alta' },
  { code: 'PO-TR-OPR-025', name: 'Teste Hidrostático', sector: 'Operacional', role: 'Operador', validity_months: 12, criticality: 'Alta' },
  { code: 'PO-TR-OPR-026', name: 'Inspeção Visual DPC', sector: 'Operacional', role: 'Inspetor', validity_months: 12, criticality: 'Alta' },
  { code: 'PO-TR-OPR-027', name: 'Transbordo', sector: 'Transbordo MC', role: 'Operador', validity_months: 12, criticality: 'Alta' },
  { code: 'PO-TR-OPR-028', name: 'Calibração de Equipamentos', sector: 'Qualidade', role: 'Técnico', validity_months: 12, criticality: 'Média' },
  { code: 'PO-TR-OPR-029', name: 'Movimentação de Cargas NR-11', sector: 'Operacional', role: 'Operador', validity_months: 24, criticality: 'Alta' },
  { code: 'PO-TR-OPR-034', name: 'Controle de Soldagem', sector: 'Qualidade', role: 'Soldador', validity_months: 12, criticality: 'Alta' },
  { code: 'PO-TR-OPR-035', name: 'Inspeção de Expedição', sector: 'Operacional', role: 'Inspetor', validity_months: 12, criticality: 'Média' },
  { code: 'PO-TR-OPR-036', name: 'Inspeção de Tanques', sector: 'Operacional', role: 'Inspetor', validity_months: 12, criticality: 'Alta' },
  { code: 'PO-TR-OPR-040', name: 'ETE - Estação de Tratamento', sector: 'Meio Ambiente', role: 'Operador', validity_months: 12, criticality: 'Alta' },
  { code: 'PO-TR-OPR-048', name: 'Descontaminação CS', sector: 'CS', role: 'Operador CS', validity_months: 12, criticality: 'Alta' },
];

// ─── Normativos reais da planilha (amostra dos 479) ──────────────────────────
const NORMATIVE_TRAININGS = [
  { employee_email: 'altairdaconceicaofilho@gmail.com', training: 'NR 10', provider: 'REEF', type: 'EXT', date: '2025-02-17', validity_days: 730 },
  { employee_email: 'altairdaconceicaofilho@gmail.com', training: 'NR 12', provider: 'REEF', type: 'EXT', date: '2026-05-08', validity_days: 730 },
  { employee_email: 'altairdaconceicaofilho@gmail.com', training: 'NR 20', provider: 'REEF', type: 'EXT', date: '2025-02-11', validity_days: 730 },
  { employee_email: 'altairdaconceicaofilho@gmail.com', training: 'NR 34 Admissional', provider: 'REEF', type: 'EXT', date: '2026-02-19', validity_days: 365 },
  { employee_email: 'altairdaconceicaofilho@gmail.com', training: 'NR 35', provider: 'REEF', type: 'EXT', date: '2025-02-13', validity_days: 730 },
  { employee_email: 'bernardoo.gbm@gmail.com', training: 'NR 10', provider: 'REEF', type: 'EXT', date: '2026-08-07', validity_days: 730 },
  { employee_email: 'bernardoo.gbm@gmail.com', training: 'NR 12', provider: 'REEF', type: 'EXT', date: '2026-08-10', validity_days: 730 },
  { employee_email: 'bernardoo.gbm@gmail.com', training: 'NR 35', provider: 'REEF', type: 'EXT', date: '2025-02-13', validity_days: 730 },
  { employee_email: 'filipe.santos@tigerrentank.com.br', training: 'CBSP', provider: 'FOX', type: 'EXT', date: '2023-08-08', validity_days: 1095 },
  { employee_email: 'jose.maicon@tigerrentank.com.br', training: 'NR 35', provider: 'REEF', type: 'EXT', date: '2025-08-15', validity_days: 730 },
  { employee_email: 'macson.santos@tigerrentank.com.br', training: 'NR33 TRAB/VIG', provider: 'REEF', type: 'EXT', date: '2023-08-08', validity_days: 1095 },
  { employee_email: 'marcos.azevedo@tigerrentank.com.br', training: 'NR33 TRAB/VIG', provider: 'REEF', type: 'EXT', date: '2023-08-07', validity_days: 1095 },
  { employee_email: 'roberto.lener@tigerrentank.com.br', training: 'NR33 TRAB/VIG', provider: 'REEF', type: 'EXT', date: '2023-08-08', validity_days: 1095 },
  { employee_email: 'anderson.soares@tigerrentank.com.br', training: 'NR 35', provider: 'REEF', type: 'EXT', date: '2025-08-25', validity_days: 730 },
  { employee_email: 'brenner.conceicao@tigerrentank.com.br', training: 'NR 35', provider: 'REEF', type: 'EXT', date: '2025-08-25', validity_days: 730 },
  { employee_email: 'eduardo.castro@tigerrentank.com.br', training: 'NR 35', provider: 'REEF', type: 'EXT', date: '2025-08-25', validity_days: 730 },
  { employee_email: 'dejair.antonio@tigerrentank.com.br', training: 'NR 34 Obs. Quente', provider: 'REEF', type: 'EXT', date: '2024-08-24', validity_days: 365 },
  { employee_email: 'dejair.antonio@tigerrentank.com.br', training: 'NR 35', provider: 'REEF', type: 'EXT', date: '2025-08-25', validity_days: 730 },
  { employee_email: 'gil.lourenco@tigerrentank.com.br', training: 'NR 35', provider: 'REEF', type: 'EXT', date: '2025-08-25', validity_days: 730 },
  { employee_email: 'jhonathan.teixeira@tigerrentank.com.br', training: 'NR 35', provider: 'REEF', type: 'EXT', date: '2025-08-25', validity_days: 730 },
];

// ─── Assessments iniciais ────────────────────────────────────────────────────
const ASSESSMENTS = [
  {
    code: 'AVAL-POP-OPR-022',
    title: 'Inspeção Visual DNV 2.7-1 — Eficácia',
    min_score_percent: 80,
    duration_minutes: 20,
    max_attempts: 2,
    status: 'Ativa',
    questions_bank: [
      { id: 'q1', question: 'Qual norma rege a inspeção visual de containers offshore DNV?', options: ['DNV 2.7-1', 'ISO 668', 'NR-11', 'IMDG Code'], correctOptionIndex: 0, explanation: 'A DNV 2.7-1 é a norma de referência para containers offshore.' },
      { id: 'q2', question: 'Qual é o intervalo máximo entre inspeções periódicas conforme DNV 2.7-1?', options: ['6 meses', '12 meses', '24 meses', '36 meses'], correctOptionIndex: 1, explanation: 'A inspeção periódica é anual conforme seção 4.2 da DNV 2.7-1.' },
      { id: 'q3', question: 'Em caso de trinca na solda de um olhal de içamento, qual é a ação imediata?', options: ['Reforçar com solda de campo e liberar', 'Segregar o container e emitir NC imediatamente', 'Continuar usando com carga reduzida em 50%', 'Aguardar próxima inspeção programada'], correctOptionIndex: 1, explanation: 'Qualquer defeito estrutural em pontos de içamento requer segregação imediata e abertura de Não Conformidade.' },
    ],
  },
];

// ─── Seed principal ───────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Iniciando seed da Tiger Rentank...\n');

  // 1. Limpar tabelas (ordem inversa de FK)
  console.log('🗑  Limpando tabelas...');
  await supabase.from('responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('assessment_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('assessments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('trainings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('procedures').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Inserir procedimentos
  console.log('📋 Inserindo procedimentos...');
  const { data: procs, error: procErr } = await supabase
    .from('procedures')
    .insert(PROCEDURES.map(p => ({
      code: p.code,
      name: p.name,
      sector: p.sector,
      associated_role: p.role,
      application: `Aplicável ao setor ${p.sector} — função: ${p.role}`,
      last_revision: new Date().toISOString().split('T')[0],
      status: 'Ativo',
      questions_count: 10,
      criticality: p.criticality,
      validity_months: p.validity_months,
      compliance_rate: 90,
    })))
    .select();
  if (procErr) { console.error('❌ Erro procedimentos:', procErr); return; }
  console.log(`  ✓ ${procs?.length} procedimentos inseridos`);

  // 3. Inserir colaboradores
  console.log('👤 Inserindo colaboradores...');
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .insert(EMPLOYEES.map(e => ({
      name: e.name,
      role: e.role,
      sector: e.sector,
      email: e.email,
      admission_date: '2020-01-01',
      status: 'Ativo',
    })))
    .select();
  if (empErr) { console.error('❌ Erro colaboradores:', empErr); return; }
  console.log(`  ✓ ${emps?.length} colaboradores inseridos`);

  // 4. Mapear emails → IDs
  const emailToId: Record<string, string> = {};
  emps?.forEach(e => { emailToId[e.email] = e.id; });

  // 5. Encontrar procedure_id do Manual SGI para normativos
  const manualProc = procs?.find(p => p.code === 'PG-TR-SMS-001');

  // 6. Inserir treinamentos normativos
  console.log('🎓 Inserindo treinamentos...');
  const trainingsToInsert = NORMATIVE_TRAININGS
    .filter(t => emailToId[t.employee_email])
    .map(t => {
      const completion = new Date(t.date);
      const validity = new Date(completion);
      validity.setDate(validity.getDate() + t.validity_days);
      const today = new Date();
      const daysRemaining = Math.floor((validity.getTime() - today.getTime()) / 86400000);
      const status = daysRemaining < 0 ? 'Vencido' : daysRemaining <= 60 ? 'Reciclar' : 'Certificado';

      return {
        employee_id: emailToId[t.employee_email],
        procedure_id: manualProc?.id || procs?.[0]?.id,
        completion_date: t.date,
        validity_date: validity.toISOString().split('T')[0],
        compliance_rate: status === 'Certificado' ? 100 : status === 'Reciclar' ? 70 : 40,
        status,
        instructor: t.provider,
        certificate_hash: `CERT-${new Date(t.date).getFullYear()}-BR-${Math.floor(1000 + Math.random() * 9000)}`,
      };
    });

  const { data: trainResult, error: trainErr } = await supabase
    .from('trainings')
    .insert(trainingsToInsert)
    .select();
  if (trainErr) { console.error('❌ Erro treinamentos:', trainErr); return; }
  console.log(`  ✓ ${trainResult?.length} registros de treinamento inseridos`);

  // 7. Inserir avaliação
  console.log('📝 Inserindo avaliação...');
  const proc022 = procs?.find(p => p.code === 'PO-TR-OPR-022');
  if (proc022) {
    const { error: assErr } = await supabase
      .from('assessments')
      .insert({
        code: ASSESSMENTS[0].code,
        title: ASSESSMENTS[0].title,
        procedure_id: proc022.id,
        min_score_percent: ASSESSMENTS[0].min_score_percent,
        duration_minutes: ASSESSMENTS[0].duration_minutes,
        max_attempts: ASSESSMENTS[0].max_attempts,
        status: ASSESSMENTS[0].status,
        questions_bank: ASSESSMENTS[0].questions_bank,
      });
    if (assErr) console.error('❌ Erro avaliação:', assErr);
    else console.log('  ✓ Avaliação inserida');
  }

  console.log('\n✅ Seed concluído!');
  console.log(`   ${emps?.length} colaboradores`);
  console.log(`   ${procs?.length} procedimentos`);
  console.log(`   ${trainResult?.length} registros de treinamento`);
  console.log(`\nAcesse o Supabase Dashboard para confirmar os dados.`);
}

seed().catch(console.error);
