'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/portal/page-transition';

export function PortalContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={pathname}>
        {children}
      </PageTransition>
    </AnimatePresence>
  );
}
