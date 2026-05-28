/**
 * Service layer para Privacidad y Derechos ARCO (Acceso, Rectificación, Cancelación, Oposición, Portabilidad).
 *
 * Gestiona el ciclo de vida de consentimientos, solicitudes de baja, y anonimización de datos.
 *
 * Flujo de baja de datos:
 *   1. Solicitud → se registra en consentimiento_log (tipo='datos', accion='grant')
 *   2. Confirmación → cascade soft-delete de datos relacionados + anonimización PII
 *   3. Post-retención (90 días) → job de anonimización permanente en n8n (WF-09)
 */

import { db } from '@/lib/db';
import {
  consentimientoLog,
  pacientes,
  turnos,
  conversaciones,
  mensajes,
  recetas,
  historialMedico,
  pacienteEventos,
  tareasPendientes,
  facturacion,
  auditoriaAccesos,
  tenants,
} from '@/drizzle/schema';
import type { ConfigPrivacidad } from '@/drizzle/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { notFound } from '@/lib/api-handler';
import { anonymizeNombre, anonymizeEmail, anonymizeTelefono, anonymizeDocumento } from '@/lib/anonymize';

// ─── Tipos ──────────────────────────────────────────────────────

export type TipoConsentimiento = 'whatsapp' | 'email' | 'datos' | 'terminos';
export type AccionConsentimiento = 'grant' | 'revoke' | 'accept';

export interface RegistrarConsentimientoInput {
  pacienteId: string;
  tipo: TipoConsentimiento;
  accion: AccionConsentimiento;
  aceptado: boolean;
  ip?: string;
  userAgent?: string;
}

// ─── Constantes ──────────────────────────────────────────────────

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const PERIODO_RETENCION_DEFAULT = 90;

/**
 * Obtiene el período de retención configurado en la DB del tenant.
 * Fallback a 90 días si no hay configuración.
 */
export async function getPeriodoRetencionConfig(): Promise<number> {
  try {
    const [tenant] = await db
      .select({ configPrivacidad: tenants.configPrivacidad })
      .from(tenants)
      .where(eq(tenants.id, DEFAULT_TENANT_ID))
      .limit(1);
    if (tenant?.configPrivacidad) {
      const cfg = tenant.configPrivacidad as ConfigPrivacidad;
      if (cfg.periodoRetencionBajaDias && cfg.periodoRetencionBajaDias > 0) {
        return cfg.periodoRetencionBajaDias;
      }
    }
  } catch {
    // Si falla la lectura de DB, usar default
  }
  return PERIODO_RETENCION_DEFAULT;
}

/** Período de retención post-baja antes de anonimización definitiva (en días) — default, usar getPeriodoRetencionConfig() para valor actual */
export const PERIODO_RETENCION_BAJA_DIAS = PERIODO_RETENCION_DEFAULT;

// ─── Service ─────────────────────────────────────────────────────

