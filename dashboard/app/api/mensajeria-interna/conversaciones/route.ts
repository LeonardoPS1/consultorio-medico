import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, created, success } from '@/lib/api-handler';
import { listarConversaciones, crearConversacion } from '@/lib/services/mensajeria-interna';

/**
 * GET /api/mensajeria-interna/conversaciones - Lista conversaciones del usuario autenticado.
 * POST /api/mensajeria-interna/conversaciones - Crea (o reutiliza) una conversación 1:1.
 */
export const GET = apiHandler(async () => {
  const session = await requireAuth();
  const conversaciones = await listarConversaciones(session.user.id);
  return success(conversaciones);
});

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await requireAuth();
  const body = (await req.json().catch(() => null)) as {
    participanteId?: string;
    contextoPacienteId?: string;
    contextoTurnoId?: string;
  } | null;

  if (!body?.participanteId) {
    return success({ error: 'Falta el participante de la conversación' });
  }

  const tenantId = session.user.tenantId ?? '00000000-0000-0000-0000-000000000000';
  const conversacion = await crearConversacion(session.user.id, tenantId, {
    participanteId: body.participanteId,
    contextoPacienteId: body.contextoPacienteId,
    contextoTurnoId: body.contextoTurnoId,
  });
  return created(conversacion);
});