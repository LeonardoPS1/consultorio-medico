import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { turnos, pacientes, medicos, portalPagos } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { safeError } from '@/lib/logger';
import { createTurnoPaymentPreference } from '@/lib/mercadopago';

// ─── Portal session helper ──────────────────────────────────
function getPortalSession(request: Request): { pacienteId: string } | null {
  const header = request.headers.get('x-portal-session');
  if (!header) return null;
  try {
    return JSON.parse(header);
  } catch {
    return null;
  }
}

// ─── POST /api/portal/pagos — Iniciar pago de un turno ──────
export async function POST(request: Request) {
  const session = getPortalSession(request);
  if (!session?.pacienteId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { turnoId } = body;

    if (!turnoId) {
      return NextResponse.json({ error: 'turnoId es requerido' }, { status: 400 });
    }

    // Verificar que el turno existe y pertenece al paciente
    const [turno] = await db
      .select({
        id: turnos.id,
        pacienteId: turnos.pacienteId,
        precio: turnos.precio,
        pagado: turnos.pagado,
        medicoNombre: medicos.nombre,
        medicoEspecialidad: medicos.especialidad,
      })
      .from(turnos)
      .innerJoin(medicos, eq(turnos.medicoId, medicos.id))
      .where(eq(turnos.id, turnoId))
      .limit(1);

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    if (turno.pacienteId !== session.pacienteId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (turno.pagado) {
      return NextResponse.json({ error: 'El turno ya está pagado' }, { status: 400 });
    }

    if (!turno.precio || Number(turno.precio) <= 0) {
      return NextResponse.json({ error: 'El turno no requiere pago' }, { status: 400 });
    }

    // Obtener datos del paciente
    const [paciente] = await db
      .select({ nombre: pacientes.nombre, email: pacientes.email })
      .from(pacientes)
      .where(eq(pacientes.id, session.pacienteId))
      .limit(1);

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // Crear preferencia en MercadoPago
    const preference = await createTurnoPaymentPreference({
      turnoId: turno.id,
      title: `Atención ${turno.medicoEspecialidad || 'médica'} - ${turno.medicoNombre || 'Médico'}`,
      monto: Number(turno.precio),
      pacienteNombre: paciente.nombre,
      pacienteEmail: paciente.email || undefined,
      pacienteId: session.pacienteId,
    });

    if (!preference) {
      return NextResponse.json(
        { error: 'Error al crear preferencia de pago — MP no configurado' },
        { status: 500 },
      );
    }

    // Guardar registro de pago en portal_pagos
    const [pago] = await db
      .insert(portalPagos)
      .values({
        turnoId: turno.id,
        pacienteId: session.pacienteId,
        monto: turno.precio,
        moneda: 'CLP',
        estado: 'pendiente',
        mercadopagoPreferenceId: preference.id,
        metadata: { preferenceId: preference.id, initPoint: preference.init_point },
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        pagoId: pago.id,
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
      },
      { status: 201 },
    );
  } catch (err) {
    safeError(
      '[PortalPagos] Error creando pago:',
      err instanceof Error ? { message: err.message } : err,
    );
    const message = err instanceof Error ? err.message : 'Error al iniciar pago';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
