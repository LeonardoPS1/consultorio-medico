import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { horariosAtencion } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let horarios = await db.select().from(horariosAtencion).orderBy(horariosAtencion.dia);

    // Si no hay horarios, devolver defaults
    if (horarios.length === 0) {
      horarios = DIAS_SEMANA.map((dia, i) => ({
        id: '',
        dia,
        activo: i < 6,
        inicio: '09:00',
        fin: i < 5 ? '18:00' : '13:00',
        tenantId: '00000000-0000-0000-0000-000000000000',
        sucursalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }

    return NextResponse.json({ data: horarios });
  } catch (error) {
    console.error('[Horarios GET]', error);
    return NextResponse.json({ error: 'Error al cargar horarios' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { horarios } = body;

    if (!Array.isArray(horarios)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    // Upsert each day
    for (const h of horarios) {
      const existing = await db
        .select()
        .from(horariosAtencion)
        .where(eq(horariosAtencion.dia, h.dia))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(horariosAtencion)
          .set({
            activo: h.activo,
            inicio: h.inicio,
            fin: h.fin,
            updatedAt: new Date(),
          })
          .where(eq(horariosAtencion.dia, h.dia));
      } else {
        await db.insert(horariosAtencion).values({
          dia: h.dia,
          activo: h.activo,
          inicio: h.inicio,
          fin: h.fin,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Horarios PUT]', error);
    return NextResponse.json({ error: 'Error al guardar horarios' }, { status: 500 });
  }
}
