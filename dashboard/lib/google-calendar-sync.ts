/**
 * Google Calendar Sync — Dispara la sincronización de turnos a Google Calendar
 * via webhook hacia n8n.
 *
 * Fire-and-forget: no bloquea la respuesta de la API.
 *
 * Requisitos:
 * - n8n debe tener el workflow "08 - Google Calendar Sync" activo
 * - n8n debe tener credenciales OAuth2 de Google Calendar configuradas
 * - La env var N8N_BASE_URL debe apuntar al n8n interno
 */

// ─── Tipos ─────────────────────────────────────────────────

export type GCalSyncAction = 'create' | 'update' | 'delete';

export interface GCalSyncPayload {
  action: GCalSyncAction;
  turnoId: string;
  googleCalendarEventId?: string | null;
  fechaHora: string;
  duracionMinutos: number;
  pacienteNombre: string;
  pacienteTelefono?: string | null;
  medicoNombre?: string;
  motivo?: string | null;
}

// ─── Sincronizar con n8n ─────────────────────────────────────

/**
 * Envía una solicitud de sync al workflow de Google Calendar en n8n.
 * Fire-and-forget: timeout de 5s, no lanza error.
 */
export async function syncTurnoToGCal(payload: GCalSyncPayload): Promise<void> {
  try {
    const n8nBaseUrl = process.env.N8N_BASE_URL || 'http://172.18.0.1:5678';
    const webhookUrl = `${n8nBaseUrl}/webhook/google-calendar-sync`;

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': process.env.N8N_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      console.log(`[GCalSync] ✅ Sync enviado: ${payload.action} | turno ${payload.turnoId}`);
    } else {
      console.warn(`[GCalSync] ⚠️ n8n respondió ${res.status}: ${await res.text().catch(() => '')}`);
    }
  } catch (e) {
    // Si el workflow no está activo o n8n no responde, solo loguear
    console.warn(`[GCalSync] ⚠️ No se pudo sincronizar turno ${payload.turnoId}:`, (e as Error).message);
  }
}

// ─── Construir payload desde datos de turno ─────────────────

/**
 * Construye el payload para el webhook de n8n con los datos disponibles.
 */
export function buildGCalPayload(params: {
  action: GCalSyncAction;
  turnoId: string;
  googleCalendarEventId?: string | null;
  fechaHora: string;
  duracionMinutos?: number;
  pacienteNombre: string;
  pacienteTelefono?: string | null;
  medicoNombre?: string;
  motivo?: string | null;
}): GCalSyncPayload {
  return {
    action: params.action,
    turnoId: params.turnoId,
    googleCalendarEventId: params.googleCalendarEventId,
    fechaHora: params.fechaHora,
    duracionMinutos: params.duracionMinutos || 30,
    pacienteNombre: params.pacienteNombre,
    pacienteTelefono: params.pacienteTelefono,
    medicoNombre: params.medicoNombre,
    motivo: params.motivo,
  };
}
