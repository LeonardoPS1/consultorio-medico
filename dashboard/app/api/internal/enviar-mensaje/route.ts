import { NextResponse } from 'next/server';
import { sendWhatsApp } from '@/lib/whatsapp';
import { safeLog, safeWarn } from '@/lib/logger';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.NOVEDADES_INTERNAL_KEY;

export async function POST(request: Request) {
  const authHeader = request.headers.get('x-internal-key');
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { telefono, mensaje, conversationId } = await request.json();
  if (!telefono || !mensaje) {
    return NextResponse.json({ error: 'Faltan campos: telefono, mensaje' }, { status: 400 });
  }

  try {
    const ok = await sendWhatsApp({
      to: telefono,
      body: mensaje,
      conversationId: conversationId || undefined,
    });

    if (!ok) {
      safeWarn('[Enviar Mensaje] sendWhatsApp falló');
      return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 502 });
    }

    safeLog(`[Enviar Mensaje] ✅ Mensaje enviado a ${telefono}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    safeWarn('[Enviar Mensaje] Error:', (e as Error).message);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
