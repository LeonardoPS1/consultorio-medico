/**
 * POST /api/portal/auth/test — Acceso de prueba al portal
 *
 * Permite ingresar al portal sin magic link.
 * Acepta { pacienteId } opcional para elegir qué paciente usar.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pacientes } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { setPortalSessionCookie } from '@/lib/portal-auth';
import { safeError } from '@/lib/logger';

export async function POST(req: Request) {
  const bypass = process.env.PORTAL_BYPASS === 'true';
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev && !bypass) {
    return NextResponse.json({ error: 'No disponible en producción' }, { status: 403 });
  }

  try {
    let body: { pacienteId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // body opcional
    }

    const whereClause = and(sql`${pacientes.deletedAt} IS NULL`);
    let targetPaciente;

    if (body.pacienteId) {
      // Buscar paciente específico
      [targetPaciente] = await db
        .select({
          id: pacientes.id,
          nombre: pacientes.nombre,
          apellido: pacientes.apellido,
          telefono: pacientes.telefono,
        })
        .from(pacientes)
        .where(and(eq(pacientes.id, body.pacienteId), whereClause))
        .limit(1);
    }

    if (!targetPaciente) {
      // Fallback: último paciente modificado
      [targetPaciente] = await db
        .select({
          id: pacientes.id,
          nombre: pacientes.nombre,
          apellido: pacientes.apellido,
          telefono: pacientes.telefono,
        })
        .from(pacientes)
        .where(whereClause)
        .orderBy(sql`${pacientes.updatedAt} DESC NULLS LAST`)
        .limit(1);
    }

    if (!targetPaciente) {
      return NextResponse.json(
        { error: 'No hay pacientes de prueba disponibles. Creá un paciente primero.' },
        { status: 404 },
      );
    }

    const token = await setPortalSessionCookie({
      pacienteId: targetPaciente.id,
      nombre: targetPaciente.nombre || 'Paciente',
      apellido: targetPaciente.apellido || 'Prueba',
      telefono: targetPaciente.telefono || '+56900000000',
    });

    return NextResponse.json(
      { success: true, redirect: '/portal/dashboard', paciente: targetPaciente },
      { status: 200 },
    );
  } catch (error) {
    safeError(
      '[PortalAuthTest] Error:',
      error instanceof Error ? { message: error.message, stack: error.stack } : error,
    );
    return NextResponse.json({ error: 'Error al generar acceso de prueba' }, { status: 500 });
  }
}
