'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { canAccess, canAccessWithUserOverrides, type FeatureId } from '@/lib/features';
import { useUserOverrides } from '@/lib/feature-flags-context';

/**
 * Mapa de rutas del dashboard a features requeridas.
 * Si una ruta no está en el mapa, se permite el acceso (pública dentro del dashboard).
 */
const ROUTE_FEATURE_MAP: Record<string, FeatureId> = {
  '/dashboard/atencion': 'atencion',
  '/dashboard/turnos': 'turnos',
  '/dashboard/pacientes': 'pacientes',
  '/dashboard/conversaciones': 'conversaciones',
  '/dashboard/recetas': 'recetas',
  '/dashboard/reportes': 'reportes',
  '/dashboard/encuestas': 'encuestas',
  '/dashboard/lista-espera': 'lista-espera',
  '/dashboard/onboarding': 'ia-assistant',
  '/dashboard/admin/tenants': 'multi-sucursal',
  '/dashboard/admin/auditoria': 'auditoria',
  '/dashboard/admin/sucursales': 'multi-sucursal',
  '/dashboard/admin/backups': 'backup-encriptado',
  '/dashboard/admin/n8n': 'n8n-monitor',
  '/dashboard/webhooks': 'webhooks-log',
  '/dashboard/blacklist': 'blacklist',
  '/dashboard/consentimientos': 'consentimiento-informado',
};

/** Rutas hijas que heredan el feature de la ruta padre */
function getRequiredFeature(pathname: string): FeatureId | null {
  if (ROUTE_FEATURE_MAP[pathname]) return ROUTE_FEATURE_MAP[pathname];
  for (const [route, feature] of Object.entries(ROUTE_FEATURE_MAP)) {
    if (pathname.startsWith(route + '/')) return feature;
  }
  return null;
}

export function GatedContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { overrides: userOverrides } = useUserOverrides();

  // Derivar blocked SIEMPRE, incluso durante loading (evita que el # de hooks cambie)
  const isAdmin = session?.user?.role === 'admin';
  const plan = session?.user?.plan ?? 'free';
  const required = getRequiredFeature(pathname ?? '');

  // Admin tiene acceso a TODO, independientemente del plan
  // Para no-admins: verificar plan gating + user overrides
  const blocked = !isAdmin && !!required && !canAccess(plan, required) && !userOverrides.has(required);

  // Redirect en useEffect — solo cuando la sesión ya cargó completamente
  // Evita race condition: si redirect durante 'loading', router.replace() se dispara
  // antes de que sepamos que el usuario es admin (y blocked=false)
  useEffect(() => {
    if (status === 'loading') return;
    if (blocked) {
      router.replace('/dashboard/configuracion?tab=suscripcion');
    }
  }, [blocked, router, status]);

  // Mientras carga la sesión, permitir acceso temporal
  if (status === 'loading') return <>{children}</>;

  if (blocked) return null;

  return <>{children}</>;
}
