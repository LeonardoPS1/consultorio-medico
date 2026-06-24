/**
 * Alertas inteligentes — detecta automáticamente eventos relevantes
 * y dispara notificaciones a los médicos/users correspondientes.
 *
 * Tipos de alertas:
 * - Cumpleaños de pacientes
 * - Ausentismo recurrente (2+ turnos no_asistio en 30 días)
 * - Pacientes críticos (alta frecuencia de consultas)
 * - Scoring alto de pacientes (riesgo de ausentismo)
 */

import { db } from '@/lib/db';
import { turnos, pacientes, historialMedico, listaEspera } from '@/drizzle/schema';
import { eq, and, sql, gte, lte, count, desc } from 'drizzle-orm';

// ─── Tipos ──────────────────────────────────────────────────

export interface AlertaCumpleanios {
  pacienteId: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  fechaNacimiento: string;
  edad: number;
  medicoId?: string;
}

export interface AlertaAusentismo {
  pacienteId: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  totalAusencias: number;
  ultimaAusencia: string;
  medicoId?: string;
}

export interface AlertaPacienteCritico {
  pacienteId: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  totalConsultas: number;
  ultimaConsulta: string;
  diagnostico?: string;
}

export interface AlertaScoreAlto {
  pacienteId: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  score: number;
  nivel: string;
  factores: { nombre: string; valor: number; peso: number }[];
}

// ─── Servicio ────────────────────────────────────────────────

