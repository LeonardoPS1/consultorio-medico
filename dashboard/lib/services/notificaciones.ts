import { db } from '@/lib/db';
import { notificaciones } from '@/drizzle/schema';
import { eq, and, sql, count, desc } from 'drizzle-orm';
import { notFound } from '@/lib/api-handler';

export interface CreateNotificacionInput {
  usuarioId: string;
  titulo: string;
  descripcion?: string;
  tipo?: 'turno' | 'mensaje' | 'receta' | 'urgencia' | 'sistema';
  href?: string;
  metadata?: Record<string, unknown>;
  tenantId?: string;
}

export interface ListNotificacionesOptions {
  limit?: number;
  offset?: number;
  tipo?: string;
  soloNoLeidas?: boolean;
  includeDeleted?: boolean;
}

export const notificacionesService = {
  /**
   * Listar notificaciones de un usuario con paginación y filtros
   */
  async list(usuarioId: string, options: ListNotificacionesOptions = {}) {
    const {
      limit = 50,
      offset = 0,
      tipo,
      soloNoLeidas = false,
      includeDeleted = false,
    } = options;

    const whereConditions = and(
      eq(notificaciones.usuarioId, usuarioId),
      includeDeleted ? undefined : sql`${notificaciones.deletedAt} IS NULL`,
      tipo ? eq(notificaciones.tipo, tipo) : undefined,
      soloNoLeidas ? eq(notificaciones.leido, false) : undefined,
    );

    const [{ total }] = await db
      .select({ total: count() })
      .from(notificaciones)
      .where(whereConditions);

    const rows = await db
      .select()
      .from(notificaciones)
      .where(whereConditions)
      .orderBy(desc(notificaciones.createdAt))
      .limit(limit)
      .offset(offset);

    const noLeidasCount = await this.getNoLeidasCount(usuarioId);

    return {
      data: rows.map(n => ({
        id: n.id,
        usuarioId: n.usuarioId,
        titulo: n.titulo,
        descripcion: n.descripcion,
        tipo: n.tipo,
        leido: n.leido,
        href: n.href,
        metadata: n.metadata,
        createdAt: n.createdAt?.toISOString?.() || n.createdAt,
        updatedAt: n.updatedAt?.toISOString?.() || n.updatedAt,
        deletedAt: n.deletedAt?.toISOString?.() || null,
      })),
      total: Number(total),
      noLeidas: Number(noLeidasCount),
      limit,
      offset,
    };
  },

  /**
   * Crear una nueva notificación y enviar push si está configurado
   */
  async create(input: CreateNotificacionInput) {
    const [nueva] = await db
      .insert(notificaciones)
      .values({
        usuarioId: input.usuarioId,
        titulo: input.titulo,
        descripcion: input.descripcion || null,
        tipo: input.tipo || 'sistema',
        href: input.href || null,
        metadata: input.metadata ?? {},
        tenantId: input.tenantId ?? undefined,
      })
      .returning();

    // Enviar push notification (fire-and-forget)
      try {
        const { pushService } = await import('@/lib/services/push');
        if (pushService.isConfigured()) {
          pushService.sendToUser({ usuarioId: input.usuarioId }, {
            title: input.titulo,
            body: input.descripcion || input.titulo,
            url: input.href || '/',
            id: nueva.id,
            tipo: input.tipo || 'sistema',
          }).catch(() => {});
        }
      } catch {
        // No bloquear si push falla
      }

    return nueva;
  },

  /**
   * Obtener una notificación por ID (verificando que pertenezca al usuario)
   */
  async getById(id: string, usuarioId: string) {
    const [notif] = await db
      .select()
      .from(notificaciones)
      .where(and(
        eq(notificaciones.id, id),
        eq(notificaciones.usuarioId, usuarioId),
        sql`${notificaciones.deletedAt} IS NULL`,
      ))
      .limit(1);

    if (!notif) notFound('Notificación no encontrada');
    return notif;
  },

  /**
   * Marcar una notificación como leída
   */
  async marcarLeida(id: string, usuarioId: string) {
    await this.getById(id, usuarioId); // verifica existencia + ownership
    await db
      .update(notificaciones)
      .set({ leido: true })
      .where(and(eq(notificaciones.id, id), eq(notificaciones.usuarioId, usuarioId)));
    return { success: true };
  },

  /**
   * Marcar una notificación como no leída
   */
  async marcarNoLeida(id: string, usuarioId: string) {
    await this.getById(id, usuarioId);
    await db
      .update(notificaciones)
      .set({ leido: false })
      .where(and(eq(notificaciones.id, id), eq(notificaciones.usuarioId, usuarioId)));
    return { success: true };
  },

  /**
   * Marcar todas las notificaciones como leídas
   */
  async marcarTodasLeidas(usuarioId: string) {
    await db
      .update(notificaciones)
      .set({ leido: true })
      .where(and(
        eq(notificaciones.usuarioId, usuarioId),
        eq(notificaciones.leido, false),
        sql`${notificaciones.deletedAt} IS NULL`,
      ));
    return { success: true };
  },

  /**
   * Eliminar (soft delete) una notificación
   */
  async eliminar(id: string, usuarioId: string) {
    await this.getById(id, usuarioId);
    await db
      .update(notificaciones)
      .set({ deletedAt: new Date() })
      .where(and(eq(notificaciones.id, id), eq(notificaciones.usuarioId, usuarioId)));
    return { success: true };
  },

  /**
   * Obtener cantidad de notificaciones no leídas
   */
  async getNoLeidasCount(usuarioId: string) {
    const [result] = await db
      .select({ total: count() })
      .from(notificaciones)
      .where(and(
        eq(notificaciones.usuarioId, usuarioId),
        eq(notificaciones.leido, false),
        sql`${notificaciones.deletedAt} IS NULL`,
      ));
    return Number(result.total);
  },
};
