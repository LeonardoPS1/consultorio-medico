/**
 * Operaciones masivas — WhatsApp, status turnos, exportación.
 */

import { db } from '@/lib/db';
import { safeLog, safeWarn, safeError } from '@/lib/logger';
import { pacientes, turnos } from '@/drizzle/schema';
import { eq, and, inArray, isNull, sql } from 'drizzle-orm';

// ─── Bulk WhatsApp ─────────────────────────────────────────

interface BulkWhatsAppResult {
  total: number;
  enviados: number;
  fallidos: number;
  detalles: { pacienteId: string; telefono: string; estado: 'enviado' | 'sin_consentimiento' | 'error'; error?: string }[];
}

const TWILIO_ACCOUNT_SID = () => process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = () => process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = () => process.env.TWILIO_WHATSAPP_NUMBER;

async function sendSingleMessage(telefono: string, mensaje: string): Promise<boolean> {
  const accountSid = TWILIO_ACCOUNT_SID();
  const authToken = TWILIO_AUTH_TOKEN();
  const fromNumber = TWILIO_FROM();
  if (!accountSid || !authToken || !fromNumber) return false;

  const numeroLimpio = telefono.startsWith('whatsapp:') ? telefono : `whatsapp:${telefono}`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const formData = new URLSearchParams({ From: fromNumber, To: numeroLimpio, Body: mensaje });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        signal: AbortSignal.timeout(10000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function bulkWhatsApp(
  pacienteIds: string[],
  mensaje: string,
  sucursalId?: string,
): Promise<BulkWhatsAppResult> {
  if (pacienteIds.length === 0) {
    return { total: 0, enviados: 0, fallidos: 0, detalles: [] };
  }

  const conditions = [inArray(pacientes.id, pacienteIds), isNull(pacientes.deletedAt)];
  if (sucursalId) conditions.push(eq(pacientes.sucursalId, sucursalId));

  const pacientesList = await db
    .select({ id: pacientes.id, telefono: pacientes.telefono, nombre: pacientes.nombre, consentimiento: pacientes.consentimientoWhatsapp })
    .from(pacientes)
    .where(and(...conditions));

  const detalles: BulkWhatsAppResult['detalles'] = [];
  let enviados = 0;
  let fallidos = 0;

  for (const p of pacientesList) {
    if (!p.telefono) {
      fallidos++;
      detalles.push({ pacienteId: p.id, telefono: '', estado: 'error', error: 'Sin teléfono' });
      continue;
    }
    if (!p.consentimiento) {
      fallidos++;
      detalles.push({ pacienteId: p.id, telefono: p.telefono, estado: 'sin_consentimiento' });
      continue;
    }

    const personalizado = mensaje.replace(/\{nombre\}/g, p.nombre);
    const ok = await sendSingleMessage(p.telefono, personalizado);

    if (ok) {
      enviados++;
      detalles.push({ pacienteId: p.id, telefono: p.telefono, estado: 'enviado' });
    } else {
      fallidos++;
      detalles.push({ pacienteId: p.id, telefono: p.telefono, estado: 'error', error: 'Error al enviar' });
    }
  }

  safeLog(`[BulkWhatsApp] ${enviados} enviados, ${fallidos} fallidos de ${pacientesList.length} pacientes`);

  return { total: pacienteIds.length, enviados, fallidos, detalles };
}

// ─── Bulk Status (Turnos) ──────────────────────────────────

export async function bulkUpdateTurnoStatus(
  turnoIds: string[],
  nuevoEstado: string,
): Promise<{ actualizados: number; total: number }> {
  if (turnoIds.length === 0) return { actualizados: 0, total: 0 };

  const conditions = [inArray(turnos.id, turnoIds), isNull(turnos.deletedAt)];

  const result = await db
    .update(turnos)
    .set({ estado: nuevoEstado, updatedAt: sql`NOW()` })
    .where(and(...conditions))
    .returning({ id: turnos.id });

  safeLog(`[BulkStatus] ${result.length} turnos actualizados a "${nuevoEstado}"`);
  return { actualizados: result.length, total: turnoIds.length };
}
