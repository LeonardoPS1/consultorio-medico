import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logAudit } from '@/lib/audit'
import { getOperatorFromHeaders, validateMotivo, getTenantById } from '@/lib/overrides'

// Mock audit
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}))

// Mock overrides
vi.mock('@/lib/overrides', () => ({
  getOperatorFromHeaders: vi.fn(),
  validateMotivo: vi.fn(),
  getTenantById: vi.fn(),
}))

// Mock fetch for Evolution API call
global.fetch = vi.fn()

describe('Override Evolution Reiniciar endpoint', () => {
  let mockLogAudit: ReturnType<typeof vi.fn>
  let mockGetOperator: ReturnType<typeof vi.fn>
  let mockValidateMotivo: ReturnType<typeof vi.fn>
  let mockGetTenant: ReturnType<typeof vi.fn>
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockLogAudit = logAudit as ReturnType<typeof vi.fn>
    mockGetOperator = getOperatorFromHeaders as ReturnType<typeof vi.fn>
    mockValidateMotivo = validateMotivo as ReturnType<typeof vi.fn>
    mockGetTenant = getTenantById as ReturnType<typeof vi.fn>
    mockFetch = global.fetch as ReturnType<typeof vi.fn>
    vi.clearAllMocks()
    
    // Reset modules to allow fresh env vars
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  function createMockRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
    return {
      json: vi.fn().mockResolvedValue(body),
      headers: {
        get: vi.fn((key: string) => headers[key.toLowerCase()]),
      },
    } as unknown as Request
  }

  function setEvolutionEnv(apiKey: string | undefined, apiUrl: string = 'http://evolution:8080') {
    vi.stubGlobal('process', {
      ...process,
      env: {
        ...process.env,
        EVOLUTION_API_KEY: apiKey,
        EVOLUTION_API_URL: apiUrl,
      },
    })
  }

  describe('POST /api/overrides/evolution/reiniciar', () => {
    const validBody = { tenantId: 'tenant-123', motivo: 'Reiniciar instancia Evolution por desconexión WhatsApp' }
    const validHeaders = {
      'x-operator-id': 'operator-1',
      'x-operator-email': 'operator@test.com',
      'x-operator-nombre': 'Test Operator',
      'x-forwarded-for': '192.168.1.1',
    }

    it('rechaza con 401 si no hay sesión válida', async () => {
      setEvolutionEnv('test-key')
      mockGetOperator.mockReturnValue(null)

      const { POST } = await import('@/app/api/overrides/evolution/reiniciar/route')
      const request = createMockRequest(validBody, {})
      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si falta tenantId', async () => {
      setEvolutionEnv('test-key')
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })

      const { POST } = await import('@/app/api/overrides/evolution/reiniciar/route')
      const request = createMockRequest({ motivo: 'Motivo válido' }, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('rechaza con 400 si motivo no pasa validación', async () => {
      setEvolutionEnv('test-key')
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue('El motivo debe tener al menos 5 caracteres')

      const { POST } = await import('@/app/api/overrides/evolution/reiniciar/route')
      const request = createMockRequest({ tenantId: 'tenant-123', motivo: 'Corto' }, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('rechaza con 400 si tenant no tiene subdomain', async () => {
      setEvolutionEnv('test-key')
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue(null)
      mockGetTenant.mockResolvedValue({ id: 'tenant-123', nombre: 'Tenant Test', subdomain: null, activo: true })

      const { POST } = await import('@/app/api/overrides/evolution/reiniciar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('rechaza con 503 si EVOLUTION_API_KEY no configurada', async () => {
      setEvolutionEnv(undefined)
      
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue(null)
      mockGetTenant.mockResolvedValue({ id: 'tenant-123', nombre: 'Tenant Test', subdomain: 'test', activo: true })

      const { POST } = await import('@/app/api/overrides/evolution/reiniciar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(503)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('camino exitoso: llama a logAudit con accion override.evolution.reiniciar', async () => {
      setEvolutionEnv('test-key')
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue(null)
      mockGetTenant.mockResolvedValue({ id: 'tenant-123', nombre: 'Tenant Test', subdomain: 'test', activo: true })
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true, message: 'Instance restarted' }),
      })

      const { POST } = await import('@/app/api/overrides/evolution/reiniciar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'override.evolution.reiniciar',
        tenantAfectado: 'Tenant Test',
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        detalles: expect.objectContaining({
          ok: true,
          instancia: 'test',
        }),
      }))
    })

    it('fallo en Evolution API: propaga error Y registra logAudit con ok: false', async () => {
      setEvolutionEnv('test-key')
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue(null)
      mockGetTenant.mockResolvedValue({ id: 'tenant-123', nombre: 'Tenant Test', subdomain: 'test', activo: true })
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Internal server error' }),
      })

      const { POST } = await import('@/app/api/overrides/evolution/reiniciar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(502)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'override.evolution.reiniciar',
        tenantAfectado: 'Tenant Test',
        detalles: expect.objectContaining({
          ok: false,
          httpStatus: 500,
        }),
      }))
    })

    it('excepción de red en Evolution API: propaga error (logAudit no se llama en catch)', async () => {
      setEvolutionEnv('test-key')
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue(null)
      mockGetTenant.mockResolvedValue({ id: 'tenant-123', nombre: 'Tenant Test', subdomain: 'test', activo: true })
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { POST } = await import('@/app/api/overrides/evolution/reiniciar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(500)
      // The current code catches the error and returns serverError, logAudit is NOT called on network exception
      expect(mockLogAudit).toHaveBeenCalledTimes(0)
    })
  })
})