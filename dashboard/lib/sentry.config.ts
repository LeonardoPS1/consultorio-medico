/**
 * Configuración de Sentry para monitoreo de errores en producción.
 * 
 * Para activar:
 * 1. Crear proyecto en https://sentry.io
 * 2. Agregar SENTRY_DSN al .env:
 *    SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
 * 3. Instalar dependencias:
 *    pnpm add @sentry/nextjs
 * 4. Ejecutar wizard:
 *    npx @sentry/wizard -i nextjs
 * 
 * Documentación: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

// TODO: Descomentar cuando SENTRY_DSN esté configurado
// import * as Sentry from '@sentry/nextjs';
// 
// Sentry.init({
//   dsn: process.env.SENTRY_DSN,
//   tracesSampleRate: 0.1,            // 10% de requests
//   profilesSampleRate: 0.05,         // 5% de profiles
//   environment: process.env.NODE_ENV || 'development',
//   enabled: process.env.NODE_ENV === 'production',
//   beforeSend(event) {
//     // No enviar errores en desarrollo
//     if (process.env.NODE_ENV !== 'production') return null;
//     // Sanitizar datos sensibles
//     if (event.request?.cookies) delete event.request.cookies;
//     return event;
//   },
// });

// Configuración de Sentry en next.config.js:
//
// const { withSentryConfig } = require('@sentry/nextjs');
// 
// const sentryWebpackPluginOptions = {
//   silent: true,
//   org: process.env.SENTRY_ORG,
//   project: process.env.SENTRY_PROJECT,
//   authToken: process.env.SENTRY_AUTH_TOKEN,
// };
// 
// module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);

export const SENTRY_SETUP_DOCS = `
# Configuración de Sentry

1. Crear cuenta en https://sentry.io
2. Crear proyecto "consultorio-medico" (platform: Next.js)
3. Copiar DSN del proyecto
4. Agregar al .env:
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   SENTRY_ORG=tu-org
   SENTRY_PROJECT=consultorio-medico
   SENTRY_AUTH_TOKEN=sntrys_xxx
5. Instalar: pnpm add @sentry/nextjs
6. Descomentar código en este archivo
7. Actualizar next.config.js con withSentryConfig
`;
