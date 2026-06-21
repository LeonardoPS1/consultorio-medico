import { NextRequest, NextResponse } from 'next/server';
import { pushService } from '@/lib/services/push';
import { notificacionesService } from '@/lib/services/notificaciones';
import { apiHandler, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { pushSubscriptionSchema } from '@/lib/validations';

// GET /api/notificaciones/push?action=public-key
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const userId = session.user.id;

  const action = request.nextUrl.searchParams.get('action');

  if (action === 'public-key') {
    return NextResponse.json({
      publicKey: pushService.getPublicKey(),
      configured: pushService.isConfigured(),
    });
  }

  if (action === 'subscriptions') {
    const subs = await pushService.getSubscriptions({ usuarioId: userId });
    return NextResponse.json({
      data: subs.map((s) => ({
        id: s.id,
        endpoint: s.endpoint,
        userAgent: s.userAgent,
        activa: s.activa,
        createdAt: s.createdAt,
      })),
      total: subs.length,
    });
  }

  fail('Acción no válida');
});

// POST /api/notificaciones/push
// Body: { action: 'subscribe' | 'unsubscribe' | 'unsubscribe-all' | 'send', ... }
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const userId = session.user.id;

  const body = await request.json();
  const { action } = body;

  switch (action) {
    case 'subscribe': {
      // Validar el subscription contra el schema compartido
      pushSubscriptionSchema.parse(body);
      const { subscription, userAgent } = body;
      if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
        fail('Suscripción inválida');
      }

      const result = await pushService.subscribe(
        subscription,
        userAgent || request.headers.get('user-agent') || undefined,
        { usuarioId: userId, tenantId: session.user?.tenantId },
      );

      return NextResponse.json(result);
    }

    case 'unsubscribe': {
      const { endpoint } = body;
      if (!endpoint) {
        fail('Endpoint requerido');
      }

      const result = await pushService.unsubscribe(endpoint, { usuarioId: userId });
      return NextResponse.json(result);
    }

    case 'unsubscribe-all': {
      const result = await pushService.unsubscribeAll({ usuarioId: userId });
      return NextResponse.json(result);
    }

    case 'send': {
      // Solo admin puede enviar push manualmente
      if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
        fail('Solo administradores', 403);
      }

      const { usuarioId, title, body: pushBody, url, tipo } = body;
      if (!usuarioId || !title) {
        fail('usuarioId y title requeridos');
      }

      // Crear notificación in-app
      await notificacionesService.create({
        usuarioId,
        titulo: title,
        descripcion: pushBody,
        tipo: tipo || 'sistema',
        href: url,
      });

      // Enviar push
      const result = await pushService.sendToUser({ usuarioId }, {
        title,
        body: pushBody || '',
        url,
        tipo,
      });

      return NextResponse.json(result);
    }

    default:
      fail('Acción no válida');
  }
});
