import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { impersonationTokens, usuarios } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { safeWarn } from '@/lib/logger';
import { setImpersonationCookie } from '@/lib/auth-impersonation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return new Response('Token requerido', { status: 400 });
  }

  try {
    const [record] = await db
      .select()
      .from(impersonationTokens)
      .where(and(eq(impersonationTokens.token, token), eq(impersonationTokens.usado, false)))
      .limit(1);

    if (!record) {
      return new Response('Token inválido o ya usado', { status: 404 });
    }

    if (new Date() > record.expiresAt) {
      return new Response('Token expirado', { status: 410 });
    }

    // Marcar token como usado
    await db
      .update(impersonationTokens)
      .set({ usado: true, usedAt: new Date(), updatedAt: new Date() })
      .where(eq(impersonationTokens.id, record.id));

    // Buscar datos del usuario
    const [user] = await db
      .select({ id: usuarios.id, email: usuarios.email, nombre: usuarios.nombre, rol: usuarios.rol, plan: usuarios.plan, tenantId: usuarios.tenantId })
      .from(usuarios)
      .where(eq(usuarios.id, record.usuarioId))
      .limit(1);

    if (!user) {
      return new Response('Usuario no encontrado', { status: 404 });
    }

    // Crear sesión de impersonación
    await setImpersonationCookie({
      sub: user.id,
      email: user.email,
      name: user.nombre,
      role: user.rol,
      plan: user.plan || 'free',
      tenantId: user.tenantId || '00000000-0000-0000-0000-000000000000',
      impersonating: true,
      impersonatedBy: record.creadoPorOperatorEmail,
    });

    // Redirect al dashboard
    const baseUrl = process.env.NEXTAUTH_URL || 'https://med.aicorebots.com';
    return NextResponse.redirect(`${baseUrl}/dashboard`);
  } catch (e) {
    safeWarn('[Auth/Impersonate] Error:', (e as Error).message);
    return new Response('Error interno', { status: 500 });
  }
}
