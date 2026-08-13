import { eq, and, desc, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { solicitudesDatos, pacientes } from '@/drizzle/schema';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, ok, fail, notFound } from '@/lib/api-handler';
import { db } from '@/lib/db';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async () => {
  const session = await requireAuth();
  if (session.user.role !== 'admin' && session.user.role !== 'medico' && session.user.role !== 'secretaria' && session.user.role !== 'recepcionista') {
    fail('No autorizado', 403);
  }
  const tenantId = session.user.tenantId || DEFAULT_TENANT_ID;

  const list = await db
    .select({
      id: solicitudesDatos.id,
      tipo: solicitudesDatos.tipo,
      estado: solicitudesDatos.estado,
      createdAt: solicitudesDatos.createdAt,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      pacienteEmail: pacientes.email,
      pacienteTelefono: pacientes.telefono,
    })
    .from(solicitudesDatos)
    .innerJoin(pacientes, eq(solicitudesDatos.pacienteId, pacientes.id))
    .where(
      and(
        eq(solicitudesDatos.tenantId, tenantId),
        eq(solicitudesDatos.tipo, 'eliminacion'),
        sql`${pacientes.deletedAt} IS NULL`,
      ),
    )
    .orderBy(desc(solicitudesDatos.createdAt));

  return ok(list);
});

export const PATCH = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin' && session.user.role !== 'medico' && session.user.role !== 'secretaria' && session.user.role !== 'recepcionista') {
    fail('No autorizado', 403);
  }
  const tenantId = session.user.tenantId || DEFAULT_TENANT_ID;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object' || typeof (body as { id?: unknown }).id !== 'string') {
    fail('Falta el id de la solicitud', 400);
  }
  const id = (body as { id: string }).id;

  const updated = await db
    .update(solicitudesDatos)
    .set({ estado: 'procesada', updatedAt: new Date() })
    .where(and(eq(solicitudesDatos.id, id), eq(solicitudesDatos.tenantId, tenantId)))
    .returning({ id: solicitudesDatos.id });

  if (updated.length === 0) {
    notFound('Solicitud no encontrada');
  }

  return ok({ ok: true });
});
