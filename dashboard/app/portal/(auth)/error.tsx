'use client';

import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect } from 'react';
import { PortalButton } from '@/components/portal/portal-button';

/**
 *
 * @param root0
 * @param root0.error
 * @param root0.reset
 */
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
        className="h-16 w-16 rounded-2xl bg-portal-destructive/10 flex items-center justify-center mb-6"
      >
        <AlertCircle className="h-8 w-8 text-portal-destructive" />
      </motion.div>

      <h2 className="text-[20px] font-semibold tracking-[0.01em] text-portal-fg mb-2">
        Algo salió mal
      </h2>
      <p className="text-sm text-portal-muted-fg max-w-sm mb-8 leading-relaxed">
        Ocurrió un error inesperado al cargar esta página. Puede ser un problema de conexión o un
        error temporal.
      </p>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        <PortalButton onClick={reset} fullWidth>
          <RefreshCw className="h-4 w-4" />
          Intentar de nuevo
        </PortalButton>
        <Link
          href="/portal/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 h-11 rounded-full bg-white text-portal-fg border border-portal-border hover:bg-portal-muted active:scale-[0.97] transition-all duration-150 text-sm font-medium"
        >
          <Home className="h-4 w-4" />
          Ir al inicio
        </Link>
      </div>

      {process.env.NODE_ENV === 'development' && error.message && (
        <details className="mt-8 w-full max-w-sm">
          <summary className="text-xs text-portal-muted-fg/70 cursor-pointer hover:text-portal-muted-fg transition-colors">
            Detalles técnicos (dev)
          </summary>
          <p className="mt-2 text-xs text-portal-muted-fg bg-portal-muted rounded-lg p-3 text-left font-mono break-all">
            {error.message}
          </p>
        </details>
      )}
    </motion.div>
  );
}
