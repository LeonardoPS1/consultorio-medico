import { NextResponse } from 'next/server';
import { getSentryIssues, isSentryConfigured, getSentryConfig } from '@/lib/sentry-api';
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
    const tenantId = searchParams.get('tenant') || undefined
    const level = searchParams.get('level') || undefined
    const service = searchParams.get('service') || undefined
    const status = searchParams.get('status') || undefined
    const statsPeriod = searchParams.get('statsPeriod') || '24h'
    const cursor = searchParams.get('cursor') || undefined
    const limit = Number(searchParams.get('limit') || 25)

    const result = await getSentryIssues({
      tenantId,
      level,
      service,
      status,
      statsPeriod,
      cursor,
      limit,
    })

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (err) {
    logger.warn('[sentry/issues] Error:', { error: err instanceof Error ? err.message : err })
    return NextResponse.json(
      { success: false, error: 'Error al consultar Sentry/GlitchTip' },
      { status: 502 }
    )
  }
}
