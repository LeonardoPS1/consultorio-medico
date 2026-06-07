/**
 * Servicio de Médicos con cache TTL.
 *
 * Los médicos cambian muy raramente (1-2x/semana) pero se leen constantemente
 * (modal de turnos, fichas de pacientes, config, sidebar). El cache reduce
 * las lecturas a DB de ~100/día a ~1 cada 60 segundos.
 *
 * Al crear/editar/eliminar un médico, llamar a medicosService.invalidate().
 */

import { db } from '@/lib/db';
import { medicos } from '@/drizzle/schema';
import { eq, and, sql, count } from 'drizzle-orm';
import { cache } from '@/lib/cache';

const CACHE_PREFIX = 'medicos';
const CACHE_TTL = 60_000; // 60s — balance entre frescura y reducción de lecturas

export type MedicoRow = typeof medicos.$inferSelect;

export const medicosService = {
  /**
   * Lista médicos activos con cache.
   */
  async list(sucursalId?: string): Promise<{ data: MedicoRow[]; total: number }> {
    const cacheKey = `${CACHE_PREFIX}:list:${sucursalId ?? 'todas'}`;

    return cache.getOrSet(cacheKey, async () => {
      const whereConditions = and(
        sql`${medicos.deletedAt} IS NULL`,
        sucursalId ? eq(medicos.sucursalId, sucursalId) : undefined,
      );

      const lista = await db
        .select()
        .from(medicos)
        .where(whereConditions)
        .orderBy(medicos.nombre);

      const [{ total }] = await db
        .select({ total: count() })
        .from(medicos)
        .where(whereConditions);

      return { data: lista, total: Number(total) };
    }, CACHE_TTL);
  },

  /**
   * Obtiene un médico por ID (sin cache, es individual).
   */
  async getById(id: string): Promise<MedicoRow | null> {
    const [medico] = await db
      .select()
      .from(medicos)
      .where(and(eq(medicos.id, id), sql`${medicos.deletedAt} IS NULL`))
      .limit(1);

    return medico ?? null;
  },

  /**
   * Invalida el cache de médicos.
   * Llamar después de crear/editar/eliminar un médico.
   */
  invalidate(): void {
    cache.invalidate(CACHE_PREFIX);
  },
};
