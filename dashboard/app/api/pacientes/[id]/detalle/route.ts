import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  pacientes,
  turnos,
  recetas,
  medicos,
  historialMedico,
  notasSoap,
  conversaciones,
  mensajes,
} from '@/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { verifyPacienteAccess } from '@/lib/api-auth';

/**
 * GET /api/pacientes/[id]/detalle
 *
 * Devuelve la ficha completa del paciente: datos, turnos, recetas,
 * historial médico, y últimas conversaciones.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sessionMedicoId = session.user?.medicoId;
    const sessionRol = session.user?.role;
    await verifyPacienteAccess(params.id, sessionMedicoId, sessionRol);

    const pacienteId = params.id;

    // ─── Datos del paciente ──────────────────────────
    // Incluimos también deletedAt para saber si ya está dado de baja
    const [paciente] = await db
      .select()
      .from(pacientes)
      .where(and(eq(pacientes.id, pacienteId), sql`${pacientes.deletedAt} IS NULL`));

    if (!paciente) {
      // Podría estar dado de baja — chequeamos con deletedAt
      const [pacienteDeleted] = await db
        .select()
        .from(pacientes)
        .where(eq(pacientes.id, pacienteId));

      if (pacienteDeleted && pacienteDeleted.deletedAt) {
        return NextResponse.json({
          data: {
            paciente: {
              ...pacienteDeleted,
              tags: pacienteDeleted.tags || [],
              metadata: pacienteDeleted.metadata || {},
            },
            turnos: [],
            recetas: [],
            historial: [],
            ultimaConversacion: null,
            stats: {
              totalTurnos: 0,
              totalRecetas: 0,
              totalHistorial: 0,
              totalNotasSoap: 0,
              turnosPorEstado: {},
              recetasPorEstado: {},
            },
            bajaConfirmada: true,
            bajaSolicitadaAt: pacienteDeleted.bajaSolicitadaAt,
          },
        });
      }

      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // ─── Turnos ──────────────────────────────────────
    const turnosList = await db
      .select({
        id: turnos.id,
        fechaHora: turnos.fechaHora,
        estado: turnos.estado,
        tipoConsulta: turnos.tipoConsulta,
        motivo: turnos.motivo,
        medicoNombre: medicos.nombre,
        duracionMinutos: turnos.duracionMinutos,
        notasMedico: turnos.notasMedico,
      })
      .from(turnos)
      .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
      .where(and(eq(turnos.pacienteId, pacienteId), sql`${turnos.deletedAt} IS NULL`))
      .orderBy(desc(turnos.fechaHora))
      .limit(30);

    // ─── Recetas ─────────────────────────────────────
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
      .where(eq(recetas.pacienteId, pacienteId))
      .orderBy(desc(recetas.createdAt))
      .limit(20);

    // ─── Historial médico ────────────────────────────
    const historial = await db
      .select({
        id: historialMedico.id,
        tipo: historialMedico.tipo,
        titulo: historialMedico.titulo,
        descripcion: historialMedico.descripcion,
        diagnosticoCodigo: historialMedico.diagnosticoCodigo,
        diagnosticoDescripcion: historialMedico.diagnosticoDescripcion,
        fecha: historialMedico.createdAt,
      })
      .from(historialMedico)
      .where(eq(historialMedico.pacienteId, pacienteId))
      .orderBy(desc(historialMedico.createdAt))
      .limit(20);

    // ─── Notas SOAP count ─────────────────────────
    // Si la tabla notas_soap no existe aún, devolvemos 0
    let notasSoapCount = { count: 0 };
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notasSoap)
        .where(eq(notasSoap.pacienteId, pacienteId));
      notasSoapCount = result || { count: 0 };
    } catch {
      // La tabla podría no existir si la migración 0018 no se aplicó
      notasSoapCount = { count: 0 };
    }

    // ─── Última conversación ─────────────────────────
    const [ultimaConversacion] = await db
      .select({
        id: conversaciones.id,
        estado: conversaciones.estado,
        ultimaInteraccion: conversaciones.ultimaInteraccion,
      })
      .from(conversaciones)
      .where(
        and(eq(conversaciones.pacienteId, pacienteId), sql`${conversaciones.deletedAt} IS NULL`),
      )
      .orderBy(desc(conversaciones.ultimaInteraccion))
      .limit(1);

    // ─── Stats ───────────────────────────────────────
    const statsTurnos = turnosList.reduce(
      (acc, t) => {
        acc[t.estado] = (acc[t.estado] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const statsRecetas = recetasList.reduce(
      (acc, r) => {
        acc[r.estado] = (acc[r.estado] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return NextResponse.json({
      data: {
        paciente,
        turnos: turnosList,
        recetas: recetasList,
        historial,
        ultimaConversacion: ultimaConversacion || null,
        stats: {
          totalTurnos: turnosList.length,
          totalRecetas: recetasList.length,
          totalHistorial: historial.length,
          totalNotasSoap: Number(notasSoapCount?.count || 0),
          turnosPorEstado: statsTurnos,
          recetasPorEstado: statsRecetas,
        },
        bajaSolicitadaAt: paciente.bajaSolicitadaAt || null,
        bajaConfirmada: false,
      },
    });
  } catch (error) {
    console.error('[API] Error GET /api/pacientes/[id]/detalle:', error);
    return NextResponse.json({ error: 'Error al obtener detalle del paciente' }, { status: 500 });
  }
}
