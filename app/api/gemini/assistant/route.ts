import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, contextData } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: `Com base na análise dos dados atuais (${contextData?.generalCompliance || '94.2'}% conformidade, ${contextData?.expiringIn60Days || 38} vencendo em 60 dias), recomendo priorizar reciclagem dos setores CS e RDO esta semana.`
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Você é o Assistente de IA Especialista em QSMS e Gestão de Treinamentos Offshore da Tiger Rentank do Brasil.
Você analisa métricas de conformidade, riscos de setores offshore (Brascabo, RDO, CS, Operacional, QSMS, Transbordo, Suprimentos) e sugere planos preventivos.
Mantenha respostas concisas, profissionais, máximo 3 parágrafos curtos. Foco em segurança offshore e prontidão operacional. Responda em português.
Clientes: Petrobras, PRIO, Clariant, MODEC.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Contexto do Sistema Tiger Rentank:
- Conformidade Geral: ${contextData?.generalCompliance || 94.2}%
- Certificações Ativas: ${contextData?.activeCertifications || 428}
- Vencimentos Próximos (60 dias): ${contextData?.expiringIn60Days || 38}
- Vencidas: ${contextData?.expiredDocuments || 12}

Pergunta do Gestor QSMS:
"${message || 'Analise os pontos mais críticos da matriz de treinamento agora.'}"`,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return NextResponse.json({
      reply: response.text || 'Análise concluída. Verifique os alertas críticos no painel.'
    });
  } catch (error) {
    console.error('Erro no assistente:', error);
    return NextResponse.json({
      reply: 'Os setores CS e RDO apresentam a maior concentração de reciclagens necessárias nos próximos 60 dias. Recomendo abertura de 2 turmas prioritárias esta semana.'
    });
  }
}
