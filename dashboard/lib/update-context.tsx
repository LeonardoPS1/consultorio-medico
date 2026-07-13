'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
// Cookie en vez de localStorage — persiste entre sesiones y se envía al servidor.
const COOKIE_CHANGELOG_SEEN = 'nov_version_visto';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

// ============================================================
// Tipos
// ============================================================

interface UpdateContextType {
  /** Hay una nueva versión del SW disponible */
  updateReady: boolean;
  /** La app está offline */
  isOffline: boolean;
  /** Ejecuta la actualización (SKIP_WAITING + reload) */
  handleUpdate: () => void;
  /** Desestimar el aviso de actualización */
  dismissUpdate: () => void;
  /** Controla la visibilidad del modal de novedades */
  changelogOpen: boolean;
  setChangelogOpen: (v: boolean) => void;
  /** Versión actual de la app (desde env) */
  appVersion: string;
  /** Hay novedades sin leer (versión actual ≠ última vista) */
  hasUnseenChangelog: boolean;
  /** Marcar el changelog como visto para esta versión */
  markChangelogSeen: () => void;
}

// ============================================================
// Context
// ============================================================

const UpdateContext = createContext<UpdateContextType>({
  updateReady: false,
  isOffline: false,
  handleUpdate: () => {},
  dismissUpdate: () => {},
  changelogOpen: false,
  setChangelogOpen: () => {},
  appVersion: '1.0.0',
  hasUnseenChangelog: false,
  markChangelogSeen: () => {},
});

// ============================================================
// Provider
// ============================================================

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [updateReady, setUpdateReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [hasUnseenChangelog, setHasUnseenChangelog] = useState(false);
  const waitingSWRef = useRef<ServiceWorker | null>(null);

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.18.0';

  // ─── Changelog tracking por versión ──────────────────────
  useEffect(() => {
    const lastSeen = getCookie(COOKIE_CHANGELOG_SEEN);
    if (lastSeen !== appVersion) {
      setHasUnseenChangelog(true);
    }
  }, [appVersion]);

  const markChangelogSeen = useCallback(() => {
    setCookie(COOKIE_CHANGELOG_SEEN, appVersion);
    setHasUnseenChangelog(false);
  }, [appVersion]);

  // ─── Ejecutar actualización ──────────────────────────────
  const handleUpdate = useCallback(() => {
    if (waitingSWRef.current) {
      waitingSWRef.current.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  // ─── Desestimar ──────────────────────────────────────────
  const dismissUpdate = useCallback(() => {
    setUpdateReady(false);
    waitingSWRef.current = null;
  }, []);

  // ─── Efecto principal: SW + offline ──────────────────────
  useEffect(() => {
    // Offline detection
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service Worker registration
    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => window.location.reload();

      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Si ya hay un SW esperando (nueva versión)
          if (registration.waiting) {
            setUpdateReady(true);
            waitingSWRef.current = registration.waiting;
          }

          // Escuchar cuando se encuentra una nueva versión
          registration.addEventListener('updatefound', () => {
            const newSW = registration.installing;
            if (!newSW) return;

            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateReady(true);
                waitingSWRef.current = newSW;
              }
            });
          });
        })
        .catch(() => {
          // SW no soportado — no crítico
        });

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <UpdateContext.Provider
      value={{
        updateReady,
        isOffline,
        handleUpdate,
        dismissUpdate,
        changelogOpen,
        setChangelogOpen,
        appVersion,
        hasUnseenChangelog,
        markChangelogSeen,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useUpdate() {
  return useContext(UpdateContext);
}
