/**
 * PATCH /api/portal/perfil — Actualizar datos del perfil
 * Protegido: requiere cookie portal_session
 * Permite editar: email, sistemaSalud, regionId, comunaId, consentimientos
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { pacientes } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

const SISTEMAS_SALUD = ['fonasa', 'isapre', 'particular', 'otro'] as const;

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

  // Sistema de salud chileno
  if (body.sistemaSalud !== undefined) {
    if (!SISTEMAS_SALUD.includes(body.sistemaSalud as typeof SISTEMAS_SALUD[number])) {
      return NextResponse.json({ error: 'Sistema de salud inválido. Usá: fonasa, isapre, particular, otro' }, { status: 400 });
    }
    updates.sistemaSalud = body.sistemaSalud;
  }

  // Región y comuna
  if (body.regionId !== undefined) updates.regionId = body.regionId;
  if (body.comunaId !== undefined) updates.comunaId = body.comunaId;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
  }

  await db
    .update(pacientes)
    .set(updates)
    .where(eq(pacientes.id, session.pacienteId));

  return NextResponse.json({ success: true });
}
