import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { turnos, pacientes, conversaciones, pacienteEventos, mensajes } from '@/drizzle/schema';
import { eq, and, gte, lte, lt, desc, sql, count, avg, ne, isNotNull } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/stats
 *
 * Devuelve los datos necesarios para el panel principal del dashboard:
 * - KPIs (turnos hoy, pacientes nuevos, mensajes pendientes, alertas, tasa respuesta, mensajes hoy)
 * - Próximos turnos del día
 * - Actividad reciente
 *
 * Query params:
 *   sucursalId  - opcional, filtra por sucursal
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    const sessionMedicoId = (session?.user as any)?.medicoId;
    const sessionRol = (session?.user as any)?.role;
    const isMedico = sessionRol === 'medico' && !!sessionMedicoId;

    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get('sucursalId') || undefined;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ─── KPIs ────────────────────────────────────────────────

    // Helper para filtro sucursal
    const sucFiltro = sucursalId ? [eq(turnos.sucursalId, sucursalId)] : [];
    const sucFiltroPac = sucursalId ? [eq(pacientes.sucursalId, sucursalId)] : [];
    const medicoFiltro = isMedico ? [eq(turnos.medicoId, sessionMedicoId)] : [];

    // 1. Turnos de hoy
    const turnosHoy = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, todayStart),
          lt(turnos.fechaHora, todayEnd),
          sql`${turnos.deletedAt} IS NULL`,
          ...sucFiltro,
          ...medicoFiltro,
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
          sql`${turnos.deletedAt} IS NULL`,
          ...sucFiltro,
          ...medicoFiltro,
        )
      );

    // 3. Pacientes nuevos esta semana
    const pacientesNuevos = await db
      .select({ total: count() })
      .from(pacientes)
      .where(
        and(
          gte(pacientes.createdAt, sevenDaysAgo),
          sql`${pacientes.deletedAt} IS NULL`,
          ...sucFiltroPac,
          isMedico
            ? sql`EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.medicoId} = ${sessionMedicoId} AND ${turnos.deletedAt} IS NULL)`
            : undefined,
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
          sql`${pacientes.deletedAt} IS NULL`,
          ...sucFiltroPac,
          isMedico
            ? sql`EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.medicoId} = ${sessionMedicoId} AND ${turnos.deletedAt} IS NULL)`
            : undefined,
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
          sql`${conversaciones.deletedAt} IS NULL`,
          isMedico ? eq(conversaciones.medicoId, sessionMedicoId) : undefined,
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

    // ─── NUEVOS KPIs ───────────────────────────────────────────

    // 6. Mensajes de pacientes hoy
    const mensajesHoy = await db
      .select({ total: count() })
      .from(mensajes)
      .where(
        and(
          eq(mensajes.rol, 'paciente'),
          gte(mensajes.createdAt, todayStart),
          isMedico
            ? sql`EXISTS (SELECT 1 FROM conversaciones c WHERE c.id = ${mensajes.conversacionId} AND c.medico_id = ${sessionMedicoId})`
            : undefined,
        )
      );

    // 7. Tasa de respuesta: mensajes de IA respondidos / total mensajes paciente (últimos 30 días)
    const mensajesPaciente30d = await db
      .select({ total: count() })
      .from(mensajes)
      .where(
        and(
          eq(mensajes.rol, 'paciente'),
          gte(mensajes.createdAt, thirtyDaysAgo),
          isMedico
            ? sql`EXISTS (SELECT 1 FROM conversaciones c WHERE c.id = ${mensajes.conversacionId} AND c.medico_id = ${sessionMedicoId})`
            : undefined,
        )
      );

    const mensajesIA30d = await db
      .select({ total: count() })
      .from(mensajes)
      .where(
        and(
          eq(mensajes.rol, 'asistente_ia'),
          gte(mensajes.createdAt, thirtyDaysAgo),
          isMedico
            ? sql`EXISTS (SELECT 1 FROM conversaciones c WHERE c.id = ${mensajes.conversacionId} AND c.medico_id = ${sessionMedicoId})`
            : undefined,
        )
      );

    const msgPacienteCount = Number(mensajesPaciente30d[0]?.total ?? 0);
    const msgIACount = Number(mensajesIA30d[0]?.total ?? 0);
    const tasaRespuesta = msgPacienteCount > 0
      ? Math.min(100, Math.round((msgIACount / msgPacienteCount) * 100))
      : 0;

    // 8. Tiempo promedio de respuesta (diferencia en minutos entre msg paciente y respuesta IA)
    let tiempoPromedioMinutos = 0;
    try {
      // Para cada conversación con al menos un mensaje de IA,
      // calcular diferencia entre el primer msg paciente y la primera respuesta IA
      const tiempos = await db
        .select({
          diff: sql<string>`EXTRACT(EPOCH FROM (
            (SELECT MIN(m2.createdAt) FROM ${mensajes} m2 WHERE m2.conversacion_id = ${mensajes.conversacionId} AND m2.rol = 'asistente_ia')
            -
            (SELECT MIN(m1.createdAt) FROM ${mensajes} m1 WHERE m1.conversacion_id = ${mensajes.conversacionId} AND m1.rol = 'paciente')
          )) / 60`,
        })
        .from(mensajes)
        .where(
          and(
            gte(mensajes.createdAt, thirtyDaysAgo),
            sql`EXISTS (SELECT 1 FROM ${mensajes} m3 WHERE m3.conversacion_id = ${mensajes.conversacionId} AND m3.rol = 'asistente_ia')`
          )
        )
        .limit(1);

      if (tiempos.length > 0 && tiempos[0].diff) {
        const diff = parseFloat(tiempos[0].diff);
        tiempoPromedioMinutos = diff > 0 && diff < 1440 ? Math.round(diff) : 0;
      }
    } catch {
      // Si la query falla (schema complejo), calcular con JS
      try {
        const todasConv = await db
          .select({ id: conversaciones.id })
          .from(conversaciones)
          .limit(20);

        let totalDiff = 0;
        let countConv = 0;
        for (const conv of todasConv) {
          const msgs = await db
            .select({ rol: mensajes.rol, createdAt: mensajes.createdAt })
            .from(mensajes)
            .where(eq(mensajes.conversacionId, conv.id))
            .orderBy(mensajes.createdAt);

          let primerPaciente: Date | null = null;
          let primerIA: Date | null = null;
          for (const m of msgs) {
            if (m.rol === 'paciente' && !primerPaciente) primerPaciente = m.createdAt;
            if (m.rol === 'asistente_ia' && !primerIA) primerIA = m.createdAt;
          }
          if (primerPaciente && primerIA) {
            totalDiff += (primerIA.getTime() - primerPaciente.getTime()) / 60000;
            countConv++;
          }
        }
        tiempoPromedioMinutos = countConv > 0 ? Math.round(totalDiff / countConv) : 0;
      } catch {
        tiempoPromedioMinutos = 0;
      }
    }

    // 9. Pacientes recurrentes (% que ya tenían conversaciones previas)
    let pacientesRecurrentes = 0;
    let totalPacientesActivos = 0;
    try {
      const convCounts = await db
        .select({
          pacienteId: conversaciones.pacienteId,
          total: count(),
        })
        .from(conversaciones)
        .groupBy(conversaciones.pacienteId);

      totalPacientesActivos = convCounts.length;
      pacientesRecurrentes = convCounts.filter(c => Number(c.total) > 1).length;
    } catch {
      // No hay datos
    }

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
    const mensajesHoyCount = Number(mensajesHoy[0]?.total ?? 0);

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
            sql`${turnos.deletedAt} IS NULL`,
            ...sucFiltro,
            isMedico ? eq(turnos.medicoId, sessionMedicoId) : undefined,
          )
        )
        .orderBy(turnos.fechaHora)
        .limit(8);

      proximosTurnos = turnosQuery.map((t) => ({
        hora: t.fechaHora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
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
            hora: ev.createdAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
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
        .where(
          and(
            eq(mensajes.rol, 'paciente'),
            isMedico ? eq(conversaciones.medicoId, sessionMedicoId) : undefined,
          )
        )
        .orderBy(desc(mensajes.createdAt))
        .limit(5);

      for (const m of ultimosMensajes) {
        const nombre = `${m.pacienteNombre || ''} ${m.pacienteApellido || ''}`.trim() || 'Paciente';
        const textoCorto = m.contenido.length > 60
          ? m.contenido.substring(0, 60) + '...'
          : m.contenido;

        actividadReciente.push({
          hora: m.createdAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
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
            sql`${conversaciones.deletedAt} IS NULL`,
            isMedico ? eq(conversaciones.medicoId, sessionMedicoId) : undefined,
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
        {
          title: 'Tasa Respuesta',
          value: `${tasaRespuesta}%`,
          change: msgPacienteCount > 0 ? `${msgIACount} respuestas` : 'Sin datos',
          type: 'response',
        },
        {
          title: 'Mensajes Hoy',
          value: String(mensajesHoyCount),
          change: tiempoPromedioMinutos > 0 ? `Prom. ${tiempoPromedioMinutos} min` : 'Sin métrica',
          type: 'today',
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


