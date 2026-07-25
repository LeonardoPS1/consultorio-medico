/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['postgres'],
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
}

module.exports = nextConfig
