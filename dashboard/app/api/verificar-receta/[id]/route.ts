import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recetas, pacientes, medicos } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/verificar-receta/[id]
 *
 * Endpoint publico para verificar la autenticidad de una receta
 * mediante el codigo QR impreso en el PDF.
 * No requiere autenticacion.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const [receta] = await db
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
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        medicoNombre: medicos.nombre,
        medicoMatricula: medicos.matricula,
        createdAt: recetas.createdAt,
      })
      .from(recetas)
      .leftJoin(pacientes, eq(recetas.pacienteId, pacientes.id))
      .leftJoin(medicos, eq(recetas.medicoId, medicos.id))
      .where(eq(recetas.id, params.id));

    if (!receta) {
      return NextResponse.json(
        { error: 'Receta no encontrada', valida: false },
        { status: 404 },
      );
    }

    return NextResponse.json({
      valida: true,
      receta: {
        medicamento: receta.medicamento,
        dosis: receta.dosis,
        frecuencia: receta.frecuencia,
        duracion: receta.duracion,
        indicaciones: receta.indicaciones,
        estado: receta.estado,
        fechaInicio: receta.fechaInicio,
        fechaFin: receta.fechaFin,
        paciente: `${receta.pacienteNombre || ''} ${receta.pacienteApellido || ''}`.trim(),
        medico: receta.medicoNombre || 'No especificado',
        matricula: receta.medicoMatricula || null,
        emitida: receta.createdAt,
      },
    });
  } catch (error) {
    console.error('[API] Error verificar receta:', error);
    return NextResponse.json(
      { error: 'Error al verificar receta', valida: false },
      { status: 500 },
    );
  }
}
