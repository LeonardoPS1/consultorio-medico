import { safeLog, safeWarn, safeError } from './logger';

const VISION_MODEL = process.env.VISION_MODEL || 'gemma3';

export interface OcrResult {
  textoExtraido: string;
  datosEstructurados: Record<string, unknown>;
  confianza: number;
}

// Misma estrategia de URLs que lib/ollama.ts (el dashboard NO resuelve `ollama:11434`
// en Docker Swarm; la URL correcta es 172.18.0.1:11434 por docker_gwbridge).
const ALL_URLS = [
  'http://host.docker.internal:11434',
  'http://172.18.0.1:11434',
  'http://172.17.0.1:11434',
  'http://172.19.0.1:11434',
  'http://ollama:11434',
  'http://localhost:11434',
];

function getUrls(): string[] {
  const configured = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL;
  if (!configured) return ALL_URLS;

  const urls = [configured];
  for (const fb of ALL_URLS) {
    if (fb !== configured && !urls.includes(fb)) urls.push(fb);
  }
  return urls;
}

async function callVisionModel(
  prompt: string,
  imageBase64: string,
  mimeType = 'image/jpeg',
): Promise<OcrResult | null> {
  if (mimeType === 'application/pdf') {
    safeWarn('[Vision-OCR] PDF no soportado por el modelo de visión. Se requiere revisión manual.');
    return null;
  }

  const urls = getUrls();
  const timeoutMs = 60_000;

  for (const baseUrl of urls) {
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 2000,
          stream: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      if (!res.ok) {
        safeWarn(`[Vision-OCR] ${baseUrl} → HTTP ${res.status} en ${elapsed}s`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const cleaned = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        safeWarn(`[Vision-OCR] ${baseUrl} → respuesta no es JSON válido en ${elapsed}s`);
        continue;
      }

      safeLog(`[Vision-OCR] OK desde ${baseUrl} en ${elapsed}s (modelo ${VISION_MODEL})`);
      return {
        textoExtraido: (parsed.texto_extraido as string) || '',
        datosEstructurados: (parsed.datos || {}) as Record<string, unknown>,
        confianza: typeof parsed.confianza === 'number' ? parsed.confianza : 0,
      };
    } catch (err) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const msg = err instanceof Error ? err.message : String(err);
      safeWarn(`[Vision-OCR] ${baseUrl} → ${msg} en ${elapsed}s`);
    }
  }

  safeError('[Vision-OCR] Todas las URLs de Ollama fallaron');
  return null;
}

/**
 *
 * @param imageBase64
 * @param tipoDocumento
 * @param mimeType
 */
export async function extraerTextoImagen(
  imageBase64: string,
  tipoDocumento: string,
  mimeType = 'image/jpeg',
): Promise<OcrResult | null> {
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

  return callVisionModel(prompt, imageBase64, mimeType);
}

/**
 *
 * @param imageBase64
 * @param mimeType
 */
export async function extraerLaboratorio(
  imageBase64: string,
  mimeType = 'image/jpeg',
): Promise<OcrResult | null> {
  const prompt = `Analizá esta imagen de un examen de laboratorio clínico.
Extraé TODOS los datos estructurados en formato JSON.

CAMPOS A EXTRAER:
1. "tipo_examen": tipo de examen (ej: hemograma, perfil bioquímico, perfil lipídico, examen de orina, etc.)
2. "fecha_examen": fecha del examen en formato ISO (YYYY-MM-DD) si está visible
3. "laboratorio": nombre del laboratorio que realizó el examen
4. "medico_solicitante": nombre del médico que solicitó el examen (si aparece)
5. "valores": array de objetos con:
   - "nombre": nombre del parámetro (ej: Hemoglobina, Glucosa, Colesterol)
   - "valor": valor numérico o texto del resultado
   - "unidad": unidad de medida (ej: g/dL, mg/dL)
   - "rango_referencia": rango de referencia (ej: 12-16, <100)
   - "flag": si tiene marca de alto/bajo (opcional, ej: "alta", "baja", "normal")
6. "diagnostico_presuntivo": cualquier diagnóstico mencionado (opcional)
7. "texto_extraido": el texto completo visible en la imagen

REGLAS:
- Respondé SOLO con JSON válido, sin markdown, sin explicaciones.
- Si un campo no está visible, omitilo del JSON.
- Sé preciso con unidades y rangos de referencia.
- Estimá la confianza general de 0 a 100 basada en la nitidez de la imagen.
- No inventes valores.

Formato:
{
  "texto_extraido": "...",
  "tipo_examen": "...",
  "fecha_examen": "YYYY-MM-DD",
  "laboratorio": "...",
  "medico_solicitante": "...",
  "valores": [
    { "nombre": "...", "valor": "...", "unidad": "...", "rango_referencia": "...", "flag": "alta|baja|normal" }
  ],
  "diagnostico_presuntivo": "...",
  "confianza": 0-100
}`;

  return callVisionModel(prompt, imageBase64, mimeType);
}

/**
 *
 * @param imageBase64
 * @param mimeType
 */
export async function extraerReceta(
  imageBase64: string,
  mimeType = 'image/jpeg',
): Promise<OcrResult | null> {
  const prompt = `Analizá esta imagen de una receta médica.
Extraé los datos estructurados en formato JSON.

CAMPOS A EXTRAER:
1. "medicamento": nombre del medicamento recetado
2. "dosis": dosis indicada (ej: 500mg, 10mg)
3. "frecuencia": cada cuánto tomarlo (ej: cada 8 horas, 1 vez al día)
4. "duracion": duración del tratamiento (ej: 7 días, 30 días)
5. "via_administracion": vía (oral, tópica, intravenosa, etc.)
6. "fecha_receta": fecha de la receta en formato ISO
7. "medico": nombre del médico prescriptor
8. "indicaciones_adicionales": cualquier instrucción extra (ej: tomar con alimentos)
9. "texto_extraido": el texto completo visible

REGLAS:
- Respondé SOLO con JSON válido, sin markdown.
- Estimá la confianza de 0 a 100.
- No inventes datos.

Formato:
{
  "texto_extraido": "...",
  "medicamento": "...",
  "dosis": "...",
  "frecuencia": "...",
  "duracion": "...",
  "via_administracion": "...",
  "fecha_receta": "YYYY-MM-DD",
  "medico": "...",
  "indicaciones_adicionales": "...",
  "confianza": 0-100
}`;

  return callVisionModel(prompt, imageBase64, mimeType);
}
