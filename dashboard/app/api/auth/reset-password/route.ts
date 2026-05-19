import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { usuarios } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';

// POST /api/auth/reset-password
// Valida el token y actualiza la contraseña
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token y contraseña requeridos' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    // Buscar usuario con token válido
    const result = await db
      .select()
      .from(usuarios)
      .where(
        sql`${usuarios.resetToken} = ${token} AND ${usuarios.resetTokenExpires} > NOW()`
      )
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({
        error: 'Token inválido o expirado. Solicitá uno nuevo.',
      }, { status: 400 });
    }

    const user = result[0];

    // Actualizar contraseña y limpiar token
    const hash = await bcrypt.hash(password, 10);
    await db
      .update(usuarios)
      .set({
        passwordHash: hash,
        resetToken: null,
        resetTokenExpires: null,
      })
      .where(eq(usuarios.id, user.id));

    console.log(`[ResetPassword] Contraseña actualizada para ${user.email}`);

    return NextResponse.json({
      ok: true,
      message: 'Contraseña actualizada correctamente. Ya podés iniciar sesión.',
    });
  } catch (error) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json({ error: 'Error al restablecer la contraseña' }, { status: 500 });
  }
}
