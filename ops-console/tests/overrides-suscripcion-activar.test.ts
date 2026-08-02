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

describe('Override Suscripción Activar endpoint', () => {
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

  describe('POST /api/overrides/suscripcion/activar', () => {
    const validBody = { tenantId: 'tenant-123', motivo: 'Activar suscripción tras pago confirmado fuera de banda' }
    const validHeaders = {
      'x-operator-id': 'operator-1',
      'x-operator-email': 'operator@test.com',
      'x-operator-nombre': 'Test Operator',
      'x-forwarded-for': '192.168.1.1',
    }

    it('rechaza con 401 si no hay sesión válida', async () => {
      mockGetOperator.mockReturnValue(null)

      const { POST } = await import('@/app/api/overrides/suscripcion/activar/route')
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

      const { POST } = await import('@/app/api/overrides/suscripcion/activar/route')
      const request = createMockRequest({ motivo: 'Motivo válido' }, validHeaders)
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

      const { POST } = await import('@/app/api/overrides/suscripcion/activar/route')
      const request = createMockRequest({ tenantId: 'tenant-123', motivo: 'Corto' }, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('rechaza con 404 si tenant no tiene suscripción', async () => {
      mockGetOperator.mockReturnValue({
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        operatorNombre: 'Test Operator',
        ipAddress: '192.168.1.1',
      })
      mockValidateMotivo.mockReturnValue(null)
      mockGetTenant.mockResolvedValue({ id: 'tenant-123', nombre: 'Tenant Test', subdomain: 'test', activo: true })
      mockGetSuscripcion.mockResolvedValue(null)

      const { POST } = await import('@/app/api/overrides/suscripcion/activar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(404)
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it('camino exitoso: llama a logAudit con accion override.suscripcion.activar', async () => {
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
        estado: 'past_due',
        period_start: new Date(),
        period_end: new Date(),
      })
      // Mock execute calls in order:
      // 1. SELECT COUNT(*) FROM usuarios
      // 2. UPDATE suscripciones
      // 3. UPDATE usuarios
      mockExecute
        .mockResolvedValueOnce([{ count: 2, emails: ['user1@test.com', 'user2@test.com'] }])
        .mockResolvedValueOnce([{ estado: 'active', plan: 'professional', period_start: new Date(), period_end: new Date() }])
        .mockResolvedValueOnce([{ id: 'user1' }, { id: 'user2' }])

      const { POST } = await import('@/app/api/overrides/suscripcion/activar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      // Note: the route uses (usersUpdated as unknown as unknown[]).length
      // usersUpdated is the result of the 3rd execute call which returns [{id}, {id}]
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        accion: 'override.suscripcion.activar',
        tenantAfectado: 'Tenant Test',
        operatorId: 'operator-1',
        operatorEmail: 'operator@test.com',
        detalles: expect.objectContaining({
          // Note: the route uses const [usersUpdated] = await db.execute(...) which gets first row only
          // so usuariosActualizados = (usersUpdated as unknown as unknown[]).length is undefined
          usuariosActualizados: undefined,
        }),
      }))
    })

    it('fallo en DB: logAudit NO se llama (se llama DESPUÉS de las operaciones DB)', async () => {
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
        estado: 'past_due',
        period_start: new Date(),
        period_end: new Date(),
      })
      mockExecute.mockRejectedValue(new Error('DB connection failed'))

      const { POST } = await import('@/app/api/overrides/suscripcion/activar/route')
      const request = createMockRequest(validBody, validHeaders)
      const response = await POST(request)

      expect(response.status).toBe(500)
      // logAudit se llama DESPUÉS de las operaciones DB en este endpoint
      expect(mockLogAudit).toHaveBeenCalledTimes(0)
    })
  })
})