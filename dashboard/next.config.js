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
};

module.exports = nextConfig;
