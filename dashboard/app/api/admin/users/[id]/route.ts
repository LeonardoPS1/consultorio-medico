/**
 * PATCH /api/admin/users/[id] — Actualizar plan, rol, o activo de un usuario
 *
 * Admin only — requiere sesión con rol admin
 */

import { NextRequest } from 'next/server';
import { apiHandler, success, fail, notFound } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, updateUserSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { usuarios } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const { id } = await params;

  const body = await parseBody(request, updateUserSchema.extend({
    rol: z.enum(['medico', 'admin', 'secretaria']).optional(),
    plan: z.enum(['free', 'starter', 'professional', 'premium', 'enterprise']).optional(),
  }));

  const adminUser = await db
    .select({ tenantId: usuarios.tenantId })
    .from(usuarios)
    .where(eq(usuarios.id, session.user.id))
    .limit(1);
  const tenantId = adminUser[0]?.tenantId;

  const [targetUser] = await db
    .select({ id: usuarios.id, tenantId: usuarios.tenantId })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  if (!targetUser) notFound('Usuario no encontrado');

  if (tenantId && tenantId !== '00000000-0000-0000-0000-000000000000') {
    if (targetUser.tenantId !== tenantId) fail('No autorizado — usuario de otro tenant', 403);
  }

  if (body.activo === false && id === session.user.id) {
    fail('No puedes desactivar tu propio usuario');
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.rol !== undefined) {
    updateData.rol = body.rol;
  } else if (body.role !== undefined) {
    updateData.rol = body.role;
  }

  if (body.plan !== undefined) {
    updateData.plan = body.plan;
  }

  if (body.activo !== undefined) {
    updateData.activo = body.activo;
  }

  if (Object.keys(updateData).length <= 1) {
    fail('Nada que actualizar');
  }

  await db
    .update(usuarios)
    .set(updateData)
    .where(eq(usuarios.id, id));

  const [updated] = await db
    .select({
      id: usuarios.id,
      email: usuarios.email,
      nombre: usuarios.nombre,
      rol: usuarios.rol,
      activo: usuarios.activo,
      plan: usuarios.plan,
    })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  return success({ user: updated });
});
