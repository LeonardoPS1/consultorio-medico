import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { turnos, pacientes, conversaciones, pacienteEventos, mensajes } from '@/drizzle/schema';
import { eq, and, gte, lt, desc, sql, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { cache } from '@/lib/cache';
import { safeWarn } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const CACHE_TTL = 30_000; // 30s — KPIs stale 30s es aceptable

// ─── Rate limiter para error logging ────────────────────────────
let lastErrorTime = 0;
let errorCount = 0;
function logStatsError(error: unknown) {
  const now = Date.now();
  if (now - lastErrorTime > 60_000) {
    errorCount = 0;
  }
  errorCount++;
  lastErrorTime = now;
  if (errorCount <= 3) {
    safeWarn('[Dashboard Stats] Error:', error);
  }
}

/**
 * Convierte recursivamente Date objects a ISO strings antes de serializar.
 * Esto previene errores de `Buffer.byteLength(Date)` en la serialización
 * interna de Next.js.
 */
function deepSanitize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = deepSanitize(value);
    }
    return sanitized;
  }
  return obj;
}

/**
 * GET /api/dashboard/stats
 *
 * Cacheado con TTL de 30s.
 * Optimizado: queries consolidadas, sin duplicados, sin fallback ruidoso.
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

    // Cache key incluye filtros de sesión y sucursal
    const cacheKey = `dashboard:stats:${sessionMedicoId ?? 'admin'}:${sucursalId ?? 'todas'}`;

    const data = await cache.getOrSet(cacheKey, async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Filtros reutilizables
      const medicoFilter = isMedico ? [eq(turnos.medicoId, sessionMedicoId!)] : [];
      const sucursalFilter = sucursalId ? [eq(turnos.sucursalId, sucursalId)] : [];
      const convMedicoFilter = isMedico ? [eq(conversaciones.medicoId, sessionMedicoId!)] : [];
      const pacSucFilter = sucursalId ? [eq(pacientes.sucursalId, sucursalId)] : [];

      // ─── KPI: Turnos (hoy vs ayer) ──────────────────────────
      const turnosHoy = await db
        .select({ total: count() })
        .from(turnos)
        .where(and(gte(turnos.fechaHora, todayStart), lt(turnos.fechaHora, todayEnd), sql`${turnos.deletedAt} IS NULL`, ...sucursalFilter, ...medicoFilter));

      const turnosAyer = await db
        .select({ total: count() })
        .from(turnos)
        .where(and(gte(turnos.fechaHora, yesterdayStart), lt(turnos.fechaHora, todayStart), sql`${turnos.deletedAt} IS NULL`, ...sucursalFilter, ...medicoFilter));

      const turnosHoyCount = Number(turnosHoy[0]?.total ?? 0);
      const turnosAyerCount = Number(turnosAyer[0]?.total ?? 0);
      const diffTurnos = turnosHoyCount - turnosAyerCount;

      // ─── KPI: Pacientes nuevos (semana actual vs anterior) ──
      const pacienteFilterExtra = isMedico
        ? sql`EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.medicoId} = ${sessionMedicoId} AND ${turnos.deletedAt} IS NULL)`
        : undefined;

      const pacientesNuevos = await db
        .select({ total: count() })
        .from(pacientes)
        .where(and(gte(pacientes.createdAt, sevenDaysAgo), sql`${pacientes.deletedAt} IS NULL`, ...pacSucFilter, pacienteFilterExtra));

      const pacientesAnterior = await db
        .select({ total: count() })
        .from(pacientes)
        .where(and(gte(pacientes.createdAt, twoWeeksAgo), lt(pacientes.createdAt, sevenDaysAgo), sql`${pacientes.deletedAt} IS NULL`, ...pacSucFilter, pacienteFilterExtra));

      const pacientesCount = Number(pacientesNuevos[0]?.total ?? 0);
      const pacientesAnteriorCount = Number(pacientesAnterior[0]?.total ?? 0);

      // ─── KPI: Conversaciones activas ────────────────────────
      const convActivas = await db
        .select({ total: count() })
        .from(conversaciones)
        .where(and(eq(conversaciones.estado, 'activa'), sql`${conversaciones.optOut} = false`, sql`${conversaciones.deletedAt} IS NULL`, ...convMedicoFilter));

      const pendientesCount = Number(convActivas[0]?.total ?? 0);

      // ─── KPI: Alertas (urgencias hoy) ───────────────────────
      const alertas = await db
        .select({ total: count() })
        .from(pacienteEventos)
        .where(and(eq(pacienteEventos.tipo, 'urgencia'), gte(pacienteEventos.createdAt, todayStart)));

      const alertasCount = Number(alertas[0]?.total ?? 0);

      // ─── KPI: Mensajes hoy + tasa respuesta (consolidado) ──
      const mensFilterExtra = isMedico
        ? sql`EXISTS (SELECT 1 FROM conversaciones c WHERE c.id = ${mensajes.conversacionId} AND c.medico_id = ${sessionMedicoId})`
        : undefined;

      // Consulta consolidada: mensajes paciente hoy + paciente 30d + IA 30d
      const mensajesStats = await db
        .select({
          pacienteHoy: sql<number>`COUNT(*) FILTER (WHERE ${mensajes.rol} = 'paciente' AND ${mensajes.createdAt} >= ${todayStart})`,
          paciente30d: sql<number>`COUNT(*) FILTER (WHERE ${mensajes.rol} = 'paciente' AND ${mensajes.createdAt} >= ${thirtyDaysAgo})`,
          ia30d: sql<number>`COUNT(*) FILTER (WHERE ${mensajes.rol} = 'asistente_ia' AND ${mensajes.createdAt} >= ${thirtyDaysAgo})`,
        })
        .from(mensajes)
        .where(and(gte(mensajes.createdAt, thirtyDaysAgo), mensFilterExtra ?? undefined))
        .limit(1);

      const mensajesHoyCount = Number(mensajesStats[0]?.pacienteHoy ?? 0);
      const msgPaciente30d = Number(mensajesStats[0]?.paciente30d ?? 0);
      const msgIa30d = Number(mensajesStats[0]?.ia30d ?? 0);

      const tasaRespuesta = msgPaciente30d > 0
        ? Math.min(100, Math.round((msgIa30d / msgPaciente30d) * 100))
        : 0;

      // ─── Tiempo promedio de respuesta (simplificado) ────────
      let tiempoPromedioMinutos = 0;
      try {
        const tiempos = await db
          .select({
            diff: sql<number>`AVG(
              EXTRACT(EPOCH FROM (
                (SELECT MIN(m2.created_at) FROM mensajes m2 WHERE m2.conversacion_id = m.conversacion_id AND m2.rol = 'asistente_ia')
                -
                (SELECT MIN(m1.created_at) FROM mensajes m1 WHERE m1.conversacion_id = m.conversacion_id AND m1.rol = 'paciente')
              )) / 60
            )`,
          })
          .from(sql`mensajes m`)
          .where(sql`EXISTS (SELECT 1 FROM mensajes m3 WHERE m3.conversacion_id = m.conversacion_id AND m3.rol = 'asistente_ia')
            AND m.created_at >= ${thirtyDaysAgo}`)
          .limit(1);

        const diff = Number(tiempos[0]?.diff ?? 0);
        if (diff > 0 && diff < 1440) tiempoPromedioMinutos = Math.round(diff);
      } catch {
        // Silencioso — métrica no crítica
      }

      // ─── PRÓXIMOS TURNOS ────────────────────────────────────
      let proximosTurnos: Array<{ hora: string; paciente: string; tipo: string; estado: string; medico: string }> = [];

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
          .where(and(gte(turnos.fechaHora, todayStart), lt(turnos.fechaHora, todayEnd), sql`${turnos.deletedAt} IS NULL`, ...sucursalFilter, ...medicoFilter))
          .orderBy(turnos.fechaHora)
          .limit(8);

        proximosTurnos = turnosQuery.map((t) => ({
          hora: t.fechaHora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          paciente: `${t.pacienteNombre || ''} ${t.pacienteApellido || ''}`.trim() || 'Paciente',
          tipo: t.motivo || t.tipoConsulta || 'Consulta',
          estado: t.estado,
          medico: t.medicoNombre || 'Médico',
        }));
      } catch { /* silencioso */ }

      // ─── ACTIVIDAD RECIENTE ─────────────────────────────────
      const actividadReciente: Array<{ hora: string; texto: string; tipo: string; timestamp: string }> = [];

      try {
        const eventos = await db
          .select({ tipo: pacienteEventos.tipo, descripcion: pacienteEventos.descripcion, createdAt: pacienteEventos.createdAt })
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
      } catch { /* silencioso */ }

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
          .where(and(eq(mensajes.rol, 'paciente'), isMedico ? eq(conversaciones.medicoId, sessionMedicoId!) : undefined))
          .orderBy(desc(mensajes.createdAt))
          .limit(5);

        for (const m of ultimosMensajes) {
          const nombre = `${m.pacienteNombre || ''} ${m.pacienteApellido || ''}`.trim() || 'Paciente';
          const textoCorto = m.contenido.length > 60 ? m.contenido.substring(0, 60) + '...' : m.contenido;
          actividadReciente.push({
            hora: m.createdAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            texto: `${nombre}: "${textoCorto}"`,
            tipo: 'consulta',
            timestamp: m.createdAt.toISOString(),
          });
        }
      } catch { /* silencioso */ }

      actividadReciente.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const topActividad = actividadReciente.slice(0, 8);

      // ─── Calcular KPIs derivados ────────────────────────────
      const diffTurnosStr = diffTurnos >= 0 ? `+${diffTurnos}` : `${diffTurnos}`;
      const diffPacientes = pacientesAnteriorCount > 0
        ? `+${Math.round((pacientesCount / pacientesAnteriorCount) * 100)}%`
        : pacientesCount > 0 ? '+100%' : '0%';

      return {
        kpis: [
          { title: 'Turnos Hoy', value: String(turnosHoyCount), change: diffTurnosStr, type: 'calendar' },
          { title: 'Pacientes Nuevos', value: String(pacientesCount), change: diffPacientes, type: 'users' },
          { title: 'Mensajes Pendientes', value: String(pendientesCount), change: pendientesCount > 0 ? 'Requiere atención' : '0', type: 'messages' },
          { title: 'Alertas', value: String(alertasCount), change: alertasCount > 0 ? 'Urgente' : 'Sin novedades', type: 'alert', urgent: alertasCount > 0 },
          { title: 'Tasa Respuesta', value: `${tasaRespuesta}%`, change: msgPaciente30d > 0 ? `${msgIa30d} respuestas` : 'Sin datos', type: 'response' },
          { title: 'Mensajes Hoy', value: String(mensajesHoyCount), change: tiempoPromedioMinutos > 0 ? `Prom. ${tiempoPromedioMinutos} min` : 'Sin métrica', type: 'today' },
        ],
        proximosTurnos,
        actividadReciente: topActividad,
        sistema: {
          online: true,
          conversacionesActivas: pendientesCount,
          datosReales: true,
        },
      };
    }, CACHE_TTL);

    // Seguridad extra: sanitizar Date objects antes de serializar
    return NextResponse.json(deepSanitize(data));
  } catch (error) {
    logStatsError(error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}


