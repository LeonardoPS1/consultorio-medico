import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pacientes, conversaciones, mensajes } from '@/drizzle/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { verifyWebhookSignature, sendMessage, getInboxId } from '@/lib/services/chatwoot';
import { safeLog, safeWarn, safeError } from '@/lib/logger';
import { z } from 'zod';
import { createHash } from 'crypto';

const chatwootSchema = z.object({
  event: z.string(),
  id: z.number().optional(),
  conversation: z.object({
    id: z.number(),
    contact_id: z.number(),
    inbox_id: z.number(),
    status: z.string().optional(),
    custom_attributes: z.record(z.unknown()).optional(),
  }).optional(),
  message: z.object({
    id: z.number(),
    content: z.string().optional(),
    message_type: z.number().optional(),
    source_id: z.string().optional(),
    sender: z.object({
      id: z.number(),
      name: z.string().optional(),
      phone_number: z.string().optional(),
      email: z.string().optional(),
    }).optional(),
  }).optional(),
  contact: z.object({
    id: z.number(),
    name: z.string().optional(),
    phone_number: z.string().optional(),
    email: z.string().optional(),
    additional_attributes: z.record(z.unknown()).optional(),
  }).optional(),
});

function getIdempotencyKey(payload: unknown): string {
  const msgId = (payload as Record<string, unknown>)?.message_conversation_id
    || (payload as Record<string, unknown>)?.id
    || JSON.stringify(payload);
  return `chatwoot:${createHash('sha256').update(String(msgId)).digest('hex').slice(0, 16)}`;
}

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get('x-chatwoot-signature') || req.headers.get('x-hub-signature-256');

  if (!verifyWebhookSignature(bodyText, signature)) {
    safeWarn('[Chatwoot Webhook] Firma inválida');
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = chatwootSchema.safeParse(payload);
  if (!parsed.success) {
    safeWarn(`[Chatwoot Webhook] Schema inválido: ${parsed.error.message}`);
    return NextResponse.json({ error: 'Schema inválido' }, { status: 400 });
  }

  const { event, conversation, message, contact } = parsed.data;

  if (event === 'conversation_status_changed' && conversation) {
    safeLog(`[Chatwoot] Conversación ${conversation.id} → ${conversation.status}`);
    return NextResponse.json({ ok: true });
  }

  if (event !== 'message_created' || !message || !conversation) {
    return NextResponse.json({ ok: true });
  }

  if (message.message_type === 1) {
    return NextResponse.json({ ok: true });
  }

  if (message.content === undefined || message.content === null) {
    return NextResponse.json({ ok: true });
  }

  const senderPhone = contact?.phone_number || message.sender?.phone_number;
  const senderName = contact?.name || message.sender?.name || 'Paciente';
  const messageContent = message.content.trim();

  if (!messageContent) {
    return NextResponse.json({ ok: true });
  }

  try {
    const inboxForSoporte = getInboxId('soporte');
    const esSoporte = inboxForSoporte && String(conversation.inbox_id) === inboxForSoporte;
    const rawPhone = senderPhone?.replace(/\D/g, '') || `chatwoot-${conversation.contact_id}`;

    let paciente = await db.query.pacientes.findFirst({
      where: and(
        eq(pacientes.telefono, rawPhone),
        isNull(pacientes.deletedAt),
      ),
    });

    if (!paciente && senderPhone) {
      const insertResult = await db.insert(pacientes).values({
        nombre: senderName,
        apellido: '',
        telefono: rawPhone,
        consentimientoWhatsapp: true,
      }).returning();
      paciente = insertResult[0];
      safeLog(`[Chatwoot] Paciente creado: ${paciente.nombre} (${rawPhone})`);
    }

    if (!paciente) {
      safeWarn(`[Chatwoot] No se pudo crear paciente para ${senderPhone || conversation.contact_id}`);
      return NextResponse.json({ ok: true });
    }

    const existeConversacion = await db.query.conversaciones.findFirst({
      where: and(
        eq(conversaciones.pacienteId, paciente.id),
        eq(conversaciones.estado, 'activa'),
      ),
    });

    let conversacionId: string;
    if (existeConversacion) {
      conversacionId = existeConversacion.id;
    } else {
      const insertConv = await db.insert(conversaciones).values({
        pacienteId: paciente.id,
        canal: 'whatsapp',
        estado: 'activa',
      }).returning();
      conversacionId = insertConv[0].id;
    }

    await db.insert(mensajes).values({
      conversacionId,
      contenido: messageContent,
      rol: 'paciente',
      tipo: 'texto',
      metadata: {
        chatwootMessageId: message.id,
        chatwootConversationId: conversation.id,
        inboxId: conversation.inbox_id,
        esSoporte,
      },
    });

    // Detectar respuestas a encuestas post-consulta (1-5)
    if (/^[1-5]$/.test(messageContent) && esSoporte) {
      return NextResponse.json({ ok: true });
    }

    // Detectar respuestas a recordatorios
    const upperMsg = messageContent.toUpperCase();
    if (['CONFIRMAR', 'CANCELAR'].includes(upperMsg)) {
      return NextResponse.json({ ok: true });
    }

    const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678';
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

    const n8nPayload = {
      canal: 'chatwoot',
      telefono: rawPhone,
      mensaje: messageContent,
      pacienteId: paciente.id,
      nombrePaciente: paciente.nombre,
      chatwootConversationId: conversation.id,
      chatwootContactId: conversation.contact_id,
      inboxId: conversation.inbox_id,
      esSoporte: Boolean(esSoporte),
    };

    const idempotencyKey = getIdempotencyKey(payload);

    fetch(`${n8nUrl}/webhook/consultorio-inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(n8nPayload),
      signal: AbortSignal.timeout(10000),
    }).catch((e) => safeWarn(`[Chatwoot] Error forwarding to n8n: ${(e as Error).message}`));

    return NextResponse.json({ ok: true });
  } catch (e) {
    safeError('[Chatwoot Webhook] Error:', (e as Error).message);
    return NextResponse.json({ ok: true });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Allow': 'POST',
    },
  });
}
