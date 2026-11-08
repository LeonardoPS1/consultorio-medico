import { createHash, timingSafeEqual } from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { safeLog, safeWarn } from '@/lib/logger';

const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle', 'migrations');

interface MigrationFileInfo {
  name: string;
  bytes: number;
  sha256: string;
}

/**
 * Constant-time comparison so the internal key cannot be probed byte by byte.
 * @param provided Value received in the `x-internal-key` header
 */
function isValidKey(provided: string | null): boolean {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Reads the migration files shipped with the build.
 * Throws when the directory is missing so the caller can report it explicitly.
 */
function listMigrationFiles(): MigrationFileInfo[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => {
      const fullPath = path.join(MIGRATIONS_DIR, name);
      const content = fs.readFileSync(fullPath);
      return {
        name,
        bytes: content.byteLength,
        sha256: createHash('sha256').update(content).digest('hex').slice(0, 16),
      };
    });
}

/**
 * Reads the hashes recorded by Drizzle's migrator, when the table exists.
 * Returns `null` when the schema/table is absent (migrations applied by hand).
 * @param client Open postgres client
 */
async function readAppliedHashes(client: postgres.Sql): Promise<string[] | null> {
  try {
    const rows = await client<{ hash: string }[]>`
      SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id
    `;
    return rows.map((r) => r.hash);
  } catch {
    return null;
  }
}

/**
 * Reports the state of the SQL migrations bundled with the image.
 *
 * This endpoint deliberately does NOT apply migrations: running every `.sql`
 * file found on disk from an HTTP request can half-apply a schema change and
 * leaves no record of what ran. Migrations belong to the deployment pipeline
 * (`pnpm db:push` / drizzle-kit) under review, with a backup taken first.
 *
 * Protected by `x-internal-key`.
 * @param request
 */
async function handler(request: Request): Promise<NextResponse> {
  if (!isValidKey(request.headers.get('x-internal-key'))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let files: MigrationFileInfo[];
  try {
    files = listMigrationFiles();
  } catch (e) {
    safeWarn('[Migrar] No se pudo leer el directorio de migraciones', {
      error: e instanceof Error ? e.message : 'unknown',
    });
    return NextResponse.json({ ok: false, error: 'Migraciones no disponibles' }, { status: 500 });
  }

  const directUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!directUrl) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL no configurada', files: files.length },
      { status: 500 },
    );
  }

  let client: postgres.Sql | null = null;
  try {
    client = postgres(directUrl, { max: 1, idle_timeout: 10 });
    const applied = await readAppliedHashes(client);

    const appliedCount = applied === null ? 0 : applied.filter((h) => Boolean(h)).length;
    const pending = applied === null ? files.length : Math.max(files.length - appliedCount, 0);

    safeLog('[Migrar] Estado consultado', { files: files.length, applied: appliedCount });

    return NextResponse.json({
      ok: true,
      executed: false,
      message: 'Este endpoint sólo informa el estado; las migraciones se aplican en el pipeline.',
      total: files.length,
      appliedCount,
      pending,
      trackingTable: applied === null ? 'missing' : 'drizzle.__drizzle_migrations',
      latest: files.slice(-5).map((f) => f.name),
    });
  } catch (e) {
    safeWarn('[Migrar] Error al consultar estado', {
      error: e instanceof Error ? e.message : 'unknown',
    });
    return NextResponse.json({ ok: false, error: 'No se pudo leer el estado' }, { status: 500 });
  } finally {
    if (client) {
      await client.end().catch(() => undefined);
    }
  }
}

export { handler as GET, handler as POST };
