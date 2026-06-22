/**
 * Layout del Portal del Paciente — Grupo autenticado
 */

import Link from 'next/link';
import PortalNav from './portal-nav';
import { PortalContent } from './portal-content';

export const metadata = {
  title: 'Portal del Paciente — AicoreMed',
  description: 'Accedé a tus turnos, recetas e historial médico',
};

export default function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/portal/dashboard"
            className="font-semibold text-lg tracking-tight"
          >
            <span className="text-blue-600">Aicore</span>
            <span className="text-gray-700">Med</span>
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <PortalContent>{children}</PortalContent>
      </main>

      <PortalNav />
    </div>
  );
}
