'use client';

import { motion } from 'motion/react';
import { Star } from 'lucide-react';

export function LandingStars({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex gap-0.5 mb-4">
      {[...Array(5)].map((_, i) => (
        <motion.div
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
