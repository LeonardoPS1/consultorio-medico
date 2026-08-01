import { logger } from '@/lib/logger'

export interface SentryIssue {
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
  metadata?: {
    type?: string
    value?: string
  }
  tags?: Array<{ key: string; value: string }>
}

export interface SentryIssuesParams {
  tenantId?: string
  level?: string
  service?: string
  status?: string
  statsPeriod?: string
  cursor?: string
  limit?: number
}

export interface SentryIssuesResult {
  issues: SentryIssue[]
  nextCursor: string | null
  previousCursor: string | null
  hasNext: boolean
  hasPrevious: boolean
}

export interface SentryStats {
  total: number
  byLevel: Record<string, number>
  byService: Record<string, number>
  byTenant: Record<string, number>
  unresolved: number
  period: string
}

interface LinkHeader {
  next: { cursor: string; results: boolean } | null
  previous: { cursor: string; results: boolean } | null
}

export function getSentryConfig() {
  return {
    baseUrl: process.env.SENTRY_API_URL || process.env.GLITCHTIP_API_URL || 'https://app.glitchtip.com',
    token: process.env.SENTRY_AUTH_TOKEN || process.env.GLITCHTIP_API_TOKEN || '',
    org: process.env.SENTRY_ORG || process.env.GLITCHTIP_ORG || '',
    project: process.env.SENTRY_PROJECT || process.env.GLITCHTIP_PROJECT_ID || '25899',
  }
}

export function isSentryConfigured(): boolean {
  const { token, org } = getSentryConfig()
  return Boolean(token && org)
}

function buildQuery(filters: { tenantId?: string; level?: string; service?: string; status?: string }) {
  const clauses: string[] = []
  if (filters.status && filters.status !== 'all') {
    clauses.push(`is:${filters.status}`)
  } else {
    clauses.push('is:unresolved')
  }
  if (filters.tenantId) {
    clauses.push(`tenantId:${filters.tenantId}`)
  }
  if (filters.level && filters.level !== 'all') {
    clauses.push(`level:${filters.level}`)
  }
  if (filters.service && filters.service !== 'all') {
    clauses.push(`servicio:${filters.service}`)
  }
  return clauses.join(' ')
}

function parseLinkHeader(link?: string | null): LinkHeader {
  const result: LinkHeader = { next: null, previous: null }
  if (!link) return result

  const parts = link.split(',')
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="(\w+)"/)
    if (!match) continue
    const url = match[1]
    const rel = match[2]
    const cursor = new URL(url).searchParams.get('cursor')
    const results = part.includes('results="true"')
    if (cursor && (rel === 'next' || rel === 'previous')) {
      result[rel] = { cursor, results }
    }
  }
  return result
}

export async function getSentryIssues(params: SentryIssuesParams = {}): Promise<SentryIssuesResult> {
  const { baseUrl, token, org, project } = getSentryConfig()
  if (!token || !org) {
    throw new Error('Sentry/GlitchTip API no configurado (SENTRY_AUTH_TOKEN, SENTRY_ORG)')
  }

  const query = buildQuery(params)
  const searchParams = new URLSearchParams()
  searchParams.set('query', query)
  searchParams.set('statsPeriod', params.statsPeriod || '24h')
  searchParams.set('limit', String(params.limit || 25))
  searchParams.set('project', project)
  if (params.cursor) {
    searchParams.set('cursor', params.cursor)
  }

  const url = `${baseUrl}/api/0/organizations/${encodeURIComponent(org)}/issues/?${searchParams.toString()}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn('[Sentry] Error response:', { status: res.status, body: body.slice(0, 300) })
      throw new Error(`Sentry API error ${res.status}`)
    }

    const issues = (await res.json()) as SentryIssue[]
    const link = parseLinkHeader(res.headers.get('link'))

    return {
      issues,
      nextCursor: link.next?.results ? link.next.cursor : null,
      previousCursor: link.previous?.results ? link.previous.cursor : null,
      hasNext: Boolean(link.next?.results),
      hasPrevious: Boolean(link.previous?.results),
    }
  } catch (err) {
    clearTimeout(timeout)
    logger.warn('[Sentry] Error al listar issues:', { error: err instanceof Error ? err.message : err })
    throw err
  }
}

export async function getSentryStats(statsPeriod = '24h'): Promise<SentryStats> {
  const { issues } = await getSentryIssues({ statsPeriod, limit: 100 })

  const stats: SentryStats = {
    total: issues.length,
    byLevel: {},
    byService: {},
    byTenant: {},
    unresolved: 0,
    period: statsPeriod,
  }

  for (const issue of issues) {
    const level = issue.level || 'unknown'
    stats.byLevel[level] = (stats.byLevel[level] || 0) + 1
    if (issue.status === 'unresolved') stats.unresolved++

    const tags = issue.tags || []
    const servicio = tags.find(t => t.key === 'servicio')?.value || 'desconocido'
    stats.byService[servicio] = (stats.byService[servicio] || 0) + 1

    const tenant = tags.find(t => t.key === 'tenantId')?.value || 'sin-tenant'
    stats.byTenant[tenant] = (stats.byTenant[tenant] || 0) + 1
  }

  return stats
}
