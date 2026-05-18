import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createCheckoutPreference } from '@/lib/mercadopago';

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

    const validPlans = ['starter', 'professional', 'premium', 'enterprise'];
    if (!validPlans.includes(planId)) {
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
    console.error('[create-preference] Error:', error);
    return NextResponse.json(
      { error: 'Error al crear preferencia de pago' },
      { status: 500 }
    );
  }
}
