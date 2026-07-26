import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logAudit, getAuditAccion } from '@/lib/audit'
import { ok, error, serverError, unauthorized } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    const operatorEmail = request.headers.get('x-operator-email')
    const operatorNombre = request.headers.get('x-operator-nombre')

    if (!operatorId || !operatorEmail) {
      return unauthorized()
    }

    const db = getDb()

    const tenants = await db.execute(sql`
      SELECT
        t.id,
        t.nombre,
        t.subdomain,
        t.activo,
        t.created_at,
        (SELECT COUNT(*) FROM public.usuarios u WHERE u.tenant_id = t.id) AS usuario_count,
        (SELECT COUNT(*) FROM public.pacientes p WHERE p.tenant_id = t.id) AS paciente_count,
        (SELECT COUNT(*) FROM public.turnos tu JOIN public.sucursales s ON s.id = tu.sucursal_id WHERE s.tenant_id = t.id) AS turno_count,
        (SELECT MAX(tu.fecha_hora) FROM public.turnos tu JOIN public.sucursales s ON s.id = tu.sucursal_id WHERE s.tenant_id = t.id) AS ultimo_turno
      FROM public.tenants t
      ORDER BY t.nombre
    `)

    logAudit({
      operatorId,
      operatorEmail,
      accion: 'tenant.list',
      motivo: `Listado de tenants por ${operatorNombre || operatorEmail}`,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return ok(tenants)
  } catch (err) {
    return serverError(err)
  }
}
