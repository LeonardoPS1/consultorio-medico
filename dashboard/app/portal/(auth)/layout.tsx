/**
 * Layout del Portal del Paciente — Grupo autenticado
 * Rediseño Premium Aicore: glassmorphism, animaciones suaves,
 * tipografía cuidada, paleta cálida y profesional.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import PortalNav from './portal-nav';
import { PortalContent } from './portal-content';
import { PortalThemeToggle } from '@/components/portal/theme-toggle';
import { PortalLogoutButton } from '@/components/portal/logout-button';
import { getPortalSession, checkPortalFeatureAccess } from '@/lib/portal-auth';
import { safeWarn } from '@/lib/logger';

export const metadata = {
  title: 'Portal del Paciente — AicoreMed',
  description: 'Accedé a tus turnos, recetas e historial médico',
};

export default async function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  const { allowed, plan } = await checkPortalFeatureAccess(session.pacienteId);
  if (!allowed) {
    safeWarn(
      `[PortalAuth] Paciente ${session.pacienteId} sin plan suficiente (${plan || 'sin plan'} — requiere premium)`,
    );
    redirect('/portal?sin-acceso=1');
  }
  return (
    <div className="portal-layout min-h-screen">
      {/* Ambient gradient background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, hsl(var(--portal-primary) / 0.06), transparent), radial-gradient(ellipse 60% 50% at 80% 80%, hsl(var(--portal-accent) / 0.04), transparent)',
        }}
      />

      {/* Header premium */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: 'var(--portal-glass-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--portal-glass-border)',
          boxShadow: 'var(--portal-shadow-sm)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/portal/dashboard"
            className="flex items-center gap-2.5 group"
          >
            {/* Logo icon with subtle gradient */}
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105 bg-portal-gradient-strong">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="h-4 w-4 text-white"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-portal-fg">
                Portal <span className="text-portal-primary">Salud</span>
              </span>
            <span className="text-[10px] font-medium tracking-wide text-portal-muted-fg">
              AicoreMed
            </span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <PortalThemeToggle />
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
            <PortalLogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-5 pb-28 min-h-[calc(100vh-3.5rem)]">
        <PortalContent>{children}</PortalContent>
      </main>

      <PortalNav />
    </div>
  );
}
