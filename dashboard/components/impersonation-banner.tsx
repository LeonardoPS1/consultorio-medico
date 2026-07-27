'use client';

import { useSession, signOut } from 'next-auth/react';
import { X } from 'lucide-react';

export function ImpersonationBanner() {
  const { data: session } = useSession();

  if (!session?.user?.isImpersonating) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-xs font-bold">
          🔍
        </span>
        <span>
          <strong>Soporte AicoreMed</strong> &mdash; Accediste como{' '}
          <strong>{session.user.name || session.user.email}</strong>
          {session.user.impersonationMotivo && (
            <>
              {' '}· Motivo: <em>{session.user.impersonationMotivo}</em>
            </>
          )}
        </span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 transition-colors"
        aria-label="Salir del modo soporte"
      >
        <X className="w-3.5 h-3.5" />
        Salir
      </button>
    </div>
  );
}
