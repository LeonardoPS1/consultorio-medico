import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { safeLog, safeWarn } from '@/lib/logger';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle', 'migrations');

/**
 * Ejecuta migraciones SQL pendientes contra la base de datos de producción.
 * Protected con x-internal-key.
 * @param request
 */
export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('x-internal-key');
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const directUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!directUrl) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL no configurada' }, { status: 500 });
  }

  const results: string[] = [];

  try {
    const pgClient = postgres(directUrl, { max: 1, idle_timeout: 10 });

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8').trim();
      if (!content) {
        results.push(`skip ${file} - vacio`);
        continue;
      }

      try {
        await pgClient.unsafe(content);
        results.push(`ok ${file}`);
      } catch (err) {
        const msg = (err as Error).message || '';
        if (
          msg.includes('already exists') ||
          msg.includes('duplicate') ||
          msg.includes('already been created')
        ) {
          results.push(`dup ${file} (${msg.split('\n')[0]})`);
        } else {
          results.push(`fail ${file}: ${msg.split('\n')[0]}`);
        }
      }
    }

    await pgClient.end();
    safeLog(`[Migrar] Ejecutadas ${files.length} migraciones`);

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    safeWarn('[Migrar] Error:', (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
