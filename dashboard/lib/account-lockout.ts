// ============================================================
// Account Lockout - Protección contra fuerza bruta
// ============================================================

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos

// Mapa en memoria: email -> { attempts, lockedUntil }
const lockoutMap = new Map<string, { attempts: number; lockedUntil: number }>();

// Limpiar expirados cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    lockoutMap.forEach((entry, email) => {
      if (now > entry.lockedUntil) lockoutMap.delete(email);
    });
  }, 5 * 60_000);
}

/**
 * Verifica si una cuenta está bloqueada
 */
export function isAccountLocked(email: string): { locked: boolean; remainingMinutes?: number } {
  const entry = lockoutMap.get(email.toLowerCase().trim());
  if (!entry) return { locked: false };

  const now = Date.now();

  // Si ya pasó el tiempo de bloqueo, limpiar y permitir
  if (now > entry.lockedUntil) {
    lockoutMap.delete(email.toLowerCase().trim());
    return { locked: false };
  }

  const remainingMs = entry.lockedUntil - now;
  const remainingMinutes = Math.ceil(remainingMs / 60_000);

  return { locked: true, remainingMinutes };
}

/**
 * Incrementa el contador de intentos fallidos
 * Devuelve true si la cuenta quedó bloqueada
 */
export function incrementFailedAttempts(email: string): { locked: boolean; remainingMinutes?: number } {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const entry = lockoutMap.get(key);

  if (entry) {
    entry.attempts++;

    if (entry.attempts >= MAX_FAILED_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_DURATION_MS;
      return { locked: true, remainingMinutes: 15 };
    }

    return { locked: false };
  }

  // Primer intento fallido
  lockoutMap.set(key, { attempts: 1, lockedUntil: 0 });
  return { locked: false };
}

/**
 * Resetea el contador de intentos fallidos (login exitoso)
 */
export function resetFailedAttempts(email: string): void {
  lockoutMap.delete(email.toLowerCase().trim());
}

/**
 * Devuelve los intentos restantes antes del bloqueo
 */
export function getRemainingAttempts(email: string): number {
  const key = email.toLowerCase().trim();
  const entry = lockoutMap.get(key);
  if (!entry) return MAX_FAILED_ATTEMPTS;
  return Math.max(0, MAX_FAILED_ATTEMPTS - entry.attempts);
}
