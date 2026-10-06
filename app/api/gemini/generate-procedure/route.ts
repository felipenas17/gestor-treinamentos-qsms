import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, sector, associatedRole, keyHazards } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Título do procedimento é obrigatório' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const randomCode = `POP-${sector ? sector.slice(0, 2).toUpperCase() : 'OP'}-${Math.floor(100 + Math.random() * 900)}`;
      return NextResponse.json({
        procedure: {
          code: randomCode,
          name: title,
          sector: sector || 'Operações Offshore',
          associatedRole: associatedRole || 'Operador Especialista',
          application: `Aplicação operacional com foco em: ${keyHazards || 'Controle de riscos críticos'}.`,
          complianceRate: 100,
          lastRevision: new Date().toLocaleDateString('pt-BR'),
          status: 'Ativo',
          questionsCount: 10,
          criticality: 'Alta',
          description: `Procedimento Padrão para mitigar riscos de ${keyHazards || 'falhas operacionais'} conforme NR-37.`,
          validityMonths: 12
        }
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Gere um procedimento operacional padrão (POP) completo para Tiger Rentank do Brasil (offshore QSMS):
Título: ${title}
Setor: ${sector || 'Operações Offshore'}
Função associada: ${associatedRole || 'Operador'}
Riscos principais: ${keyHazards || 'Riscos operacionais offshore'}

Responda APENAS com JSON válido no formato especificado.`,
      config: {
        systemInstruction: `Você é um Engenheiro Sênior de QSMS offshore. Gere POPs técnicos, precisos e alinhados com NR-37, ISO 45001 e práticas Petrobras/PRIO/MODEC. Responda em português brasileiro.`,
        temperature: 0.5,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            procedure: {
              type: Type.OBJECT,
              properties: {
                code: { type: Type.STRING },
                name: { type: Type.STRING },
                sector: { type: Type.STRING },
                associatedRole: { type: Type.STRING },
                application: { type: Type.STRING },
                complianceRate: { type: Type.NUMBER },
                lastRevision: { type: Type.STRING },
                status: { type: Type.STRING },
                questionsCount: { type: Type.INTEGER },
                criticality: { type: Type.STRING },
                description: { type: Type.STRING },
                validityMonths: { type: Type.INTEGER },
              },
              required: ['code', 'name', 'sector', 'associatedRole', 'application', 'criticality', 'description', 'validityMonths'],
            },
          },
          required: ['procedure'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!parsed.procedure) throw new Error('Resposta inválida da IA');

    parsed.procedure.complianceRate = 100;
    parsed.procedure.status = 'Ativo';
    parsed.procedure.questionsCount = parsed.procedure.questionsCount || 10;
    parsed.procedure.lastRevision = new Date().toLocaleDateString('pt-BR');

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Erro ao gerar procedimento:', error);
    return NextResponse.json({ error: 'Falha ao gerar procedimento.' }, { status: 500 });
  }
}
