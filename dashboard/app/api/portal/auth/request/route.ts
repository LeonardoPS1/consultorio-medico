/**
 * POST /api/portal/auth/request — Solicitar magic link
 *
 * Público (rate-limited). Recibe teléfono, genera token,
 * envía magic link por WhatsApp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateMagicLink, sendPortalMagicLinkWhatsApp } from '@/lib/portal-auth';
import { portalAuthRequestSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const parsed = portalAuthRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 });
  }
  const { telefono } = parsed.data;

  // Generar token y magic link
  const result = await generateMagicLink(telefono);

  if (!result) {
    return NextResponse.json(
      { error: 'Paciente no encontrado con ese número' },
      { status: 404 },
    );
  }

  // Obtener nombre del paciente para el mensaje
  const { db } = await import('@/lib/db');
  const { pacientes } = await import('@/drizzle/schema');
  const { eq } = await import('drizzle-orm');
  const [paciente] = await db
    .select({ nombre: pacientes.nombre })
    .from(pacientes)
    .where(eq(pacientes.telefono, telefono))
    .limit(1);

  const nombre = paciente?.nombre || '';

  // Enviar por WhatsApp (fire-and-forget)
  sendPortalMagicLinkWhatsApp(telefono, nombre, result.magicLink).catch(() => {});

  return NextResponse.json({
    success: true,
    mensaje: `Revisá tu WhatsApp. Te enviamos un enlace de acceso.`,
    // En desarrollo, mostrar el link
    ...(process.env.NODE_ENV === 'development' ? { devLink: result.magicLink } : {}),
  });
}
