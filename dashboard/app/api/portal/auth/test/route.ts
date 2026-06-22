/**
 * POST /api/portal/auth/test — Acceso de prueba al portal (solo desarrollo)
 *
 * Permite ingresar al portal sin necesidad de número de teléfono ni magic link.
 * Solo funciona en NODE_ENV=development o localhost.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pacientes } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { setPortalSessionCookie } from '@/lib/portal-auth';
import { safeError } from '@/lib/logger';

export async function POST() {
  // Solo permitir en desarrollo
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) {
    return NextResponse.json({ error: 'No disponible en producción' }, { status: 403 });
  }

  try {
    // Buscar el primer paciente activo como paciente de prueba
    const [paciente] = await db
      .select({ id: pacientes.id, nombre: pacientes.nombre, apellido: pacientes.apellido, telefono: pacientes.telefono })
      .from(pacientes)
      .where(and(sql`${pacientes.deletedAt} IS NULL`))
      .orderBy(pacientes.createdAt)
      .limit(1);

    if (!paciente) {
      return NextResponse.json({ error: 'No hay pacientes de prueba disponibles. Creá un paciente primero.' }, { status: 404 });
    }

    // Crear sesión para el paciente
    const token = await setPortalSessionCookie({
      pacienteId: paciente.id,
      nombre: paciente.nombre || 'Paciente',
      apellido: paciente.apellido || 'Prueba',
      telefono: paciente.telefono || '+56900000000',
    });

    return NextResponse.json({ success: true, redirect: '/portal/dashboard', token }, { status: 200 });
  } catch (error) {
    safeError('[PortalAuthTest] Error:', error instanceof Error ? { message: error.message, stack: error.stack } : error);
    return NextResponse.json({ error: 'Error al generar acceso de prueba' }, { status: 500 });
  }
}
