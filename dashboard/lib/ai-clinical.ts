// ============================================================
// IA Clínica: utilidades de inferencia sobre datos clínicos
//
// T1: sugerirCie10 — sugiere códigos CIE-10 candidatos a partir
//     del assessment (diagnóstico) de una nota SOAP.
// T2: generarResumenLongitudinal — resumen de 4-5 líneas del
//     historial del paciente.
//
// IMPORTANTE: estas salidas son SUGERENCIAS de IA. El diagnóstico
// y código final siempre los confirma el médico. Nunca se guarda
// automáticamente sin aprobación explícita.
// ============================================================

import { CIE10_DATA } from '@/lib/cie10-data';
import { safeError, safeWarn } from '@/lib/logger';
import { ollamaChat } from '@/lib/ollama';

export interface Cie10Sugerencia {
  codigo: string;
  descripcion: string;
}

export interface NotaSoapResumen {
  fecha?: string | Date | null;
  assessment?: string | null;
  cie10Codigo?: string | null;
}

export interface DatosResumenLongitudinal {
  notas: NotaSoapResumen[];
  alergias?: string | null;
  medicacionCronica?: string | null;
  recetasVigentes?: string[];
}

const MODELO = process.env.OLLAMA_MODEL || 'gemma3';

/**
 * Extrae de forma robusta el primer array JSON de una respuesta del modelo.
 * Fallback: busca el primer `[...]` en el texto.
 * @param content
 */
function extraerArrayJson(content: string): unknown[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray((parsed as { sugerencias?: unknown[] })?.sugerencias)) {
      return (parsed as { sugerencias: unknown[] }).sugerencias;
    }
    if (Array.isArray((parsed as { codigos?: unknown[] })?.codigos)) {
      return (parsed as { codigos: unknown[] }).codigos;
    }
    return [];
  } catch {
    const m = content.match(/\[[\s\S]*\]/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}

/**
 * Valida y normaliza una sugerencia contra el dataset CIE-10 local.
 * Si el código existe en CIE10_DATA, usa la descripción canónica.
 * @param raw
 */
function normalizarSugerencia(raw: unknown): Cie10Sugerencia | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const codigo = typeof o.codigo === 'string' ? o.codigo.trim().toUpperCase() : '';
  if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(codigo) && !/^[A-Z]\d{2}$/.test(codigo)) return null;

  const canonico = CIE10_DATA.find((e) => e.codigo.toUpperCase() === codigo);
  const descripcion =
    (typeof o.descripcion === 'string' ? o.descripcion.trim() : '') ||
    canonico?.descripcion ||
    '';
  return { codigo: canonico?.codigo ?? codigo, descripcion };
}

/**
 * T1 — Sugiere 1-3 códigos CIE-10 candidatos a partir del diagnóstico
 * (sección assessment) de una nota SOAP.
 *
 * Fail-open: si Ollama falla o la respuesta no es parseable, devuelve [].
 * @param assessment Texto del diagnóstico (sección A de la nota SOAP)
 * @param contexto
 * @param contexto.motivo
 * @param contexto.subjetivo
 * @returns Sugerencias validadas contra CIE10_DATA (vacío si falla)
 */
