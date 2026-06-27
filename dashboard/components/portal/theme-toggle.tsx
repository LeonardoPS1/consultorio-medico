'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function PortalThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-8" />; // placeholder
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative h-8 w-8 rounded-xl flex items-center justify-center
        text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-all duration-200 active:scale-90"
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <Sun className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <Moon className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
