/**
 * POST /api/portal/auth/request — Solicitar magic link
 *
 * Público (rate-limited). Recibe teléfono, genera token,
 * envía magic link por WhatsApp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateMagicLink, sendPortalMagicLinkWhatsApp } from '@/lib/portal-auth';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const telefono = (body.telefono as string)?.trim();

  if (!telefono) {
    return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
  }

  // Rate-limit by IP: máximo 3 requests por minuto
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  // Simple in-memory rate limit (no importamos el rate-limit lib para evitar fs en edge)
  const now = Date.now();
  const windowMs = 60_000;
  const key = `portal-auth:${ip}`;
  const entry = (globalThis as Record<string, unknown>)[`_rate_${key}`] as { count: number; resetAt: number } | undefined;

  if (entry && now < entry.resetAt && entry.count >= 3) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá un minuto.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  if (!entry || now >= (entry?.resetAt || 0)) {
    (globalThis as Record<string, unknown>)[`_rate_${key}`] = { count: 1, resetAt: now + windowMs };
  } else {
    entry.count++;
  }

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
