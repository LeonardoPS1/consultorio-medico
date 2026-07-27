import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/services/email';
import { safeLog, safeWarn } from '@/lib/logger';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.NOVEDADES_INTERNAL_KEY;

export async function POST(request: Request) {
  const authHeader = request.headers.get('x-internal-key');
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { to, subject, text, html } = await request.json();
  if (!to || !subject || !text) {
    return NextResponse.json({ error: 'Faltan campos: to, subject, text' }, { status: 400 });
  }

  const ok = await sendEmail({ to, subject, text, html });
  if (!ok) {
    safeWarn(`[Enviar Email] Falló envío a ${to}: ${subject}`);
    return NextResponse.json({ error: 'Error al enviar email' }, { status: 502 });
  }

  safeLog(`[Enviar Email] Email enviado a ${to}: ${subject}`);
  return NextResponse.json({ success: true });
}
