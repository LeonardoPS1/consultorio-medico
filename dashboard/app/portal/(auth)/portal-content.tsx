'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';

/**
 * PortalContent — Wrapper con fade-in en cada navegación.
 *
 * 🔥 FIX: Se quitó PageTransition (que tenía AnimatePresence mode="wait").
 * El mode="wait" bloqueaba el montaje de la página entrante si la salida
 * no completaba, obligando a presionar F5 para ver el contenido.
 *
 * Ahora usamos AnimatePresence mode="popLayout" + inline motion.div
 * para que ambas animaciones (salida/entrada) no se bloqueen mutuamente.
 * key={pathname} garantiza re-montaje en cada ruta.
 */
export function PortalContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout">
      <div
        key={pathname}
        style={{
          animation: 'portalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* CSS keyframe definido en globals.css */}
        <style>{`
          @keyframes portalFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        {children}
      </div>
    </AnimatePresence>
  );
}
