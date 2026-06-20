/**
 * Row-Level Security (RLS) — Aislamiento multi-tenant a nivel DB.
 *
 * Uso en API routes:
 *   import { setTenantContext } from '@/lib/rls';
 *   await setTenantContext(tenantId);
 *
 * Esto establece `app.current_tenant_id` en la sesión de PostgreSQL.
 * Las políticas RLS filtran automáticamente todas las queries de la
 * transacción actual contra ese tenant_id.
 *
 * ⚠️  Debe llamarse al inicio de cada request, DESPUÉS de obtener el
 *    tenantId del usuario autenticado.
 */

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * Establece el contexto del tenant activo para la transacción actual.
 *
 * @param tenantId - UUID del tenant (ej: '00000000-0000-0000-0000-000000000000')
 *
 * Las políticas RLS en PostgreSQL usan `current_setting('app.current_tenant_id')`
 * para filtrar automáticamente todas las consultas al tenant indicado.
 *
 * Si no se llama (o se llama con null), las políticas son permisivas
 * y no filtran — útil para operaciones del sistema o migraciones.
 */
export async function setTenantContext(tenantId: string | null | undefined): Promise<void> {
  if (!tenantId) return;

  try {
    await db.execute(sql`SELECT public.set_tenant_context(${tenantId}::uuid)`);
  } catch (error) {
    // Si RLS no está instalado aún, no fallar
    console.warn('[RLS] No se pudo establecer contexto tenant:', error instanceof Error ? error.message : error);
  }
}

/**
 * Helper para API routes: establece el contexto tenant desde la sesión activa.
 * Debe llamarse al inicio de cada request protegido.
 *
 * Uso:
 *   import { withTenantScope } from '@/lib/rls';
 *   await withTenantScope();
 */
export async function withTenantScope(): Promise<string | undefined> {
  try {
    const { auth } = await import('@/lib/auth');
    const session = await auth();
    const tenantId = session?.user?.tenantId;
    if (tenantId) {
      await setTenantContext(tenantId);
    }
    return tenantId;
  } catch {
    // Si auth() falla (ej: ruta pública sin sesión), continuar sin RLS
    return undefined;
  }
}
