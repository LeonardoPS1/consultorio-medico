'use client';

import { X, RefreshCw } from 'lucide-react';
import { useUpdate } from '@/lib/update-context';

/**
 * Banner global offline + actualización (fallback para mobile).
 * El banner de instalación PWA se maneja desde PWAInstallPrompt
 * (solo en la página principal del dashboard).
 */
export function PWARegister() {
  const { updateReady, handleUpdate, dismissUpdate, isOffline } = useUpdate();

  return (
    <>
      {/* ─── Banner: Nueva versión disponible (fallback mobile) ──── */}
      {updateReady && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white border border-blue-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Nueva versión disponible</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Actualizá la app para tener la última versión
              </p>
              <button
                onClick={handleUpdate}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Actualizar
              </button>
            </div>
            <button
              onClick={dismissUpdate}
              aria-label="Cerrar"
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Badge: Offline ────────────────────────────────────── */}
      {isOffline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in duration-300">
          <div className="bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-medium text-amber-700">
              Sin conexión — algunos datos pueden no estar disponibles
            </span>
          </div>
        </div>
      )}
    </>
  );
}
