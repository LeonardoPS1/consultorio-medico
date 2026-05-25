/**
 * PATCH /api/portal/perfil — Actualizar datos del perfil
 * Protegido: requiere cookie portal_session
 * Solo permite editar: email, consentimientoWhatsapp, consentimientoEmail
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { pacientes } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.email !== undefined) updates.email = body.email;
  if (body.consentimientoWhatsapp !== undefined) updates.consentimientoWhatsapp = body.consentimientoWhatsapp;
  if (body.consentimientoEmail !== undefined) updates.consentimientoEmail = body.consentimientoEmail;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
  }

  await db
    .update(pacientes)
    .set(updates)
    .where(eq(pacientes.id, session.pacienteId));

  return NextResponse.json({ success: true });
}
