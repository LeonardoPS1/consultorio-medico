import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/drizzle/schema';

const connectionString = process.env.DATABASE_URL!;

// ─── Pooling con PgBouncer ───────────────────────────────────────────────────
// La app se conecta a PgBouncer (puerto 6432) en lugar de directo a PostgreSQL.
// PgBouncer maneja el pool real de conexiones al backend, permitiendo:
//   - Escalar horizontalmente sin agotar max_connections de PG
//   - Conexiones más livianas y rápidas
//   - Timeouts y reintentos automáticos
//
// Configuración actual:
//   pool_mode = session (compatible con prepared statements)
//   default_pool_size = 20 (conexiones backend a PG)
//   max_client_conn = 60 (conexiones desde apps)
//
// Si se cambia a pool_mode = transaction, agregar { prepare: false }
// en las opciones de postgres() para deshabilitar prepared statements.
// ────────────────────────────────────────────────────────────────────────────

// Cliente para migraciones (1 conexión directa — saltea pgBouncer)
const migrationClient = postgres(connectionString, { max: 1, idle_timeout: 10 });

// Cliente para queries (pool reducido — pgBouncer maneja la conexión real)
const queryClient = postgres(connectionString, { max: 10, idle_timeout: 30, connect_timeout: 15 });

export const db = drizzle(queryClient, { schema });
export const migrationDb = drizzle(migrationClient, { schema });

export default db;
