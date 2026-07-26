const dsn = process.env.GLITCHTIP_DSN || process.env.SENTRY_DSN

if (dsn) {
  try {
    const Sentry = require('@sentry/nextjs')
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.OPS_VERSION || '1.0.0',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    })
  } catch {
    console.warn('[sentry] @sentry/nextjs no disponible, omitiendo configuración')
  }
}
