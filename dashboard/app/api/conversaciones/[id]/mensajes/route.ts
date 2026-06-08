import { NextRequest } from 'next/server';
import {
  getMensajesByConversacion,
  createMensaje,
  getConversacionById,
} from '@/lib/data-store';
import { auth } from '@/lib/auth';
import { apiHandler, success, created, notFound, fail } from '@/lib/api-handler';
import { parseBody, createMensajeSchema } from '@/lib/validations';
import { z } from 'zod';

const mensajeCreateSchema = createMensajeSchema.extend({
  rol: z.enum(['paciente', 'asistente_ia', 'medico', 'secretaria', 'sistema']),
  contenidoProcesado: z.string().optional(),
  intencion: z.string().optional(),
  confianzaIntencion: z.number().optional(),
  twilioSid: z.string().optional(),
  twilioStatus: z.string().optional(),
  n8nExecutionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
}).passthrough();

function extractConversacionId(request: NextRequest): string {
  const parts = request.nextUrl.pathname.split('/').filter(Boolean);
  return parts[2];
}

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  const sessionMedicoId = (session?.user as any)?.medicoId;
  const sessionRol = (session?.user as any)?.role;

  const id = extractConversacionId(request);
  if (!id) fail('ID de conversación es obligatorio', 400);

  const conversacion = await getConversacionById(id);
  if (!conversacion) notFound('Conversación no encontrada');

  if (sessionRol !== 'admin' && sessionMedicoId && conversacion!.medicoId !== sessionMedicoId) {
    fail('No autorizado', 403);
  }

  const mensajes = await getMensajesByConversacion(id);

  return success({ mensajes, total: mensajes.length, conversacionId: id });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  const sessionMedicoId = (session?.user as any)?.medicoId;
  const sessionRol = (session?.user as any)?.role;

  const id = extractConversacionId(request);
  if (!id) fail('ID de conversación es obligatorio', 400);

  const conversacion = await getConversacionById(id);
  if (!conversacion) notFound('Conversación no encontrada');

  if (sessionRol !== 'admin' && sessionMedicoId && conversacion!.medicoId !== sessionMedicoId) {
    fail('No autorizado', 403);
  }

  const body = await parseBody(request, mensajeCreateSchema) as any;

  const mensaje = await createMensaje({
    conversacionId: id,
    rol: body.rol,
    contenido: body.contenido,
    contenidoProcesado: body.contenidoProcesado,
    tipo: body.tipo || 'texto',
    intencion: body.intencion,
    confianzaIntencion: body.confianzaIntencion,
    twilioSid: body.twilioSid,
    twilioStatus: body.twilioStatus,
    n8nExecutionId: body.n8nExecutionId,
    metadata: body.metadata || {},
  });

  return created(mensaje);
});
