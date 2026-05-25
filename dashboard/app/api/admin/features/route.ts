/**
 * GET  /api/admin/features — Obtener toggles actuales del tenant
 * PATCH /api/admin/features — Activar/desactivar features
 *
 * Admin only — requiere sesión con rol admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// ─── GET ─────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [tenant] = await db
    .select({ featuresEnabled: tenants.featuresEnabled })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  return NextResponse.json({
    features: (tenant?.featuresEnabled || {}) as Record<string, boolean>,
  });
}

// ─── PATCH ───────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: Record<string, boolean>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON requerido' }, { status: 400 });
  }

  // Validar que solo tenga boolean values
  const sanitized: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }

  await db
    .update(tenants)
    .set({ featuresEnabled: sanitized })
    .where(eq(tenants.id, DEFAULT_TENANT_ID));

  return NextResponse.json({
    features: sanitized,
    message: 'Toggles actualizados',
  });
}
