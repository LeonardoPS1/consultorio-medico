import { eq, and, sql, desc, count } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { webhookLogs, webhookConfigs } from '@/drizzle/operations';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, ok, fail } from '@/lib/api-handler';
import { getMensajes } from '@/lib/data-store';
import { db } from '@/lib/db';

// GET /api/webhooks/logs
//   ?configId=&limit=&offset=  → deliveries de webhooks salientes (tab Integraciones)
//   ?estado=&search=&limit=&offset= → historial de mensajes WhatsApp (página /dashboard/webhooks)
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) fail('Tenant no encontrado', 400);
  const { searchParams } = new URL(request.url);
  const configId = searchParams.get('configId') || undefined;

  // ─── Branch 1: deliveries de webhooks salientes (configId) ───
  if (configId) {
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const offset = Number(searchParams.get('offset')) || 0;

    const configsSubquery = db
      .select({ id: webhookConfigs.id })
      .from(webhookConfigs)
      .where(
        and(
          eq(webhookConfigs.tenantId, tenantId),
          sql`${webhookConfigs.deletedAt} IS NULL`,
          eq(webhookConfigs.id, configId),
        ),
      );

    const whereConfigs = and(sql`${webhookLogs.configId} IN (${configsSubquery})`);

    const [{ total }] = await db.select({ total: count() }).from(webhookLogs).where(whereConfigs);

    const statusCounts = await db
      .select({ status: webhookLogs.statusCode, count: count() })
      .from(webhookLogs)
      .where(whereConfigs)
      .groupBy(webhookLogs.statusCode);

    const porEstado: Record<string, number> = {};
    for (const row of statusCounts) {
      const status = row.status?.toString() || 'unknown';
      porEstado[status] = Number(row.count);
    }

    const logs = await db
      .select()
      .from(webhookLogs)
      .where(whereConfigs)
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return ok({ data: logs, total: Number(total), porEstado });
  }

  // ─── Branch 2: historial de mensajes WhatsApp (dashboard) ───
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Number(searchParams.get('offset')) || 0;
  const estado = searchParams.get('estado') || undefined;
  const search = searchParams.get('search') || undefined;

  const result = await getMensajes({ twilioStatus: estado, search, limit, offset });

  return ok({
    data: result.mensajes,
    total: result.total,
    porEstado: result.porEstado,
  });
});
