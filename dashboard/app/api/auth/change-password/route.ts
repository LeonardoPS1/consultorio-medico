import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { usuarios } from '@/drizzle/schema';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { changePasswordSchema } from '@/lib/validations';

// POST /api/auth/change-password
// Cambia la contraseña del usuario autenticado
/**
 * Cambia la contraseña del usuario autenticado.
 * @param {Request} request - La solicitud HTTP entrante.
 * @returns {Promise<NextResponse>} Confirmación de actualización o un error.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const parsed = changePasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || 'Datos inválidos';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;

    // Buscar usuario
    const result = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, session.user.email))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const user = result[0];

    // Verificar contraseña actual
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 });
    }

    // Actualizar contraseña
    const hash = await bcrypt.hash(newPassword, 10);
    await db.update(usuarios).set({ passwordHash: hash }).where(eq(usuarios.id, user.id));

    return NextResponse.json({
      ok: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    console.error('[ChangePassword] Error:', error);
    return NextResponse.json({ error: 'Error al cambiar la contraseña' }, { status: 500 });
  }
}
