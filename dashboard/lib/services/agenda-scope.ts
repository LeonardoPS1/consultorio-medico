import { db } from '@/lib/db';
import { usuarios, medicos } from '@/drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function getMedicoScope(usuarioId: string): Promise<{ medicoId: string | null; rol: string } | null> {
  const [user] = await db
    .select({ rol: usuarios.rol })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1);

  if (!user) return null;

  if (user.rol === 'medico') {
    const [medico] = await db
      .select({ id: medicos.id })
      .from(medicos)
      .where(and(eq(medicos.usuarioId, usuarioId), isNull(medicos.deletedAt)))
      .limit(1);
    return { medicoId: medico?.id || null, rol: user.rol };
  }

  return { medicoId: null, rol: user.rol };
}
