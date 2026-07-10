'use client';

import { useEffect } from 'react';
import { useLayoutConfig } from '@/lib/layout-config';
import { useSidebar } from '@/components/layout/sidebar-context';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { config } = useLayoutConfig();
  const { setCollapsed } = useSidebar();

  useEffect(() => {
    setCollapsed(config.sidebarCollapsed);
  }, [config.sidebarCollapsed, setCollapsed]);

  return <>{children}</>;
}
