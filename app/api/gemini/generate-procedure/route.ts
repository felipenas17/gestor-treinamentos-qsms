import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const EMPTY = { code: "", name: "", description: "", hours: "", validityMonths: "12", criticality: "Alta" };

function extractJson(text: string) {
  try { return JSON.parse(text); } catch { /* not pure JSON */ }
  const biggest = text.match(/\{[\s\S]*\}/);
  if (biggest) { try { return JSON.parse(biggest[0]); } catch { /* ignore */ } }
  return null;
}

const PROMPT = `Você é um extrator de dados de procedimentos operacionais (POPs/PGTs/Normas).
Analise o texto abaixo e extraia as informações em JSON puro (sem markdown, sem explicações).

{
  "code": "código exato como aparece no cabeçalho (ex: PG-TR-SMS-002, POP-EST-001, IT-SEG-015 — mantenha o formato original)",
  "name": "título completo do procedimento como aparece no documento",
  "description": "objetivo e escopo em 2-3 frases",
  "hours": "carga horária em horas, somente o número inteiro (ex: 4, 8, 16) — se não encontrar use 8",
  "validityMonths": "validade em meses — escolha entre: 6, 12, 24, 36 ou 60 — se não encontrar use 12",
  "criticality": "criticidade de segurança — escolha entre: Alta, Média ou Baixa — se não encontrar use Alta"
}`;

async function extractTextFromPDF(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  // Dynamic import to avoid build-time issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text || "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });
    let contentText = "";

    if (body.fileData) {
      const isPdf = (body.mimeType || "").includes("pdf") ||
                    (body.fileName || "").toLowerCase().endsWith(".pdf");

      if (isPdf) {
        // Extract text from PDF server-side, then send text to Gemini
        try {
          const extracted = await extractTextFromPDF(body.fileData);
          if (extracted.trim().length > 100) {
            // Limit to first 8000 chars to stay within token limits
            contentText = extracted.substring(0, 8000);
          }
        } catch (pdfErr) {
          console.warn("[generate-procedure] pdf-parse failed, falling back to inline:", pdfErr);
        }
      }

      if (contentText) {
        // Use extracted text
        const result = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [{
            role: "user",
            parts: [{ text: `${PROMPT}\n\n--- TEXTO DO DOCUMENTO ---\n${contentText}` }],
          }],
        });
        const rawText = result.text ?? "";
        const cleaned = rawText.trim()
          .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = extractJson(cleaned);
        if (parsed) {
          return NextResponse.json(sanitise(parsed));
        }
        console.error("[generate-procedure] JSON não encontrado (text mode). Gemini:", rawText.substring(0, 300));
        return NextResponse.json(EMPTY);
      }

      // Fallback: send inline to Gemini (for docx/txt or if pdf-parse returned nothing)
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
      const rawText = result.text ?? "";
      const cleaned = rawText.trim()
        .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = extractJson(cleaned);
      if (parsed) return NextResponse.json(sanitise(parsed));
      console.error("[generate-procedure] JSON não encontrado (inline mode). Gemini:", rawText.substring(0, 300));
      return NextResponse.json(EMPTY);
    }

    // Text-only fallback (no file uploaded, just description text)
    const descText = body.description || body.title || "procedimento operacional";
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{ text: `${PROMPT}\n\nDescrição fornecida: ${descText}` }],
      }],
    });
    const rawText = result.text ?? "";
    const cleaned = rawText.trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = extractJson(cleaned);
    return NextResponse.json(parsed ? sanitise(parsed) : EMPTY);

  } catch (e) {
    console.error("[generate-procedure] Erro:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function sanitise(parsed: Record<string, unknown>) {
  return {
    code: String(parsed.code ?? "").trim(),
    name: String(parsed.name ?? "").trim(),
    description: String(parsed.description ?? "").trim(),
    hours: String(parsed.hours ?? "").replace(/\D/g, "").trim(),
    validityMonths: String(parsed.validityMonths ?? "12").trim(),
    criticality: (["Alta", "Média", "Baixa"].includes(parsed.criticality as string)
      ? parsed.criticality
      : "Alta") as string,
  };
}
