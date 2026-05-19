import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { suscripciones } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { PLANES, type PlanId } from '@/lib/planes';

// GET /api/pagos/status
// Devuelve el estado de la suscripción del usuario actual
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Buscar suscripción activa para esta organización/usuario
    const subs = await db
      .select()
      .from(suscripciones)
      .limit(1)
      .orderBy(suscripciones.createdAt);

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
  } catch (error) {
    console.error('[pagos/status] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado de suscripción' },
      { status: 500 }
    );
  }
}
