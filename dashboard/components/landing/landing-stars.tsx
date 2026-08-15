'use client';

import { Star } from 'lucide-react';
import { motion } from 'motion/react';

/**
 *
 * @param root0
 * @param root0.delay
 */
export function LandingStars({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex gap-0.5 mb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          // eslint-disable-next-line react/no-array-index-key -- estrellas decorativas estaticas
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: delay + i * 0.06, type: 'spring', duration: 0.4, bounce: 0.3 }}
        >
          <Star className="h-3.5 w-3.5 fill-emerald-200/80 text-emerald-400/60" />
        </motion.div>
      ))}
    </div>
  );
}
