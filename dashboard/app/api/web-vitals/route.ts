import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { webVitalsMetrics } from '@/drizzle/schema';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { and, gte, desc, sql, count, avg, min, max, lte, lt, like, not, isNull, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// ─── Helpers ─────────────────────────────────────────────────

function getPeriodRange(period: string, now: Date = new Date()): { since: Date | undefined; until: Date | undefined } {
  if (period === '24h') return { since: new Date(now.getTime() - 24 * 60 * 60 * 1000), until: now };
  if (period === '7d') return { since: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), until: now };
  if (period === '30d') return { since: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), until: now };
  return { since: undefined, until: now };
}

function getPreviousPeriodRange(period: string, now: Date = new Date()): { since: Date; until: Date } {
  const duration = period === '24h' ? 24 * 60 * 60 * 1000
    : period === '7d' ? 7 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
  return {
    since: new Date(now.getTime() - 2 * duration),
    until: new Date(now.getTime() - duration),
  };
}

function getSectionCondition(section: string) {
  if (section === 'dashboard') return like(webVitalsMetrics.url, '/dashboard/%');
  if (section === 'portal') return like(webVitalsMetrics.url, '/portal/%');
  if (section === 'landing') return or(
    isNull(webVitalsMetrics.url),
    and(
      not(like(webVitalsMetrics.url, '/dashboard/%')),
      not(like(webVitalsMetrics.url, '/portal/%')),
    ),
  );
  return undefined;
}

function buildWhere(since?: Date, until?: Date, section?: string) {
  const conds: any[] = [];
  if (since) conds.push(gte(webVitalsMetrics.createdAt, since));
  if (until) conds.push(lt(webVitalsMetrics.createdAt, until));
  if (section && section !== 'all') {
    const sectionCond = getSectionCondition(section);
    if (sectionCond) conds.push(sectionCond);
  }
  return conds.length > 0 ? and(...conds) : undefined;
}

function classifyDevice(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk|android(?!.*mobile)/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) return 'mobile';
  return 'desktop';
}

const METRIC_ORDER = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'];
const METRIC_LABELS: Record<string, string> = {
  LCP: 'Largest Contentful Paint',
  INP: 'Interaction to Next Paint',
  CLS: 'Cumulative Layout Shift',
  FCP: 'First Contentful Paint',
  TTFB: 'Time to First Byte',
};

