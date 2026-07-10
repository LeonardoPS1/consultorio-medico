'use client';

import { createContext, useContext, useState, useCallback } from 'react';

export type LayoutVariant = 'default' | 'wide' | 'centered' | 'minimal';

export interface LayoutConfig {
  variant: LayoutVariant;
  sidebarCollapsed: boolean;
  contentMaxWidth: string;
  headerMode: 'full' | 'minimal';
  showFooter: boolean;
}

const variants: Record<LayoutVariant, Omit<LayoutConfig, 'variant'>> = {
  default: {
    sidebarCollapsed: false,
    contentMaxWidth: '',
    headerMode: 'full',
    showFooter: true,
  },
  wide: {
    sidebarCollapsed: true,
    contentMaxWidth: '',
    headerMode: 'full',
    showFooter: true,
  },
  centered: {
    sidebarCollapsed: true,
    contentMaxWidth: 'max-w-2xl mx-auto',
    headerMode: 'minimal',
    showFooter: false,
  },
  minimal: {
    sidebarCollapsed: true,
    contentMaxWidth: '',
    headerMode: 'minimal',
    showFooter: false,
  },
};

interface LayoutContextValue {
  config: LayoutConfig;
  setVariant: (variant: LayoutVariant) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LayoutConfig>({
    variant: 'default',
    ...variants.default,
  });

  const setVariant = useCallback((variant: LayoutVariant) => {
    setConfig({ variant, ...variants[variant] });
  }, []);

  return (
    <LayoutContext.Provider value={{ config, setVariant }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutConfig() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayoutConfig must be used within LayoutConfigProvider');
  return ctx;
}
