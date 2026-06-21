'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, FileText, MessageSquare, User, PlusCircle, LogOut, Package, Bell, PenTool } from 'lucide-react';

const navItems = [
  { href: '/portal/dashboard', label: 'Inicio', icon: User },
  { href: '/portal/agendar', label: 'Agendar', icon: PlusCircle },
  { href: '/portal/turnos', label: 'Turnos', icon: Calendar },
  { href: '/portal/paquetes', label: 'Paquetes', icon: Package },
  { href: '/portal/mensajes', label: 'Chat', icon: MessageSquare },
  { href: '/portal/recetas', label: 'Recetas', icon: FileText },
  { href: '/portal/certificados', label: 'Certificados', icon: FileText },
  { href: '/portal/consentimientos', label: 'Consentimientos', icon: PenTool },
  { href: '/portal/perfil', label: 'Perfil', icon: User },
];

export default function PortalNav() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/notificaciones?count=true');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

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
        <Link
          href="/portal/notificaciones"
          className="flex flex-col items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors px-2 py-1 relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span>Alertas</span>
        </Link>
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
