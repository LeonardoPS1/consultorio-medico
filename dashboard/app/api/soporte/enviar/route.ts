/**
 * API para enviar mensajes de soporte desde el Dashboard.
 * Enruta a través de Chatwoot (inbox soporte) si está configurado,
 * o directamente como notificación al equipo.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendWhatsApp } from '@/lib/whatsapp';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { asunto, mensaje } = await req.json();
  if (!mensaje?.trim()) {
    return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
  }

  const tenantId = (session.user as { tenantId?: string }).tenantId;
  const email = session.user.email ?? 'desconocido@email.com';
  const nombre = session.user.name ?? 'Usuario';

  const canal = process.env.CANAL_MENSAJERIA || 'twilio';
  const soportePhone = process.env.TWILIO_DOCTOR_NUMBER;
  const chatwootSupportInbox = process.env.CHATWOOT_SUPPORT_INBOX_ID;

  try {
    if (canal === 'chatwoot' && chatwootSupportInbox) {
      const {
        createContact,
        getOrCreateConversation,
        sendMessage: chatwootSend,
      } = await import('@/lib/services/chatwoot');
      const contact = await createContact(nombre, '', email);
      if (!contact) throw new Error('No se pudo crear contacto en Chatwoot');
      const conversation = await getOrCreateConversation(contact.id, chatwootSupportInbox);
      if (!conversation) throw new Error('No se pudo crear conversación en Chatwoot');
      const body = `*${asunto}*\n\n${mensaje}\n\n— ${nombre} (${email})`;
      await chatwootSend(conversation.id, body);
    } else if (soportePhone) {
      const body = `[Soporte Dashboard] ${asunto}\n\n${mensaje}\n\n— ${nombre} (${email})`;
      await sendWhatsApp({ to: soportePhone, body });
    } else {
      return NextResponse.json(
        { error: 'No hay canal de soporte configurado' },
        { status: 503 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Soporte] Error al enviar mensaje:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
