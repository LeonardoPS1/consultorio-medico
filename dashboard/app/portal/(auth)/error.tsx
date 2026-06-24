'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Portal error:', error);
  }, [error]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
        className="h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mb-6"
      >
        <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
      </motion.div>

      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Algo salió mal
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed">
        Ocurrió un error inesperado al cargar esta página. Puede ser un problema de conexión o un
        error temporal.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white text-sm font-medium rounded-xl transition-all duration-150 shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Intentar de nuevo
        </button>
        <Link
          href="/portal/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 active:scale-[0.97] transition-all duration-150"
        >
          <Home className="h-4 w-4" />
          Ir al inicio
        </Link>
      </div>

      {process.env.NODE_ENV === 'development' && error.message && (
        <details className="mt-8 w-full max-w-sm">
          <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            Detalles técnicos (dev)
          </summary>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-left font-mono break-all">
            {error.message}
          </p>
        </details>
      )}
    </motion.div>
  );
}
