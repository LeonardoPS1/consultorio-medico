/**
 * GET  /api/admin/users — Listar usuarios del tenant del admin
 * POST /api/admin/users — Crear usuario manualmente
 *
 * Admin only — requiere sesión con rol admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { usuarios, medicos, tenants } from '@/drizzle/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import crypto from 'crypto';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// ─── GET ─────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // Obtener el tenant del admin
  const adminId = session.user.id;
  if (!adminId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }
  const adminUser = await db
    .select({ tenantId: usuarios.tenantId })
    .from(usuarios)
    .where(eq(usuarios.id, adminId))
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

  return NextResponse.json({ users: rows });
}

// ─── POST ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: {
    nombre: string;
    email: string;
    password: string;
    rol?: string;
    plan?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON requerido' }, { status: 400 });
  }

  const { nombre, email, password, rol, plan } = body;

  // Validaciones
  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres.' }, { status: 400 });
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Verificar email único
  const existing = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, normalizedEmail))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Este email ya está registrado.' }, { status: 409 });
  }

  // Obtener tenant del admin
  const adminId = session.user.id;
  if (!adminId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }
  const adminUser = await db
    .select({ tenantId: usuarios.tenantId })
    .from(usuarios)
    .where(eq(usuarios.id, adminId))
    .limit(1);
  const tenantId = adminUser[0]?.tenantId || DEFAULT_TENANT_ID;

  // Validar plan y rol
  const validPlans = ['free', 'starter', 'professional', 'premium', 'enterprise'];
  const validRoles = ['medico', 'admin', 'secretaria'];
  const userPlan = plan && validPlans.includes(plan) ? plan : 'free';
  const userRol = rol && validRoles.includes(rol) ? rol : 'medico';

  // Crear usuario
  const userId = crypto.randomUUID();
  const passwordHash = await hash(password, 10);

  await db.insert(usuarios).values({
    id: userId,
    email: normalizedEmail,
    passwordHash,
    nombre: nombre.trim(),
    rol: userRol,
    activo: true,
    tenantId,
    plan: userPlan,
  });

  // Crear médico asociado
  await db.insert(medicos).values({
    usuarioId: userId,
    nombre: nombre.trim(),
    especialidad: 'Medicina General',
    email: normalizedEmail,
    activo: true,
  });

  return NextResponse.json({
    success: true,
    user: {
      id: userId,
      email: normalizedEmail,
      nombre: nombre.trim(),
      rol: userRol,
      plan: userPlan,
      activo: true,
      tenantId,
    },
  }, { status: 201 });
}
