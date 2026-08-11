'use client';

import { useEffect } from 'react';
import { useSidebar } from '@/components/layout/sidebar-context';
import { useLayoutConfig } from '@/lib/layout-config';

/**
 *
 * @param root0
 * @param root0.children
 */
export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { config } = useLayoutConfig();
  const { setCollapsed } = useSidebar();

  useEffect(() => {
    setCollapsed(config.sidebarCollapsed);
  }, [config.sidebarCollapsed, setCollapsed]);

  return <>{children}</>;
}
