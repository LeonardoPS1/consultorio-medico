import { NextRequest } from 'next/server';
import { apiHandler, success, created, fail, notFound } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, createSucursalSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { sucursales } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

const createBodySchema = createSucursalSchema.extend({
  email: z.string().optional(),
});

const patchBodySchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().optional(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  activo: z.boolean().optional(),
});

// ─── GET — Listar sucursales ────────────────────────────────
export const GET = apiHandler(async () => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const list = await db
    .select()
    .from(sucursales)
    .where(eq(sucursales.tenantId, DEFAULT_TENANT_ID))
    .orderBy(sucursales.nombre);

  return success(list);
});

// ─── POST — Crear sucursal ──────────────────────────────────
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const body = await parseBody(request, createBodySchema);

  const [nueva] = await db
    .insert(sucursales)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      nombre: body.nombre.trim(),
      direccion: body.direccion || null,
      telefono: body.telefono || null,
      email: body.email || null,
    })
    .returning();

  return created(nueva);
});

// ─── PATCH — Actualizar sucursal ────────────────────────────
export const PATCH = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const body = await parseBody(request, patchBodySchema);

  const updateData: Record<string, unknown> = {};
  if (body.nombre !== undefined) updateData.nombre = body.nombre.trim();
  if (body.direccion !== undefined) updateData.direccion = body.direccion;
  if (body.telefono !== undefined) updateData.telefono = body.telefono;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.activo !== undefined) updateData.activo = body.activo;
  updateData.updatedAt = sql`now()`;

  const [actualizada] = await db
    .update(sucursales)
    .set(updateData)
    .where(eq(sucursales.id, body.id))
    .returning();

  if (!actualizada) notFound('Sucursal no encontrada');

  return success(actualizada);
});
