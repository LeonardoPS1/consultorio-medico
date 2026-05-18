import { NextResponse } from 'next/server';
import { getPaymentById, getMerchantOrderById, PLANES } from '@/lib/mercadopago';
import { db } from '@/lib/db';
import { suscripciones } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';

// POST /api/pagos/webhook
// Webhook de MercadoPago (IPN) - notificaciones de pago
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    console.log('[MP Webhook] Recibido:', { type, data });

    if (!type || !data?.id) {
      return NextResponse.json({ ok: false, error: 'Payload inválido' }, { status: 400 });
    }

    // Procesar según tipo de notificación
    switch (type) {
      case 'payment':
        await handlePaymentNotification(String(data.id));
        break;
      case 'merchant_order':
        await handleMerchantOrderNotification(String(data.id));
        break;
      default:
        console.log('[MP Webhook] Tipo no manejado:', type);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[MP Webhook] Error:', error);
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 });
  }
}

// ─── Manejar notificación de pago ────────────────────────────
async function handlePaymentNotification(paymentId: string) {
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    console.warn('[MP Webhook] Payment no encontrado:', paymentId);
    return;
  }

  const status = payment.status;           // approved, rejected, pending, etc.
  const externalRef = payment.external_reference;
  const payerEmail = payment.payer?.email;
  const merchantOrderId = payment.order?.id;

  console.log('[MP Webhook] Payment:', { paymentId, status, externalRef, payerEmail });

  // Buscar o crear suscripción por external_reference
  if (!externalRef) {
    console.warn('[MP Webhook] Payment sin external_reference');
    return;
  }

  let refData: Record<string, string> = {};
  try {
    refData = JSON.parse(externalRef);
  } catch {
    refData = { raw: externalRef };
  }

  const planId = refData.plan || 'starter';
  const plan = PLANES[planId];

  if (!plan) {
    console.warn('[MP Webhook] Plan no encontrado:', planId);
    return;
  }

  // Buscar si ya existe una suscripción para este usuario/org
  const existing = await db
    .select()
    .from(suscripciones)
    .where(eq(suscripciones.mercadopagoPreferenceId, paymentId))
    .limit(1);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1); // +1 mes

  if (status === 'approved') {
    if (existing.length > 0) {
      // Actualizar suscripción existente
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
      // Crear nueva suscripción
      await db.insert(suscripciones).values({
        plan: planId,
        estado: 'active',
        mercadopagoPreferenceId: paymentId,
        mercadopagoPaymentId: paymentId,
        mercadopagoMerchantOrderId: merchantOrderId ? String(merchantOrderId) : null,
        periodStart: now,
        periodEnd,
        metadata: { payerEmail, externalRef },
      });
    }
    console.log(`[MP Webhook] ✅ Suscripción ${planId} activada para ${payerEmail}`);
  } else if (['cancelled', 'rejected', 'refunded'].includes(status ?? '')) {
    if (existing.length > 0) {
      await db
        .update(suscripciones)
        .set({ estado: 'cancelled', updatedAt: now })
        .where(eq(suscripciones.id, existing[0].id));
    }
    console.log(`[MP Webhook] ❌ Pago ${status} para ${payerEmail}`);
  }
}

// ─── Manejar notificación de merchant_order ──────────────────
async function handleMerchantOrderNotification(orderId: string) {
  const order = await getMerchantOrderById(orderId);
  if (!order) {
    console.warn('[MP Webhook] Merchant order no encontrada:', orderId);
    return;
  }

  // Extraer payment IDs de la orden
  const payments = order.payments ?? [];
  for (const p of payments) {
    if (p.id) {
      await handlePaymentNotification(String(p.id));
    }
  }
}
