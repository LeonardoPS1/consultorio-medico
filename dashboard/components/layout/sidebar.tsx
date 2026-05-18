'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Syringe,
  LogOut,
  Activity,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { title: 'Panel Principal', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Atención', href: '/dashboard/atencion', icon: Activity },
  { title: 'Turnos', href: '/dashboard/turnos', icon: Calendar },
  { title: 'Pacientes', href: '/dashboard/pacientes', icon: Users },
  { title: 'Conversaciones', href: '/dashboard/conversaciones', icon: MessageSquare },
  { title: 'Recetas', href: '/dashboard/recetas', icon: Syringe },
  { title: 'Reportes', href: '/dashboard/reportes', icon: BarChart3 },
  { title: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [orgNombre, setOrgNombre] = useState('Consultorio');

  const cargarOrg = useCallback(() => {
    fetch('/api/organization')
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.nombre) setOrgNombre(res.data.nombre);
      })
      .catch(() => console.warn('[Sidebar] Error al cargar organización'));
  }, []);

  useEffect(() => {
    cargarOrg();
    window.addEventListener('organization-updated', cargarOrg);
    return () => window.removeEventListener('organization-updated', cargarOrg);
  }, [cargarOrg]);

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo fijo */}
      <div className="flex h-[172px] items-center justify-center px-2 border-b border-sidebar-muted">
        {!collapsed && (
          <div className="flex flex-col items-center">
            <div className="h-40 w-40 shrink-0">
              <img
                src="/aicoremed_dark_1200.svg"
                alt={orgNombre}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="font-semibold text-sm text-center truncate max-w-[160px] leading-none -mt-1">{orgNombre}</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto">
            <img
              src="/aicoremed_dark_1200.svg"
              alt={orgNombre}
              className="h-20 w-20 object-cover"
            />
          </div>
        )}
      </div>

      {/* Navegación */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-white'
                    : 'text-sidebar-foreground/70 hoverable:hover:bg-sidebar-accent hoverable:hover:text-white'
                )}
                title={collapsed ? item.title : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.badge && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Cerrar sesión */}
      <div className="border-t border-sidebar-muted p-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start text-sidebar-foreground/70 hoverable:hover:text-white hoverable:hover:bg-sidebar-accent',
            collapsed && 'justify-center px-0'
          )}
          onClick={() => signOut({ callbackUrl: '/' })}
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="ml-3">Cerrar sesión</span>}
        </Button>
      </div>

      {/* Botón colapsar */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-sidebar text-sidebar-foreground hoverable:hover:bg-sidebar-accent"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  );
}
