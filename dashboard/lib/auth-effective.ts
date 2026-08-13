/**
 * Sesión efectiva del lado del servidor para páginas del dashboard.
 *
 * Combina la sesión NextAuth con la sesión de impersonación (operador de soporte),
 * dando prioridad a la impersonación para el `role`/`plan`/`tenantId` impersonados.
 *
 * Uso en server components:
 *   import { getEffectiveSession } from '@/lib/auth-effective';
 *   const session = await getEffectiveSession();
 *   if (!session) redirect('/login');
 *
 * A diferencia de `requireAuth()` (de api-auth.ts), NO lanza 401: devuelve
 * `null` si no hay sesión, para que las páginas redirijan como ya hacen.
 */

import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';
import { getImpersonationSession } from '@/lib/auth-impersonation';

/**
 * Obtiene la sesión efectiva para server components.
 * - Si hay sesión NextAuth con usuario, la devuelve.
 * - Si no, intenta con la sesión de impersonación (JWT de impersonación),
 *   que ya trae role/plan/tenantId del admin impersonado.
 * - Si tampoco hay, devuelve null.
 * @returns {Promise<Session | null>} Sesión efectiva o null si no hay auth.
 */
export async function getEffectiveSession(): Promise<Session | null> {
  const session = await auth();
  if (session?.user?.id) return session;

  const impersonation = await getImpersonationSession();
  if (impersonation) {
    return {
      expires: new Date().toISOString(),
      user: {
        id: impersonation.sub,
        email: impersonation.email,
        name: impersonation.name,
        role: impersonation.role,
        tenantId: impersonation.tenantId,
        plan: impersonation.plan,
        impersonating: true,
        impersonatedBy: impersonation.impersonatedBy,
      },
    } as Session;
  }

  return null;
}