import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'
import { ok, error, serverError, unauthorized, notFound } from '@/lib/api-handler'
import crypto from 'crypto'

const PLANES = ['free', 'starter', 'professional', 'business', 'enterprise'] as const
type Plan = (typeof PLANES)[number]

function isPlan(value: unknown): value is Plan {
  return typeof value === 'string' && (PLANES as readonly string[]).includes(value)
}

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    const operatorNombre = request.headers.get('x-operator-nombre')
    if (!operatorId || !operatorEmail) return unauthorized()

    const { id } = await params
    const db = getDb()

    const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

    const [tenantResult] = await db.execute(sql`
      SELECT
        t.id,
        t.nombre,
        t.subdomain,
        t.activo,
        t.created_at,
        t.updated_at,
        t.dominio_custom,
        t.dominio_verificado,
        t.dominio_verificacion_token,
        t.colores,
        t.config_regional,
        (SELECT plan FROM public.suscripciones s WHERE s.organizacion_id = t.id ORDER BY s.created_at DESC LIMIT 1) AS plan,
        (SELECT COUNT(*)::int FROM public.usuarios u WHERE u.tenant_id = t.id) AS usuario_count,
        (SELECT COUNT(*)::int FROM public.pacientes p LEFT JOIN public.sucursales s ON s.id = p.sucursal_id WHERE (s.tenant_id = t.id) OR (p.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})) AS paciente_count,
        (SELECT COUNT(*)::int FROM public.turnos tu LEFT JOIN public.sucursales s ON s.id = tu.sucursal_id WHERE (s.tenant_id = t.id) OR (tu.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})) AS turno_count,
        (SELECT COUNT(*)::int FROM public.recetas r JOIN public.pacientes p ON p.id = r.paciente_id LEFT JOIN public.sucursales s ON s.id = p.sucursal_id WHERE (s.tenant_id = t.id) OR (p.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})) AS receta_count,
        (SELECT MAX(tu.fecha_hora) FROM public.turnos tu LEFT JOIN public.sucursales s ON s.id = tu.sucursal_id WHERE (s.tenant_id = t.id) OR (tu.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})) AS ultimo_turno,
        (SELECT MAX(r.created_at) FROM public.recetas r JOIN public.pacientes p ON p.id = r.paciente_id LEFT JOIN public.sucursales s ON s.id = p.sucursal_id WHERE (s.tenant_id = t.id) OR (p.sucursal_id IS NULL AND t.id = ${DEFAULT_TENANT_ID})) AS ultima_receta
      FROM public.tenants t
      WHERE t.id = ${id}
    `)

    if (!tenantResult) return notFound('Tenant no encontrado')

    const tenant = tenantResult as Record<string, unknown>

    const [recentAudit] = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM platform.platform_audit_log
      WHERE tenant_afectado = ${tenant.nombre as string}
        AND created_at > now() - interval '7 days'
    `)

    logAudit({
      operatorId,
      operatorEmail,
      accion: 'tenant.detail',
      tenantAfectado: tenant.nombre as string,
      recurso: `tenant:${id}`,
      motivo: `Detalle de tenant por ${operatorNombre || operatorEmail}`,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return ok({ ...tenant, audit_7d: (recentAudit as unknown as any[])[0]?.count || 0 })
  } catch (err) {
    return serverError(err)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    const operatorNombre = request.headers.get('x-operator-nombre')
    if (!operatorId || !operatorEmail) return unauthorized()

    const { id } = await params
    const db = getDb()

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return error('Body inválido', 400)

    const { activo, plan, dominioCustom, colores, configRegional } = body as Record<string, unknown>

    if (activo !== undefined && typeof activo !== 'boolean') {
      return error('activo debe ser un booleano', 400)
    }
    if (plan !== undefined && !isPlan(plan)) {
      return error(`plan inválido. Permitidos: ${PLANES.join(', ')}`, 400)
    }
    if (dominioCustom !== undefined && typeof dominioCustom !== 'string') {
      return error('dominioCustom debe ser un string', 400)
    }
    if (colores !== undefined && (typeof colores !== 'object' || colores === null)) {
      return error('colores debe ser un objeto', 400)
    }
    if (
      configRegional !== undefined &&
      (typeof configRegional !== 'object' || configRegional === null)
    ) {
      return error('configRegional debe ser un objeto', 400)
    }

    const [tenantResult] = await db.execute(sql`
      SELECT id, nombre, colores FROM public.tenants WHERE id = ${id}
    `)
    if (!tenantResult) return notFound('Tenant no encontrado')
    const tenant = tenantResult as Record<string, unknown>

    // Merge de colores con los actuales
    let coloresFinal: Record<string, unknown> | undefined
    if (colores !== undefined) {
      const actuales =
        tenant.colores && typeof tenant.colores === 'object'
          ? (tenant.colores as Record<string, unknown>)
          : {}
      coloresFinal = { ...actuales, ...(colores as Record<string, unknown>) }
    }

    const sets: ReturnType<typeof sql>[] = []
    if (activo !== undefined) sets.push(sql`activo = ${activo}`)
    if (dominioCustom !== undefined) {
      if (dominioCustom) {
        const token =
          `aicore-verify=${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
        sets.push(sql`dominio_custom = ${dominioCustom}`)
        sets.push(sql`dominio_verificacion_token = ${token}`)
        sets.push(sql`dominio_verificado = false`)
      } else {
        sets.push(sql`dominio_custom = NULL`)
        sets.push(sql`dominio_verificacion_token = NULL`)
        sets.push(sql`dominio_verificado = false`)
      }
    }
    if (coloresFinal) sets.push(sql`colores = ${JSON.stringify(coloresFinal)}::jsonb`)
    if (configRegional !== undefined)
      sets.push(sql`config_regional = ${JSON.stringify(configRegional)}::jsonb`)

    if (sets.length > 0) {
      await db.execute(sql`
        UPDATE public.tenants
        SET ${sql.join(sets, sql`, `)}, updated_at = now()
        WHERE id = ${id}
      `)
    }

    // Cambio de plan → suscripción vigente + usuarios del tenant
    if (plan !== undefined) {
      await db.execute(sql`
        UPDATE public.suscripciones
        SET plan = ${plan}
        WHERE organizacion_id = ${id}
          AND id = (SELECT s2.id FROM public.suscripciones s2
                    WHERE s2.organizacion_id = ${id}
                    ORDER BY s2.created_at DESC LIMIT 1)
      `)
      await db.execute(sql`
        UPDATE public.usuarios SET plan = ${plan} WHERE tenant_id = ${id}
      `)
    }

    const camposActualizados = Object.keys(body)
    logAudit({
      operatorId,
      operatorEmail,
      accion: 'tenant.update',
      tenantAfectado: tenant.nombre as string,
      recurso: `tenant:${id}`,
      motivo: `Actualización de tenant por ${operatorNombre || operatorEmail}`,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      detalles: { campos: camposActualizados },
    })

    return ok({ ok: true, id, camposActualizados })
  } catch (err) {
    return serverError(err)
  }
}
