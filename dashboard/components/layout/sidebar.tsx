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
import { useState } from 'react';
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

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-muted">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 52.59 52.59 0 0 0-.49-6.347M5.207 7.562a3.375 3.375 0 1 1 5.586 0m0 0c.26.36.455.767.586 1.197m0 0a3.375 3.375 0 1 1 5.586 0M12 20.904V16.5"
                />
              </svg>
            </div>
            <span className="font-semibold text-sm">Consultorio</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 52.59 52.59 0 0 0-.49-6.347M5.207 7.562a3.375 3.375 0 1 1 5.586 0m0 0c.26.36.455.767.586 1.197m0 0a3.375 3.375 0 1 1 5.586 0M12 20.904V16.5"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Navegación */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-white'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white'
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
            'w-full justify-start text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent',
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
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent"
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
