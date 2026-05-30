'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { X, Download, RefreshCw, Monitor, Smartphone, Chrome, Globe } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Browser = 'chrome' | 'edge' | 'safari' | 'other';

function detectBrowser(): Browser {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/') || ua.includes('edge/')) return 'edge';
  if (ua.includes('chrome/') || ua.includes('chromium/')) return 'chrome';
  if (ua.includes('safari/')) return 'safari';
  return 'other';
}

function isMobileOrTablet(): boolean {
  if (typeof window === 'undefined') return false;
  return /android|iphone|ipad|ipod|mobile|tablet/i.test(navigator.userAgent);
}

export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [noInstallEvent, setNoInstallEvent] = useState(false);
  const promptFiredRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const browser = detectBrowser();
  const isMobile = isMobileOrTablet();

  const handleUpdate = useCallback(() => {
    if (waitingSW) {
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [waitingSW]);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    } else {
      setInstallDismissed(true);
      setTimeout(() => setInstallDismissed(false), 24 * 60 * 60 * 1000); // 24h
    }
  }, [installPrompt]);

  const dismissInstall = useCallback(() => {
    setInstallPrompt(null);
    setInstallDismissed(true);
    setTimeout(() => setInstallDismissed(false), 24 * 60 * 60 * 1000);
  }, []);

  useEffect(() => {
    // ─── Detectar si ya estamos en modo standalone (app instalada) ──
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }

    // ─── Estado de conexión ────────────────────────────────────────
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // ─── Install Prompt ────────────────────────────────────────────
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      promptFiredRef.current = true;
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // ─── App Installed ─────────────────────────────────────────────
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    // ─── Service Worker ────────────────────────────────────────────
    const handleControllerChange = () => window.location.reload();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          if (registration.waiting) {
            setUpdateReady(true);
            setWaitingSW(registration.waiting);
          }

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
        .catch(() => {});

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    // ─── TIMEOUT: Si beforeinstallprompt no se disparó en 15 seg ──
    // El evento puede no aparecer en PC si no se cumplen las
    // condiciones de Chrome (interacción, tiempo en la página, etc.)
    timeoutRef.current = setTimeout(() => {
      if (!promptFiredRef.current && !isStandalone) {
        setNoInstallEvent(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isStandalone]);

  // Si la app ya está instalada y estamos en modo standalone, no mostramos nada
  if (isStandalone && !updateReady && !isOffline) return null;

  const installGuideContent = (
    <div className="text-left">
      <p className="text-xs text-gray-500 mb-2">
        {isMobile
          ? 'En tu celular, abrí el menú del navegador y buscá:'
          : 'En tu computadora, usá el menú del navegador:'}
      </p>
      <div className="space-y-1.5 text-xs">
        {browser === 'chrome' && (
          <>
            <p className="flex items-center gap-2 text-gray-700">
              <Chrome className="w-3.5 h-3.5 text-green-600 shrink-0" />
              {isMobile
                ? 'Chrome: Menú ⋮ → "Agregar a pantalla de inicio"'
                : 'Chrome: Icono ➕ en la barra de direcciones → "Instalar"'}
            </p>
          </>
        )}
        {browser === 'edge' && (
          <>
            <p className="flex items-center gap-2 text-gray-700">
              <Monitor className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              Edge: Menú ⋯ → "Aplicaciones" → "Instalar este sitio como una aplicación"
            </p>
          </>
        )}
        {browser === 'safari' && (
          <>
            <p className="flex items-center gap-2 text-gray-700">
              <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              Safari: Icono Compartir 📤 → "Agregar a pantalla de inicio"
            </p>
          </>
        )}
        {(browser === 'other' || browser === 'safari' && !isMobile) && (
          <p className="flex items-center gap-2 text-gray-700">
            <Globe className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            Buscá en el menú del navegador la opción "Instalar" o "Agregar a pantalla de inicio"
          </p>
        )}
      </div>
    </div>
  );

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

      {/* ─── Banner: Instalar (cuando beforeinstallprompt se disparó) ── */}
      {installPrompt && !installDismissed && !isStandalone && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white border border-indigo-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <Download className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Instalá AiCoreMed</p>
              <p className="text-xs text-gray-500 mt-0.5">Accedé más rápido desde tu pantalla de inicio</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={handleInstall}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Instalar
                </button>
                <button
                  onClick={dismissInstall}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Ahora no
                </button>
              </div>
            </div>
            <button onClick={dismissInstall} className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Banner: Instalación manual (cuando beforeinstallprompt NO se disparó) ── */}
      {noInstallEvent && !installPrompt && !installDismissed && !isStandalone && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white border border-amber-200 rounded-xl shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Download className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Instalá AiCoreMed en tu {isMobile ? 'celular' : 'PC'}</p>
                <p className="text-xs text-gray-500 mt-0.5">Usalo como una aplicación, sin el navegador</p>
              </div>
              <button
                onClick={() => { setNoInstallEvent(false); setInstallDismissed(true); setTimeout(() => setInstallDismissed(false), 7 * 24 * 60 * 60 * 1000); }}
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-amber-100">
              {installGuideContent}
            </div>

            {showInstallGuide && (
              <div className="mt-2 pt-2 border-t border-amber-100 text-xs text-gray-500">
                <p>Si no ves la opción, asegurate de:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Estar usando Chrome o Edge (recomendados)</li>
                  <li>Haber navegado en el sitio por al menos 30 segundos</li>
                </ul>
              </div>
            )}

            <button
              onClick={() => setShowInstallGuide(!showInstallGuide)}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
            >
              {showInstallGuide ? 'Mostrar menos' : 'No aparece la opción?'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Badge: Offline ───────────────────────────────── */}
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
