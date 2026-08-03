import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, ok } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { canAccess } from '@/lib/features';
import { calcularOcupacionFranjas, getDemoOcupacion } from '@/lib/services/ocupacion-franjas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reportes/ocupacion?demo=true|false&semanas=12
 *
 * Devuelve el mapa de calor de ocupación por franja horaria (últimas
 * 12 semanas por defecto). Si ?demo=true (default), devuelve datos demo
 * realistas. Si ?demo=false, calcula sobre DB real (RLS-scoped al tenant
 * actual). Si no hay turnos reales, fallback a demo con _demo:true.
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const plan = session.user?.plan ?? 'free';
  if (!canAccess(plan, 'reportes-avanzados')) {
    return NextResponse.json({ error: 'Tu plan no incluye el mapa de ocupación' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const forceDemo = searchParams.get('demo') !== 'false';
  const semanasRaw = Number(searchParams.get('semanas') ?? '12');
  const semanas = Number.isFinite(semanasRaw) && semanasRaw >= 4 && semanasRaw <= 16 ? semanasRaw : 12;

  if (forceDemo) {
    const demo = getDemoOcupacion({ semanas });
    return ok(demo);
  }

  try {
    const reporte = await calcularOcupacionFranjas({ semanas });
    if (reporte.totalTurnos === 0) {
      const demo = getDemoOcupacion({ semanas });
      return ok({ ...demo, _demo: true });
    }
    return ok(reporte);
  } catch {
    const demo = getDemoOcupacion({ semanas });
    return ok({ ...demo, _demo: true });
  }
});
