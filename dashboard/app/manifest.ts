import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const appName = process.env.NEXT_PUBLIC_TENANT_NAME || 'AiCoreMed';
  const themeColor = process.env.NEXT_PUBLIC_TENANT_PRIMARY || '#2563eb';

  return {
    name: appName,
    short_name: 'AiCoreMed',
    description: 'Sistema de gestión para consultorios médicos con IA',
    start_url: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#ffffff',
    theme_color: themeColor,
    orientation: 'portrait-primary',
    categories: ['medical', 'health', 'business'],
    lang: 'es-AR',
    icons: [
      {
        src: '/icons/icon-48x48.png',
        sizes: '48x48',
        type: 'image/png',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-192x192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
