import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createCheckoutPreference } from '@/lib/mercadopago';
import { PAID_PLANS } from '@/lib/planes';

// POST /api/pagos/create-preference
// Crea una preferencia de pago en MercadoPago para el plan elegido
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Falta planId' }, { status: 400 });
    }

    if (!PAID_PLANS.includes(planId as typeof PAID_PLANS[number])) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 });
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
      session.user.email
    );

    if (!result) {
      return NextResponse.json(
        { error: 'MercadoPago no configurado. Revisá MERCADOPAGO_ACCESS_TOKEN.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    });
  } catch (error) {
    // La SDK de MercadoPago v2 lanza objetos planos (no Error) en errores 4xx/5xx
    let msg = 'Error desconocido';
    if (error instanceof Error) {
      msg = error.message; // errores de red
    } else if (typeof error === 'object' && error !== null) {
      const mpError = error as Record<string, unknown>;
      msg = (mpError.message as string) || (mpError.error as string) || JSON.stringify(error);
      if (mpError.cause) {
        const cause = Array.isArray(mpError.cause) ? mpError.cause[0] : mpError.cause;
        const causeMsg = (cause as Record<string, unknown>)?.description || (cause as Record<string, unknown>)?.code;
        if (causeMsg) msg += ` — ${causeMsg}`;
      }
    }
    console.error('[create-preference] Error:', msg, JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: `Error al crear preferencia de pago: ${msg}` },
      { status: 500 }
    );
  }
}
