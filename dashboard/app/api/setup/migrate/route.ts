import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/setup/migrate
 * Ejecuta todas las migraciones SQL pendientes en orden.
 * Solo accesible desde el servidor (sin auth por ahora para setup inicial).
 */
export async function POST() {
  try {
    const migrationsDir = path.join(process.cwd(), 'database', 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      return NextResponse.json({ error: 'Migrations directory not found' }, { status: 500 });
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      return NextResponse.json({ success: true, message: 'No migration files found', results: [], tables: [] });
    }

    const results: string[] = [];
    let ok = 0;
    let fail = 0;

    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8').trim();
      if (!content) {
        results.push(`⏭️ ${file} - vacío`);
        continue;
      }

      // Dividir por statements (cada statement termina con ;)
      const statements = content
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await db.execute(sql.raw(stmt + ';'));
        } catch (err: any) {
          // Ignorar errores de "already exists" para idempotencia
          if (err.message?.includes('already exists') || 
              err.message?.includes('duplicate') ||
              err.message?.includes('does not exist') && stmt.toUpperCase().includes('DROP')) {
            continue;
          }
          throw err; // Re-lanzar otros errores
        }
      }

      results.push(`✅ ${file}`);
      ok++;
    }

    // Verificar tablas creadas
    const tableResult = await db.execute(
      sql`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    const tables = [...tableResult].map((r: any) => r.tablename);

    return NextResponse.json({
      success: true,
      executed: ok,
      failed: fail,
      results,
      tables,
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown migration error' },
      { status: 500 }
    );
  }
}
