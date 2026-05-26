import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { medicos } from '@/drizzle/schema';
import { eq, and, sql, count } from 'drizzle-orm';

/**
 * GET /api/medicos
 *
 * Lista todos los medicos activos.
 * Query params:
 *   sucursalId  - opcional, filtra por sucursal
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get('sucursalId') || undefined;

    const whereConditions = and(
      sql`${medicos.deletedAt} IS NULL`,
      sucursalId ? eq(medicos.sucursalId, sucursalId) : undefined,
    );

    const lista = await db
      .select()
      .from(medicos)
      .where(whereConditions)
      .orderBy(medicos.nombre);

    const [{ total }] = await db
      .select({ total: count() })
      .from(medicos)
      .where(whereConditions);

    return NextResponse.json({ data: lista, total: Number(total) });
  } catch (error) {
    console.error('[API] Error GET /api/medicos:', error);
    return NextResponse.json({ error: 'Error al obtener medicos' }, { status: 500 });
  }
}

/**
 * POST /api/medicos
 *
 * Crea un nuevo medico.
 */
export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({ data: nuevo }, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/medicos:', error);
    return NextResponse.json({ error: 'Error al crear medico' }, { status: 500 });
  }
}
