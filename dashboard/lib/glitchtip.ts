import type { ErrorEvent } from '@sentry/nextjs';
import type * as SentryTypes from '@sentry/nextjs';
import { safeLog, safeWarn, safeError } from '@/lib/logger';
import { getRequestContext } from '@/lib/request-context';

const TAG_PREFIX = 'aicoremed';
const TAG_SERVICIO = 'dashboard';

interface CaptureOptions {
  tags?: Record<string, string>;
  userId?: string;
  level?: 'info' | 'warning' | 'error' | 'fatal';
}

let enabled = false;
let sentryModule: typeof SentryTypes | null = null;

/**
 *
 */
export async function initGlitchtip(): Promise<void> {
  const dsn = process.env.GLITCHTIP_DSN;
  if (!dsn) {
    safeLog('[GlitchTip] GLITCHTIP_DSN no configurado — deshabilitado');
    return;
  }

  try {
    const Sentry = await import('@sentry/nextjs');
    sentryModule = Sentry;

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.NEXT_PUBLIC_APP_VERSION || '1.36.0',
      tracesSampleRate: parseFloat(process.env.GLITCHTIP_TRACES_SAMPLE_RATE || '0.1'),
      enabled: process.env.GLITCHTIP_ENABLED !== 'false',
      integrations: [
        Sentry.requestDataIntegration() as never,
        Sentry.httpClientIntegration() as never,
      ],
      beforeSend(event: ErrorEvent) {
        const context = getRequestContext();
        if (context) {
          event.tags = {
            ...event.tags,
            tenantId: context.tenantId,
            requestId: context.requestId,
          };
          if (context.userId) {
            event.user = { ...event.user, id: context.userId };
          }
        }
        return event;
      },
    });
    enabled = true;
    safeLog('[GlitchTip] Inicializado correctamente');
  } catch (e) {
    safeWarn('[GlitchTip] Error al inicializar:', e instanceof Error ? e.message : e);
  }
}

/**
 *
 * @param error
 * @param options
 */
export function captureError(error: unknown, options?: CaptureOptions): void {
  if (!enabled || !sentryModule) {
    safeError(
      '[GlitchTip] Error no reportado (GlitchTip deshabilitado):',
      error instanceof Error ? error.message : error,
    );
    return;
  }

  try {
    const Sentry = sentryModule;
    if (!Sentry) return;

    const context = getRequestContext();
    const tags: Record<string, string> = {
      [TAG_PREFIX]: 'true',
      servicio: TAG_SERVICIO,
      ...(options?.tags ?? {}),
    };
    if (context?.tenantId) tags.tenantId = context.tenantId;
    if (context?.requestId) tags.requestId = context.requestId;

    Sentry.withScope(
      (scope: SentryTypes.Scope) => {
        scope.setTags(tags);
        if (options?.level) scope.setLevel(options.level);
        if (options?.userId) scope.setUser({ id: options.userId });
        else if (context?.userId) scope.setUser({ id: context.userId });

        if (error instanceof Error) {
          Sentry.captureException(error);
        } else {
          Sentry.captureMessage(String(error), options?.level ?? 'error');
        }
      },
    );
  } catch (e) {
    safeWarn('[GlitchTip] Error al reportar:', e instanceof Error ? e.message : e);
  }
}

/**
 *
 * @param message
 * @param options
 */
export function captureMessage(message: string, options?: CaptureOptions): void {
  captureError(new Error(message), options);
}
