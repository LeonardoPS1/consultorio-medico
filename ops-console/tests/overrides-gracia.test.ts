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

describe('Override Gracia endpoint', () => {
  let mockDb: ReturnType<typeof vi.fn>
  let mockExecute: ReturnType<typeof vi.fn>
  let mockLogAudit: ReturnType<typeof vi.fn>
  let mockGetOperator: ReturnType<typeof vi.fn>
  let mockValidateMotivo: ReturnType<typeof vi.fn>
  let mockGetTenant: ReturnType<typeof vi.fn>
  let mockGetSuscripcion: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockExecute = vi.fn()
    mockDb = getDb as ReturnType<typeof vi.fn>
    mockDb.mockReturnValue({ execute: mockExecute })
    mockLogAudit = logAudit as ReturnType<typeof vi.fn>
    mockGetOperator = getOperatorFromHeaders as ReturnType<typeof vi.fn>
    mockValidateMotivo = validateMotivo as ReturnType<typeof vi.fn>
    mockGetTenant = getTenantById as ReturnType<typeof vi.fn>
    mockGetSuscripcion = getCurrentSuscripcion as ReturnType<typeof vi.fn>
    vi.clearAllMocks()
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

  describe('POST /api/overrides/gracia', () => {
    const validBody = { tenantId: 'tenant-123', dias: 7, motivo: 'Extender período de gracia por problemas de facturación' }
    const validHeaders = {
      'x-operator-id': 'operator-1',
      'x-operator-email': 'operator@test.com',
      'x-operator-nombre': 'Test Operator',
      'x-forwarded-for': '192.168.1.1',
    }

    it('rechaza con 401 si no hay sesión válida (operator headers missing)', async () => {
      mockGetOperator.mockReturnValue(null)

      const { POST } = await import('@/app/api/overrides/gracia/route')
      const request = createMockRequest(validBody, {})
      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si falta tenantId en el body', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })

      const { POST } = await import('@/app/api/overrides/gracia/route')
      const request = createMockRequest({ dias: 7, motivo: 'Motivo válido' }, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('rechaza con 400 si dias no es un entero entre 1 y 30', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })

      const { POST } = await import('@/app/api/overrides/gracia/route')
      const request = createMockRequest({ tenantId: 'tenant-123', dias: 0, motivo: 'Motivo válido' }, validHeaders)
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

      const { POST } = await import('@/app/api/overrides/gracia/route')
      const request = createMockRequest({ tenantId: 'tenant-123', dias: 7, motivo: 'Corto' }, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('camino exitoso: llama a logAudit exactamente una vez con accion override.gracia', async () => {
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
        plan: 'professional',
        estado: 'active',
        period_start: new Date(),
        period_end: new Date(),
        mercadopago_payment_id: 'mp-123',
      })
      mockExecute.mockResolvedValue([{
        estado: 'past_due',
        plan: 'professional',
        period_start: new Date(),
        period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }])

      const { POST } = await import('@/app/api/overrides/gracia/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'override.gracia',
        tenantAfectado: 'Tenant Test',
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
      }))
    })

    it('fallo en DB: se registra el intento fallido en logAudit con accion override.gracia.failed', async () => {
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
        plan: 'professional',
        estado: 'active',
        period_start: new Date(),
        period_end: new Date(),
        mercadopago_payment_id: 'mp-123',
      })
      mockExecute.mockRejectedValue(new Error('DB connection failed'))

      const { POST } = await import('@/app/api/overrides/gracia/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'override.gracia.failed',
        tenantAfectado: 'tenant-123',
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        detalles: expect.objectContaining({ error: 'DB connection failed' }),
      }))
    })
  })

  describe('GET /api/overrides/gracia', () => {
    it('rechaza con 401 si no hay sesión válida', async () => {
      mockGetOperator.mockReturnValue(null)

      const { GET } = await import('@/app/api/overrides/gracia/route')
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

      const { GET } = await import('@/app/api/overrides/gracia/route')
      const request = {
        headers: { get: vi.fn((key: string) => key === 'x-operator-id' ? 'operator-1' : 'operator@test.com') },
        nextUrl: { searchParams: new URLSearchParams('') },
      } as unknown as Request
      const response = await GET(request)

      expect(response.status).toBe(400)
    })
  })
})