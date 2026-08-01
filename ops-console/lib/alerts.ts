import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { alertsConfig, alertsHistory, platformAuditLog } from '@/drizzle/schema'
import { eq, and, gte, lte, desc, count, inArray, isNull, sql as sqlFn } from 'drizzle-orm'

export type AlertType = 'payment_failure' | 'evolution_down' | 'error_rate' | 'infra_down'

export interface AlertCheckResult {
  alertName: AlertType
  triggered: boolean
  tenantId?: string
  tenantNombre?: string
  triggerValue: number
  thresholdValue: number
  message: string
  details?: Record<string, unknown>
}

export interface AlertConfigWithChannels {
  id: string
  alertName: AlertType
  displayName: string
  description: string | null
  thresholdValue: number
  thresholdWindowMinutes: number
  notificationChannels: string[]
  channelConfig: Record<string, unknown>
  isActive: boolean
}

async function getActiveAlertConfigs(): Promise<AlertConfigWithChannels[]> {
  const db = getDb()
  const configs = await db.select().from(alertsConfig).where(eq(alertsConfig.isActive, true))
  return configs as AlertConfigWithChannels[]
}

export async function checkPaymentFailures(): Promise<AlertCheckResult[]> {
  const db = getDb()
  const configs = await getActiveAlertConfigs()
  const paymentConfig = configs.find(c => c.alertName === 'payment_failure')
  if (!paymentConfig) return []

  const windowMinutes = paymentConfig.thresholdWindowMinutes
  const threshold = paymentConfig.thresholdValue

  // Check dashboard webhook_logs for failed payments per tenant
  // We need to query the public schema webhook_logs table
  const result = await db.execute(sql`
    SELECT
      wl.config_id,
      wc.tenant_id,
      t.nombre as tenant_nombre,
      COUNT(*) as failure_count
    FROM webhook_logs wl
    JOIN webhook_configs wc ON wc.id = wl.config_id
    JOIN public.tenants t ON t.id = wc.tenant_id
    WHERE wl.status_code >= 400
      AND wl.created_at >= NOW() - INTERVAL '${windowMinutes} minutes'
    GROUP BY wl.config_id, wc.tenant_id, t.nombre
    HAVING COUNT(*) >= ${threshold}
  `)

  const rows = result as unknown as Array<{
    tenant_id: string
    tenant_nombre: string
    failure_count: number
  }>

  return rows.map(row => ({
    alertName: 'payment_failure' as AlertType,
    triggered: true,
    tenantId: row.tenant_id,
    tenantNombre: row.tenant_nombre,
    triggerValue: row.failure_count,
    thresholdValue: threshold,
    message: `Tenant "${row.tenant_nombre}" tiene ${row.failure_count} pagos fallidos en los últimos ${windowMinutes} minutos (umbral: ${threshold})`,
    details: { windowMinutes, threshold }
  }))
}

