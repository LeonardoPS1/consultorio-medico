/**
 * Layout del Portal del Paciente — Grupo autenticado
 * Con soporte dark mode y toggle en el header.
 */

import Link from 'next/link';
import PortalNav from './portal-nav';
import { PortalContent } from './portal-content';
import { PortalThemeToggle } from '@/components/portal/theme-toggle';

export const metadata = {
  title: 'Portal del Paciente — AicoreMed',
  description: 'Accedé a tus turnos, recetas e historial médico',
};

export default function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900"
      style={{ transition: 'background 300ms var(--ease-out)' }}>
      <header className="sticky top-0 z-10 bg-background/80 dark:bg-background/80 backdrop-blur-md border-b border-border/60 shadow-sm"
        style={{ transition: 'background 300ms var(--ease-out), border-color 300ms var(--ease-out), box-shadow 300ms var(--ease-out)' }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/portal/dashboard"
            className="font-semibold text-lg tracking-tight"
          >
            <span className="text-primary">Aicore</span>
            <span className="text-foreground/70">Med</span>
          </Link>

          <div className="flex items-center gap-1">
            <PortalThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <PortalContent>{children}</PortalContent>
      </main>

      <PortalNav />
    </div>
  );
}
