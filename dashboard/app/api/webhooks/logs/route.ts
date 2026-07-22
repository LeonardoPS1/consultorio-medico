import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { webhookLogs, webhookConfigs } from '@/drizzle/operations';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { apiHandler, ok, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';

// GET /api/webhooks/logs?configId=&limit=&offset=
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) fail('Tenant no encontrado', 400);
  const { searchParams } = new URL(request.url);
  const configId = searchParams.get('configId') || undefined;
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
  const offset = Number(searchParams.get('offset')) || 0;

  const configsSubquery = db
    .select({ id: webhookConfigs.id })
    .from(webhookConfigs)
    .where(
      and(
        eq(webhookConfigs.tenantId, tenantId),
        sql`${webhookConfigs.deletedAt} IS NULL`,
        configId ? eq(webhookConfigs.id, configId) : undefined,
      ),
    );

  const whereConfigs = and(
    sql`${webhookLogs.configId} IN (${configsSubquery})`,
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(webhookLogs)
    .where(whereConfigs);

  const logs = await db
    .select()
    .from(webhookLogs)
    .where(whereConfigs)
    .orderBy(desc(webhookLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return ok({ data: logs, total: Number(total) });
});
