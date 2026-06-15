/**
 * LiveKit — Constantes y helpers del lado cliente
 * 
 * Este archivo NO importa livekit-server-sdk y es seguro para uso en Client Components.
 */

// ─── Constantes ────────────────────────────────────────────────

export const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://livekit.aicorebots.com';

/**
 * Genera el nombre de sala a partir del turno ID.
 * Formato: `consultorio_{turnoId}`
 */
export function getRoomName(turnoId: string): string {
  return `consultorio_${turnoId}`;
}

/**
 * Genera la URL completa de la videollamada para el paciente.
 * El token se pasa como query param para acceso directo.
 */
export function getSalaLink(
  turnoId: string,
  token: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://med.aicorebots.com';
  return `${baseUrl}/videollamada/${turnoId}?token=${encodeURIComponent(token)}`;
}