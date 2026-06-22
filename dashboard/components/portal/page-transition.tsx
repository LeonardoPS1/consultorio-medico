'use client';

import { motion } from 'framer-motion';
import type { Easing } from 'framer-motion';

const easeOut: Easing = [0.16, 1, 0.3, 1];

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.25,
  ease: easeOut,
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

export const fadeSlideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: easeOut },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};
