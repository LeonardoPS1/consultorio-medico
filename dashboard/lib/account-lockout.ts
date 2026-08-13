// ============================================================
// Account Lockout - Protección contra fuerza bruta (PostgreSQL)
// ============================================================
//
// Reemplaza la versión in-memory que se perdía al reiniciar el servidor.
// Usa la tabla `account_lockouts` en PostgreSQL para persistencia.

import { eq, sql } from 'drizzle-orm';
import { accountLockouts } from '@/drizzle/schema';
import { db } from '@/lib/db';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Verifica si una cuenta está bloqueada.
 * @param {string} email - Correo del usuario a verificar.
 * @returns {Promise<{ locked: boolean; remainingMinutes?: number }>} Estado de bloqueo y minutos restantes si está bloqueado.
 */
export async function isAccountLocked(
  email: string,
): Promise<{ locked: boolean; remainingMinutes?: number }> {
  const key = email.toLowerCase().trim();

  const [entry] = await db
    .select()
    .from(accountLockouts)
    .where(eq(accountLockouts.email, key))
    .limit(1);

  if (!entry || !entry.lockedUntil) return { locked: false };

  const lockedUntil = new Date(entry.lockedUntil);
  const now = new Date();

  // Si ya pasó el tiempo de bloqueo, limpiar y permitir
  if (now >= lockedUntil) {
    await db.delete(accountLockouts).where(eq(accountLockouts.email, key));
    return { locked: false };
  }

  const remainingMs = lockedUntil.getTime() - now.getTime();
  const remainingMinutes = Math.ceil(remainingMs / 60_000);

  return { locked: true, remainingMinutes };
}

/**
 * Incrementa el contador de intentos fallidos.
 * Devuelve el estado de bloqueo.
 * @param {string} email - Correo del usuario con el intento fallido.
 * @returns {Promise<{ locked: boolean; remainingMinutes?: number }>} Estado de bloqueo tras incrementar el contador.
 */
export async function incrementFailedAttempts(
  email: string,
): Promise<{ locked: boolean; remainingMinutes?: number }> {
  const key = email.toLowerCase().trim();
  const now = new Date();

  const [existing] = await db
    .select()
    .from(accountLockouts)
    .where(eq(accountLockouts.email, key))
    .limit(1);

  if (existing) {
    const newAttempts = existing.attempts + 1;

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
      await db
        .update(accountLockouts)
        .set({
          attempts: newAttempts,
          lockedUntil,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(accountLockouts.email, key));

      return { locked: true, remainingMinutes: 15 };
    }

    await db
      .update(accountLockouts)
      .set({
        attempts: newAttempts,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(accountLockouts.email, key));

    return { locked: false };
  }

  // Primer intento fallido
  await db.insert(accountLockouts).values({
    email: key,
    attempts: 1,
  });

  return { locked: false };
}

/**
 * Resetea el contador de intentos fallidos (login exitoso).
 * @param {string} email - Correo del usuario a desbloquear.
 */
export async function resetFailedAttempts(email: string): Promise<void> {
  const key = email.toLowerCase().trim();
  await db.delete(accountLockouts).where(eq(accountLockouts.email, key));
}

/**
 * Devuelve los intentos restantes antes del bloqueo.
 * @param {string} email - Correo del usuario a consultar.
 * @returns {Promise<number>} Cantidad de intentos restantes.
 */
export async function getRemainingAttempts(email: string): Promise<number> {
  const key = email.toLowerCase().trim();

  const [entry] = await db
    .select()
    .from(accountLockouts)
    .where(eq(accountLockouts.email, key))
    .limit(1);

  if (!entry) return MAX_FAILED_ATTEMPTS;
  return Math.max(0, MAX_FAILED_ATTEMPTS - entry.attempts);
}
