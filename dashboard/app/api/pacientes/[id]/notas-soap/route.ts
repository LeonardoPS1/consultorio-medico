import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notasSoap, medicos } from '@/drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

/**
 * GET /api/pacientes/[id]/notas-soap
 * Lista Notas SOAP del paciente (con nombre del médico)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
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
      .where(eq(notasSoap.pacienteId, params.id))
      .orderBy(desc(notasSoap.createdAt));

    return NextResponse.json(list);
  } catch (error) {
    console.error('[API] Error GET notas-soap:', error);
    return NextResponse.json(
      { error: 'Error al obtener Notas SOAP' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/pacientes/[id]/notas-soap
 * Crea una nueva Nota SOAP
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.medicoId) {
      return NextResponse.json(
        { error: 'Debe estar autenticado como médico' },
        { status: 401 },
      );
    }

    const body = await request.json();

    const [nota] = await db
      .insert(notasSoap)
      .values({
        pacienteId: params.id,
        medicoId: session.user.medicoId,
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
    return NextResponse.json(
      { error: 'Error al crear Nota SOAP' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/pacientes/[id]/notas-soap?entryId=xxx
 * Actualiza una Nota SOAP existente
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json(
        { error: 'entryId es requerido' },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Verificar que la nota existe y pertenece al paciente
    const [existing] = await db
      .select({ id: notasSoap.id })
      .from(notasSoap)
      .where(
        and(
          eq(notasSoap.id, entryId),
          eq(notasSoap.pacienteId, params.id),
        ),
      );

    if (!existing) {
      return NextResponse.json(
        { error: 'Nota SOAP no encontrada' },
        { status: 404 },
      );
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
    return NextResponse.json(
      { error: 'Error al actualizar Nota SOAP' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/pacientes/[id]/notas-soap?entryId=xxx
 * Elimina una Nota SOAP
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json(
        { error: 'entryId es requerido' },
        { status: 400 },
      );
    }

    // Verificar que la nota existe y pertenece al paciente
    const [existing] = await db
      .select({ id: notasSoap.id })
      .from(notasSoap)
      .where(
        and(
          eq(notasSoap.id, entryId),
          eq(notasSoap.pacienteId, params.id),
        ),
      );

    if (!existing) {
      return NextResponse.json(
        { error: 'Nota SOAP no encontrada' },
        { status: 404 },
      );
    }

    await db
      .delete(notasSoap)
      .where(eq(notasSoap.id, entryId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error DELETE notas-soap:', error);
    return NextResponse.json(
      { error: 'Error al eliminar Nota SOAP' },
      { status: 500 },
    );
  }
}
