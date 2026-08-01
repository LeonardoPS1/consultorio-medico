import { logger } from '@/lib/logger'

export type NotificationChannel = 'telegram' | 'email' | 'chatwoot' | 'webhook'

export interface NotificationConfig {
  telegram?: {
    botToken: string
    chatId: string
  }
  email?: {
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPass: string
    from: string
    to: string[]
  }
  chatwoot?: {
    apiUrl: string
    apiToken: string
    accountId: string
    inboxId: string
  }
  webhook?: {
    url: string
    secret?: string
  }
}

export interface AlertNotification {
  alertName: string
  displayName: string
  message: string
  tenantNombre?: string
  triggerValue: number
  thresholdValue: number
  severity: 'warning' | 'critical'
  details?: Record<string, unknown>
}

function formatAlertMessage(alert: AlertNotification): string {
  const severityEmoji = alert.severity === 'critical' ? '🔴' : '🟡'
  const tenantPart = alert.tenantNombre ? ` — Tenant: ${alert.tenantNombre}` : ''
  return `${severityEmoji} <b>${alert.displayName}</b>${tenantPart}\n\n${alert.message}\n\nValor: ${alert.triggerValue} / Umbral: ${alert.thresholdValue}`
}

export async function sendTelegramNotification(
  config: NotificationConfig['telegram'],
  alert: AlertNotification
): Promise<{ success: boolean; response?: string }> {
  if (!config?.botToken || !config?.chatId) {
    return { success: false, response: 'Telegram no configurado (botToken/chatId faltantes)' }
  }

  try {
    const message = formatAlertMessage(alert)
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, response: `Telegram API error: ${data.description || res.status}` }
    }
    return { success: true, response: `Message ID: ${data.result?.message_id}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    logger.warn('[notifications] Telegram error:', { error: msg })
    return { success: false, response: msg }
  }
}

export async function sendEmailNotification(
  config: NotificationConfig['email'],
  alert: AlertNotification
): Promise<{ success: boolean; response?: string }> {
  if (!config?.smtpHost || !config?.smtpUser || !config?.smtpPass || !config?.from || !config?.to?.length) {
    return { success: false, response: 'Email no configurado (faltan parámetros SMTP)' }
  }

  try {
    const nodemailer = await import('nodemailer').then(m => m.default)

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort || 587,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    })

    const subject = `${alert.severity === 'critical' ? '🔴 CRÍTICO' : '🟡 ADVERTENCIA'}: ${alert.displayName}`
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${alert.severity === 'critical' ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 18px;">${alert.displayName}</h1>
          ${alert.tenantNombre ? `<p style="margin: 8px 0 0;">Tenant: ${alert.tenantNombre}</p>` : ''}
        </div>
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0 0 16px; white-space: pre-wrap;">${alert.message}</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold;">Valor actual:</td><td style="padding: 8px;">${alert.triggerValue}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Umbral:</td><td style="padding: 8px;">${alert.thresholdValue}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Severidad:</td><td style="padding: 8px;">${alert.severity.toUpperCase()}</td></tr>
          </table>
          ${alert.details ? `<pre style="background: #f3f4f6; padding: 12px; border-radius: 4px; font-size: 12px; overflow: auto; margin-top: 16px;">${JSON.stringify(alert.details, null, 2)}</pre>` : ''}
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">Sistema de Alertas AicoreOps</p>
      </div>
    `

    const info = await transporter.sendMail({
      from: config.from,
      to: config.to.join(', '),
      subject,
      html,
    })

    return { success: true, response: `Message ID: ${info.messageId}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    logger.warn('[notifications] Email error:', { error: msg })
    return { success: false, response: msg }
  }
}

export async function sendChatwootNotification(
  config: NotificationConfig['chatwoot'],
  alert: AlertNotification
): Promise<{ success: boolean; response?: string }> {
  if (!config?.apiUrl || !config?.apiToken || !config?.accountId || !config?.inboxId) {
    return { success: false, response: 'Chatwoot no configurado (faltan parámetros)' }
  }

  try {
    const message = formatAlertMessage(alert).replace(/<[^>]+>/g, '') // Strip HTML for Chatwoot

    // Create a conversation in the support inbox
    const url = `${config.apiUrl}/api/v1/accounts/${config.accountId}/conversations`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': config.apiToken,
      },
      body: JSON.stringify({
        inbox_id: config.inboxId,
        source_id: `alert-${alert.alertName}-${Date.now()}`,
        message: {
          content: message,
          message_type: 'outgoing',
          private: true,
        },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, response: `Chatwoot API error: ${data.message || res.status}` }
    }
    return { success: true, response: `Conversation ID: ${data.id}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    logger.warn('[notifications] Chatwoot error:', { error: msg })
    return { success: false, response: msg }
  }
}

