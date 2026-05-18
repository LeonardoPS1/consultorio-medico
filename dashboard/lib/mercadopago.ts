/**
 * Cliente y helpers de MercadoPago.
 *
 * Documentación SDK: https://github.com/mercadopago/sdk-nodejs
 */

import { MercadoPagoConfig, Preference, Payment, MerchantOrder } from 'mercadopago';

// ─── Planes disponibles ─────────────────────────────────────
export interface PlanInfo {
  id: string;
  nombre: string;
  precio: number;       // en ARS
  descripcion: string;
  features: string[];
}

export const PLANES: Record<string, PlanInfo> = {
  starter: {
    id: 'starter',
    nombre: 'Starter',
    precio: 4900,
    descripcion: 'Para consultorios individuales',
    features: [
      'Hasta 500 pacientes',
      'Gestión de turnos',
      'WhatsApp básico',
      'Recetas digitales',
      'Reportes esenciales',
      'Soporte por email',
    ],
  },
  professional: {
    id: 'professional',
    nombre: 'Profesional',
    precio: 9900,
    descripcion: 'Para consultorios en crecimiento',
    features: [
      'Todo lo de Starter +',
      'IA Assistant ilimitado',
      'Múltiples profesionales',
      'Reportes avanzados',
      'Exportación Excel/PDF',
      'Soporte prioritario',
    ],
  },
  premium: {
    id: 'premium',
    nombre: 'Premium',
    precio: 19900,
    descripcion: 'Para clínicas medianas',
    features: [
      'Todo lo de Profesional +',
      'Integración n8n completa',
      'Workflows personalizados',
      'Google Calendar sync',
      '2FA y auditoría',
      'Backup encriptado',
      'Soporte 24/7',
    ],
  },
  enterprise: {
    id: 'enterprise',
    nombre: 'Enterprise',
    precio: 49900,
    descripcion: 'Para grandes centros médicos',
    features: [
      'Todo lo de Premium +',
      'On-premise disponible',
      'SLA garantizado',
      'Capacitación del equipo',
      'Integraciones custom',
      'API dedicada',
      'Gerente de cuenta',
    ],
  },
};

// ─── Cliente ─────────────────────────────────────────────────
function getClient(): MercadoPagoConfig | null {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;
  return new MercadoPagoConfig({ accessToken: token });
}

// ─── Crear preferencia de pago ───────────────────────────────
export interface CreatePreferenceResult {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export async function createCheckoutPreference(
  planId: string,
  externalReference: string,
  payerEmail?: string
): Promise<CreatePreferenceResult | null> {
  const client = getClient();
  if (!client) return null;

  const plan = PLANES[planId];
  if (!plan) throw new Error(`Plan no válido: ${planId}`);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const preference = new Preference(client);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    items: [
      {
        id: plan.id,
        title: `AiCoreMed - Plan ${plan.nombre}`,
        description: plan.descripcion,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: plan.precio,
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
    ...(process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-') && {
      marketplace: 'NONE',
      purpose: 'wallet_purchase',
    }),
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
