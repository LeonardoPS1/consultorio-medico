import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { turnos, pacientes, conversaciones, pacienteEventos, mensajes } from '@/drizzle/schema';
import { eq, and, gte, lt, desc, sql, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { cache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_TTL = 30_000; // 30s — KPIs stale 30s es aceptable

// ─── Respuesta default cuando falla algo ────────────────────────
const DEFAULT_STATS_RESPONSE = {
  kpis: [
    { title: 'Turnos Hoy', value: '0', change: '0', type: 'calendar' },
    { title: 'Pacientes Nuevos', value: '0', change: '0%', type: 'users' },
    { title: 'Mensajes Pendientes', value: '0', change: '0', type: 'messages' },
    { title: 'Alertas', value: '0', change: 'Sin novedades', type: 'alert' },
    { title: 'Tasa Respuesta', value: '0%', change: 'Sin datos', type: 'response' },
    { title: 'Mensajes Hoy', value: '0', change: '0', type: 'today' },
  ],
  proximosTurnos: [] as Array<{
    hora: string;
    paciente: string;
    tipo: string;
    estado: string;
    medico: string;
  }>,
  actividadReciente: [] as Array<{ hora: string; texto: string; tipo: string; timestamp: string }>,
  sistema: { online: true, conversacionesActivas: 0, datosReales: false },
};

/**
 * GET /api/dashboard/stats
 *
 * Cacheado con TTL de 30s.
 * Siempre retorna status 200 — si falla alguna query devuelve KPIs en cero.
 * No propaga errores: el catch interno siempre retorna DEFAULT_STATS_RESPONSE.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    const sessionMedicoId = session?.user?.medicoId;
    const sessionRol = session?.user?.role;
    const isMedico = sessionRol === 'medico' && !!sessionMedicoId;

    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get('sucursalId') || undefined;

    const cacheKey = `dashboard:stats:${sessionMedicoId ?? 'admin'}:${sucursalId ?? 'todas'}`;

    const data = await cache.getOrSet(
      cacheKey,
      async () => {
        try {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
          const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
          const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
          const twoWeeksAgo = new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
          const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

          const medicoFilter = isMedico ? [eq(turnos.medicoId, sessionMedicoId!)] : [];
          const sucursalFilter = sucursalId ? [eq(turnos.sucursalId, sucursalId)] : [];
          const convMedicoFilter = isMedico ? [eq(conversaciones.medicoId, sessionMedicoId!)] : [];
          const pacSucFilter = sucursalId ? [eq(pacientes.sucursalId, sucursalId)] : [];

          // ─── KPI: Turnos (hoy vs ayer) ──────────────────────────
          const [turnosHoy, turnosAyer] = await Promise.all([
            db
              .select({ total: count() })
              .from(turnos)
              .where(
                and(
                  gte(turnos.fechaHora, todayStart),
                  lt(turnos.fechaHora, todayEnd),
                  sql`${turnos.deletedAt} IS NULL`,
                  ...sucursalFilter,
                  ...medicoFilter,
                ),
              ),
            db
              .select({ total: count() })
              .from(turnos)
              .where(
                and(
                  gte(turnos.fechaHora, yesterdayStart),
                  lt(turnos.fechaHora, todayStart),
                  sql`${turnos.deletedAt} IS NULL`,
                  ...sucursalFilter,
                  ...medicoFilter,
                ),
              ),
          ]);

          const turnosHoyCount = Number(turnosHoy[0]?.total ?? 0);
          const turnosAyerCount = Number(turnosAyer[0]?.total ?? 0);
          const diffTurnos = turnosHoyCount - turnosAyerCount;

          // ─── KPI: Pacientes nuevos (semana actual vs anterior) ──
          const pacienteFilterExtra = isMedico
            ? sql`EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.medicoId} = ${sessionMedicoId} AND ${turnos.deletedAt} IS NULL)`
            : undefined;

          const [pacientesNuevos, pacientesAnterior] = await Promise.all([
            db
              .select({ total: count() })
              .from(pacientes)
              .where(
                and(
                  gte(pacientes.createdAt, sevenDaysAgo),
                  sql`${pacientes.deletedAt} IS NULL`,
                  ...pacSucFilter,
                  pacienteFilterExtra,
                ),
              ),
            db
              .select({ total: count() })
              .from(pacientes)
              .where(
                and(
                  gte(pacientes.createdAt, twoWeeksAgo),
                  lt(pacientes.createdAt, sevenDaysAgo),
                  sql`${pacientes.deletedAt} IS NULL`,
                  ...pacSucFilter,
                  pacienteFilterExtra,
                ),
              ),
          ]);

          const pacientesCount = Number(pacientesNuevos[0]?.total ?? 0);
          const pacientesAnteriorCount = Number(pacientesAnterior[0]?.total ?? 0);

          // ─── KPI: Conversaciones activas ────────────────────────
          const [convActivas, alertas, mensajesStats] = await Promise.all([
            db
              .select({ total: count() })
              .from(conversaciones)
              .where(
                and(
                  eq(conversaciones.estado, 'activa'),
                  sql`${conversaciones.optOut} = false`,
                  sql`${conversaciones.deletedAt} IS NULL`,
                  ...convMedicoFilter,
                ),
              ),
            db
              .select({ total: count() })
              .from(pacienteEventos)
              .where(
                and(
                  eq(pacienteEventos.tipo, 'urgencia'),
                  gte(pacienteEventos.createdAt, todayStart),
                ),
              ),
            isMedico
              ? db
                  .select({
                    pacienteHoy: sql<number>`COUNT(*) FILTER (WHERE ${mensajes.rol} = 'paciente' AND ${mensajes.createdAt} >= ${todayStart})`,
                    paciente30d: sql<number>`COUNT(*) FILTER (WHERE ${mensajes.rol} = 'paciente' AND ${mensajes.createdAt} >= ${thirtyDaysAgo})`,
                    ia30d: sql<number>`COUNT(*) FILTER (WHERE ${mensajes.rol} = 'asistente_ia' AND ${mensajes.createdAt} >= ${thirtyDaysAgo})`,
                  })
                  .from(mensajes)
                  .where(
                    and(
                      gte(mensajes.createdAt, thirtyDaysAgo),
                      sql`EXISTS (SELECT 1 FROM conversaciones c WHERE c.id = ${mensajes.conversacionId} AND c.medico_id = ${sessionMedicoId})`,
                    ),
                  )
                  .limit(1)
              : db
                  .select({
                    pacienteHoy: sql<number>`COUNT(*) FILTER (WHERE ${mensajes.rol} = 'paciente' AND ${mensajes.createdAt} >= ${todayStart})`,
                    paciente30d: sql<number>`COUNT(*) FILTER (WHERE ${mensajes.rol} = 'paciente' AND ${mensajes.createdAt} >= ${thirtyDaysAgo})`,
                    ia30d: sql<number>`COUNT(*) FILTER (WHERE ${mensajes.rol} = 'asistente_ia' AND ${mensajes.createdAt} >= ${thirtyDaysAgo})`,
                  })
                  .from(mensajes)
                  .where(gte(mensajes.createdAt, thirtyDaysAgo))
                  .limit(1),
          ]);

          const pendientesCount = Number(convActivas[0]?.total ?? 0);
          const alertasCount = Number(alertas[0]?.total ?? 0);
          const mensajesHoyCount = Number(mensajesStats[0]?.pacienteHoy ?? 0);
          const msgPaciente30d = Number(mensajesStats[0]?.paciente30d ?? 0);
          const msgIa30d = Number(mensajesStats[0]?.ia30d ?? 0);

          const tasaRespuesta =
            msgPaciente30d > 0 ? Math.min(100, Math.round((msgIa30d / msgPaciente30d) * 100)) : 0;

          // ─── PRÓXIMOS TURNOS ────────────────────────────────────
          let proximosTurnos: typeof DEFAULT_STATS_RESPONSE.proximosTurnos = [];
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
                  ...sucursalFilter,
                  ...medicoFilter,
                ),
              )
              .orderBy(turnos.fechaHora)
              .limit(8);

            proximosTurnos = turnosQuery.map((t) => ({
              hora: t.fechaHora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
              paciente:
                `${t.pacienteNombre || ''} ${t.pacienteApellido || ''}`.trim() || 'Paciente',
              tipo: t.motivo || t.tipoConsulta || 'Consulta',
              estado: t.estado,
              medico: t.medicoNombre || 'Médico',
            }));
          } catch {
            /* silencioso */
          }

          // ─── ACTIVIDAD RECIENTE ─────────────────────────────────
          let actividadReciente: typeof DEFAULT_STATS_RESPONSE.actividadReciente = [];
          try {
            const [eventos, ultimosMensajes] = await Promise.all([
              db
                .select({
                  tipo: pacienteEventos.tipo,
                  descripcion: pacienteEventos.descripcion,
                  createdAt: pacienteEventos.createdAt,
                })
                .from(pacienteEventos)
                .orderBy(desc(pacienteEventos.createdAt))
                .limit(10),
              db
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
                    isMedico ? eq(conversaciones.medicoId, sessionMedicoId!) : undefined,
                  ),
                )
                .orderBy(desc(mensajes.createdAt))
                .limit(5),
            ]);

            for (const ev of eventos) {
              if (ev.descripcion) {
                actividadReciente.push({
                  hora: String(
                    ev.createdAt?.toLocaleTimeString?.('es-CL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }) ?? '',
                  ),
                  texto: ev.descripcion,
                  tipo: ev.tipo,
                  timestamp: String(ev.createdAt?.toISOString?.() ?? ''),
                });
              }
            }
            for (const m of ultimosMensajes) {
              const nombre =
                `${m.pacienteNombre || ''} ${m.pacienteApellido || ''}`.trim() || 'Paciente';
              const textoCorto =
                m.contenido.length > 60 ? m.contenido.substring(0, 60) + '...' : m.contenido;
              actividadReciente.push({
                hora: String(
                  m.createdAt?.toLocaleTimeString?.('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }) ?? '',
                ),
                texto: `${nombre}: "${textoCorto}"`,
                tipo: 'consulta',
                timestamp: String(m.createdAt?.toISOString?.() ?? ''),
              });
            }

            actividadReciente.sort((a, b) => {
              const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return tb - ta;
            });
            actividadReciente = actividadReciente.slice(0, 8);
          } catch {
            /* silencioso */
          }

          // ─── Calcular KPIs derivados ────────────────────────────
          const diffTurnosStr = diffTurnos >= 0 ? `+${diffTurnos}` : `${diffTurnos}`;
          const diffPacientes =
            pacientesAnteriorCount > 0
              ? `+${Math.round((pacientesCount / pacientesAnteriorCount) * 100)}%`
              : pacientesCount > 0
                ? '+100%'
                : '0%';

          return {
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
                change: msgPaciente30d > 0 ? `${msgIa30d} respuestas` : 'Sin datos',
                type: 'response',
              },
              {
                title: 'Mensajes Hoy',
                value: String(mensajesHoyCount),
                change: '0',
                type: 'today',
              },
            ],
            proximosTurnos,
            actividadReciente,
            sistema: {
              online: true,
              conversacionesActivas: pendientesCount,
              datosReales: true,
            },
          };
        } catch {
          // Si falla TODO, devolver KPIs en cero en vez de propagar error
          return DEFAULT_STATS_RESPONSE;
        }
      },
      CACHE_TTL,
    );

    return NextResponse.json(data);
  } catch {
    // Último recurso: nunca fallar, siempre devolver datos
    return NextResponse.json(DEFAULT_STATS_RESPONSE);
  }
}
