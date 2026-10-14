import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/** Strip markdown code fences Gemini sometimes wraps around JSON */
function extractJSON(raw: string): string {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (m ? m[1] : raw).trim();
}

const SYSTEM_INSTRUCTION = `Você é um Engenheiro Sênior Especialista em QSMS (Qualidade, Segurança, Meio Ambiente e Saúde) em operações offshore de óleo e gás (Petrobras, PRIO, MODEC, Clariant, NR-37).
Gere entre 10 e 20 questões de múltipla escolha técnicas, rigorosas e realistas para avaliação de eficácia de treinamento.
Adapte a quantidade ao conteúdo: procedimentos curtos → 10 questões; procedimentos longos com muitas definições, etapas e responsabilidades → até 20 questões.
IMPORTANTE: As questões DEVEM ser baseadas EXCLUSIVAMENTE no conteúdo, definições, conceitos e procedimentos descritos no POP/procedimento fornecido.
Não gere questões genéricas sobre LOTO, SWA ou PT a menos que o próprio procedimento trate desses temas.
Cada questão: 4 alternativas, 1 correta, justificativa técnica referenciando o procedimento ou norma regulamentadora citada no próprio POP.
OBRIGATÓRIO: Embaralhe ALEATORIAMENTE a posição da resposta correta. Use os índices 0, 1, 2 e 3 de forma não-previsível — PROIBIDO padrões como A-B-C-D-A-B-C-D ou A-A-B-B. A sequência deve parecer aleatória: ex. q1→3, q2→1, q3→0, q4→2, q5→3, q6→0, q7→2, q8→1, q9→3, q10→2.
Responda SOMENTE com JSON válido, sem texto adicional, sem blocos markdown.`;

function buildPrompt(promptText: string, procedureCode: string, procedureName: string): string {
  return `Com base no seguinte POP/procedimento, gere entre 10 e 20 questões de eficácia de treinamento.
Adapte a quantidade ao conteúdo: procedimentos curtos → 10 questões; procedimentos com muitas definições, etapas e responsabilidades → até 20 questões.

=== CONTEÚDO DO PROCEDIMENTO ===
${promptText}
=== FIM DO CONTEÚDO ===

As questões devem testar se o colaborador compreendeu os conceitos, definições, etapas e responsabilidades descritos NESTE procedimento específico.

REGRA CRÍTICA: Embaralhe ALEATORIAMENTE o correctOptionIndex — PROIBIDO qualquer padrão sequencial (ex: 0-1-2-3-0-1-2-3 ou 2-0-3-1-2-0-3-1 repetindo). A distribuição deve parecer genuinamente aleatória. Ex válido: 3,1,0,2,3,0,2,1,3,2,0,1. NUNCA repita a mesma posição em questões consecutivas.

Responda APENAS com este JSON (sem mais nada):
{
  "questions": [
    {
      "id": "q-1",
      "question": "Pergunta técnica baseada no procedimento?",
      "options": ["Distrator A", "Distrator B", "Resposta correta", "Distrator D"],
      "correctOptionIndex": 2,
      "explanation": "Justificativa referenciando o procedimento ou norma."
    }
  ]
}`;
}

/** Fisher-Yates shuffle de um array de posições para distribuição não-previsível */
function makeShuffledPositions(count: number): number[] {
  // Preenche com distribuição balanceada (cada posição aparece proporcionalmente)
  const base: number[] = Array.from({ length: count }, (_, i) => i % 4);
  // Fisher-Yates: garante que não há padrão sequencial
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  // Garante que posições consecutivas nunca sejam iguais (troca se necessário)
  for (let i = 1; i < base.length; i++) {
    if (base[i] === base[i - 1]) {
      const swap = (i + 1) % base.length;
      [base[i], base[swap]] = [base[swap], base[i]];
    }
  }
  return base;
}

/** Move a resposta correta para uma posição aleatória entre 0-3 */
function shuffleCorrectAnswer(q: {
  id: string; question: string; options: string[];
  correctOptionIndex: number; explanation: string;
}, targetIndex: number) {
  const opts = [...q.options];
  const correct = opts[q.correctOptionIndex];
  // Remove do lugar atual
  opts.splice(q.correctOptionIndex, 1);
  // Insere na posição alvo
  opts.splice(targetIndex, 0, correct);
  return { ...q, options: opts, correctOptionIndex: targetIndex };
}

