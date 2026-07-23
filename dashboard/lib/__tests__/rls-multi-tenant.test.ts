import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { setTenantContext } from '@/lib/rls';
import { sql } from 'drizzle-orm';

let tenantA: string | null = null;
let tenantB: string | null = null;

describe('RLS Multi-Tenant', () => {
  beforeAll(async () => {
    await db.execute(sql`SELECT set_config('app.current_tenant_id', '', true)`);
    const tenants = await db.execute<{ id: string }>(
      sql`SELECT id::text FROM public.tenants LIMIT 2`,
    );
    if (tenants.length >= 1) tenantA = tenants[0].id;
    if (tenants.length >= 2) tenantB = tenants[1].id;
  });

  afterAll(async () => {
    await db.execute(sql`SELECT set_config('app.current_tenant_id', '', true)`);
  });

  async function currentTenantSetting(): Promise<string | null> {
    const [row] = await db.execute<{ current_tenant_id: string }>(
      sql`SELECT current_setting('app.current_tenant_id', true) AS current_tenant_id`,
    );
    const val = row?.current_tenant_id;
    return val && val.length > 0 ? val : null;
  }

  async function pgCurrentTenantId(): Promise<string | null> {
    const [row] = await db.execute<{ current_tenant_id: string }>(
      sql`SELECT public.current_tenant_id() AS current_tenant_id`,
    );
    const val = row?.current_tenant_id;
    return val && val.length > 0 ? val : null;
  }

  // ─── setTenantContext ───

  describe('setTenantContext()', () => {
    test('con UUID válido establece app.current_tenant_id', async () => {
      if (!tenantA) return;
      await setTenantContext(tenantA);
      expect(await currentTenantSetting()).toBe(tenantA);
    });

    test('cambia el contexto al llamar con otro tenant', async () => {
      if (!tenantA || !tenantB) return;
      await setTenantContext(tenantA);
      await setTenantContext(tenantB);
      expect(await currentTenantSetting()).toBe(tenantB);
    });

    test('no falla con null', async () => {
      await expect(setTenantContext(null)).resolves.toBeUndefined();
    });

    test('no falla con undefined', async () => {
      await expect(setTenantContext(undefined)).resolves.toBeUndefined();
    });
  });

  // ─── current_tenant_id() PG function ───

  describe('current_tenant_id()', () => {
    test('retorna NULL sin contexto', async () => {
      await db.execute(sql`SELECT set_config('app.current_tenant_id', '', true)`);
      expect(await pgCurrentTenantId()).toBeNull();
    });

    test('retorna el UUID con contexto', async () => {
      if (!tenantA) return;
      await setTenantContext(tenantA);
      expect(await pgCurrentTenantId()).toBe(tenantA);
    });
  });

  // ─── Tablas 0051 — políticas RLS activas ───

  describe('Tablas 0051 — RLS policies', () => {
    const tablas = [
      'portal_config', 'web_vitals_metrics', 'derivaciones',
      'webhook_configs', 'ordenes_estudio', 'documentos_medicos',
      'paquetes_portal', 'consentimiento_compartir', 'blacklist',
      'consentimientos',
    ];

    test.each(tablas)('%s: RLS habilitado', async (tbl) => {
      const [row] = await db.execute<{ rowsecurity: boolean }>(
        sql`SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = ${tbl}`,
      );
      expect(row?.rowsecurity).toBe(true);
    });

    test.each(tablas)('%s: policy tenant_isolation existe', async (tbl) => {
      const [row] = await db.execute<{ count: number }>(
        sql`SELECT count(*)::int AS count FROM pg_policies
            WHERE schemaname = 'public' AND tablename = ${tbl}
            AND policyname LIKE 'tenant_isolation%'`,
      );
      expect(row?.count).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Tablas 0027 — RLS legacy aún activo ───

  describe('Tablas 0027 — RLS legacy', () => {
    const tablas = ['usuarios', 'sucursales', 'horarios_atencion'];

    test.each(tablas)('%s: RLS habilitado', async (tbl) => {
      const [row] = await db.execute<{ rowsecurity: boolean }>(
        sql`SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = ${tbl}`,
      );
      expect(row?.rowsecurity).toBe(true);
    });
  });
});
