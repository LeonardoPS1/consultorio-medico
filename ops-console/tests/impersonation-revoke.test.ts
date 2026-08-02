import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logAudit } from '@/lib/audit'
import { getSessionFromCookie } from '@/lib/auth'
import { validateMotivo } from '@/lib/validation'
import { getDb } from '@/lib/db'

// Mock auth
vi.mock('@/lib/auth', () => ({
  getSessionFromCookie: vi.fn(),
}))

// Mock audit
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}))

// Mock validation
vi.mock('@/lib/validation', () => ({
  validateMotivo: vi.fn(),
}))

// Mock db
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}))

// Mock fetch for dashboard call
global.fetch = vi.fn()

describe('Impersonate Revoke endpoint', () => {
  let mockSession: ReturnType<typeof vi.fn>
  let mockLogAudit: ReturnType<typeof vi.fn>
  let mockValidateMotivo: ReturnType<typeof vi.fn>
  let mockDb: ReturnType<typeof vi.fn>
  let mockExecute: ReturnType<typeof vi.fn>
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSession = getSessionFromCookie as ReturnType<typeof vi.fn>
    mockLogAudit = logAudit as ReturnType<typeof vi.fn>
    mockValidateMotivo = validateMotivo as ReturnType<typeof vi.fn>
    mockDb = getDb as ReturnType<typeof vi.fn>
    mockExecute = vi.fn()
    mockDb.mockReturnValue({ execute: mockExecute })
    mockFetch = global.fetch as ReturnType<typeof vi.fn>
    vi.clearAllMocks()

    vi.resetModules()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  function createMockRequest(body: Record<string, unknown>) {
    return {
      json: vi.fn().mockResolvedValue(body),
      headers: {
        get: vi.fn(() => undefined),
      },
    } as unknown as Request
  }

  function setRevokeEnv(apiKey: string | undefined) {
    vi.stubGlobal('process', {
      ...process,
      env: {
        ...process.env,
        INTERNAL_API_KEY: apiKey,
        DASHBOARD_URL: 'https://med.aicorebots.com',
      },
    })
  }

  const validBody = { tenantId: 'tenant-123', motivo: 'Revocar sesión por incidente de seguridad' }

  describe('POST /api/auth/impersonate/revoke', () => {
    it('rechaza con 401 si no hay sesión válida', async () => {
      setRevokeEnv('test-key')
      mockSession.mockResolvedValue(null)

      const { POST } = await import('@/app/api/auth/impersonate/revoke/route')
      const request = createMockRequest(validBody)
      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('rechaza con 500 si INTERNAL_API_KEY no configurada', async () => {
      setRevokeEnv(undefined)
      mockSession.mockResolvedValue({ sub: 'operator-1', email: 'operator@test.com' })

      const { POST } = await import('@/app/api/auth/impersonate/revoke/route')
      const request = createMockRequest(validBody)
      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si falta tenantId', async () => {
      setRevokeEnv('test-key')
      mockSession.mockResolvedValue({ sub: 'operator-1', email: 'operator@test.com' })

      const { POST } = await import('@/app/api/auth/impersonate/revoke/route')
      const request = createMockRequest({ motivo: 'Motivo válido de revocación' })
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si motivo no pasa validación', async () => {
      setRevokeEnv('test-key')
      mockSession.mockResolvedValue({ sub: 'operator-1', email: 'operator@test.com' })
      mockValidateMotivo.mockReturnValue('El motivo debe tener al menos 10 caracteres')

      const { POST } = await import('@/app/api/auth/impersonate/revoke/route')
      const request = createMockRequest({ tenantId: 'tenant-123', motivo: 'Corto' })
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('rechaza con 403 si TOTP no está verificado', async () => {
      setRevokeEnv('test-key')
      mockSession.mockResolvedValue({ sub: 'operator-1', email: 'operator@test.com' })
      mockValidateMotivo.mockReturnValue(null)
      mockExecute.mockResolvedValue([{ totp_verified: false }])

      const { POST } = await import('@/app/api/auth/impersonate/revoke/route')
      const request = createMockRequest(validBody)
      const response = await POST(request)

      expect(response.status).toBe(403)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'impersonate.revoke.failed',
        detalles: expect.objectContaining({ error: 'TOTP_REQUIRED' }),
      }))
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('camino exitoso: revoca sesiones y loguea impersonate.revoke', async () => {
      setRevokeEnv('test-key')
      mockSession.mockResolvedValue({ sub: 'operator-1', email: 'operator@test.com' })
      mockValidateMotivo.mockReturnValue(null)
      mockExecute.mockResolvedValue([{ totp_verified: true }])
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ ok: true, revocadas: 2 }),
      })

      const { POST } = await import('@/app/api/auth/impersonate/revoke/route')
      const request = createMockRequest(validBody)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://med.aicorebots.com/api/internal/impersonate/revoke',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'x-internal-key': 'test-key' }),
        }),
      )
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'impersonate.revoke',
        tenantAfectado: 'tenant-123',
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        detalles: expect.objectContaining({ revocadas: 2 }),
      }))

      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.revocadas).toBe(2)
    })

    it('camino sin sesiones activas: revocadas 0 y loguea', async () => {
      setRevokeEnv('test-key')
      mockSession.mockResolvedValue({ sub: 'operator-1', email: 'operator@test.com' })
      mockValidateMotivo.mockReturnValue(null)
      mockExecute.mockResolvedValue([{ totp_verified: true }])
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ ok: true, revocadas: 0 }),
      })

      const { POST } = await import('@/app/api/auth/impersonate/revoke/route')
      const request = createMockRequest(validBody)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.revocadas).toBe(0)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'impersonate.revoke',
        detalles: expect.objectContaining({ revocadas: 0 }),
      }))
    })

    it('fallo del dashboard: propaga error y loguea impersonate.revoke.failed', async () => {
      setRevokeEnv('test-key')
      mockSession.mockResolvedValue({ sub: 'operator-1', email: 'operator@test.com' })
      mockValidateMotivo.mockReturnValue(null)
      mockExecute.mockResolvedValue([{ totp_verified: true }])
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Error interno' }),
      })

      const { POST } = await import('@/app/api/auth/impersonate/revoke/route')
      const request = createMockRequest(validBody)
      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'impersonate.revoke.failed',
        detalles: expect.objectContaining({ error: 'Error interno' }),
      }))
    })
  })
})
