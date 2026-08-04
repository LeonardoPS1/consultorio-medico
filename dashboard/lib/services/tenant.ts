import { db } from '@/lib/db';
import { tenants, usuarios } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import crypto from 'crypto';

export interface TenantBranding {
  nombre: string;
  logoUrl: string;
  colores: {
    primary: string;
    secondary: string;
  };
  dominioCustom?: string;
}

export interface TenantRegional {
  pais: string;
  moneda: { codigo: string; simbolo: string; decimales: number; formato: string };
  documentoId: { tipo: string; label: string; formato: string };
  sistemaSalud: string[];
  regiones: string;
}

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

const defaultBranding: TenantBranding = {
  nombre: 'AiCoreMed',
  logoUrl: '/aicoremed_dark_1200.svg',
  colores: { primary: '#2563eb', secondary: '#059669' },
};

const defaultRegional: TenantRegional = {
  pais: 'CL',
  moneda: { codigo: 'CLP', simbolo: '$', decimales: 0, formato: 'CLP' },
  documentoId: { tipo: 'RUT', label: 'RUT', formato: 'XX.XXX.XXX-X' },
  sistemaSalud: ['Fonasa', 'Isapre'],
  regiones: 'cl',
};

export async function getTenantBranding(tenantId?: string): Promise<TenantBranding> {
  if (!tenantId || tenantId === DEFAULT_TENANT_ID) {
    return defaultBranding;
  }
  try {
    const [tenant] = await db
      .select({
        nombre: tenants.nombre,
        logoUrl: tenants.logoUrl,
        colores: tenants.colores,
        dominioCustom: tenants.dominioCustom,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant) return defaultBranding;
    const colores = (tenant.colores as { primary?: string; secondary?: string }) || {};
    return {
      nombre: tenant.nombre || defaultBranding.nombre,
      logoUrl: tenant.logoUrl || defaultBranding.logoUrl,
      colores: {
        primary: colores.primary || defaultBranding.colores.primary,
        secondary: colores.secondary || defaultBranding.colores.secondary,
      },
      dominioCustom: tenant.dominioCustom || undefined,
    };
  } catch {
    return defaultBranding;
  }
}

export async function getTenantRegional(tenantId?: string): Promise<TenantRegional> {
  if (!tenantId || tenantId === DEFAULT_TENANT_ID) {
    return defaultRegional;
  }
  try {
    const [tenant] = await db
      .select({ configRegional: tenants.configRegional })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant) return defaultRegional;
    return (tenant.configRegional as TenantRegional) || defaultRegional;
  } catch {
    return defaultRegional;
  }
}

export { defaultBranding, defaultRegional };

// ─── Resolución de tenant por host ──────────────────────

const RESOLVE_CACHE_TTL_MS = 60_000;
const tenantCache = new Map<string, { tenantId: string; ts: number }>();

const IGNORE_SUBDOMAINS = new Set(['www', 'app', 'status', 'consultorio']);

/**
 * Resuelve el tenantId real (UUID) a partir del hostname de la request.
 *
 * Orden de búsqueda:
 * 1. Dominio custom verificado (ej: portal.clinicadelcliente.cl → tenants.dominioCustom)
 * 2. Subdominio estándar (ej: demo.aicorebots.com → tenants.subdomain = 'demo')
 * 3. Fallback: DEFAULT_TENANT_ID (00000000-0000-0000-0000-000000000000)
 *
 * Cache en memoria con TTL de 60s para evitar queries repetidas por request.
 */
export async function resolveTenantByHost(hostname: string): Promise<string> {
  const host = hostname.toLowerCase().trim();

  // Cache hit
  const cached = tenantCache.get(host);
  if (cached && Date.now() - cached.ts < RESOLVE_CACHE_TTL_MS) {
    return cached.tenantId;
  }

  const cacheSet = (tenantId: string) => {
    tenantCache.set(host, { tenantId, ts: Date.now() });
    return tenantId;
  };

  try {
    // 1. Buscar por dominio custom verificado
    const customRows = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(
        and(
          eq(tenants.dominioCustom, host),
          eq(tenants.dominioVerificado, true),
          eq(tenants.activo, true),
        ),
      )
      .limit(1);
    if (customRows[0]) return cacheSet(customRows[0].id);

    // 2. Buscar por subdominio (ej: demo.med.aicorebots.com → subdomain = 'demo')
    const parts = host.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      if (!IGNORE_SUBDOMAINS.has(subdomain)) {
        const subRows = await db
          .select({ id: tenants.id })
          .from(tenants)
          .where(and(eq(tenants.subdomain, subdomain), eq(tenants.activo, true)))
          .limit(1);
        if (subRows[0]) return cacheSet(subRows[0].id);
      }
    }
  } catch {
    // DB no disponible → usar cache o fallback
  }

  // 3. Fallback: tenant por defecto
  return cacheSet(DEFAULT_TENANT_ID);
}

/** Limpia la cache de resolución para un hostname específico */
export function invalidateTenantCache(hostname: string): void {
  tenantCache.delete(hostname.toLowerCase().trim());
}

// Limpiar entradas viejas de cache cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    tenantCache.forEach((entry, key) => {
      if (now - entry.ts > RESOLVE_CACHE_TTL_MS * 2) tenantCache.delete(key);
    });
  }, 5 * 60_000);
}

// ─── Creación de tenants ─────────────────────────────────

export interface CrearTenantResult {
  tenantId: string;
  subdomain: string;
}

/**
 * Crea un tenant nuevo (con verificación de subdominio único).
 * Lanza un Error con el mensaje si el subdominio ya está en uso.
 */
export async function crearTenant(input: {
  nombre: string;
  subdomain: string;
}): Promise<CrearTenantResult> {
  const subdomain = input.subdomain.trim();
  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.subdomain, subdomain))
    .limit(1);
  if (existing.length > 0) {
    throw new Error('El subdominio ya está en uso');
  }

  const tenantId = crypto.randomUUID();
  await db.insert(tenants).values({
    id: tenantId,
    nombre: input.nombre.trim(),
    subdomain,
    logoUrl: '/aicoremed_dark_1200.svg',
    colores: { primary: '#2563eb' },
    activo: true,
  });

  return { tenantId, subdomain };
}

/**
 * Crea un tenant nuevo con su primer usuario administrador.
 * Devuelve el tenantId, subdomain y la contraseña temporal generada
 * para que el caller pueda enviarla al admin por email.
 */
export async function crearTenantConAdmin(input: {
  nombre: string;
  subdomain: string;
  plan?: string;
  adminEmail: string;
  adminNombre: string;
}): Promise<CrearTenantResult & { adminEmail: string; adminNombre: string; passwordTemporal: string }> {
  const { tenantId, subdomain } = await crearTenant({
    nombre: input.nombre,
    subdomain: input.subdomain,
  });

  const plan = input.plan || 'free';
  const adminEmail = input.adminEmail.toLowerCase().trim();
  const adminNombre = input.adminNombre.trim();

  const passwordTemporal = crypto.randomBytes(12).toString('base64url');
  const passwordHash = await hash(passwordTemporal, 10);

  await db.insert(usuarios).values({
    id: crypto.randomUUID(),
    email: adminEmail,
    passwordHash,
    nombre: adminNombre,
    rol: 'admin',
    activo: true,
    tenantId,
    plan,
  });

  return { tenantId, subdomain, adminEmail, adminNombre, passwordTemporal };
}
