'use client';

import {
  HeartPulse,
  PlusCircle,
  Calendar,
  FileText,
  History,
  ScrollText,
  FlaskConical,
  Upload,
  TrendingUp,
  ClipboardCheck,
  User,
  ShieldCheck,
  Bell,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PortalLogoutButton } from './logout-button';
import { PortalThemeToggle } from './theme-toggle';

/**
 * PortalSidebarDesktop — Sidebar de escritorio (icon-only, 76px fijo)
 * Se duplica la navegación localmente (evita acoplar a portal-nav.tsx).
 */

// Datos de navegación duplicados localmente
const primaryNav = [
  { href: '/portal/dashboard', label: 'Inicio', icon: HeartPulse },
  { href: '/portal/agendar', label: 'Agendar', icon: PlusCircle },
  { href: '/portal/turnos', label: 'Turnos', icon: Calendar },
];

interface SecondaryGroup {
  label: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const secondaryGroups: SecondaryGroup[] = [
  {
    label: 'Documentos',
    items: [
      { href: '/portal/recetas', label: 'Recetas', icon: FileText },
      { href: '/portal/historial', label: 'Historial', icon: History },
      { href: '/portal/certificados', label: 'Certificados', icon: ScrollText },
      { href: '/portal/ordenes-estudio', label: 'Estudios', icon: FlaskConical },
      { href: '/portal/documentos', label: 'Documentos', icon: Upload },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/portal/reportes', label: 'Reportes', icon: TrendingUp },
      { href: '/portal/encuestas', label: 'Encuestas', icon: ClipboardCheck },
      { href: '/portal/perfil', label: 'Perfil', icon: User },
      { href: '/portal/privacidad', label: 'Privacidad', icon: ShieldCheck },
    ],
  },
  {
    label: 'Ayuda',
    items: [{ href: '/portal/ayuda', label: 'Centro de ayuda', icon: HelpCircle }],
  },
];

const SIDEBAR_WIDTH = 76;
const ICON_SIZE = 20; // h-[20px] w-[20px]

/**
 *
 */
export function PortalSidebarDesktop() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/notificaciones?count=true');
      if (res.ok) {
        const data = (await res.json()) as { count?: number };
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

  const isActive = (href: string) => {
    if (href === '/portal/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  /**
   * Renderiza un ítem de navegación con tooltip.
   * @param item - Objeto con href, label e icon
   * @param item.href
   * @param item.label
   * @param item.icon
   */
  const renderNavItem = (item: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Tooltip key={item.href} delayDuration={300}>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              'h-11 w-11 rounded-full flex items-center justify-center transition-colors',
              active
                ? 'bg-portal-primary-soft text-portal-primary'
                : 'text-portal-muted-fg hover:bg-portal-muted',
            )}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className={`h-[${ICON_SIZE}px] w-[${ICON_SIZE}px]`} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" className="text-[11px]">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderDivider = () => (
    <div className="w-8 border-t border-portal-border my-2" aria-hidden="true" />
  );

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col items-center py-4',
          'bg-white dark:bg-[#1C1C22] border-r border-portal-border',
          `w-[${SIDEBAR_WIDTH}px]`,
        )}
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <Link
          href="/portal/dashboard"
          className="flex items-center justify-center mb-6"
          aria-label="Portal de Salud"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-6 w-6 text-portal-primary"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </Link>

        {/* Navegación primaria */}
        <nav className="flex flex-col gap-1 w-full items-center" aria-label="Navegación primaria">
          {primaryNav.map(renderNavItem)}
        </nav>

        {renderDivider()}

        {/* Secciones secundarias */}
        <div className="flex flex-col w-full items-center" aria-label="Secciones">
          {secondaryGroups.map((group, groupIdx) => (
            <div key={group.label} className="w-full items-center">
              {group.items.map(renderNavItem)}
              {groupIdx < secondaryGroups.length - 1 && renderDivider()}
            </div>
          ))}
        </div>

        {/* Footer: Notificaciones, Theme, Logout */}
        <div className="mt-auto flex flex-col items-center gap-2 w-full px-2">
          {/* Notificaciones */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Link
                href="/portal/notificaciones"
                className={cn(
                  'relative h-11 w-11 rounded-full flex items-center justify-center transition-colors',
                  'text-portal-muted-fg hover:bg-portal-muted',
                )}
                aria-label="Notificaciones"
              >
                <Bell className="h-[20px] w-[20px]" />
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-1 flex items-center justify-center',
                      'bg-[#2563EB] text-white rounded-full min-w-[16px] h-4 text-[10px] px-1',
                      'font-medium leading-none',
                    )}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" className="text-[11px]">
              Notificaciones
            </TooltipContent>
          </Tooltip>

          <PortalThemeToggle />
          <PortalLogoutButton />
        </div>
      </aside>
    </TooltipProvider>
  );
}
