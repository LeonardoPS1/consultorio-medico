import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { alertsConfig, alertsHistory } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { ok, error, unauthorized, serverError } from '@/lib/api-handler'
import { getOperatorFromHeaders } from '@/lib/overrides'
import { runAllAlertChecks, recordAlertTriggered, updateAlertLastTriggered, AlertCheckResult } from '@/lib/alerts'
import { sendAlertNotification, getNotificationConfigFromEnv, AlertNotification, NotificationConfig } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Allow both authenticated operators and internal cron calls (with x-internal-key)
    const operator = getOperatorFromHeaders(request)
    const internalKey = request.headers.get('x-internal-key')
    const isInternal = internalKey === process.env.INTERNAL_API_KEY

    if (!operator && !isInternal) return unauthorized()

    const db = getDb()

    // Get active alert configs with their channel configs
    const configs = await db.select().from(alertsConfig).where(eq(alertsConfig.isActive, true))

    if (configs.length === 0) {
      return ok({ checked: 0, triggered: 0, results: [] })
    }

    // Run all alert checks
    const results = await runAllAlertChecks()

    const triggeredResults = results.filter(r => r.triggered)
    const notificationsSummary: Array<{
      alertName: string
      tenantNombre?: string
      notificationsSent: { channel: string; success: boolean; response?: string }[]
    }> = []

    // Get notification config from env (global defaults)
    const globalNotificationConfig = getNotificationConfigFromEnv()

    for (const result of triggeredResults) {
      // Find the matching config
      const config = configs.find(c => c.alertName === result.alertName)
      if (!config) continue

      // Merge global notification config with alert-specific channel config
      const channelConfig = (config.channelConfig as Record<string, unknown>) || {}
      const mergedConfig: NotificationConfig = {
        telegram: (channelConfig.telegram as NotificationConfig['telegram']) || globalNotificationConfig.telegram,
        chatwoot: (channelConfig.chatwoot as NotificationConfig['chatwoot']) || globalNotificationConfig.chatwoot,
        webhook: (channelConfig.webhook as NotificationConfig['webhook']) || globalNotificationConfig.webhook,
      }

      // Prepare notification
      const severity: 'warning' | 'critical' =
        result.alertName === 'infra_down' || result.alertName === 'evolution_down'
          ? 'critical'
          : 'warning'

      const notification: AlertNotification = {
        alertName: result.alertName,
        displayName: config.displayName,
        message: result.message,
        tenantNombre: result.tenantNombre,
        triggerValue: result.triggerValue,
        thresholdValue: result.thresholdValue,
        severity,
        details: result.details,
      }

      // Send notifications
      const channels = config.notificationChannels as string[]
      const notificationsSent = await sendAlertNotification(mergedConfig, notification, channels)

      // Record in history
      await recordAlertTriggered(config.id, {
        ...result,
        // We need to include notificationsSent in the record
      } as AlertCheckResult & { notificationsSent: typeof notificationsSent })

      // Update last triggered
      await updateAlertLastTriggered(config.id)

      notificationsSummary.push({
        alertName: result.alertName,
        tenantNombre: result.tenantNombre,
        notificationsSent,
      })
    }

    return ok({
      checked: results.length,
      triggered: triggeredResults.length,
      results: notificationsSummary,
    })
  } catch (err) {
    return serverError(err)
  }
}