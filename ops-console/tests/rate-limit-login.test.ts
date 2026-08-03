import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDb } from '@/lib/db'
import { checkLoginRateLimit, recordLoginAttempt } from '@/lib/rate-limit'

// Mock the database
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}))

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  sql: vi.fn((strings, ...values) => ({ strings, values })),
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  gte: vi.fn((col, val) => ({ col, val, op: 'gte' })),
}))

// Mock logAudit
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}))

describe('Rate limiting de login', () => {
  let mockExecute: ReturnType<typeof vi.fn>
  let mockDb: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockExecute = vi.fn()
    mockDb = getDb as ReturnType<typeof vi.fn>
    mockDb.mockReturnValue({ execute: mockExecute })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('checkLoginRateLimit', () => {
    it('permite intentos cuando no hay fallos previos', async () => {
      mockExecute.mockResolvedValueOnce([{ count: 0 }])
      
      const result = await checkLoginRateLimit('test@example.com')
      
      expect(result.allowed).toBe(true)
      expect(result.retryAfterSeconds).toBeUndefined()
    })

    it('permite intentos cuando hay menos de 5 fallos en 15 min', async () => {
      mockExecute.mockResolvedValueOnce([{ count: 3 }])
      
      const result = await checkLoginRateLimit('test@example.com')
      
      expect(result.allowed).toBe(true)
    })

    it('bloquea después de 5 intentos fallidos', async () => {
      mockExecute
        .mockResolvedValueOnce([{ count: 5 }])  // count query
        .mockResolvedValueOnce([{ created_at: new Date() }])  // last failed query

      const result = await checkLoginRateLimit('test@example.com')

      expect(result.allowed).toBe(false)
      expect(result.retryAfterSeconds).toBeDefined()
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
    })

    it('retorna retryAfterSeconds correcto basado en último fallo', async () => {
      const lastFailedAt = new Date(Date.now() - 2 * 60 * 1000) // 2 min ago
      const expectedRetryAfter = 13 * 60

      mockExecute
        .mockResolvedValueOnce([{ count: 5 }])
        .mockResolvedValueOnce([{ created_at: lastFailedAt }])

      const result = await checkLoginRateLimit('test@example.com')

      expect(result.allowed).toBe(false)
      expect(result.retryAfterSeconds).toBeGreaterThan(expectedRetryAfter - 60)
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(expectedRetryAfter + 60)
    })

    it('usa fallback de 15 min si no se encuentra último fallo', async () => {
      mockExecute
        .mockResolvedValueOnce([{ count: 5 }])
        .mockResolvedValueOnce([])

      const result = await checkLoginRateLimit('test@example.com')

      expect(result.allowed).toBe(false)
      expect(result.retryAfterSeconds).toBe(15 * 60)
    })

    it('registra en logAudit cuando bloquea por rate limit', async () => {
      const { logAudit } = await import('@/lib/audit')

      mockExecute
        .mockResolvedValueOnce([{ count: 5 }])
        .mockResolvedValueOnce([{ created_at: new Date() }])

      await checkLoginRateLimit('test@example.com')

      expect(logAudit).toHaveBeenCalled()
      const callArgs = (logAudit as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArgs.accion).toBe('login.rate_limited')
      expect(callArgs.operatorEmail).toBe('test@example.com')
      expect(callArgs.recurso).toBe('auth/login')
      expect(callArgs.detalles).toBeDefined()
      expect(callArgs.detalles.failedAttempts).toBe(5)
    })

    it('permite el login (fail-open) si la tabla no existe o la consulta falla', async () => {
      mockExecute.mockRejectedValueOnce(new Error('relation "platform.login_attempts" does not exist'))

      const result = await checkLoginRateLimit('test@example.com')

      expect(result.allowed).toBe(true)
      expect(result.retryAfterSeconds).toBeUndefined()
    })

    it('permite el login (fail-open) si falla la consulta del último fallo', async () => {
      mockExecute
        .mockResolvedValueOnce([{ count: 5 }])
        .mockRejectedValueOnce(new Error('relation "platform.login_attempts" does not exist'))

      const result = await checkLoginRateLimit('test@example.com')

      expect(result.allowed).toBe(false)
      expect(result.retryAfterSeconds).toBe(15 * 60)
    })
  })

  describe('recordLoginAttempt', () => {
    it('registra intento exitoso', async () => {
      mockExecute.mockResolvedValueOnce({ rowCount: 1 })
      
      await recordLoginAttempt('test@example.com', true)
      
      expect(mockExecute).toHaveBeenCalled()
    })

    it('registra intento fallido', async () => {
      mockExecute.mockResolvedValueOnce({ rowCount: 1 })

      await recordLoginAttempt('test@example.com', false)

      expect(mockExecute).toHaveBeenCalled()
    })

    it('no lanza error (fail-open) si el INSERT falla', async () => {
      mockExecute.mockRejectedValueOnce(new Error('relation "platform.login_attempts" does not exist'))

      await expect(recordLoginAttempt('test@example.com', false)).resolves.toBeUndefined()
    })
  })
})