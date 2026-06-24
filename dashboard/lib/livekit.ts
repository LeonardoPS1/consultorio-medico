/**
 * LiveKit — Generación de tokens JWT para videoconsultas
 *
 * API Key y Secret se configuran en env vars:
 *   LIVEKIT_API_KEY  — clave pública de LiveKit
 *   LIVEKIT_API_SECRET — secreto para firmar tokens
 *   LIVEKIT_URL      — URL pública wss://livekit.aicorebots.com
 *
 * Los tokens se generan con el SDK server-side:
 *   - Médico: permisos completos (puede cerrar sala, expulsar participantes)
 *   - Paciente: permisos básicos (solo publicar/subscribir)
 */

import { AccessToken } from 'livekit-server-sdk';

// ─── Constantes ────────────────────────────────────────────

export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
export const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
export const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://livekit.aicorebots.com';

// ─── Helpers ───────────────────────────────────────────────

function getEnvOrThrow(): { apiKey: string; apiSecret: string } {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error(
      'LiveKit no configurado: faltan LIVEKIT_API_KEY y/o LIVEKIT_API_SECRET en env vars',
    );
  }
  return { apiKey: LIVEKIT_API_KEY, apiSecret: LIVEKIT_API_SECRET };
}

/**
 * Genera el nombre de sala a partir del turno ID.
 * Formato: `consultorio_{turnoId}`
 */
export function getRoomName(turnoId: string): string {
  return `consultorio_${turnoId}`;
}

/**
 * Genera un token JWT para el médico (permisos completos).
 * - Puede publicar/subscribir audio/video
 * - Puede administrar la sala (kick, mute, close)
 */
export async function generateMedicoToken(roomName: string, identity: string): Promise<string> {
  const { apiKey, apiSecret } = getEnvOrThrow();
  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: identity,
    ttl: '24h',
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: true,
  });
  return at.toJwt();
}

/**
 * Genera un token JWT para el paciente (permisos limitados).
 * - Puede publicar/subscribir audio/video
 * - NO puede administrar la sala
 */
export async function generatePacienteToken(roomName: string, identity: string): Promise<string> {
  const { apiKey, apiSecret } = getEnvOrThrow();
  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: identity,
    ttl: '24h',
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: false,
  });
  return at.toJwt();
}

/**
 * Genera la URL completa de la videollamada para el paciente.
 * El token se pasa como query param para acceso directo.
 */
export function getSalaLink(turnoId: string, token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://med.aicorebots.com';
  return `${baseUrl}/videollamada/${turnoId}?token=${encodeURIComponent(token)}`;
}
