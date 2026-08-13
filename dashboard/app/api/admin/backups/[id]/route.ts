import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveSession } from '@/lib/auth-effective';

// ============================================================
// Config
// ============================================================

const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/backups';

// ============================================================
// Helpers
// ============================================================

function findBackupFile(id: string): string | null {
  const filename = `${id}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);
  if (fs.existsSync(filepath)) return filepath;
  return null;
}

// ============================================================
// GET /api/admin/backups/[id] — Descargar backup
// ============================================================

/**
 * Descarga el backup comprimido correspondiente al ID.
 * @param {NextRequest} _request - La solicitud HTTP entrante.
 * @param {object} root0 - Contexto de la ruta.
 * @param {Promise<{ id: string }>} root0.params - Promesa con los parámetros dinámicos de la ruta.
 * @returns {Promise<NextResponse>} El archivo backup o un error.
 */
export async function GET(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await paramsPromise;
  try {
    const session = await getEffectiveSession();
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const filepath = findBackupFile(id);
    if (!filepath) {
      return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 });
    }

    const filename = `${id}.sql.gz`;
    const content = fs.readFileSync(filepath);

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': content.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Backup] Error al descargar:', error);
    return NextResponse.json({ error: 'Error al descargar backup' }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/admin/backups/[id] — Eliminar backup
// ============================================================

/**
 * Elimina el backup correspondiente al ID.
 * @param {NextRequest} _request - La solicitud HTTP entrante.
 * @param {object} root0 - Contexto de la ruta.
 * @param {Promise<{ id: string }>} root0.params - Promesa con los parámetros dinámicos de la ruta.
 * @returns {Promise<NextResponse>} Confirmación de eliminación o un error.
 */
export async function DELETE(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await paramsPromise;
  try {
    const session = await getEffectiveSession();
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const filepath = findBackupFile(id);
    if (!filepath) {
      return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 });
    }

    fs.unlinkSync(filepath);
    return NextResponse.json({ message: 'Backup eliminado' });
  } catch (error) {
    console.error('[Backup] Error al eliminar:', error);
    return NextResponse.json({ error: 'Error al eliminar backup' }, { status: 500 });
  }
}
