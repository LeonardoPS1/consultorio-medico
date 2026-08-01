/**
 * Helpers de autenticación y autorización para API routes.
 * Reutiliza el patrón de auth() + verifyPacienteAccess de otras rutas protegidas.
 */

import { eq, and, sql } from 'drizzle-orm';
import type { Session } from 'next-auth';
import { turnos } from '@/drizzle/schema';
import { fail } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { getImpersonationSession } from '@/lib/auth-impersonation';
import { db } from '@/lib/db';

/** Obtiene la sesión y lanza 401 si no está autenticado. Compatible con apiHandler. */
export async function requireAuth(): Promise<
  Session & { user: NonNullable<Session['user']> & { id: string } }
> {
  const session = await auth();
  if (session?.user?.id) {
    return session as Session & { user: NonNullable<Session['user']> & { id: string } };
  }

  // Fallback: sesión de impersonación (operador de soporte entrando al tenant).
  // El JWT de impersonación ya trae role/tenantId/plan del admin del tenant,
  // por lo que los checks `session.user.role !== 'admin'` funcionan sin cambios.
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
    } as Session & { user: NonNullable<Session['user']> & { id: string } };
  }

  fail('No autorizado', 401);
}

/**
 * Verifica que el médico tenga acceso al paciente (IDOR check). Lanza 403 si no.
 * @param pacienteId
 * @param medicoId
 * @param rol
 */
export async function verifyPacienteAccess(
  pacienteId: string,
  medicoId: string | undefined,
  rol: string | undefined,
): Promise<void> {
  if (rol === 'admin') return;
  if (!medicoId) throw new Error('No autorizado');

  const [relation] = await db
    .select({ id: turnos.id })
    .from(turnos)
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        eq(turnos.medicoId, medicoId),
        sql`${turnos.deletedAt} IS NULL`,
      ),
    )
    .limit(1);

  if (!relation) {
    throw new Error('No autorizado — el paciente no pertenece a tu consulta');
  }
}

/** Helper rápido: retorna session y lanza 401 si no auth. Para rutas sin apiHandler. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session;
}
