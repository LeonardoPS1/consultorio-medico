import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getSessionFromCookie } from '@/lib/auth'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function TenantsPage() {
  const session = await getSessionFromCookie()
  if (!session) return null

  const db = getDb()

  const tenants = await db.execute(sql`
    SELECT
      t.id,
      t.nombre,
      t.subdomain,
      t.activo,
      t.created_at,
      (SELECT COUNT(*)::int FROM public.usuarios u WHERE u.tenant_id = t.id) AS usuario_count,
      (SELECT COUNT(*)::int FROM public.pacientes p JOIN public.sucursales s ON s.id = p.sucursal_id WHERE s.tenant_id = t.id) AS paciente_count,
      (SELECT COUNT(*)::int FROM public.turnos tu JOIN public.sucursales s ON s.id = tu.sucursal_id WHERE s.tenant_id = t.id) AS turno_count,
      (SELECT MAX(tu.fecha_hora) FROM public.turnos tu JOIN public.sucursales s ON s.id = tu.sucursal_id WHERE s.tenant_id = t.id) AS ultimo_turno
    FROM public.tenants t
    ORDER BY t.nombre
  `)

  const tenantsList = tenants as unknown as Array<{
    id: string
    nombre: string
    subdomain: string | null
    activo: boolean
    created_at: Date
    usuario_count: number
    paciente_count: number
    turno_count: number
    ultimo_turno: Date | null
  }>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Tenants</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {tenantsList.length} organización{tenantsList.length !== 1 ? 'es' : ''} registrada{tenantsList.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Nombre</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Subdominio</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">Estado</th>
              <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">Usuarios</th>
              <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">Pacientes</th>
              <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">Turnos</th>
              <th className="text-right py-3 px-4 font-medium text-[var(--text-secondary)]">Último turno</th>
            </tr>
          </thead>
          <tbody>
            {tenantsList.map(t => (
              <tr key={t.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                <td className="py-3 px-4 font-medium">
                  <Link href={`/dashboard/tenants/${t.id}`} className="hover:text-[var(--accent)] transition-colors">
                    {t.nombre}
                  </Link>
                </td>
                <td className="py-3 px-4 text-[var(--text-secondary)] font-mono text-xs">
                  {t.subdomain || '—'}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${t.activo ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
                </td>
                <td className="py-3 px-4 text-right">{t.usuario_count}</td>
                <td className="py-3 px-4 text-right">{t.paciente_count}</td>
                <td className="py-3 px-4 text-right">{t.turno_count}</td>
                <td className="py-3 px-4 text-right text-xs text-[var(--text-muted)]">
                  {t.ultimo_turno ? new Date(t.ultimo_turno).toLocaleDateString('es-CL') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
