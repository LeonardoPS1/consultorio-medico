import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { impersonationTokens } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { safeWarn } from '@/lib/logger';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

/**
 * Revoca TODAS las sesiones de impersonación activas del tenant.
 * Marca session_revoked_at en los tokens con sesión viva (session_jti seteado y
 * no revocado). getImpersonationSession() valida este campo por jti en cada request,
 * por lo que la revocación es efectiva inmediatamente.
 * @param request
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('x-internal-key');
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId || typeof tenantId !== 'string') {
      return NextResponse.json({ error: 'tenantId es obligatorio' }, { status: 400 });
    }

    const revocadas = await db
      .update(impersonationTokens)
      .set({ sessionRevokedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(impersonationTokens.tenantId, tenantId),
          isNotNull(impersonationTokens.sessionJti),
          isNull(impersonationTokens.sessionRevokedAt),
        ),
      )
      .returning({ id: impersonationTokens.id });

    safeWarn(`[Impersonate/Revoke] ${revocadas.length} sesión(es) revocada(s) para tenant ${tenantId}`);

    return NextResponse.json({ ok: true, revocadas: revocadas.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
