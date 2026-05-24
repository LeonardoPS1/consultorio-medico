import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from 'twilio';
import { withRateLimit } from '@/lib/rate-limit';
import {
  getPacienteByTelefono,
  createPaciente,
  getConversaciones,
  createConversacion,
  createMensaje,
  updateMensajeByTwilioSid,
} from '@/lib/data-store';
import { detectSurveyResponse, storeSurveyResponse } from '@/lib/encuestas';

/**
 * Forwardea el webhook a n8n para procesamiento con IA.
 * Fire-and-forget: no bloquea la respuesta a Twilio.
 */
async function forwardToN8n(params: Record<string, string>) {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_INBOUND_URL;
  if (!n8nWebhookUrl) return;

  const body = new URLSearchParams(params).toString();
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET || 'aicoremed-secret-key-2026';
  try {
    await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-webhook-secret': webhookSecret,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    console.log('[Twilio] ➡️ Forwardeado a n8n');
  } catch (e) {
    console.warn('[Twilio] ⚠️ No se pudo forwardear a n8n:', (e as Error).message);
  }
}

/**
 * Envía una notificación WhatsApp al médico cuando un paciente escribe.
 * Fire-and-forget: si falla, solo se loguea el error.
 */
async function notifyDoctor(patientName: string, messagePreview: string, telefono: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const doctorNumber = process.env.TWILIO_DOCTOR_NUMBER;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !doctorNumber || !fromNumber) {
    console.warn('[Twilio] ⚠️ notifyDoctor: faltan env vars (TWILIO_ACCOUNT_SID, AUTH_TOKEN, DOCTOR_NUMBER, WHATSAPP_NUMBER)');
    return;
  }

  // No notificar si el que escribe es el propio médico
  const doctorPhone = doctorNumber.replace(/^(whatsapp:|sms:)/, '').trim();
  const senderPhone = telefono.replace(/^(whatsapp:|sms:)/, '').trim();
  if (doctorPhone === senderPhone) return;

  // Truncar mensaje largo para preview
  const preview = messagePreview.length > 80
    ? messagePreview.substring(0, 77) + '...'
    : messagePreview;

  const now = new Date().toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });

  const body = `🔔 Nuevo mensaje de ${patientName}\n📱 ${telefono}\n💬 "${preview}"\n⏰ ${now}`;

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const formData = new URLSearchParams({
      From: fromNumber,
      To: doctorNumber,
      Body: body,
    });

    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(8000),
    });
    console.log('[Twilio] ➡️ Notificación enviada al médico');
  } catch (e) {
    console.warn('[Twilio] ⚠️ No se pudo notificar al médico:', (e as Error).message);
  }
}

/**
 * Valida la firma de Twilio para asegurar que el request es legítimo.
 *
 - En producción: la validación es OBLIGATORIA. Si falta firma o token, se rechaza.
 - En desarrollo: si no hay TWILIO_AUTH_TOKEN configurado, se salta (útil para testing local).
 */
function validateTwilioRequest(
  request: NextRequest,
  params: Record<string, string>
): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  const signature = request.headers.get('x-twilio-signature');

  // En producción, la firma es obligatoria
  if (isProduction && !signature) {
    console.error('[Twilio] ⚠️ Request sin firma en producción — rechazado');
    return false;
  }

  // En desarrollo, si no hay firma ni token, skip
  if (!isProduction && !signature) {
    return true;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    if (isProduction) {
      console.error('[Twilio] ⚠️ TWILIO_AUTH_TOKEN no configurado en producción');
      return false;
    }
    console.warn('[Twilio] TWILIO_AUTH_TOKEN no configurado — saltando validación');
    return true;
  }

  // Reconstruir la URL exacta que Twilio llamó
  const host = request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const url = `${proto}://${host}${request.nextUrl.pathname}`;

  return validateRequest(authToken, signature as string, url, params);
}

