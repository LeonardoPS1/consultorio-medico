'use client';

/**
 * Feature Flags Context
 *
 * Provee el estado actual de los feature toggles a nivel tenant.
 * Los toggles se cargan desde /api/admin/features y se cachean en contexto.
 * Al cambiar un toggle desde el panel Sistema, se actualiza el contexto
 * inmediatamente para que todos los componentes reaccionen sin recargar.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface FeatureFlagsContextValue {
  /** ¿Está habilitado un feature? Por defecto true si no hay configuración */
  isFeatureEnabled: (featureId: string) => boolean;
  /** Recargar toggles desde la API */
  refresh: () => Promise<void>;
  /** true mientras se cargan los toggles iniciales */
  loading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  isFeatureEnabled: () => true,
  refresh: async () => {},
  loading: true,
});

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}

/** Hook para verificar si un feature específico está habilitado */
export function useFeatureFlag(featureId: string): boolean {
  const { isFeatureEnabled } = useFeatureFlags();
  return isFeatureEnabled(featureId);
}

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchToggles = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/features');
      const data = await res.json();
      if (data.features) {
        setToggles(data.features);
      }
    } catch {
      // Silently fail — asume todo habilitado
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToggles();
  }, [fetchToggles]);

  const isFeatureEnabled = useCallback(
    (featureId: string): boolean => {
      // Si no hay configuración, asume habilitado
      if (toggles[featureId] === undefined) return true;
      return toggles[featureId] !== false;
    },
    [toggles],
  );

  return (
    <FeatureFlagsContext.Provider
      value={{ isFeatureEnabled, refresh: fetchToggles, loading }}
    >
      {children}
    </FeatureFlagsContext.Provider>
  );
}
