import { safeLog, safeWarn, safeError } from '@/lib/logger';
import {
  sendMessage as sendChatwootMessage,
  getActiveMessagingChannel,
  findContactByPhone,
  getOrCreateConversation,
  getInboxId,
} from '@/lib/services/chatwoot';

/**
 * Envía un mensaje WhatsApp al canal activo (Chatwoot o Twilio legacy).
 * Detecta automáticamente según CANAL_MENSAJERIA.
 * @param params
 * @param params.to
 * @param params.body
 * @param params.pacienteId
 * @param params.conversationId
 */
export async function sendWhatsApp(params: {
  to: string;
  body: string;
  pacienteId?: string;
  conversationId?: number;
}): Promise<boolean> {
  const channel = getActiveMessagingChannel();

  if (channel === 'chatwoot') {
    const enviado = await sendViaChatwoot(params);
    if (enviado) return true;

    // Fallback: si Chatwoot no puede enviar (ej. sin contacto), usar Twilio
    safeWarn('[WhatsApp] Chatwoot no envió — fallback a Twilio');
    return sendViaTwilio(params);
  }

  return sendViaTwilio(params);
}

async function sendViaChatwoot(params: {
  to: string;
  body: string;
  conversationId?: number;
}): Promise<boolean> {
  let chatwootConvId = params.conversationId;

  if (!chatwootConvId) {
    // Sin conversationId: buscar contacto por teléfono y (re)usar su conversación
    try {
      const contacto = await findContactByPhone(params.to);
      if (contacto) {
        const inboxPacientes = getInboxId('pacientes');
        const conv = await getOrCreateConversation(contacto.id, inboxPacientes || '1');
        if (conv?.id) {
          chatwootConvId = Number(conv.id);
          safeLog(`[WhatsApp] Conversación Chatwoot ${chatwootConvId} para ${params.to}`);
        }
      }
    } catch (e) {
      safeWarn('[WhatsApp] No se pudo resolver conversación Chatwoot:', (e as Error).message);
    }
  }

  if (!chatwootConvId) {
    safeWarn('[WhatsApp] Chatwoot no tiene conversación para el destinatario');
    return false;
  }

  return sendChatwootMessage(chatwootConvId, params.body, 'outgoing');
}

async function sendViaTwilio(params: {
  to: string;
  body: string;
}): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    safeWarn('[WhatsApp] Falta configuración Twilio');
    return false;
  }

  const toNumber = params.to.startsWith('whatsapp:') ? params.to : `whatsapp:${params.to}`;
  const from = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: toNumber, From: from, Body: params.body }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      safeWarn(`[WhatsApp] Twilio error: ${res.status} ${text}`);
      return false;
    }
    return true;
  } catch (e) {
    safeError('[WhatsApp] Twilio exception:', (e as Error).message);
    return false;
  }
}
