import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { webVitalsMetrics } from '@/drizzle/schema';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { and, gte, desc, sql, count, avg, min, max } from 'drizzle-orm';

// ─── GET ───────────────────────────────────────────────────
// Admin: stats agregadas por período, últimos registros, breakdown por URL

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    fail('No autorizado', 403);
  }

  const { searchParams } = request.nextUrl;
  const period = searchParams.get('period') || '24h'; // 24h | 7d | 30d | all
  const view = searchParams.get('view') || 'stats';   // stats | recent | by-url

  const now = new Date();
  let since: Date | undefined;
  if (period === '24h') since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  else if (period === '7d') since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (period === '30d') since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const where = since ? and(gte(webVitalsMetrics.createdAt, since)) : undefined;

  if (view === 'recent') {
    const rows = await db
      .select({
        id: webVitalsMetrics.id,
        name: webVitalsMetrics.name,
        value: webVitalsMetrics.value,
        rating: webVitalsMetrics.rating,
        url: webVitalsMetrics.url,
        createdAt: webVitalsMetrics.createdAt,
      })
      .from(webVitalsMetrics)
      .where(where)
      .orderBy(desc(webVitalsMetrics.createdAt))
      .limit(100);

    return success({ data: rows, period });
  }

  if (view === 'by-url') {
    const rows = await db
      .select({
        url: webVitalsMetrics.url,
        metricName: webVitalsMetrics.name,
        avgValue: avg(sql<number>`${webVitalsMetrics.value}::numeric`),
        minValue: min(sql<number>`${webVitalsMetrics.value}::numeric`),
        maxValue: max(sql<number>`${webVitalsMetrics.value}::numeric`),
        count: count(),
      })
      .from(webVitalsMetrics)
      .where(where)
      .groupBy(webVitalsMetrics.url, webVitalsMetrics.name)
      .orderBy(webVitalsMetrics.url, webVitalsMetrics.name);

    return success({ data: rows, period });
  }

  // Default: stats por métrica
  const stats = await db
    .select({
      name: webVitalsMetrics.name,
      avgValue: avg(sql<number>`${webVitalsMetrics.value}::numeric`),
      minValue: min(sql<number>`${webVitalsMetrics.value}::numeric`),
      maxValue: max(sql<number>`${webVitalsMetrics.value}::numeric`),
      count: count(),
    })
    .from(webVitalsMetrics)
    .where(where)
    .groupBy(webVitalsMetrics.name)
    .orderBy(webVitalsMetrics.name);

  // Rating distribution
  const ratingDist = await db
    .select({
      name: webVitalsMetrics.name,
      rating: webVitalsMetrics.rating,
      count: count(),
    })
    .from(webVitalsMetrics)
    .where(where)
    .groupBy(webVitalsMetrics.name, webVitalsMetrics.rating)
    .orderBy(webVitalsMetrics.name, webVitalsMetrics.rating);

  // Total count
  const [totalRow] = await db
    .select({ total: count() })
    .from(webVitalsMetrics)
    .where(where);

  return success({
    stats,
    ratingDistribution: ratingDist,
    total: Number(totalRow?.total || 0),
    period,
  });
});

// ─── POST ──────────────────────────────────────────────────

export const POST = apiHandler(async (request: NextRequest) => {
  const body: {
    name?: string;
    value?: number;
    rating?: string;
    url?: string;
    userAgent?: string;
  } = await request.json().catch(() => ({}));

  if (!body.name || typeof body.value !== 'number' || !body.rating) {
    // Silently ignore malformed payloads — esto es analytics no crítico
    return success({ ok: true });
  }

  // Intentar asociar a médico logueado (no crítico si falla)
  let medicoId: string | undefined;
  try {
    const session = await auth();
    medicoId = session?.user?.medicoId ?? undefined;
  } catch {
    // Si no hay sesión, se guarda sin medicoId
  }

  await db.insert(webVitalsMetrics).values({
    name: body.name,
    value: String(body.value),
    rating: body.rating,
    url: body.url ?? null,
    userAgent: body.userAgent ?? null,
    medicoId: medicoId ?? null,
    createdAt: new Date(),
  });

  return success({ ok: true });
});
