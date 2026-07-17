import * as Sentry from '@sentry/nextjs';

const dsn = process.env.GLITCHTIP_DSN;

if (dsn && process.env.GLITCHTIP_ENABLED !== 'false') {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    tracesSampleRate: parseFloat(process.env.GLITCHTIP_TRACES_SAMPLE_RATE || '0.1'),
    integrations: [
      Sentry.requestDataIntegration(),
      Sentry.httpClientIntegration(),
    ],
    beforeSend(event) {
      try {
        const { getRequestContext } = require('@/lib/request-context');
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
      } catch {
      }
      return event;
    },
  });
}
