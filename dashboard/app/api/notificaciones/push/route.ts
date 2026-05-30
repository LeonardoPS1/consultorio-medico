import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pushService } from '@/lib/services/push';
import { notificacionesService } from '@/lib/services/notificaciones';

// GET /api/notificaciones/push?action=public-key
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get('action');

  if (action === 'public-key') {
    return NextResponse.json({
      publicKey: pushService.getPublicKey(),
      configured: pushService.isConfigured(),
    });
  }

  if (action === 'subscriptions') {
    const subs = await pushService.getSubscriptions(session.user.id);
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

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}

// POST /api/notificaciones/push
// Body: { action: 'subscribe' | 'unsubscribe' | 'unsubscribe-all' | 'send', ... }
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'subscribe': {
        const { subscription, userAgent } = body;
        if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
          return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
        }

        const result = await pushService.subscribe(
          session.user.id,
          subscription,
          userAgent || request.headers.get('user-agent') || undefined,
          (session.user as any).tenantId,
        );

        return NextResponse.json(result);
      }

      case 'unsubscribe': {
        const { endpoint } = body;
        if (!endpoint) {
          return NextResponse.json({ error: 'Endpoint requerido' }, { status: 400 });
        }

        const result = await pushService.unsubscribe(session.user.id, endpoint);
        return NextResponse.json(result);
      }

      case 'unsubscribe-all': {
        const result = await pushService.unsubscribeAll(session.user.id);
        return NextResponse.json(result);
      }

      case 'send': {
        // Solo admin puede enviar push manualmente
        if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
          return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
        }

        const { usuarioId, title, body: pushBody, url, tipo } = body;
        if (!usuarioId || !title) {
          return NextResponse.json({ error: 'usuarioId y title requeridos' }, { status: 400 });
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
        const result = await pushService.sendToUser(usuarioId, {
          title,
          body: pushBody || '',
          url,
          tipo,
        });

        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Push API] Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
