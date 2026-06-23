'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './page-transition';

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 transition-colors duration-300">
      <AnimatePresence mode="wait">
        <PageTransition key={pathname}>
          {children}
        </PageTransition>
      </AnimatePresence>
    </div>
  );
}
