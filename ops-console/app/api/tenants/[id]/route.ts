import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logAudit } from '@/lib/audit'
import { ok, serverError, unauthorized, notFound } from '@/lib/api-handler'

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

    const [tenantResult] = await db.execute(sql`
      SELECT
        t.id,
        t.nombre,
        t.subdomain,
        t.activo,
        t.created_at,
        t.updated_at,
        t.plan,
        t.dominio_custom,
        t.color_secundario,
        t.config_regional,
        (SELECT COUNT(*)::int FROM public.usuarios u WHERE u.tenant_id = t.id) AS usuario_count,
        (SELECT COUNT(*)::int FROM public.pacientes p WHERE p.tenant_id = t.id) AS paciente_count,
        (SELECT COUNT(*)::int FROM public.turnos tu WHERE tu.tenant_id = t.id) AS turno_count,
        (SELECT COUNT(*)::int FROM public.recetas r WHERE r.tenant_id = t.id) AS receta_count,
        (SELECT MAX(tu.fecha) FROM public.turnos tu WHERE tu.tenant_id = t.id) AS ultimo_turno,
        (SELECT MAX(r.created_at) FROM public.recetas r WHERE r.tenant_id = t.id) AS ultima_receta
      FROM public.tenants t
      WHERE t.id = ${id}
    `)

    if (!tenantResult) return notFound('Tenant no encontrado')

    const tenant = tenantResult as Record<string, unknown>

    const [recentAudit] = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM platform.platform_audit_log
      WHERE tenant_afectado = ${tenantResult.nombre as string}
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
