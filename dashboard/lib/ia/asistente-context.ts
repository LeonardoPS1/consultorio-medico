/**
 * buildContextoDB — Consulta datos reales de PostgreSQL y los formatea
 * para inyectar en el system prompt del asistente IA.
 *
 * Esto evita que el modelo invente turnos, pacientes o recetas.
 * Se llama desde POST /api/ia/chat.
 */

import { db } from '@/lib/db';
import { turnos, pacientes, recetas, medicos } from '@/drizzle/schema';
import { eq, and, gte, lte, count, isNull } from 'drizzle-orm';

/**
 * Consulta datos reales del consultorio y los devuelve como texto
 * formateado para incluir en el system prompt.
 *
 * @param usuarioId - ID del usuario autenticado (session.user.id)
 * @param _ruta - Ruta actual del dashboard (reservado para contexto futuro)
 * @returns Texto con datos reales o null si no se pudo consultar
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

    // 1. Buscar el médico asociado al usuario autenticado
    const [medico] = await db
      .select({ id: medicos.id, nombre: medicos.nombre })
      .from(medicos)
      .where(and(eq(medicos.usuarioId, usuarioId), isNull(medicos.deletedAt)))
      .limit(1);

    if (!medico) return null;

    const partes: string[] = [];
    partes.push(`👨‍⚕️ Médico: ${medico.nombre}`);

    // ─── 2. Turnos próximos (hoy + próximos 7 días) ────────
    const turnosProximos = await db
      .select({
        id: turnos.id,
        fechaHora: turnos.fechaHora,
        estado: turnos.estado,
        motivo: turnos.motivo,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        pacienteTelefono: pacientes.telefono,
      })
      .from(turnos)
      .innerJoin(pacientes, eq(turnos.pacienteId, pacientes.id))
      .where(
        and(
          eq(turnos.medicoId, medico.id),
          gte(turnos.fechaHora, new Date(today + 'T00:00:00.000Z')),
          lte(turnos.fechaHora, new Date(nextWeek + 'T23:59:59.999Z')),
          isNull(turnos.deletedAt),
        ),
      )
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
        const telefono = t.pacienteTelefono
          ? ` (${t.pacienteTelefono})`
          : '';
        partes.push(
          `  • ${fecha} ${hora} | ${paciente}${telefono} | ${t.estado || 'pendiente'}${t.motivo ? ` | "${t.motivo}"` : ''}`,
        );
      }
    } else {
      partes.push(`📅 No hay turnos programados del ${today} al ${nextWeek}.`);
    }

    // ─── 3. Turnos de HOY (resumen) ─────────────────────────
    const [countHoy] = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          eq(turnos.medicoId, medico.id),
          gte(turnos.fechaHora, new Date(today + 'T00:00:00.000Z')),
          lte(turnos.fechaHora, new Date(today + 'T23:59:59.999Z')),
          isNull(turnos.deletedAt),
        ),
      );

    const [countHoyConfirmados] = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          eq(turnos.medicoId, medico.id),
          gte(turnos.fechaHora, new Date(today + 'T00:00:00.000Z')),
          lte(turnos.fechaHora, new Date(today + 'T23:59:59.999Z')),
          eq(turnos.estado, 'confirmado'),
          isNull(turnos.deletedAt),
        ),
      );

    partes.push(
      `📊 Turnos hoy (${today}): ${countHoy?.total ?? 0} total, ${countHoyConfirmados?.total ?? 0} confirmados.`,
    );

    // ─── 4. Pacientes nuevos hoy ────────────────────────────
    const [pacientesNuevosHoy] = await db
      .select({ total: count() })
      .from(pacientes)
      .where(
        and(
          gte(
            pacientes.createdAt,
            new Date(today + 'T00:00:00.000Z'),
          ),
          lte(
            pacientes.createdAt,
            new Date(today + 'T23:59:59.999Z'),
          ),
          isNull(pacientes.deletedAt),
        ),
      );

    const [totalPacientes] = await db
      .select({ total: count() })
      .from(pacientes)
      .where(isNull(pacientes.deletedAt));

    partes.push(
      `👥 Pacientes: ${totalPacientes?.total ?? 0} activos (${pacientesNuevosHoy?.total ?? 0} nuevos hoy).`,
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
          eq(recetas.medicoId, medico.id),
          eq(recetas.estado, 'activa'),
        ),
      )
      .limit(10);

    if (recetasActivas.length > 0) {
      partes.push(`💊 Recetas activas (${recetasActivas.length}):`);
      for (const r of recetasActivas) {
        const vencimiento = r.fechaFin
          ? ` (vence ${new Date(r.fechaFin).toLocaleDateString('es-CL')})`
          : '';
        partes.push(`  • ${r.medicamento}${vencimiento}`);
      }
    }

    return partes.join('\n');
  } catch (error) {
    console.error('[buildContextoDB] Error:', error);
    return null; // No interrumpir el chat si falla la consulta
  }
}
