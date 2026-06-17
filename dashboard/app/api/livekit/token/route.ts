/**
 * POST /api/livekit/token
 *
 * Genera un token JWT firmado para acceder a una sala de LiveKit.
 *
 * Body:
 *   roomName: string  — nombre de la sala (ej: "consultorio_{turnoId}")
 *   identity?: string — nombre visible (opcional; si no se envía, se usa el de la sesión)
 *   role: 'medico' | 'paciente'
 *
 * Respuesta:
 *   { token: string, url: string, roomName: string, identity: string }
 *
 * Seguridad:
 *   - Médicos: requieren sesión autenticada (requireAuth), identity se deriva de session.user.name
 *   - Pacientes: require portal_session (verifica turno asociado), identity se deriva de session.nombre + apellido
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

  if (!roomName || !role) {
    fail('Faltan campos requeridos: roomName, role', 400);
  }

  if (!['medico', 'paciente'].includes(role)) {
    fail('role debe ser "medico" o "paciente"', 400);
  }

  // ─── Médico: requiere auth de dashboard ──────────────────
  if (role === 'medico') {
    const session = await requireAuth();

    // Verificar que el turno existe
    const turnoId = roomName.replace('consultorio_', '');
    const [turno] = await db
      .select({ id: turnos.id })
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

    // Cualquier médico/usuarix autenticadx puede generar token de sala.
    // La sesión NextAuth ya valida que es un usuario legítimo del sistema.
    // No restringimos por medicoId para soportar multi-médico, admin y secretarias.

    // Usar el nombre real del usuario desde la sesión como identidad visible
    const displayName = session.user.name || identity || 'Médico';
    const token = await generateMedicoToken(roomName, displayName);
    return ok({
      token,
      url: LIVEKIT_URL,
      roomName,
      identity: displayName,
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

    // Usar el nombre real del paciente desde la sesión del portal
    const displayName = identity || `${session.nombre} ${session.apellido}`.trim() || 'Paciente';
    const token = await generatePacienteToken(roomName, displayName);
    return ok({
      token,
      url: LIVEKIT_URL,
      roomName,
      identity: displayName,
    });
  }

  fail('Error interno', 500);
});