export const privacidadService = {
  /**
   * Registra un evento de consentimiento en consentimiento_log.
   * Esta tabla es la fuente de verdad para auditoría de consentimientos.
   */
  async registrarConsentimiento(input: RegistrarConsentimientoInput) {
    const [result] = await db.insert(consentimientoLog).values({
      pacienteId: input.pacienteId,
      tipo: input.tipo,
      accion: input.accion,
      aceptado: input.aceptado,
      ip: input.ip || null,
      userAgent: input.userAgent || null,
    }).returning();
    return result;
  },

  /**
   * Obtiene el historial de consentimientos de un paciente.
   */
  async getHistorialConsentimiento(pacienteId: string) {
    return db
      .select()
      .from(consentimientoLog)
      .where(eq(consentimientoLog.pacienteId, pacienteId))
      .orderBy(consentimientoLog.createdAt);
  },

  /**
   * Solicitud de baja de datos (ARCO - Cancelación/Supresión).
   *
   * 1. Verifica que el paciente exista
   * 2. Registra la solicitud en consentimiento_log
   * 3. Registra en auditoria_accesos
   * 4. Devuelve el registro de consentimiento creado
   */
  async solicitarBaja(pacienteId: string, ip?: string, userAgent?: string) {
    const [paciente] = await db
      .select({ id: pacientes.id, nombre: pacientes.nombre })
      .from(pacientes)
      .where(and(eq(pacientes.id, pacienteId), sql`${pacientes.deletedAt} IS NULL`))
      .limit(1);

    if (!paciente) notFound('Paciente no encontrado');

    // Marcar bajaSolicitadaAt en el paciente
    await db.update(pacientes)
      .set({ bajaSolicitadaAt: new Date() })
      .where(eq(pacientes.id, pacienteId));

    // Registrar solicitud de baja en consentimiento_log
    const consent = await this.registrarConsentimiento({
      pacienteId,
      tipo: 'datos',
      accion: 'grant',
      aceptado: true,
      ip,
      userAgent,
    });

    // Registrar en auditoria_accesos
    try {
      await db.insert(auditoriaAccesos).values({
        accion: 'SOLICITUD_BAJA',
        entidad: 'pacientes',
        entidadId: pacienteId,
        detalle: `Solicitud de baja de datos iniciada para paciente ${paciente.nombre} (${pacienteId})`,
        ip: ip || null,
        userAgent: userAgent || null,
      });
    } catch {
      // No bloquear si falla la auditoría
    }

    return consent;
  },

  /**
   * Confirma y ejecuta la baja definitiva de datos del paciente.
   *
   * Realiza en orden:
   * 1. Soft-delete en tablas relacionadas (turnos, conversaciones, facturación)
   * 2. Hard-delete en mensajes (dependientes de conversaciones)
   * 3. Hard-delete en tablas sin deletedAt (historial, eventos, tareas)
   * 4. Marca recetas como historial
   * 5. Anonimiza datos PII del paciente (nombre, email, teléfono, documento)
   * 6. Soft-delete del paciente
   * 7. Notifica a n8n (fire-and-forget)
   * 8. Registra en auditoria_accesos
   */
  async confirmarBaja(pacienteId: string, ip?: string, userAgent?: string) {
    const [paciente] = await db
      .select()
      .from(pacientes)
      .where(and(eq(pacientes.id, pacienteId), sql`${pacientes.deletedAt} IS NULL`))
      .limit(1);

    if (!paciente) notFound('Paciente no encontrado');

    // ─── 1. Soft-delete turnos ────────────────────────────────
    await db.update(turnos)
      .set({ deletedAt: new Date() })
      .where(and(eq(turnos.pacienteId, pacienteId), sql`${turnos.deletedAt} IS NULL`));

    // ─── 2. Soft-delete conversaciones + hard-delete mensajes ─
    const convsActivas = await db
      .select({ id: conversaciones.id })
      .from(conversaciones)
      .where(and(eq(conversaciones.pacienteId, pacienteId), sql`${conversaciones.deletedAt} IS NULL`));

    if (convsActivas.length > 0) {
      const convIds = convsActivas.map(c => c.id);

      // Hard-delete mensajes de esas conversaciones
      await db.delete(mensajes)
        .where(inArray(mensajes.conversacionId, convIds));

      // Soft-delete conversaciones
      await db.update(conversaciones)
        .set({ deletedAt: new Date() })
        .where(inArray(conversaciones.id, convIds));
    }

    // ─── 3. Hard-delete tablas sin deletedAt ──────────────────
    await db.delete(historialMedico).where(eq(historialMedico.pacienteId, pacienteId));
    await db.delete(pacienteEventos).where(eq(pacienteEventos.pacienteId, pacienteId));
    await db.delete(tareasPendientes).where(eq(tareasPendientes.pacienteId, pacienteId));

    // ─── 4. Marcar recetas como historial ─────────────────────
    await db.update(recetas)
      .set({ estado: 'historial' })
      .where(eq(recetas.pacienteId, pacienteId));

    // ─── 5. Soft-delete facturación ──────────────────────────
    await db.update(facturacion)
      .set({ deletedAt: new Date() })
      .where(and(eq(facturacion.pacienteId, pacienteId), sql`${facturacion.deletedAt} IS NULL`));

    // ─── 6. Anonimizar PII del paciente + soft-delete ────────
    await db.update(pacientes)
      .set({
        nombre: anonymizeNombre(paciente.nombre) || 'Paciente',
        apellido: 'Anonimizado',
        email: anonymizeEmail(paciente.email),
        telefono: anonymizeTelefono(paciente.telefono) || '**********',
        dni: anonymizeDocumento(paciente.dni || paciente.rut || ''),
        rut: null,
        direccion: null,
        comuna: null,
        region: null,
        numeroAfiliado: null,
        alergias: null,
        medicacionCronica: null,
        notasMedicas: null,
        consentimientoWhatsapp: false,
        consentimientoEmail: false,
        deletedAt: new Date(),
      })
      .where(eq(pacientes.id, pacienteId));

    // ─── 7. Registrar en auditoria_accesos ────────────────────
    try {
      await db.insert(auditoriaAccesos).values({
        accion: 'BAJA_CONFIRMADA',
        entidad: 'pacientes',
        entidadId: pacienteId,
        detalle: `Baja de datos confirmada para paciente ${paciente.nombre}. Datos anonimizados y relacionados eliminados.`,
        ip: ip || null,
        userAgent: userAgent || null,
      });
    } catch {
      // No bloquear
    }

    // ─── 8. Notificar a n8n (fire-and-forget) ────────────────
    this.notificarBajaAN8n(pacienteId, paciente.nombre).catch(() => {});

    return { success: true, pacienteId };
  },

  /**
   * Notifica a n8n sobre la baja de un paciente para limpiar:
   * - n8n_chat_histories (memoria del agente)
   * - Datos relacionados en workflows
   * Fire-and-forget: no bloquea la respuesta.
   */
  async notificarBajaAN8n(pacienteId: string, pacienteNombre: string): Promise<void> {
    try {
      const n8nBaseUrl = process.env.N8N_BASE_URL || 'http://172.18.0.1:5678';
      const webhookUrl = `${n8nBaseUrl}/webhook/paciente-baja`;

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': process.env.N8N_WEBHOOK_SECRET || '',
        },
        body: JSON.stringify({
          action: 'paciente_baja',
          pacienteId,
          pacienteNombre,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // No bloquear si n8n no responde
    }
  },

  /**
   * Anonimización permanente post-período de retención.
   * Ejecutada por n8n WF-09 (cron) para pacientes con deletedAt > PERIODO_RETENCION_BAJA_DIAS.
   *
   * Actualmente los datos ya están anonimizados en confirmarBaja(),
   * pero este método puede ejecutarse para limpieza adicional o hard-delete.
   */
  async anonimizarPostRetencion(fechaLimite: Date): Promise<number> {
    const expirados = await db
      .select({ id: pacientes.id })
      .from(pacientes)
      .where(and(
        sql`${pacientes.deletedAt} IS NOT NULL`,
        sql`${pacientes.deletedAt} <= ${fechaLimite.toISOString()}::timestamptz`,
      ));

    if (expirados.length === 0) return 0;

    const ids = expirados.map(p => p.id);

    // Hard-delete definitivo de datos residuales
    await db.delete(historialMedico).where(inArray(historialMedico.pacienteId, ids));
    await db.delete(pacienteEventos).where(inArray(pacienteEventos.pacienteId, ids));
    await db.delete(tareasPendientes).where(inArray(tareasPendientes.pacienteId, ids));

    // Recetas: hard-delete si están en estado 'historial'
    await db.delete(recetas).where(and(
      inArray(recetas.pacienteId, ids),
      eq(recetas.estado, 'historial'),
    ));

    return expirados.length;
  },
};
