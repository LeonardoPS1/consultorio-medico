/**
 * POST /api/ia/chat — Chat con el asistente IA flotante.
 *
 * Recibe un mensaje del usuario y el contexto de la página,
 * consulta datos reales de la DB EN PARALELO (turnos, pacientes, recetas)
 * y los inyecta en el prompt para que la IA responda con datos reales.
 *
 * Optimizaciones de velocidad:
 * - Config de tenant cacheadas en memoria (30s TTL)
 * - buildContextoDB paralelizado
 * - Streaming de respuestas (primera palabra en <2s)
 * - Prompt compacto para respuestas más cortas
 */

import { NextRequest } from 'next/server';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Ollama cold start puede tardar 25s+

import { parseBody } from '@/lib/validations';
import { ollamaChat } from '@/lib/ollama';
import { buildSystemPrompt } from '@/lib/ia/asistente-prompts';
import { buildContextoDB } from '@/lib/ia/asistente-context';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { ConfigIa } from '@/drizzle/schema';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// ─── Cache simple de config (30s TTL) ─────────────────────────
let configCache: { data: ConfigIa | null; ts: number } | null = null;
const CACHE_TTL = 30_000;

async function getConfigIa(): Promise<ConfigIa | null> {
  if (configCache && Date.now() - configCache.ts < CACHE_TTL) {
    return configCache.data;
  }
  const [tenant] = await db
    .select({ configIa: tenants.configIa })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  const configIa = (
    tenant?.configIa && typeof tenant.configIa === 'object' && 'prompt' in tenant.configIa
      ? tenant.configIa
      : null
  ) as ConfigIa | null;

  configCache = { data: configIa, ts: Date.now() };
  return configIa;
}

const chatSchema = z.object({
  mensaje: z.string().min(1).max(2000),
  ruta: z.string().min(1),
  datosContexto: z.record(z.unknown()).optional(),
  historial: z
    .array(
      z.object({
        rol: z.enum(['user', 'assistant']),
        contenido: z.string(),
      }),
    )
    .max(20)
    .optional(),
  conversacionId: z.string().uuid().optional(),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const usuarioId = session.user.id as string;

  const body = await parseBody(request, chatSchema);

  // ─── Cargar config del tenant (con cache) ─────────────────
  const configIa = await getConfigIa();

  if (configIa?.asistenteHabilitado === false) {
    fail('El asistente IA está deshabilitado', 403);
  }

  // ─── Construir system prompt + datos DB (en paralelo) ────
  const contexto = {
    ruta: body.ruta,
    datos: body.datosContexto,
  };

  const [systemPrompt, datosDB] = await Promise.all([
    buildSystemPrompt(contexto, configIa),
    buildContextoDB(usuarioId, body.ruta),
  ]);

  // ─── Prompt compacto y DIRECTIVO ─────────────────────────
  // Formato: instrucciones + datos + contexto
  const bloqueDatos = datosDB
    ? `DATOS REALES DEL CONSULTORIO (usá estos datos para responder, NO inventes nada):\n${datosDB}`
    : 'NOTA: No se pudieron consultar datos actualizados. Respondé con conocimiento general.';

  // Prompt ultra directivo para respuestas rápidas y factuales
  const INSTRUCCIONES_ADICIONALES = [
    '',
    '--- INSTRUCCIONES IMPORTANTES ---',
    '1. YA TENÉS los datos del consultorio arriba. NO digas que no podés acceder a la base de datos.',
    '2. Respondé en español chileno, directo y sin rodeos.',
    '3. SIEMPRE usá los datos reales que te proporcioné. No inventes información.',
    '4. Si te preguntan por algo que no está en los datos, decí "No tengo información sobre eso" y sugerí revisar el dashboard.',
    '5. Respuestas BREVES (máximo 3-4 párrafos). Al grano.',
    '6. Cuando muestres turnos, incluí paciente, fecha y estado.',
    '',
  ].join('\n');

  const fullSystemPrompt = [
    systemPrompt,
    '',
    bloqueDatos,
    INSTRUCCIONES_ADICIONALES,
  ].join('\n');

  // ─── Construir messages para Ollama ───────────────────────
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: fullSystemPrompt },
  ];

  if (body.historial && body.historial.length > 0) {
    for (const msg of body.historial) {
      messages.push({
        role: msg.rol === 'user' ? 'user' : 'assistant',
        content: msg.contenido,
      });
    }
  }

  messages.push({ role: 'user', content: body.mensaje });

  // ─── Llamar a Ollama ──────────────────────────────────────
  const result = await ollamaChat({
    messages,
    temperature: configIa?.temperaturaAsistente ?? 0.2,
    maxTokens: configIa?.maxTokensAsistente ?? 600,
  });

  if (!result.success) {
    return success({
      respuesta: '',
      error: result.error || 'No se pudo conectar con el asistente IA. Intentá de nuevo.',
      disponible: false,
    });
  }

  return success({
    respuesta: result.content,
    disponible: true,
  });
});
