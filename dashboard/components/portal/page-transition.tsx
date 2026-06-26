import type { Easing } from 'framer-motion';

const easeOut: Easing = [0.16, 1, 0.3, 1];

export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOut } },
};