export const alertasService = {
  /**
   * Detecta pacientes que cumplen años hoy.
   */
  async detectarCumpleanios(): Promise<AlertaCumpleanios[]> {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const dia = hoy.getDate();

    // PostgreSQL: extraer mes y día de fecha_nacimiento
    const rows = await db
      .select({
        id: pacientes.id,
        nombre: pacientes.nombre,
        apellido: pacientes.apellido,
        telefono: pacientes.telefono,
        fechaNacimiento: pacientes.fechaNacimiento,
      })
      .from(pacientes)
      .where(
        and(
          sql`EXTRACT(MONTH FROM ${pacientes.fechaNacimiento}) = ${mes}`,
          sql`EXTRACT(DAY FROM ${pacientes.fechaNacimiento}) = ${dia}`,
          sql`${pacientes.deletedAt} IS NULL`,
          sql`${pacientes.fechaNacimiento} IS NOT NULL`,
        ),
      );

    return rows.map((p) => {
      const birthYear = p.fechaNacimiento
        ? new Date(p.fechaNacimiento).getFullYear()
        : hoy.getFullYear();
      return {
        pacienteId: p.id,
        pacienteNombre: `${p.nombre} ${p.apellido}`,
        pacienteTelefono: p.telefono || '',
        fechaNacimiento: p.fechaNacimiento || '',
        edad: hoy.getFullYear() - birthYear,
      };
    });
  },

  /**
   * Detecta pacientes con 2+ turnos "no_asistio" en los últimos 30 días.
   */
  async detectarAusentismoRecurrente(dias?: number): Promise<AlertaAusentismo[]> {
    const ventana = dias ?? 30;
    const fechaLimite = new Date(Date.now() - ventana * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        pacienteId: turnos.pacienteId,
        totalAusencias: count(),
      })
      .from(turnos)
      .where(
        and(
          eq(turnos.estado, 'no_asistio'),
          gte(turnos.fechaHora, fechaLimite),
          sql`${turnos.deletedAt} IS NULL`,
        ),
      )
      .groupBy(turnos.pacienteId)
      .having(sql`count(*) >= 2`)
      .limit(50);

    if (rows.length === 0) return [];

    const pacienteIds = rows.map((r) => r.pacienteId);
    const pacientesRows = await db
      .select({
        id: pacientes.id,
        nombre: pacientes.nombre,
        apellido: pacientes.apellido,
        telefono: pacientes.telefono,
      })
      .from(pacientes)
      .where(and(sql`${pacientes.id} = ANY(${pacienteIds})`, sql`${pacientes.deletedAt} IS NULL`));

    const pacienteMap = new Map(pacientesRows.map((p) => [p.id, p]));

    return rows.map((r) => {
      const p = pacienteMap.get(r.pacienteId);
      return {
        pacienteId: r.pacienteId,
        pacienteNombre: p ? `${p.nombre} ${p.apellido}` : '—',
        pacienteTelefono: p?.telefono || '',
        totalAusencias: Number(r.totalAusencias),
        ultimaAusencia: fechaLimite.toISOString(),
      };
    });
  },

  /**
   * Detecta pacientes con alta frecuencia de consultas (+3 en los últimos 60 días).
   */
  async detectarPacientesCriticos(dias?: number): Promise<AlertaPacienteCritico[]> {
    const ventana = dias ?? 60;
    const fechaLimite = new Date(Date.now() - ventana * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        pacienteId: turnos.pacienteId,
        totalConsultas: count(),
      })
      .from(turnos)
      .where(and(gte(turnos.fechaHora, fechaLimite), sql`${turnos.deletedAt} IS NULL`))
      .groupBy(turnos.pacienteId)
      .having(sql`count(*) >= 3`)
      .limit(50);

    if (rows.length === 0) return [];

    const pacienteIds = rows.map((r) => r.pacienteId);
    const [pacientesRows, diagRows] = await Promise.all([
      db
        .select({
          id: pacientes.id,
          nombre: pacientes.nombre,
          apellido: pacientes.apellido,
          telefono: pacientes.telefono,
        })
        .from(pacientes)
        .where(
          and(sql`${pacientes.id} = ANY(${pacienteIds})`, sql`${pacientes.deletedAt} IS NULL`),
        ),
      db
        .select({
          pacienteId: historialMedico.pacienteId,
          descripcion: historialMedico.descripcion,
        })
        .from(historialMedico)
        .where(
          and(
            sql`${historialMedico.pacienteId} = ANY(${pacienteIds})`,
            eq(historialMedico.tipo, 'diagnostico'),
          ),
        )
        .orderBy(desc(historialMedico.createdAt))
        .limit(50),
    ]);

    const pacienteMap = new Map(pacientesRows.map((p) => [p.id, p]));
    const ultimoDiag = new Map<string, string>();
    for (const d of diagRows) {
      if (!ultimoDiag.has(d.pacienteId)) {
        ultimoDiag.set(d.pacienteId, typeof d.descripcion === 'string' ? d.descripcion : '');
      }
    }

    return rows.map((r) => {
      const p = pacienteMap.get(r.pacienteId);
      return {
        pacienteId: r.pacienteId,
        pacienteNombre: p ? `${p.nombre} ${p.apellido}` : '—',
        pacienteTelefono: p?.telefono || '',
        totalConsultas: Number(r.totalConsultas),
        ultimaConsulta: fechaLimite.toISOString(),
        diagnostico: ultimoDiag.get(r.pacienteId) || undefined,
      };
    });
  },

  /**
   * Detecta pacientes con score de riesgo alto (>=70) calculado por scoring-pacientes.
   */
  async detectarScoreAlto(): Promise<AlertaScoreAlto[]> {
    try {
      const { calcularTodosLosScores } = await import('@/lib/services/scoring-pacientes');
      const scores = await calcularTodosLosScores();
      if (!scores || scores.size === 0) return [];

      const altos: AlertaScoreAlto[] = [];
      for (const [pacienteId, s] of Array.from(scores)) {
        if (s.score >= 70) {
          altos.push({
            pacienteId,
            pacienteNombre: '',
            pacienteTelefono: '',
            score: s.score,
            nivel: s.nivel,
            factores: [
              { nombre: 'no_shows', valor: s.factores.noShows, peso: 40 },
              {
                nombre: 'cancelaciones_sin_aviso',
                valor: s.factores.cancelacionesSinAviso,
                peso: 25,
              },
              {
                nombre: 'tasa_no_confirmacion',
                valor: s.factores.totalTurnos - s.factores.turnosConfirmados,
                peso: 20,
              },
              {
                nombre: 'recordatorios_ignorados',
                valor: s.factores.recordatoriosEnviados - s.factores.recordatoriosLeidos,
                peso: 10,
              },
            ],
          });
        }
      }
      if (altos.length === 0) return [];

      const pacienteIds = altos.map((s) => s.pacienteId);
      const pacientesRows = await db
        .select({
          id: pacientes.id,
          nombre: pacientes.nombre,
          apellido: pacientes.apellido,
          telefono: pacientes.telefono,
        })
        .from(pacientes)
        .where(
          and(sql`${pacientes.id} = ANY(${pacienteIds})`, sql`${pacientes.deletedAt} IS NULL`),
        );

      const pacienteMap = new Map(pacientesRows.map((p) => [p.id, p]));

      return altos.map((s) => {
        const p = pacienteMap.get(s.pacienteId);
        return {
          pacienteId: s.pacienteId,
          pacienteNombre: p ? `${p.nombre} ${p.apellido}` : '—',
          pacienteTelefono: p?.telefono || '',
          score: s.score,
          nivel: s.nivel,
          factores: s.factores,
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * Dispara notificaciones para todas las alertas detectadas.
   * Debería llamarse desde n8n (cron) o manualmente.
   */
  async ejecutarTodasLasAlertas(): Promise<{
    cumpleanios: number;
    ausentismo: number;
    criticos: number;
    scoreAlto: number;
  }> {
    const { notificacionesService } = await import('@/lib/services/notificaciones');
    const { medicos: medicosTable } = await import('@/drizzle/schema');

    const medicosActivos = await db
      .select({
        id: medicosTable.id,
        usuarioId: medicosTable.usuarioId,
        nombre: medicosTable.nombre,
      })
      .from(medicosTable)
      .where(and(eq(medicosTable.activo, true), sql`${medicosTable.deletedAt} IS NULL`));

    let cumpleaniosCreadas = 0;
    let ausentismoCreadas = 0;
    let criticosCreados = 0;

    // ── Cumpleaños ──────────────────────────────────────────
    const cumples = await this.detectarCumpleanios();
    for (const cumple of cumples) {
      // Notificar a todos los médicos activos
      for (const medico of medicosActivos) {
        if (!medico.usuarioId) continue;
        try {
          await notificacionesService.create({
            usuarioId: medico.usuarioId,
            titulo: '🎂 Paciente cumple años hoy',
            descripcion: `${cumple.pacienteNombre} cumple ${cumple.edad} años hoy`,
            tipo: 'sistema',
            href: `/dashboard/pacientes/${cumple.pacienteId}`,
          });
          cumpleaniosCreadas++;
        } catch {
          /* continuar */
        }
      }
    }

    // ── Ausentismo ───────────────────────────────────────────
    const ausentes = await this.detectarAusentismoRecurrente();
    for (const ausente of ausentes) {
      for (const medico of medicosActivos) {
        if (!medico.usuarioId) continue;
        try {
          await notificacionesService.create({
            usuarioId: medico.usuarioId,
            titulo: '⚠️ Ausentismo recurrente',
            descripcion: `${ausente.pacienteNombre} tiene ${ausente.totalAusencias} inasistencias en los últimos 30 días`,
            tipo: 'sistema',
            href: `/dashboard/pacientes/${ausente.pacienteId}`,
          });
          ausentismoCreadas++;
        } catch {
          /* continuar */
        }
      }
    }

    // ── Críticos ─────────────────────────────────────────────
    const criticos = await this.detectarPacientesCriticos();
    for (const critico of criticos) {
      for (const medico of medicosActivos) {
        if (!medico.usuarioId) continue;
        try {
          await notificacionesService.create({
            usuarioId: medico.usuarioId,
            titulo: '🔴 Paciente con múltiples consultas',
            descripcion: `${critico.pacienteNombre} tiene ${critico.totalConsultas} consultas en los últimos 60 días${critico.diagnostico ? ` (${critico.diagnostico})` : ''}`,
            tipo: 'sistema',
            href: `/dashboard/pacientes/${critico.pacienteId}`,
          });
          criticosCreados++;
        } catch {
          /* continuar */
        }
      }
    }

    // ── Score alto ────────────────────────────────────────────
    const altos = await this.detectarScoreAlto();
    let scoreAltoCreadas = 0;
    for (const alto of altos) {
      for (const medico of medicosActivos) {
        if (!medico.usuarioId) continue;
        try {
          await notificacionesService.create({
            usuarioId: medico.usuarioId,
            titulo: '⚠️ Paciente con riesgo alto de ausentismo',
            descripcion: `${alto.pacienteNombre} tiene un score de riesgo ${alto.score} (${alto.nivel}) — revisar y considerar medidas preventivas`,
            tipo: 'sistema',
            href: `/dashboard/pacientes/${alto.pacienteId}`,
          });
          scoreAltoCreadas++;
        } catch {
          /* continuar */
        }
      }
    }

    return {
      cumpleanios: cumpleaniosCreadas,
      ausentismo: ausentismoCreadas,
      criticos: criticosCreados,
      scoreAlto: scoreAltoCreadas,
    };
  },

  /**
   * Ejecuta alertas y devuelve resumen (sin enviar notificaciones).
   * Útil para vista previa.
   */
  async previsualizar(): Promise<{
    cumpleanios: AlertaCumpleanios[];
    ausentismo: AlertaAusentismo[];
    criticos: AlertaPacienteCritico[];
    scoreAlto: AlertaScoreAlto[];
  }> {
    const [cumpleanios, ausentismo, criticos, scoreAlto] = await Promise.all([
      this.detectarCumpleanios(),
      this.detectarAusentismoRecurrente(),
      this.detectarPacientesCriticos(),
      this.detectarScoreAlto(),
    ]);
    return { cumpleanios, ausentismo, criticos, scoreAlto };
  },
};
