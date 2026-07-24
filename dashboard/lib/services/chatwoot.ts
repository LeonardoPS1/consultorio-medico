import { createHmac, timingSafeEqual } from 'crypto';
import { safeLog, safeWarn, safeError } from '@/lib/logger';

function getBaseUrl(): string | null {
  return process.env.CHATWOOT_API_URL || null;
}
function getBotToken(): string | null {
  return process.env.CHATWOOT_BOT_TOKEN || null;
}
function getWebhookSecret(): string | null {
  return process.env.CHATWOOT_WEBHOOK_SECRET || null;
}

export function getActiveMessagingChannel(): 'chatwoot' | 'twilio' {
  return (process.env.CANAL_MENSAJERIA as 'chatwoot' | 'twilio') || 'chatwoot';
}

interface ChatwootContact {
  id: number;
  name: string;
  phone_number?: string;
  email?: string;
}

interface ChatwootConversation {
  id: number;
  contact_id: number;
  inbox_id: number;
  status: string;
}

interface ChatwootMessage {
  id: number;
  content: string;
  message_type: number;
  created_at: number;
  sender: { id: number; name: string } | null;
}

export async function createContact(
  name: string,
  phoneNumber: string,
  email?: string,
): Promise<ChatwootContact | null> {
  const baseUrl = getBaseUrl();
  const token = getBotToken();
  if (!baseUrl || !token) return null;

  const accountId = process.env.CHATWOOT_ACCOUNT_ID || '1';
  try {
    const res = await fetch(`${baseUrl}/api/v1/accounts/${accountId}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': token,
      },
      body: JSON.stringify({
        name,
        phone_number: phoneNumber,
        email,
        inbox_id: process.env.CHATWOOT_PATIENT_INBOX_ID || '1',
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      safeWarn(`[Chatwoot] Error creando contacto: ${res.status} ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    safeLog(`[Chatwoot] Contacto creado: ${data.payload?.contact?.id || data.id}`);
    return data.payload?.contact || data;
  } catch (e) {
    safeError('[Chatwoot] Error en createContact:', (e as Error).message);
    return null;
  }
}

export async function findContactByPhone(phoneNumber: string): Promise<ChatwootContact | null> {
  const baseUrl = getBaseUrl();
  const token = getBotToken();
  if (!baseUrl || !token) return null;

  const accountId = process.env.CHATWOOT_ACCOUNT_ID || '1';
  try {
    const res = await fetch(
      `${baseUrl}/api/v1/accounts/${accountId}/contacts/search?q=${encodeURIComponent(phoneNumber)}`,
      {
        headers: { 'api_access_token': token },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const contacts = data.payload || [];
    return contacts.find(
      (c: ChatwootContact) => c.phone_number?.replace(/\D/g, '') === phoneNumber.replace(/\D/g, ''),
    ) || null;
  } catch {
    return null;
  }
}

export async function getOrCreateConversation(
  contactId: number,
  inboxId?: string,
): Promise<ChatwootConversation | null> {
  const baseUrl = getBaseUrl();
  const token = getBotToken();
  if (!baseUrl || !token) return null;

  const accountId = process.env.CHATWOOT_ACCOUNT_ID || '1';
  const targetInbox = inboxId || process.env.CHATWOOT_PATIENT_INBOX_ID || '1';

  try {
    const res = await fetch(
      `${baseUrl}/api/v1/accounts/${accountId}/conversations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': token,
        },
        body: JSON.stringify({
          contact_id: contactId,
          inbox_id: targetInbox,
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) {
      safeWarn(`[Chatwoot] Error creando conversación: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data;
  } catch (e) {
    safeError('[Chatwoot] Error en getOrCreateConversation:', (e as Error).message);
    return null;
  }
}

export async function sendMessage(
  conversationId: number,
  content: string,
  messageType: 'outgoing' | 'incoming' = 'outgoing',
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const token = getBotToken();
  if (!baseUrl || !token) return false;

  const accountId = process.env.CHATWOOT_ACCOUNT_ID || '1';
  try {
    const res = await fetch(
      `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': token,
        },
        body: JSON.stringify({
          content,
          message_type: messageType === 'outgoing' ? 1 : 0,
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) {
      safeWarn(`[Chatwoot] Error enviando mensaje: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    safeError('[Chatwoot] Error en sendMessage:', (e as Error).message);
    return false;
  }
}

export async function sendTemplateMessage(
  conversationId: number,
  content: string,
): Promise<boolean> {
  return sendMessage(conversationId, content, 'outgoing');
}

export function verifyWebhookSignature(
  body: string,
  signatureHeader: string | null,
): boolean {
  const secret = getWebhookSecret();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      safeError('[Chatwoot] CHATWOOT_WEBHOOK_SECRET no configurado en producción');
      return false;
    }
    return true;
  }

  if (!signatureHeader) {
    if (process.env.NODE_ENV === 'production') return false;
    return true;
  }

  // Chatwoot firma con HMAC-SHA256 del body
  const hmac = createHmac('sha256', secret).update(body, 'utf-8').digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(hmac));
  } catch {
    return false;
  }
}

export function getInboxId(tipo: 'pacientes' | 'soporte'): string | null {
  if (tipo === 'soporte') return process.env.CHATWOOT_SUPPORT_INBOX_ID || null;
  return process.env.CHATWOOT_PATIENT_INBOX_ID || null;
}
