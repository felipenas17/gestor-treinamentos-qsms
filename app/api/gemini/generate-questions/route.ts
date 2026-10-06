import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { promptText, procedureCode } = await req.json();

    if (!promptText || typeof promptText !== 'string') {
      return NextResponse.json({ error: 'Texto base é obrigatório' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        questions: [
          {
            id: `q-gen-${Date.now()}-1`,
            question: `Conforme os requisitos de QSMS para "${promptText.slice(0, 50)}...", qual é o passo crítico obrigatório antes de acionar o sistema?`,
            options: [
              'Verificar isolamento de energias perigosas (LOTO) e emitir Permissão de Trabalho (PT)',
              'Iniciar a operação em modo automático sem checklist prévio',
              'Substituir o supervisor de área por rádio VHF',
              'Desativar os alarmes de segurança para evitar falsos positivos'
            ],
            correctOptionIndex: 0,
            explanation: 'O isolamento e a emissão formal de Permissão de Trabalho são requisitos inegociáveis de segurança offshore conforme NR-37 e NR-10.'
          },
          {
            id: `q-gen-${Date.now()}-2`,
            question: `Em caso de detecção de anomalia durante ${promptText.slice(0, 45)}, qual é o protocolo de Parada Imediata?`,
            options: [
              'Aguardar o término do turno para relatar no diário RDO',
              'Exercer o Direito de Recusa (Stop Work Authority) e isolar o perímetro',
              'Continuar operando com velocidade reduzida',
              'Consultar a gerência em terra antes de tomar qualquer medida'
            ],
            correctOptionIndex: 1,
            explanation: 'Todo colaborador offshore tem o dever e o poder de exercer a Política de Interrupção de Trabalho (SWA) perante risco iminente.'
          }
        ]
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Você é um Engenheiro Sênior Especialista em QSMS (Qualidade, Segurança, Meio Ambiente e Saúde) em operações offshore de óleo e gás (Petrobras, PRIO, MODEC, Clariant, NR-37).
Sua missão é gerar questões de múltipla escolha técnicas, rigorosas e realistas para avaliação de eficácia de treinamento baseadas no procedimento ou comando fornecido.
Cada questão deve conter exatamente 4 alternativas e apenas 1 correta, acompanhada de justificativa técnica com citação de norma regulamentadora ou boa prática industrial.`;

    const userPrompt = `Gere entre 5 e 8 questões de eficácia de treinamento para o seguinte tema ou POP (${procedureCode || 'Geral'}):
"${promptText}"

Responda APENAS com JSON válido no formato:
{
  "questions": [
    {
      "id": "q-1",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctOptionIndex": 0,
      "explanation": "..."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.6,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctOptionIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ['id', 'question', 'options', 'correctOptionIndex', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"questions":[]}');
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Erro ao gerar questões:', error);
    return NextResponse.json({ error: 'Falha ao gerar questões. Tente novamente.' }, { status: 500 });
  }
}
