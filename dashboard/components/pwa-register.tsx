'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Download, RefreshCw, WifiOff } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [installed, setInstalled] = useState(false);

  const handleUpdate = useCallback(() => {
    if (waitingSW) {
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
      waitingSW.addEventListener('statechange', () => {
        if (waitingSW.state === 'activated') {
          window.location.reload();
        }
      });
    }
  }, [waitingSW]);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  useEffect(() => {
    // ─── Estado de conexión ──────────────────────────
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // ─── Install Prompt ──────────────────────────────
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // ─── App Installed ───────────────────────────────
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('appinstalled', handleInstalled);

    // ─── Service Worker ───────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Chequear si ya hay un SW esperando
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
          // SW no soportado o error — no crítico
        });

      // Escuchar mensaje de SKIP_WAITING response
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SKIP_WAITING_RESPONSE') {
          window.location.reload();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  // No renderizar nada si no hay nada que mostrar
  if (isOffline && false) {
    // El SW ya maneja offline, no duplicamos UI aquí
  }

  return (
    <>
      {/* ─── Banner: Nueva versión disponible ─────────────── */}
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

      {/* ─── Banner: Instalar app ─────────────────────────── */}
      {installPrompt && !installed && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white border border-indigo-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <Download className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Instalá AiCoreMed</p>
              <p className="text-xs text-gray-500 mt-0.5">Agregá esta app a tu pantalla de inicio para acceder más rápido</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={handleInstall}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Instalar
                </button>
                <button
                  onClick={() => setInstallPrompt(null)}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Ahora no
                </button>
              </div>
            </div>
            <button
              onClick={() => setInstallPrompt(null)}
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Badge: Offline ───────────────────────────────── */}
      {isOffline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in duration-300">
          <div className="bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm">
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Sin conexión</span>
          </div>
        </div>
      )}
    </>
  );
}
