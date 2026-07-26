import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getSessionFromCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  const session = await getSessionFromCookie()
  if (!session) return null

  const db = getDb()

  const logs = await db.execute(sql`
    SELECT
      operator_email,
      accion,
      tenant_afectado,
      recurso,
      motivo,
      ip_address,
      created_at
    FROM platform.platform_audit_log
    ORDER BY created_at DESC
    LIMIT 100
  `)

  const auditLogs = logs as unknown as Array<{
    operator_email: string
    accion: string
    tenant_afectado: string | null
    recurso: string | null
    motivo: string | null
    ip_address: string | null
    created_at: Date
  }>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Auditoría</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Registro de acceso a datos cross-tenant (append-only)
        </p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Timestamp</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Operador</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Acción</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Tenant</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Motivo</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">IP</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Sin registros de auditoría
                </td>
              </tr>
            ) : (
              auditLogs.map((log, i) => (
                <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="py-2.5 px-4 text-xs text-[var(--text-muted)] whitespace-nowrap font-mono">
                    {new Date(log.created_at).toLocaleString('es-CL')}
                  </td>
                  <td className="py-2.5 px-4">{log.operator_email}</td>
                  <td className="py-2.5 px-4">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] font-mono">
                      {log.accion}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                    {log.tenant_afectado || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-[var(--text-secondary)] max-w-xs truncate">
                    {log.motivo || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-[var(--text-muted)] font-mono">
                    {log.ip_address || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