/**
 * POST /api/webhooks/twilio
 *
 * Endpoint para recibir mensajes entrantes de Twilio (WhatsApp/SMS).
 *
 * Twilio envía los datos como form-urlencoded con estos campos:
 * - From: el número de quien envía (ej: "whatsapp:+5491155550101")
 * - Body: el texto del mensaje
 * - ProfileName: el nombre de perfil de WhatsApp (si aplica)
 * - MessageSid: ID único del mensaje en Twilio
 * - To: el número de Twilio que recibe
 * - MessageType: "text" | "image" | etc.
 *
 * Responde con TwiML para que Twilio procese la respuesta.
 */
export const POST = withRateLimit(async function POST(request: NextRequest) {
  try {
    // Twilio envía form-data, pero también aceptamos JSON para testing
    let from: string;
    let body: string;
    let profileName: string | null;
    let messageSid: string | null;
    let to: string | null;
    let params: Record<string, string> = {};

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await request.json();
      from = json.From || json.from;
      body = json.Body || json.body;
      profileName = json.ProfileName || json.profileName || null;
      messageSid = json.MessageSid || json.messageSid || null;
      to = json.To || json.to || null;

      // Recolectar params también para JSON (necesario para validación de firma)
      Object.entries(json).forEach(([key, value]) => {
        if (typeof value === 'string') params[key] = value;
      });
    } else {
      const formData = await request.formData();
      from = (formData.get('From') as string) || '';
      body = (formData.get('Body') as string) || '';
      profileName = (formData.get('ProfileName') as string) || null;
      messageSid = (formData.get('MessageSid') as string) || null;
      to = (formData.get('To') as string) || null;

      // Recolectar todos los params para validación de firma
      Array.from(formData.entries()).forEach(([key, value]) => {
        params[key] = value.toString();
      });
    }

    // Validar firma de Twilio
    if (!validateTwilioRequest(request, params)) {
      console.warn('[Twilio] ⚠️ Firma inválida — posible spoofing');
      return NextResponse.json({ error: 'Firma inválida' }, { status: 403 });
    }

    // ─────────────────────────────────────────────────────────────
    // STATUS CALLBACK: Twilio nos avisa el estado de un mensaje
    // enviado (entregado, leído, falló, etc.)
    // ─────────────────────────────────────────────────────────────
    const messageStatus = params.MessageStatus;
    const callbackMessageSid = params.MessageSid;

    if (messageStatus && callbackMessageSid) {
      const errorCode = params.ErrorCode || null;
      const errorMessage = params.ErrorMessage || null;

      console.log(
        `[Twilio] Status Callback — SID: ${callbackMessageSid}, Estado: ${messageStatus}` +
          (errorCode ? `, Error: ${errorCode} — ${errorMessage}` : '')
      );

      // Actualizar el mensaje en DB
      const updated = await updateMensajeByTwilioSid(callbackMessageSid, {
        twilioStatus: messageStatus,
        metadata: errorCode ? { errorCode, errorMessage } : undefined,
      });

      if (updated) {
        console.log(`[Twilio] Mensaje ${callbackMessageSid} actualizado → ${messageStatus}`);

        // Si el mensaje falló, loguear con más detalle
        if (messageStatus === 'failed' || messageStatus === 'undelivered') {
          console.error(
            `[Twilio] ⚠️ Mensaje fallido SID: ${callbackMessageSid}` +
              `, Error: ${errorCode} — ${errorMessage || 'sin detalle'}`
          );
        }
      } else {
        console.warn(`[Twilio] Mensaje ${callbackMessageSid} no encontrado en DB (puede ser de antes del tracking)`);
      }

      // Twilio espera un 200 vacío para status callbacks
      return new NextResponse(null, { status: 200 });
    }

    if (!from || !body) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: From, Body' },
        { status: 400 }
      );
    }

    // Limpiar el número de teléfono (sacar prefijo "whatsapp:")
    const telefono = from.replace(/^whatsapp:/, '').replace(/^sms:/, '').trim();

    // Buscar o crear paciente
    let paciente = await getPacienteByTelefono(telefono);

    if (!paciente) {
      // Intentar extraer nombre del ProfileName de WhatsApp
      const nombrePartes = profileName
        ? profileName.split(' ')
        : ['Paciente', telefono.slice(-4)];

      const nombre = nombrePartes[0] || 'Paciente';
      const apellido = nombrePartes.slice(1).join(' ') || telefono.slice(-4);

      paciente = await createPaciente({
        telefono,
        nombre,
        apellido,
        canalPreferido: from.startsWith('whatsapp') ? 'whatsapp' : 'sms',
        consentimientoWhatsapp: from.startsWith('whatsapp'),
        consentimientoEmail: false,
        fuente: from.startsWith('whatsapp') ? 'whatsapp' : 'sms',
        tags: [],
        metadata: { primeraVez: true },
      });
    }

    // Buscar conversación activa existente de este paciente
    const convsActivas = await getConversaciones({ estado: 'activa' });
    const convExistente = convsActivas.find((c) => c.pacienteId === paciente.id);

    let conversacionId: string;
    let esNueva = false;

    if (convExistente) {
      conversacionId = convExistente.id;
    } else {
      // Crear nueva conversación
      const nuevaConv = await createConversacion({
        pacienteId: paciente.id,
        canal: from.startsWith('whatsapp') ? 'whatsapp' : 'sms',
        mensajeInicial: body,
        rolMensajeInicial: 'paciente',
      });
      conversacionId = nuevaConv.id;
      esNueva = true;
    }

    // Guardar el mensaje
    const mensaje = await createMensaje({
      conversacionId,
      rol: 'paciente',
      contenido: body,
      tipo: 'texto',
      twilioSid: messageSid || undefined,
      twilioStatus: 'received',
    });

    console.log(`[Twilio] Mensaje recibido — ${conversacionId ? 'conversación existente' : 'nueva conversación'}`);

    // Detectar si es respuesta de encuesta (número 1-5)
    const survey = detectSurveyResponse(body);
    if (survey.esEncuesta && paciente) {
      storeSurveyResponse({
        pacienteId: paciente.id,
        puntaje: survey.puntaje!,
        comentario: body,
      }).catch(() => {});
    }

    // Forward a n8n para procesamiento con IA (fire-and-forget)
    forwardToN8n(params).catch(() => {});

    // Notificar al médico (fire-and-forget)
    const nombrePaciente = `${paciente.nombre} ${paciente.apellido}`.trim();
    notifyDoctor(nombrePaciente, body, telefono).catch(() => {});

    // Responder con TwiML si es una request de Twilio real
    const acceptHeader = request.headers.get('accept') || '';
    if (acceptHeader.includes('text/xml') || contentType.includes('application/x-www-form-urlencoded')) {
      // Respuesta TwiML: acuse de recibo básico
      const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Gracias por tu mensaje. Un asistente te responderá a la brevedad. 😊</Message>
</Response>`;

      return new NextResponse(twimlResponse, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Respuesta JSON para testing
    return NextResponse.json({
      success: true,
      message: 'Mensaje recibido y almacenado',
      data: {
        conversacionId,
        mensajeId: mensaje.id,
        esNueva,
        pacienteId: paciente.id,
      },
    });
  } catch (error) {
    console.error('[Twilio Webhook] Error:', error);
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        error: 'Error al procesar mensaje entrante',
        ...(isProduction ? {} : { details: (error as Error).message }),
      },
      { status: 500 }
    );
  }
}, { maxRequests: 60, windowMs: 60_000 }); // 60 requests/min para Twilio

/**
 * GET /api/webhooks/twilio
 *
 * Endpoint para verificación de webhook (Twilio challenge).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Twilio Challenge para validar el webhook
  const challenge = searchParams.get('hub.challenge');
  if (challenge) {
    return new NextResponse(challenge);
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Webhook de Twilio activo',
    timestamp: new Date().toISOString(),
  });
}
