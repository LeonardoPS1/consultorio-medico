import { NextRequest, NextResponse } from 'next/server';
import { recetasService, verificarHash } from '@/lib/services/recetas';

/**
 * GET /api/verificar-receta/[id]
 *
 * Endpoint público (sin auth) para verificar autenticidad de una receta.
 * Usado por el QR code en las recetas impresas.
 */
export async function GET(_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  try {
    const receta = await recetasService.obtener(id);

    if (!receta) {
      return NextResponse.json(
        {
          valida: false,
          error: 'Receta no encontrada',
          codigo: 'NOT_FOUND',
        },
        { status: 404 },
      );
    }

    const verificacion = verificarHash({
      id: receta.id,
      pacienteId: receta.pacienteId,
      medicamento: receta.medicamento,
      dosis: receta.dosis,
      fechaInicio: receta.fechaInicio,
      hashVerificacion: receta.hashVerificacion,
    });

    const hoy = new Date().toISOString().split('T')[0];
    const vencida = receta.fechaFin ? receta.fechaFin < hoy : false;

    return NextResponse.json({
      valida: verificacion.valido,
      regenerarHash: verificacion.regenerado || null,
      receta: {
        id: receta.id,
        paciente: `${receta.pacienteNombre || ''} ${receta.pacienteApellido || ''}`.trim(),
        medicamento: receta.medicamento,
        presentacion: receta.presentacion,
        dosis: receta.dosis,
        frecuencia: receta.frecuencia,
        duracion: receta.duracion,
        cantidadTotal: receta.cantidadTotal,
        indicaciones: receta.indicaciones,
        fechaInicio: receta.fechaInicio,
        fechaFin: receta.fechaFin,
        estado: receta.estado,
        medico: receta.medicoNombre || '—',
        vencida,
        createdAt: receta.createdAt,
      },
    });
  } catch (error) {
    console.error('[API] Error GET /api/verificar-receta/[id]:', error);
    return NextResponse.json(
      { valida: false, error: 'Error al verificar receta' },
      { status: 500 },
    );
  }
}