function mockQuestions(promptText: string, procedureCode: string, procedureName: string) {
  const ts = Date.now();
  const name = procedureName || procedureCode || "Geral";

  // Extrai trecho da descrição do procedimento para referenciar nas questões
  const descMatch = promptText.match(/Descrição\/Conteúdo:\s*(.{10,})/i);
  const desc = descMatch ? descMatch[1].slice(0, 200).trim() : '';
  const hasDesc = desc.length > 20;

  // Posições embaralhadas via Fisher-Yates — sem padrão repetitivo
  const positions = makeShuffledPositions(10);
  return [
    {
      id: `q-mock-${ts}-1`,
      question: `(${procedureCode}) Qual é o objetivo principal do procedimento "${name}"?`,
      options: [
        `Estabelecer as diretrizes, responsabilidades e etapas para a execução padronizada e segura das atividades descritas em "${name}"`,
        "Registrar ocorrências de não-conformidades para fins de auditoria interna exclusivamente",
        "Definir o cronograma de manutenção preventiva dos equipamentos da unidade",
        "Controlar o estoque de materiais e EPIs utilizados nas operações",
      ],
      correctOptionIndex: 0,
      explanation: `O objetivo de um procedimento operacional (POP) é estabelecer de forma clara as diretrizes, responsabilidades e etapas para execução padronizada e segura das atividades que compõem "${name}".`,
    },
    {
      id: `q-mock-${ts}-2`,
      question: `(${procedureCode}) Por que é fundamental seguir o procedimento "${name}" na íntegra durante sua execução?`,
      options: [
        "Para garantir a padronização, rastreabilidade e conformidade com os requisitos de segurança e qualidade estabelecidos",
        "Apenas para atender exigências formais de auditoria sem impacto prático na operação",
        "Para aumentar a velocidade de execução das tarefas, dispensando etapas de verificação",
        "Para eliminar a necessidade de supervisão técnica durante atividades de rotina",
      ],
      correctOptionIndex: 0,
      explanation: "Seguir o procedimento na íntegra garante padronização, rastreabilidade das ações e conformidade com requisitos operacionais, de segurança e regulatórios aplicáveis.",
    },
    {
      id: `q-mock-${ts}-3`,
      question: `(${procedureCode}) Quem tem a responsabilidade primária de garantir a aplicação correta do procedimento "${name}"?`,
      options: [
        "O responsável pela execução da atividade, com supervisão do encarregado ou coordenador designado",
        "Somente a equipe de QSMS, que deve estar presente em todas as etapas do procedimento",
        "O departamento de RH, responsável por garantir que todos os colaboradores estejam treinados",
        "A Alta Direção, que valida cada execução antes de autorizar o início das atividades",
      ],
      correctOptionIndex: 0,
      explanation: "A responsabilidade primária recai sobre o executor da atividade, com supervisão do encarregado ou coordenador designado, conforme hierarquia de responsabilidades do sistema de gestão.",
    },
    {
      id: `q-mock-${ts}-4`,
      question: hasDesc
        ? `(${procedureCode}) Com base no conteúdo de "${name}", qual das alternativas melhor descreve sua aplicação?`
        : `(${procedureCode}) Em que situações o procedimento "${name}" deve ser obrigatoriamente aplicado?`,
      options: hasDesc
        ? [
            `Atividades relacionadas a: ${desc.slice(0, 80)}...`,
            "Apenas em situações de emergência ou não-conformidade identificada em auditoria",
            "Exclusivamente em atividades de alto risco classificadas pela área de segurança",
            "Somente durante inspeções programadas pela equipe de QSMS",
          ]
        : [
            "Sempre que a atividade coberta pelo procedimento for executada, independentemente da frequência ou turno",
            "Apenas quando solicitado pelo supervisor imediato antes do início da jornada",
            "Somente durante auditorias internas e inspeções regulatórias externas",
            "Exclusivamente em situações de emergência ou paralisação não planejada",
          ],
      correctOptionIndex: 0,
      explanation: hasDesc
        ? `O procedimento "${name}" define as atividades e condições em que deve ser aplicado. Todo colaborador envolvido deve conhecer seu escopo para garantir conformidade.`
        : `O procedimento deve ser aplicado sempre que a atividade nele descrita for executada, garantindo padronização e segurança em todas as ocorrências.`,
    },
    {
      id: `q-mock-${ts}-5`,
      question: `(${procedureCode}) O que deve ser feito caso um colaborador identifique uma condição que impeça a execução segura do procedimento "${name}"?`,
      options: [
        "Interromper a atividade, comunicar imediatamente o supervisor e aguardar análise e orientação antes de prosseguir",
        "Adaptar o procedimento por conta própria para contornar a condição identificada",
        "Prosseguir com a atividade utilizando cautela redobrada e registrar a ocorrência ao final",
        "Acionar diretamente a equipe de manutenção sem comunicar a supervisão",
      ],
      correctOptionIndex: 0,
      explanation: "Ao identificar condição impeditiva, o colaborador deve parar, comunicar o supervisor e aguardar orientação — princípio básico de gestão de riscos e hierarquia de controles.",
    },
    {
      id: `q-mock-${ts}-6`,
      question: `(${procedureCode}) Qual é a finalidade do registro de execução do procedimento "${name}"?`,
      options: [
        "Garantir rastreabilidade, evidenciar conformidade e subsidiar análises de melhoria contínua do processo",
        "Servir exclusivamente para comprovar a presença dos colaboradores durante a atividade",
        "Substituir a necessidade de treinamento periódico dos executantes",
        "Atender requisito burocrático sem impacto prático na operação ou segurança",
      ],
      correctOptionIndex: 0,
      explanation: "O registro garante rastreabilidade das ações executadas, evidencia conformidade com os requisitos e fornece dados para análise crítica e melhoria contínua.",
    },
    {
      id: `q-mock-${ts}-7`,
      question: `(${procedureCode}) Como o procedimento "${name}" contribui para a segurança operacional?`,
      options: [
        "Estabelecendo etapas padronizadas que minimizam a variabilidade e reduzem a exposição a riscos durante a execução",
        "Eliminando completamente todos os riscos associados à atividade sem necessidade de outras medidas",
        "Transferindo a responsabilidade pela segurança para o departamento de QSMS",
        "Reduzindo o tempo de execução, o que diminui automaticamente a exposição a riscos",
      ],
      correctOptionIndex: 0,
      explanation: "Procedimentos padronizados reduzem variabilidade humana nas atividades, minimizando a exposição a riscos e contribuindo para a segurança operacional.",
    },
    {
      id: `q-mock-${ts}-8`,
      question: `(${procedureCode}) Com que frequência o procedimento "${name}" deve ser revisado?`,
      options: [
        "Conforme periodicidade definida no próprio documento ou quando ocorrerem alterações significativas no processo, equipamentos ou legislação",
        "Apenas quando ocorrer um acidente ou incidente relacionado à atividade descrita",
        "Somente quando exigido por auditoria externa ou inspeção regulatória",
        "Uma única vez após sua criação, pois representa a melhor prática consolidada",
      ],
      correctOptionIndex: 0,
      explanation: "Procedimentos devem ser revisados conforme periodicidade definida ou quando há mudanças no processo, equipamentos, legislação ou lições aprendidas de incidentes.",
    },
    {
      id: `q-mock-${ts}-9`,
      question: `(${procedureCode}) Qual atitude é esperada do colaborador antes de iniciar a execução do procedimento "${name}"?`,
      options: [
        "Ler o procedimento, confirmar que está na revisão vigente, verificar os recursos necessários e esclarecer dúvidas com o supervisor",
        "Iniciar a execução imediatamente com base na experiência prévia, sem necessidade de consultar o documento",
        "Verificar apenas se os EPIs estão disponíveis, pois os demais itens são de responsabilidade da supervisão",
        "Aguardar autorização formal da Alta Direção antes de qualquer ação preparatória",
      ],
      correctOptionIndex: 0,
      explanation: "Antes de executar, o colaborador deve ler o procedimento, confirmar a revisão vigente, checar recursos e esclarecer dúvidas — prática essencial de trabalho seguro.",
    },
    {
      id: `q-mock-${ts}-10`,
      question: `(${procedureCode}) O que caracteriza um procedimento operacional bem elaborado, como "${name}"?`,
      options: [
        "Linguagem clara, etapas sequenciais definidas, responsabilidades atribuídas, critérios de aceitação e referências normativas aplicáveis",
        "Volume máximo de texto técnico para cobrir todas as possíveis variações da atividade",
        "Ausência de referências a normas externas para garantir autonomia operacional",
        "Aprovação exclusiva pela equipe de QSMS, sem participação dos executantes",
      ],
      correctOptionIndex: 0,
      explanation: "Um bom procedimento tem linguagem clara, etapas sequenciais, responsabilidades definidas, critérios de aceitação e referências normativas — tornando-o aplicável e auditável.",
    },
  ].map((q, i) => shuffleCorrectAnswer(q, positions[i]));
}

