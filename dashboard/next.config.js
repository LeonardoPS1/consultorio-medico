/** @type {import('next').NextConfig} */

const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

const nextConfig = withBundleAnalyzer({
  // Aumenta timeout de generación de páginas estáticas (default 60s)
  // Previene timeout en /_not-found durante build en VPS con recursos limitados
  staticPageGenerationTimeout: 180,
  images: {
    domains: ['localhost'],
  },
  // Solo usar standalone output en Docker/Linux: pnpm symlinks causan EPERM en Windows
  output: process.env.DISABLE_STANDALONE === 'true' ? undefined : 'standalone',
  // Variables de entorno que expone al cliente
  env: {
    NEXT_PUBLIC_APP_NAME: 'AiCoreMed',
    NEXT_PUBLIC_APP_VERSION: '0.2.0',
    NEXT_PUBLIC_TENANT_NAME: process.env.NEXT_PUBLIC_TENANT_NAME || 'Consultorio',
    NEXT_PUBLIC_TENANT_PRIMARY: process.env.NEXT_PUBLIC_TENANT_PRIMARY || '#2563eb',
    NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
  },
  // ─── Headers de seguridad + Service Worker ─────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // camera/microphone permitidos para videollamadas con LiveKit
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          {
            key: 'Content-Security-Policy',
            // unsafe-eval solo en desarrollo (React Refresh/HMR lo requiere)
            value: process.env.NODE_ENV === 'development'
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' wss://livekit.aicorebots.com https://livekit.aicorebots.com https://api.mercadopago.com https://api.twilio.com https://api.whatsapp.com https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self'; media-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; report-uri /api/csp-report"
              : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' wss://livekit.aicorebots.com https://livekit.aicorebots.com https://api.mercadopago.com https://api.twilio.com https://api.whatsapp.com https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self'; media-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; report-uri /api/csp-report",
          },
        ],
      },
      // Cache service worker para que siempre esté fresco
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
});

module.exports = nextConfig;
