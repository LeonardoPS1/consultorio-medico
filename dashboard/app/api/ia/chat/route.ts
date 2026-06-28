/**
 * POST /api/ia/chat — Chat con el asistente IA flotante.
 *
 * Recibe un mensaje del usuario y el contexto de la página,
 * consulta datos reales de la DB (turnos, pacientes, recetas)
 * y los inyecta en el prompt para que la IA no invente respuestas.
 */

import { NextRequest } from 'next/server';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
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

const chatSchema = z.object({
  /** Mensaje del usuario */
  mensaje: z.string().min(1).max(2000),
  /** Ruta actual del dashboard (para contexto dinámico) */
  ruta: z.string().min(1),
  /** Datos contextuales de la página actual (desde el cliente) */
  datosContexto: z.record(z.unknown()).optional(),
  /** Historial de chat (últimos mensajes, client-side) */
  historial: z
    .array(
      z.object({
        rol: z.enum(['user', 'assistant']),
        contenido: z.string(),
      }),
    )
    .max(20)
    .optional(),
  /** ID de conversación activa (si está en /conversaciones) */
  conversacionId: z.string().uuid().optional(),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const usuarioId = session.user.id as string;

  const body = await parseBody(request, chatSchema);

  // ─── Cargar config del tenant ─────────────────────────────
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

  // Verificar si el asistente está habilitado
  if (configIa?.asistenteHabilitado === false) {
    fail('El asistente IA está deshabilitado', 403);
  }

  // ─── Construir system prompt CON DATOS REALES DE LA DB ──
  const contexto = {
    ruta: body.ruta,
    datos: body.datosContexto,
  };
  const systemPrompt = buildSystemPrompt(contexto, configIa);

  // Consultar datos reales del consultorio para que la IA no invente
  const datosDB = await buildContextoDB(usuarioId, body.ruta);

  // Combinar: el system prompt de contexto + los datos reales
  const fullSystemPrompt = datosDB
    ? `${systemPrompt}\n\n📋 DATOS ACTUALES DEL CONSULTORIO (usá estos datos reales, no inventes):\n${datosDB}`
    : systemPrompt;

  // ─── Construir messages para Ollama ───────────────────────
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: fullSystemPrompt },
  ];

  // Agregar historial del chat
  if (body.historial && body.historial.length > 0) {
    for (const msg of body.historial) {
      messages.push({
        role: msg.rol === 'user' ? 'user' : 'assistant',
        content: msg.contenido,
      });
    }
  }

  // Mensaje actual
  messages.push({ role: 'user', content: body.mensaje });

  // ─── Llamar a Ollama ──────────────────────────────────────
  const result = await ollamaChat({
    messages,
    temperature: configIa?.temperaturaAsistente ?? 0.3,
    maxTokens: configIa?.maxTokensAsistente ?? 400,
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
