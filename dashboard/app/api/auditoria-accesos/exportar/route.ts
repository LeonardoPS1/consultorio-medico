import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { auditoriaAccesos, usuarios } from '@/drizzle/schema';
import { and, eq, gte, lte, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const { searchParams } = new URL(request.url);
  const accion = searchParams.get('accion') || undefined;
  const entidad = searchParams.get('entidad') || undefined;
  const usuarioId = searchParams.get('usuarioId') || undefined;
  const desde = searchParams.get('desde') ? new Date(searchParams.get('desde')!) : undefined;
  const hasta = searchParams.get('hasta') ? new Date(searchParams.get('hasta')!) : undefined;
  const limite = Math.min(10000, Math.max(1, parseInt(searchParams.get('limite') || '10000', 10)));

  const filtros = [];
  if (accion) filtros.push(eq(auditoriaAccesos.accion, accion));
  if (entidad) filtros.push(eq(auditoriaAccesos.entidad, entidad));
  if (usuarioId) filtros.push(eq(auditoriaAccesos.usuarioId, usuarioId));
  if (desde) filtros.push(gte(auditoriaAccesos.createdAt, desde));
  if (hasta) filtros.push(lte(auditoriaAccesos.createdAt, hasta));

  const accesos = await db
    .select({
      id: auditoriaAccesos.id,
      accion: auditoriaAccesos.accion,
      entidad: auditoriaAccesos.entidad,
      entidadId: auditoriaAccesos.entidadId,
      detalle: auditoriaAccesos.detalle,
      ip: auditoriaAccesos.ip,
      userAgent: auditoriaAccesos.userAgent,
      createdAt: auditoriaAccesos.createdAt,
      usuarioNombre: usuarios.nombre,
      usuarioEmail: usuarios.email,
    })
    .from(auditoriaAccesos)
    .leftJoin(usuarios, eq(auditoriaAccesos.usuarioId, usuarios.id))
    .where(and(...filtros))
    .orderBy(desc(auditoriaAccesos.createdAt))
    .limit(limite);

  // Generar CSV
  const headers = [
    'ID',
    'Acción',
    'Entidad',
    'ID Entidad',
    'Detalle',
    'IP',
    'User Agent',
    'Fecha',
    'Usuario Nombre',
    'Usuario Email',
  ];

  const escapeCsv = (value: string | null | undefined): string => {
    if (!value) return '';
    const escaped = value.replace(/"/g, '""');
    return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
      ? `"${escaped}"`
      : escaped;
  };

  const rows = accesos.map((a) => [
    a.id,
    a.accion,
    a.entidad,
    a.entidadId || '',
    a.detalle || '',
    a.ip || '',
    a.userAgent || '',
    a.createdAt.toISOString(),
    a.usuarioNombre || '',
    a.usuarioEmail || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="auditoria_accesos_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});