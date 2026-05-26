/**
 * GET  /api/admin/backups  — Listar backups
 * POST /api/admin/backups  — Crear backup nuevo
 *
 * Admin only — requiere sesión con rol admin
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listBackups, createBackup } from '@/lib/backup';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const backups = listBackups();
  return NextResponse.json({ backups });
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const backup = await createBackup();
    return NextResponse.json({ backup, message: 'Backup creado exitosamente' });
  } catch (err) {
    console.error('[Backup] Error al crear:', err);
    return NextResponse.json(
      { error: 'Error al generar el backup' },
      { status: 500 }
    );
  }
}
