import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { alertsConfig } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { ok, error, unauthorized, notFound, serverError } from '@/lib/api-handler'
import { getOperatorFromHeaders } from '@/lib/overrides'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = getOperatorFromHeaders(request)
    if (!operator) return unauthorized()

    const { id } = await params
    if (!id) return error('ID es obligatorio', 400)

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return error('Body inválido', 400)

    const {
      displayName,
      description,
      thresholdValue,
      thresholdWindowMinutes,
      notificationChannels,
      channelConfig,
      isActive,
    } = body as Record<string, unknown>

    const db = getDb()

    // Check if exists
    const existing = await db.select().from(alertsConfig).where(eq(alertsConfig.id, id)).limit(1)
    if (existing.length === 0) return notFound('Alerta no encontrada')

    const updateData: Record<string, unknown> = {}
    if (typeof displayName === 'string') updateData.displayName = displayName
    if (typeof description === 'string' || description === null) updateData.description = description
    if (typeof thresholdValue === 'number' && thresholdValue >= 1) updateData.thresholdValue = thresholdValue
    if (typeof thresholdWindowMinutes === 'number' && thresholdWindowMinutes >= 1) updateData.thresholdWindowMinutes = thresholdWindowMinutes
    if (Array.isArray(notificationChannels)) {
      const validChannels = ['telegram', 'email', 'chatwoot', 'webhook']
      for (const ch of notificationChannels) {
        if (typeof ch !== 'string' || !validChannels.includes(ch)) {
          return error(`Canal inválido: ${ch}. Válidos: ${validChannels.join(', ')}`, 400)
        }
      }
      updateData.notificationChannels = notificationChannels
    }
    if (typeof channelConfig === 'object' && channelConfig !== null) updateData.channelConfig = channelConfig
    if (typeof isActive === 'boolean') updateData.isActive = isActive

    if (Object.keys(updateData).length === 0) return error('No hay campos para actualizar', 400)

    const [updated] = await db.update(alertsConfig)
      .set(updateData)
      .where(eq(alertsConfig.id, id))
      .returning()

    return ok(updated)
  } catch (err) {
    return serverError(err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = getOperatorFromHeaders(request)
    if (!operator) return unauthorized()

    const { id } = await params
    if (!id) return error('ID es obligatorio', 400)

    const db = getDb()

    const existing = await db.select().from(alertsConfig).where(eq(alertsConfig.id, id)).limit(1)
    if (existing.length === 0) return notFound('Alerta no encontrada')

    await db.delete(alertsConfig).where(eq(alertsConfig.id, id))

    return ok({ deleted: true })
  } catch (err) {
    return serverError(err)
  }
}