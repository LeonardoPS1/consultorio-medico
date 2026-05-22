import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recetas, pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql, count, like, or } from 'drizzle-orm';

/**
 * GET /api/recetas
 *
 * Lista recetas con filtro opcional por estado y estadísticas.
 *
 * Query params:
 * - estado: activa | vencida | historial (opcional)
 * - search: búsqueda por paciente o medicamento
 * - limit: cantidad máxima (default 50)
 * - offset: paginación (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 100;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0;

    // Condiciones
    const whereConditions = and(
      estado ? eq(recetas.estado, estado) : undefined,
    );

    // Contar recetas por estado
    const [{ activas }] = await db
      .select({ activas: count() })
      .from(recetas)
      .where(and(eq(recetas.estado, 'activa')));

    const [{ vencidas }] = await db
      .select({ vencidas: count() })
      .from(recetas)
      .where(and(eq(recetas.estado, 'vencida')));

    const [{ historial }] = await db
      .select({ historial: count() })
      .from(recetas)
      .where(and(eq(recetas.estado, 'historial')));

    const [{ total }] = await db
      .select({ total: count() })
      .from(recetas)
      .where(whereConditions);

    // Lista de recetas con join a pacientes
    const lista = await db
      .select({
        id: recetas.id,
        pacienteId: recetas.pacienteId,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        estado: recetas.estado,
        medicamento: recetas.medicamento,
        dosis: recetas.dosis,
        frecuencia: recetas.frecuencia,
        duracion: recetas.duracion,
        indicaciones: recetas.indicaciones,
        fechaInicio: recetas.fechaInicio,
        fechaFin: recetas.fechaFin,
        renovable: sql<boolean>`${recetas.recetaAnteriorId} IS NOT NULL`,
        createdAt: recetas.createdAt,
      })
      .from(recetas)
      .leftJoin(pacientes, eq(recetas.pacienteId, pacientes.id))
      .where(whereConditions)
      .orderBy(recetas.createdAt)
      .limit(limit)
      .offset(offset);

    const data = lista.map((r) => ({
      id: r.id,
      paciente: `${r.pacienteNombre || ''} ${r.pacienteApellido || ''}`.trim() || 'Paciente',
      medicamento: r.medicamento,
      dosis: r.dosis,
      duracion: r.duracion || r.frecuencia,
      estado: r.estado,
      indicaciones: r.indicaciones || undefined,
      vence: r.fechaFin || r.fechaInicio,
      fechaCreacion: r.createdAt
        ? new Date(r.createdAt).toISOString().split('T')[0]
        : '',
      renovable: r.renovable,
    }));

    return NextResponse.json({
      data,
      total: Number(total),
      activas: Number(activas),
      vencidas: Number(vencidas),
      historial: Number(historial),
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API] Error GET /api/recetas:', error);
    return NextResponse.json(
      { error: 'Error al obtener recetas' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/recetas
 *
 * Crea una nueva receta.
 *
 * Body (JSON):
 * - pacienteId: string (obligatorio)
 * - medicamento: string (obligatorio)
 * - dosis: string (obligatorio)
 * - frecuencia: string (opcional)
 * - duracion: string (opcional)
 * - indicaciones: string (opcional)
 * - medicoId: string (opcional, usa el primer médico disponible si no se envía)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      pacienteId,
      medicamento,
      dosis,
      frecuencia,
      duracion,
      indicaciones,
      medicoId,
    } = body;

    // Validación
    if (!pacienteId || !medicamento?.trim() || !dosis?.trim()) {
      return NextResponse.json(
        { error: 'pacienteId, medicamento y dosis son obligatorios' },
        { status: 400 },
      );
    }

    // Verificar que el paciente existe
    const paciente = await db
      .select({ id: pacientes.id })
      .from(pacientes)
      .where(and(eq(pacientes.id, pacienteId), sql`${pacientes.deletedAt} IS NULL`))
      .limit(1);

    if (paciente.length === 0) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 },
      );
    }

    // Si no se especifica médico, usar el primero disponible
    let medicoFinal = medicoId;
    if (!medicoFinal) {
      const primerMedico = await db
        .select({ id: medicos.id })
        .from(medicos)
        .where(sql`${medicos.deletedAt} IS NULL`)
        .limit(1);
      if (primerMedico.length > 0) {
        medicoFinal = primerMedico[0].id;
      }
    }

    // Crear receta
    const fechaInicio = new Date().toISOString().split('T')[0];
    const fechaFin = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .split('T')[0];

    const [nueva] = await db
      .insert(recetas)
      .values({
        pacienteId,
        medicoId: medicoFinal || pacienteId,
        medicamento: medicamento.trim(),
        dosis: dosis.trim(),
        frecuencia: frecuencia?.trim() || duracion?.trim() || 'Según indicación',
        duracion: duracion?.trim() || null,
        indicaciones: indicaciones?.trim() || null,
        fechaInicio,
        fechaFin,
        estado: 'activa',
      })
      .returning();

    return NextResponse.json({ data: nueva }, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/recetas:', error);
    return NextResponse.json(
      { error: 'Error al crear receta' },
      { status: 500 },
    );
  }
}
