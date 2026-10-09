import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/** Strip markdown code fences Gemini sometimes wraps around JSON */
function extractJSON(raw: string): string {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (m ? m[1] : raw).trim();
}

const SYSTEM_INSTRUCTION = `Você é um Engenheiro Sênior Especialista em QSMS (Qualidade, Segurança, Meio Ambiente e Saúde) em operações offshore de óleo e gás (Petrobras, PRIO, MODEC, Clariant, NR-37).
Gere questões de múltipla escolha técnicas, rigorosas e realistas para avaliação de eficácia de treinamento.
Cada questão: 4 alternativas, 1 correta, justificativa técnica com norma regulamentadora.
Responda SOMENTE com JSON válido, sem texto adicional, sem blocos markdown.`;

function buildPrompt(promptText: string, procedureCode: string): string {
  return `Gere entre 5 e 8 questões de eficácia de treinamento para o POP "${procedureCode || "Geral"}":
"${promptText}"

Responda APENAS com este JSON (sem mais nada):
{
  "questions": [
    {
      "id": "q-1",
      "question": "Pergunta técnica?",
      "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
      "correctOptionIndex": 0,
      "explanation": "Justificativa com norma."
    }
  ]
}`;
}

function mockQuestions(promptText: string, procedureCode: string) {
  const ts = Date.now();
  return [
    {
      id: `q-mock-${ts}-1`,
      question: `(${procedureCode}) Qual é o passo crítico obrigatório antes de acionar o sistema em "${promptText.slice(0, 50)}"?`,
      options: [
        "Verificar isolamento de energias (LOTO) e emitir Permissão de Trabalho (PT)",
        "Iniciar em modo automático sem checklist",
        "Substituir supervisor por rádio VHF",
        "Desativar alarmes para evitar falsos positivos",
      ],
      correctOptionIndex: 0,
      explanation: "LOTO e PT são requisitos inegociáveis conforme NR-37 e NR-10.",
    },
    {
      id: `q-mock-${ts}-2`,
      question: `(${procedureCode}) Em anomalia detectada durante "${promptText.slice(0, 45)}", qual é o protocolo de parada?`,
      options: [
        "Aguardar fim do turno para relatar no RDO",
        "Exercer Stop Work Authority (SWA) e isolar o perímetro",
        "Continuar com velocidade reduzida",
        "Consultar gerência em terra antes de agir",
      ],
      correctOptionIndex: 1,
      explanation: "Todo colaborador offshore tem o dever de exercer SWA perante risco iminente.",
    },
    {
      id: `q-mock-${ts}-3`,
      question: `(${procedureCode}) Qual documento deve acompanhar toda atividade de risco elevado conforme NR-37?`,
      options: [
        "Relatório Diário de Operações (RDO)",
        "Permissão de Trabalho (PT) com ASO vigente",
        "Comunicado de Bordo",
        "Planilha de controle de turno",
      ],
      correctOptionIndex: 1,
      explanation: "A PT é o instrumento formal que habilita a execução de atividades de risco, exigida pela NR-37.",
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const { promptText, procedureCode } = await req.json();

    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json({ error: "Texto base é obrigatório" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // ── Sem key: retorna mock ─────────────────────────────────────────────────
    if (!apiKey) {
      console.log("[generate-questions] GEMINI_API_KEY não configurada, usando mock");
      return NextResponse.json({
        questions: mockQuestions(promptText, procedureCode || "GERAL"),
        source: "mock",
      });
    }

    // ── Chamada REST direta à Gemini API ─────────────────────────────────────
    const body = {
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: buildPrompt(promptText, procedureCode) }] }],
      generationConfig: {
        temperature: 0.6,
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
        questions: mockQuestions(promptText, procedureCode || "GERAL"),
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
        questions: mockQuestions(promptText, procedureCode || "GERAL"),
        source: "mock",
        geminiError: "JSON parse error",
      });
    }

    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
      return NextResponse.json({
        questions: mockQuestions(promptText, procedureCode || "GERAL"),
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
