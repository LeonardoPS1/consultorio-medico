import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { usuarios } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

// POST /api/auth/change-password
// Cambia la contraseña del usuario autenticado
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Ambas contraseñas son requeridas' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

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
    await db
      .update(usuarios)
      .set({ passwordHash: hash })
      .where(eq(usuarios.id, user.id));

    return NextResponse.json({
      ok: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    console.error('[ChangePassword] Error:', error);
    return NextResponse.json({ error: 'Error al cambiar la contraseña' }, { status: 500 });
  }
}
