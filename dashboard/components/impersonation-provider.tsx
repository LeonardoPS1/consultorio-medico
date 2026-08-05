'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ImpersonationSession } from '@/lib/auth-impersonation';

const ImpersonationContext = createContext<ImpersonationSession | null>(null);

export function ImpersonationProvider({
  session,
  children,
}: {
  session: ImpersonationSession | null;
  children: ReactNode;
}) {
  return <ImpersonationContext.Provider value={session}>{children}</ImpersonationContext.Provider>;
}

export function useImpersonation(): ImpersonationSession | null {
  return useContext(ImpersonationContext);
}
