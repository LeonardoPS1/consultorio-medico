'use client';

import { useSession } from 'next-auth/react';
import { useImpersonation } from '@/components/impersonation-provider';

export interface EffectiveSessionUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  plan?: string;
  tenantId?: string;
  medicoId?: string | null;
  impersonating?: boolean;
  impersonatedBy?: string;
}

export interface EffectiveSession {
  user?: EffectiveSessionUser;
  expires?: string;
}

export interface EffectiveSessionResult {
  data: EffectiveSession | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

/**
 * Sesión efectiva: fusiona la sesión de NextAuth con la sesión de impersonación.
 * Durante una impersonación la cookie de NextAuth no existe (el login fue vía
 * la cookie de impersonación), por lo que la sesión de NextAuth viene null y
 * es necesario inyectar los datos del usuario impersonado (rol admin, plan y
 * tenantId del tenant objetivo) para que el gating de UI funcione.
 */
export function useEffectiveSession(): EffectiveSessionResult {
  const { data: session, status } = useSession();
  const imp = useImpersonation();

  if (imp) {
    return {
      data: {
        user: {
          id: imp.sub,
          name: imp.name,
          email: imp.email,
          role: imp.role,
          plan: imp.plan,
          tenantId: imp.tenantId,
          impersonating: true,
          impersonatedBy: imp.impersonatedBy,
        },
      },
      status: 'authenticated',
    };
  }

  return { data: session as EffectiveSession | null, status };
}
