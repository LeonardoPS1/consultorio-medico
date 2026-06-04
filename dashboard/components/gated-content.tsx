'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { canAccess, type FeatureId } from '@/lib/features';

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

  // Mientras carga la sesión, permitir acceso temporal
  if (status === 'loading') return <>{children}</>;

  const plan = session?.user?.plan ?? 'free';
  const required = getRequiredFeature(pathname ?? '');

  // Redirect durante el render si no tiene acceso (más seguro que useEffect)
  if (required && !canAccess(plan, required)) {
    router.replace('/dashboard/configuracion?tab=suscripcion');
    return null;
  }

  return <>{children}</>;
}
