import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { alertsConfig } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'
import { ok, error, unauthorized, serverError } from '@/lib/api-handler'
import { getOperatorFromHeaders } from '@/lib/overrides'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDb()
    const configs = await db.select().from(alertsConfig).orderBy(desc(alertsConfig.createdAt))
    return ok(configs)
  } catch (err) {
    return serverError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const operator = getOperatorFromHeaders(request)
    if (!operator) return unauthorized()

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return error('Body inválido', 400)

    const {
      alertName,
      displayName,
      description,
      thresholdValue,
      thresholdWindowMinutes,
      notificationChannels,
      channelConfig,
      isActive,
    } = body as Record<string, unknown>

    if (!alertName || typeof alertName !== 'string') return error('alertName es obligatorio', 400)
    if (!displayName || typeof displayName !== 'string') return error('displayName es obligatorio', 400)
    if (typeof thresholdValue !== 'number' || thresholdValue < 1) return error('thresholdValue debe ser un número >= 1', 400)
    if (typeof thresholdWindowMinutes !== 'number' || thresholdWindowMinutes < 1) return error('thresholdWindowMinutes debe ser un número >= 1', 400)
    if (!Array.isArray(notificationChannels)) return error('notificationChannels debe ser un array', 400)

    const validChannels = ['telegram', 'email', 'chatwoot', 'webhook']
    for (const ch of notificationChannels) {
      if (typeof ch !== 'string' || !validChannels.includes(ch)) {
        return error(`Canal inválido: ${ch}. Válidos: ${validChannels.join(', ')}`, 400)
      }
    }

    const db = getDb()

    // Check if alertName already exists
    const existing = await db.select().from(alertsConfig).where(eq(alertsConfig.alertName, alertName)).limit(1)
    if (existing.length > 0) return error('Ya existe una alerta con ese nombre', 409)

    const [newConfig] = await db.insert(alertsConfig).values({
      alertName,
      displayName,
      description: typeof description === 'string' ? description : null,
      thresholdValue,
      thresholdWindowMinutes,
      notificationChannels,
      channelConfig: (channelConfig as Record<string, unknown>) || {},
      isActive: typeof isActive === 'boolean' ? isActive : true,
    }).returning()

    return ok(newConfig, 201)
  } catch (err) {
    return serverError(err)
  }
}