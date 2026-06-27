import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { webVitalsMetrics } from '@/drizzle/schema';
import { apiHandler, success } from '@/lib/api-handler';
import { auth } from '@/lib/auth';

// ─── POST ──────────────────────────────────────────────────

export const POST = apiHandler(async (request: NextRequest) => {
  const body: {
    name?: string;
    value?: number;
    rating?: string;
    url?: string;
    userAgent?: string;
  } = await request.json().catch(() => ({}));

  if (!body.name || typeof body.value !== 'number' || !body.rating) {
    // Silently ignore malformed payloads — esto es analytics no crítico
    return success({ ok: true });
  }

  // Intentar asociar a médico logueado (no crítico si falla)
  let medicoId: string | undefined;
  try {
    const session = await auth();
    medicoId = session?.user?.medicoId ?? undefined;
  } catch {
    // Si no hay sesión, se guarda sin medicoId
  }

  await db.insert(webVitalsMetrics).values({
    name: body.name,
    value: String(body.value),
    rating: body.rating,
    url: body.url ?? null,
    userAgent: body.userAgent ?? null,
    medicoId: medicoId ?? null,
    createdAt: new Date(),
  });

  return success({ ok: true });
});
