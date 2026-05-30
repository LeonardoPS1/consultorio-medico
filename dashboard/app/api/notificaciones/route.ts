import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { preferenciasNotificaciones } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { notificacionesService } from '@/lib/services/notificaciones';

// ─── GET /api/notificaciones ────────────────────────────────
// Query params: ?tipo=turno&soloNoLeidas=true&limit=20&offset=0
// También funciona sin params para obtener preferencias (backward compat)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Si hay ?preferencias=true, devolver solo preferencias (backward compat)
    if (searchParams.get('preferencias') === 'true' || !searchParams.toString()) {
      let prefs = await db
        .select()
        .from(preferenciasNotificaciones)
        .where(eq(preferenciasNotificaciones.usuarioId, session.user.id))
        .limit(1);

      if (prefs.length === 0) {
        return NextResponse.json({
          data: {
            urgenciasWhatsapp: true,
            resumenDiarioEmail: true,
            alertasAusentismo: true,
            nuevosPacientes: false,
            whatsappPersonal: '',
          },
        });
      }
      return NextResponse.json({ data: prefs[0] });
    }

    // Listar notificaciones del usuario
    const tipo = searchParams.get('tipo') || undefined;
    const soloNoLeidas = searchParams.get('soloNoLeidas') === 'true';
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
    const offset = Number(searchParams.get('offset')) || 0;

    const result = await notificacionesService.list(session.user.id, {
      limit,
      offset,
      tipo,
      soloNoLeidas,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Notificaciones GET]', error);
    return NextResponse.json({ error: 'Error al cargar notificaciones' }, { status: 500 });
  }
}

// ─── PUT /api/notificaciones ────────────────────────────────
// Actualizar preferencias de notificaciones
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { urgenciasWhatsapp, resumenDiarioEmail, alertasAusentismo, nuevosPacientes, whatsappPersonal } = body;

    const existing = await db
      .select()
      .from(preferenciasNotificaciones)
      .where(eq(preferenciasNotificaciones.usuarioId, session.user.id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(preferenciasNotificaciones)
        .set({
          urgenciasWhatsapp: urgenciasWhatsapp ?? true,
          resumenDiarioEmail: resumenDiarioEmail ?? true,
          alertasAusentismo: alertasAusentismo ?? true,
          nuevosPacientes: nuevosPacientes ?? false,
          whatsappPersonal: whatsappPersonal ?? '',
          updatedAt: new Date(),
        })
        .where(eq(preferenciasNotificaciones.usuarioId, session.user.id));
    } else {
      await db.insert(preferenciasNotificaciones).values({
        usuarioId: session.user.id,
        urgenciasWhatsapp: urgenciasWhatsapp ?? true,
        resumenDiarioEmail: resumenDiarioEmail ?? true,
        alertasAusentismo: alertasAusentismo ?? true,
        nuevosPacientes: nuevosPacientes ?? false,
        whatsappPersonal: whatsappPersonal ?? '',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Notificaciones PUT]', error);
    return NextResponse.json({ error: 'Error al guardar preferencias' }, { status: 500 });
  }
}

// ─── POST /api/notificaciones ───────────────────────────────
// Acciones masivas: { action: 'leidas' } → marca todas como leídas
// También: { action: 'create', ... } → crear notificación (admin)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'leidas') {
      await notificacionesService.marcarTodasLeidas(session.user.id);
      return NextResponse.json({ success: true });
    }

    if (action === 'create') {
      const { titulo, descripcion, tipo, href } = body;
      if (!titulo) {
        return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
      }
      const nueva = await notificacionesService.create({
        usuarioId: session.user.id,
        titulo,
        descripcion,
        tipo,
        href,
      });
      return NextResponse.json({ data: nueva }, { status: 201 });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('[Notificaciones POST]', error);
    return NextResponse.json({ error: 'Error al procesar' }, { status: 500 });
  }
}
