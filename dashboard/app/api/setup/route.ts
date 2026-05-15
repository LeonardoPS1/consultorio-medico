import { NextResponse } from 'next/server';
import { seedDataIfEmpty, createAdminUserIfNotExists } from '@/lib/data-store';

/**
 * POST /api/setup
 *
 * Inicializa los datos de ejemplo y crea el usuario admin.
 * Útil para desarrollo local o para resetear datos.
 *
 * Body opcional:
 * { "force": true } - para forzar el reseteo
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const force = body?.force === true;

    if (force) {
      // Si force=true, eliminamos los datos existentes primero
      const fs = await import('fs');
      const path = await import('path');
      const dataDir = path.default.join(process.cwd(), '.data');

      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
        console.log('[Setup] Datos existentes eliminados');
      }
    }

    // Seed data
    const seeded = await seedDataIfEmpty();
    const adminCreated = await createAdminUserIfNotExists();

    return NextResponse.json({
      status: 'ok',
      seeded,
      adminCreated,
      adminEmail: seeded || adminCreated ? 'admin@consultorio.com' : undefined,
      adminPassword: 'admin123',
      medicoEmail: seeded || adminCreated ? 'medico@consultorio.com' : undefined,
      medicoPassword: 'medico123',
      message: 'Sistema inicializado correctamente',
    });
  } catch (error) {
    console.error('[Setup] Error:', error);
    return NextResponse.json(
      { error: 'Error al inicializar el sistema', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setup
 *
 * Retorna el estado actual de los datos.
 */
export async function GET() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const dataDir = path.default.join(process.cwd(), '.data');

    const exists = fs.existsSync(dataDir);
    const files = exists ? fs.readdirSync(dataDir) : [];

    const stats: Record<string, number> = {};
    for (const file of files) {
      const filePath = path.default.join(dataDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        stats[file.replace('.json', '')] = Array.isArray(data) ? data.length : 1;
      } catch {
        stats[file.replace('.json', '')] = -1;
      }
    }

    return NextResponse.json({
      status: 'ok',
      dataDir: dataDir,
      initialized: exists,
      stats,
      loginUrl: 'http://localhost:3000',
      credentials: {
        admin: { email: 'admin@consultorio.com', password: 'admin123' },
        medico: { email: 'medico@consultorio.com', password: 'medico123' },
      },
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: (error as Error).message }, { status: 500 });
  }
}
