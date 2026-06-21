/**
 * Cliente y helpers de MercadoPago.
 *
 * Los planes están definidos en lib/planes.ts (fuente única de verdad).
 * Este archivo solo se ocupa de la integración con MercadoPago.
 *
 * Documentación SDK: https://github.com/mercadopago/sdk-nodejs
 */

import { MercadoPagoConfig, Preference, Payment, MerchantOrder } from 'mercadopago';
import { PLANES, PAID_PLANS } from '@/lib/planes';
import type { PlanId } from '@/lib/planes';

// ─── Cliente ─────────────────────────────────────────────────
function getClient(): MercadoPagoConfig | null {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;
  return new MercadoPagoConfig({ accessToken: token });
}

// ─── Crear preferencia de pago (turno individual) ────────────

export interface CreateTurnoPreferenceInput {
  turnoId: string;
  title: string;
  monto: number;
  moneda?: string;
  pacienteNombre: string;
  pacienteEmail?: string;
  pacienteId: string;
}

/**
 * Crea una preferencia de pago en MercadoPago para un turno individual.
 * Usa external_reference con formato "turno:{turnoId}" para identificar el pago.
 */
export async function createTurnoPaymentPreference(
  input: CreateTurnoPreferenceInput
): Promise<CreatePreferenceResult | null> {
  const client = getClient();
  if (!client) return null;

  const isDev = process.env.NODE_ENV === 'development';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isDev ? 'http://localhost:3000' : 'https://med.aicorebots.com');
  const currency = input.moneda || process.env.MERCADOPAGO_CURRENCY || 'CLP';

  const preference = new Preference(client);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    items: [
      {
        id: input.turnoId,
        title: input.title,
        description: `Atención médica - ${input.pacienteNombre}`,
        quantity: 1,
        currency_id: currency,
        unit_price: input.monto,
      },
    ],
    payer: {
      ...(input.pacienteEmail ? { email: input.pacienteEmail } : {}),
      name: input.pacienteNombre,
    },
    external_reference: `turno:${input.turnoId}`,
    auto_return: 'approved',
    back_urls: {
      success: `${baseUrl}/portal/turnos`,
      failure: `${baseUrl}/portal/turnos?pago=fallido`,
      pending: `${baseUrl}/portal/turnos?pago=pendiente`,
    },
    notification_url: `${baseUrl}/api/pagos/webhook`,
  };

  const result = await preference.create({ body });
  if (!result.id) {
    throw new Error('MercadoPago no devolvió un ID de preferencia');
  }
  return {
    id: result.id,
    init_point: result.init_point ?? '',
    sandbox_init_point: result.sandbox_init_point ?? '',
  };
}

// ─── Crear preferencia de pago (suscripción) ────────────────
export interface CreatePreferenceResult {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

/**
 * Crea una preferencia de pago en MercadoPago.
 * La moneda se configura via MERCADOPAGO_CURRENCY (default CLP para Chile).
 */
export async function createCheckoutPreference(
  planId: string,
  externalReference: string,
  payerEmail?: string
): Promise<CreatePreferenceResult | null> {
  const client = getClient();
  if (!client) return null;

  const plan = PLANES[planId as PlanId];
  if (!plan) throw new Error(`Plan no valido: ${planId}`);

  const isDev = process.env.NODE_ENV === 'development';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isDev ? 'http://localhost:3000' : 'https://med.aicorebots.com');
  const currency = process.env.MERCADOPAGO_CURRENCY || 'CLP';
  const price = currency === 'CLP' ? plan.precioCLP : plan.precioUSD;

  const preference = new Preference(client);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    items: [
      {
        id: plan.id,
        title: `AiCoreMed - Plan ${plan.nombre}`,
        description: plan.descripcion,
        quantity: 1,
        currency_id: currency,
        unit_price: price,
      },
    ],
    payer: payerEmail ? { email: payerEmail } : undefined,
    external_reference: externalReference,
    auto_return: 'approved',
    back_urls: {
      success: process.env.MERCADOPAGO_SUCCESS_URL || `${baseUrl}/dashboard/configuracion?tab=suscripcion`,
      failure: process.env.MERCADOPAGO_FAILURE_URL || `${baseUrl}/dashboard/configuracion?tab=suscripcion`,
      pending: process.env.MERCADOPAGO_PENDING_URL || `${baseUrl}/dashboard/configuracion?tab=suscripcion`,
    },
    notification_url: `${baseUrl}/api/pagos/webhook`,
  };

  const result = await preference.create({ body });
  if (!result.id) {
    throw new Error('MercadoPago no devolvió un ID de preferencia');
  }
  return {
    id: result.id,
    init_point: result.init_point ?? '',
    sandbox_init_point: result.sandbox_init_point ?? '',
  };
}

// ─── Obtener pago por ID ─────────────────────────────────────
export async function getPaymentById(paymentId: string) {
  const client = getClient();
  if (!client) return null;

  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}

// ─── Obtener merchant order por ID ───────────────────────────
export async function getMerchantOrderById(orderId: string) {
  const client = getClient();
  if (!client) return null;

  const order = new MerchantOrder(client);
  return order.get({ merchantOrderId: orderId });
}
