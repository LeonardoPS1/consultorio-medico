import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { historialMedico, pacientes, historialTipoEnum } from '@/drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const tipo = searchParams.get('tipo') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (search) {
    conditions.push(
      sql`LOWER(CONCAT(${pacientes.nombre}, ' ', ${pacientes.apellido})) LIKE ${`%${search.toLowerCase()}%`}`,
    );
  }

  if (tipo) {
    conditions.push(eq(historialMedico.tipo, sql`${tipo}::historial_tipo`));
  }

  if (from) {
    conditions.push(sql`${historialMedico.createdAt} >= ${from}::timestamp`);
  }

  if (to) {
    conditions.push(sql`${historialMedico.createdAt} <= ${to}::timestamp + interval '1 day'`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: historialMedico.id,
        tipo: historialMedico.tipo,
        titulo: historialMedico.titulo,
        descripcion: historialMedico.descripcion,
        diagnosticoCodigo: historialMedico.diagnosticoCodigo,
        diagnosticoDescripcion: historialMedico.diagnosticoDescripcion,
        fecha: historialMedico.createdAt,
        pacienteId: historialMedico.pacienteId,
        pacienteNombre: sql<string>`CONCAT(${pacientes.nombre}, ' ', ${pacientes.apellido})`,
        pacienteTelefono: pacientes.telefono,
      })
      .from(historialMedico)
      .innerJoin(pacientes, eq(historialMedico.pacienteId, pacientes.id))
      .where(where)
      .orderBy(desc(historialMedico.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(historialMedico)
      .innerJoin(pacientes, eq(historialMedico.pacienteId, pacientes.id))
      .where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return success({
    data: rows.map((r) => ({
      ...r,
      fecha: r.fecha instanceof Date ? r.fecha.toISOString() : String(r.fecha ?? ''),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});
