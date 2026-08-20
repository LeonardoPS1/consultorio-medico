'use client';

import { Bell, Plus, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AvatarInitials } from './avatar-initials';
import { PulseLine } from './pulse-line';
import { PortalThemeToggle } from './theme-toggle';

/**
 * PortalTopbar — Topbar de escritorio (hidden lg:block)
 * Resuelve el título internamente vía usePathname (NO recibe props).
 * Home → 'Inicio' / 'Tu espacio de salud' estático + showPulse.
 * NO hace fetch a /api/portal/me.
 */

const TITLES: Record<string, { title: string; subtitle?: string; showPulse?: boolean }> = {
  '/portal/dashboard': { title: 'Inicio', subtitle: 'Tu espacio de salud', showPulse: true },
  '/portal/agendar': { title: 'Agendar cita', subtitle: 'Elegí médico y horario' },
  '/portal/turnos': { title: 'Mis turnos' },
  '/portal/recetas': { title: 'Mis recetas' },
  '/portal/historial': { title: 'Historial clínico' },
  '/portal/certificados': { title: 'Certificados médicos' },
  '/portal/consentimientos': { title: 'Docs legales' },
  '/portal/ordenes-estudio': { title: 'Órdenes de estudio' },
  '/portal/documentos': { title: 'Documentos' },
  '/portal/paquetes': { title: 'Paquetes' },
  '/portal/reportes': { title: 'Reportes de salud' },
  '/portal/encuestas': { title: 'Encuestas' },
  '/portal/perfil': { title: 'Mi perfil' },
  '/portal/privacidad': { title: 'Privacidad y accesos' },
  '/portal/notificaciones': { title: 'Notificaciones' },
};

const CENTER_PILLS = [
  { href: '/portal/recetas', label: 'Recetas' },
  { href: '/portal/historial', label: 'Historial' },
  { href: '/portal/reportes', label: 'Reportes' },
  { href: '/portal/perfil', label: 'Perfil' },
];

/**
 * PortalTopbar — Topbar de escritorio (hidden lg:block)
 * Resuelve el título internamente vía usePathname (NO recibe props).
 * Home → 'Inicio' / 'Tu espacio de salud' estático + showPulse.
 * NO hace fetch a /api/portal/me.
 */
export function PortalTopbar() {
  const pathname = usePathname();
  const { title, subtitle, showPulse } = TITLES[pathname] ?? { title: 'Portal', subtitle: undefined, showPulse: false };
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

  return (
    <header
      className={cn(
        'sticky top-0 z-20 hidden lg:block',
        'bg-white/90 dark:bg-[#1C1C22]/90 backdrop-blur',
        'border-b border-portal-border',
        'h-16'
      )}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center gap-4">
        {/* Izquierda: título + pulso */}
        <div className="flex items-center gap-3">
          {showPulse && <PulseLine className="text-portal-primary" />}
          <div className="flex flex-col leading-tight">
            <h1 className="text-[20px] font-semibold tracking-[0.01em] text-portal-fg">
              {title}
            </h1>
            {subtitle && (
              <span className="text-[13px] text-portal-muted-fg">{subtitle}</span>
            )}
          </div>
        </div>

        {/* Centro: pills de acceso rápido */}
        <nav className="ml-10 hidden md:flex items-center gap-1" aria-label="Accesos rápidos">
          {CENTER_PILLS.map((pill) => {
            const active = pathname.startsWith(pill.href);
            return (
              <Link
                key={pill.href}
                href={pill.href}
                className={cn(
                  'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
                  active ? 'bg-portal-primary-soft text-portal-primary' : 'text-portal-muted-fg hover:bg-portal-muted'
                )}
                aria-current={active ? 'page' : undefined}
              >
                {pill.label}
              </Link>
            );
          })}
        </nav>

        {/* Derecha: campana + avatar + toggle + CTA */}
        <div className="ml-auto flex items-center gap-3">
          {/* Notificaciones */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Link
                href="/portal/notificaciones"
                className={cn(
                  'relative h-9 w-9 rounded-full flex items-center justify-center transition-colors',
                  'text-portal-muted-fg hover:bg-portal-muted'
                )}
                aria-label="Notificaciones"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-1 flex items-center justify-center',
                      'bg-[#2563EB] text-white rounded-full min-w-[16px] h-4 text-[10px] px-1',
                      'font-medium leading-none'
                    )}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" className="text-[11px]">
              Notificaciones
            </TooltipContent>
          </Tooltip>

          {/* Ayuda */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Link
                href="/portal/ayuda"
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center transition-colors',
                  'text-portal-muted-fg hover:bg-portal-muted hover:text-[#2563EB]'
                )}
                aria-label="Centro de ayuda"
              >
                <HelpCircle className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" className="text-[11px]">
              Centro de ayuda
            </TooltipContent>
          </Tooltip>

          {/* Separador */}
          <div className="w-px h-5 bg-portal-border" aria-hidden="true" />

          {/* Avatar → perfil */}
          <Link href="/portal/perfil" className="h-9 w-9" aria-label="Mi perfil">
            <AvatarInitials nombre="" apellido="" className="h-9 w-9 text-sm" />
          </Link>

          {/* Toggle tema */}
          <PortalThemeToggle />

          {/* CTA Agendar */}
          <Link
            href="/portal/agendar"
            className={cn(
              'rounded-full bg-[#2563EB] hover:bg-[#3B82F6] text-white',
              'px-5 py-2 text-sm font-semibold flex items-center gap-1 transition-colors'
            )}
            aria-label="Agendar nueva cita"
          >
            <Plus className="h-4 w-4" />
            Agendar
          </Link>
        </div>
      </div>
    </header>
  );
}