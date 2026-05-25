/**
 * GET /api/portal/me — Datos del paciente autenticado
 * Protegido: requiere cookie portal_session
 */

import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { pacientes } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const [paciente] = await db
    .select({
      id: pacientes.id,
      nombre: pacientes.nombre,
      apellido: pacientes.apellido,
      telefono: pacientes.telefono,
      email: pacientes.email,
      dni: pacientes.dni,
      fechaNacimiento: pacientes.fechaNacimiento,
      direccion: pacientes.direccion,
      obraSocial: pacientes.obraSocial,
      numeroAfiliado: pacientes.numeroAfiliado,
      consentimientoWhatsapp: pacientes.consentimientoWhatsapp,
      consentimientoEmail: pacientes.consentimientoEmail,
    })
    .from(pacientes)
    .where(eq(pacientes.id, session.pacienteId))
    .limit(1);

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ paciente });
}
