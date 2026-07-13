/** @type {import('next').NextConfig} */

const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

const nextConfig = withBundleAnalyzer({
  // Skip ESLint durante el build (corremos lint por separado con pnpm run lint)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Aumenta timeout de generación de páginas estáticas (default 60s)
  // Previene timeout en /_not-found durante build en VPS con recursos limitados
  staticPageGenerationTimeout: 180,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-avatar',
    ],
  },
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  // Solo usar standalone output en Docker/Linux: pnpm symlinks causan EPERM en Windows
  output: process.env.DISABLE_STANDALONE === 'true' ? undefined : 'standalone',
  // Variables de entorno que expone al cliente
  env: {
    NEXT_PUBLIC_APP_NAME: 'AiCoreMed',
    NEXT_PUBLIC_APP_VERSION: '1.18.0',
    NEXT_PUBLIC_REPO_URL: 'https://github.com/LeonardoPS1/consultorio-medico',
    NEXT_PUBLIC_TENANT_NAME: process.env.NEXT_PUBLIC_TENANT_NAME || 'Consultorio',
    NEXT_PUBLIC_TENANT_PRIMARY: process.env.NEXT_PUBLIC_TENANT_PRIMARY || '#2563eb',
    NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
  },
  // ─── Headers de Service Worker ─────────────────────────
  // Seguridad vía middleware.ts (todo centralizado allá)
  async headers() {
    return [
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
