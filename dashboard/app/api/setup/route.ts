import { NextResponse } from 'next/server';
import { seedDataIfEmpty, createAdminUserIfNotExists } from '@/lib/data-store';

/**
 * POST /api/setup
 *
 * Inicializa los datos de ejemplo y crea el usuario admin.
 * SOLO disponible en desarrollo (NODE_ENV !== 'production').
 *
 * Body opcional:
 * { "force": true } - para forzar el reseteo
 */
export async function POST(request: Request) {
  // Seguridad: endpoint solo disponible en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Endpoint no disponible en producción' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const force = body?.force === true;

    if (force) {
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
 * Retorna el estado actual de los datos.
 * SOLO disponible en desarrollo.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Endpoint no disponible en producción' },
      { status: 403 }
    );
  }

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
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: 'Error al leer datos' }, { status: 500 });
  }
}
