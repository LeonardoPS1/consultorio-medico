'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { playNavigate } from '@/lib/sound';

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.18, ease: [0.65, 0, 0.35, 1] as [number, number, number, number] },
  },
} as const;

/**
 *
 * @param root0
 * @param root0.children
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      playNavigate();
      prevPathname.current = pathname;
    }
  }, [pathname]);

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

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
