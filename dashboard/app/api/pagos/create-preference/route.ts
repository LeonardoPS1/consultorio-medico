import { NextResponse } from 'next/server';
import { createCheckoutPreference } from '@/lib/mercadopago';
import { PAID_PLANS } from '@/lib/planes';
import { apiHandler, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, createPreferenceSchema } from '@/lib/validations';

// POST /api/pagos/create-preference
// Crea una preferencia de pago en MercadoPago para el plan elegido
export const POST = apiHandler(async (request: Request) => {
  const session = await requireAuth();

  if (!session.user?.email) {
    fail('No autorizado', 401);
  }

  const { planId } = await parseBody(request as any, createPreferenceSchema);

  if (!PAID_PLANS.includes(planId as (typeof PAID_PLANS)[number])) {
    fail('Plan no válido');
  }

  // external_reference = orgId o userId para identificar al pagador
  const externalReference = JSON.stringify({
    userId: session.user.id || session.user.email,
    email: session.user.email,
    plan: planId,
  });

  const result = await createCheckoutPreference(
    planId,
    externalReference,
    session.user.email ?? undefined,
  );

  if (!result) {
    fail('MercadoPago no configurado. Revisá MERCADOPAGO_ACCESS_TOKEN.', 500);
  }

  return NextResponse.json({
    preferenceId: result!.id,
    initPoint: result!.init_point,
    sandboxInitPoint: result!.sandbox_init_point,
  });
});
