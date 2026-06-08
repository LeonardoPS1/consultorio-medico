import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { servicios } from '@/drizzle/schema';
import { sql, count } from 'drizzle-orm';
import { apiHandler, success, created } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, createServicioSchema } from '@/lib/validations';

export const GET = apiHandler(async (_request: NextRequest) => {
  await requireAuth();

  const lista = await db.select().from(servicios).where(sql`${servicios.deletedAt} IS NULL`).orderBy(servicios.nombre);
  const [{ total }] = await db.select({ total: count() }).from(servicios).where(sql`${servicios.deletedAt} IS NULL`);
  return success({ lista, total: Number(total) });
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const body = await parseBody(request, createServicioSchema);

  const [nuevo] = await db.insert(servicios).values({
    nombre: body.nombre,
    descripcion: body.descripcion ?? null,
    duracionMinutos: body.duracionMinutos,
    precio: body.precio ?? null,
    medicoId: body.medicoId ?? null,
    activo: true,
  } as any).returning();

  return created(nuevo);
});
