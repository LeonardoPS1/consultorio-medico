/**
 * Portal Layout — Permite que el ThemeProvider global maneje el modo.
 * Ya no forza modo claro, el portal se adapta al tema del sistema/usuario.
 * Se aplica un reset mínimo para evitar flickers.
 */
import Script from 'next/script';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      {children}
    </>
  );
}
