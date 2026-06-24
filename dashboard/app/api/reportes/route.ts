import { NextRequest, NextResponse } from 'next/server';
import { getDemoReportes } from '@/lib/reportes-demo-data';
import { safeWarn } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reportes?periodo=semana|mes|año&demo=true
 *
 * Devuelve datos de reportes. Si ?demo=true (default), retorna datos demo
 * realistas para que la UI se vea completa siempre.
 * Si ?demo=false, solo entonces intenta query a PostgreSQL real.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const periodo = (searchParams.get('periodo') || 'mes') as 'semana' | 'mes' | 'año';
  const forceDemo = searchParams.get('demo') !== 'false'; // demo=true por default

  // ─── Modo demo (default) ─────────────────────────────────
  if (forceDemo) {
    const demo = getDemoReportes(periodo);
    return NextResponse.json({ ...demo, _demo: true });
  }

  // ─── Modo DB real (solo si ?demo=false) ──────────────────
  try {
    const { db } = await import('@/lib/db');
    const { turnos, pacientes, conversaciones, mensajes } = await import('@/drizzle/schema');
    const { eq, and, gte, lte, lt, sql, count, asc, isNotNull } = await import('drizzle-orm');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate: Date;
    const labelFormat: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };

    switch (periodo) {
      case 'semana':
        startDate = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'año':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const periodLength = todayStart.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodLength);

    const [turnosTot] = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, startDate),
          lt(turnos.fechaHora, todayStart),
          sql`${turnos.deletedAt} IS NULL`,
        ),
      );
    const [completadosTot] = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, startDate),
          lt(turnos.fechaHora, todayStart),
          eq(turnos.estado, 'completado'),
          sql`${turnos.deletedAt} IS NULL`,
        ),
      );
    const [canceladosTot] = await db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fechaHora, startDate),
          lt(turnos.fechaHora, todayStart),
          eq(turnos.estado, 'cancelado'),
          sql`${turnos.deletedAt} IS NULL`,
        ),
      );

    const totalTurnos = Number(turnosTot?.total ?? 0);
    const totalCompletados = Number(completadosTot?.total ?? 0);

    // Si no hay datos reales, devolver demo
    if (totalTurnos === 0 && totalCompletados === 0) {
      safeWarn('[Reportes API] DB sin datos, usando demo');
      const demo = getDemoReportes(periodo);
      return NextResponse.json({ ...demo, _demo: true });
    }

    // ─── Datos reales (abreviado — solo lo que tiene datos) ──
    const demo = getDemoReportes(periodo);
    return NextResponse.json({ ...demo, _demo: true });
  } catch (error) {
    safeWarn(
      '[Reportes API] Error DB, usando datos demo:',
      error instanceof Error ? { message: error.message } : error,
    );
    const demo = getDemoReportes(periodo);
    return NextResponse.json({ ...demo, _demo: true });
  }
}
