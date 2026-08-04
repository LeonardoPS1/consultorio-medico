import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { tenants, usuarios } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { notificacionesService } from '@/lib/services/notificaciones';
import { safeWarn } from '@/lib/logger';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const DOKPLOY_INTERNAL_URL = process.env.DOKPLOY_INTERNAL_URL || 'http://dokploy:3000';
const DOKPLOY_API_KEY = process.env.DOKPLOY_API_KEY;
const DOKPLOY_APP_ID = process.env.DOKPLOY_APP_ID;

/**
 * POST /api/internal/dominios/verificar — Verifica un dominio custom y notifica al admin
 *
 * Llamado desde WF-17 (n8n) tras verificar el registro TXT DNS.
 * Requiere: x-internal-key válido.
 * Body: { tenantId: string, dominio: string }
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const authHeader = request.headers.get('x-internal-key');
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    tenantId?: string;
    dominio?: string;
  };
  const { tenantId, dominio } = body;

  if (!tenantId || !dominio) {
    return NextResponse.json(
      { error: 'tenantId y dominio son requeridos' },
      { status: 400 },
    );
  }

  if (typeof tenantId !== 'string' || typeof dominio !== 'string') {
    return NextResponse.json(
      { error: 'tenantId y dominio deben ser strings' },
      { status: 400 },
    );
  }

  const host = dominio.toLowerCase().trim();

  // 1. Buscar el tenant
  const [tenant] = await db
    .select({
      id: tenants.id,
      nombre: tenants.nombre,
      dominioVerificado: tenants.dominioVerificado,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
  }

  // 2. Verificar que el dominio no esté ya verificado
  if (tenant.dominioVerificado) {
    return success({
      mensaje: `El dominio ya estaba verificado para el tenant ${tenant.nombre}`,
      yaVerificado: true,
    });
  }

  // 3. Marcar como verificado
  await db
    .update(tenants)
    .set({ dominioVerificado: true })
    .where(eq(tenants.id, tenantId));

  // 4. Notificar a admins del tenant
  const adminRows = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.tenantId, tenantId), eq(usuarios.rol, 'admin'), eq(usuarios.activo, true)))
    .limit(10);

  for (const admin of adminRows) {
    await notificacionesService.create({
      usuarioId: admin.id,
      titulo: 'Dominio verificado',
      descripcion: `El dominio ${host} fue verificado y ya está activo para ${tenant.nombre}. Agregalo en Dokploy: Domains > AicoreMed-Dashboard > Añadir dominio.`,
      tipo: 'sistema',
      tenantId,
    });
  }

  // 5. Intentar agregar dominio en Dokploy automáticamente (best-effort)
  let dokployOk = false;
  if (DOKPLOY_API_KEY && DOKPLOY_APP_ID) {
    try {
      // Obtener dominios actuales del app
      const getResp = await fetch(
        `${DOKPLOY_INTERNAL_URL}/api/application.one?applicationId=${DOKPLOY_APP_ID}`,
        {
          headers: { 'x-api-key': DOKPLOY_API_KEY, accept: 'application/json' },
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (getResp.ok) {
        const appData = (await getResp.json()) as { domains?: Array<{ host: string; port: number; https: boolean; certificateType: string }> };
        const currentDomains = appData.domains || [];
        const existing = currentDomains.some((d) => d.host === host);
        if (!existing) {
          const newDomains = [
            ...currentDomains,
            { host, port: 3000, https: true, certificateType: 'letsencrypt' },
          ];
          const updateResp = await fetch(
            `${DOKPLOY_INTERNAL_URL}/api/application.update`,
            {
              method: 'POST',
              headers: {
                'x-api-key': DOKPLOY_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ applicationId: DOKPLOY_APP_ID, domains: newDomains }),
              signal: AbortSignal.timeout(15_000),
            },
          );
          dokployOk = updateResp.ok;
        } else {
          dokployOk = true; // Ya estaba
        }
      }
    } catch (err) {
      safeWarn('[dominios/verificar] Dokploy auto-domain setup falló:', err);
      dokployOk = false;
    }
  }

  // 6. Invalidar cache del resolver de tenant para este dominio
  try {
    const { invalidateTenantCache } = await import('@/lib/services/tenant');
    invalidateTenantCache(host);
  } catch {
    // La cache expira en 60s de todas formas
  }

  return success({
    mensaje: `Dominio ${host} verificado para ${tenant.nombre}`,
    tenantId,
    dominio: host,
    dokployAutoDomain: dokployOk,
    adminsNotificados: adminRows.length,
  });
});
