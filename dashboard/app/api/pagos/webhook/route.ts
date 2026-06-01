import { NextResponse } from 'next/server';
import { getPaymentById, getMerchantOrderById } from '@/lib/mercadopago';
import { PLANES, type PlanId } from '@/lib/planes';
import { db } from '@/lib/db';
import { suscripciones } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { usuarios } from '@/drizzle/schema';
import { getUserByEmail } from '@/lib/data-store';
import { createHmac, timingSafeEqual } from 'crypto';

// ─── Verificar firma de MercadoPago ──────────────────────────
function verifySignature(
  signatureHeader: string | null,
  body: { data?: { id?: string | number } },
  querySecret: string | null,
  secret: string
): boolean {
  // Método 1: Firma HMAC en header x-signature (recomendado por MP)
  if (signatureHeader) {
    const parts: Record<string, string> = {};
    for (const part of signatureHeader.split(',')) {
      const [k, v] = part.trim().split('=');
      if (k && v) parts[k] = v;
    }
    const ts = parts['ts'];
    const v1 = parts['v1'];

    if (ts && v1) {
      // MP firma: HMAC-SHA256(secreto, "ts.{data_id}")
      const dataId = String(body.data?.id || '');
      const signedPayload = `ts.${dataId}`;
      const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

      try {
        return timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
      } catch {
        return false;
      }
    }
  }

  // Método 2: Query param ?secret= (fallback para testing manual)
  if (querySecret && querySecret === secret) {
    return true;
  }

  return false;
}

// POST /api/pagos/webhook
// Webhook de MercadoPago (IPN) - notificaciones de pago
export async function POST(request: Request) {
  try {
    // Leer body crudo una sola vez
    const rawBody = await request.text();
    let body: { type?: string; data?: { id?: string | number } };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
    }

    // Validar firma de MercadoPago (x-signature con HMAC-SHA256)
    // 🔴 OBLIGATORIO en producción — sin firma válida se rechaza
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[MP Webhook] MERCADOPAGO_WEBHOOK_SECRET no configurado — rechazando');
        return NextResponse.json({ ok: false, error: 'Server config error' }, { status: 500 });
      }
      console.warn('[MP Webhook] MERCADOPAGO_WEBHOOK_SECRET no configurado — saltando validación (solo desarrollo)');
    } else {
      const signatureHeader = request.headers.get('x-signature');
      const url = new URL(request.url);
      const querySecret = url.searchParams.get('secret');
      const isValid = verifySignature(signatureHeader, body, querySecret, webhookSecret);
      if (!isValid) {
        console.warn('[MP Webhook] Firma inválida');
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
      }
    }
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
  const plan = PLANES[planId as PlanId];

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
        metadata: { payerEmail, externalRef, userId: refData.userId },
      });
    }

    // ACTUALIZAR el plan del usuario para que tenga efecto inmediato en features
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
          console.log(`[MP Webhook] ✅ Plan actualizado a ${planId} para usuario ${user.email}`);
        }
      } catch (err) {
        console.error('[MP Webhook] Error actualizando usuario.plan:', err);
      }
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
