import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, ok } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { canAccess } from '@/lib/features';
import { calcularOcupacionFranjas, getDemoOcupacion } from '@/lib/services/ocupacion-franjas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reportes/ocupacion?demo=true|false&semanas=12&sucursalId=&medicoId=
 *
 * Devuelve el mapa de calor de ocupación por franja horaria (últimas
 * 12 semanas por defecto). Si ?demo=true (default), devuelve datos demo
 * realistas. Si ?demo=false, calcula sobre DB real (RLS-scoped al tenant
 * actual). Si no hay turnos reales, fallback a demo con _demo:true.
 * Filtros opcionales: sucursalId y medicoId (aditivos, no rompen el
 * contrato existente del endpoint).
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
  const periodo = searchParams.get('periodo') as 'semana' | 'mes' | 'año' | null;
  const semanasMap: Record<string, number> = { semana: 1, mes: 4, año: 52 };
  const semanasRaw = Number(searchParams.get('semanas') ?? '12');
  const semanasClamped =
    Number.isFinite(semanasRaw) && semanasRaw >= 1 && semanasRaw <= 52 ? semanasRaw : 12;
  const semanas = periodo && semanasMap[periodo] ? semanasMap[periodo] : semanasClamped;
  const sucursalId = searchParams.get('sucursalId') ?? undefined;
  const medicoId = searchParams.get('medicoId') ?? undefined;

  if (forceDemo) {
    const demo = getDemoOcupacion({ semanas });
    return ok(demo);
  }

  try {
    const reporte = await calcularOcupacionFranjas({ semanas, sucursalId, medicoId });
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
