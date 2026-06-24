import { NextRequest } from 'next/server';
import { getConversacionById } from '@/lib/data-store';
import { db } from '@/lib/db';
import { conversaciones } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { apiHandler, success, notFound, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, updateConversacionSchema } from '@/lib/validations';
import { z } from 'zod';

const conversacionUpdateSchema = updateConversacionSchema
  .extend({
    optOut: z.boolean().optional(),
    ultimoMensaje: z.string().optional(),
    ultimoMensajeRol: z.string().optional(),
    ultimaIntencion: z.string().optional(),
    ultimaInteraccion: z.string().optional(),
    medicoId: z.string().uuid().optional().nullable(),
    proximoRecordatorio: z.string().optional().nullable(),
  })
  .passthrough();

function extractId(request: NextRequest): string {
  const parts = request.nextUrl.pathname.split('/').filter(Boolean);
  return parts.pop()!;
}

async function verifyConversacionAccess(
  conversacionId: string,
  medicoId: string | undefined,
  rol: string | undefined,
) {
  if (rol === 'admin') return;
  if (!medicoId) fail('No autorizado', 403);

  const [conv] = await db
    .select({ medicoId: conversaciones.medicoId })
    .from(conversaciones)
    .where(eq(conversaciones.id, conversacionId))
    .limit(1);

  if (!conv) fail('Conversación no encontrada', 404);
  if (conv.medicoId && conv.medicoId !== medicoId) {
    fail('No autorizado', 403);
  }
}

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const id = extractId(request);

  if (!id) fail('ID de conversación es obligatorio', 400);

  const sessionMedicoId = session.user?.medicoId;
  const sessionRol = session.user?.role;
  await verifyConversacionAccess(id, sessionMedicoId, sessionRol);

  const conversacion = await getConversacionById(id);
  if (!conversacion) notFound('Conversación no encontrada');

  return success(conversacion);
});

export const PATCH = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const id = extractId(request);

  const sessionMedicoId = session.user?.medicoId;
  const sessionRol = session.user?.role;
  await verifyConversacionAccess(id, sessionMedicoId, sessionRol);

  const body = await parseBody(request, conversacionUpdateSchema);

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (body.estado !== undefined) updateData.estado = body.estado;
  if (body.notas !== undefined) updateData.notas = body.notas;
  if (body.optOut !== undefined) {
    updateData.optOut = body.optOut;
    if (body.optOut) updateData.optOutAt = new Date();
  }
  if (body.ultimoMensaje !== undefined) updateData.ultimoMensaje = body.ultimoMensaje;
  if (body.ultimoMensajeRol !== undefined) updateData.ultimoMensajeRol = body.ultimoMensajeRol;
  if (body.ultimaIntencion !== undefined) updateData.ultimaIntencion = body.ultimaIntencion;
  if (body.ultimaInteraccion !== undefined)
    updateData.ultimaInteraccion = new Date(body.ultimaInteraccion);
  if (body.medicoId !== undefined) updateData.medicoId = body.medicoId;
  if (body.proximoRecordatorio !== undefined)
    updateData.proximoRecordatorio = body.proximoRecordatorio
      ? new Date(body.proximoRecordatorio)
      : null;

  const [actualizada] = await db
    .update(conversaciones)
    .set(updateData)
    .where(eq(conversaciones.id, id))
    .returning();

  if (!actualizada) notFound('Conversacion no encontrada');

  return success(actualizada);
});