export async function checkEvolutionDown(): Promise<AlertCheckResult[]> {
  const db = getDb()
  const configs = await getActiveAlertConfigs()
  const evolutionConfig = configs.find(c => c.alertName === 'evolution_down')
  if (!evolutionConfig) return []

  const windowMinutes = evolutionConfig.thresholdWindowMinutes

  // Check infra-health for Evolution API status per tenant
  // For now, we'll check if Evolution API is globally down and tenants have instances
  // This is a simplified check - in production you'd want per-tenant instance status
  const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080'
  const evolutionKey = process.env.EVOLUTION_API_KEY

  let isDown = false
  let errorMsg = ''

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${evolutionUrl}/health`, {
      signal: controller.signal,
      headers: evolutionKey ? { apikey: evolutionKey } : {}
    })
    clearTimeout(timeout)
    isDown = !res.ok
    if (!res.ok) errorMsg = `HTTP ${res.status}`
  } catch (e) {
    isDown = true
    errorMsg = e instanceof Error ? e.message : 'Error de conexión'
  }

  if (!isDown) return []

  // If Evolution is down, check which tenants have subdomains (instances)
  const tenants = await db.execute(sql`
    SELECT id, nombre, subdomain
    FROM public.tenants
    WHERE activo = true AND subdomain IS NOT NULL
  `)

  const rows = tenants as unknown as Array<{ id: string; nombre: string; subdomain: string }>

  return rows.map(row => ({
    alertName: 'evolution_down' as AlertType,
    triggered: true,
    tenantId: row.id,
    tenantNombre: row.nombre,
    triggerValue: 1,
    thresholdValue: 1,
    message: `Instancia WhatsApp/Evolution del tenant "${row.nombre}" (${row.subdomain}) no responde: ${errorMsg}`,
    details: { instanceName: row.subdomain, error: errorMsg, windowMinutes }
  }))
}

export async function checkErrorRate(): Promise<AlertCheckResult[]> {
  const db = getDb()
  const configs = await getActiveAlertConfigs()
  const errorConfig = configs.find(c => c.alertName === 'error_rate')
  if (!errorConfig) return []

  const windowMinutes = errorConfig.thresholdWindowMinutes
  const threshold = errorConfig.thresholdValue

  // Count errors from platform_audit_log per tenant in the time window
  // We look for actions that indicate errors (contain 'error', 'fail', 'fallo', etc.)
  const result = await db.execute(sql`
    SELECT
      tenant_afectado as tenant_nombre,
      COUNT(*) as error_count
    FROM platform.platform_audit_log
    WHERE created_at >= NOW() - INTERVAL '${windowMinutes} minutes'
      AND (
        accion ILIKE '%error%' OR
        accion ILIKE '%fail%' OR
        accion ILIKE '%fallo%' OR
        detalles::text ILIKE '%error%' OR
        detalles::text ILIKE '%fail%'
      )
      AND tenant_afectado IS NOT NULL
    GROUP BY tenant_afectado
    HAVING COUNT(*) >= ${threshold}
  `)

  const rows = result as unknown as Array<{ tenant_nombre: string; error_count: number }>

  return rows.map(row => ({
    alertName: 'error_rate' as AlertType,
    triggered: true,
    tenantNombre: row.tenant_nombre,
    triggerValue: row.error_count,
    thresholdValue: threshold,
    message: `Tenant "${row.tenant_nombre}" tiene ${row.error_count} errores en los últimos ${windowMinutes} minutos (umbral: ${threshold})`,
    details: { windowMinutes, threshold }
  }))
}

export async function checkInfraDown(): Promise<AlertCheckResult[]> {
  const db = getDb()
  const configs = await getActiveAlertConfigs()
  const infraConfig = configs.find(c => c.alertName === 'infra_down')
  if (!infraConfig) return []

  const windowMinutes = infraConfig.thresholdWindowMinutes

  // Check critical services from infra-health
  // We'll run a quick health check on critical services
  const criticalServices = ['postgres', 'redis', 'n8n'] as const
  const results: AlertCheckResult[] = []

  for (const serviceName of criticalServices) {
    let isDown = false
    let errorMsg = ''
    let latencyMs = 0

    try {
      const start = Date.now()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)

      if (serviceName === 'postgres') {
        await db.execute(sql`SELECT 1`)
      } else if (serviceName === 'redis') {
        const url = process.env.REDIS_URL
        if (!url) throw new Error('Redis no configurado')
        const { getRedis } = await import('@/lib/redis')
        const redis = await getRedis()
        if (!redis) throw new Error('Redis inalcanzable')
        await redis.ping()
      } else if (serviceName === 'n8n') {
        const n8nUrl = process.env.N8N_BASE_URL || 'http://172.18.0.1:5678'
        const res = await fetch(`${n8nUrl}/healthz`, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      }

      clearTimeout(timeout)
      latencyMs = Date.now() - start
    } catch (e) {
      isDown = true
      errorMsg = e instanceof Error ? e.message : 'Error de conexión'
    }

    if (isDown) {
      results.push({
        alertName: 'infra_down' as AlertType,
        triggered: true,
        triggerValue: 1,
        thresholdValue: 1,
        message: `Servicio crítico "${serviceName}" está caído desde hace más de ${windowMinutes} minutos: ${errorMsg}`,
        details: { service: serviceName, latencyMs, error: errorMsg, windowMinutes }
      })
    }
  }

  return results
}

export async function runAllAlertChecks(): Promise<AlertCheckResult[]> {
  const [payment, evolution, errorRate, infra] = await Promise.all([
    checkPaymentFailures(),
    checkEvolutionDown(),
    checkErrorRate(),
    checkInfraDown(),
  ])

  return [...payment, ...evolution, ...errorRate, ...infra]
}

export async function recordAlertTriggered(
  alertConfigId: string,
  result: AlertCheckResult
): Promise<void> {
  const db = getDb()
  await db.insert(alertsHistory).values({
    alertConfigId,
    tenantId: result.tenantId || null,
    tenantNombre: result.tenantNombre || null,
    triggerValue: result.triggerValue,
    thresholdValue: result.thresholdValue,
    message: result.message,
    notificationsSent: [],
  })
}

export async function updateAlertLastTriggered(alertConfigId: string): Promise<void> {
  const db = getDb()
  await db.update(alertsConfig)
    .set({ lastTriggeredAt: new Date() })
    .where(eq(alertsConfig.id, alertConfigId))
}

export async function getAlertHistory(limit = 50): Promise<Array<{
  id: string
  alertName: string
  displayName: string
  tenantNombre: string | null
  triggerValue: number
  thresholdValue: number
  message: string
  notificationsSent: { channel: string; success: boolean; response?: string }[]
  createdAt: string
}>> {
  const db = getDb()
  const result = await db.execute(sql`
    SELECT
      ah.id,
      ac.alert_name,
      ac.display_name,
      ah.tenant_nombre,
      ah.trigger_value,
      ah.threshold_value,
      ah.message,
      ah.notifications_sent,
      ah.created_at
    FROM platform.alerts_history ah
    JOIN platform.alerts_config ac ON ac.id = ah.alert_config_id
    ORDER BY ah.created_at DESC
    LIMIT ${limit}
  `)

  return result as unknown as Array<{
    id: string
    alertName: string
    displayName: string
    tenantNombre: string | null
    triggerValue: number
    thresholdValue: number
    message: string
    notificationsSent: { channel: string; success: boolean; response?: string }[]
    createdAt: string
  }>
}