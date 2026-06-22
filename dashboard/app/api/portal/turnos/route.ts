/**
 * GET /api/portal/turnos — Turnos del paciente autenticado
 * Protegido: requiere cookie portal_session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { turnos, medicos } from '@/drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { safeError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  const data = await db
    .select({
      id: turnos.id,
      fechaHora: turnos.fechaHora,
      hora: sql<string>`TO_CHAR(${turnos.fechaHora}, 'HH24:MI')`,
      estado: turnos.estado,
      motivo: turnos.motivo,
      tipoConsulta: turnos.tipoConsulta,
      duracionMinutos: turnos.duracionMinutos,
      notasPaciente: turnos.notasPaciente,
      linkVideollamada: turnos.linkVideollamada,
      medicoNombre: medicos.nombre,
      medicoEspecialidad: medicos.especialidad,
      pagado: turnos.pagado,
    })
    .from(turnos)
    .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
    .where(eq(turnos.pacienteId, session.pacienteId))
    .orderBy(desc(turnos.fechaHora))
    .limit(limit);

  return NextResponse.json({ turnos: data });
}

/**
 * POST /api/portal/turnos — Crear turno desde el portal
 * Protegido: requiere cookie portal_session + validaciones.
 */
export async function POST(request: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { medicoId, servicioId, fechaHora, motivo, rescheduleTurnoId, sucursalId } = body;

    if (!medicoId || !servicioId || !fechaHora) {
      return NextResponse.json(
        { error: 'medicoId, servicioId y fechaHora son requeridos' },
        { status: 400 },
      );
    }

    const { crearTurnoPortal, sendTurnoConfirmacionWhatsApp, notifyDoctorWhatsApp } = await import('@/lib/services/portal-booking');
    const { consumirTurnoSuscripcion, tienePaqueteDisponible } = await import('@/lib/services/portal-paquetes');
    const turno = await crearTurnoPortal({
      pacienteId: session.pacienteId,
      medicoId,
      servicioId,
      fechaHora,
      motivo: motivo || null,
      sucursalId: sucursalId || undefined,
      rescheduleTurnoId: rescheduleTurnoId || undefined,
    });

    // Si el turno tiene precio y el paciente tiene paquete, consumir automáticamente
    if (turno.precio && Number(turno.precio) > 0) {
      const disponible = await tienePaqueteDisponible(session.pacienteId);
      if (disponible) {
        await consumirTurnoSuscripcion(session.pacienteId, turno.id);
      }
    }

    // WhatsApp confirmation (fire-and-forget) con .ics adjunto
    sendTurnoConfirmacionWhatsApp(
      turno.pacienteTelefono,
      turno.pacienteNombre,
      turno.medicoNombre,
      turno.medicoEspecialidad,
      turno.fechaHora.toISOString(),
      turno.motivo,
      turno.precio ? Number(turno.precio) : null,
      turno.id,
    ).catch(() => {});

    // Notificar al médico si es un reagendamiento
    if (rescheduleTurnoId && turno.medicoTelefono) {
      const fechaAntigua = turno.oldTurnoFecha
        ? new Date(turno.oldTurnoFecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
        : '';
      const horaAntigua = turno.oldTurnoHora || '';
      const fechaNueva = turno.fechaHora
        ? new Date(turno.fechaHora).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
        : '';
      const horaNueva = turno.horaFormateada || '';

      notifyDoctorWhatsApp(
        turno.medicoTelefono,
        turno.medicoNombre,
        turno.pacienteNombre,
        'reagendado',
        { fechaVieja: fechaAntigua, horaVieja: horaAntigua, fechaNueva, horaNueva },
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, turno }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear turno';
    safeError('[PortalBooking] Error en POST /api/portal/turnos:', err instanceof Error ? { message: err.message, stack: err.stack } : err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
