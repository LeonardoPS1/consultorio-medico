/**
 * buildContextoDB — Consulta datos reales de PostgreSQL y los formatea
 * para inyectar en el system prompt del asistente IA.
 *
 * Esto evita que el modelo invente turnos, pacientes o recetas.
 * Se llama desde POST /api/ia/chat.
 *
 * Flujo de resolución de médico:
 * 1. Busca médico vinculado al usuario autenticado (medicos.usuarioId)
 * 2. Si no encuentra, busca el primer médico activo del tenant (no vinculado)
 * 3. Como último recurso, hace consultas a nivel tenant sin filtrar por médico
 */

import { db } from '@/lib/db';
import { turnos, pacientes, recetas, medicos } from '@/drizzle/schema';
import { eq, and, gte, lte, count, isNull, or } from 'drizzle-orm';

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

    // ─── 1. Resolver médico ───────────────────────────────
    // 1a. Buscar médico vinculado al usuario
    let medico = await db
      .select({ id: medicos.id, nombre: medicos.nombre })
      .from(medicos)
      .where(and(eq(medicos.usuarioId, usuarioId), isNull(medicos.deletedAt)))
      .limit(1)
      .then((r) => r[0] ?? null);

    // 1b. Si no hay médico vinculado, buscar el primer médico activo
    if (!medico) {
      medico = await db
        .select({ id: medicos.id, nombre: medicos.nombre })
        .from(medicos)
        .where(isNull(medicos.deletedAt))
        .limit(1)
        .then((r) => r[0] ?? null);
    }

    // 1c. Condición base: si hay médico, filtrar por él
    //     Si no hay ningún médico, consultar sin filtro (tenant-level)
    const medicoId = medico?.id;
    const filtroMedico = medicoId ? eq(turnos.medicoId, medicoId) : undefined;
    const filtroMedicoRecetas = medicoId ? eq(recetas.medicoId, medicoId) : undefined;

    const partes: string[] = [];

    if (medico?.nombre) {
      partes.push(`👨‍⚕️ Médico: ${medico.nombre}`);
    }

    // ─── 2. Turnos próximos (hoy + próximos 7 días) ────────
    const turnosWhere = and(
      filtroMedico,
      gte(turnos.fechaHora, new Date(today + 'T00:00:00.000Z')),
      lte(turnos.fechaHora, new Date(nextWeek + 'T23:59:59.999Z')),
      isNull(turnos.deletedAt),
    );

    const turnosProximos = await db
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
      .limit(20);

    if (turnosProximos.length > 0) {
      partes.push(`📅 Turnos programados (${today} al ${nextWeek}):`);
      for (const t of turnosProximos) {
        const fecha = t.fechaHora
          ? new Date(t.fechaHora).toLocaleDateString('es-CL')
          : '?';
        const hora = t.fechaHora
          ? new Date(t.fechaHora).toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '?';
        const paciente = [t.pacienteNombre, t.pacienteApellido]
          .filter(Boolean)
          .join(' ');
        partes.push(
          `  • ${fecha} ${hora} | ${paciente} | ${t.estado || 'pendiente'}${t.motivo ? ` | "${t.motivo}"` : ''}`,
        );
      }
    } else {
      partes.push(`📅 No hay turnos programados del ${today} al ${nextWeek}.`);
    }

    // ─── 3. Turnos de HOY (resumen) ─────────────────────────
    const hoyWhere = and(
      filtroMedico,
      gte(turnos.fechaHora, new Date(today + 'T00:00:00.000Z')),
      lte(turnos.fechaHora, new Date(today + 'T23:59:59.999Z')),
      isNull(turnos.deletedAt),
    );

    const [countHoy] = await db
      .select({ total: count() })
      .from(turnos)
      .where(hoyWhere);

    const [countHoyConfirmados] = await db
      .select({ total: count() })
      .from(turnos)
      .where(and(hoyWhere, eq(turnos.estado, 'confirmado')));

    partes.push(
      `📊 Turnos hoy (${today}): ${countHoy?.total ?? 0} total, ${countHoyConfirmados?.total ?? 0} confirmados.`,
    );

    // ─── 4. Pacientes ─────────────────────────────────────
    const [pacientesNuevosHoy] = await db
      .select({ total: count() })
      .from(pacientes)
      .where(
        and(
          gte(pacientes.createdAt, new Date(today + 'T00:00:00.000Z')),
          lte(pacientes.createdAt, new Date(today + 'T23:59:59.999Z')),
          isNull(pacientes.deletedAt),
        ),
      );

    const [totalPacientes] = await db
      .select({ total: count() })
      .from(pacientes)
      .where(isNull(pacientes.deletedAt));

    // Contar pacientes con turnos próximos (pacientes activos)
    const [pacientesConTurnos] = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, new Date(today + 'T00:00:00.000Z')),
          lte(turnos.fechaHora, new Date(nextWeek + 'T23:59:59.999Z')),
          isNull(turnos.deletedAt),
        ),
      );

    partes.push(
      `👥 Pacientes: ${totalPacientes?.total ?? 0} registrados, ${pacientesNuevosHoy?.total ?? 0} nuevos hoy, ~${pacientesConTurnos?.total ?? 0} turnos en los próximos 7 días.`,
    );

    // ─── 5. Recetas activas ─────────────────────────────────
    const recetasActivas = await db
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
      .limit(10);

    if (recetasActivas.length > 0) {
      partes.push(`💊 Recetas activas/pendientes (${recetasActivas.length}):`);
      for (const r of recetasActivas) {
        const vencimiento = r.fechaFin
          ? ` (vence ${new Date(r.fechaFin).toLocaleDateString('es-CL')})`
          : '';
        partes.push(`  • ${r.medicamento} [${r.estado}]${vencimiento}`);
      }
    } else {
      partes.push(`💊 No hay recetas activas o pendientes.`);
    }

    // ─── 6. Agregar fecha/hora actual ──────────────────────
    partes.push(
      `\n📌 Fecha y hora actual del sistema: ${now.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}.`,
    );

    return partes.join('\n');
  } catch (error) {
    console.error('[buildContextoDB] Error:', error);
    return null; // No interrumpir el chat si falla la consulta
  }
}
