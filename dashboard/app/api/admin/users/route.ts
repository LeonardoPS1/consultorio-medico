/**
 * GET  /api/admin/users — Listar usuarios del tenant del admin
 * POST /api/admin/users — Crear usuario manualmente
 *
 * Admin only — requiere sesión con rol admin
 */

import crypto from 'crypto';
import { hash } from 'bcryptjs';
import { eq, asc } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { usuarios, medicos } from '@/drizzle/schema';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, ok, created, fail, conflict } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { parseBody, createUserSchema } from '@/lib/validations';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// ─── GET ─────────────────────────────────────────────────────

export const GET = apiHandler(async () => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const adminUser = await db
    .select({ tenantId: usuarios.tenantId })
    .from(usuarios)
    .where(eq(usuarios.id, session.user.id))
    .limit(1);

  const tenantId = adminUser[0]?.tenantId || DEFAULT_TENANT_ID;

  const rows = await db
    .select({
      id: usuarios.id,
      email: usuarios.email,
      nombre: usuarios.nombre,
      rol: usuarios.rol,
      activo: usuarios.activo,
      plan: usuarios.plan,
      ultimoAcceso: usuarios.ultimoAcceso,
      activo2fa: usuarios.activo2fa,
      createdAt: usuarios.createdAt,
      updatedAt: usuarios.updatedAt,
    })
    .from(usuarios)
    .where(eq(usuarios.tenantId, tenantId))
    .orderBy(asc(usuarios.createdAt));

  return ok({ users: rows });
});

// ─── POST ────────────────────────────────────────────────────

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const body = await parseBody(
    request,
    createUserSchema.extend({
      rol: z.enum(['medico', 'admin', 'secretaria']).optional(),
    }),
  );

  const normalizedEmail = body.email.toLowerCase().trim();

  const existing = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, normalizedEmail))
    .limit(1);
  if (existing.length > 0) conflict('Este email ya está registrado.');

  const adminUser = await db
    .select({ tenantId: usuarios.tenantId })
    .from(usuarios)
    .where(eq(usuarios.id, session.user.id))
    .limit(1);
  const tenantId = adminUser[0]?.tenantId || DEFAULT_TENANT_ID;

  const userRol = body.rol || body.role || 'medico';
  const userPlan = body.plan || 'free';

  const userId = crypto.randomUUID();
  const passwordHash = await hash(body.password, 10);

  await db.insert(usuarios).values({
    id: userId,
    email: normalizedEmail,
    passwordHash,
    nombre: body.nombre.trim(),
    rol: userRol,
    activo: true,
    tenantId,
    plan: userPlan,
  });

  await db.insert(medicos).values({
    usuarioId: userId,
    nombre: body.nombre.trim(),
    especialidad: 'Medicina General',
    email: normalizedEmail,
    activo: true,
  });

  return created({
    success: true,
    user: {
      id: userId,
      email: normalizedEmail,
      nombre: body.nombre.trim(),
      rol: userRol,
      plan: userPlan,
      activo: true,
      tenantId,
    },
  });
});
