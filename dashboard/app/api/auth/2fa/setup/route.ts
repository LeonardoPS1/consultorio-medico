// ============================================================
// API: 2FA Setup — Generar y verificar secreto
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generate2faSecret, generateQRCodeBase64, generateBackupCodes, verify2faToken } from '@/lib/mfa';
import { updateUser2FA, getUserByEmail } from '@/lib/data-store';

export async function GET() {
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { secret, token } = await request.json();

    if (!secret || !token) {
      return NextResponse.json({ error: 'Faltan secret o token' }, { status: 400 });
    }

    // Verificar el código TOTP
    if (!verify2faToken(token, secret)) {
      return NextResponse.json({ error: 'Código inválido. Verificá que la hora de tu celular esté sincronizada.' }, { status: 400 });
    }

    // Guardar el secreto en el store del usuario
    await updateUser2FA(session.user.email, {
      secreto2fa: secret,
      activo2fa: true,
    });

    return NextResponse.json({ success: true, message: '2FA activado correctamente' });
  } catch (error) {
    console.error('[2FA Verify] Error:', error);
    return NextResponse.json({ error: 'Error al verificar 2FA' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    await updateUser2FA(session.user.email, {
      secreto2fa: null,
      activo2fa: false,
    });

    return NextResponse.json({ success: true, message: '2FA desactivado' });
  } catch (error) {
    console.error('[2FA Disable] Error:', error);
    return NextResponse.json({ error: 'Error al desactivar 2FA' }, { status: 500 });
  }
}
