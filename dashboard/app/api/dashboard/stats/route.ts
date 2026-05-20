import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { turnos, pacientes, conversaciones, pacienteEventos, mensajes } from '@/drizzle/schema';
import { eq, and, gte, lte, lt, desc, sql, count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/stats
 *
 * Devuelve los datos necesarios para el panel principal del dashboard:
 * - KPIs (turnos hoy, pacientes nuevos, mensajes pendientes, alertas)
 * - Próximos turnos del día
 * - Actividad reciente
 */
export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ─── KPIs ────────────────────────────────────────────────

    // 1. Turnos de hoy
    const turnosHoy = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, todayStart),
          lt(turnos.fechaHora, todayEnd),
          sql`${turnos.deletedAt} IS NULL`
        )
      );

    // 2. Turnos de ayer (para calcular la diferencia)
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const turnosAyer = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, yesterdayStart),
          lt(turnos.fechaHora, todayStart),
          sql`${turnos.deletedAt} IS NULL`
        )
      );

    // 3. Pacientes nuevos esta semana
    const pacientesNuevos = await db
      .select({ total: count() })
      .from(pacientes)
      .where(
        and(
          gte(pacientes.createdAt, sevenDaysAgo),
          sql`${pacientes.deletedAt} IS NULL`
        )
      );

    // Pacientes nuevos la semana anterior (para %)
    const twoWeeksAgo = new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    const pacientesSemanaAnterior = await db
      .select({ total: count() })
      .from(pacientes)
      .where(
        and(
          gte(pacientes.createdAt, twoWeeksAgo),
          lt(pacientes.createdAt, sevenDaysAgo),
          sql`${pacientes.deletedAt} IS NULL`
        )
      );

    // 4. Conversaciones activas (mensajes sin responder / pendientes)
    const mensajesPendientes = await db
      .select({ total: count() })
      .from(conversaciones)
      .where(
        and(
          eq(conversaciones.estado, 'activa'),
          sql`${conversaciones.optOut} = false`,
          sql`${conversaciones.deletedAt} IS NULL`
        )
      );

    // 5. Alertas (eventos urgentes de hoy)
    const alertas = await db
      .select({ total: count() })
      .from(pacienteEventos)
      .where(
        and(
          eq(pacienteEventos.tipo, 'urgencia'),
          gte(pacienteEventos.createdAt, todayStart)
        )
      );

    // Calcular cambios vs período anterior
    const turnosHoyCount = Number(turnosHoy[0]?.total ?? 0);
    const turnosAyerCount = Number(turnosAyer[0]?.total ?? 0);
    const diffTurnos = turnosHoyCount - turnosAyerCount;
    const diffTurnosStr = diffTurnos >= 0 ? `+${diffTurnos}` : `${diffTurnos}`;

    const pacientesCount = Number(pacientesNuevos[0]?.total ?? 0);
    const pacientesAnterior = Number(pacientesSemanaAnterior[0]?.total ?? 0);
    const diffPacientes = pacientesAnterior > 0
      ? `+${Math.round((pacientesCount / pacientesAnterior) * 100)}%`
      : pacientesCount > 0 ? '+100%' : '0%';

    const pendientesCount = Number(mensajesPendientes[0]?.total ?? 0);
    const alertasCount = Number(alertas[0]?.total ?? 0);

    // ─── PRÓXIMOS TURNOS ──────────────────────────────────────

    type ProximoTurno = {
      hora: string;
      paciente: string;
      tipo: string;
      estado: string;
      medico: string;
    };

    let proximosTurnos: ProximoTurno[] = [];

    try {
      const turnosQuery = await db
        .select({
          fechaHora: turnos.fechaHora,
          motivo: turnos.motivo,
          estado: turnos.estado,
          tipoConsulta: turnos.tipoConsulta,
          pacienteNombre: pacientes.nombre,
          pacienteApellido: pacientes.apellido,
          medicoNombre: sql<string>`(SELECT nombre FROM medicos WHERE id = ${turnos.medicoId})`,
        })
        .from(turnos)
        .leftJoin(pacientes, eq(turnos.pacienteId, pacientes.id))
        .where(
          and(
            gte(turnos.fechaHora, todayStart),
            lt(turnos.fechaHora, todayEnd),
            sql`${turnos.deletedAt} IS NULL`
          )
        )
        .orderBy(turnos.fechaHora)
        .limit(8);

      proximosTurnos = turnosQuery.map((t) => ({
        hora: t.fechaHora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        paciente: `${t.pacienteNombre || ''} ${t.pacienteApellido || ''}`.trim() || 'Paciente',
        tipo: t.motivo || t.tipoConsulta || 'Consulta',
        estado: t.estado,
        medico: t.medicoNombre || 'Médico',
      }));
    } catch {
      // Si falla por schema (no hay médicos aún), devolver vacío
    }

    // ─── ACTIVIDAD RECIENTE ────────────────────────────────────

    type Actividad = {
      hora: string;
      texto: string;
      tipo: string;
      timestamp: string;
    };

    const actividadReciente: Actividad[] = [];

    // Eventos de pacientes (confirmaciones, urgencias, nuevos)
    try {
      const eventos = await db
        .select({
          tipo: pacienteEventos.tipo,
          descripcion: pacienteEventos.descripcion,
          createdAt: pacienteEventos.createdAt,
        })
        .from(pacienteEventos)
        .orderBy(desc(pacienteEventos.createdAt))
        .limit(10);

      for (const ev of eventos) {
        if (ev.descripcion) {
          actividadReciente.push({
            hora: ev.createdAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            texto: ev.descripcion,
            tipo: ev.tipo,
            timestamp: ev.createdAt.toISOString(),
          });
        }
      }
    } catch {
      // Tabla puede no tener datos aún
    }

    // Últimos mensajes de pacientes como actividad
    try {
      const ultimosMensajes = await db
        .select({
          contenido: mensajes.contenido,
          createdAt: mensajes.createdAt,
          pacienteNombre: pacientes.nombre,
          pacienteApellido: pacientes.apellido,
        })
        .from(mensajes)
        .leftJoin(conversaciones, eq(mensajes.conversacionId, conversaciones.id))
        .leftJoin(pacientes, eq(conversaciones.pacienteId, pacientes.id))
        .where(eq(mensajes.rol, 'paciente'))
        .orderBy(desc(mensajes.createdAt))
        .limit(5);

      for (const m of ultimosMensajes) {
        const nombre = `${m.pacienteNombre || ''} ${m.pacienteApellido || ''}`.trim() || 'Paciente';
        const textoCorto = m.contenido.length > 60
          ? m.contenido.substring(0, 60) + '…'
          : m.contenido;

        actividadReciente.push({
          hora: m.createdAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          texto: `${nombre}: "${textoCorto}"`,
          tipo: 'consulta',
          timestamp: m.createdAt.toISOString(),
        });
      }
    } catch {
      // No hay mensajes aún
    }

    // Ordenar por timestamp descendente y tomar los primeros 8
    actividadReciente.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const topActividad = actividadReciente.slice(0, 8);

    // Calcular conversaciones activas totales para el footer
    let conversacionesActivas = 0;
    try {
      const convActivas = await db
        .select({ total: count() })
        .from(conversaciones)
        .where(
          and(
            eq(conversaciones.estado, 'activa'),
            sql`${conversaciones.deletedAt} IS NULL`
          )
        );
      conversacionesActivas = Number(convActivas[0]?.total ?? 0);
    } catch {
      // No hay datos
    }

    return NextResponse.json({
      kpis: [
        {
          title: 'Turnos Hoy',
          value: String(turnosHoyCount),
          change: diffTurnosStr,
          type: 'calendar',
        },
        {
          title: 'Pacientes Nuevos',
          value: String(pacientesCount),
          change: diffPacientes,
          type: 'users',
        },
        {
          title: 'Mensajes Pendientes',
          value: String(pendientesCount),
          change: pendientesCount > 0 ? 'Requiere atención' : '0',
          type: 'messages',
        },
        {
          title: 'Alertas',
          value: String(alertasCount),
          change: alertasCount > 0 ? 'Urgente' : 'Sin novedades',
          type: 'alert',
          urgent: alertasCount > 0,
        },
      ],
      proximosTurnos,
      actividadReciente: topActividad,
      sistema: {
        online: true,
        conversacionesActivas,
        datosReales: true,
      },
    });
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}


