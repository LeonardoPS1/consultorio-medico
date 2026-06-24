/**
 * Verificación timing-safe de webhook secrets.
 *
 * Usa `crypto.timingSafeEqual` para evitar timing attacks
 * en la comparación de secrets compartidos entre servicios.
 *
 * @see https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
 */

import { timingSafeEqual } from 'crypto';

/**
 * Compara dos strings en tiempo constante para evitar timing attacks.
 * Si las longitudes difieren, se comparan con buffers padding para
 * no filtrar información sobre la longitud real del secret.
 */
export function verifyWebhookSecret(
  provided: string | null | undefined,
  expected: string,
): boolean {
  if (!provided || !expected) return false;

  const bufProvided = Buffer.from(provided);
  const bufExpected = Buffer.from(expected);

  // timingSafeEqual requiere buffers del mismo tamaño.
  // Creamos buffers padding con la longitud máxima para no filtrar
  // la longitud real del secret.
  const maxLen = Math.max(bufProvided.length, bufExpected.length);
  const paddedProvided = Buffer.alloc(maxLen, 0);
  const paddedExpected = Buffer.alloc(maxLen, 0);

  bufProvided.copy(paddedProvided);
  bufExpected.copy(paddedExpected);

  try {
    return timingSafeEqual(paddedProvided, paddedExpected);
  } catch {
    return false;
  }
}

/**
 * Helper para extraer secret del header x-webhook-secret
 * y compararlo con la variable de entorno.
 */
export function verifyRequestSecret(
  request: { headers: { get(name: string): string | null } },
  expectedSecret?: string,
): boolean {
  const headerSecret = request.headers.get('x-webhook-secret');
  const secret = expectedSecret ?? process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return false;
  return verifyWebhookSecret(headerSecret, secret);
}
