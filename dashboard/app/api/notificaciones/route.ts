import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { preferenciasNotificaciones } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let prefs = await db
      .select()
      .from(preferenciasNotificaciones)
      .where(eq(preferenciasNotificaciones.usuarioId, session.user.id))
      .limit(1);

    if (prefs.length === 0) {
      // Devolver defaults
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
  } catch (error) {
    console.error('[Notificaciones GET]', error);
    return NextResponse.json({ error: 'Error al cargar preferencias' }, { status: 500 });
  }
}

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
