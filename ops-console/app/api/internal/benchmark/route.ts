import { NextRequest, NextResponse } from 'next/server'
import { ok, error, unauthorized, serverError } from '@/lib/api-handler'
import { getOperatorFromHeaders } from '@/lib/overrides'
import { getBenchmarkActivo, recalcularBenchmark, getComparativaTenant } from '@/lib/benchmark'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * API interna de benchmark anónimo entre clínicas.
 *
 * - GET  → devuelve el snapshot activo (buckets con >= 5 tenants) y,
 *          si se pasa ?tenantId=, la comparativa de ese tenant vs su bucket.
 *          Auth: operator headers O x-internal-key.
 * - POST → fuerza el recálculo del benchmark (job nocturno WF-16).
 *          Auth: x-internal-key (solo interno).
 */
export async function GET(request: NextRequest) {
  try {
    const operator = getOperatorFromHeaders(request)
    const internalKey = request.headers.get('x-internal-key')
    const isInternal = internalKey === process.env.INTERNAL_API_KEY

    if (!operator && !isInternal) return unauthorized()

    const tenantId = request.nextUrl.searchParams.get('tenantId')
    const activo = await getBenchmarkActivo()
    let comparativa = null
    if (tenantId) {
      comparativa = await getComparativaTenant(tenantId)
    }

    return ok({
      buckets: activo.buckets,
      tenantCountTotal: activo.tenantCountTotal,
      calculatedAt: activo.calculatedAt,
      comparativa,
    })
  } catch (err) {
    logger.warn('[ops/benchmark] GET error', { error: err instanceof Error ? err.message : String(err) })
    return serverError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const internalKey = request.headers.get('x-internal-key')
    if (internalKey !== process.env.INTERNAL_API_KEY) return unauthorized()

    const body = await request.json().catch(() => ({}))
    const tenantId = body.tenantId
    if (tenantId) {
      logger.info('[ops/benchmark] recalcular para tenant específico no soportado (se recalculará global)')
    }

    const resultado = await recalcularBenchmark()
    logger.info('[ops/benchmark] recalculado', { bucketCount: resultado.buckets.length, tenantCountTotal: resultado.tenantCountTotal })

    // Respuesta plana (n8n WF-16 chequea $json.mensaje contains "recalculado")
    return NextResponse.json({
      success: true,
      mensaje: `Benchmark recalculado: ${resultado.buckets.length} buckets, ${resultado.tenantCountTotal} tenants con datos`,
      buckets: resultado.buckets,
      tenantCountTotal: resultado.tenantCountTotal,
      calculatedAt: resultado.calculatedAt,
    })
  } catch (err) {
    logger.warn('[ops/benchmark] POST error', { error: err instanceof Error ? err.message : String(err) })
    return serverError(err)
  }
}
