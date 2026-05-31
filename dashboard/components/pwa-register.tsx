'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, Download, Smartphone } from 'lucide-react';

export function PWARegister() {
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleUpdate = useCallback(() => {
    if (waitingSW) {
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [waitingSW]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    // @ts-expect-error - beforeinstallprompt tiene prompt() que no está en tipos TS
    deferredPrompt.prompt();
    // @ts-expect-error - userChoice tampoco está tipado
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setInstalling(false);
  }, [deferredPrompt]);

  useEffect(() => {
    // ─── Detectar si ya estamos en modo standalone (app instalada) ──
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }

    // ─── Estado de conexión ────────────────────────────────────────
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // ─── Before Install Prompt (PWA) ──────────────────────────────
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // ─── Cuando se completa la instalación ─────────────────────────
    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstallDismissed(false);
    };
    window.addEventListener('appinstalled', handleInstalled);

    // ─── Service Worker ────────────────────────────────────────────
    const handleControllerChange = () => window.location.reload();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Si ya hay un SW esperando (nueva versión)
          if (registration.waiting) {
            setUpdateReady(true);
            setWaitingSW(registration.waiting);
          }

          // Escuchar cuando se encuentra una nueva versión
          registration.addEventListener('updatefound', () => {
            const newSW = registration.installing;
            if (!newSW) return;

            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateReady(true);
                setWaitingSW(newSW);
              }
            });
          });
        })
        .catch(() => {
          // SW no soportado — no crítico
        });

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, []);

  // No renderizar nada si la app está instalada y no hay novedades
  if (isStandalone && !updateReady && !isOffline) return null;

  return (
    <>
      {/* ─── Banner: Instalar App (solo si no está instalada) ──── */}
      {!isStandalone && deferredPrompt && !installDismissed && !updateReady && !isOffline && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white border border-blue-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Download className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Instalá AiCoreMed</p>
              <p className="text-xs text-gray-500 mt-0.5">Accedé más rápido desde tu pantalla de inicio</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  {installing ? 'Instalando...' : 'Instalar'}
                </button>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  Sin datos bancarios
                </span>
              </div>
            </div>
            <button
              onClick={() => setInstallDismissed(true)}
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              title="No mostrar de nuevo"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Banner: Nueva versión disponible ──────────────────── */}
      {updateReady && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white border border-blue-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Nueva versión disponible</p>
              <p className="text-xs text-gray-500 mt-0.5">Actualizá la app para tener la última versión</p>
              <button
                onClick={handleUpdate}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Actualizar
              </button>
            </div>
            <button
              onClick={() => setUpdateReady(false)}
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Badge: Offline ────────────────────────────────────── */}
      {isOffline && !isStandalone && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in duration-300">
          <div className="bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-medium text-amber-700">Sin conexión — algunos datos pueden no estar disponibles</span>
          </div>
        </div>
      )}
    </>
  );
}
