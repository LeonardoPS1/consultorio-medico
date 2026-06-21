/**
 * Servicio de notificaciones para pacientes del portal.
 * Usa la tabla `notificaciones` con pacienteId.
 */

import { db } from '@/lib/db';
import { notificaciones } from '@/drizzle/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';

export interface PortalNotificacion {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  leido: boolean;
  href: string | null;
  createdAt: Date;
}

const SELECT_COLS = {
  id: notificaciones.id,
  titulo: notificaciones.titulo,
  descripcion: notificaciones.descripcion,
  tipo: notificaciones.tipo,
  leido: notificaciones.leido,
  href: notificaciones.href,
  createdAt: notificaciones.createdAt,
} as const;

/**
 * Crea una notificación para un paciente del portal.
 */
export async function crearNotificacion(
  pacienteId: string,
  data: {
    titulo: string;
    descripcion?: string;
    tipo?: 'turno' | 'mensaje' | 'receta' | 'sistema';
    href?: string;
  },
): Promise<PortalNotificacion> {
  const [n] = await db
    .insert(notificaciones)
    .values({
      usuarioId: '00000000-0000-0000-0000-000000000000', // placeholder
      pacienteId,
      titulo: data.titulo,
      descripcion: data.descripcion || null,
      tipo: data.tipo || 'sistema',
      href: data.href || null,
    })
    .returning(SELECT_COLS);

  return n;
}

/**
 * Lista notificaciones del paciente, ordenadas por fecha descendente.
 */
export async function listarNotificaciones(
  pacienteId: string,
  limit = 50,
): Promise<PortalNotificacion[]> {
  return db
    .select(SELECT_COLS)
    .from(notificaciones)
    .where(
      and(
        eq(notificaciones.pacienteId, pacienteId),
        isNull(notificaciones.deletedAt),
      ),
    )
    .orderBy(desc(notificaciones.createdAt))
    .limit(limit);
}

/**
 * Cuenta notificaciones no leídas del paciente.
 */
export async function noLeidasCount(pacienteId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificaciones)
    .where(
      and(
        eq(notificaciones.pacienteId, pacienteId),
        eq(notificaciones.leido, false),
        isNull(notificaciones.deletedAt),
      ),
    );
  return Number(row?.count ?? 0);
}

/**
 * Marca una notificación como leída.
 */
export async function marcarLeida(
  id: string,
  pacienteId: string,
): Promise<void> {
  await db
    .update(notificaciones)
    .set({ leido: true })
    .where(
      and(
        eq(notificaciones.id, id),
        eq(notificaciones.pacienteId, pacienteId),
      ),
    );
}

/**
 * Marca todas las notificaciones del paciente como leídas.
 */
export async function marcarTodasLeidas(pacienteId: string): Promise<void> {
  await db
    .update(notificaciones)
    .set({ leido: true })
    .where(
      and(
        eq(notificaciones.pacienteId, pacienteId),
        eq(notificaciones.leido, false),
        isNull(notificaciones.deletedAt),
      ),
    );
}
