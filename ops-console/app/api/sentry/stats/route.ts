import { NextResponse } from 'next/server';
import { getSentryStats, isSentryConfigured } from '@/lib/sentry-api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const operatorId = request.headers.get('x-operator-id')
    if (!operatorId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    if (!isSentryConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Sentry/GlitchTip API no configurado (SENTRY_AUTH_TOKEN, SENTRY_ORG)' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const statsPeriod = searchParams.get('statsPeriod') || '24h'

    const stats = await getSentryStats(statsPeriod)

    return NextResponse.json({ success: true, data: stats }, { status: 200 })
  } catch (err) {
    logger.warn('[sentry/stats] Error:', { error: err instanceof Error ? err.message : err })
    return NextResponse.json(
      { success: false, error: 'Error al consultar estadísticas de Sentry/GlitchTip' },
      { status: 502 }
    )
  }
}
