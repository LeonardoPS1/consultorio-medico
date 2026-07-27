import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { impersonationTokens, usuarios, medicos } from '@/drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { safeWarn } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
  }

  try {
    const [record] = await db
      .select()
      .from(impersonationTokens)
      .where(eq(impersonationTokens.token, token));

    if (!record) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 });
    }
    if (record.usado) {
      return NextResponse.json({ error: 'Token ya usado' }, { status: 409 });
    }
    if (new Date() > record.expiresAt) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 410 });
    }

    // Buscar admin del tenant para impersonar
    const [targetUser] = await db
      .select()
      .from(usuarios)
      .where(
        and(
          eq(usuarios.tenantId, record.tenantId),
          eq(usuarios.rol, 'admin'),
          isNull(usuarios.deletedAt),
        ),
      )
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: 'No se encontró un usuario admin para este tenant' }, { status: 404 });
    }

    // Marcar token como usado
    await db
      .update(impersonationTokens)
      .set({ usado: true, usadoEn: new Date(), usadoPor: targetUser.email })
      .where(eq(impersonationTokens.id, record.id));

    let medicoId: string | undefined;
    try {
      const [medico] = await db
        .select({ id: medicos.id })
        .from(medicos)
        .where(and(eq(medicos.usuarioId, targetUser.id), isNull(medicos.deletedAt)))
        .limit(1);
      if (medico) medicoId = medico.id;
    } catch {
      // Tabla medicos puede no existir
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'AUTH_SECRET no configurada' }, { status: 500 });
    }

    const { encode } = await import('next-auth/jwt');
    const now = Math.floor(Date.now() / 1000);
    const sessionToken = randomUUID();

    const jwtToken = await encode({
      secret,
      salt: '__Secure-next-auth.session-token',
      token: {
        sub: targetUser.id,
        email: targetUser.email,
        name: targetUser.nombre,
        role: targetUser.rol,
        id: targetUser.id,
        plan: targetUser.plan || 'free',
        medicoId,
        tenantId: targetUser.tenantId || '00000000-0000-0000-0000-000000000000',
        isImpersonating: true,
        impersonatedBy: record.creadoPor,
        impersonatedByName: record.creadoPorNombre || record.creadoPor,
        impersonationMotivo: record.motivo,
        iat: now,
        exp: now + 3600,
        jti: randomUUID(),
      },
    });

    const response = NextResponse.redirect(
      new URL('/dashboard', request.url),
    );

    response.cookies.set('next-auth.session-token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    response.cookies.set('__Secure-next-auth.session-token', jwtToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    return response;
  } catch (e) {
    safeWarn('[Impersonate GET] Error:', (e as Error).message);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
