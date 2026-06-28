/**
 * buildContextoDB — Consulta datos reales de PostgreSQL en PARALELO
 * y los formatea para inyectar en el system prompt del asistente IA.
 *
 * TODAS las consultas se ejecutan en paralelo via Promise.all para
 * minimizar la latencia. Si alguna falla, se omite esa sección.
 *
 * Flujo de resolución de médico:
 * 1. Busca médico vinculado al usuario autenticado (medicos.usuarioId)
 * 2. Si no encuentra, busca el primer médico activo del tenant (no vinculado)
 * 3. Como último recurso, hace consultas a nivel tenant sin filtrar por médico
 */

import { db } from '@/lib/db';
import { turnos, pacientes, recetas, medicos, conversaciones } from '@/drizzle/schema';
import { eq, and, gte, lte, count, isNull, isNotNull, or } from 'drizzle-orm';

/**
 * Consulta datos reales del consultorio y los devuelve como texto
 * formateado para incluir en el system prompt.
 *
 * @param usuarioId - ID del usuario autenticado (session.user.id)
 * @param _ruta - Ruta actual del dashboard (reservado para contexto futuro)
 * @returns Texto con datos reales, o null si no se pudo consultar nada
 */
export async function buildContextoDB(
  usuarioId: string,
  _ruta?: string,
): Promise<string | null> {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // ─── 1. Resolver médico (rápido, query individual) ─────
    let medico = await db
      .select({ id: medicos.id, nombre: medicos.nombre })
      .from(medicos)
      .where(and(eq(medicos.usuarioId, usuarioId), isNull(medicos.deletedAt)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!medico) {
      medico = await db
        .select({ id: medicos.id, nombre: medicos.nombre })
        .from(medicos)
        .where(isNull(medicos.deletedAt))
        .limit(1)
        .then((r) => r[0] ?? null);
    }

    const medicoId = medico?.id;
    const filtroMedico = medicoId ? eq(turnos.medicoId, medicoId) : undefined;
    const filtroMedicoRecetas = medicoId ? eq(recetas.medicoId, medicoId) : undefined;

    // ─── 2. Ejecutar TODAS las consultas en PARALELO ──────
    const turnosWhere = and(
      filtroMedico,
      gte(turnos.fechaHora, new Date(today + 'T00:00:00.000Z')),
      lte(turnos.fechaHora, new Date(nextWeek + 'T23:59:59.999Z')),
      isNull(turnos.deletedAt),
    );

    const hoyWhere = and(
      filtroMedico,
      gte(turnos.fechaHora, new Date(today + 'T00:00:00.000Z')),
      lte(turnos.fechaHora, new Date(today + 'T23:59:59.999Z')),
      isNull(turnos.deletedAt),
    );

    const [
      turnosProximos,
      countHoyResult,
      countHoyConfirmadosResult,
      pacientesNuevosHoyResult,
      totalPacientesResult,
      pacientesConTurnosResult,
      recetasActivas,
      mensajesSinResponder,
      recetasPorVencer,
    ] = await Promise.all([
      // Turnos próximos (7 días)
      db
        .select({
          id: turnos.id,
          fechaHora: turnos.fechaHora,
          estado: turnos.estado,
          motivo: turnos.motivo,
          pacienteNombre: pacientes.nombre,
          pacienteApellido: pacientes.apellido,
        })
        .from(turnos)
        .innerJoin(pacientes, eq(turnos.pacienteId, pacientes.id))
        .where(turnosWhere)
        .orderBy(turnos.fechaHora)
        .limit(20)
        .catch(() => []),

      // Conteo turnos hoy
      db
        .select({ total: count() })
        .from(turnos)
        .where(hoyWhere)
        .then((r) => r[0])
        .catch(() => ({ total: 0 })),

      // Conteo confirmados hoy
      db
        .select({ total: count() })
        .from(turnos)
        .where(and(hoyWhere, eq(turnos.estado, 'confirmado')))
        .then((r) => r[0])
        .catch(() => ({ total: 0 })),

      // Pacientes nuevos hoy
      db
        .select({ total: count() })
        .from(pacientes)
        .where(
          and(
            gte(pacientes.createdAt, new Date(today + 'T00:00:00.000Z')),
            lte(pacientes.createdAt, new Date(today + 'T23:59:59.999Z')),
            isNull(pacientes.deletedAt),
          ),
        )
        .then((r) => r[0])
        .catch(() => ({ total: 0 })),

      // Total pacientes
      db
        .select({ total: count() })
        .from(pacientes)
        .where(isNull(pacientes.deletedAt))
        .then((r) => r[0])
        .catch(() => ({ total: 0 })),

      // Turnos próximos (conteo)
      db
        .select({ total: count() })
        .from(turnos)
        .where(
          and(
            gte(turnos.fechaHora, new Date(today + 'T00:00:00.000Z')),
            lte(turnos.fechaHora, new Date(nextWeek + 'T23:59:59.999Z')),
            isNull(turnos.deletedAt),
          ),
        )
        .then((r) => r[0])
        .catch(() => ({ total: 0 })),

      // Recetas activas/pendientes
      db
        .select({
          id: recetas.id,
          medicamento: recetas.medicamento,
          fechaFin: recetas.fechaFin,
          estado: recetas.estado,
        })
        .from(recetas)
        .where(
          and(
            filtroMedicoRecetas,
            or(eq(recetas.estado, 'activa'), eq(recetas.estado, 'pendiente')),
          ),
        )
        .limit(10)
        .catch(() => []),

      // Conversaciones activas (último mensaje del paciente = sin responder)
      db
        .select({ total: count() })
        .from(conversaciones)
        .where(
          and(
            eq(conversaciones.estado, 'activa'),
            eq(conversaciones.ultimoMensajeRol, 'paciente'),
            isNull(conversaciones.deletedAt),
          ),
        )
        .then((r) => r[0])
        .catch(() => ({ total: 0 })),

      // Recetas próximas a vencer (7 días)
      db
        .select({ total: count() })
        .from(recetas)
        .where(
          and(
            filtroMedicoRecetas,
            eq(recetas.estado, 'activa'),
            isNotNull(recetas.fechaFin),
            gte(recetas.fechaFin, today),
            lte(recetas.fechaFin, nextWeek),
          ),
        )
        .then((r) => r[0])
        .catch(() => ({ total: 0 })),
    ]);

    // ─── 3. Construir texto formateado ─────────────────────
    const partes: string[] = [];

    // Encabezado con médico
    partes.push(`📋 DATOS DEL CONSULTORIO — ${now.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    if (medico?.nombre) {
      partes.push(`👨‍⚕️ Médico: ${medico.nombre}`);
    }

    // Turnos próximos
    if (turnosProximos.length > 0) {
      partes.push(`\n📅 PRÓXIMOS TURNOS (${today} al ${nextWeek}):`);
      for (const t of turnosProximos) {
        const fecha = t.fechaHora
          ? new Date(t.fechaHora).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
          : '?';
        const hora = t.fechaHora
          ? new Date(t.fechaHora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
          : '?';
        const paciente = [t.pacienteNombre, t.pacienteApellido].filter(Boolean).join(' ');
        partes.push(`  • ${fecha} ${hora} — ${paciente} [${t.estado || 'pendiente'}]${t.motivo ? `: "${t.motivo}"` : ''}`);
      }
    } else {
      partes.push(`\n📅 No hay turnos programados del ${today} al ${nextWeek}.`);
    }

    // Resumen de hoy (compacto)
    partes.push(
      `📊 HOY: ${countHoyResult?.total ?? 0} turnos (${countHoyConfirmadosResult?.total ?? 0} confirmados) · ${pacientesNuevosHoyResult?.total ?? 0} pacientes nuevos · ${mensajesSinResponder?.total ?? 0} mensajes sin responder`,
    );

    // Totales
    partes.push(
      `📈 TOTALES: ${totalPacientesResult?.total ?? 0} pacientes · ~${pacientesConTurnosResult?.total ?? 0} turnos próximos · ${recetasActivas.length} recetas activas${recetasPorVencer?.total ? ` · ${recetasPorVencer.total} por vencer` : ''}`,
    );

    // Recetas activas
    if (recetasActivas.length > 0) {
      partes.push(`\n💊 RECETAS ACTIVAS:`);
      for (const r of recetasActivas) {
        const vencimiento = r.fechaFin
          ? ` (vence ${new Date(r.fechaFin).toLocaleDateString('es-CL')})`
          : '';
        partes.push(`  • ${r.medicamento} [${r.estado}]${vencimiento}`);
      }
    }

    return partes.join('\n');
  } catch (error) {
    console.error('[buildContextoDB] Error:', error);
    return null;
  }
}
