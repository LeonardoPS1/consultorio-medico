/**
 * Servicio de reembolsos para turnos pagados cancelados desde el portal.
 * Usa política configurable vía env vars (default sensato).
 *
 * Almacena info del reembolso en portal_pagos.metadata (JSONB).
 * No requiere migración.
 */

import { db } from '@/lib/db';
import { portalPagos, turnos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { safeLog, safeWarn, safeError } from '@/lib/logger';

// ─── Política de reembolso ───────────────────────────────────

export interface RefundPolicy {
  /** Horas antes del turno para reembolso completo */
  fullRefundCutoffHours: number;
  /** Horas antes del turno para reembolso parcial (% del total) */
  partialRefundCutoffHours: number;
  /** % a reembolsar en ventana parcial (0-100) */
  partialRefundPercent: number;
  /** Si el turno ya pasó, ¿se reembolsa? */
  refundAfterAppointment: boolean;
}

export function getRefundPolicy(): RefundPolicy {
  return {
    fullRefundCutoffHours: Number(process.env.REFUND_FULL_CUTOFF_HOURS) || 24,
    partialRefundCutoffHours: Number(process.env.REFUND_PARTIAL_CUTOFF_HOURS) || 4,
    partialRefundPercent: Number(process.env.REFUND_PARTIAL_PERCENT) || 50,
    refundAfterAppointment: process.env.REFUND_AFTER_APPOINTMENT === 'true',
  };
}

export interface RefundCalculation {
  eligible: boolean;
  tipo: 'completo' | 'parcial' | 'ninguno';
  montoOriginal: number;
  montoReembolso: number;
  mensaje: string;
}

/**
 * Calcula el reembolso según política y tiempo restante.
 */
export function calcularReembolso(
  fechaHoraTurno: Date,
  montoPagado: number,
  policy: RefundPolicy,
): RefundCalculation {
  const ahora = new Date();
  const horasRestantes = (fechaHoraTurno.getTime() - ahora.getTime()) / (1000 * 60 * 60);

  // Turno ya pasó
  if (horasRestantes < 0) {
    if (policy.refundAfterAppointment) {
      return {
        eligible: true,
        tipo: 'parcial',
        montoOriginal: montoPagado,
        montoReembolso: Math.round(montoPagado * (policy.partialRefundPercent / 100)),
        mensaje: `Reembolso parcial del ${policy.partialRefundPercent}% porque el turno ya pasó`,
      };
    }
    return {
      eligible: false,
      tipo: 'ninguno',
      montoOriginal: montoPagado,
      montoReembolso: 0,
      mensaje: 'No aplica reembolso para turnos que ya pasaron',
    };
  }

  // Reembolso completo (más de X horas de anticipación)
  if (horasRestantes >= policy.fullRefundCutoffHours) {
    return {
      eligible: true,
      tipo: 'completo',
      montoOriginal: montoPagado,
      montoReembolso: montoPagado,
      mensaje: `Reembolso completo (cancelaste con más de ${policy.fullRefundCutoffHours}h de anticipación)`,
    };
  }

  // Reembolso parcial (entre cutoff parcial y full)
  if (horasRestantes >= policy.partialRefundCutoffHours) {
    return {
      eligible: true,
      tipo: 'parcial',
      montoOriginal: montoPagado,
      montoReembolso: Math.round(montoPagado * (policy.partialRefundPercent / 100)),
      mensaje: `Reembolso parcial del ${policy.partialRefundPercent}% (cancelaste con ${Math.round(horasRestantes)}h de anticipación)`,
    };
  }

  // Sin reembolso (muy cerca del turno)
  return {
    eligible: false,
    tipo: 'ninguno',
    montoOriginal: montoPagado,
    montoReembolso: 0,
    mensaje: `No aplica reembolso para cancelaciones con menos de ${policy.partialRefundCutoffHours}h de anticipación`,
  };
}

/**
 * Procesa el reembolso vía MercadoPago y registra en metadata.
 */
export async function procesarReembolso(
  turnoId: string,
  pacienteId: string,
  refund: RefundCalculation,
): Promise<{ success: boolean; error?: string }> {
  if (!refund.eligible || refund.montoReembolso <= 0) {
    return { success: false, error: 'No hay reembolso disponible' };
  }

  // Buscar el pago completado
  const [pago] = await db
    .select({
      id: portalPagos.id,
      mercadopagoPaymentId: portalPagos.mercadopagoPaymentId,
      metadata: portalPagos.metadata,
    })
    .from(portalPagos)
    .where(
      and(
        eq(portalPagos.turnoId, turnoId),
        eq(portalPagos.pacienteId, pacienteId),
        eq(portalPagos.estado, 'completado'),
      ),
    )
    .limit(1);

  if (!pago) {
    return { success: false, error: 'No se encontró pago completado para este turno' };
  }

  // Verificar que no haya sido ya reembolsado
  const metadata = (pago.metadata || {}) as Record<string, unknown>;
  if (metadata.reembolsado) {
    return { success: false, error: 'Este turno ya fue reembolsado' };
  }

  // Procesar reembolso en MercadoPago
  const mpPaymentId = pago.mercadopagoPaymentId;
  if (!mpPaymentId) {
    return { success: false, error: 'El pago no tiene ID de MercadoPago' };
  }

  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return { success: false, error: 'MercadoPago no configurado' };
    }

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${mpPaymentId}/refunds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: refund.montoReembolso,
        }),
      },
    );

    if (!response.ok) {
      const errBody = await response.text();
      safeError('[Reembolso] Error MP:', { status: response.status, body: errBody });
      return { success: false, error: `Error de MercadoPago: ${response.status}` };
    }

    const mpResult = await response.json();

    // Actualizar metadata del pago con info del reembolso
    await db
      .update(portalPagos)
      .set({
        metadata: sql`jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{reembolso}',
          ${JSON.stringify({
            fecha: new Date().toISOString(),
            monto: refund.montoReembolso,
            tipo: refund.tipo,
            mercadopagoRefundId: mpResult.id,
          })}::jsonb
        )`,
      })
      .where(eq(portalPagos.id, pago.id));

    safeLog('[Reembolso] Reembolso procesado:', {
      turnoId,
      monto: refund.montoReembolso,
      tipo: refund.tipo,
      mpRefundId: mpResult.id,
    });

    return { success: true };
  } catch (e) {
    safeError('[Reembolso] Error procesando reembolso:', e instanceof Error ? e.message : e);
    return { success: false, error: 'Error interno al procesar reembolso' };
  }
}
