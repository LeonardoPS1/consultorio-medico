'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PortalError]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-100">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
          <p className="text-gray-500">
            Ocurrió un error inesperado al cargar el portal. Por favor, intentá de nuevo.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Intentar de nuevo
          </button>
          <a
            href="/portal"
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 font-semibold py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            Volver al inicio
          </a>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="text-left text-sm text-gray-400">
            <summary className="cursor-pointer">Detalles técnicos</summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-40">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
