import { db } from '@/lib/db';
import { pushSubscriptions } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import webPush from 'web-push';

// ─── Configurar VAPID ────────────────────────────────────────
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const contactEmail = process.env.VAPID_CONTACT_EMAIL || 'mailto:notificaciones@aicoremed.com';

if (publicKey && privateKey) {
  webPush.setVapidDetails(contactEmail, publicKey, privateKey);
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface SendPushOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  id?: string;
  tipo?: string;
}

export const pushService = {
  /**
   * Guardar o actualizar una suscripción push (usuario o paciente)
   */
  async subscribe(
    subscription: PushSubscriptionData,
    userAgent?: string,
    options?: { usuarioId?: string; pacienteId?: string; tenantId?: string },
  ) {
    if (!options?.usuarioId && !options?.pacienteId) {
      throw new Error('Debe proporcionar usuarioId o pacienteId');
    }

    const existente = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existente.length > 0) {
      // Reactivar si estaba inactiva
      await db
        .update(pushSubscriptions)
        .set({
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
          userAgent: userAgent || null,
          activa: true,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existente[0].id));
      return { success: true, updated: true };
    }

    await db.insert(pushSubscriptions).values({
      usuarioId: options.usuarioId || null,
      pacienteId: options.pacienteId || null,
      endpoint: subscription.endpoint,
      auth: subscription.keys.auth,
      p256dh: subscription.keys.p256dh,
      userAgent: userAgent || null,
      tenantId: options.tenantId || undefined,
    });

    return { success: true, updated: false };
  },

  /**
   * Desuscribir (soft delete / marcar inactiva)
   */
  async unsubscribe(endpoint: string, options?: { usuarioId?: string; pacienteId?: string }) {
    const conditions = [eq(pushSubscriptions.endpoint, endpoint)];
    if (options?.usuarioId) conditions.push(eq(pushSubscriptions.usuarioId, options.usuarioId));
    if (options?.pacienteId) conditions.push(eq(pushSubscriptions.pacienteId, options.pacienteId));

    await db
      .update(pushSubscriptions)
      .set({ activa: false, updatedAt: new Date() })
      .where(and(...conditions));
    return { success: true };
  },

  /**
   * Desuscribir todas las suscripciones de un usuario o paciente
   */
  async unsubscribeAll(options: { usuarioId?: string; pacienteId?: string }) {
    if (!options?.usuarioId && !options?.pacienteId) {
      throw new Error('Debe proporcionar usuarioId o pacienteId');
    }
    const conditions = [];
    if (options.usuarioId) conditions.push(eq(pushSubscriptions.usuarioId, options.usuarioId));
    if (options.pacienteId) conditions.push(eq(pushSubscriptions.pacienteId, options.pacienteId));

    await db
      .update(pushSubscriptions)
      .set({ activa: false, updatedAt: new Date() })
      .where(and(...conditions));
    return { success: true };
  },

  /**
   * Eliminar una suscripción expirada (endpoint ya no válido)
   */
  async eliminarEndpoint(endpoint: string) {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
    return { success: true };
  },

  /**
   * Obtener suscripciones activas de un usuario o paciente
   */
  async getSubscriptions(options: { usuarioId?: string; pacienteId?: string }) {
    if (!options?.usuarioId && !options?.pacienteId) {
      throw new Error('Debe proporcionar usuarioId o pacienteId');
    }
    const conditions = [eq(pushSubscriptions.activa, true)];
    if (options.usuarioId) conditions.push(eq(pushSubscriptions.usuarioId, options.usuarioId));
    if (options.pacienteId) conditions.push(eq(pushSubscriptions.pacienteId, options.pacienteId));

    return db
      .select()
      .from(pushSubscriptions)
      .where(and(...conditions));
  },

  /**
   * Enviar push a todas las suscripciones activas de un usuario o paciente
   */
  async sendToUser(
    options: { usuarioId?: string; pacienteId?: string },
    payload: SendPushOptions,
  ) {
    const subs = await this.getSubscriptions(options);
    if (subs.length === 0) return { sent: 0, failed: 0 };

    const results = await Promise.allSettled(
      subs.map((sub) => this._enviar(sub, payload)),
    );

    // Limpiar suscripciones expiradas
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        const error = result.reason as Error;
        if (
          error.message?.includes('410') || // Gone (expired)
          error.message?.includes('404') || // Not found
          error.message?.includes('unsubscribed')
        ) {
          await this.eliminarEndpoint(subs[i].endpoint);
        }
      }
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { sent, failed, total: subs.length };
  },

  /**
   * Enviar push a una suscripción específica
   */
  async _enviar(sub: typeof pushSubscriptions.$inferSelect, payload: SendPushOptions) {
    const subscription: PushSubscriptionData = {
      endpoint: sub.endpoint,
      keys: {
        auth: sub.auth,
        p256dh: sub.p256dh,
      },
    };

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-96x96.png',
      tag: payload.tag || `aicoremed-${Date.now()}`,
      url: payload.url || '/',
      id: payload.id || null,
      tipo: payload.tipo || 'sistema',
    });

    try {
      await webPush.sendNotification(subscription, pushPayload, {
        TTL: 86400, // 24 horas
      });
    } catch (error: unknown) {
      const wpError = error as { statusCode?: number; message?: string };
      if (wpError.statusCode === 410 || wpError.statusCode === 404) {
        // Endpoint expirado, lo limpiamos
        await this.eliminarEndpoint(sub.endpoint);
      }
      throw error;
    }
  },

  /**
   * Verificar si web-push tiene VAPID configurado
   */
  isConfigured(): boolean {
    return !!(publicKey && privateKey);
  },

  /**
   * Obtener la VAPID public key para el frontend
   */
  getPublicKey(): string {
    return publicKey;
  },
};
