import { db } from '@/lib/db';
import { tenants, usuarios } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
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
