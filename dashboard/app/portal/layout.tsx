/**
 * Portal Layout — Fuerza modo claro para evitar pantalla negra por tema oscuro.
 * Corre ANTES del ThemeProvider global para prevenir que el modo oscuro afecte al portal.
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Ojito: este script se ejectuta antes de que el theme script global
          prevenga que se aplique dark mode al portal. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Forzar modo claro en el portal
              document.documentElement.classList.remove('dark');
              document.documentElement.style.colorScheme = 'light';
              try { localStorage.removeItem('theme'); } catch(e) {}
            })();
          `,
        }}
      />
      <style>{`
        /* Forzar modo claro en todo el portal independientemente del tema global */
        body {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }

        .dark body, .dark & {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }

        /* Cualquier contenedor directo del portal */
        [class*="portal"] {
          background-color: #f8fafc;
        }
      `}</style>
      {children}
    </>
  );
}
