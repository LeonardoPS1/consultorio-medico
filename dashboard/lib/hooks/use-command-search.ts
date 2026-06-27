'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CommandItem } from '@/lib/command-palette-data';

// ============================================================
// Tipos de resultados de búsqueda
// ============================================================

export interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  icon: string; // emoji/icon identifier
  href: string;
  type: 'paciente' | 'turno' | 'conversacion' | 'receta';
}

interface UseCommandSearchReturn {
  results: SearchResult[];
  isLoading: boolean;
  search: (query: string) => void;
}

// ============================================================
// Hook: búsqueda de entidades vía APIs existentes
// ============================================================

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export function useCommandSearch(): UseCommandSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    // Limpiar timer anterior
    if (timerRef.current) clearTimeout(timerRef.current);
    // Abortar requests anteriores
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
      try {
        // Búsqueda paralela en 4 endpoints
        const [pacientesRes, turnosRes, conversacionesRes, recetasRes] =
          await Promise.allSettled([
            fetch(`/api/pacientes?search=${encodeURIComponent(query)}&limit=5`, {
              signal: controller.signal,
            }),
            fetch(`/api/turnos?search=${encodeURIComponent(query)}&limit=5`, {
              signal: controller.signal,
            }),
            fetch(
              `/api/conversaciones?search=${encodeURIComponent(query)}&limit=5`,
              { signal: controller.signal },
            ),
            fetch(`/api/recetas?search=${encodeURIComponent(query)}&limit=5`, {
              signal: controller.signal,
            }),
          ]);

        const allResults: SearchResult[] = [];

        // Pacientes
        if (pacientesRes.status === 'fulfilled' && pacientesRes.value.ok) {
          const data = await pacientesRes.value.json();
          const items = data.pacientes ?? data.data ?? [];
          for (const p of items) {
            allResults.push({
              id: `paciente-${p.id}`,
              label: `${p.nombre} ${p.apellido}`,
              sublabel: [p.rut, p.telefono].filter(Boolean).join(' · '),
              icon: '👤',
              href: `/dashboard/pacientes/${p.id}`,
              type: 'paciente',
            });
          }
        }

        // Turnos
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

        // Conversaciones
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

        // Recetas
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

        if (!controller.signal.aborted) {
          setResults(allResults.slice(0, 12)); // Max 12 results
          setIsLoading(false);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('[CommandPalette] Search error:', err);
        setResults([]);
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { results, isLoading, search };
}
