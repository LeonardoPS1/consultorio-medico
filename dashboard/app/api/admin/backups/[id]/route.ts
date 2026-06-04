import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const filepath = findBackupFile(params.id);
    if (!filepath) {
      return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 });
    }

    const filename = `${params.id}.sql.gz`;
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
    return NextResponse.json(
      { error: 'Error al descargar backup' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/admin/backups/[id] — Eliminar backup
// ============================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const filepath = findBackupFile(params.id);
    if (!filepath) {
      return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 });
    }

    fs.unlinkSync(filepath);
    return NextResponse.json({ message: 'Backup eliminado' });
  } catch (error) {
    console.error('[Backup] Error al eliminar:', error);
    return NextResponse.json(
      { error: 'Error al eliminar backup' },
      { status: 500 }
    );
  }
}
