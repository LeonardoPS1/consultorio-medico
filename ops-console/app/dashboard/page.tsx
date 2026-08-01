import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getSessionFromCookie } from '@/lib/auth'
import { StatsCard } from './stats-card'
import { runAllHealthChecks } from '@/lib/infra-health'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSessionFromCookie()
  const db = getDb()

  const [tenantCount, auditCount, recentLogs, infraHealth] = await Promise.all([
    db.execute(sql`SELECT COUNT(*)::int AS count FROM public.tenants`),
    db.execute(sql`SELECT COUNT(*)::int AS count FROM platform.platform_audit_log WHERE created_at > now() - interval '24 hours'`),
    db.execute(sql`
      SELECT operator_email, accion, created_at
      FROM platform.platform_audit_log
      ORDER BY created_at DESC
      LIMIT 10
    `),
    runAllHealthChecks(),
  ])

  const totalTenants = (tenantCount as any[])[0]?.count || 0
  const recentAuditCount = (auditCount as any[])[0]?.count || 0
  const lastLogs = recentLogs as unknown as Array<{ operator_email: string; accion: string; created_at: Date }>

  const criticalDown = infraHealth.criticalDown.length > 0
  const globalStatusLabel = infraHealth.globalStatus === 'critical' ? 'CRÍTICO' : infraHealth.globalStatus === 'degraded' ? 'DEGRADADO' : 'OK'
  const globalStatusColor = infraHealth.globalStatus === 'critical' ? 'text-red-400' : infraHealth.globalStatus === 'degraded' ? 'text-yellow-400' : 'text-green-400'
  const upServices = infraHealth.services.filter(s => s.status === 'up').length
  const totalServices = infraHealth.services.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Bienvenido, {session?.nombre || 'operador'}
        </p>
      </div>

      {criticalDown && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div>
              <h3 className="font-semibold text-red-400">Servicios críticos caídos — Afecta a TODOS los tenants</h3>
              <p className="text-sm text-red-300/90 mt-1">
                {infraHealth.criticalDown.map(s => s.displayName).join(', ')} {'llevan más de 5 min sin responder.'}
              </p>
              <p className="text-xs text-red-300/70 mt-2">
                Última verificación: {new Date(infraHealth.timestamp).toLocaleString('es-CL')} ·{' '}
                <a href="/dashboard/infra-health" className="underline hover:no-underline">Ver detalles →</a>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          title="Infraestructura"
          value={globalStatusLabel}
          subtitle={criticalDown ? `${infraHealth.criticalDown.length} servicio(s) crítico(s) caído(s)` : 'Todos los servicios operativos'}
          valueClassName={globalStatusColor}
        />
        <StatsCard
          title="Salud Detallada"
          value={`${upServices} / ${totalServices}`}
          subtitle="Servicios UP / Total"
        />
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Últimas actividades</h2>
          <a href="/dashboard/infra-health" className="text-xs text-[var(--accent)] hover:underline">
            Ver salud de infraestructura →
          </a>
        </div>
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