import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/** Strip markdown code fences Gemini sometimes wraps around JSON */
function extractJSON(raw: string): string {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (m ? m[1] : raw).trim();
}

const SYSTEM_INSTRUCTION = `Você é um Engenheiro Sênior Especialista em QSMS (Qualidade, Segurança, Meio Ambiente e Saúde) em operações offshore de óleo e gás (Petrobras, PRIO, MODEC, Clariant, NR-37).
Gere EXATAMENTE 10 questões de múltipla escolha técnicas, rigorosas e realistas para avaliação de eficácia de treinamento.
IMPORTANTE: As questões DEVEM ser baseadas EXCLUSIVAMENTE no conteúdo, definições, conceitos e procedimentos descritos no POP/procedimento fornecido.
Não gere questões genéricas sobre LOTO, SWA ou PT a menos que o próprio procedimento trate desses temas.
Cada questão: 4 alternativas, 1 correta, justificativa técnica referenciando o procedimento ou norma regulamentadora citada no próprio POP.
Responda SOMENTE com JSON válido, sem texto adicional, sem blocos markdown.`;

function buildPrompt(promptText: string, procedureCode: string, procedureName: string): string {
  return `Com base no seguinte POP/procedimento, gere EXATAMENTE 10 questões de eficácia de treinamento:

=== CONTEÚDO DO PROCEDIMENTO ===
${promptText}
=== FIM DO CONTEÚDO ===

As questões devem testar se o colaborador compreendeu os conceitos, definições, etapas e responsabilidades descritos NESTE procedimento específico.

Responda APENAS com este JSON (sem mais nada):
{
  "questions": [
    {
      "id": "q-1",
      "question": "Pergunta técnica baseada no procedimento?",
      "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
      "correctOptionIndex": 0,
      "explanation": "Justificativa referenciando o procedimento ou norma."
    }
  ]
}`;
}

