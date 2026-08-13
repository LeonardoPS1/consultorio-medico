/**
 * GET /api/admin/audit-logs — Listar logs de auditoría
 * DELETE /api/admin/audit-logs — Limpiar logs de auditoría
 *
 * Admin only — requiere sesión con rol admin
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { getAuditLogs, cleanAuditLogs } from '@/lib/audit-log';
import type { EntidadAudit, AccionAudit } from '@/lib/audit-log';
import { auth } from '@/lib/auth';

// Forzar dinámico para evitar errores de build en Linux (auth() usa headers/cookies)
export const dynamic = 'force-dynamic';

async function getSessionSafe(): Promise<Session | null> {
  try {
    return await auth();
  } catch {
    return null;
  }
}

/**
 * Lista los logs de auditoría con filtros opcionales.
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @returns {Promise<NextResponse>} La respuesta JSON con los logs de auditoría.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionSafe();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const entidad = searchParams.get('entidad') || undefined;
  const accion = searchParams.get('accion') || undefined;
  const usuarioId = searchParams.get('usuarioId') || undefined;

  const result = await getAuditLogs({
    limit: Math.min(limit, 500),
    offset,
    entidad: entidad as EntidadAudit,
    accion: accion as AccionAudit,
    usuarioId,
  });

  return NextResponse.json(result);
}

/**
 * Limpia los logs de auditoría según los parámetros de antigüedad.
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @returns {Promise<NextResponse>} La respuesta JSON con el resultado de la limpieza.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionSafe();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const beforeDays = parseInt(searchParams.get('beforeDays') || '90', 10);
  const all = searchParams.get('all') === 'true';

  const result = await cleanAuditLogs({ beforeDays, all });

  return NextResponse.json(result);
}