// ─── GET ───────────────────────────────────────────────────

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    fail('No autorizado', 403);
  }

  const { searchParams } = request.nextUrl;
  const period = searchParams.get('period') || '24h';
  const view = searchParams.get('view') || 'stats';
  const section = searchParams.get('section') || 'all';

  const now = new Date();
  const { since, until } = getPeriodRange(period, now);
  const where = buildWhere(since, until, section);

  // ── timeline ── data agrupada por hora para línea de tendencia
  if (view === 'timeline') {
    const bucket = period === '24h' ? 'hour' : 'day';
    const truncFn = bucket === 'hour'
      ? sql`date_trunc('hour', ${webVitalsMetrics.createdAt})`
      : sql`date_trunc('day', ${webVitalsMetrics.createdAt})`;

    const raw = await db
      .select({
        bucket: sql<string>`${truncFn}::text`,
        name: webVitalsMetrics.name,
        avgValue: avg(sql<string>`${webVitalsMetrics.value}::numeric`),
        count: count(),
      })
      .from(webVitalsMetrics)
      .where(where)
      .groupBy(sql`1, ${webVitalsMetrics.name}`)
      .orderBy(sql`1`, webVitalsMetrics.name);

    const data = raw.map((r) => ({
      bucket: r.bucket,
      name: r.name,
      avgValue: Number(r.avgValue),
      count: Number(r.count),
    }));

    return success({ data, bucket, period });
  }

  // ── percentiles ── P50, P75, P95, P99
  if (view === 'percentiles') {
    const percConds: any[] = [];
    if (since) percConds.push(sql`created_at >= ${since}`);
    if (section && section !== 'all') {
      if (section === 'dashboard') percConds.push(sql`url LIKE '/dashboard/%'`);
      else if (section === 'portal') percConds.push(sql`url LIKE '/portal/%'`);
      else if (section === 'landing') percConds.push(sql`(url IS NULL OR (url NOT LIKE '/dashboard/%' AND url NOT LIKE '/portal/%'))`);
    }
    const percWhere = percConds.length > 0
      ? sql`WHERE ${sql.join(percConds, sql` AND `)}`
      : sql``;

    const raw = await db.execute(sql`
      SELECT
        name,
        percentile_cont(0.50) WITHIN GROUP (ORDER BY value::numeric) AS p50,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY value::numeric) AS p75,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY value::numeric) AS p95,
        percentile_cont(0.99) WITHIN GROUP (ORDER BY value::numeric) AS p99,
        COUNT(*)::int AS count
      FROM web_vitals_metrics
      ${percWhere}
      GROUP BY name
      ORDER BY name
    `);

    const data = ((raw as any).rows || []).map((r: any) => ({
      name: r.name,
      p50: Number(r.p50),
      p75: Number(r.p75),
      p95: Number(r.p95),
      p99: Number(r.p99),
      count: Number(r.count),
    }));

    return success({ data, period });
  }

  // ── comparison ── período actual vs anterior
  if (view === 'comparison') {
    const { since: prevSince, until: prevUntil } = getPreviousPeriodRange(period, now);
    const currentWhere = where;
    const prevWhere = buildWhere(prevSince, prevUntil);

    const currentRaw = await db
      .select({
        name: webVitalsMetrics.name,
        avgValue: avg(sql<string>`${webVitalsMetrics.value}::numeric`),
        count: count(),
      })
      .from(webVitalsMetrics)
      .where(currentWhere)
      .groupBy(webVitalsMetrics.name);

    const prevRaw = await db
      .select({
        name: webVitalsMetrics.name,
        avgValue: avg(sql<string>`${webVitalsMetrics.value}::numeric`),
        count: count(),
      })
      .from(webVitalsMetrics)
      .where(prevWhere)
      .groupBy(webVitalsMetrics.name);

    const prevMap = new Map(prevRaw.map((r) => [r.name, { avgValue: Number(r.avgValue), count: Number(r.count) }]));

    const data = currentRaw.map((r) => {
      const currentAvg = Number(r.avgValue);
      const prev = prevMap.get(r.name);
      const prevAvg = prev?.avgValue ?? null;
      const delta = prevAvg && prevAvg !== 0 ? ((currentAvg - prevAvg) / prevAvg) * 100 : null;
      return {
        name: r.name,
        currentAvg,
        currentCount: Number(r.count),
        prevAvg,
        prevCount: prev?.count ?? 0,
        deltaPercent: delta !== null ? Math.round(delta * 10) / 10 : null,
        improved: delta !== null ? (r.name === 'CLS' ? delta < 0 : delta < 0) : null,
      };
    });

    return success({ data, period, currentRange: { since, until: now }, prevRange: { since: prevSince, until: prevUntil } });
  }

  // ── device ── clasificación por dispositivo
  if (view === 'device') {
    const raw = await db
      .select({
        name: webVitalsMetrics.name,
        userAgent: webVitalsMetrics.userAgent,
        avgValue: avg(sql<string>`${webVitalsMetrics.value}::numeric`),
        count: count(),
      })
      .from(webVitalsMetrics)
      .where(where)
      .groupBy(webVitalsMetrics.name, webVitalsMetrics.userAgent)
      .orderBy(webVitalsMetrics.name);

    // Clasificar en JS
    const deviceMap = new Map<string, Map<string, { sum: number; count: number }>>();

    for (const r of raw) {
      const device = classifyDevice(r.userAgent);
      if (!deviceMap.has(r.name)) deviceMap.set(r.name, new Map());
      const metricDevices = deviceMap.get(r.name)!;
      if (!metricDevices.has(device)) metricDevices.set(device, { sum: 0, count: 0 });
      const entry = metricDevices.get(device)!;
      entry.sum += Number(r.avgValue) * Number(r.count);
      entry.count += Number(r.count);
    }

    const data: { name: string; device: string; avgValue: number; count: number }[] = [];
    for (const [name, devices] of deviceMap) {
      for (const [device, vals] of devices) {
        data.push({
          name,
          device,
          avgValue: vals.count > 0 ? vals.sum / vals.count : 0,
          count: vals.count,
        });
      }
    }

    return success({ data, period });
  }

  // ── heatmap ── por hora del día × métrica
  if (view === 'heatmap') {
    const raw = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${webVitalsMetrics.createdAt})::int`,
        name: webVitalsMetrics.name,
        avgValue: avg(sql<string>`${webVitalsMetrics.value}::numeric`),
        count: count(),
      })
      .from(webVitalsMetrics)
      .where(where)
      .groupBy(sql`EXTRACT(HOUR FROM ${webVitalsMetrics.createdAt})`, webVitalsMetrics.name)
      .orderBy(sql`EXTRACT(HOUR FROM ${webVitalsMetrics.createdAt})`, webVitalsMetrics.name);

    const data = raw.map((r) => ({
      hour: Number(r.hour),
      name: r.name,
      avgValue: Number(r.avgValue),
      count: Number(r.count),
    }));

    return success({ data, period });
  }

  // ── by-url (preexistente) ──
  if (view === 'by-url') {
    const rawRows = await db
      .select({
        url: webVitalsMetrics.url,
        metricName: webVitalsMetrics.name,
        avgValue: avg(sql<string>`${webVitalsMetrics.value}::numeric`),
        minValue: min(sql<string>`${webVitalsMetrics.value}::numeric`),
        maxValue: max(sql<string>`${webVitalsMetrics.value}::numeric`),
        count: count(),
      })
      .from(webVitalsMetrics)
      .where(where)
      .groupBy(webVitalsMetrics.url, webVitalsMetrics.name)
      .orderBy(webVitalsMetrics.url, webVitalsMetrics.name);

    const rows = rawRows.map((r) => ({
      ...r,
      avgValue: Number(r.avgValue),
      minValue: Number(r.minValue),
      maxValue: Number(r.maxValue),
      count: Number(r.count),
    }));

    return success({ data: rows, period });
  }

  // ── recent (preexistente) ──
  if (view === 'recent') {
    const rows = await db
      .select({
        id: webVitalsMetrics.id,
        name: webVitalsMetrics.name,
        value: webVitalsMetrics.value,
        rating: webVitalsMetrics.rating,
        url: webVitalsMetrics.url,
        userAgent: webVitalsMetrics.userAgent,
        createdAt: webVitalsMetrics.createdAt,
      })
      .from(webVitalsMetrics)
      .where(where)
      .orderBy(desc(webVitalsMetrics.createdAt))
      .limit(100);

    return success({ data: rows, period });
  }

  // ── stats (default) ── promedios + distribución de ratings
  const rawStats = await db
    .select({
      name: webVitalsMetrics.name,
      avgValue: avg(sql<string>`${webVitalsMetrics.value}::numeric`),
      minValue: min(sql<string>`${webVitalsMetrics.value}::numeric`),
      maxValue: max(sql<string>`${webVitalsMetrics.value}::numeric`),
      count: count(),
    })
    .from(webVitalsMetrics)
    .where(where)
    .groupBy(webVitalsMetrics.name)
    .orderBy(webVitalsMetrics.name);

  const stats = rawStats.map((s) => ({
    name: s.name,
    avgValue: Number(s.avgValue),
    minValue: Number(s.minValue),
    maxValue: Number(s.maxValue),
    count: Number(s.count),
  }));

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

  const [totalRow] = await db
    .select({ total: count() })
    .from(webVitalsMetrics)
    .where(where);

  return success({
    stats,
    ratingDistribution: ratingDist.map((r) => ({ ...r, count: Number(r.count) })),
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
    return success({ ok: true });
  }

  let medicoId: string | undefined;
  try {
    const session = await auth();
    medicoId = session?.user?.medicoId ?? undefined;
  } catch { }

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
