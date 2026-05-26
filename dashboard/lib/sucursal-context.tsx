'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

// ============================================================
// Tipos
// ============================================================

interface Sucursal {
  id: string;
  nombre: string;
}

interface SucursalContextType {
  sucursalId: string | null;
  sucursales: Sucursal[];
  setSucursalId: (id: string) => void;
  isLoading: boolean;
  /** Devuelve el nombre de la sucursal activa */
  sucursalNombre: string;
  /** Hay más de una sucursal? */
  hasMultiple: boolean;
}

// ============================================================
// Context
// ============================================================

const SucursalContext = createContext<SucursalContextType | null>(null);

const STORAGE_KEY = 'sucursal_activa';
const COOKIE_MAX_AGE = 31536000; // 1 año

// ============================================================
// Helpers
// ============================================================

/** Escribe la cookie para que la lean los server components */
function setSucursalCookie(id: string) {
  document.cookie = `${STORAGE_KEY}=${id};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

/** Lee la cookie (útil al inicio para sincronizar con localStorage) */
function getSucursalCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${STORAGE_KEY}=([^;]+)`));
  return match ? match[2] : null;
}

// ============================================================
// Provider
// ============================================================

export function SucursalProvider({ children }: { children: ReactNode }) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar sucursales desde la API
  const cargarSucursales = useCallback(async () => {
    try {
      const res = await fetch('/api/sucursales');
      // Si no autorizado (página pública), silenciosamente asumir sin sucursales
      if (!res.ok) {
        setSucursales([]);
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSucursales(data);

        // Restaurar sucursal activa desde localStorage (prioridad) o cookie
        const stored = localStorage.getItem(STORAGE_KEY);
        const fromCookie = getSucursalCookie();
        const preferida = stored || fromCookie;
        const found = preferida ? data.find((s: Sucursal) => s.id === preferida) : null;

        const activa = found ? found.id : data[0].id;
        setSucursalIdState(activa);

        // Asegurar consistencia localStorage <> cookie
        localStorage.setItem(STORAGE_KEY, activa);
        setSucursalCookie(activa);
      } else {
        setSucursales(Array.isArray(data) ? data : []);
      }
    } catch {
      // Sin sucursales no es crítico
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarSucursales();
  }, [cargarSucursales]);

  // Escuchar cambios externos (desde Header antes del refactor)
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ sucursalId: string }>;
      if (customEvent.detail?.sucursalId) {
        setSucursalIdState(customEvent.detail.sucursalId);
      }
    };
    window.addEventListener('sucursal-cambiada', handler);
    return () => window.removeEventListener('sucursal-cambiada', handler);
  }, []);

  // Setter público: actualiza estado, localStorage, cookie y emite evento
  const setSucursalId = useCallback((id: string) => {
    setSucursalIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
    setSucursalCookie(id);
    window.dispatchEvent(
      new CustomEvent('sucursal-cambiada', { detail: { sucursalId: id } }),
    );
  }, []);

  const sucursalNombre =
    sucursales.find((s) => s.id === sucursalId)?.nombre || '';

  const value: SucursalContextType = {
    sucursalId,
    sucursales,
    setSucursalId,
    isLoading,
    sucursalNombre,
    hasMultiple: sucursales.length > 1,
  };

  return (
    <SucursalContext.Provider value={value}>
      {children}
    </SucursalContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useSucursal(): SucursalContextType {
  const ctx = useContext(SucursalContext);
  if (!ctx) {
    throw new Error('useSucursal debe usarse dentro de un SucursalProvider');
  }
  return ctx;
}
