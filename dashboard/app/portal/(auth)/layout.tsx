/**
 * Layout del Portal del Paciente — Grupo autenticado
 */

import Link from 'next/link';
import PortalNav from './portal-nav';

export const metadata = {
  title: 'Portal del Paciente — Consultorio Médico',
  description: 'Accedé a tus turnos, recetas e historial médico',
};

export default function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/portal/dashboard" className="font-bold text-blue-600 text-lg">
            Mi Consultorio
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      <PortalNav />
    </div>
  );
}