export async function sendWebhookNotification(
  config: NotificationConfig['webhook'],
  alert: AlertNotification
): Promise<{ success: boolean; response?: string }> {
  if (!config?.url) {
    return { success: false, response: 'Webhook no configurado (URL faltante)' }
  }

  try {
    const payload = {
      alert: alert.alertName,
      displayName: alert.displayName,
      message: alert.message,
      tenantNombre: alert.tenantNombre,
      triggerValue: alert.triggerValue,
      thresholdValue: alert.thresholdValue,
      severity: alert.severity,
      details: alert.details,
      timestamp: new Date().toISOString(),
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (config.secret) {
      // HMAC-SHA256 signature
      const crypto = await import('crypto')
      const signature = crypto.createHmac('sha256', config.secret)
        .update(JSON.stringify(payload))
        .digest('hex')
      headers['x-webhook-signature'] = signature
    }

    const res = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { success: false, response: `Webhook error ${res.status}: ${text.slice(0, 200)}` }
    }
    return { success: true, response: `HTTP ${res.status}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    logger.warn('[notifications] Webhook error:', { error: msg })
    return { success: false, response: msg }
  }
}

export async function sendAlertNotification(
  channelConfigs: NotificationConfig,
  alert: AlertNotification,
  channels: string[]
): Promise<{ channel: string; success: boolean; response?: string }[]> {
  const results: { channel: string; success: boolean; response?: string }[] = []

  for (const channel of channels) {
    let result: { success: boolean; response?: string }

    switch (channel) {
      case 'telegram':
        result = await sendTelegramNotification(channelConfigs.telegram, alert)
        break
      case 'email':
        result = await sendEmailNotification(channelConfigs.email, alert)
        break
      case 'chatwoot':
        result = await sendChatwootNotification(channelConfigs.chatwoot, alert)
        break
      case 'webhook':
        result = await sendWebhookNotification(channelConfigs.webhook, alert)
        break
      default:
        result = { success: false, response: `Canal desconocido: ${channel}` }
    }

    results.push({ channel, ...result })
  }

  return results
}

export function getNotificationConfigFromEnv(): NotificationConfig {
  return {
    telegram: process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
      ? { botToken: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID }
      : undefined,
    email: process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM
      ? {
          smtpHost: process.env.SMTP_HOST,
          smtpPort: parseInt(process.env.SMTP_PORT || '587'),
          smtpUser: process.env.SMTP_USER,
          smtpPass: process.env.SMTP_PASS,
          from: process.env.SMTP_FROM,
          to: (process.env.SMTP_TO || process.env.SMTP_FROM).split(',').map(s => s.trim()),
        }
      : undefined,
    chatwoot: process.env.CHATWOOT_API_URL && process.env.CHATWOOT_API_TOKEN && process.env.CHATWOOT_ACCOUNT_ID && process.env.CHATWOOT_INBOX_ID
      ? {
          apiUrl: process.env.CHATWOOT_API_URL,
          apiToken: process.env.CHATWOOT_API_TOKEN,
          accountId: process.env.CHATWOOT_ACCOUNT_ID,
          inboxId: process.env.CHATWOOT_INBOX_ID,
        }
      : undefined,
    webhook: process.env.ALERT_WEBHOOK_URL
      ? { url: process.env.ALERT_WEBHOOK_URL, secret: process.env.ALERT_WEBHOOK_SECRET }
      : undefined,
  }
}