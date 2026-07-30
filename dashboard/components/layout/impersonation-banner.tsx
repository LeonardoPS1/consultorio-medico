'use client';

import { useSession } from 'next-auth/react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ImpersonationBanner() {
  const { data: session } = useSession();

  // Intentar detectar impersonación desde session o desde atributo HTML
  const isImpersonating = session?.user?.impersonating ||
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-impersonating') === 'true');

  const impersonatedBy = session?.user?.impersonatedBy ||
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-impersonated-by') || '');

  if (!isImpersonating) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Sesión de soporte activa — estás viendo el panel como{' '}
          <strong>{session?.user?.name || 'administrador'}</strong>
          {impersonatedBy && (
            <span className="text-amber-500/70 ml-1">
              (iniciada por {impersonatedBy})
            </span>
          )}
        </span>
      </div>
      <form action="/api/auth/impersonate/exit" method="POST">
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/10 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          Salir del modo soporte
        </Button>
      </form>
    </div>
  );
}
