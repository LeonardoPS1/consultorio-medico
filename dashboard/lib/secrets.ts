/**
 * Gestión de secretos con soporte dual:
 * 1. Docker secrets (/run/secrets/<name>) — prioridad en producción
 * 2. Environment variables (process.env) — fallback para desarrollo
 *
 * Docker Swarm monta secrets como archivos en /run/secrets/<name>.
 * Esta capa permite que el mismo código funcione con ambas modalidades.
 */

import { readFileSync, existsSync } from 'fs';
import { safeLog, safeWarn } from '@/lib/logger';

const SECRETS_PATH = '/run/secrets';

/**
 * Lee un secreto desde Docker secrets o env var.
 *
 * Prioridad:
 * 1. Archivo en /run/secrets/<secretName> (Docker Swarm)
 * 2. Variable de entorno <envName> (desarrollo / Dokploy)
 *
 * @param secretName - Nombre del secreto en /run/secrets/
 * @param envName - Nombre de la variable de entorno (default: mismo que secretName)
 * @returns El valor del secreto o undefined si no se encuentra
 */
export function getSecret(secretName: string, envName?: string): string | undefined {
  const envVar = envName ?? secretName;

  // 1. Intentar leer desde Docker secrets
  const secretFile = `${SECRETS_PATH}/${secretName}`;
  try {
    if (existsSync(secretFile)) {
      const value = readFileSync(secretFile, 'utf-8').trim();
      if (value) {
        return value;
      }
    }
  } catch (err) {
    safeWarn(`[secrets] Error leyendo Docker secret ${secretName}:`, err);
  }

  // 2. Fallback a env var
  const envValue = process.env[envVar];
  if (envValue) {
    return envValue;
  }

  return undefined;
}

/**
 * Lee un secreto con valor por defecto. Loguea advertencia si no se encuentra.
 */
export function getSecretOrThrow(
  secretName: string,
  envName?: string,
  context?: string,
): string {
  const value = getSecret(secretName, envName);
  if (!value) {
    const msg = `[secrets] Secreto requerido no encontrado: ${secretName}${context ? ` (${context})` : ''}`;
    safeWarn(msg);
    throw new Error(msg);
  }
  return value;
}

/**
 * Verifica que todos los secretos requeridos estén disponibles.
 * Útil para health check o startup validation.
 */
export function verifySecrets(requiredSecrets: string[]): {
  missing: string[];
  present: string[];
} {
  const missing: string[] = [];
  const present: string[] = [];

  for (const secret of requiredSecrets) {
    const value = getSecret(secret);
    if (value) {
      present.push(secret);
    } else {
      missing.push(secret);
    }
  }

  if (missing.length > 0) {
    safeWarn(`[secrets] Secretos faltantes: ${missing.join(', ')}`);
  }

  return { missing, present };
}
