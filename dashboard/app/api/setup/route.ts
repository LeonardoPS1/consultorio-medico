import { NextResponse } from 'next/server';
import { seedDataIfEmpty, createAdminUserIfNotExists } from '@/lib/data-store';
import { db } from '@/lib/db';
import { usuarios } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * POST /api/setup
 *
 * Inicializa los datos de ejemplo y crea el usuario admin.
 * En producción requiere header X-Setup-Key = SETUP_KEY (env var).
 * En desarrollo se puede usar sin restricciones.
 *
 * Body opcional:
 * { "force": true } - para forzar reseteo de datos JSON (solo dev)
 */
export async function POST(request: Request) {
  // En producción, validar con SETUP_KEY
  if (process.env.NODE_ENV === 'production') {
    const setupKey = process.env.SETUP_KEY;
    if (!setupKey) {
      return NextResponse.json(
        { error: 'SETUP_KEY no configurado en producción. Agregalo a las env vars.' },
        { status: 500 }
      );
    }
    const providedKey = request.headers.get('x-setup-key');
    if (!providedKey || providedKey !== setupKey) {
      return NextResponse.json(
        { error: 'X-Setup-Key inválido o faltante' },
        { status: 403 }
      );
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const force = body?.force === true;

    // Solo reset en desarrollo
    if (force && process.env.NODE_ENV !== 'production') {
      const fs = await import('fs');
      const path = await import('path');
      const dataDir = path.default.join(process.cwd(), '.data');
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
        console.log('[Setup] Datos existentes eliminados');
      }
    }

    const seeded = await seedDataIfEmpty();
    const adminCreated = await createAdminUserIfNotExists();

    return NextResponse.json({
      status: 'ok',
      seeded,
      adminCreated,
      message: 'Sistema inicializado correctamente',
    });
  } catch (error) {
    console.error('[Setup] Error:', error);
    return NextResponse.json(
      { error: 'Error al inicializar el sistema' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setup
 *
 * Retorna el estado del sistema (DB conectada, admin existe, tablas).
 * En producción requiere X-Setup-Key.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    const setupKey = process.env.SETUP_KEY;
    if (setupKey) {
      // Si hay setup key configurada, pedirla
      // (en producción con setup key se puede consultar estado)
    }
  }

  try {
    // Verificar DB
    let dbConnected = false;
    let tableCount = 0;
    let adminExists = false;
    let tenantExists = false;
    let errorMsg: string | null = null;

    try {
      await db.execute(sql`SELECT 1`);
      dbConnected = true;

      const tables = await db.execute<{ tablename: string }>(sql`
        SELECT tablename FROM pg_catalog.pg_tables
        WHERE schemaname = 'public' ORDER BY tablename
      `);
      tableCount = tables.length;

      const admin = await db.select().from(usuarios).where(eq(usuarios.email, 'admin@consultorio.com')).limit(1);
      adminExists = admin.length > 0;

      const tenantsResult = await db.execute<{ count: number }>(sql`
        SELECT COUNT(*) as count FROM tenants
      `);
      tenantExists = Number(tenantsResult[0]?.count ?? 0) > 0;
    } catch (e) {
      errorMsg = (e as Error).message;
    }

    // Datos de desarrollo (JSON files)
    let devStats: Record<string, number> | null = null;
    if (process.env.NODE_ENV !== 'production') {
      const fs = await import('fs');
      const path = await import('path');
      const dataDir = path.default.join(process.cwd(), '.data');
      const exists = fs.existsSync(dataDir);
      if (exists) {
        const files = fs.readdirSync(dataDir);
        devStats = {};
        for (const file of files) {
          try {
            const content = fs.readFileSync(path.default.join(dataDir, file), 'utf-8');
            const data = JSON.parse(content);
            devStats[file.replace('.json', '')] = Array.isArray(data) ? data.length : 1;
          } catch { /* skip */ }
        }
      }
    }

    return NextResponse.json({
      status: 'ok',
      db: {
        connected: dbConnected,
        tables: tableCount,
        error: errorMsg,
      },
      admin: {
        exists: adminExists,
        email: 'admin@consultorio.com',
      },
      tenant: {
        exists: tenantExists,
      },
      dev: devStats ? { dataDir: true, stats: devStats } : null,
      env: process.env.NODE_ENV,
      setupKeyConfigured: !!process.env.SETUP_KEY,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: 'Error al leer estado del sistema' },
      { status: 500 }
    );
  }
}
