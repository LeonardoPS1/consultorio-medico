import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/drizzle/schema';

const connectionString = process.env.DATABASE_URL!;

// ─── PgBouncer ──────────────────────────────────────────────────────────────
// La app se conecta a PgBouncer (puerto 6432) en modo transaccional.
// Esto requiere:
//   1. postgres.js: deshabilitar prepared statements ({ prepare: false })
//   2. Migraciones: conexión DIRECTA a PostgreSQL (no pasan por pooler)
//
// Detección automática: si el puerto es :6432 o la URL contiene 'pgbouncer',
// se asume que estamos detrás de PgBouncer.
// ────────────────────────────────────────────────────────────────────────────

const isPgBouncer =
  connectionString.includes(':6432') ||
  connectionString.includes('pgbouncer=true');

// URL directa a PostgreSQL para migraciones (saltea PgBouncer)
// Se puede configurar explícitamente con DATABASE_URL_DIRECT,
// o se deriva automáticamente reemplazando pgbouncer → postgres / :6432 → :5432
const directUrl =
  process.env.DATABASE_URL_DIRECT ||
  connectionString
    .replace('pgbouncer:6432', 'postgres:5432')
    .replace('?pgbouncer=true', '');

// Cliente para migraciones (1 conexión directa — saltea PgBouncer)
const migrationClient = postgres(directUrl, { max: 1, idle_timeout: 10 });

// Cliente para queries (pool vía PgBouncer o directo)
const queryClient = postgres(connectionString, {
  max: isPgBouncer ? 60 : 10,
  idle_timeout: 30,
  connect_timeout: 15,
  prepare: !isPgBouncer,
});

export const db = drizzle(queryClient, { schema });
export const migrationDb = drizzle(migrationClient, { schema });

export default db;
