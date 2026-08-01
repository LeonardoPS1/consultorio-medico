import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'
import { ok, error, serverError, unauthorized } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

const TIPOS = ['telefono', 'nombre', 'turno'] as const
type Tipo = (typeof TIPOS)[number]

function isTipo(value: unknown): value is Tipo {
  return typeof value === 'string' && (TIPOS as readonly string[]).includes(value)
}

export async function GET(request: NextRequest) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    const operatorNombre = request.headers.get('x-operator-nombre')
    if (!operatorId || !operatorEmail) return unauthorized()

    const { searchParams } = request.nextUrl
    const q = (searchParams.get('q') || '').trim()
    const tipoRaw = searchParams.get('tipo')

    if (!q) return error('Parámetro q es obligatorio', 400)
    if (tipoRaw && !isTipo(tipoRaw)) {
      return error(`tipo inválido. Permitidos: ${TIPOS.join(', ')}`, 400)
    }

    const db = getDb()
    const qLower = q.toLowerCase()
    const tipos: Tipo[] = isTipo(tipoRaw) ? [tipoRaw] : [...TIPOS]

    const resultados: Record<string, unknown>[] = []

    if (tipos.includes('telefono')) {
      const rows = await db.execute(sql`
        SELECT
          p.id,
          p.nombre,
          p.apellido,
          p.telefono,
          p.rut,
          p.email,
          t.id AS tenant_id,
          t.nombre AS tenant_nombre,
          t.subdomain AS tenant_subdomain
        FROM public.pacientes p
        LEFT JOIN public.sucursales s ON s.id = p.sucursal_id
        LEFT JOIN public.tenants t ON (s.tenant_id = t.id) OR (p.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})
        WHERE p.telefono = ${q} AND p.deleted_at IS NULL
        LIMIT 25
      `)
      for (const row of rows) {
        resultados.push({
          tipo: 'telefono',
          registroId: (row as Record<string, unknown>).id,
          telefono: (row as Record<string, unknown>).telefono,
          nombre: (row as Record<string, unknown>).nombre,
          apellido: (row as Record<string, unknown>).apellido,
          rut: (row as Record<string, unknown>).rut || null,
          email: (row as Record<string, unknown>).email || null,
          tenant: {
            id: (row as Record<string, unknown>).tenant_id,
            nombre: (row as Record<string, unknown>).tenant_nombre,
            subdomain: (row as Record<string, unknown>).tenant_subdomain,
          },
        })
      }
    }

    if (tipos.includes('nombre')) {
      const rows = await db.execute(sql`
        SELECT
          p.id,
          p.nombre,
          p.apellido,
          p.telefono,
          p.rut,
          p.email,
          t.id AS tenant_id,
          t.nombre AS tenant_nombre,
          t.subdomain AS tenant_subdomain
        FROM public.pacientes p
        LEFT JOIN public.sucursales s ON s.id = p.sucursal_id
        LEFT JOIN public.tenants t ON (s.tenant_id = t.id) OR (p.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})
        WHERE (p.nombre ILIKE ${`%${q}%`} OR p.apellido ILIKE ${`%${q}%`})
          AND p.deleted_at IS NULL
        ORDER BY p.nombre
        LIMIT 25
      `)
      for (const row of rows) {
        resultados.push({
          tipo: 'nombre',
          registroId: (row as Record<string, unknown>).id,
          telefono: (row as Record<string, unknown>).telefono,
          nombre: (row as Record<string, unknown>).nombre,
          apellido: (row as Record<string, unknown>).apellido,
          rut: (row as Record<string, unknown>).rut || null,
          email: (row as Record<string, unknown>).email || null,
          tenant: {
            id: (row as Record<string, unknown>).tenant_id,
            nombre: (row as Record<string, unknown>).tenant_nombre,
            subdomain: (row as Record<string, unknown>).tenant_subdomain,
          },
        })
      }
    }

    if (tipos.includes('turno')) {
      let rows: unknown[] = []
      try {
        rows = await db.execute(sql`
          SELECT
            tu.id,
            tu.fecha_hora,
            tu.estado,
            p.id AS paciente_id,
            p.nombre,
            p.apellido,
            p.telefono,
            t.id AS tenant_id,
            t.nombre AS tenant_nombre,
            t.subdomain AS tenant_subdomain
          FROM public.turnos tu
          LEFT JOIN public.pacientes p ON p.id = tu.paciente_id
          LEFT JOIN public.sucursales s ON s.id = tu.sucursal_id
          LEFT JOIN public.tenants t ON (s.tenant_id = t.id) OR (tu.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})
          WHERE tu.id = ${q}::uuid AND tu.deleted_at IS NULL
          LIMIT 25
        `)
      } catch {
        rows = []
      }
      for (const row of rows) {
        resultados.push({
          tipo: 'turno',
          registroId: (row as Record<string, unknown>).id,
          fechaHora: (row as Record<string, unknown>).fecha_hora,
          estado: (row as Record<string, unknown>).estado,
          pacienteId: (row as Record<string, unknown>).paciente_id,
          nombre: (row as Record<string, unknown>).nombre,
          apellido: (row as Record<string, unknown>).apellido,
          telefono: (row as Record<string, unknown>).telefono,
          tenant: {
            id: (row as Record<string, unknown>).tenant_id,
            nombre: (row as Record<string, unknown>).tenant_nombre,
            subdomain: (row as Record<string, unknown>).tenant_subdomain,
          },
        })
      }
    }

    logAudit({
      operatorId,
      operatorEmail,
      accion: 'busqueda.global',
      tenantAfectado: undefined,
      recurso: `busqueda:${tipos.join(',')}`,
      motivo: `Búsqueda global "${q}" por ${operatorNombre || operatorEmail}`,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      detalles: { q, tipo: tipos },
    })

    return ok({ q, tipo: tipos, total: resultados.length, resultados })
  } catch (err) {
    return serverError(err)
  }
}
