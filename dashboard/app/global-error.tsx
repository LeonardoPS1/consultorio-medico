'use client';

import { useEffect } from 'react';

/**
 * Global Error Boundary — atrapa errores del RootLayout.
 * A diferencia de error.tsx, este archivo SÍ captura errores en <html>/<body>.
 * Next.js requiere que global-error.tsx tenga su propio <html> y <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
            <p className="text-gray-600 mb-6 text-sm">
              Ocurrió un error inesperado en la aplicación. Esto puede deberse a un problema temporal.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => reset()}
                className="w-full bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Intentar de nuevo
              </button>
              <a
                href="/login"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Volver al inicio
              </a>
            </div>
            {error.digest && (
              <p className="mt-6 text-[11px] text-gray-400">
                Código de error: <code className="font-mono">{error.digest}</code>
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