export async function POST(req: NextRequest) {
  try {
    const { promptText, procedureCode, procedureName } = await req.json();

    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json({ error: "Texto base é obrigatório" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // ── Sem key: retorna mock com aviso ──────────────────────────────────────
    if (!apiKey) {
      console.log("[generate-questions] GEMINI_API_KEY não configurada, usando questões padrão");
      return NextResponse.json({
        questions: mockQuestions(promptText, procedureCode || "GERAL", procedureName || procedureCode || "Geral"),
        source: "mock",
        geminiError: "GEMINI_API_KEY não configurada — configure a chave em Settings > Environment Variables no Vercel",
      });
    }

    // ── Chamada REST direta à Gemini API ─────────────────────────────────────
    const body = {
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: buildPrompt(promptText, procedureCode, procedureName) }] }],
      generationConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    };

    let rawText: string | undefined;
    let geminiError: string | undefined;

    try {
      const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        geminiError = `HTTP ${geminiRes.status}: ${errText.slice(0, 300)}`;
        console.error("[generate-questions] Gemini API error:", geminiError);
      } else {
        const geminiData = await geminiRes.json();
        rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          const finishReason = geminiData?.candidates?.[0]?.finishReason;
          geminiError = `Resposta vazia (finishReason: ${finishReason ?? "unknown"})`;
          console.error("[generate-questions]", geminiError);
        }
      }
    } catch (fetchErr: unknown) {
      geminiError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error("[generate-questions] fetch error:", geminiError);
    }

    // ── Fallback para mock se Gemini falhou ──────────────────────────────────
    if (geminiError || !rawText) {
      console.warn("[generate-questions] Usando mock como fallback. Motivo:", geminiError);
      return NextResponse.json({
        questions: mockQuestions(promptText, procedureCode || "GERAL", procedureName || procedureCode || "Geral"),
        source: "mock",
        geminiError,
      });
    }

    // ── Parse JSON da resposta real ───────────────────────────────────────────
    let parsed: { questions: unknown[] };
    try {
      parsed = JSON.parse(extractJSON(rawText));
    } catch {
      console.error("[generate-questions] JSON parse error. raw:", rawText.slice(0, 400));
      return NextResponse.json({
        questions: mockQuestions(promptText, procedureCode || "GERAL", procedureName || procedureCode || "Geral"),
        source: "mock",
        geminiError: "JSON parse error",
      });
    }

    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
      return NextResponse.json({
        questions: mockQuestions(promptText, procedureCode || "GERAL", procedureName || procedureCode || "Geral"),
        source: "mock",
        geminiError: "Array de questões vazio",
      });
    }

    // Força shuffle nas respostas do Gemini — garante aleatoriedade mesmo que o modelo ignore a instrução
    const geminiPositions = makeShuffledPositions(parsed.questions.length);
    const shuffledQuestions = (parsed.questions as any[]).map((q, i) =>
      typeof q?.correctOptionIndex === "number"
        ? shuffleCorrectAnswer(q, geminiPositions[i])
        : q
    );
    return NextResponse.json({ questions: shuffledQuestions, source: "gemini" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-questions] Erro inesperado:", msg);
    return NextResponse.json({ error: "Falha ao gerar questões." }, { status: 500 });
  }
}
