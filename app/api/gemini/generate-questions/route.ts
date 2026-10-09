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

export async function POST(req: NextRequest) {
  try {
    const { promptText, procedureCode } = await req.json();

    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json({ error: "Texto base é obrigatório" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // ── Mock quando key ausente ───────────────────────────────────────────────
    if (!apiKey) {
      const ts = Date.now();
      return NextResponse.json({
        questions: [
          {
            id: `q-mock-${ts}-1`,
            question: `Conforme QSMS para "${promptText.slice(0, 50)}", qual é o passo obrigatório antes de acionar o sistema?`,
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
            question: `Em anomalia detectada durante "${promptText.slice(0, 45)}", qual é o protocolo?`,
            options: [
              "Aguardar fim do turno para relatar no RDO",
              "Exercer Stop Work Authority (SWA) e isolar o perímetro",
              "Continuar com velocidade reduzida",
              "Consultar gerência em terra antes de agir",
            ],
            correctOptionIndex: 1,
            explanation: "Todo colaborador offshore tem o dever de exercer SWA perante risco iminente.",
          },
        ],
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

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error(`[generate-questions] Gemini HTTP ${geminiRes.status}:`, errText.slice(0, 500));
      return NextResponse.json(
        { error: `Gemini retornou erro ${geminiRes.status}.` },
        { status: 500 }
      );
    }

    const geminiData = await geminiRes.json();

    // Extrair texto da resposta
    const rawText: string | undefined =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      const finishReason = geminiData?.candidates?.[0]?.finishReason;
      console.error("[generate-questions] Sem texto na resposta. finishReason:", finishReason);
      console.error("[generate-questions] Resposta completa:", JSON.stringify(geminiData).slice(0, 500));
      return NextResponse.json({ error: "Gemini retornou resposta vazia." }, { status: 500 });
    }

    // Parse JSON
    let parsed: { questions: unknown[] };
    try {
      parsed = JSON.parse(extractJSON(rawText));
    } catch {
      console.error("[generate-questions] JSON parse error. raw:", rawText.slice(0, 400));
      return NextResponse.json({ error: "Falha ao interpretar JSON da IA." }, { status: 500 });
    }

    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
      console.error("[generate-questions] Sem questões no JSON:", JSON.stringify(parsed).slice(0, 300));
      return NextResponse.json({ error: "IA não retornou questões." }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-questions] Erro inesperado:", msg);
    return NextResponse.json({ error: "Falha ao gerar questões." }, { status: 500 });
  }
}
