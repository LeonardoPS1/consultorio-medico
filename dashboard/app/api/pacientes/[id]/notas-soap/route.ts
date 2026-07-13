import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notasSoap, medicos } from '@/drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { verifyPacienteAccess } from '@/lib/api-auth';

/**
 * Helper de auth para GET/PATCH/DELETE de notas SOAP
 */
async function requireAuthForNotasSoap(request: NextRequest, params: { id: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }
  const sessionMedicoId = session.user?.medicoId;
  const sessionRol = session.user?.role;
  try {
    await verifyPacienteAccess(params.id, sessionMedicoId, sessionRol);
  } catch {
    return { session: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }
  return { session, error: null };
}

/**
 * GET /api/pacientes/[id]/notas-soap
 * Lista Notas SOAP del paciente (con nombre del médico)
 */
export async function GET(_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const { error } = await requireAuthForNotasSoap(_request, { id });
  if (error) return error;

  try {
    const list = await db
      .select({
        id: notasSoap.id,
        pacienteId: notasSoap.pacienteId,
        medicoId: notasSoap.medicoId,
        turnoId: notasSoap.turnoId,
        subjetivo: notasSoap.subjetivo,
        objetivo: notasSoap.objetivo,
        assessment: notasSoap.assessment,
        plan: notasSoap.plan,
        cie10Codigo: notasSoap.cie10Codigo,
        cie10Descripcion: notasSoap.cie10Descripcion,
        derivarA: notasSoap.derivarA,
        requiereControl: notasSoap.requiereControl,
        controlEnDias: notasSoap.controlEnDias,
        medicoNombre: medicos.nombre,
        createdAt: notasSoap.createdAt,
        updatedAt: notasSoap.updatedAt,
      })
      .from(notasSoap)
      .leftJoin(medicos, eq(notasSoap.medicoId, medicos.id))
      .where(eq(notasSoap.pacienteId, id))
      .orderBy(desc(notasSoap.createdAt));

    return NextResponse.json(list);
  } catch (error) {
    console.error('[API] Error GET notas-soap:', error);
    return NextResponse.json({ error: 'Error al obtener Notas SOAP' }, { status: 500 });
  }
}

/**
 * POST /api/pacientes/[id]/notas-soap
 * Crea una nueva Nota SOAP
 */
export async function POST(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sessionMedicoId = session.user?.medicoId;
    const sessionRol = session.user?.role;
    try {
      await verifyPacienteAccess(id, sessionMedicoId, sessionRol);
    } catch {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Si hay medicoId en sesión se usa; si no (admin sin médico asignado), se toma el primer médico activo
    let medicoFinal = sessionMedicoId;
    if (!medicoFinal) {
      const [primerMedico] = await db
        .select({ id: medicos.id })
        .from(medicos)
        .where(sql`${medicos.deletedAt} IS NULL`)
        .limit(1);
      if (primerMedico) medicoFinal = primerMedico.id;
    }

    if (!medicoFinal) {
      return NextResponse.json(
        { error: 'No hay médicos activos en el sistema. Creá al menos un médico primero.' },
        { status: 400 },
      );
    }

    const body = await request.json();

    const [nota] = await db
      .insert(notasSoap)
      .values({
        pacienteId: id,
        medicoId: medicoFinal,
        turnoId: body.turnoId || null,
        subjetivo: body.subjetivo || null,
        objetivo: body.objetivo || null,
        assessment: body.assessment || null,
        plan: body.plan || null,
        cie10Codigo: body.cie10Codigo || null,
        cie10Descripcion: body.cie10Descripcion || null,
        derivarA: body.derivarA || null,
        requiereControl: body.requiereControl ?? false,
        controlEnDias: body.controlEnDias || null,
      })
      .returning();

    return NextResponse.json(nota, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST notas-soap:', error);
    return NextResponse.json({ error: 'Error al crear Nota SOAP' }, { status: 500 });
  }
}

/**
 * PATCH /api/pacientes/[id]/notas-soap?entryId=xxx
 * Actualiza una Nota SOAP existente
 */
export async function PATCH(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const { error } = await requireAuthForNotasSoap(request, { id });
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json({ error: 'entryId es requerido' }, { status: 400 });
    }

    const body = await request.json();

    // Verificar que la nota existe y pertenece al paciente
    const [existing] = await db
      .select({ id: notasSoap.id })
      .from(notasSoap)
      .where(and(eq(notasSoap.id, entryId), eq(notasSoap.pacienteId, id)));

    if (!existing) {
      return NextResponse.json({ error: 'Nota SOAP no encontrada' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.subjetivo !== undefined) updateData.subjetivo = body.subjetivo;
    if (body.objetivo !== undefined) updateData.objetivo = body.objetivo;
    if (body.assessment !== undefined) updateData.assessment = body.assessment;
    if (body.plan !== undefined) updateData.plan = body.plan;
    if (body.cie10Codigo !== undefined) updateData.cie10Codigo = body.cie10Codigo;
    if (body.cie10Descripcion !== undefined) updateData.cie10Descripcion = body.cie10Descripcion;
    if (body.derivarA !== undefined) updateData.derivarA = body.derivarA;
    if (body.requiereControl !== undefined) updateData.requiereControl = body.requiereControl;
    if (body.controlEnDias !== undefined) updateData.controlEnDias = body.controlEnDias;

    const [updated] = await db
      .update(notasSoap)
      .set(updateData)
      .where(eq(notasSoap.id, entryId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] Error PATCH notas-soap:', error);
    return NextResponse.json({ error: 'Error al actualizar Nota SOAP' }, { status: 500 });
  }
}

/**
 * DELETE /api/pacientes/[id]/notas-soap?entryId=xxx
 * Elimina una Nota SOAP
 */
export async function DELETE(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const { error } = await requireAuthForNotasSoap(request, { id });
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json({ error: 'entryId es requerido' }, { status: 400 });
    }

    // Verificar que la nota existe y pertenece al paciente
    const [existing] = await db
      .select({ id: notasSoap.id })
      .from(notasSoap)
      .where(and(eq(notasSoap.id, entryId), eq(notasSoap.pacienteId, id)));

    if (!existing) {
      return NextResponse.json({ error: 'Nota SOAP no encontrada' }, { status: 404 });
    }

    await db.delete(notasSoap).where(eq(notasSoap.id, entryId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error DELETE notas-soap:', error);
    return NextResponse.json({ error: 'Error al eliminar Nota SOAP' }, { status: 500 });
  }
}
