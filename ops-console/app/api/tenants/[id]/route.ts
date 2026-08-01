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
        t.dominio_custom,
        t.colores,
        t.config_regional,
        (SELECT plan FROM public.suscripciones s WHERE s.organizacion_id = t.id ORDER BY s.created_at DESC LIMIT 1) AS plan,
        (SELECT COUNT(*)::int FROM public.usuarios u WHERE u.tenant_id = t.id) AS usuario_count,
        (SELECT COUNT(*)::int FROM public.pacientes p JOIN public.sucursales s ON s.id = p.sucursal_id WHERE s.tenant_id = t.id) AS paciente_count,
        (SELECT COUNT(*)::int FROM public.turnos tu JOIN public.sucursales s ON s.id = tu.sucursal_id WHERE s.tenant_id = t.id) AS turno_count,
        (SELECT COUNT(*)::int FROM public.recetas r JOIN public.pacientes p ON p.id = r.paciente_id JOIN public.sucursales s ON s.id = p.sucursal_id WHERE s.tenant_id = t.id) AS receta_count,
        (SELECT MAX(tu.fecha_hora) FROM public.turnos tu JOIN public.sucursales s ON s.id = tu.sucursal_id WHERE s.tenant_id = t.id) AS ultimo_turno,
        (SELECT MAX(r.created_at) FROM public.recetas r JOIN public.pacientes p ON p.id = r.paciente_id JOIN public.sucursales s ON s.id = p.sucursal_id WHERE s.tenant_id = t.id) AS ultima_receta
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
