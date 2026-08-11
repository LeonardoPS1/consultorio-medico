import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { ClientThemeProvider } from '@/components/client-theme-provider';

export const metadata: Metadata = {
  title: 'Estado del servicio · AiCoreMed',
  description: 'Página de estado público de la plataforma AiCoreMed. Monitoreo en tiempo real de Mensajería, Plataforma y Videoconsultas.',
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    siteName: 'AiCoreMed Status',
    title: 'Estado del servicio · AiCoreMed',
    description: 'Página de estado público de la plataforma AiCoreMed.',
  },
  twitter: {
    card: 'summary',
    title: 'Estado del servicio · AiCoreMed',
    description: 'Monitoreo en tiempo real de la plataforma AiCoreMed.',
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
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

/**
 * Status layout with theme guard and client theme provider
 * @param children - React children
 * @param children.children
 * @returns JSX.Element
 */
export default function StatusLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      {/* Prevenir flicker: aplica el tema guardado antes de la hidratación */}
      <Script
        id="status-theme-guard"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch(e) {}
            })();
          `,
        }}
      />
      <ClientThemeProvider>{children}</ClientThemeProvider>
    </>
  );
}