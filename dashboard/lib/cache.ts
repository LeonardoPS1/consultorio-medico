/**
 * Cache in-memory con TTL para datos de respuesta lenta o consultas frecuentes.
 *
 * Uso:
 *   import { cache } from '@/lib/cache';
 *
 *   // Cachear resultado de una función async
 *   const medicos = await cache.getOrSet('medicos:lista', () => db.select().from(medicos), 60_000);
 *
 *   // Invalidar en escritura
 *   cache.invalidate('medicos');
 *
 * Características:
 * - TTL configurable por entrada (default 30s)
 * - Invalidación por prefijo (ideal para invalidar grupos)
 * - Límite de entradas (default 500, evita memory leak)
 * - Cleanup automático cada 60s
 * - Seguro para server components y API routes (singleton en Node.js)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface CacheOptions {
  ttlMs?: number;
  key?: string;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;
  private maxEntries: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTTLMs = 30_000, maxEntries = 500) {
    this.defaultTTL = defaultTTLMs;
    this.maxEntries = maxEntries;

    // Cleanup cada 60s para evitar memory leaks
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
      this.cleanupInterval.unref();
    }
  }

  /**
   * Obtiene un valor del cache. Retorna null si no existe o expiró.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Guarda un valor en el cache con TTL opcional.
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    // Si alcanzó el límite, eliminar la entrada más vieja
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }

    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  /**
   * Obtiene o calcula un valor cacheado.
   * Si el valor está en cache y no expiró, lo retorna.
   * Si no, ejecuta el fetcher, lo cachea y lo retorna.
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Versión síncrona de getOrSet para datos que ya están en memoria.
   */
  getOrSetSync<T>(key: string, fetcher: () => T, ttlMs?: number): T {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = fetcher();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Invalida entradas del cache.
   * - Sin argumentos: limpia todo
   * - Con prefijo: invalida todas las entradas que empiecen con el prefijo
   */
  invalidate(prefix?: string): void {
    if (!prefix) {
      this.store.clear();
      return;
    }

    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Verifica si una clave existe y no expiró.
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Limpia entradas expiradas.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.store.entries())) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destruye el cache y el intervalo de cleanup.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  /**
   * Estadísticas del cache (útil para debugging)
   */
  stats(): { size: number; maxEntries: number; defaultTTL: number; keys: string[] } {
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      defaultTTL: this.defaultTTL,
      keys: Array.from(this.store.keys()),
    };
  }
}

// Singleton global — reusable en todos los servicios
export const cache = new MemoryCache(30_000, 500);
