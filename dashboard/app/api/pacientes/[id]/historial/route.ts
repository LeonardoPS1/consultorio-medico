import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { historialMedico } from '@/drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { verifyPacienteAccess } from '@/lib/api-auth';

/**
 * Autenticación compartida para todas las rutas de historial
 */
async function requireAuthForHistorial(request: NextRequest, params: { id: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }
  const sessionMedicoId = session.user?.medicoId;
  const sessionRol = session.user?.role;
  try {
    await verifyPacienteAccess(params.id, sessionMedicoId, sessionRol);
  } catch (e) {
    return { session: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }
  return { session, error: null };
}

/**
 * GET /api/pacientes/[id]/historial
 * Lista entradas del historial médico (desde PostgreSQL)
 */
export async function GET(_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const { error } = await requireAuthForHistorial(_request, { id });
  if (error) return error;

  try {
    const entries = await db
      .select()
      .from(historialMedico)
      .where(eq(historialMedico.pacienteId, id))
      .orderBy(desc(historialMedico.createdAt));

    return NextResponse.json(entries);
  } catch (error) {
    console.error('[API] Error GET historial:', error);
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}

/**
 * POST /api/pacientes/[id]/historial
 * Crea una nueva entrada en el historial médico
 */
export async function POST(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const { error } = await requireAuthForHistorial(request, { id });
  if (error) return error;

  try {
    const body = await request.json();

    if (!body.titulo || !body.tipo) {
      return NextResponse.json({ error: 'titulo y tipo son obligatorios' }, { status: 400 });
    }

    const [entry] = await db
      .insert(historialMedico)
      .values({
        pacienteId: id,
        tipo: body.tipo,
        titulo: body.titulo,
        descripcion: body.descripcion || null,
        diagnosticoCodigo: body.codigo || body.diagnosticoCodigo || null,
        diagnosticoDescripcion: body.diagnosticoDescripcion || null,
        visibleParaPaciente: body.visibleParaPaciente ?? true,
      })
      .returning();

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST historial:', error);
    return NextResponse.json({ error: 'Error al crear entrada de historial' }, { status: 500 });
  }
}

/**
 * PATCH /api/pacientes/[id]/historial?entryId=xxx
 * Actualiza una entrada del historial médico
 */
export async function PATCH(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const { error } = await requireAuthForHistorial(request, { id });
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json({ error: 'entryId es requerido' }, { status: 400 });
    }

    const body = await request.json();

    // Verificar que la entrada existe y pertenece al paciente
    const [existing] = await db
      .select({ id: historialMedico.id })
      .from(historialMedico)
      .where(and(eq(historialMedico.id, entryId), eq(historialMedico.pacienteId, id)));

    if (!existing) {
      return NextResponse.json({ error: 'Entrada de historial no encontrada' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.titulo !== undefined) updateData.titulo = body.titulo;
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
    if (body.codigo !== undefined) updateData.diagnosticoCodigo = body.codigo;
    if (body.diagnosticoCodigo !== undefined) updateData.diagnosticoCodigo = body.diagnosticoCodigo;
    if (body.diagnosticoDescripcion !== undefined)
      updateData.diagnosticoDescripcion = body.diagnosticoDescripcion;
    if (body.visibleParaPaciente !== undefined)
      updateData.visibleParaPaciente = body.visibleParaPaciente;

    const [updated] = await db
      .update(historialMedico)
      .set(updateData)
      .where(eq(historialMedico.id, entryId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] Error PATCH historial:', error);
    return NextResponse.json(
      { error: 'Error al actualizar entrada de historial' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/pacientes/[id]/historial?entryId=xxx
 * Elimina una entrada del historial médico
 */
export async function DELETE(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const { error } = await requireAuthForHistorial(request, { id });
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json({ error: 'entryId es requerido' }, { status: 400 });
    }

    // Verificar que la entrada existe y pertenece al paciente
    const [existing] = await db
      .select({ id: historialMedico.id })
      .from(historialMedico)
      .where(and(eq(historialMedico.id, entryId), eq(historialMedico.pacienteId, id)));

    if (!existing) {
      return NextResponse.json({ error: 'Entrada de historial no encontrada' }, { status: 404 });
    }

    await db.delete(historialMedico).where(eq(historialMedico.id, entryId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error DELETE historial:', error);
    return NextResponse.json({ error: 'Error al eliminar entrada de historial' }, { status: 500 });
  }
}
