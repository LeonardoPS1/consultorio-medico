'use client';

import { useEffect } from 'react';
import type { LayoutVariant } from '@/lib/layout-config';
import { useLayoutConfig } from '@/lib/layout-config';

interface PageLayoutProps {
  variant: LayoutVariant;
  children: React.ReactNode;
}

export function PageLayout({ variant, children }: PageLayoutProps) {
  const { setVariant } = useLayoutConfig();

  useEffect(() => {
    setVariant(variant);
    return () => setVariant('default');
  }, [variant, setVariant]);

  return <>{children}</>;
}
