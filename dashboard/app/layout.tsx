import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { PWARegister } from '@/components/pwa-register';
import { TenantTheme } from '@/components/tenant-theme';
import { TenantProvider } from '@/components/tenant-provider';
import { ScrollToTopButton } from '@/components/ui/scroll-to-top';
import { WebVitals } from '@/components/web-vitals';
import { validateN8nConfig } from '@/lib/n8n-sync';

// Fail-fast validation of n8n config at startup
validateN8nConfig();

const inter = Inter({ subsets: ['latin'] });

const tenantName = process.env.NEXT_PUBLIC_TENANT_NAME || 'AiCoreMed';
const themeColor = process.env.NEXT_PUBLIC_TENANT_PRIMARY || '#2563eb';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://med.aicorebots.com'),
  title: {
    default: `${tenantName} | Dashboard`,
    template: `%s | ${tenantName}`,
  },
  description: 'Sistema de gestión para consultorios médicos con IA',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    siteName: tenantName,
    title: `${tenantName} | Dashboard`,
    description: 'Sistema de gestión para consultorios médicos con IA',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${tenantName} | Dashboard`,
    description: 'Sistema de gestión para consultorios médicos con IA',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.svg',
  },
  appleWebApp: {
    capable: true,
    title: tenantName,
    statusBarStyle: 'black-translucent',
    startupImage: {
      url: '/icons/icon-512x512.png',
      media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
    },
  },
  formatDetection: {
    telephone: true,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  themeColor: themeColor,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Service Worker registration handled in client component */}
        <meta name="application-name" content={tenantName} />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://med.aicorebots.com" />
        <link rel="dns-prefetch" href="https://api.mercadopago.com" />
        <TenantProvider />
      </head>
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:ring-2 focus:ring-ring focus:rounded-lg focus:outline-none"
        >
          Saltar al contenido principal
        </a>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <PWARegister />
        <TenantTheme />
        <ScrollToTopButton />
        <WebVitals />
      </body>
    </html>
  );
}
