'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  dashboard: 'Panel Principal',
  pacientes: 'Pacientes',
  turnos: 'Turnos',
  recetas: 'Recetas',
  conversaciones: 'Conversaciones',
  historial: 'Historial',
  reportes: 'Reportes',
  encuestas: 'Encuestas',
  'lista-espera': 'Lista de Espera',
  derivaciones: 'Derivaciones',
  blacklist: 'Lista Negra',
  consentimientos: 'Consentimientos',
  notificaciones: 'Notificaciones',
  configuracion: 'Configuración',
  onboarding: 'Configuración Inicial',
  atencion: 'Atención',
  telemedicina: 'Telemedicina',
  novedades: 'Novedades',
  ayuda: 'Ayuda',
  acerca: 'Acerca de',
  admin: 'Administración',
  webhooks: 'Webhooks',
  backups: 'Backups',
  'api-keys': 'API Keys',
  medicos: 'Médicos',
  bloqueos: 'Bloqueos',
  'plantillas-recetas': 'Plantillas de Recetas',
  'plantillas-mensajes': 'Plantillas de Mensajes',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Filter out 'dashboard' since it's the root
  const filteredSegments = segments.filter((seg) => seg !== 'dashboard');

  if (filteredSegments.length === 0) {
    return null;
  }

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Panel</span>
          </Link>
        </li>
        {filteredSegments.map((segment, index) => {
          const isLast = index === filteredSegments.length - 1;
          const href = `/dashboard/${filteredSegments.slice(0, index + 1).join('/')}`;
          const label = routeLabels[segment] || segment;

          return (
            <li key={segment} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
              {isLast ? (
                <span className="text-foreground font-medium" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
