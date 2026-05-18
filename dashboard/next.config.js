/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  output: 'standalone',
  // Variables de entorno que expone al cliente
  env: {
    NEXT_PUBLIC_APP_NAME: 'Consultorio Médico',
    NEXT_PUBLIC_APP_VERSION: '0.1.0',
  },
  // ─── Headers de seguridad (capa 2: build-time) ─────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
