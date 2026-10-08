import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const EMPTY = { code: "", name: "", description: "", hours: "", validityMonths: "12", criticality: "Média" };

function extractJson(text: string) {
  try { return JSON.parse(text); } catch { /* not pure JSON */ }
  const match = text.match(/\{[\s\S]*?\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { /* no valid JSON block */ } }
  // Try the biggest JSON object in the text
  const allMatches = text.match(/\{[\s\S]*\}/);
  if (allMatches) { try { return JSON.parse(allMatches[0]); } catch { /* still no luck */ } }
  return null;
}

const PROMPT = `Você é um extrator especializado em procedimentos operacionais (POPs/PGTs/Normas).
Analise o documento fornecido e extraia as informações abaixo.
Retorne APENAS o objeto JSON sem markdown, sem texto adicional.

{
  "code": "código do documento como aparece no cabeçalho (ex: POP-001, PG-TR-SMS-002, IT-SEG-015)",
  "name": "título completo do procedimento como aparece no documento",
  "description": "objetivo e escopo do procedimento em 2-3 frases resumindo o que ele cobre",
  "hours": "carga horária em horas apenas o número inteiro (ex: 4, 8, 16) — se não encontrar use 8",
  "validityMonths": "validade em meses — escolha entre: 6, 12, 24, 36 ou 60 — se não encontrar use 12",
  "criticality": "criticidade de segurança — escolha entre: Alta, Média ou Baixa — se não encontrar use Alta"
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });
    let rawText = "";

    if (body.fileData) {
      const mimeType = body.mimeType && body.mimeType !== "application/octet-stream"
        ? body.mimeType
        : "application/pdf";

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType, data: body.fileData } },
            { text: PROMPT },
          ],
        }],
      });

      rawText = result.text ?? "";
    } else {
      // Text-only generation (fallback)
      const descText = body.description || body.title || "procedimento operacional";
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{
          role: "user",
          parts: [{ text: `${PROMPT}\n\nDescrição fornecida: ${descText}` }],
        }],
      });

      rawText = result.text ?? "";
    }

    // Clean potential markdown fences
    const cleaned = rawText.trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = extractJson(cleaned);

    if (!parsed) {
      console.error("[generate-procedure] JSON não encontrado. Resposta Gemini:", rawText.substring(0, 300));
      return NextResponse.json(EMPTY);
    }

    // Sanitise fields: ensure strings, trim whitespace
    const sanitised = {
      code: String(parsed.code ?? "").trim(),
      name: String(parsed.name ?? "").trim(),
      description: String(parsed.description ?? "").trim(),
      hours: String(parsed.hours ?? "").replace(/\D/g, "").trim(),
      validityMonths: String(parsed.validityMonths ?? "12").trim(),
      criticality: (["Alta", "Média", "Baixa"].includes(parsed.criticality) ? parsed.criticality : "Alta") as string,
    };

    return NextResponse.json(sanitised);
  } catch (e) {
    console.error("[generate-procedure] Erro:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
