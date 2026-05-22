import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { turnos, pacientes, medicos } from '@/drizzle/schema';
import type { InferInsertModel } from 'drizzle-orm';
import { eq, and, gte, lt, sql, count, like, or } from 'drizzle-orm';

/**
 * GET /api/turnos
 *
 * Lista turnos con filtros y estadísticas.
 *
 * Query params:
 * - fecha: YYYY-MM-DD (default: hoy)
 * - estado: filtrar por estado
 * - medico: filtrar por nombre de médico
 * - tipo: filtrar por tipo de consulta
 * - search: búsqueda por nombre de paciente
 * - limit: (default 100)
 * - offset: (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Fecha: default hoy
    const fechaStr =
      searchParams.get('fecha') ||
      new Date().toISOString().split('T')[0];
    const fechaBaseIso = fechaStr + 'T00:00:00.000Z';
    const fechaFinIso = new Date(new Date(fechaBaseIso).getTime() + 24 * 60 * 60 * 1000).toISOString();

    const estado = searchParams.get('estado') || undefined;
    const medico = searchParams.get('medico') || undefined;
    const tipo = searchParams.get('tipo') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 100;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0;

    // ─── Filtros ───────────────────────────────────────

    const whereConditions = and(
      gte(turnos.fechaHora, fechaBaseIso),
      lt(turnos.fechaHora, fechaFinIso),
      sql`${turnos.deletedAt} IS NULL`,
      estado ? eq(turnos.estado, estado) : undefined,
      tipo ? eq(turnos.tipoConsulta, tipo) : undefined,
      medico
        ? sql`EXISTS (SELECT 1 FROM ${medicos} WHERE ${medicos.id} = ${turnos.medicoId} AND ${medicos.nombre} ILIKE ${'%' + medico + '%'})`
        : undefined,
      search
        ? sql`EXISTS (SELECT 1 FROM ${pacientes} WHERE ${pacientes.id} = ${turnos.pacienteId} AND (${pacientes.nombre} ILIKE ${'%' + search + '%'} OR ${pacientes.apellido} ILIKE ${'%' + search + '%'}))`
        : undefined,
    );

    // ─── Stats del día ─────────────────────────────────

    const statsRows = await db
      .select({
        estado: turnos.estado,
        total: count(),
      })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, fechaBaseIso),
          lt(turnos.fechaHora, fechaFinIso),
          sql`${turnos.deletedAt} IS NULL`,
        ),
      )
      .groupBy(turnos.estado);

    const statsTotal = statsRows.reduce(
      (acc, row) => acc + Number(row.total),
      0,
    );
    const statsPorEstado: Record<string, number> = {};
    for (const row of statsRows) {
      statsPorEstado[row.estado] = Number(row.total);
    }

    // ─── Médicos únicos con turnos hoy ─────────────────
    const medicosHoy = await db
      .select({ nombre: medicos.nombre })
      .from(medicos)
      .where(
        and(
          sql`EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.medicoId} = ${medicos.id} AND ${turnos.deletedAt} IS NULL AND ${turnos.fechaHora} >= ${fechaBaseIso} AND ${turnos.fechaHora} < ${fechaFinIso})`,
          sql`${medicos.deletedAt} IS NULL`,
        ),
      );

    // ─── Tipos únicos con turnos hoy ───────────────────
    const tiposHoy = await db
      .select({ tipo: turnos.tipoConsulta })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, fechaBaseIso),
          lt(turnos.fechaHora, fechaFinIso),
          sql`${turnos.deletedAt} IS NULL`,
        ),
      )
      .groupBy(turnos.tipoConsulta);

    // ─── Total de turnos filtrados ────────────────────
    const [{ totalFiltrados }] = await db
      .select({ totalFiltrados: count() })
      .from(turnos)
      .where(whereConditions);

    // ─── Lista de turnos ───────────────────────────────
    const lista = await db
      .select({
        id: turnos.id,
        fecha: turnos.fechaHora,
        hora: sql<string>`TO_CHAR(${turnos.fechaHora}, 'HH24:MI')`,
        estado: turnos.estado,
        tipo: turnos.tipoConsulta,
        motivo: turnos.motivo,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        medicoNombre: medicos.nombre,
        medicoId: medicos.id,
        pacienteId: pacientes.id,
      })
      .from(turnos)
      .leftJoin(pacientes, eq(turnos.pacienteId, pacientes.id))
      .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
      .where(whereConditions)
      .orderBy(turnos.fechaHora)
      .limit(limit)
      .offset(offset);

    const data = lista.map((t) => ({
      id: t.id,
      hora: t.hora,
      paciente: `${t.pacienteNombre || ''} ${t.pacienteApellido || ''}`.trim() || 'Paciente',
      tipo: t.motivo || t.tipo || 'Consulta',
      medico: t.medicoNombre || 'Médico',
      medicoId: t.medicoId,
      pacienteId: t.pacienteId,
      estado: t.estado,
      fecha: fechaStr,
    }));

    return NextResponse.json({
      data,
      total: Number(totalFiltrados),
      statsTotal,
      statsPorEstado,
      medicos: medicosHoy.map((m) => m.nombre).filter(Boolean),
      tipos: tiposHoy.map((t) => t.tipo).filter(Boolean),
      fecha: fechaStr,
    });
  } catch (error) {
    console.error('[API] Error GET /api/turnos:', error);
    return NextResponse.json(
      { error: 'Error al obtener turnos' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/turnos
 *
 * Crea un nuevo turno.
 *
 * Body (JSON):
 * - pacienteId: string (obligatorio)
 * - medicoId: string (obligatorio)
 * - fecha: string (YYYY-MM-DD, obligatorio)
 * - hora: string (HH:MM, obligatorio)
 * - tipoConsulta: string (opcional, default 'presencial')
 * - motivo: string (opcional)
 * - duracionMinutos: number (opcional, default 30)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      pacienteId,
      medicoId,
      fecha,
      hora,
      tipoConsulta,
      motivo,
      duracionMinutos,
    } = body;

    // Validación
    if (!pacienteId || !medicoId || !fecha || !hora) {
      return NextResponse.json(
        { error: 'pacienteId, medicoId, fecha y hora son obligatorios' },
        { status: 400 },
      );
    }

    // Construir fechaHora completa
    const fechaHora = new Date(`${fecha}T${hora}:00.000Z`);
    if (isNaN(fechaHora.getTime())) {
      return NextResponse.json(
        { error: 'fecha u hora inválida' },
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

    // Verificar que el médico existe
    const medico = await db
      .select({ id: medicos.id })
      .from(medicos)
      .where(and(eq(medicos.id, medicoId), sql`${medicos.deletedAt} IS NULL`))
      .limit(1);

    if (medico.length === 0) {
      return NextResponse.json(
        { error: 'Médico no encontrado' },
        { status: 404 },
      );
    }

    // Verificar disponibilidad (sin turno en el mismo horario para el mismo médico)
    const conflicto = await db
      .select({ id: turnos.id })
      .from(turnos)
      .where(
        and(
          eq(turnos.medicoId, medicoId),
          eq(turnos.fechaHora, fechaHora),
          sql`${turnos.deletedAt} IS NULL`,
          sql`${turnos.estado} NOT IN ('cancelada', 'no_asistio')`,
        ),
      )
      .limit(1);

    if (conflicto.length > 0) {
      return NextResponse.json(
        { error: 'El médico ya tiene un turno en ese horario' },
        { status: 409 },
      );
    }

    // Crear turno
    const [nuevo] = await db
      .insert(turnos)
      .values({
        pacienteId,
        medicoId,
        fechaHora,
        duracionMinutos: duracionMinutos || 30,
        motivo: motivo || null,
        tipoConsulta: tipoConsulta || 'presencial',
        estado: 'pendiente',
        fuente: 'dashboard',
      })
      .returning();

    return NextResponse.json({ data: nuevo }, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/turnos:', error);
    return NextResponse.json(
      { error: 'Error al crear turno' },
      { status: 500 },
    );
  }
}
