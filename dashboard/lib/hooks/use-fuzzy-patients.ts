'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { PatientSummaryLite } from '@/lib/types/patient-panel';

/** Cache staleness: 5 minutes */
const CACHE_STALE_MS = 5 * 60 * 1000;

/** Max patients to preload for fuzzy search */
const PRELOAD_LIMIT = 500;

/** Fuse.js config: weighted keys for smart search */
const FUSE_OPTIONS: IFuseOptions<PatientSummaryLite> = {
  keys: [
    { name: 'nombre', weight: 0.3 },
    { name: 'apellido', weight: 0.3 },
    { name: 'dni', weight: 0.15 },
    { name: 'telefono', weight: 0.15 },
    { name: 'email', weight: 0.1 },
  ],
  threshold: 0.35, // ~1 typo tolerance
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  shouldSort: true,
};

interface UseFuzzyPatientsReturn {
  /** Search results (empty = show all or no query) */
  results: PatientSummaryLite[];
  /** Current search query */
  query: string;
  /** Set search query (triggers fuzzy search) */
  setQuery: (q: string) => void;
  /** Whether cache is loading for the first time */
  isLoadingCache: boolean;
  /** Total patients in cache */
  totalCached: number;
  /** Force refresh the cache */
  refreshCache: () => void;
}

// Simple in-memory cache shared across hook instances in the same session
let sharedCache: PatientSummaryLite[] = [];
let sharedCacheAt = 0;

export function useFuzzyPatients(): UseFuzzyPatientsReturn {
  const [cache, setCache] = useState<PatientSummaryLite[]>(sharedCache);
  const [isLoadingCache, setIsLoadingCache] = useState(sharedCache.length === 0);
  const [query, setQuery] = useState('');
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Fetch all patients into cache */
  const loadCache = useCallback(async () => {
    // Skip if cache is fresh
    if (sharedCache.length > 0 && Date.now() - sharedCacheAt < CACHE_STALE_MS) {
      setCache(sharedCache);
      setIsLoadingCache(false);
      return;
    }

    setIsLoadingCache(true);
    try {
      const res = await fetch(`/api/pacientes?limit=${PRELOAD_LIMIT}`);
      if (!res.ok) throw new Error('Failed to fetch patients');
      const json = await res.json();
      const patients: PatientSummaryLite[] = (json.data || json || []).map(
        (p: Record<string, unknown>) => ({
          id: p.id as string,
          nombre: (p.nombre as string) || '',
          apellido: (p.apellido as string) || '',
          telefono: (p.telefono as string) || '',
          email: (p.email as string) || null,
          dni: (p.dni as string) || null,
          fechaNacimiento: (p.fechaNacimiento as string) || null,
          sistemaSalud: (p.sistemaSalud as string) || null,
          isapreNombre: (p.isapreNombre as string) || null,
          alergias: (p.alergias as string) || null,
          medicacionCronica: (p.medicacionCronica as string) || null,
          tags: (p.tags as string[]) || [],
          totalTurnos: (p.totalTurnos as number) ?? 0,
          totalRecetas: (p.totalRecetas as number) ?? 0,
          totalHistorial: (p.totalHistorial as number) ?? 0,
          totalNotasSoap: (p.totalNotasSoap as number) ?? 0,
        }),
      );

      sharedCache = patients;
      sharedCacheAt = Date.now();
      setCache(patients);
    } catch (err) {
      console.error('[useFuzzyPatients] Error loading cache:', err);
    } finally {
      setIsLoadingCache(false);
    }
  }, []);

  /** Force refresh */
  const refreshCache = useCallback(() => {
    sharedCacheAt = 0; // invalidate
    loadCache();
  }, [loadCache]);

  // Initial load
  useEffect(() => {
    if (sharedCache.length === 0) {
      loadCache();
    } else {
      setCache(sharedCache);
      setIsLoadingCache(false);
    }

    // Background refresh timer
    refreshTimerRef.current = setInterval(() => {
      if (Date.now() - sharedCacheAt > CACHE_STALE_MS) {
        loadCache();
      }
    }, CACHE_STALE_MS);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [loadCache]);

  // Fuse instance (memoized)
  const fuse = useMemo(() => new Fuse(cache, FUSE_OPTIONS), [cache]);

  // Search results
  const results = useMemo(() => {
    if (!query.trim()) return cache.slice(0, 50); // show first 50 when empty
    return fuse.search(query).slice(0, 20).map((r) => r.item);
  }, [query, fuse, cache]);

  return {
    results,
    query,
    setQuery,
    isLoadingCache,
    totalCached: cache.length,
    refreshCache,
  };
}
