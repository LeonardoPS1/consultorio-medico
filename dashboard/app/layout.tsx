import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { PWARegister } from '@/components/pwa-register';
import { TenantTheme } from '@/components/tenant-theme';

const inter = Inter({ subsets: ['latin'] });

const tenantName = process.env.NEXT_PUBLIC_TENANT_NAME || 'AiCoreMed';
const themeColor = process.env.NEXT_PUBLIC_TENANT_PRIMARY || '#2563eb';

export const metadata: Metadata = {
  title: {
    default: `${tenantName} | Dashboard`,
    template: `%s | ${tenantName}`,
  },
  description: 'Sistema de gestión para consultorios médicos con IA',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/icon-192x192.png',
    shortcut: '/favicon.png',
  },
  appleWebApp: {
    capable: true,
    title: tenantName,
    statusBarStyle: 'default',
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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Service Worker registration handled in client component */}
        <meta name="application-name" content={tenantName} />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <PWARegister />
        <TenantTheme />
      </body>
    </html>
  );
}
