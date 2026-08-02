/**
 * Status Layout — Maneja el tema y previene flicker (mismo patrón que el portal).
 */
import Script from 'next/script';
import { ClientThemeProvider } from '@/components/client-theme-provider';

export default function StatusLayout({ children }: { children: React.ReactNode }) {
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
