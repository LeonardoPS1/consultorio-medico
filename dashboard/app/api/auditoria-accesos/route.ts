import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { auditoriaAccesos, usuarios } from '@/drizzle/schema';
import { and, eq, gte, lte, desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const { searchParams } = new URL(request.url);
  const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10));
  const limite = Math.min(100, Math.max(1, parseInt(searchParams.get('limite') || '50', 10)));
  const accion = searchParams.get('accion') || undefined;
  const entidad = searchParams.get('entidad') || undefined;
  const usuarioId = searchParams.get('usuarioId') || undefined;
  const desde = searchParams.get('desde') ? new Date(searchParams.get('desde')!) : undefined;
  const hasta = searchParams.get('hasta') ? new Date(searchParams.get('hasta')!) : undefined;

  const filtros = [];
  if (accion) filtros.push(eq(auditoriaAccesos.accion, accion));
  if (entidad) filtros.push(eq(auditoriaAccesos.entidad, entidad));
  if (usuarioId) filtros.push(eq(auditoriaAccesos.usuarioId, usuarioId));
  if (desde) filtros.push(gte(auditoriaAccesos.createdAt, desde));
  if (hasta) filtros.push(lte(auditoriaAccesos.createdAt, hasta));

  const offset = (pagina - 1) * limite;

  const [totalRow, accesos] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(auditoriaAccesos).where(and(...filtros)),
    db
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
      .limit(limite)
      .offset(offset),
  ]);

  const total = totalRow[0]?.total ?? 0;
  const totalPaginas = Math.ceil(total / limite);

  return success({
    accesos,
    paginacion: {
      pagina,
      limite,
      total,
      totalPaginas,
      hayMas: pagina < totalPaginas,
    },
  });
});