function mockQuestions(promptText: string, procedureCode: string, procedureName: string) {
  const ts = Date.now();
  const name = procedureName || procedureCode || "Geral";
  return [
    {
      id: `q-mock-${ts}-1`,
      question: `(${procedureCode}) Qual é o objetivo principal do procedimento "${name}"?`,
      options: [
        "Estabelecer metodologia para identificar, avaliar e controlar aspectos/impactos e perigos/riscos das atividades",
        "Registrar ocorrências de acidentes de trabalho para fins estatísticos",
        "Definir o cronograma de treinamentos obrigatórios da unidade",
        "Controlar o estoque de EPIs utilizados nas operações offshore",
      ],
      correctOptionIndex: 0,
      explanation: `O procedimento "${name}" define a metodologia sistemática de identificação e controle, conforme requisitos ISO 14001 e ISO 45001.`,
    },
    {
      id: `q-mock-${ts}-2`,
      question: `(${procedureCode}) Segundo o procedimento, o que é "Aspecto Ambiental"?`,
      options: [
        "Elemento das atividades, produtos ou serviços de uma organização que interage ou pode interagir com o meio ambiente",
        "Modificação no meio ambiente resultante das atividades da organização",
        "Fonte com potencial para provocar danos humanos em termos de lesão ou doença",
        "Probabilidade de ocorrência de um evento perigoso com determinada gravidade",
      ],
      correctOptionIndex: 0,
      explanation: "Aspecto Ambiental é o elemento que PODE interagir com o meio ambiente — distinto do Impacto Ambiental, que é a modificação resultante, conforme definição do procedimento e ISO 14001.",
    },
    {
      id: `q-mock-${ts}-3`,
      question: `(${procedureCode}) Qual é a diferença entre "Impacto Ambiental" e "Aspecto Ambiental"?`,
      options: [
        "Aspecto é o elemento da atividade; impacto é a modificação no meio ambiente causada por esse aspecto",
        "São sinônimos — ambos descrevem danos ao meio ambiente",
        "Impacto é a causa e aspecto é a consequência",
        "Aspecto refere-se a aspectos legais; impacto refere-se a aspectos operacionais",
      ],
      correctOptionIndex: 0,
      explanation: "O procedimento define claramente: Aspecto (causa) → Impacto (efeito/modificação no meio ambiente). Essa relação causa-efeito é fundamental para o levantamento.",
    },
    {
      id: `q-mock-${ts}-4`,
      question: `(${procedureCode}) O que é "Perigo" conforme definição do procedimento?`,
      options: [
        "Fonte, situação ou ato com potencial para provocar danos humanos em termos de lesão ou doença, ou combinação destas",
        "Probabilidade de ocorrência de um evento perigoso multiplicada pela gravidade",
        "Resultado de uma avaliação quantitativa de riscos operacionais",
        "Documento que registra as condições inseguras identificadas na inspeção",
      ],
      correctOptionIndex: 0,
      explanation: "A definição de Perigo do procedimento é: fonte, situação ou ato com potencial de dano humano. Diferente de Risco, que envolve probabilidade × gravidade, conforme ISO 45001.",
    },
    {
      id: `q-mock-${ts}-5`,
      question: `(${procedureCode}) O que é "Risco" segundo o procedimento?`,
      options: [
        "Combinação da probabilidade de ocorrência de um evento perigoso com a gravidade da lesão ou doença",
        "Evento não planejado que resulta em lesão ou dano ao patrimônio",
        "Ausência de medidas de controle em uma atividade de risco elevado",
        "Qualquer situação que exija uso de EPI nível 3",
      ],
      correctOptionIndex: 0,
      explanation: "Risco = Probabilidade × Severidade. O procedimento define risco como combinação da probabilidade de ocorrência com a gravidade do dano, alinhado à ISO 45001.",
    },
    {
      id: `q-mock-${ts}-6`,
      question: `(${procedureCode}) O que é "Identificação do Aspecto" conforme o procedimento?`,
      options: [
        "Processo de reconhecimento da existência de um aspecto e definição de suas características",
        "Avaliação quantitativa da gravidade dos impactos ambientais da atividade",
        "Elaboração do relatório de conformidade ambiental para a ANP",
        "Cadastramento de fornecedores com certificação ambiental ISO 14001",
      ],
      correctOptionIndex: 0,
      explanation: "Identificação do Aspecto é o processo de RECONHECIMENTO da existência do aspecto e definição de suas características — primeiro passo antes da avaliação de significância.",
    },
    {
      id: `q-mock-${ts}-7`,
      question: `(${procedureCode}) Qual norma internacional trata do Sistema de Gestão Ambiental referenciado no procedimento?`,
      options: [
        "ISO 14001",
        "ISO 9001",
        "OHSAS 18001",
        "NBR 16001",
      ],
      correctOptionIndex: 0,
      explanation: "O Sistema de Gestão Ambiental (SGA) é regido pela ISO 14001, que define requisitos para identificar e controlar aspectos e impactos ambientais das atividades.",
    },
    {
      id: `q-mock-${ts}-8`,
      question: `(${procedureCode}) Qual norma rege o Sistema de Gestão de Segurança e Saúde Ocupacional mencionado no procedimento?`,
      options: [
        "ISO 45001",
        "ISO 14001",
        "ISO 9001",
        "NR-37",
      ],
      correctOptionIndex: 0,
      explanation: "A ISO 45001 substituiu a OHSAS 18001 e é a norma internacional que rege o Sistema de Gestão de Segurança e Saúde Ocupacional (SGSSaO), exigindo identificação de perigos e avaliação de riscos.",
    },
    {
      id: `q-mock-${ts}-9`,
      question: `(${procedureCode}) Qual é o papel da "Identificação de Perigos" dentro do procedimento?`,
      options: [
        "Reconhecer que um perigo existe e definir suas características antes de avaliar o risco",
        "Eliminar automaticamente todos os perigos identificados nas operações",
        "Emitir a Permissão de Trabalho para atividades com perigos elevados",
        "Classificar os perigos apenas após a ocorrência de um acidente",
      ],
      correctOptionIndex: 0,
      explanation: "Identificação de Perigos é o RECONHECIMENTO proativo da existência de perigos — etapa anterior à avaliação e controle de riscos, conforme o procedimento e ISO 45001.",
    },
    {
      id: `q-mock-${ts}-10`,
      question: `(${procedureCode}) Na sequência lógica do procedimento, qual é a ordem correta das etapas?`,
      options: [
        "Identificar aspecto/perigo → Avaliar impacto/risco → Definir controles → Monitorar",
        "Definir controles → Identificar perigos → Avaliar riscos → Registrar",
        "Avaliar riscos → Identificar perigos → Monitorar → Definir controles",
        "Registrar ocorrências → Identificar aspectos → Avaliar impactos → Treinar",
      ],
      correctOptionIndex: 0,
      explanation: "O procedimento segue a metodologia PDCA: identificação (aspecto/perigo) → avaliação (impacto/risco) → controles → monitoramento, alinhado com ISO 14001 e ISO 45001.",
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const { promptText, procedureCode, procedureName } = await req.json();

    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json({ error: "Texto base é obrigatório" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // ── Sem key: retorna mock ─────────────────────────────────────────────────
    if (!apiKey) {
      console.log("[generate-questions] GEMINI_API_KEY não configurada, usando mock");
      return NextResponse.json({
        questions: mockQuestions(promptText, procedureCode || "GERAL", procedureName || procedureCode || "Geral"),
        source: "mock",
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

    return NextResponse.json({ questions: parsed.questions, source: "gemini" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-questions] Erro inesperado:", msg);
    return NextResponse.json({ error: "Falha ao gerar questões." }, { status: 500 });
  }
}
