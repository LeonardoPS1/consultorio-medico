'use client';

import Link from 'next/link';
import { Calendar, FileText, ClipboardList, User, LogOut } from 'lucide-react';

const navItems = [
  { href: '/portal/dashboard', label: 'Inicio', icon: User },
  { href: '/portal/turnos', label: 'Turnos', icon: Calendar },
  { href: '/portal/recetas', label: 'Recetas', icon: FileText },
  { href: '/portal/historial', label: 'Historial', icon: ClipboardList },
  { href: '/portal/perfil', label: 'Perfil', icon: User },
];

export default function PortalNav() {
  async function handleLogout() {
    await fetch('/api/portal/logout', { method: 'POST' });
    window.location.href = '/portal';
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="max-w-lg mx-auto flex justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors px-2 py-1"
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1"
        >
          <LogOut className="h-5 w-5" />
          <span>Salir</span>
        </button>
      </div>
    </nav>
  );
}
