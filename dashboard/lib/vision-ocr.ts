const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const VISION_MODEL = process.env.VISION_MODEL || 'llava';

export interface OcrResult {
  textoExtraido: string;
  datosEstructurados: Record<string, unknown>;
  confianza: number;
}

export async function extraerTextoImagen(imageBase64: string, tipoDocumento: string): Promise<OcrResult | null> {
  const prompt = `Analizá esta imagen de un documento médico (${tipoDocumento}).
Extraé la información relevante en formato JSON.

REGLAS:
- Respondé SOLO con JSON válido, sin markdown.
- Si hay texto, incluí el texto completo en "texto_extraido".
- Si hay datos estructurados (medicamento, dosis, fecha, etc.), incluilos en "datos".
- Estimá la confianza de 0 a 100.
- No inventes datos que no estén en la imagen.

Formato:
{
  "texto_extraido": "...",
  "datos": { ... },
  "confianza": 0-100,
  "tipo_documento": "${tipoDocumento}"
}`;

  try {
    const res = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(content);

    return {
      textoExtraido: parsed.texto_extraido || '',
      datosEstructurados: (parsed.datos || {}) as Record<string, unknown>,
      confianza: typeof parsed.confianza === 'number' ? parsed.confianza : 0,
    };
  } catch {
    return null;
  }
}
