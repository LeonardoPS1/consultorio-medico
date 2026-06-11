'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

const LS_INSTALLED = 'pwa_installed';
const LS_DISMISSED = 'pwa_dismissed';
const LS_LAST_VERSION = 'pwa_last_changelog_version';

/**
 * Banner de instalación PWA.
 * Solo se renderiza en la página principal del dashboard.
 *
 * Condiciones para NO mostrar:
 *  - Ya está instalada (display-mode: standalone / iOS standalone)
 *  - Ya se instaló anteriormente (localStorage)
 *  - El usuario la descartó (localStorage)
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installing, setInstalling] = useState(false);

  /** ¿Debemos mostrar el banner? */
  const shouldShow = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

    if (isStandalone) return false;
    if (localStorage.getItem(LS_INSTALLED) === 'true') return false;
    if (localStorage.getItem(LS_DISMISSED) === 'true') return false;

    return true;
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    // @ts-expect-error - beforeinstallprompt API no está en tipos TS
    deferredPrompt.prompt();
    // @ts-expect-error - userChoice tampoco está tipado
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      localStorage.setItem(LS_INSTALLED, 'true');
    }
    setInstalling(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDeferredPrompt(null);
    localStorage.setItem(LS_DISMISSED, 'true');
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (shouldShow()) {
        setDeferredPrompt(e);
      }
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      localStorage.setItem(LS_INSTALLED, 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    // Re-check en caso de que ya haya cargado tarde
    if (!shouldShow()) {
      setDeferredPrompt(null);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white border border-blue-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <Download className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">Instalá AiCoreMed</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Accedé más rápido desde tu pantalla de inicio
          </p>
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
          onClick={handleDismiss}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="No mostrar de nuevo"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
