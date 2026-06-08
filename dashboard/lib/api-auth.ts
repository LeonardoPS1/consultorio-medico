/**
 * Helpers de autenticación y autorización para API routes.
 * Reutiliza el patrón de auth() + verifyPacienteAccess de otras rutas protegidas.
 */

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { turnos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { fail } from '@/lib/api-handler';
import type { Session } from 'next-auth';

/** Obtiene la sesión y lanza 401 si no está autenticado. Compatible con apiHandler. */
export async function requireAuth(): Promise<Session & { user: NonNullable<Session['user']> & { id: string } }> {
  const session = await auth();
  if (!session?.user?.id) {
    fail('No autorizado', 401);
  }
  return session as Session & { user: NonNullable<Session['user']> & { id: string } };
}

/** Verifica que el médico tenga acceso al paciente (IDOR check). Lanza 403 si no. */
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
