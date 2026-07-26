const clientDsn =
  process.env.NEXT_PUBLIC_GLITCHTIP_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (clientDsn && typeof window !== 'undefined') {
  try {
    const Sentry = require('@sentry/nextjs')
    Sentry.init({
      dsn: clientDsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.NEXT_PUBLIC_OPS_VERSION || '1.0.0',
      tracesSampleRate: parseFloat(
        process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1',
      ),
    })
  } catch {
    /* sentry not available */
  }
}
