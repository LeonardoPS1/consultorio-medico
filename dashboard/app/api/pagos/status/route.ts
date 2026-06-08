import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { suscripciones, usuarios } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { PLANES, type PlanId } from '@/lib/planes';
import { apiHandler } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';

// GET /api/pagos/status
// Devuelve el estado de la suscripción del usuario logueado
export const GET = apiHandler(async () => {
  const session = await requireAuth();

  if (!session.user?.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Buscar el tenant del usuario logueado
  const [userRow] = await db
    .select({ id: usuarios.id, tenantId: usuarios.tenantId, plan: usuarios.plan })
    .from(usuarios)
    .where(eq(usuarios.email, session.user.email))
    .limit(1);

  const tenantId = userRow?.tenantId || '00000000-0000-0000-0000-000000000000';

  // Buscar suscripción activa para el tenant del usuario
  const subs = await db
    .select()
    .from(suscripciones)
    .where(eq(suscripciones.organizacionId, tenantId))
    .limit(1)
    .orderBy(desc(suscripciones.createdAt));

  const sub = subs[0] ?? null;

  if (!sub || sub.estado === 'free') {
    return NextResponse.json({
      plan: 'free',
      estado: 'free',
      planInfo: { id: 'free', nombre: 'Gratuito', precio: 0, descripcion: 'Sin suscripción activa' },
      periodEnd: null,
    });
  }

  const planInfo = PLANES[sub.plan as PlanId] || null;

  return NextResponse.json({
    id: sub.id,
    plan: sub.plan,
    estado: sub.estado,
    planInfo: planInfo ? { ...planInfo } : null,
    periodStart: sub.periodStart,
    periodEnd: sub.periodEnd,
    trialEnd: sub.trialEnd,
    metadata: sub.metadata,
  });
});
