import { eq } from 'drizzle-orm';
import { tenants } from '@/drizzle/tenant';
import { db } from '@/lib/db';
import { DEFAULT_CLINIC_TZ } from '@/lib/zoned-time';

/**
 * Resolves the timezone configured for a tenant, falling back to the clinic
 * default. The server timezone is never used to interpret appointment input.
 * @param tenantId Tenant to look up
 * @returns {Promise<string>} IANA timezone identifier
 */
export async function resolveTenantTimezone(tenantId: string): Promise<string> {
  const [tenant] = await db
    .select({ configRegional: tenants.configRegional })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const cfg = (tenant?.configRegional ?? {}) as Record<string, unknown>;
  const candidates = [cfg.zonaHoraria, cfg.timezone, cfg.timeZone];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
  }
  return DEFAULT_CLINIC_TZ;
}
