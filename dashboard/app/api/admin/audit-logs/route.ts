/**
 * GET /api/admin/audit-logs — Listar logs de auditoría
 * DELETE /api/admin/audit-logs — Limpiar logs de auditoría
 *
 * Admin only — requiere sesión con rol admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuditLogs, cleanAuditLogs } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const entidad = searchParams.get('entidad') || undefined;
  const accion = searchParams.get('accion') || undefined;
  const usuarioId = searchParams.get('usuarioId') || undefined;

  const result = await getAuditLogs({
    limit: Math.min(limit, 500),
    offset,
    entidad: entidad as any,
    accion: accion as any,
    usuarioId,
  });

  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const beforeDays = parseInt(searchParams.get('beforeDays') || '90', 10);
  const all = searchParams.get('all') === 'true';

  const result = await cleanAuditLogs({ beforeDays, all });

  return NextResponse.json(result);
}
