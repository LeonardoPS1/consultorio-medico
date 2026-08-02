import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logAudit } from '@/lib/audit'

// Mock audit
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}))

const DEFAULT_URL = 'https://med.aicorebots.com'

function setTenantEnv(apiKey: string) {
  Object.assign(process.env, { INTERNAL_API_KEY: apiKey, DASHBOARD_URL: DEFAULT_URL })
}

describe('Crear Tenant endpoint', () => {
  let mockLogAudit: ReturnType<typeof vi.fn>
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockLogAudit = logAudit as ReturnType<typeof vi.fn>
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    setTenantEnv('test-internal-key')
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.unstubAllGlobals()
  })

  function createMockRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
    return {
      json: vi.fn().mockResolvedValue(body),
      headers: {
        get: vi.fn((key: string) => headers[key.toLowerCase()]),
      },
    } as unknown as Request
  }

  describe('POST /api/tenants/crear', () => {
    const validBody = {
      nombre: 'Clínica Test',
      subdomain: 'clinica-test',
      plan: 'professional',
      adminEmail: 'admin@clinica.cl',
      adminNombre: 'Admin Test',
    }
    const validHeaders = {
      'x-operator-id': 'operator-1',
      'x-operator-email': 'operator@test.com',
      'x-operator-nombre': 'Test Operator',
      'x-forwarded-for': '192.168.1.1',
    }

    const dashboardOk = {
      ok: true,
      tenantId: 'tenant-nuevo-123',
      subdomain: 'clinica-test',
      adminEmail: 'admin@clinica.cl',
      emailSent: true,
    }

    it('rechaza con 401 si no hay sesión válida (operator headers missing)', async () => {
      const { POST } = await import('@/app/api/tenants/crear/route')
      const request = createMockRequest(validBody)
      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si el body no es un objeto válido', async () => {
      const { POST } = await import('@/app/api/tenants/crear/route')
      const request = createMockRequest({} as Record<string, unknown>, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si falta nombre, subdomain o admin', async () => {
      const { POST } = await import('@/app/api/tenants/crear/route')
      const request = createMockRequest({ nombre: 'Clínica', adminEmail: 'admin@clinica.cl' }, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si subdomain no cumple el regex [a-z0-9-]+', async () => {
      const { POST } = await import('@/app/api/tenants/crear/route')
      const request = createMockRequest(
        { ...validBody, subdomain: 'Clinica_Test!' },
        validHeaders,
      )
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si adminEmail es inválido', async () => {
      const { POST } = await import('@/app/api/tenants/crear/route')
      const request = createMockRequest({ ...validBody, adminEmail: 'no-es-email' }, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si plan no es uno de los planes permitidos', async () => {
      const { POST } = await import('@/app/api/tenants/crear/route')
      const request = createMockRequest({ ...validBody, plan: 'ultra' }, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('propaga el error del dashboard (502) si el endpoint interno falla', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'El subdominio ya está en uso' }),
      })

      const { POST } = await import('@/app/api/tenants/crear/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(502)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('camino exitoso: llama al dashboard, logAudit con accion tenant.create y devuelve 201', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue(dashboardOk),
      })

      const { POST } = await import('@/app/api/tenants/crear/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(201)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe(`${DEFAULT_URL}/api/internal/tenants`)
      expect(init.method).toBe('POST')
      expect(init.headers['x-internal-key']).toBe('test-internal-key')
      expect(JSON.parse(init.body)).toEqual(validBody)

      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorId: 'operator-1',
          operatorEmail: 'operator@test.com',
          accion: 'tenant.create',
          tenantAfectado: 'tenant-nuevo-123',
          detalles: expect.objectContaining({
            nombre: 'Clínica Test',
            subdomain: 'clinica-test',
            plan: 'professional',
            adminEmail: 'admin@clinica.cl',
          }),
        }),
      )
    })
  })
})
