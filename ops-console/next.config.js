/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['postgres'],
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
}

let config = nextConfig

try {
  const { withSentryConfig } = require('@sentry/nextjs')
  config = withSentryConfig(config, {
    silent: !process.env.CI,
    sourcemaps: {
      disable: true,
    },
    widenClientFileUpload: false,
    tunnelRoute: '/monitoring',
  })
} catch {
}

module.exports = config
