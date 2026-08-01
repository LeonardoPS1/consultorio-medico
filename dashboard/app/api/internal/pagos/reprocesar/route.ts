import { eq, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import {
  suscripciones,
  usuarios,
  portalPagos,
  turnos,
  suscripcionesPaciente,
} from '@/drizzle/schema';
import { getUserByEmail } from '@/lib/data-store';
import { db } from '@/lib/db';
import { safeLog, safeWarn, safeError } from '@/lib/logger';
import { getPaymentById } from '@/lib/mercadopago';
import { PLANES, type PlanId } from '@/lib/planes';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

const GRACE_PERIOD_DAYS = 7;

/**
 * Reprocesa manualmente una notificación de pago de MercadoPago.
 * Solo accesible con x-internal-key (llamado desde ops-console).
 * @param request
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('x-internal-key');
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { paymentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { paymentId } = body;
  if (!paymentId || typeof paymentId !== 'string') {
    return NextResponse.json({ error: 'paymentId es obligatorio' }, { status: 400 });
  }

  try {
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      return NextResponse.json(
        { ok: false, error: `Pago ${paymentId} no encontrado en MercadoPago` },
        { status: 404 },
      );
    }

    const status = payment.status;
    const externalRef = payment.external_reference;
    const payerEmail = payment.payer?.email;
    const merchantOrderId = payment.order?.id;

    safeLog('[Reprocesar Pago] Payment:', { paymentId, status, externalRef, payerEmail });

    if (!externalRef) {
      return NextResponse.json(
        { ok: false, error: 'El pago no tiene external_reference' },
        { status: 400 },
      );
    }

    if (externalRef.startsWith('turno:')) {
      await handleTurnoPayment(externalRef.slice(6), paymentId, status, merchantOrderId);
    } else if (externalRef.startsWith('paquete:')) {
      await handlePaquetePayment(externalRef.slice(8), paymentId, status);
    } else {
      await handleSuscripcionPayment(paymentId, externalRef, status, payerEmail, merchantOrderId);
    }

    return NextResponse.json({
      ok: true,
      paymentId,
      status,
      externalRef,
      reprocesado: true,
    });
  } catch (e) {
    safeError('[Reprocesar Pago] Error:', e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// ─── Pago de suscripción (external_reference = JSON) ─────────
async function handleSuscripcionPayment(
  paymentId: string,
  externalRef: string,
  status: string | undefined,
  payerEmail: string | undefined,
  merchantOrderId: string | number | undefined,
) {
  let refData: Record<string, string> = {};
  try {
    refData = JSON.parse(externalRef);
  } catch {
    refData = { raw: externalRef };
  }

  const planId = refData.plan || 'starter';
  const plan = PLANES[planId as PlanId];

  if (!plan) {
    safeWarn('[Reprocesar Pago] Plan no encontrado:', planId);
    throw new Error(`Plan no encontrado: ${planId}`);
  }

  const existing = await db
    .select()
    .from(suscripciones)
    .where(eq(suscripciones.mercadopagoPreferenceId, paymentId))
    .limit(1);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  if (status === 'approved') {
    if (existing.length > 0) {
      await db
        .update(suscripciones)
        .set({
          estado: 'active',
          mercadopagoPaymentId: paymentId,
          mercadopagoMerchantOrderId: merchantOrderId ? String(merchantOrderId) : null,
          periodStart: now,
          periodEnd,
          updatedAt: now,
        })
        .where(eq(suscripciones.id, existing[0].id));
    } else {
      await db.insert(suscripciones).values({
        plan: planId,
        estado: 'active',
        mercadopagoPreferenceId: paymentId,
        mercadopagoPaymentId: paymentId,
        mercadopagoMerchantOrderId: merchantOrderId ? String(merchantOrderId) : null,
        periodStart: now,
        periodEnd,
        metadata: { payerEmail, externalRef, userId: refData.userId },
      });
    }

    const userId = refData.userId;
    const userEmail = refData.email || payerEmail;
    if (userId || userEmail) {
      try {
        const user = await getUserByEmail(userEmail || '');
        if (user && user.id) {
          await db
            .update(usuarios)
            .set({ plan: planId, updatedAt: now })
            .where(eq(usuarios.id, user.id));
          safeLog(`[Reprocesar Pago] ✅ Plan actualizado a ${planId} para usuario ${user.email}`);
        }
      } catch (err) {
        safeError('[Reprocesar Pago] Error actualizando usuario.plan:', err);
      }
    }

    safeLog(`[Reprocesar Pago] ✅ Suscripción ${planId} activada para ${payerEmail}`);
  } else if (['cancelled', 'rejected', 'refunded'].includes(status ?? '')) {
    if (existing.length > 0) {
      const graceEnd = new Date(now);
      graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
      await db
        .update(suscripciones)
        .set({
          estado: 'past_due',
          periodEnd: graceEnd,
          updatedAt: now,
        })
        .where(eq(suscripciones.id, existing[0].id));
      safeLog(
        `[Reprocesar Pago] ⏳ Pago ${status} — suscripción en período de gracia hasta ${graceEnd.toISOString()}`,
      );
    } else {
      safeLog(`[Reprocesar Pago] ❌ Pago ${status} para ${payerEmail} (sin suscripción previa)`);
    }
  }
}

// ─── Pago de turno individual ────────────────────────────────
async function handleTurnoPayment(
  turnoId: string,
  paymentId: string,
  status: string | undefined,
  merchantOrderId: string | number | undefined,
) {
  const now = new Date();

  const [pago] = await db
    .select()
    .from(portalPagos)
    .where(eq(portalPagos.turnoId, turnoId))
    .orderBy(desc(portalPagos.createdAt))
    .limit(1);

  if (status === 'approved') {
    if (pago) {
      await db
        .update(portalPagos)
        .set({
          estado: 'aprobado',
          mercadopagoPaymentId: paymentId,
          pagadoAt: now,
          updatedAt: now,
          metadata: {
            ...(pago.metadata as Record<string, unknown>),
            merchantOrderId: merchantOrderId ? String(merchantOrderId) : null,
          },
        })
        .where(eq(portalPagos.id, pago.id));
    }

    await db
      .update(turnos)
      .set({
        pagado: true,
        metodoPago: 'mercadopago',
        pagadoAt: now,
      })
      .where(eq(turnos.id, turnoId));

    safeLog(`[Reprocesar Pago] ✅ Turno ${turnoId} pagado (MP payment ${paymentId})`);
  } else if (['cancelled', 'rejected', 'refunded'].includes(status ?? '')) {
    if (pago) {
      await db
        .update(portalPagos)
        .set({
          estado: status,
          updatedAt: now,
        })
        .where(eq(portalPagos.id, pago.id));
    }
    safeLog(`[Reprocesar Pago] ❌ Pago turno ${turnoId}: ${status}`);
  }
}

// ─── Pago de paquete de turnos ───────────────────────────────
async function handlePaquetePayment(
  suscripcionId: string,
  paymentId: string,
  status: string | undefined,
) {
  const now = new Date();

  if (status === 'approved') {
    await db
      .update(suscripcionesPaciente)
      .set({
        pagado: true,
        activa: true,
        mercadopagoPaymentId: paymentId,
        updatedAt: now,
      })
      .where(eq(suscripcionesPaciente.id, suscripcionId));

    safeLog(`[Reprocesar Pago] ✅ Paquete suscripción ${suscripcionId} activada`);
  } else if (['cancelled', 'rejected', 'refunded'].includes(status ?? '')) {
    await db
      .update(suscripcionesPaciente)
      .set({
        pagado: false,
        activa: false,
        updatedAt: now,
      })
      .where(eq(suscripcionesPaciente.id, suscripcionId));

    safeLog(`[Reprocesar Pago] ❌ Pago paquete ${suscripcionId}: ${status}`);
  }
}
