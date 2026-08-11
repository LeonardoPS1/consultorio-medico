import { NextResponse } from 'next/server';
import { safeWarn } from '@/lib/logger';
import { obtenerEstadoPublico } from '@/lib/status-publico';

export const dynamic = 'force-dynamic';

/**
 *
 */
export async function GET() {
  try {
    const data = await obtenerEstadoPublico();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (e: unknown) {
    safeWarn('[status-publico] Error obteniendo estado público', e);
    return NextResponse.json(
      { error: 'No se pudo obtener el estado del servicio' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
