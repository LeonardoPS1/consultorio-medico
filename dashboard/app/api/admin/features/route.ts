/**
 * GET  /api/admin/features — Obtener toggles actuales del tenant
 * PATCH /api/admin/features — Activar/desactivar features (MERGE)
 *
 * Admin only — requiere sesión con rol admin
 *
 * IMPORTANTE: PATCH hace MERGE con los toggles existentes en DB.
 * Siempre devuelve el estado completo después de la operación,
 * incluyendo features guardados con true (habilitados).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// Lista completa de features del sistema (SSOT desde features.ts)
const ALL_FEATURES = [
  'panel-principal','atencion','turnos','pacientes','conversaciones',
  'recetas','reportes','horarios','notificaciones','reportes-avanzados',
  'ia-assistant','plantillas','2fa','equipo','integraciones',
  'auditoria','backup-encriptado','webhooks-log','credenciales',
  'api-publica','portal-paciente','multi-sucursal','encuestas',
];

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

  // Combinar los toggles guardados con defaults (habilitado si no está en DB)
  const saved = (tenant?.featuresEnabled || {}) as Record<string, boolean>;
  const merged: Record<string, boolean> = {};
  for (const f of ALL_FEATURES) {
    merged[f] = saved[f] !== false;
  }

  return NextResponse.json({ features: merged });
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

  // Leer toggles actuales de la DB
  const [tenant] = await db
    .select({ featuresEnabled: tenants.featuresEnabled })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  const current = (tenant?.featuresEnabled || {}) as Record<string, boolean>;

  // Hacer MERGE: actualizar solo los features enviados, mantener el resto
  const merged: Record<string, boolean> = { ...current };
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'boolean') {
      merged[key] = value;
    }
  }

  // Guardar solo los features con valor explícito (true o false)
  // Los features no listados se consideran habilitados por defecto
  await db
    .update(tenants)
    .set({ featuresEnabled: merged })
    .where(eq(tenants.id, DEFAULT_TENANT_ID));

  // Devolver los features merged completos (incluyendo los que no cambiaron)
  return NextResponse.json({
    features: merged,
    message: 'Toggles actualizados',
  });
}
