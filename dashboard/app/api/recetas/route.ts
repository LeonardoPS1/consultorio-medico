import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recetas, pacientes } from '@/drizzle/schema';
import { eq, and, sql, count } from 'drizzle-orm';

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
