import { sendMessage as sendChatwootMessage, getActiveMessagingChannel } from '@/lib/services/chatwoot';
import { safeLog, safeWarn, safeError } from '@/lib/logger';

/**
 * Envía un mensaje WhatsApp al canal activo (Chatwoot o Twilio legacy).
 * Detecta automáticamente según CANAL_MENSAJERIA.
 */
export async function sendWhatsApp(params: {
  to: string;
  body: string;
  pacienteId?: string;
  conversationId?: number;
}): Promise<boolean> {
  const channel = getActiveMessagingChannel();

  if (channel === 'chatwoot') {
    return sendViaChatwoot(params);
  }

  return sendViaTwilio(params);
}

async function sendViaChatwoot(params: {
  to: string;
  body: string;
  conversationId?: number;
}): Promise<boolean> {
  const chatwootConvId = params.conversationId;

  if (chatwootConvId) {
    return sendChatwootMessage(chatwootConvId, params.body, 'outgoing');
  }

  // Sin conversationId, intentamos buscar o crear conversación vía API de Chatwoot
  // Esto requiere tener el contacto creado previamente
  safeWarn('[WhatsApp] Chatwoot requiere conversationId para enviar mensajes');
  return false;
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
