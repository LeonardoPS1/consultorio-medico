/**
 * GET /api/admin/audit-logs — Listar logs de auditoría
 * Admin only — requiere sesión con rol admin
 *
 * Query params:
 *   - limit: número máximo de registros (default 100)
 *   - offset: desplazamiento (default 0)
 *   - entidad: filtrar por entidad (opcional)
 *   - accion: filtrar por acción (opcional)
 *   - usuarioId: filtrar por usuario (opcional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuditLogs } from '@/lib/audit-log';

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
