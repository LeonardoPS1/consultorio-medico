'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';

const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: { duration: 0.18, ease: [0.65, 0, 0.35, 1] as [number, number, number, number] },
  },
} as const;

/**
 * PortalContent — Wrapper con fade + slide en cada navegación.
 * Usa AnimatePresence mode="popLayout" para que la página de salida
 * no bloquee la entrada (fix del bug que requería F5).
 */
export function PortalContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
