'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Variant de fade-in + slide-up para elementos individuales */
export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/** Variant simple de fade-in */
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25 },
  },
};

/**
 * Wrapper de página con fade-in y stagger opcional.
 * Reemplaza al fragment raíz de las páginas del dashboard.
 */
export function PageAnimation({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.04,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Wrapper para secciones/cards individuales dentro de PageAnimation.
 * Usar con variants={fadeInUp} para efecto escalonado.
 */

export function AnimSection({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeInUp} className={className}>
      {children}
    </motion.div>
  );
}
