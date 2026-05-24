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
  Building2,
  Webhook,
  X,
  Star,
  Rocket,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { DEFAULT_TENANT_NAME, resolveTenantName } from '@/lib/tenant-name';
import { canAccess, getFeatureRequiredPlan, type FeatureId } from '@/lib/features';
import { LockKeyhole } from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  feature?: FeatureId;     // feature requerida (si no tiene, se muestra bloqueado)
  badge?: string;
}

const navItems: NavItem[] = [
  { title: 'Panel Principal', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Configurar', href: '/dashboard/onboarding', icon: Rocket, badge: 'Nuevo' },
  { title: 'Atención', href: '/dashboard/atencion', icon: Activity, feature: 'atencion' },
  { title: 'Turnos', href: '/dashboard/turnos', icon: Calendar, feature: 'turnos' },
  { title: 'Pacientes', href: '/dashboard/pacientes', icon: Users, feature: 'pacientes' },
  { title: 'Conversaciones', href: '/dashboard/conversaciones', icon: MessageSquare, feature: 'conversaciones' },
  { title: 'Recetas', href: '/dashboard/recetas', icon: Syringe, feature: 'recetas' },
  { title: 'Reportes', href: '/dashboard/reportes', icon: BarChart3, feature: 'reportes' },
  { title: 'Encuestas', href: '/dashboard/encuestas', icon: Star, feature: 'reportes' },
  { title: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [orgNombre, setOrgNombre] = useState(DEFAULT_TENANT_NAME);

  const cargarOrg = useCallback(() => {
    fetch('/api/organization')
      .then((r) => r.json())
      .then((res) => {
        setOrgNombre(resolveTenantName(res.data?.nombre));
      })
      .catch(() => console.warn('[Sidebar] Error al cargar organización'));
  }, []);

  useEffect(() => {
    cargarOrg();
    window.addEventListener('organization-updated', cargarOrg);
    return () => window.removeEventListener('organization-updated', cargarOrg);
  }, [cargarOrg]);

  // Toggle mobile sidebar via custom event from Header
  useEffect(() => {
    const handler = () => setMobileOpen((prev) => !prev);
    window.addEventListener('toggle-mobile-sidebar', handler);
    return () => window.removeEventListener('toggle-mobile-sidebar', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [mobileOpen]);

  // Prevent body scroll on mobile when sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Backdrop — mobile only */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          // Base
          'flex flex-col border-r bg-sidebar text-sidebar-foreground',
          // Mobile: fixed drawer overlay con slide
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out',
          'lg:relative lg:z-auto lg:transition-all lg:duration-300',
          // Mobile: slide in/out
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          // Desktop: collapse toggle
          collapsed ? 'lg:w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-32 lg:h-[172px] items-center justify-center px-2 border-b border-sidebar-muted relative">
          {!collapsed && (
            <div className="flex flex-col items-center">
              <div className="h-28 w-28 lg:h-40 lg:w-40 shrink-0">
                <img
                  src="/aicoremed_dark_1200.svg"
                  alt={orgNombre}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-semibold text-xs lg:text-sm text-center truncate max-w-[120px] lg:max-w-[160px] leading-none -mt-1">{orgNombre}</span>
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

          {/* Close button — mobile only */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 lg:hidden text-sidebar-foreground/60 hoverable:hover:text-sidebar-foreground"
            onClick={closeMobile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navegación */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const userPlan = session?.user?.plan ?? 'free';
              const hasAccess = !item.feature || canAccess(userPlan, item.feature);
              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              if (!hasAccess) {
                const requiredPlan = getFeatureRequiredPlan(item.feature!);
                return (
                  <Link
                    key={item.href}
                    href="/dashboard/configuracion?tab=suscripcion"
                    onClick={closeMobile}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      'text-sidebar-foreground/40 hoverable:hover:bg-sidebar-accent/50 hoverable:hover:text-sidebar-foreground/60'
                    )}
                    title={collapsed ? `${item.title} (Plan ${requiredPlan})` : undefined}
                  >
                    <div className="relative shrink-0">
                      <Icon className="h-5 w-5" />
                      <LockKeyhole className="h-2.5 w-2.5 absolute -top-1 -right-1 text-muted-foreground/60" />
                    </div>
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate text-sidebar-foreground/40">{item.title}</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-400 shrink-0">
                          {requiredPlan}
                        </span>
                      </>
                    )}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
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
            {/* Admin section */}
            {session?.user?.role === 'admin' && (
              <div className="mt-2 pt-2 border-t border-sidebar-muted">
                {!collapsed && (
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    Admin
                  </p>
                )}
                <Link
                  href="/dashboard/admin/tenants"
                  onClick={closeMobile}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === '/dashboard/admin/tenants'
                      ? 'bg-sidebar-accent text-white'
                      : 'text-sidebar-foreground/70 hoverable:hover:bg-sidebar-accent hoverable:hover:text-white'
                  )}
                  title={collapsed ? 'Tenants' : undefined}
                >
                  <Building2 className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">Tenants</span>}
                </Link>
                <Link
                  href="/dashboard/webhooks"
                  onClick={closeMobile}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === '/dashboard/webhooks' || pathname.startsWith('/dashboard/webhooks/')
                      ? 'bg-sidebar-accent text-white'
                      : 'text-sidebar-foreground/70 hoverable:hover:bg-sidebar-accent hoverable:hover:text-white'
                  )}
                  title={collapsed ? 'Webhooks' : undefined}
                >
                  <Webhook className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">Webhooks</span>}
                </Link>
              </div>
            )}
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
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.href = '/';
            }}
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="ml-3">Cerrar sesión</span>}
          </Button>
        </div>

        {/* Botón colapsar — desktop only */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex absolute -right-3 top-20 h-6 w-6 rounded-full border bg-sidebar text-sidebar-foreground hoverable:hover:bg-sidebar-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </aside>
    </>
  );
}
