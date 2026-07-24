import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { suscripciones, usuarios } from '@/drizzle/schema';
import { eq, lt, and } from 'drizzle-orm';
import { safeLog, safeWarn } from '@/lib/logger';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function POST(request: Request) {
  const authHeader = request.headers.get('x-internal-key');
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const now = new Date();
  const gracePeriodDays = Number(process.env.MP_GRACE_PERIOD_DAYS) || 7;
  const affected: { usuarioId: string; plan: string }[] = [];

  try {
    const expired = await db
      .select({
        id: suscripciones.id,
        plan: suscripciones.plan,
        periodEnd: suscripciones.periodEnd,
        metadata: suscripciones.metadata,
      })
      .from(suscripciones)
      .where(
        and(
          eq(suscripciones.estado, 'past_due'),
          lt(suscripciones.periodEnd, now),
        ),
      );

    for (const sub of expired) {
      await db
        .update(suscripciones)
        .set({
          estado: 'cancelled',
          updatedAt: now,
        })
        .where(eq(suscripciones.id, sub.id));

      // Buscar usuario asociado por metadata.userId
      const metadata = sub.metadata as Record<string, string> | null;
      const userId = metadata?.userId;
      if (userId) {
        await db
          .update(usuarios)
          .set({ plan: 'free', updatedAt: now })
          .where(eq(usuarios.id, userId));
        affected.push({ usuarioId: userId, plan: String(sub.plan) });
        safeLog(`[Suscripciones Vencidas] ${userId} downgrade de ${sub.plan} → free`);
      } else {
        safeWarn(`[Suscripciones Vencidas] Suscripción ${sub.id} sin userId en metadata`);
      }
    }

    safeLog(`[Suscripciones Vencidas] Procesadas: ${expired.length} suscripciones vencidas`);
    return NextResponse.json({
      ok: true,
      procesadas: expired.length,
      downgraded: affected,
      gracePeriodDays,
    });
  } catch (e) {
    safeWarn('[Suscripciones Vencidas] Error:', (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