export async function sugerirCie10(
  assessment: string,
  contexto?: { motivo?: string; subjetivo?: string },
): Promise<Cie10Sugerencia[]> {
  const diagnostico = (assessment ?? '').trim();
  if (!diagnostico) return [];

  const contextoExtra = contexto?.motivo
    ? `\nMotivo de consulta: ${contexto.motivo}`
    : contexto?.subjetivo
      ? `\nSubjetivo: ${contexto.subjetivo}`
      : '';

  const system = `Eres un codificador clínico chileno. Dado un diagnóstico (assessment de una nota SOAP), sugiere de 1 a 3 códigos CIE-10 candidatos ordenados por probabilidad.

Reglas:
- Usa solo códigos CIE-10 válidos (formato LETRA + 2 dígitos, opcional .decimal).
- La descripción debe ser breve y en español neutro.
- Si el diagnóstico no es clínico o es ambiguo, devuelve un array vacío.
- Responde SOLO con JSON: [{"codigo":"E11.9","descripcion":"Diabetes mellitus no insulinodependiente sin complicaciones"}]
- Esto es una SUGERENCIA de apoyo. El médico toma la decisión final.`;

  const user = `Diagnóstico: ${diagnostico}${contextoExtra}`;

  try {
    const res = await ollamaChat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      maxTokens: 300,
      keepAlive: '-1m',
    });
    if (!res.success) {
      safeWarn(`[IA-Clinica] sugerirCie10 falló: ${res.error}`);
      return [];
    }
    const items = extraerArrayJson(res.content);
    const sugerencias = items.map(normalizarSugerencia).filter((s): s is Cie10Sugerencia => s !== null);
    return sugerencias.slice(0, 3);
  } catch (err) {
    safeError(`[IA-Clinica] error en sugerirCie10`, err instanceof Error ? err : new Error(String(err)));
    return [];
  }
}

/**
 * T2 — Genera un resumen longitudinal de 4-5 líneas del paciente.
 *
 * Fuentes: últimas 5 notas SOAP, alergias, medicación crónica y
 * recetas vigentes. Fail-open: devuelve string vacío si falla.
 * @param datos
 * @returns Texto del resumen (o '' si falla)
 */
export async function generarResumenLongitudinal(
  datos: DatosResumenLongitudinal,
): Promise<string> {
  const notas = (datos.notas ?? []).slice(0, 5);
  if (notas.length === 0) return '';

  const bloquesNotas = notas
    .map((n, i) => {
      const fecha = n.fecha instanceof Date ? n.fecha.toISOString().slice(0, 10) : n.fecha ? String(n.fecha) : `Consulta ${i + 1}`;
      return `- [${fecha}] Diagnóstico: ${n.assessment || n.cie10Codigo || 'sin registro'}`;
    })
    .join('\n');

  const seccionAlergias = datos.alergias?.trim() ? `Alergias: ${datos.alergias.trim()}` : 'Alergias: sin registro.';
  const seccionMed = datos.medicacionCronica?.trim() ? `Medicación crónica: ${datos.medicacionCronica.trim()}` : 'Medicación crónica: sin registro.';
  const seccionRecetas =
    datos.recetasVigentes && datos.recetasVigentes.length > 0
      ? `Recetas vigentes: ${datos.recetasVigentes.join(', ')}`
      : 'Recetas vigentes: ninguna.';

  const system = `Eres un resumidor clínico chileno. Genera un resumen longitudinal del paciente en 4-5 líneas máximo.

Reglas:
- Resumen ejecutivo en prosa, español neutro, sin encabezados ni viñetas.
- Menciona diagnósticos recurrentes, evolución relevante, alergias y medicación vigente.
- NO agregues información que no esté en los datos.
- NO inventes fechas, diagnósticos ni tratamientos.`;

  const user = `Datos del paciente:
${bloquesNotas}

${seccionAlergias}
${seccionMed}
${seccionRecetas}

Genera el resumen longitudinal (máx. 5 líneas):`;

  try {
    const res = await ollamaChat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      maxTokens: 500,
      keepAlive: '-1m',
    });
    if (!res.success) {
      safeWarn(`[IA-Clinica] generarResumenLongitudinal falló: ${res.error}`);
      return '';
    }
    return res.content.trim();
  } catch (err) {
    safeError(
      `[IA-Clinica] error en generarResumenLongitudinal`,
      err instanceof Error ? err : new Error(String(err)),
    );
    return '';
  }
}

/** Nombre del modelo usado (para UI/tooltip). */
export function modeloIaClinica(): string {
  return MODELO;
}