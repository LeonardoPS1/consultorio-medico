'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type AnimationVariant = 'fade-up' | 'fade-in' | 'scale-in';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: AnimationVariant;
  as?: 'div' | 'section';
}

const variants = {
  'fade-up': {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
  },
  'fade-in': {
    initial: { opacity: 0 } as const,
    whileInView: { opacity: 1 } as const,
  },
  'scale-in': {
    initial: { scale: 0.95, opacity: 0 },
    whileInView: { scale: 1, opacity: 1 },
  },
} as const;

export function AnimatedSection({
  children,
  className,
  delay = 0,
  variant = 'fade-up',
  as = 'div',
}: AnimatedSectionProps) {
  const v = variants[variant];

  const MotionTag = as === 'section' ? motion.section : motion.div;

  return (
    <MotionTag
      initial={v.initial}
      whileInView={v.whileInView}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
