import { db } from '@/lib/db';
import { webhookConfigs, webhookLogs } from '@/drizzle/operations';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { notFound, fail } from '@/lib/api-handler';
import { safeError, safeWarn } from '@/lib/logger';
import { createHmac, randomBytes } from 'crypto';

export const EVENTOS_DISPONIBLES = [
  'turno.creado',
  'turno.actualizado',
  'turno.cancelado',
  'paciente.creado',
  'paciente.actualizado',
  'receta.creada',
  'derivacion.creada',
  'derivacion.actualizada',
  'pago.completado',
] as const;

export type EventoWebhook = (typeof EVENTOS_DISPONIBLES)[number];

function sign(payload: object, secret: string): string {
  const data = JSON.stringify(payload);
  return createHmac('sha256', secret).update(data).digest('hex');
}

async function entregar(
  evento: string,
  payload: object,
  config: { id: string; url: string; secret: string },
): Promise<{ statusCode: number; respuesta: string; duracionMs: number; intentos: number; error?: string }> {
  const maxIntentos = 3;
  const backoff = [1000, 2000, 4000];
  let lastError: string | undefined;
  let lastStatusCode = 0;
  let lastRespuesta = '';
  let totalDuracion = 0;

  for (let intento = 1; intento <= maxIntentos; intento++) {
    const inicio = Date.now();
    try {
      const body = JSON.stringify(payload);
      const signature = createHmac('sha256', config.secret).update(body).digest('hex');
      const timestamp = Date.now().toString();

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-Event': evento,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      const duracionMs = Date.now() - Number(inicio);
      const respuesta = await response.text().catch(() => '');

      if (response.ok) {
        return { statusCode: response.status, respuesta, duracionMs, intentos: intento };
      }

      lastError = `HTTP ${response.status}: ${respuesta.substring(0, 500)}`;
      lastStatusCode = response.status;
      lastRespuesta = respuesta;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Error de conexión';
    }

    if (intento < maxIntentos) {
      await new Promise((resolve) => setTimeout(resolve, backoff[intento - 1]));
    }
  }

  return {
    statusCode: lastStatusCode || 0,
    respuesta: lastRespuesta,
    duracionMs: totalDuracion,
    intentos: maxIntentos,
    error: lastError,
  };
}

export const webhooksService = {
  async list(tenantId: string) {
    return db
      .select()
      .from(webhookConfigs)
      .where(and(eq(webhookConfigs.tenantId, tenantId), sql`${webhookConfigs.deletedAt} IS NULL`))
      .orderBy(desc(webhookConfigs.createdAt));
  },

  async getById(id: string) {
    const [config] = await db
      .select()
      .from(webhookConfigs)
      .where(and(eq(webhookConfigs.id, id), sql`${webhookConfigs.deletedAt} IS NULL`))
      .limit(1);
    if (!config) notFound('Webhook no encontrado');
    return config;
  },

  async create(input: { evento: string; url: string; activo?: boolean; tenantId: string }) {
    const secret = randomBytes(32).toString('hex');
    const [nuevo] = await db
      .insert(webhookConfigs)
      .values({
        tenantId: input.tenantId,
        evento: input.evento,
        url: input.url,
        secret,
        activo: input.activo ?? true,
        ultimoEstado: 'pendiente',
      })
      .returning();
    return { ...nuevo, secret };
  },

  async update(id: string, input: { url?: string; evento?: string; activo?: boolean }) {
    const config = await this.getById(id);
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (input.url !== undefined) data.url = input.url;
    if (input.evento !== undefined) data.evento = input.evento;
    if (input.activo !== undefined) data.activo = input.activo;
    const [updated] = await db
      .update(webhookConfigs)
      .set(data)
      .where(eq(webhookConfigs.id, id))
      .returning();
    return updated;
  },

  async eliminar(id: string) {
    await this.getById(id);
    await db.update(webhookConfigs).set({ deletedAt: new Date() }).where(eq(webhookConfigs.id, id));
    return { success: true };
  },

  getEventosDisponibles() {
    return [...EVENTOS_DISPONIBLES];
  },

  async entregar(
    evento: string,
    payload: object,
    config: { id: string; url: string; secret: string },
  ) {
    return entregar(evento, payload, config);
  },
};

export { entregar };
