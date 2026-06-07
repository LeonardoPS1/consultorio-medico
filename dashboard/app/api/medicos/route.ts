import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { medicos } from '@/drizzle/schema';
import { auth } from '@/lib/auth';
import { medicosService } from '@/lib/services/medicos';

/**
 * GET /api/medicos
 *
 * Lista todos los medicos activos (con cache TTL de 60s).
 * Query params:
 *   sucursalId  - opcional, filtra por sucursal
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get('sucursalId') || undefined;

    const result = await medicosService.list(sucursalId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error GET /api/medicos:', error);
    return NextResponse.json({ error: 'Error al obtener medicos' }, { status: 500 });
  }
}

/**
 * POST /api/medicos
 *
 * Crea un nuevo medico e invalida el cache.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, especialidad, email, telefono, whatsapp, matricula, duracionTurnoMinutos, horarios } = body;

    if (!nombre?.trim() || !especialidad?.trim()) {
      return NextResponse.json({ error: 'nombre y especialidad son obligatorios' }, { status: 400 });
    }

    const [nuevo] = await db
      .insert(medicos)
      .values({
        nombre: nombre.trim(),
        especialidad: especialidad.trim(),
        email: email?.trim() || null,
        telefono: telefono?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        matricula: matricula?.trim() || null,
        duracionTurnoMinutos: duracionTurnoMinutos || 30,
        horarios: horarios || {},
        activo: true,
      })
      .returning();

    // Invalidar cache para que la próxima lectura vea los cambios
    medicosService.invalidate();

    return NextResponse.json({ data: nuevo }, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/medicos:', error);
    return NextResponse.json({ error: 'Error al crear medico' }, { status: 500 });
  }
}
