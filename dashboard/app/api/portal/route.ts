import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pacientes, turnos, recetas, medicos } from '@/drizzle/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';

/**
 * GET /api/portal/paciente?telefono=+54911...
 *
 * Endpoint publico para el portal del paciente.
 * Busca por telefono y devuelve datos + turnos + recetas.
 * No requiere autenticacion.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get('telefono');

    if (!telefono) {
      return NextResponse.json(
        { error: 'telefono es requerido' },
        { status: 400 },
      );
    }

    // Buscar paciente
    const [paciente] = await db
      .select({
        id: pacientes.id,
        nombre: pacientes.nombre,
        apellido: pacientes.apellido,
        telefono: pacientes.telefono,
        email: pacientes.email,
        obraSocial: pacientes.obraSocial,
      })
      .from(pacientes)
      .where(
        and(
          eq(pacientes.telefono, telefono),
          sql`${pacientes.deletedAt} IS NULL`,
        ),
      );

    if (!paciente) {
      return NextResponse.json(
        { error: 'No se encontro un paciente con ese telefono' },
        { status: 404 },
      );
    }

    // Turnos (solo futuros y ultimos 3 pasados)
    const now = new Date().toISOString();
    const turnosList = await db
      .select({
        id: turnos.id,
        fechaHora: turnos.fechaHora,
        estado: turnos.estado,
        tipoConsulta: turnos.tipoConsulta,
        motivo: turnos.motivo,
        medicoNombre: medicos.nombre,
        duracionMinutos: turnos.duracionMinutos,
      })
      .from(turnos)
      .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
      .where(
        and(
          eq(turnos.pacienteId, paciente.id),
          sql`${turnos.deletedAt} IS NULL`,
        ),
      )
      .orderBy(desc(turnos.fechaHora))
      .limit(20);

    // Recetas
    const recetasList = await db
      .select({
        id: recetas.id,
        medicamento: recetas.medicamento,
        dosis: recetas.dosis,
        frecuencia: recetas.frecuencia,
        duracion: recetas.duracion,
        indicaciones: recetas.indicaciones,
        estado: recetas.estado,
        fechaInicio: recetas.fechaInicio,
        fechaFin: recetas.fechaFin,
        medicoNombre: medicos.nombre,
      })
      .from(recetas)
      .leftJoin(medicos, eq(recetas.medicoId, medicos.id))
      .where(eq(recetas.pacienteId, paciente.id))
      .orderBy(desc(recetas.createdAt))
      .limit(20);

    return NextResponse.json({
      data: {
        paciente,
        turnos: turnosList,
        recetas: recetasList,
        stats: {
          totalTurnos: turnosList.length,
          totalRecetas: recetasList.length,
        },
      },
    });
  } catch (error) {
    console.error('[API] Error portal/paciente:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos del paciente' },
      { status: 500 },
    );
  }
}
