import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analise este documento e extraia em JSON puro (sem markdown):
{"code":"POP-001","name":"nome","description":"escopo","hours":"8","validityMonths":"12","criticality":"Alta"}
Se não encontrar, use string vazia. Responda APENAS com o JSON.`;

    if (body.fileData) {
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [
          { inlineData: { mimeType: body.mimeType || "application/octet-stream", data: body.fileData } },
          { text: prompt }
        ]}],
      });
      const text = result.text?.trim().replace(/```json|```/g, "").trim() ?? "";
      return NextResponse.json(JSON.parse(text));
    }

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: `Gere POP em português para: ${body.description}. JSON puro: code, name, description, hours, validityMonths, criticality.` }] }],
    });
    const text = result.text?.trim().replace(/```json|```/g, "").trim() ?? "";
    return NextResponse.json(JSON.parse(text));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
