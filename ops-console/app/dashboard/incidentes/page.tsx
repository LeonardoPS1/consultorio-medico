import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getSessionFromCookie } from '@/lib/auth'
import { IncidentSearch } from './incident-search'
import { OverridePanel } from './override-panel'

export const dynamic = 'force-dynamic'

export default async function IncidentesPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>
}) {
  const session = await getSessionFromCookie()
  if (!session) return null

  const { tenant } = await searchParams

  const db = getDb()

  const tenants = await db.execute(sql`
    SELECT t.id, t.nombre, t.subdomain
    FROM public.tenants t
    ORDER BY t.nombre
  `)

  const tenantsList = tenants as unknown as Array<{
    id: string
    nombre: string
    subdomain: string | null
  }>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Incidentes</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Búsqueda global cross-tenant y resolución activa de incidentes.
        </p>
      </div>

      <IncidentSearch />

      <OverridePanel
        tenants={tenantsList}
        initialTenantId={tenant}
      />
    </div>
  )
}
