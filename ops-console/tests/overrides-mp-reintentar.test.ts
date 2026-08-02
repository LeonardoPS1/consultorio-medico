import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDb } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { getOperatorFromHeaders, validateMotivo, getTenantById, getCurrentSuscripcion } from '@/lib/overrides'

// Mock the database
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}))

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  sql: vi.fn((strings, ...values) => ({ strings, values })),
}))

// Mock audit
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}))

// Mock overrides
vi.mock('@/lib/overrides', () => ({
  getOperatorFromHeaders: vi.fn(),
  validateMotivo: vi.fn(),
  getTenantById: vi.fn(),
  getCurrentSuscripcion: vi.fn(),
}))

// Mock fetch for dashboard call
global.fetch = vi.fn()

describe('Override MP Reintentar endpoint', () => {
  let mockDb: ReturnType<typeof vi.fn>
  let mockExecute: ReturnType<typeof vi.fn>
  let mockLogAudit: ReturnType<typeof vi.fn>
  let mockGetOperator: ReturnType<typeof vi.fn>
  let mockValidateMotivo: ReturnType<typeof vi.fn>
  let mockGetTenant: ReturnType<typeof vi.fn>
  let mockGetSuscripcion: ReturnType<typeof vi.fn>
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockExecute = vi.fn()
    mockDb = getDb as ReturnType<typeof vi.fn>
    mockDb.mockReturnValue({ execute: mockExecute })
    mockLogAudit = logAudit as ReturnType<typeof vi.fn>
    mockGetOperator = getOperatorFromHeaders as ReturnType<typeof vi.fn>
    mockValidateMotivo = validateMotivo as ReturnType<typeof vi.fn>
    mockGetTenant = getTenantById as ReturnType<typeof vi.fn>
    mockGetSuscripcion = getCurrentSuscripcion as ReturnType<typeof vi.fn>
    mockFetch = global.fetch as ReturnType<typeof vi.fn>
    vi.clearAllMocks()
    
    // Mock env vars at module level
    vi.stubGlobal('process', {
      ...process,
      env: {
        ...process.env,
        DASHBOARD_URL: 'https://med.aicorebots.com',
        INTERNAL_API_KEY: 'test-internal-key',
      },
    })
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

  describe('POST /api/overrides/mp/reintentar', () => {
    const validBody = { tenantId: 'tenant-123', paymentId: 'mp-payment-123', motivo: 'Reprocesar pago fallido por error temporal' }
    const validHeaders = {
      'x-operator-id': 'operator-1',
      'x-operator-email': 'operator@test.com',
      'x-operator-nombre': 'Test Operator',
      'x-forwarded-for': '192.168.1.1',
    }

    it('rechaza con 401 si no hay sesión válida', async () => {
      mockGetOperator.mockReturnValue(null)

      const { POST } = await import('@/app/api/overrides/mp/reintentar/route')
      const request = createMockRequest(validBody, {})
      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si falta tenantId', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })

      const { POST } = await import('@/app/api/overrides/mp/reintentar/route')
      const request = createMockRequest({ paymentId: 'mp-123', motivo: 'Motivo válido' }, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('rechaza con 400 si falta paymentId', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })

      const { POST } = await import('@/app/api/overrides/mp/reintentar/route')
      const request = createMockRequest({ tenantId: 'tenant-123', motivo: 'Motivo válido' }, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('rechaza con 400 si motivo no pasa validación', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue('El motivo debe tener al menos 5 caracteres')

      const { POST } = await import('@/app/api/overrides/mp/reintentar/route')
      const request = createMockRequest({ tenantId: 'tenant-123', paymentId: 'mp-123', motivo: 'Corto' }, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('rechaza con 400 si paymentId no pertenece a la suscripción del tenant', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue(null)
      mockGetTenant.mockResolvedValue({ id: 'tenant-123', nombre: 'Tenant Test', subdomain: 'test', activo: true })
      mockGetSuscripcion.mockResolvedValue({
        id: 'sub-123',
        mercadopago_payment_id: 'mp-other-payment',
        mercadopago_preference_id: 'pref-other',
      })

      const { POST } = await import('@/app/api/overrides/mp/reintentar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('camino exitoso: llama a logAudit con accion override.mp.reintentar', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue(null)
      mockGetTenant.mockResolvedValue({ id: 'tenant-123', nombre: 'Tenant Test', subdomain: 'test', activo: true })
      mockGetSuscripcion.mockResolvedValue({
        id: 'sub-123',
        mercadopago_payment_id: 'mp-payment-123',
        mercadopago_preference_id: 'pref-123',
      })
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ ok: true, paymentId: 'mp-payment-123', status: 'approved', externalRef: 'suscripcion:sub-123', reprocesado: true }),
      })

      const { POST } = await import('@/app/api/overrides/mp/reintentar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'override.mp.reintentar',
        tenantAfectado: 'Tenant Test',
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
      }))
    })

    it('fallo en llamada externa al dashboard: propaga error Y registra logAudit con accion override.mp.reintentar.failed', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue(null)
      mockGetTenant.mockResolvedValue({ id: 'tenant-123', nombre: 'Tenant Test', subdomain: 'test', activo: true })
      mockGetSuscripcion.mockResolvedValue({
        id: 'sub-123',
        mercadopago_payment_id: 'mp-payment-123',
        mercadopago_preference_id: 'pref-123',
      })
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Internal server error' }),
      })

      const { POST } = await import('@/app/api/overrides/mp/reintentar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'override.mp.reintentar.failed',
        tenantAfectado: 'tenant-123',
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        detalles: expect.objectContaining({ error: 'Internal server error' }),
      }))
    })

    it('excepción de red en llamada externa: propaga error Y registra logAudit con accion override.mp.reintentar.failed', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue(null)
      mockGetTenant.mockResolvedValue({ id: 'tenant-123', nombre: 'Tenant Test', subdomain: 'test', activo: true })
      mockGetSuscripcion.mockResolvedValue({
        id: 'sub-123',
        mercadopago_payment_id: 'mp-payment-123',
        mercadopago_preference_id: 'pref-123',
      })
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { POST } = await import('@/app/api/overrides/mp/reintentar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'override.mp.reintentar.failed',
        tenantAfectado: 'tenant-123',
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        detalles: expect.objectContaining({ error: 'Network error' }),
      }))
    })
  })

  describe('GET /api/overrides/mp/reintentar', () => {
    it('rechaza con 401 si no hay sesión válida', async () => {
      mockGetOperator.mockReturnValue(null)

      const { GET } = await import('@/app/api/overrides/mp/reintentar/route')
      const request = {
        headers: { get: vi.fn() },
        nextUrl: { searchParams: new URLSearchParams('tenantId=tenant-123') },
      } as unknown as Request
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('rechaza con 400 si falta tenantId', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
      })

      const { GET } = await import('@/app/api/overrides/mp/reintentar/route')
      const request = {
        headers: { get: vi.fn((key: string) => key === 'x-operator-id' ? 'operator-1' : 'operator@test.com') },
        nextUrl: { searchParams: new URLSearchParams('') },
      } as unknown as Request
      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('camino exitoso: retorna lista de pagos', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
      })
      mockGetTenant.mockResolvedValue({ id: 'tenant-123', nombre: 'Tenant Test', subdomain: 'test', activo: true })
      mockExecute.mockResolvedValue([{
        id: 'sub-123',
        plan: 'professional',
        estado: 'active',
        mercadopago_payment_id: 'mp-123',
        mercadopago_preference_id: 'pref-123',
        period_start: new Date(),
        period_end: new Date(),
        created_at: new Date(),
      }])

      const { GET } = await import('@/app/api/overrides/mp/reintentar/route')
      const request = {
        headers: { get: vi.fn((key: string) => key === 'x-operator-id' ? 'operator-1' : 'operator@test.com') },
        nextUrl: { searchParams: new URLSearchParams('tenantId=tenant-123') },
      } as unknown as Request
      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })
})