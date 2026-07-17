import type { Event } from '@sentry/nextjs';
import { getRequestContext } from '@/lib/request-context';
import { safeLog, safeWarn, safeError } from '@/lib/logger';

const TAG_PREFIX = 'aicoremed';

interface CaptureOptions {
  tags?: Record<string, string>;
  userId?: string;
  level?: 'info' | 'warning' | 'error' | 'fatal';
}

let enabled = false;

export function initGlitchtip(): void {
  const dsn = process.env.GLITCHTIP_DSN;
  if (!dsn) {
    safeLog('[GlitchTip] GLITCHTIP_DSN no configurado — deshabilitado');
    return;
  }

  try {
    const Sentry = require('@sentry/nextjs');

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      tracesSampleRate: parseFloat(process.env.GLITCHTIP_TRACES_SAMPLE_RATE || '0.1'),
      enabled: process.env.GLITCHTIP_ENABLED !== 'false',
      integrations: [
        Sentry.requestDataIntegration() as never,
        Sentry.httpClientIntegration() as never,
      ],
      beforeSend(event: Event) {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSentry(): any {
  try {
    return require('@sentry/nextjs');
  } catch {
    return null;
  }
}

export function captureError(error: unknown, options?: CaptureOptions): void {
  if (!enabled) {
    safeError('[GlitchTip] Error no reportado (GlitchTip deshabilitado):', error instanceof Error ? error.message : error);
    return;
  }

  try {
    const Sentry = getSentry();
    if (!Sentry) return;

    const context = getRequestContext();
    const tags: Record<string, string> = {
      [TAG_PREFIX]: 'true',
      ...(options?.tags ?? {}),
    };
    if (context?.tenantId) tags.tenantId = context.tenantId;
    if (context?.requestId) tags.requestId = context.requestId;

    Sentry.withScope((scope: { setTags: (t: Record<string, string>) => void; setLevel: (l: string) => void; setUser: (u: { id: string }) => void }) => {
      scope.setTags(tags);
      if (options?.level) scope.setLevel(options.level);
      if (options?.userId) scope.setUser({ id: options.userId });
      else if (context?.userId) scope.setUser({ id: context.userId });

      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error), options?.level ?? 'error');
      }
    });
  } catch (e) {
    safeWarn('[GlitchTip] Error al reportar:', e instanceof Error ? e.message : e);
  }
}

export function captureMessage(message: string, options?: CaptureOptions): void {
  captureError(new Error(message), options);
}
