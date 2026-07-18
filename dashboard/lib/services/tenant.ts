import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

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
