import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'

const MAX_FAILED_ATTEMPTS = 5
const WINDOW_MINUTES = 15
const BLOCK_MINUTES = 15

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

/**
 * Verifica si un identificador está bloqueado por rate limiting de login.
 * Cuenta intentos fallidos en los últimos WINDOW_MINUTES.
 * Si supera MAX_FAILED_ATTEMPTS, bloquea por BLOCK_MINUTES desde el último fallo.
 *
 * Tolerante a fallos: si la tabla de intentos no existe o la consulta falla,
 * se permite el login (fail-open) en lugar de romper el flujo de autenticación.
 *
 * @param identifier - Email u otro identificador usado en el login
 * @returns { allowed: true } si puede intentar, { allowed: false, retryAfterSeconds } si está bloqueado
 */
export async function checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
  const db = getDb()
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)

  let failedCount: number
  try {
    // Contar intentos fallidos en la ventana de tiempo
    const countResult = await db.execute(sql`
      SELECT count(*) as count
      FROM platform.login_attempts
      WHERE identifier = ${identifier}
        AND exitoso = false
        AND created_at >= ${windowStart.toISOString()}
    `)
    failedCount = Number(countResult[0]?.count ?? 0)
  } catch {
    // Fail-open: si no se puede consultar, no bloquear el login
    return { allowed: true }
  }

  if (failedCount >= MAX_FAILED_ATTEMPTS) {
    // Obtener el timestamp del último intento fallido para calcular retryAfter
    let lastFailedRow: { created_at: string } | undefined
    try {
      const lastFailedResult = await db.execute(sql`
        SELECT created_at
        FROM platform.login_attempts
        WHERE identifier = ${identifier}
          AND exitoso = false
        ORDER BY created_at DESC
        LIMIT 1
      `)
      lastFailedRow = lastFailedResult[0] as { created_at: string } | undefined
    } catch {
      lastFailedRow = undefined
    }

    const lastFailedAt = lastFailedRow?.created_at ? new Date(lastFailedRow.created_at) : null
    if (lastFailedAt) {
      const blockUntil = new Date(lastFailedAt.getTime() + BLOCK_MINUTES * 60 * 1000)
      const retryAfterSeconds = Math.ceil((blockUntil.getTime() - Date.now()) / 1000)

      // Log a auditoría cuando se bloquea por rate limit
      await logAudit({
        operatorId: undefined,
        operatorEmail: identifier,
        accion: 'login.rate_limited',
        recurso: 'auth/login',
        detalles: {
          failedAttempts: failedCount,
          windowMinutes: WINDOW_MINUTES,
          blockMinutes: BLOCK_MINUTES,
          retryAfterSeconds: Math.max(0, retryAfterSeconds),
        },
      })

      return { allowed: false, retryAfterSeconds: Math.max(0, retryAfterSeconds) }
    }
    // Fallback: bloqueo completo de BLOCK_MINUTES
    await logAudit({
      operatorId: undefined,
      operatorEmail: identifier,
      accion: 'login.rate_limited',
      recurso: 'auth/login',
      detalles: {
        failedAttempts: failedCount,
        windowMinutes: WINDOW_MINUTES,
        blockMinutes: BLOCK_MINUTES,
        retryAfterSeconds: BLOCK_MINUTES * 60,
      },
    })
    return { allowed: false, retryAfterSeconds: BLOCK_MINUTES * 60 }
  }

  return { allowed: true }
}

/**
 * Registra un intento de login (exitoso o fallido) en la tabla login_attempts.
 * Tolerante a fallos: si el registro falla, no rompe el flujo de login.
 *
 * @param identifier - Email u otro identificador
 * @param exitoso - true si el login fue exitoso, false si falló
 */
export async function recordLoginAttempt(identifier: string, exitoso: boolean): Promise<void> {
  const db = getDb()
  try {
    await db.execute(sql`
      INSERT INTO platform.login_attempts (identifier, exitoso, created_at)
      VALUES (${identifier}, ${exitoso}, NOW())
    `)
  } catch {
    // Fail-open: no romper el login si no se puede registrar
  }
}

/**
 * Limpia intentos antiguos (más de 24 horas) para mantener la tabla acotada.
 * Opcional: se puede llamar desde un job de mantenimiento.
 */
export async function cleanupOldLoginAttempts(): Promise<number> {
  const db = getDb()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  try {
    await db.execute(sql`
      DELETE FROM platform.login_attempts
      WHERE created_at < ${cutoff.toISOString()}
    `)
  } catch {
    // Fail-open: la limpieza es best-effort
  }
  return 0 // rowCount not available on execute result
}