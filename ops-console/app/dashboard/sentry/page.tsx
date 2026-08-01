'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react'

interface SentryIssue {
  id: string
  shortId: string
  title: string
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  status: 'unresolved' | 'resolved' | 'ignored'
  count: string
  userCount: number
  firstSeen: string
  lastSeen: string
  permalink: string
  metadata?: { type?: string; value?: string }
  tags?: Array<{ key: string; value: string }>
}

interface IssuesResult {
  issues: SentryIssue[]
  nextCursor: string | null
  previousCursor: string | null
  hasNext: boolean
  hasPrevious: boolean
}

interface SentryStats {
  total: number
  byLevel: Record<string, number>
  byService: Record<string, number>
  byTenant: Record<string, number>
  unresolved: number
  period: string
}

interface TenantOption {
  id: string
  nombre: string
  subdomain: string | null
  activo: boolean
}

const LEVELS = [
  { value: 'all', label: 'Todos los niveles' },
  { value: 'fatal', label: 'Fatal' },
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'info', label: 'Info' },
]

const SERVICES = [
  { value: 'all', label: 'Todos los servicios' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'ops-console', label: 'Ops Console' },
  { value: 'n8n', label: 'n8n' },
]

const STATUSES = [
  { value: 'unresolved', label: 'Sin resolver' },
  { value: 'resolved', label: 'Resueltos' },
  { value: 'all', label: 'Todos' },
]

const PERIODS = [
  { value: '24h', label: 'Últimas 24h' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '14d', label: 'Últimos 14 días' },
  { value: '30d', label: 'Últimos 30 días' },
]

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)

  if (diffMin < 1) return 'hace instantes'
  if (diffMin < 60) return `hace ${diffMin}m`
  if (diffHour < 24) return `hace ${diffHour}h`
  return date.toLocaleDateString('es-CL')
}

function LevelBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    fatal: 'bg-red-500/20 text-red-400 border-red-500/40',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    debug: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  const labels: Record<string, string> = {
    fatal: 'Fatal',
    error: 'Error',
    warning: 'Advertencia',
    info: 'Info',
    debug: 'Debug',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${styles[level] || styles.error}`}>
      {labels[level] || level}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
        <CheckCircle className="w-3 h-3" /> Resuelto
      </span>
    )
  }
  if (status === 'ignored') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
        <AlertTriangle className="w-3 h-3" /> Ignorado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
      <ShieldAlert className="w-3 h-3" /> Sin resolver
    </span>
  )
}

function getTag(issue: SentryIssue, key: string): string | undefined {
  return issue.tags?.find(t => t.key === key)?.value
}

export default function SentryPage() {
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [tenantFilter, setTenantFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('unresolved')
  const [periodFilter, setPeriodFilter] = useState('24h')

  const [result, setResult] = useState<IssuesResult | null>(null)
  const [stats, setStats] = useState<SentryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configError, setConfigError] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/tenants')
      if (!res.ok) return
      const json = await res.json()
      if (json?.success && Array.isArray(json.data)) {
        const rows = json.data as Array<{ id: string; nombre: string; subdomain: string | null; activo: boolean }>
        setTenants(rows)
      }
    } catch {
      // Tenants opcional: el feed funciona sin filtro de tenant
    }
  }, [])

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/sentry/stats?statsPeriod=${periodFilter}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.status === 503) {
        setConfigError(true)
        return
      }
      if (json?.success) setStats(json.data)
    } catch {
      // Stats opcional
    } finally {
      setLoadingStats(false)
    }
  }, [periodFilter])

  const fetchIssues = useCallback(
    async (pageCursor: string | null = null) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ statsPeriod: periodFilter })
        if (tenantFilter !== 'all') params.set('tenant', tenantFilter)
        if (levelFilter !== 'all') params.set('level', levelFilter)
        if (serviceFilter !== 'all') params.set('service', serviceFilter)
        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (pageCursor) params.set('cursor', pageCursor)

        const res = await fetch(`/api/sentry/issues?${params.toString()}`, { cache: 'no-store' })
        const json = await res.json()
        if (res.status === 503) {
          setConfigError(true)
          setResult(null)
          return
        }
        if (!json?.success) {
          setError(json?.error || 'Error al cargar issues')
          return
        }
        setResult(json.data)
        setCursor(json.data.nextCursor)
      } catch {
        setError('Error de conexión al cargar issues')
      } finally {
        setLoading(false)
      }
    },
    [tenantFilter, levelFilter, serviceFilter, statusFilter, periodFilter]
  )

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    setHistory([])
    setCursor(null)
    fetchIssues(null)
  }, [fetchIssues])

  const goNext = () => {
    if (!result?.hasNext || !result.nextCursor) return
    setHistory(prev => [...prev, cursor || ''])
    setCursor(result.nextCursor)
    fetchIssues(result.nextCursor)
  }

  const goPrev = () => {
    const prevCursor = history[history.length - 1]
    if (history.length === 0 || prevCursor === undefined) return
    setHistory(prev => prev.slice(0, -1))
    fetchIssues(prevCursor)
  }

  const selectClass =
    'px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Feed de errores</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Errores agregados de todos los tenants via Sentry/GlitchTip
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al dashboard
        </Link>
      </div>

      {configError && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-400">Sentry/GlitchTip API no configurada</h3>
              <p className="text-sm text-yellow-300/90 mt-1">
                Configura <code className="font-mono text-xs">SENTRY_AUTH_TOKEN</code> y{' '}
                <code className="font-mono text-xs">SENTRY_ORG</code> en las variables de entorno de ops-console para
                activar el feed de errores. El token se crea en GlitchTip {'>'} Profile {'>'} Auth Tokens (scopes:{' '}
                event:read, org:read, project:read).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Errores sin resolver</p>
          </div>
          <p className="text-lg font-bold mt-1 text-red-400">
            {loadingStats ? '…' : stats?.unresolved ?? '—'}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Últimas {periodFilter}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Por nivel</p>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {stats && Object.entries(stats.byLevel).length > 0 ? (
              Object.entries(stats.byLevel).map(([level, count]) => (
                <span key={level} className="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  {level}: {count}
                </span>
              ))
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Sin datos</p>
            )}
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Por servicio</p>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {stats && Object.entries(stats.byService).length > 0 ? (
              Object.entries(stats.byService).map(([service, count]) => (
                <span key={service} className="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  {service}: {count}
                </span>
              ))
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-medium">Filtros</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select value={tenantFilter} onChange={e => setTenantFilter(e.target.value)} className={selectClass} aria-label="Filtrar por tenant">
            <option value="all">Todos los tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className={selectClass} aria-label="Filtrar por nivel">
            {LEVELS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} className={selectClass} aria-label="Filtrar por servicio">
            {SERVICES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass} aria-label="Filtrar por estado">
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className={selectClass} aria-label="Filtrar por periodo">
            {PERIODS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Issues table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm font-medium">
              {result ? `${result.issues.length} issues` : 'Issues'}
            </span>
          </div>
          {(result?.hasNext || result?.hasPrevious) && (
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={!result.hasPrevious}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={goNext}
                disabled={!result.hasNext}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)] transition-colors"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 flex items-start gap-4 animate-pulse">
                <div className="h-4 w-20 bg-[var(--bg-secondary)] rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-[var(--bg-secondary)] rounded" />
                  <div className="h-3 w-1/3 bg-[var(--bg-secondary)] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <XCircle className="w-10 h-10 mx-auto text-red-400/50 mb-3" />
            <p className="text-[var(--text-secondary)]">{error}</p>
            <button
              onClick={() => fetchIssues(cursor)}
              className="mt-4 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm"
            >
              Reintentar
            </button>
          </div>
        ) : !result || result.issues.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-10 h-10 mx-auto text-green-400/50 mb-3" />
            <h3 className="font-medium">Sin errores encontrados</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              No hay issues para los filtros seleccionados en el periodo elegido.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {result.issues.map(issue => {
              const tenantId = getTag(issue, 'tenantId')
              const tenantNombre = tenants.find(t => t.id === tenantId)?.nombre
              const servicio = getTag(issue, 'servicio')
              const ruta = getTag(issue, 'ruta')
              return (
                <div key={issue.id} className="p-4 hover:bg-[var(--bg-hover)] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <LevelBadge level={issue.level} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium text-sm text-[var(--text-primary)] truncate">
                          {issue.title || issue.metadata?.value || 'Error desconocido'}
                        </h3>
                        <StatusBadge status={issue.status} />
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-[var(--text-muted)]">
                        <span className="font-mono text-[var(--text-secondary)]">{issue.shortId}</span>
                        {tenantNombre && <span>· {tenantNombre}</span>}
                        {servicio && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)]">{servicio}</span>
                        )}
                        {ruta && <span className="font-mono truncate max-w-[300px]">{ruta}</span>}
                        <span>· {issue.count} eventos</span>
                        <span>· último {formatTimeAgo(issue.lastSeen)}</span>
                      </div>
                    </div>
                    <a
                      href={issue.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors shrink-0"
                      title="Ver en GlitchTip"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 text-xs text-[var(--text-muted)]">
        <span>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando issues...
            </span>
          ) : (
            `Mostrando issues de las últimas ${periodFilter}`
          )}
        </span>
        <Link href="/dashboard/infra-health" className="text-[var(--accent)] hover:underline">
          Ver salud de infraestructura →
        </Link>
      </div>
    </div>
  )
}
