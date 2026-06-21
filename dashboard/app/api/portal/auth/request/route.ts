/**
 * POST /api/portal/auth/request — Solicitar magic link
 *
 * Público (rate-limited). Recibe teléfono, genera token,
 * envía magic link por WhatsApp.
 * Valida blacklist y cancelaciones antes de permitir el acceso.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateMagicLink, sendPortalMagicLinkWhatsApp, contarCancelacionesMes } from '@/lib/portal-auth';
import { portalAuthRequestSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const parsed = portalAuthRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 });
  }
  const { telefono } = parsed.data;

  // Generar token y magic link (incluye rate limit + blacklist internos)
  const result = await generateMagicLink(telefono);

  if (!result) {
    // Ver si existe (vs rate limit / blacklist)
    const { db } = await import('@/lib/db');
    const { pacientes } = await import('@/drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const [existe] = await db
      .select({ id: pacientes.id })
      .from(pacientes)
      .where(eq(pacientes.telefono, telefono))
      .limit(1);

    if (!existe) {
      return NextResponse.json(
        { error: 'Paciente no encontrado con ese número' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: 'No se pudo generar el acceso. Intentá de nuevo más tarde.' },
      { status: 429 },
    );
  }

  // Obtener datos del paciente para el mensaje
  const { db } = await import('@/lib/db');
  const { pacientes } = await import('@/drizzle/schema');
  const { eq } = await import('drizzle-orm');
  const [paciente] = await db
    .select({ nombre: pacientes.nombre, id: pacientes.id })
    .from(pacientes)
    .where(eq(pacientes.telefono, telefono))
    .limit(1);

  const nombre = paciente?.nombre || '';
  const cancelaciones = paciente?.id ? await contarCancelacionesMes(paciente.id) : 0;

  // Enviar por WhatsApp (fire-and-forget)
  sendPortalMagicLinkWhatsApp(telefono, nombre, result.magicLink).catch(() => {});

  return NextResponse.json({
    success: true,
    mensaje: `Revisá tu WhatsApp. Te enviamos un enlace de acceso.`,
    cancelacionesMes: cancelaciones,
    ...(process.env.NODE_ENV === 'development' ? { devLink: result.magicLink } : {}),
  });
}
