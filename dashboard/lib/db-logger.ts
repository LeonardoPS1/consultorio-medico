/**
 * Logger de queries SQL para detectar consultas lentas (>100ms).
 * 
 * Uso: Reemplazar `import { db } from '@/lib/db'` por 
 *       `import { db } from '@/lib/db-logger'`
 * 
 * El proxy intercepta todas las operaciones (select, insert, update, delete)
 * y mide el tiempo de ejecución. Las queries >100ms se loguean como warning.
 */

import { db as originalDb } from './db';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

const SLOW_QUERY_THRESHOLD_MS = 100;

type QueryFn = (...args: any[]) => any;

function wrapQuery(name: string, fn: QueryFn): QueryFn {
  return (...args: any[]) => {
    const start = performance.now();
    try {
      const result = fn(...args);
      // Si devuelve una promesa, medir el tiempo de resolución
      if (result && typeof result.then === 'function') {
        return result.then((value: any) => {
          const duration = performance.now() - start;
          if (duration > SLOW_QUERY_THRESHOLD_MS) {
            console.warn(`[DB] SLOW QUERY (${duration.toFixed(0)}ms): ${name}`, {
              args: args.map(a => typeof a === 'object' ? '[object]' : String(a)).slice(0, 3),
            });
          }
          return value;
        }).catch((err: Error) => {
          const duration = performance.now() - start;
          console.error(`[DB] QUERY ERROR (${duration.toFixed(0)}ms): ${name}`, err.message);
          throw err;
        });
      }
      return result;
    } catch (err: any) {
      const duration = performance.now() - start;
      console.error(`[DB] SYNC ERROR (${duration.toFixed(0)}ms): ${name}`, err.message);
      throw err;
    }
  };
}

/**
 * DB client con logging de queries lentas.
 * Para activarlo, cambiá el import de '@/lib/db' a '@/lib/db-logger'
 * en los archivos que quieras monitorear.
 */
export const db = new Proxy(originalDb, {
  get(target, prop: string) {
    const value = (target as any)[prop];
    if (typeof value === 'function') {
      return wrapQuery(prop, value.bind(target));
    }
    return value;
  },
}) as unknown as typeof originalDb;
