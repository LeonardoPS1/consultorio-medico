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

describe('Impersonate Direct endpoint', () => {
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

  function setDirectEnv(apiKey: string | undefined) {
    vi.stubGlobal('process', {
      ...process,
      env: {
        ...process.env,
        INTERNAL_API_KEY: apiKey,
        DASHBOARD_URL: 'https://med.aicorebots.com',
      },
    })
  }

  const validBody = {
    tenantId: 'tenant-123',
    motivo: 'Entrar directo por incidente de seguridad reportado',
  }

  describe('POST /api/auth/impersonate/direct', () => {
    it('rechaza con 401 si no hay sesión válida', async () => {
      setDirectEnv('test-key')
      mockSession.mockResolvedValue(null)

      const { POST } = await import('@/app/api/auth/impersonate/direct/route')
      const response = await POST(createMockRequest(validBody))

      expect(response.status).toBe(401)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('camino exitoso: crea token directo y loguea impersonate.direct', async () => {
      setDirectEnv('test-key')
      mockSession.mockResolvedValue({ sub: 'operator-1', email: 'operator@test.com' })
      mockValidateMotivo.mockReturnValue(null)
      mockExecute.mockResolvedValue([{ totp_verified: true }])
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify({
          adminEmail: 'admin@tenant.cl',
          adminNombre: 'Ana Admin',
          impersonateLink: 'https://med.aicorebots.com/impersonar/tokDirecto',
          expiresAt: '2026-08-06T12:00:00.000Z',
        })),
      })

      const { POST } = await import('@/app/api/auth/impersonate/direct/route')
      const request = createMockRequest(validBody)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://med.aicorebots.com/api/internal/impersonate/direct',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'x-internal-key': 'test-key' }),
          body: expect.stringContaining('tenant-123'),
        }),
      )
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'impersonate.direct',
        tenantAfectado: 'tenant-123',
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        detalles: expect.objectContaining({
          expiresAt: '2026-08-06T12:00:00.000Z',
          viaDirecta: true,
        }),
      }))

      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.adminEmail).toBe('admin@tenant.cl')
      expect(data.impersonateLink).toBe('https://med.aicorebots.com/impersonar/tokDirecto')
    })

    it('fallo del dashboard: propaga error y loguea impersonate.failed', async () => {
      setDirectEnv('test-key')
      mockSession.mockResolvedValue({ sub: 'operator-1', email: 'operator@test.com' })
      mockValidateMotivo.mockReturnValue(null)
      mockExecute.mockResolvedValue([{ totp_verified: true }])
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Error interno' })),
      })

      const { POST } = await import('@/app/api/auth/impersonate/direct/route')
      const request = createMockRequest(validBody)
      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'impersonate.failed',
        detalles: expect.objectContaining({
          error: 'Error interno',
          viaDirecta: true,
        }),
      }))
    })

    it('fallo de red: no se cae, devuelve error descriptivo y loguea fallo', async () => {
      setDirectEnv('test-key')
      mockSession.mockResolvedValue({ sub: 'operator-1', email: 'operator@test.com' })
      mockValidateMotivo.mockReturnValue(null)
      mockExecute.mockResolvedValue([{ totp_verified: true }])
      mockFetch.mockRejectedValue(new Error('fetch failed'))

      const { POST } = await import('@/app/api/auth/impersonate/direct/route')
      const request = createMockRequest(validBody)
      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'impersonate.failed',
        detalles: expect.objectContaining({
          error: expect.stringContaining('No se pudo conectar con el dashboard'),
          viaDirecta: true,
        }),
      }))
    })
  })
})
