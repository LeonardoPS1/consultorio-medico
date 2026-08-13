import { eq, and, sql, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { bloqueosAgenda } from '@/drizzle/schema';
import { db } from '@/lib/db';

/**
 * GET /api/medicos/[id]/bloqueos
 *
 * Lista todos los bloqueos de agenda de un médico (vacaciones, feriados, etc.)
 * Query params: desde, hasta (filtro por rango de fechas)
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @param {object} root0 - Contexto de la ruta.
 * @param {Promise<{ id: string }>} root0.params - Promesa con los parámetros dinámicos de la ruta.
 * @returns {Promise<NextResponse>} La respuesta JSON con los bloqueos.
 */
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await paramsPromise;
  try {
    const medicoId = id;
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');

    let whereConditions = eq(bloqueosAgenda.medicoId, medicoId);

    if (desde) {
      whereConditions = and(
        whereConditions,
        sql`${bloqueosAgenda.fechaFin} >= ${desde}::timestamptz`,
      )!;
    }
    if (hasta) {
      whereConditions = and(
        whereConditions,
        sql`${bloqueosAgenda.fechaInicio} <= ${hasta}::timestamptz`,
      )!;
    }

    const bloqueos = await db
      .select()
      .from(bloqueosAgenda)
      .where(whereConditions)
      .orderBy(desc(bloqueosAgenda.fechaInicio));

    return NextResponse.json({ data: bloqueos, total: bloqueos.length });
  } catch (error) {
    console.error('[API] Error GET bloqueos:', error);
    return NextResponse.json({ error: 'Error al obtener bloqueos' }, { status: 500 });
  }
}

/**
 * POST /api/medicos/[id]/bloqueos
 *
 * Crea un nuevo bloqueo de agenda para un médico.
 * Body: { titulo, fechaInicio, fechaFin, tipo?, motivo? }
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @param {object} root0 - Contexto de la ruta.
 * @param {Promise<{ id: string }>} root0.params - Promesa con los parámetros dinámicos de la ruta.
 * @returns {Promise<NextResponse>} El bloqueo creado o un error.
 */
export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await paramsPromise;
  try {
    const medicoId = id;
    const body = (await request.json()) as {
      titulo?: string;
      fechaInicio?: string;
      fechaFin?: string;
      tipo?: string;
      motivo?: string | null;
    };
    const { titulo, fechaInicio, fechaFin, tipo, motivo } = body;

    if (!titulo?.trim() || !fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'titulo, fechaInicio y fechaFin son obligatorios' },
        { status: 400 },
      );
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (inicio > fin) {
      return NextResponse.json(
        { error: 'fechaInicio debe ser anterior a fechaFin' },
        { status: 400 },
      );
    }

    const [nuevo] = await db
      .insert(bloqueosAgenda)
      .values({
        medicoId,
        titulo: titulo.trim(),
        fechaInicio: inicio,
        fechaFin: fin,
        tipo: tipo || 'bloqueo',
        motivo: motivo || null,
      })
      .returning();

    return NextResponse.json({ data: nuevo }, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST bloqueo:', error);
    return NextResponse.json({ error: 'Error al crear bloqueo' }, { status: 500 });
  }
}
