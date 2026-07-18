'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import type { CommandItem } from '@/lib/command-palette-data';

export interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  icon: string;
  href: string;
  type: 'paciente' | 'turno' | 'conversacion' | 'receta';
}

interface UseCommandSearchReturn {
  results: SearchResult[];
  isLoading: boolean;
  search: (query: string) => void;
}

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

// Shared fuse.js cache across hook instances
let sharedPatientCache: SearchResult[] = [];
let fuseInstance: Fuse<SearchResult> | null = null;

function initFuse(data: SearchResult[]) {
  sharedPatientCache = data;
  fuseInstance = new Fuse(data, {
    keys: [
      { name: 'label', weight: 0.5 },
      { name: 'sublabel', weight: 0.3 },
    ],
    threshold: 0.35,
    distance: 100,
    minMatchCharLength: 2,
  });
}

export function useCommandSearch(): UseCommandSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fuseReadyRef = useRef(false);

  // Preload patients into fuse.js cache (once)
  useEffect(() => {
    if (fuseInstance) {
      fuseReadyRef.current = true;
      return;
    }
    fetch('/api/pacientes?limit=500')
      .then((r) => r.json())
      .then((json) => {
        const patients: SearchResult[] = (json.data || json.pacientes || []).map(
          (p: Record<string, unknown>) => ({
            id: `paciente-${p.id}`,
            label: `${p.nombre || ''} ${p.apellido || ''}`.trim() || 'Paciente',
            sublabel: [p.rut || p.dni, p.telefono].filter(Boolean).join(' · '),
            icon: '👤',
            href: `/dashboard/pacientes/${p.id}`,
            type: 'paciente' as const,
          }),
        );
        initFuse(patients);
        fuseReadyRef.current = true;
      })
      .catch(() => {});
  }, []);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    if (!query || query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    timerRef.current = setTimeout(async () => {
      // Parallel: fuse.js for patients + API for others
      const [turnosRes, conversacionesRes, recetasRes] = await Promise.allSettled([
        fetch(`/api/turnos?search=${encodeURIComponent(query)}&limit=5`, {
          signal: controller.signal,
        }),
        fetch(`/api/conversaciones?search=${encodeURIComponent(query)}&limit=5`, {
          signal: controller.signal,
        }),
        fetch(`/api/recetas?search=${encodeURIComponent(query)}&limit=5`, {
          signal: controller.signal,
        }),
      ]);

      const allResults: SearchResult[] = [];

      // 1) Fuse.js patient search (offline, instant)
      if (fuseInstance && query.length >= MIN_QUERY_LENGTH) {
        const fuseResults = fuseInstance.search(query).slice(0, 5);
        for (const r of fuseResults) {
          allResults.push(r.item);
        }
      }

      // 2) Turnos via API
      if (turnosRes.status === 'fulfilled' && turnosRes.value.ok) {
        const data = await turnosRes.value.json();
        const items = data.turnos ?? data.data ?? [];
        for (const t of items) {
          const nombre = t.pacienteNombre ?? t.paciente?.nombre ?? '';
          const apellido = t.pacienteApellido ?? t.paciente?.apellido ?? '';
          allResults.push({
            id: `turno-${t.id}`,
            label: `${nombre} ${apellido}`.trim() || t.motivo || 'Turno',
            sublabel: [t.fechaHora, t.estado].filter(Boolean).join(' · '),
            icon: '📅',
            href: `/dashboard/turnos`,
            type: 'turno',
          });
        }
      }

      // 3) Conversaciones via API
      if (conversacionesRes.status === 'fulfilled' && conversacionesRes.value.ok) {
        const data = await conversacionesRes.value.json();
        const items = data.conversaciones ?? data.data ?? [];
        for (const c of items) {
          allResults.push({
            id: `conversacion-${c.id}`,
            label: c.pacienteNombre ?? c.ultimoMensaje ?? 'Conversación',
            sublabel: [c.canal, c.estado].filter(Boolean).join(' · '),
            icon: '💬',
            href: `/dashboard/conversaciones/${c.id}`,
            type: 'conversacion',
          });
        }
      }

      // 4) Recetas via API
      if (recetasRes.status === 'fulfilled' && recetasRes.value.ok) {
        const data = await recetasRes.value.json();
        const items = data.recetas ?? data.data ?? [];
        for (const r of items) {
          allResults.push({
            id: `receta-${r.id}`,
            label: r.medicamento ?? 'Receta',
            sublabel: [r.dosis, r.estado].filter(Boolean).join(' · '),
            icon: '💊',
            href: `/dashboard/recetas`,
            type: 'receta',
          });
        }
      }

      // 5) Quick navigation items filtered by search
      if (!controller.signal.aborted) {
        setResults(allResults.slice(0, 20));
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { results, isLoading, search };
}
