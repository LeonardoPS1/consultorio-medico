/**
 * Layout del Portal del Paciente — Grupo autenticado
 * Rediseño premium: max-w-2xl para mejor legibilidad en desktop,
 * header con glow tenue y navegación mejorada.
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
    <div
      className="min-h-screen bg-gradient-to-b from-teal-50/30 via-background to-white dark:from-teal-950/10 dark:via-background dark:to-gray-950"
      style={{ transition: 'background 300ms var(--ease-out)' }}
    >
      {/* Header premium */}
      <header
        className="sticky top-0 z-10 bg-background/70 dark:bg-background/70 backdrop-blur-xl border-b border-border/40"
        style={{
          transition:
            'background 300ms var(--ease-out), border-color 300ms var(--ease-out)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/portal/dashboard"
            className="flex items-center gap-2 font-semibold text-base tracking-tight group"
          >
            <div className="h-7 w-7 rounded-lg bg-primary shadow-sm flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="h-4 w-4 text-primary-foreground"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-foreground/80 dark:text-foreground/80">
              Portal <span className="text-primary font-bold">Salud</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <PortalThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
        <PortalContent>{children}</PortalContent>
      </main>

      <PortalNav />
    </div>
  );
}
