import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { usuarios } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { forgotPasswordSchema } from '@/lib/validations';

// POST /api/auth/forgot-password
// Genera un token de recuperación y lo devuelve (modo dev)
// En producción se enviaría por email
export async function POST(request: Request) {
  try {
    const parsed = forgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }
    const { email } = parsed.data;

    // Buscar usuario
    const result = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);

    if (result.length === 0) {
      // No revelar si el email existe o no por seguridad
      return NextResponse.json({
        ok: true,
        message: 'Si el email está registrado, recibirás un enlace de recuperación.',
      });
    }

    const user = result[0];
    if (!user.activo) {
      return NextResponse.json({
        ok: true,
        message: 'Si el email está registrado, recibirás un enlace de recuperación.',
      });
    }

    // Generar token y guardar SOLO su hash SHA-256 en DB
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await db
      .update(usuarios)
      .set({
        resetToken: tokenHash,
        resetTokenExpires: expires,
      })
      .where(eq(usuarios.id, user.id));

    // En desarrollo/dev, devolvemos el token en la respuesta
    // En producción, enviar por email
    const isDev = process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST;

    return NextResponse.json({
      ok: true,
      message: 'Si el email está registrado, recibirás un enlace de recuperación.',
      ...(isDev && {
        _dev: {
          token,
          resetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`,
        },
      }),
    });
  } catch (error) {
    console.error('[ForgotPassword] Error:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
