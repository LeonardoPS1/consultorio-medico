'use client'

import { useState, useEffect, useCallback } from 'react'

interface AuditItem {
  id: string
  operator_email: string
  accion: string
  tenant_afectado: string | null
  recurso: string | null
  motivo: string | null
  ip_address: string | null
  created_at: string
  operator_nombre?: string
}

interface AuditResponse {
  items: AuditItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const ACCIONES_COMUNES = [
  { value: '', label: 'Todas' },
  { value: 'tenant.list', label: 'tenant.list' },
  { value: 'tenant.detail', label: 'tenant.detail' },
  { value: 'audit.query', label: 'audit.query' },
  { value: 'operator.list', label: 'operator.list' },
  { value: 'operator.create', label: 'operator.create' },
  { value: 'operator.deactivate', label: 'operator.deactivate' },
  { value: 'auth.login', label: 'auth.login' },
  { value: 'auth.logout', label: 'auth.logout' },
]

export default function AuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [accion, setAccion] = useState('')
  const [operator, setOperator] = useState('')
  const [tenant, setTenant] = useState('')

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '50' })
      if (accion) params.set('accion', accion)
      if (operator) params.set('operator', operator)
      if (tenant) params.set('tenant', tenant)

      const res = await fetch(`/api/audit?${params}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, accion, operator, tenant])

  useEffect(() => { fetchAudit() }, [fetchAudit])

  function handleFilterChange() {
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Auditoría</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Registro de acceso a datos cross-tenant (append-only)
          {data && <span className="ml-2 text-[var(--text-muted)]">· {data.total} registros</span>}
        </p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={accion}
            onChange={e => { setAccion(e.target.value); handleFilterChange() }}
            className="px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            {ACCIONES_COMUNES.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filtrar por operador..."
            value={operator}
            onChange={e => { setOperator(e.target.value); handleFilterChange() }}
            className="px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text"
            placeholder="Filtrar por tenant..."
            value={tenant}
            onChange={e => { setTenant(e.target.value); handleFilterChange() }}
            className="px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={() => { setAccion(''); setOperator(''); setTenant(''); setPage(1) }}
            className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)] rounded-lg"
          >
            Limpiar filtros
          </button>
        </div>
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
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-muted)]">Cargando...</td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Sin registros de auditoría
                </td>
              </tr>
            ) : (
              data.items.map(log => (
                <tr key={log.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="py-2.5 px-4 text-xs text-[var(--text-muted)] whitespace-nowrap font-mono">
                    {new Date(log.created_at).toLocaleString('es-CL')}
                  </td>
                  <td className="py-2.5 px-4">
                    {log.operator_nombre || log.operator_email}
                  </td>
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

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">
            Página {data.page} de {data.totalPages} ({data.total} registros)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm disabled:opacity-50 hover:bg-[var(--bg-hover)] transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm disabled:opacity-50 hover:bg-[var(--bg-hover)] transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
