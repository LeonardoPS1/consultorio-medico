/**
 * Portal Layout — Maneja el tema y previene flicker.
 * Envuelve con ClientThemeProvider para reducir profundidad de providers globales.
 */
import Script from 'next/script';
import { ClientThemeProvider } from '@/components/client-theme-provider';
import './portal.css';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Prevenir flicker: preserva el tema actual del sistema sin forzarlo */}
      <Script
        id="portal-theme-guard"
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
