import { NextRequest } from 'next/server';
import { notificacionesService } from '@/lib/services/notificaciones';
import { apiHandler, ok, notFound } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, updateNotificacionSchema } from '@/lib/validations';

/**
 * Maneja errores de notificación y lanza 404 si corresponde.
 * @param error - Error capturado (de tipo desconocido).
 * @param mensaje - Mensaje de notificación no encontrada.
 */
function handleError(error: unknown, mensaje: string): never {
  const err = error instanceof Error ? error : new Error(String(error));
  const digest =
    err instanceof Error && 'digest' in err ? (err as { digest: string }).digest : undefined;
  if (err.message?.includes?.('No encontrada') || digest?.includes?.('NOT_FOUND')) {
    notFound(mensaje);
  }
  throw err;
}

/**
 * PATCH /api/notificaciones/[id] - Marca una notificación como leída o no leída.
 * @param request - Objeto de solicitud Next.js.
 * @param params - Parámetros de la ruta (id de la notificación).
 * @returns Respuesta JSON con el resultado de la operación.
 */
// ─── PATCH /api/notificaciones/[id] ─────────────────────────
export const PATCH = apiHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAuth();
    const userId = session.user.id as string;
    const { action } = await parseBody(request, updateNotificacionSchema);

    try {
      if (action === 'read') {
        await notificacionesService.marcarLeida(params.id, userId);
        return ok({ success: true });
      }

      await notificacionesService.marcarNoLeida(params.id, userId);
      return ok({ success: true });
    } catch (error: unknown) {
      handleError(error, 'Notificación no encontrada');
    }
  },
);

/**
 * DELETE /api/notificaciones/[id] - Elimina una notificación.
 * @param request - Objeto de solicitud Next.js.
 * @param params - Parámetros de la ruta (id de la notificación).
 * @returns Respuesta JSON con el resultado de la operación.
 */
// ─── DELETE /api/notificaciones/[id] ────────────────────────
export const DELETE = apiHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAuth();
    const userId = session.user.id as string;

    try {
      await notificacionesService.eliminar(params.id, userId);
      return ok({ success: true });
    } catch (error: unknown) {
      handleError(error, 'Notificación no encontrada');
    }
  },
);
