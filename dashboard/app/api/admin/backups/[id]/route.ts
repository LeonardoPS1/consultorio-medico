/**
 * GET    /api/admin/backups/[id] — Descargar backup desencriptado
 * DELETE /api/admin/backups/[id] — Eliminar backup
 *
 * Admin only — requiere sesión con rol admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listBackups, readBackup, deleteBackup } from '@/lib/backup';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const sql = readBackup(params.id);
  if (!sql) {
    return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 });
  }

  // Devolver como descarga de archivo SQL
  return new NextResponse(sql, {
    headers: {
      'Content-Type': 'application/sql',
      'Content-Disposition': `attachment; filename="backup_${params.id}.sql"`,
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const deleted = deleteBackup(params.id);
  if (!deleted) {
    return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Backup eliminado' });
}
