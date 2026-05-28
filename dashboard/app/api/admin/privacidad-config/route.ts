/**
 * GET  /api/admin/privacidad-config — Obtener configuración de privacidad
 * PUT /api/admin/privacidad-config — Actualizar configuración de privacidad
 *
 * Admin only — requiere sesión con rol admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import type { ConfigPrivacidad } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_CONFIG: ConfigPrivacidad = {
  periodoRetencionBajaDias: 90,
};

// ─── GET ─────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [tenant] = await db
    .select({ configPrivacidad: tenants.configPrivacidad })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  const config = (tenant?.configPrivacidad || DEFAULT_CONFIG) as ConfigPrivacidad;

  return NextResponse.json({ config });
}

// ─── PUT ─────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: Partial<ConfigPrivacidad>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON requerido' }, { status: 400 });
  }

  // Validar que periodoRetencionBajaDias sea un número válido (entre 1 y 365)
  if (
    body.periodoRetencionBajaDias !== undefined &&
    (typeof body.periodoRetencionBajaDias !== 'number' ||
      body.periodoRetencionBajaDias < 1 ||
      body.periodoRetencionBajaDias > 365 ||
      !Number.isInteger(body.periodoRetencionBajaDias))
  ) {
    return NextResponse.json(
      { error: 'periodoRetencionBajaDias debe ser un número entero entre 1 y 365' },
      { status: 400 },
    );
  }

  // Leer config actual de la DB
  const [tenant] = await db
    .select({ configPrivacidad: tenants.configPrivacidad })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  const current = (tenant?.configPrivacidad || DEFAULT_CONFIG) as ConfigPrivacidad;

  // Hacer MERGE
  const merged: ConfigPrivacidad = {
    ...current,
    ...body,
  };

  // Guardar
  await db
    .update(tenants)
    .set({ configPrivacidad: merged })
    .where(eq(tenants.id, DEFAULT_TENANT_ID));

  return NextResponse.json({
    config: merged,
    message: 'Configuración de privacidad actualizada',
  });
}
