/**
 * POST /api/livekit/token
 *
 * Genera un token JWT firmado para acceder a una sala de LiveKit.
 *
 * Body:
 *   roomName: string  — nombre de la sala (ej: "consultorio_{turnoId}")
 *   identity: string  — nombre visible del participante
 *   role: 'medico' | 'paciente'
 *
 * Respuesta:
 *   { token: string, url: string, roomName: string }
 *
 * Seguridad:
 *   - Médicos: requieren sesión autenticada (requireAuth)
 *   - Pacientes: requieren portal_session (verifica turno asociado)
 */

import { NextRequest } from 'next/server';
import { apiHandler, ok, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import {
  getRoomName,
  generateMedicoToken,
  generatePacienteToken,
  LIVEKIT_URL,
} from '@/lib/livekit';
import { db } from '@/lib/db';
import { turnos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getPortalSession } from '@/lib/portal-auth';

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { roomName, identity, role } = body as {
    roomName?: string;
    identity?: string;
    role?: 'medico' | 'paciente';
  };

  if (!roomName || !identity || !role) {
    fail('Faltan campos requeridos: roomName, identity, role', 400);
  }

  if (!['medico', 'paciente'].includes(role)) {
    fail('role debe ser "medico" o "paciente"', 400);
  }

  // ─── Médico: requiere auth de dashboard ──────────────────
  if (role === 'medico') {
    const session = await requireAuth();

    // Verificar que el médico tiene acceso a este turno
    const turnoId = roomName.replace('consultorio_', '');
    const [turno] = await db
      .select({ medicoId: turnos.medicoId })
      .from(turnos)
      .where(
        and(
          eq(turnos.id, turnoId),
          sql`${turnos.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!turno) {
      fail('Turno no encontrado', 404);
    }

    // El médico autenticado debe coincidir con el médico del turno
    // o ser admin (se omite check si no hay match exacto por multi-médico)
    if (session.user.id && turno.medicoId && session.user.id !== turno.medicoId) {
      fail('No tenés permiso para acceder a esta videollamada', 403);
    }

    const token = generateMedicoToken(roomName, identity);
    return ok({
      token,
      url: LIVEKIT_URL,
      roomName,
    });
  }

  // ─── Paciente: requiere token de portal ──────────────────
  if (role === 'paciente') {
    const session = await getPortalSession().catch(() => null);
    if (!session) {
      fail('Sesión de portal no válida', 401);
    }

    // Verificar que el paciente tiene este turno
    const turnoId = roomName.replace('consultorio_', '');
    const [turno] = await db
      .select({ pacienteId: turnos.pacienteId })
      .from(turnos)
      .where(
        and(
          eq(turnos.id, turnoId),
          sql`${turnos.deletedAt} IS NULL`
        )
      )
      .limit(1);

    if (!turno) {
      fail('Turno no encontrado', 404);
    }

    if (turno.pacienteId !== session.pacienteId) {
      fail('No tenés permiso para acceder a esta videollamada', 403);
    }

    const token = generatePacienteToken(roomName, identity);
    return ok({
      token,
      url: LIVEKIT_URL,
      roomName,
    });
  }

  fail('Error interno', 500);
});
