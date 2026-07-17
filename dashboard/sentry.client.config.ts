import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN || process.env.GLITCHTIP_DSN;

if (dsn && process.env.GLITCHTIP_ENABLED !== 'false') {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.GLITCHTIP_TRACES_SAMPLE_RATE || '0.1'),
    integrations: [
      Sentry.replayIntegration(),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
