import { db } from '@/lib/db';
import { webhookConfigs, webhookLogs } from '@/drizzle/operations';
import { eq, and, sql } from 'drizzle-orm';
import { safeError, safeWarn } from '@/lib/logger';
import { entregar } from '@/lib/services/webhooks';

export async function emitirWebhook(evento: string, payload: object, tenantId: string) {
  try {
    const configs = await db
      .select({ id: webhookConfigs.id, url: webhookConfigs.url, secret: webhookConfigs.secret })
      .from(webhookConfigs)
      .where(
        and(
          eq(webhookConfigs.tenantId, tenantId),
          eq(webhookConfigs.evento, evento),
          eq(webhookConfigs.activo, true),
          sql`${webhookConfigs.deletedAt} IS NULL`,
        ),
      );

    if (configs.length === 0) return;

    await Promise.allSettled(
      configs.map(async (config) => {
        const result = await entregar(evento, payload, config);

        await db.insert(webhookLogs).values({
          configId: config.id,
          evento,
          payload: payload as Record<string, unknown>,
          url: config.url,
          statusCode: result.statusCode,
          respuesta: result.respuesta,
          duracionMs: result.duracionMs,
          intentos: result.intentos,
          error: result.error || null,
        });

        const nuevoEstado = result.error
          ? 'error'
          : result.statusCode >= 200 && result.statusCode < 300
            ? 'ok'
            : 'error';

        await db
          .update(webhookConfigs)
          .set({ ultimoEstado: nuevoEstado, updatedAt: new Date() })
          .where(eq(webhookConfigs.id, config.id));

        if (result.error) {
          safeWarn(`[Webhook] Falló entrega a ${config.url} (${evento}): ${result.error}`);
        }

        return result;
      }),
    );
  } catch (error) {
    safeError('[Webhook] Error en emitirWebhook:', error instanceof Error ? { message: error.message } : error);
  }
}
