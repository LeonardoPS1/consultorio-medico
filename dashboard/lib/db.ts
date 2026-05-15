import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/drizzle/schema';

const connectionString = process.env.DATABASE_URL!;

// Cliente para migraciones (1 conexión)
const migrationClient = postgres(connectionString, { max: 1 });

// Cliente para queries (pool)
const queryClient = postgres(connectionString, { max: 10, idle_timeout: 30 });

export const db = drizzle(queryClient, { schema });
export const migrationDb = drizzle(migrationClient, { schema });

export default db;
