import { eq, desc, and, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import {
  recetas,
  documentosMedicos,
  sucursales,
  pacientes,
  turnos,
  solicitudesDatos,
} from '@/drizzle/schema';
import { db } from '@/lib/db';
import { safeWarn } from '@/lib/logger';
import { getPortalSession } from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

/**
 *
 */
export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const [paciente] = await db
      .select()
      .from(pacientes)
      .where(eq(pacientes.id, session.pacienteId))
      .limit(1);

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    let tenantId: string = '00000000-0000-0000-0000-000000000000';
    if (paciente.sucursalId) {
      const [sucursal] = await db
        .select({ tenantId: sucursales.tenantId })
        .from(sucursales)
        .where(eq(sucursales.id, paciente.sucursalId))
        .limit(1);
      if (sucursal) tenantId = sucursal.tenantId;
    }

    const turnosList = await db
      .select()
      .from(turnos)
      .where(and(eq(turnos.pacienteId, session.pacienteId), sql`${turnos.deletedAt} IS NULL`))
      .orderBy(desc(turnos.fechaHora));

    const recetasList = await db
      .select()
      .from(recetas)
      .where(eq(recetas.pacienteId, session.pacienteId))
      .orderBy(desc(recetas.createdAt));

    const documentosList = await db
      .select({
        id: documentosMedicos.id,
        tipo: documentosMedicos.tipo,
        extraccionEstado: documentosMedicos.extraccionEstado,
        estadoRevision: documentosMedicos.estadoRevision,
        createdAt: documentosMedicos.createdAt,
      })
      .from(documentosMedicos)
      .where(
        and(
          eq(documentosMedicos.pacienteId, session.pacienteId),
          sql`${documentosMedicos.deletedAt} IS NULL`,
        ),
      )
      .orderBy(desc(documentosMedicos.createdAt));

    await db.insert(solicitudesDatos).values({
      pacienteId: session.pacienteId,
      tipo: 'exportacion',
      estado: 'procesada',
      tenantId,
    });

    const payload = {
      exportadoEn: new Date().toISOString(),
      paciente: {
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        email: paciente.email || null,
        telefono: paciente.telefono,
        rut: paciente.rut || null,
        dni: paciente.dni || null,
        fechaNacimiento: paciente.fechaNacimiento || null,
        region: paciente.region || null,
        comuna: paciente.comuna || null,
        prevision: paciente.prevision || null,
        sistemaSalud: paciente.sistemaSalud || null,
        obraSocial: paciente.obraSocial || null,
      },
      turnos: turnosList.map((t) => ({
        id: t.id,
        fechaHora: t.fechaHora,
        duracionMinutos: t.duracionMinutos,
        motivo: t.motivo || null,
        estado: t.estado,
        tipoConsulta: t.tipoConsulta,
        notasPaciente: t.notasPaciente || null,
        creadoEn: t.createdAt,
      })),
      recetas: recetasList.map((r) => ({
        id: r.id,
        medicamento: r.medicamento,
        presentacion: r.presentacion || null,
        dosis: r.dosis,
        frecuencia: r.frecuencia,
        duracion: r.duracion || null,
        estado: r.estado,
        fechaInicio: r.fechaInicio,
        fechaFin: r.fechaFin || null,
        creadoEn: r.createdAt,
      })),
      documentos: documentosList.map((d) => ({
        id: d.id,
        tipo: d.tipo,
        extraccionEstado: d.extraccionEstado,
        estadoRevision: d.estadoRevision,
        creadoEn: d.createdAt,
      })),
    };

    const filename = `mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
    const body = JSON.stringify(payload, null, 2);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    safeWarn('Error al exportar datos del paciente', err);
    return NextResponse.json({ error: 'No se pudo exportar tus datos' }, { status: 500 });
  }
}
