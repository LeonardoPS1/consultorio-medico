/**
 * Utilidad de encriptación para credenciales.
 *
 * Usa AES-256-GCM con la clave AUTH_SECRET del entorno.
 * - encrypt(text) → texto encriptado en formato base64:iv:tag
 * - decrypt(text) → texto original
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Obtiene la clave de encriptación desde AUTH_SECRET.
 * En producción, AUTH_SECRET es OBLIGATORIO. Sin él, las credenciales
 * almacenadas no pueden desencriptarse.
 * En desarrollo, si no está configurado, usa un fallback local.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'AUTH_SECRET es obligatorio en producción. ' +
          'Configuralo en las variables de entorno del dashboard.',
      );
    }
    // En desarrollo sin AUTH_SECRET, usa hash de hostname + cwd como fallback
    // NO es seguro pero evita un string hardcodeado predecible
    const devFallback = process.env.HOSTNAME + process.cwd();
    return crypto.createHash('sha256').update(devFallback).digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encripta un texto usando AES-256-GCM.
 * Retorna: `base64(iv):base64(tag):base64(ciphertext)`
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag().toString('base64');

  return `${iv.toString('base64')}:${tag}:${encrypted}`;
}

/**
 * Desencripta un texto que fue encriptado con encrypt().
 * Formato esperado: `base64(iv):base64(tag):base64(ciphertext)`
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      return encryptedText; // texto plano, migrations legacy
    }

    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(parts[2], 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText; // valor legacy no encriptado
  }
}

/**
 * Enmascara un valor para mostrarlo en la UI.
 * Muestra solo los últimos 4 caracteres.
 * Ej: "AC****************************f3a2"
 */
export function maskValue(value: string): string {
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }
  const prefix = value.substring(0, 4);
  const suffix = value.substring(value.length - 4);
  const masked = '*'.repeat(Math.min(value.length - 8, 24));
  return `${prefix}${masked}${suffix}`;
}
