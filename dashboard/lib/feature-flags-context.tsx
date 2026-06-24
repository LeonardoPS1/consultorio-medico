'use client';

/**
 * Feature Flags Context + User Overrides Context
 *
 * FeatureFlagsProvider: estado de los feature toggles a nivel tenant.
 * UserFeatureOverridesProvider: overrides de features por usuario.
 *
 * Los overrides permiten que un admin habilite features de planes
 * superiores para usuarios específicos.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

// ================================================================
// Feature Flags (tenant-level toggles)
// ================================================================

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

/** Hook para verificar si un feature específico está habilitado a nivel tenant */
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
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      const features = data.data?.features ?? data.features;
      if (features) {
        setToggles(features);
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
      if (toggles[featureId] === undefined) return true;
      return toggles[featureId] !== false;
    },
    [toggles],
  );

  const contextValue = useMemo(
    () => ({ isFeatureEnabled, refresh: fetchToggles, loading }),
    [isFeatureEnabled, fetchToggles, loading],
  );

  return (
    <FeatureFlagsContext.Provider value={contextValue}>{children}</FeatureFlagsContext.Provider>
  );
}

// ================================================================
// User Feature Overrides (per-user overrides)
// ================================================================

interface UserOverridesContextValue {
  /** Set de feature IDs que el usuario tiene override */
  overrides: Set<string>;
  /** true mientras se cargan */
  loading: boolean;
  /** Recargar overrides */
  refresh: () => Promise<void>;
}

const UserOverridesContext = createContext<UserOverridesContextValue>({
  overrides: new Set(),
  loading: true,
  refresh: async () => {},
});

export function useUserOverrides() {
  return useContext(UserOverridesContext);
}

/** Hook: ¿el usuario actual tiene override para este feature? */
export function useHasFeatureOverride(featureId: string): boolean {
  const { overrides } = useUserOverrides();
  return overrides.has(featureId);
}

export function UserFeatureOverridesProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchOverrides = useCallback(async () => {
    try {
      const res = await fetch('/api/user/feature-overrides');
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.featureIds) {
        setOverrides(new Set(data.featureIds));
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  const contextValue = useMemo(
    () => ({ overrides, loading, refresh: fetchOverrides }),
    [overrides, fetchOverrides, loading],
  );

  return (
    <UserOverridesContext.Provider value={contextValue}>{children}</UserOverridesContext.Provider>
  );
}
