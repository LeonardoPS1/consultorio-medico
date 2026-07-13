/**
 * Caching layer para Server Components e ISR.
 *
 * Combina React.cache() (dedup intra-render) + unstable_cache (persistente por tags).
 *
 * Uso:
 *   import { revalidate } from '@/lib/data-cache';
 *   import { CACHE_TAGS } from '@/lib/data-cache';
 *
 *   // En server-page-data.ts
 *   const cachedList = unstableCache('turnos:list', turnosService.list, [CACHE_TAGS.TURNOS]);
 *   const data = await cachedList(fecha, estado, ...);
 *
 *   // En mutations (API routes o Server Actions)
 *   revalidate(CACHE_TAGS.TURNOS);
 */

import { cache as reactCache } from 'react';
import { unstable_cache, revalidateTag } from 'next/cache';

// ─── Tags ──────────────────────────────────────────────────

export const CACHE_TAGS = {
  TURNOS: 'turnos',
  PACIENTES: 'pacientes',
  RECETAS: 'recetas',
  MEDICOS: 'medicos',
  WEBHOOKS: 'webhooks',
  ENCUESTAS: 'encuestas',
  WAITLIST: 'waitlist',
  DERIVACIONES: 'derivaciones',
  NOTIFICACIONES: 'notificaciones',
  BLACKLIST: 'blacklist',
  CONSENTIMIENTOS: 'consentimientos',
  CONFIGURACION: 'configuracion',
  REPORTES: 'reportes',
  AUDITORIA: 'auditoria',
  N8N: 'n8n',
  ORGANIZATION: 'organization',
  DASHBOARD_STATS: 'dashboard-stats',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

type Serializable = string | number | boolean | null | undefined;

// ─── unstable_cache wrapper ─────────────────────────────────

/**
 * Wraps una función async con unstable_cache + React.cache().
 *
 * - React.cache(): deduplica llamadas dentro del mismo render (evita queries duplicadas)
 * - unstable_cache(): cachea entre requests con tag-based revalidation
 *
 * @param tag - Tag de revalidación (o array de tags)
 * @param fn - Función async a cachear (args deben ser serializables)
 * @param cacheKeySuffix - Sufijo opcional para la key de cache
 */
export function unstableCache<T, Args extends Serializable[]>(
  tag: CacheTag | CacheTag[],
  fn: (...args: Args) => Promise<T>,
  cacheKeySuffix?: string,
): (...args: Args) => Promise<T> {
  const tags = Array.isArray(tag) ? tag : [tag];
  const cacheId = `cache:${tags[0]}${cacheKeySuffix ? ':' + cacheKeySuffix : ''}`;

  // React.cache() deduplica en el mismo render
  return reactCache(async (...args: Args): Promise<T> => {
    // unstable_cache persiste entre requests
    const cachedFn = unstable_cache(
      async (...innerArgs: Args) => fn(...innerArgs),
      [cacheId],
      { tags },
    );
    return cachedFn(...args);
  }) as (...args: Args) => Promise<T>;
}

// ─── Revalidation ──────────────────────────────────────────

/**
 * Invalida el cache por tag(s).
 * Llamar desde mutaciones (API routes o Server Actions).
 */
export function revalidate(tag: CacheTag | CacheTag[]): void {
  const tags = Array.isArray(tag) ? tag : [tag];
  for (const t of tags) {
    revalidateTag(t, { expire: 0 });
  }
}
