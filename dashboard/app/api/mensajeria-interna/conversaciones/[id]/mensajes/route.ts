import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, success } from '@/lib/api-handler';
import { listarMensajes, enviarMensaje } from '@/lib/services/mensajeria-interna';

/**
 * GET /api/mensajeria-interna/conversaciones/[id]/mensajes - Lista mensajes de la conversación
 *   (marca como leídos los recibidos mientras los lista).
 * POST /api/mensajeria-interna/conversaciones/[id]/mensajes - Envía un mensaje.
 */
export const GET = apiHandler(
  async (_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    const session = await requireAuth();
    const mensajes = await listarMensajes(id, session.user.id);
    return success(mensajes);
  },
);

export const POST = apiHandler(
  async (req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    const session = await requireAuth();
    const body = (await req.json().catch(() => null)) as {
      contenido?: string;
      urgente?: boolean;
    } | null;

    if (!body?.contenido) {
      return success({ error: 'El mensaje no puede estar vacío' });
    }

    const tenantId = session.user.tenantId ?? '00000000-0000-0000-0000-000000000000';
    const mensaje = await enviarMensaje(id, session.user.id, tenantId, {
      contenido: body.contenido,
      urgente: Boolean(body.urgente),
    });
    return success(mensaje);
  },
);