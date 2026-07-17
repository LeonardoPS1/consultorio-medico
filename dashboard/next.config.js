/** @type {import('next').NextConfig} */
const path = require('path');

const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

const nextConfig = withBundleAnalyzer({
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
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    formats: ['image/avif', 'image/webp'],
  },
  outputFileTracingRoot: path.join(__dirname, '..'),
  output: process.env.DISABLE_STANDALONE === 'true' ? undefined : 'standalone',
  env: {
    NEXT_PUBLIC_APP_NAME: 'AiCoreMed',
    NEXT_PUBLIC_APP_VERSION: '1.18.1',
    NEXT_PUBLIC_REPO_URL: 'https://github.com/LeonardoPS1/consultorio-medico',
    NEXT_PUBLIC_TENANT_NAME: process.env.NEXT_PUBLIC_TENANT_NAME || 'Consultorio',
    NEXT_PUBLIC_TENANT_PRIMARY: process.env.NEXT_PUBLIC_TENANT_PRIMARY || '#2563eb',
    NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
  },
  async headers() {
    return [
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

let config = nextConfig;

try {
  const { withSentryConfig } = require('@sentry/nextjs');
  config = withSentryConfig(config, {
    silent: !process.env.CI,
    sourcemaps: {
      disable: true,
    },
    widenClientFileUpload: false,
    tunnelRoute: '/monitoring',
  });
} catch {
}

module.exports = config;
