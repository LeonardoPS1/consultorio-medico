import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getSessionFromCookie } from '@/lib/auth'
import { StatsCard } from './stats-card'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSessionFromCookie()
  const db = getDb()

  const [tenantCount, auditCount, recentLogs] = await Promise.all([
    db.execute(sql`SELECT COUNT(*)::int AS count FROM public.tenants`),
    db.execute(sql`SELECT COUNT(*)::int AS count FROM platform.platform_audit_log WHERE created_at > now() - interval '24 hours'`),
    db.execute(sql`
      SELECT operator_email, accion, created_at
      FROM platform.platform_audit_log
      ORDER BY created_at DESC
      LIMIT 10
    `),
  ])

  const totalTenants = (tenantCount as any[])[0]?.count || 0
  const recentAuditCount = (auditCount as any[])[0]?.count || 0
  const lastLogs = recentLogs as unknown as Array<{ operator_email: string; accion: string; created_at: Date }>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Bienvenido, {session?.nombre || 'operador'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Tenants"
          value={String(totalTenants)}
          subtitle="Organizaciones activas"
        />
        <StatsCard
          title="Auditoría (24h)"
          value={String(recentAuditCount)}
          subtitle="Acciones registradas"
        />
        <StatsCard
          title="Estado"
          value="OK"
          subtitle="Sistema operativo"
        />
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-3">Últimas actividades</h2>
        {lastLogs.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Sin actividad reciente</p>
        ) : (
          <div className="space-y-2">
            {lastLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] font-mono">
                    {log.accion}
                  </span>
                  <span className="text-[var(--text-secondary)]">{log.operator_email}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(log.created_at).toLocaleString('es-CL')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
