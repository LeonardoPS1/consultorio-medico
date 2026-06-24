import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/drizzle/schema';

// ─── Lazy initialization ────────────────────────────────────────────────────
// DATABASE_URL es una variable de RUNTIME que NO está disponible durante el
// build (next build en Docker). Por eso usamos lazy init: los clientes se crean
// recién cuando se accede a `db` por primera vez, que siempre es en runtime.
// ────────────────────────────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _migrationDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

function initDb() {
  if (_db) return;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL no configurada. Esta variable es requerida en runtime.');
  }

  // ─── PgBouncer ──────────────────────────────────────────────────────────
  // La app se conecta a PgBouncer (puerto 6432) en modo transaccional.
  // Esto requiere:
  //   1. postgres.js: deshabilitar prepared statements ({ prepare: false })
  //   2. Migraciones: conexión DIRECTA a PostgreSQL (no pasan por pooler)
  //
  // Detección automática: si el puerto es :6432 o la URL contiene 'pgbouncer',
  // se asume que estamos detrás de PgBouncer.
  // ────────────────────────────────────────────────────────────────────────

  const isPgBouncer =
    connectionString.includes(':6432') || connectionString.includes('pgbouncer=true');

  // URL directa a PostgreSQL para migraciones (saltea PgBouncer)
  const directUrl =
    process.env.DATABASE_URL_DIRECT ||
    connectionString.replace('pgbouncer:6432', 'postgres:5432').replace('?pgbouncer=true', '');

  // Cliente para migraciones (1 conexión directa — saltea PgBouncer)
  const migrationClient = postgres(directUrl, { max: 1, idle_timeout: 10 });

  // Cliente para queries (pool vía PgBouncer o directo)
  const queryClient = postgres(connectionString, {
    max: isPgBouncer ? 60 : 10,
    idle_timeout: 30,
    connect_timeout: 15,
    prepare: !isPgBouncer,
  });

  _db = drizzle(queryClient, { schema });
  _migrationDb = drizzle(migrationClient, { schema });
}

export function getDb() {
  initDb();
  return _db!;
}

export function getMigrationDb() {
  initDb();
  return _migrationDb!;
}

// Proxy lazy: mantiene compatibilidad con import { db } desde otros módulos
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle<typeof schema>>];
  },
});

export const migrationDb = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getMigrationDb()[prop as keyof ReturnType<typeof drizzle<typeof schema>>];
  },
});

export default db;
