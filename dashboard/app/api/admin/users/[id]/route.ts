/**
 * PATCH /api/admin/users/[id] — Actualizar plan, rol, o activo de un usuario
 *
 * Admin only — requiere sesión con rol admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { usuarios } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { PLANES, type PlanId } from '@/lib/planes';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
  }

  let body: {
    plan?: string;
    rol?: string;
    activo?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON requerido' }, { status: 400 });
  }

  // Obtener tenant del admin para scoping
  const adminId = session.user.id;
  if (!adminId) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }
  const adminUser = await db
    .select({ tenantId: usuarios.tenantId })
    .from(usuarios)
    .where(eq(usuarios.id, adminId))
    .limit(1);
  const tenantId = adminUser[0]?.tenantId;

  // Verificar que el usuario a editar existe y pertenece al mismo tenant
  const [targetUser] = await db
    .select({ id: usuarios.id, tenantId: usuarios.tenantId })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  // Solo permitir editar usuarios del mismo tenant (excepto el default)
  if (tenantId && tenantId !== '00000000-0000-0000-0000-000000000000') {
    if (targetUser.tenantId !== tenantId) {
      return NextResponse.json({ error: 'No autorizado — usuario de otro tenant' }, { status: 403 });
    }
  }

  // No permitir que un admin se desactive a sí mismo
  if (body.activo === false && id === session.user.id) {
    return NextResponse.json({ error: 'No podés desactivar tu propio usuario' }, { status: 400 });
  }

  // Construir campos a actualizar
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  const validPlans = Object.keys(PLANES) as PlanId[];
  if (body.plan !== undefined) {
    if (!validPlans.includes(body.plan as PlanId)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }
    updateData.plan = body.plan;
  }

  const validRoles = ['medico', 'admin', 'secretaria'];
  if (body.rol !== undefined) {
    if (!validRoles.includes(body.rol)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }
    updateData.rol = body.rol;
  }

  if (body.activo !== undefined) {
    updateData.activo = body.activo;
  }

  if (Object.keys(updateData).length <= 1) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  await db
    .update(usuarios)
    .set(updateData)
    .where(eq(usuarios.id, id));

  // Devolver el usuario actualizado
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

  return NextResponse.json({ user: updated });
}
