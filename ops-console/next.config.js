/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['postgres'],
  outputFileTracingRoot: '/app/D/OPENCODE/consultorio-medico',
  turbopack: {
    root: '/app/D/OPENCODE/consultorio-medico',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
}

module.exports = nextConfig
