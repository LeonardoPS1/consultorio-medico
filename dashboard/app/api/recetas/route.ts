import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { recetasService } from '@/lib/services/recetas';

/**
 * GET /api/recetas
 *
 * Lista recetas con filtro opcional por estado y estadísticas.
 *
 * Query params:
 * - estado: activa | vencida | historial (opcional)
 * - search: búsqueda por paciente o medicamento
 * - limit: cantidad máxima (default 100)
 * - offset: paginación (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const sessionMedicoId = (session?.user as any)?.medicoId;
    const sessionRol = (session?.user as any)?.role;
    const isMedico = sessionRol === 'medico' && !!sessionMedicoId;

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 100;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0;

    const result = await recetasService.listar({
      estado,
      limit,
      offset,
      medicoId: isMedico ? sessionMedicoId : null,
    });

    return NextResponse.json(result);
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
 * Crea una nueva receta con firma digital (hash de verificación).
 *
 * Body (JSON):
 * - pacienteId: string (obligatorio)
 * - medicamento: string (obligatorio)
 * - dosis: string (obligatorio)
 * - frecuencia: string (opcional)
 * - duracion: string (opcional)
 * - indicaciones: string (opcional)
 * - presentacion: string (opcional)
 * - cantidadTotal: string (opcional)
 * - medicoId: string (opcional)
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
      presentacion,
      cantidadTotal,
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

    // Resolver médico
    let medicoFinal = medicoId;
    if (!medicoFinal) {
      const session = await auth();
      const sessionMedicoId = (session?.user as any)?.medicoId;
      const sessionRol = (session?.user as any)?.role;
      if (sessionRol === 'medico' && sessionMedicoId) {
        medicoFinal = sessionMedicoId;
      } else {
        const primerMedico = await db
          .select({ id: medicos.id })
          .from(medicos)
          .where(sql`${medicos.deletedAt} IS NULL`)
          .limit(1);
        if (primerMedico.length > 0) {
          medicoFinal = primerMedico[0].id;
        }
      }
    }

    // Crear receta con hash de verificación
    const nueva = await recetasService.crear({
      pacienteId,
      medicamento,
      dosis,
      frecuencia,
      duracion,
      indicaciones,
      presentacion,
      cantidadTotal,
      medicoId: medicoFinal,
    });

    return NextResponse.json({ data: nueva }, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/recetas:', error);
    return NextResponse.json(
      { error: 'Error al crear receta' },
      { status: 500 },
    );
  }
}
