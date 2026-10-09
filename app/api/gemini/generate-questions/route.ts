import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

/** Strip markdown code fences that Gemini sometimes wraps around JSON */
function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return raw.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { promptText, procedureCode } = await req.json();

    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json(
        { error: "Texto base é obrigatório" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // ── Fallback mock when key is absent ────────────────────────────────────
    if (!apiKey) {
      return NextResponse.json({
        questions: [
          {
            id: `q-mock-${Date.now()}-1`,
            question: `Conforme os requisitos de QSMS para "${promptText.slice(0, 50)}", qual é o passo crítico obrigatório antes de acionar o sistema?`,
            options: [
              "Verificar isolamento de energias perigosas (LOTO) e emitir Permissão de Trabalho (PT)",
              "Iniciar a operação em modo automático sem checklist prévio",
              "Substituir o supervisor de área por rádio VHF",
              "Desativar os alarmes de segurança para evitar falsos positivos",
            ],
            correctOptionIndex: 0,
            explanation:
              "O isolamento e a emissão formal de Permissão de Trabalho são requisitos inegociáveis de segurança offshore conforme NR-37 e NR-10.",
          },
          {
            id: `q-mock-${Date.now()}-2`,
            question: `Em caso de detecção de anomalia durante "${promptText.slice(0, 45)}", qual é o protocolo de Parada Imediata?`,
            options: [
              "Aguardar o término do turno para relatar no diário RDO",
              "Exercer o Direito de Recusa (Stop Work Authority) e isolar o perímetro",
              "Continuar operando com velocidade reduzida",
              "Consultar a gerência em terra antes de tomar qualquer medida",
            ],
            correctOptionIndex: 1,
            explanation:
              "Todo colaborador offshore tem o dever e o poder de exercer a Política de Interrupção de Trabalho (SWA) perante risco iminente.",
          },
        ],
      });
    }

    // ── Real Gemini call ─────────────────────────────────────────────────────
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Você é um Engenheiro Sênior Especialista em QSMS (Qualidade, Segurança, Meio Ambiente e Saúde) em operações offshore de óleo e gás (Petrobras, PRIO, MODEC, Clariant, NR-37).
Sua missão é gerar questões de múltipla escolha técnicas, rigorosas e realistas para avaliação de eficácia de treinamento baseadas no procedimento ou comando fornecido.
Cada questão deve conter exatamente 4 alternativas e apenas 1 correta, acompanhada de justificativa técnica com citação de norma regulamentadora ou boa prática industrial.
Responda SEMPRE com JSON puro e válido, sem texto adicional, sem blocos de código markdown, sem comentários.`;

    const userPrompt = `Gere entre 5 e 8 questões de eficácia de treinamento para o seguinte tema ou POP (${procedureCode || "Geral"}):
"${promptText}"

Responda APENAS com JSON no formato exato abaixo, sem texto adicional:
{
  "questions": [
    {
      "id": "q-1",
      "question": "Pergunta técnica aqui?",
      "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
      "correctOptionIndex": 0,
      "explanation": "Justificativa técnica com referência normativa."
    }
  ]
}`;

    let rawText: string | undefined;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.6,
          responseMimeType: "application/json",
        },
      });

      // .text is a getter that may return undefined if no text parts
      rawText = response.text;
      console.log("[generate-questions] raw response length:", rawText?.length ?? 0);
    } catch (genErr: unknown) {
      // Log the real Gemini error so we can see it in Vercel logs
      const msg = genErr instanceof Error ? genErr.message : String(genErr);
      console.error("[generate-questions] Gemini generateContent error:", msg);

      // Try without responseMimeType as a fallback
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.6,
          },
        });
        rawText = fallbackResponse.text;
        console.log("[generate-questions] fallback raw length:", rawText?.length ?? 0);
      } catch (fallbackErr: unknown) {
        const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        console.error("[generate-questions] Gemini fallback error:", fbMsg);
        throw fallbackErr;
      }
    }

    if (!rawText) {
      console.error("[generate-questions] response.text is empty/undefined");
      return NextResponse.json(
        { error: "Gemini retornou resposta vazia." },
        { status: 500 }
      );
    }

    // Parse JSON (handle accidental code fences)
    let parsed: { questions: unknown[] };
    try {
      parsed = JSON.parse(extractJSON(rawText));
    } catch (parseErr) {
      console.error("[generate-questions] JSON parse error. Raw text:", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "Falha ao interpretar resposta da IA." },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
      console.error("[generate-questions] No questions in parsed response:", JSON.stringify(parsed).slice(0, 300));
      return NextResponse.json(
        { error: "IA não retornou questões." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[generate-questions] Unhandled error:", msg);
    return NextResponse.json(
      { error: "Falha ao gerar questões. Tente novamente." },
      { status: 500 }
    );
  }
}
