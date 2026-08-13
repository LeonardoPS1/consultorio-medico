// ============================================================
// API: 2FA Setup — Generar y verificar secreto
// ============================================================
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateUser2FA, storeBackupCodes } from '@/lib/data-store';
import {
  generate2faSecret,
  generateQRCodeBase64,
  generateBackupCodes,
  verify2faToken,
} from '@/lib/mfa';
import { setup2faSchema } from '@/lib/validations';

/**
 * Genera un secreto 2FA nuevo y sus códigos de respaldo.
 * @returns {Promise<NextResponse>} La respuesta JSON con el secreto y el QR.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const secret = generate2faSecret();
    const qrCode = await generateQRCodeBase64(secret, session.user.email);
    const backupCodes = generateBackupCodes(8);

    return NextResponse.json({
      secret,
      qrCode,
      backupCodes,
    });
  } catch (error) {
    console.error('[2FA Setup] Error:', error);
    return NextResponse.json({ error: 'Error al generar 2FA' }, { status: 500 });
  }
}

/**
 * Verifica el token TOTP y activa el 2FA para el usuario.
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @returns {Promise<NextResponse>} Confirmación de activación o un error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const parsed = setup2faSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos para 2FA' }, { status: 400 });
    }
    const { secret, token, backupCodes } = parsed.data;

    // Verificar el código TOTP
    if (!verify2faToken(token, secret)) {
      return NextResponse.json(
        { error: 'Código inválido. Verifica que la hora de tu teléfono esté sincronizada.' },
        { status: 400 },
      );
    }

    // Guardar el secreto y los backup codes hasheados en el store del usuario
    const hashedBackupCodes = Array.isArray(backupCodes)
      ? backupCodes.map((c: string) => createHash('sha256').update(c.toUpperCase()).digest('hex'))
      : [];

    await updateUser2FA(session.user.email, {
      secreto2fa: secret,
      activo2fa: true,
    });

    if (hashedBackupCodes.length > 0) {
      await storeBackupCodes(session.user.email, hashedBackupCodes);
    }

    return NextResponse.json({ success: true, message: '2FA activado correctamente' });
  } catch (error) {
    console.error('[2FA Verify] Error:', error);
    return NextResponse.json({ error: 'Error al verificar 2FA' }, { status: 500 });
  }
}

/**
 * Desactiva el 2FA del usuario.
 * @returns {Promise<NextResponse>} Confirmación de desactivación o un error.
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    await updateUser2FA(session.user.email, {
      secreto2fa: null,
      activo2fa: false,
      clearBackupCodes: true,
    });

    return NextResponse.json({ success: true, message: '2FA desactivado' });
  } catch (error) {
    console.error('[2FA Disable] Error:', error);
    return NextResponse.json({ error: 'Error al desactivar 2FA' }, { status: 500 });
  }
}
