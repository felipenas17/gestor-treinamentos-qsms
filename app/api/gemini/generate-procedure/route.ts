import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Extração a partir de arquivo
    if (body.fileData) {
      const prompt = `Analise este documento de procedimento operacional e extraia as seguintes informações em JSON puro (sem markdown):
{
  "code": "código do POP ex: POP-001 ou IT-002",
  "name": "título/nome do procedimento",
  "description": "objetivo e escopo em até 3 frases",
  "hours": "carga horária em número (só o número)",
  "validityMonths": "validade em meses (6, 12, 24, 36 ou 60)",
  "criticality": "Alta, Média ou Baixa"
}
Se não encontrar um campo, use string vazia. Responda APENAS com o JSON.`;

      const result = await model.generateContent([
        { inlineData: { mimeType: body.mimeType, data: body.fileData } },
        prompt
      ]);
      const text = result.response.text().trim().replace(/```json|```/g, '');
      const data = JSON.parse(text);
      return NextResponse.json(data);
    }

    // Geração a partir de descrição textual (fluxo original)
    const { description } = body;
    const result = await model.generateContent(
      `Gere um procedimento operacional padrão completo em português para: ${description}. Retorne JSON com: code, name, description, hours, validityMonths, criticality.`
    );
    const text = result.response.text().trim().replace(/```json|```/g, '');
    return NextResponse.json(JSON.parse(text));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
