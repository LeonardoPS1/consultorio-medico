import { NextResponse } from 'next/server';
import { getPaymentById, getMerchantOrderById } from '@/lib/mercadopago';
import { PLANES, type PlanId } from '@/lib/planes';
import { db } from '@/lib/db';
import { suscripciones, usuarios, portalPagos, turnos, suscripcionesPaciente } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { getUserByEmail } from '@/lib/data-store';
import { safeLog, safeWarn, safeError } from '@/lib/logger';
import { createHmac, timingSafeEqual } from 'crypto';
import { apiHandler, ok } from '@/lib/api-handler';

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

  // Método 2 (SÓLO DEV): Query param ?secret= (para testing manual con ngrok/localhost)
  if (process.env.NODE_ENV !== 'production' && querySecret && querySecret === secret) {
    return true;
  }

  return false;
}

// POST /api/pagos/webhook
// Webhook de MercadoPago (IPN) - notificaciones de pago
// ⚠️ PÚBLICO — MercadoPago llama a este endpoint sin autenticación
export const POST = apiHandler(async (request: Request) => {
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
      safeError('[MP Webhook] MERCADOPAGO_WEBHOOK_SECRET no configurado — rechazando');
      return NextResponse.json({ ok: false, error: 'Server config error' }, { status: 500 });
    }
    safeWarn('[MP Webhook] MERCADOPAGO_WEBHOOK_SECRET no configurado — saltando validación (solo desarrollo)');
  } else {
    const signatureHeader = request.headers.get('x-signature');
    const url = new URL(request.url);
    const querySecret = url.searchParams.get('secret');
    const isValid = verifySignature(signatureHeader, body, querySecret, webhookSecret);
    if (!isValid) {
      safeWarn('[MP Webhook] Firma inválida');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }
  const { type, data } = body;

  safeLog('[MP Webhook] Recibido:', { type, data });

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
      safeLog('[MP Webhook] Tipo no manejado:', type);
  }

  return ok({ ok: true });
});

// ─── Manejar notificación de pago ────────────────────────────
async function handlePaymentNotification(paymentId: string) {
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    safeWarn('[MP Webhook] Payment no encontrado:', paymentId);
    return;
  }

  const status = payment.status;           // approved, rejected, pending, etc.
  const externalRef = payment.external_reference;
  const payerEmail = payment.payer?.email;
  const merchantOrderId = payment.order?.id;

  safeLog('[MP Webhook] Payment:', { paymentId, status, externalRef, payerEmail });

  if (!externalRef) {
    safeWarn('[MP Webhook] Payment sin external_reference');
    return;
  }

  // ── Detectar si es pago de turno (external_reference = "turno:{turnoId}") ──
  if (externalRef.startsWith('turno:')) {
    await handleTurnoPayment(externalRef.slice(6), paymentId, status, merchantOrderId);
    return;
  }

  // ── Detectar si es pago de paquete (external_reference = "paquete:{suscripcionId}") ──
  if (externalRef.startsWith('paquete:')) {
    await handlePaquetePayment(externalRef.slice(8), paymentId, status);
    return;
  }

  // ── Pago de suscripción (formato original) ──
  let refData: Record<string, string> = {};
  try {
    refData = JSON.parse(externalRef);
  } catch {
    refData = { raw: externalRef };
  }

  const planId = refData.plan || 'starter';
  const plan = PLANES[planId as PlanId];

  if (!plan) {
    safeWarn('[MP Webhook] Plan no encontrado:', planId);
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
          safeLog(`[MP Webhook] ✅ Plan actualizado a ${planId} para usuario ${user.email}`);
        }
      } catch (err) {
        safeError('[MP Webhook] Error actualizando usuario.plan:', err);
      }
    }

    safeLog(`[MP Webhook] ✅ Suscripción ${planId} activada para ${payerEmail}`);
  } else if (['cancelled', 'rejected', 'refunded'].includes(status ?? '')) {
    if (existing.length > 0) {
      await db
        .update(suscripciones)
        .set({ estado: 'cancelled', updatedAt: now })
        .where(eq(suscripciones.id, existing[0].id));
    }
    safeLog(`[MP Webhook] ❌ Pago ${status} para ${payerEmail}`);
  }
}

// ─── Manejar pago de turno individual ────────────────────────
async function handleTurnoPayment(
  turnoId: string,
  paymentId: string,
  status: string | undefined,
  merchantOrderId: string | number | undefined,
) {
  const now = new Date();

  // Buscar el pago en portal_pagos
  const [pago] = await db
    .select()
    .from(portalPagos)
    .where(eq(portalPagos.turnoId, turnoId))
    .orderBy(desc(portalPagos.createdAt))
    .limit(1);

  if (status === 'approved') {
    // Actualizar portal_pagos
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

    // Marcar turno como pagado
    await db
      .update(turnos)
      .set({
        pagado: true,
        metodoPago: 'mercadopago',
        pagadoAt: now,
      })
      .where(eq(turnos.id, turnoId));

    safeLog(`[MP Webhook] ✅ Turno ${turnoId} pagado (MP payment ${paymentId})`);
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
    safeLog(`[MP Webhook] ❌ Pago turno ${turnoId}: ${status}`);
  }
}

// ─── Manejar pago de paquete de turnos ───────────────────────
async function handlePaquetePayment(
  suscripcionId: string,
  paymentId: string,
  status: string | undefined,
) {
  const now = new Date();

  if (status === 'approved') {
    // Activar suscripción (marcar pagada)
    await db
      .update(suscripcionesPaciente)
      .set({
        pagado: true,
        activa: true,
        mercadopagoPaymentId: paymentId,
        updatedAt: now,
      })
      .where(eq(suscripcionesPaciente.id, suscripcionId));

    safeLog(`[MP Webhook] ✅ Paquete suscripción ${suscripcionId} activada (MP payment ${paymentId})`);
  } else if (['cancelled', 'rejected', 'refunded'].includes(status ?? '')) {
    await db
      .update(suscripcionesPaciente)
      .set({
        pagado: false,
        activa: false,
        updatedAt: now,
      })
      .where(eq(suscripcionesPaciente.id, suscripcionId));

    safeLog(`[MP Webhook] ❌ Pago paquete ${suscripcionId}: ${status}`);
  }
}

// ─── Manejar notificación de merchant_order ──────────────────
async function handleMerchantOrderNotification(orderId: string) {
  const order = await getMerchantOrderById(orderId);
  if (!order) {
    safeWarn('[MP Webhook] Merchant order no encontrada:', orderId);
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
