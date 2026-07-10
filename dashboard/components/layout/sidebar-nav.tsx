'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  BarChart3,
  Sliders,
  Syringe,
  Activity,
  Building2,
  Store,
  Webhook,
  ScrollText,
  HardDrive,
  Network,
  Star,
  Rocket,
  BookOpen,
  ListChecks,
  Bell,
  Newspaper,
  Info,
  ArrowRightLeft,
  Ban,
  FileSignature,
  LockKeyhole,
  Video,
  Smartphone,
  Settings,
} from 'lucide-react';
import type { FeatureId } from '@/lib/features';
import { canAccess, getFeatureRequiredPlan } from '@/lib/features';
import { useFeatureFlags } from '@/lib/feature-flags-context';
import { Skeleton } from '@/components/ui/skeleton';
import { N8nStatusIndicator } from '@/components/layout/n8n-status-indicator';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  feature?: FeatureId;
  badge?: string;
}

const navItems: NavItem[] = [
  { title: 'Panel Principal', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Configuración Inicial', href: '/dashboard/onboarding', icon: Rocket, feature: 'onboarding' },
  { title: 'Atención', href: '/dashboard/atencion', icon: Activity, feature: 'atencion' },
  { title: 'Telemedicina', href: '/dashboard/telemedicina', icon: Video, feature: 'telemedicina' },
  { title: 'Turnos', href: '/dashboard/turnos', icon: Calendar, feature: 'turnos' },
  { title: 'Pacientes', href: '/dashboard/pacientes', icon: Users, feature: 'pacientes' },
  { title: 'Conversaciones', href: '/dashboard/conversaciones', icon: MessageSquare, feature: 'conversaciones' },
  { title: 'Historial', href: '/dashboard/historial', icon: FileText, feature: 'historial' },
  { title: 'Recetas', href: '/dashboard/recetas', icon: Syringe, feature: 'recetas' },
  { title: 'Reportes', href: '/dashboard/reportes', icon: BarChart3, feature: 'reportes' },
  { title: 'Encuestas', href: '/dashboard/encuestas', icon: Star, feature: 'encuestas' },
  { title: 'Lista de Espera', href: '/dashboard/lista-espera', icon: ListChecks, feature: 'lista-espera' },
  { title: 'Derivaciones', href: '/dashboard/derivaciones', icon: ArrowRightLeft, feature: 'derivaciones' },
  { title: 'Lista Negra', href: '/dashboard/blacklist', icon: Ban, feature: 'blacklist' },
  { title: 'Consentimientos', href: '/dashboard/consentimientos', icon: FileSignature, feature: 'consentimiento-informado' },
  { title: 'Notificaciones', href: '/dashboard/notificaciones', icon: Bell },
  { title: 'Ajustes', href: '/dashboard/configuracion', icon: Sliders },
  { title: 'Novedades', href: '/dashboard/novedades', icon: Newspaper },
  { title: 'Ayuda', href: '/dashboard/ayuda', icon: BookOpen },
  { title: 'Acerca de', href: '/dashboard/acerca', icon: Info },
];

interface NavItemLinkProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  hasAccess: boolean;
  requiredPlan?: string;
  closeMobile: () => void;
  onboardingPending?: boolean;
}

function NavItemLink({ item, collapsed, isActive, hasAccess, requiredPlan, closeMobile, onboardingPending }: NavItemLinkProps) {
  if (!hasAccess) {
    return (
      <Link
        href="/dashboard/configuracion?tab=suscripcion"
        onClick={closeMobile}
        className={cn(
          'nav-item-hover flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
          'text-sidebar-foreground/40 hoverable:hover:bg-sidebar-accent/50 hoverable:hover:text-sidebar-foreground/60',
        )}
        title={collapsed ? `${item.title} (Plan ${requiredPlan})` : undefined}
      >
        <div className="relative shrink-0">
          <item.icon className="h-5 w-5" />
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
      href={item.href}
      onClick={closeMobile}
      className={cn(
        isActive
          ? 'nav-active-indicator bg-sidebar-accent text-white'
          : 'text-sidebar-foreground/70 nav-item-hover',
        'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
        !isActive && 'hoverable:hover:bg-sidebar-accent hoverable:hover:text-white',
      )}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.title : undefined}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.title}</span>
          {item.badge && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
              {item.badge}
            </span>
          )}
          {onboardingPending && item.title === 'Configuración Inicial' && (
            <span className="flex h-5 items-center rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-400 text-[9px] font-semibold px-1.5 uppercase tracking-wider shrink-0 ml-1">
              Continuar
            </span>
          )}
        </>
      )}
    </Link>
  );
}

interface AdminLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  closeMobile: () => void;
  pathname: string;
}

function AdminLink({ href, icon: Icon, label, collapsed, closeMobile, pathname }: AdminLinkProps) {
  const isActive = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      onClick={closeMobile}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
        isActive
          ? 'nav-active-indicator bg-sidebar-accent text-white'
          : 'text-sidebar-foreground/70 nav-item-hover hoverable:hover:bg-sidebar-accent hoverable:hover:text-white',
      )}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
    </Link>
  );
}

const adminLinks: { href: string; icon: React.ElementType; label: string; customIcon?: boolean }[] = [
  { href: '/dashboard/admin/sistema', icon: Settings, label: 'Sistema' },
  { href: '/dashboard/admin/tenants', icon: Building2, label: 'Tenants' },
  { href: '/dashboard/admin/sucursales', icon: Store, label: 'Sucursales' },
  { href: '/dashboard/admin/auditoria', icon: ScrollText, label: 'Auditoría' },
  { href: '/dashboard/admin/backups', icon: HardDrive, label: 'Backups' },
  { href: '/dashboard/admin/n8n', icon: Network, label: 'n8n', customIcon: true },
  { href: '/dashboard/admin/rendimiento', icon: BarChart3, label: 'Rendimiento' },
  { href: '/dashboard/admin/portal-analytics', icon: Smartphone, label: 'Portal Analytics' },
  { href: '/dashboard/webhooks', icon: Webhook, label: 'Webhooks' },
];

function AdminSection({
  collapsed,
  closeMobile,
  pathname,
}: {
  collapsed: boolean;
  closeMobile: () => void;
  pathname: string;
}) {
  return (
    <div className="mt-2 pt-2 border-t border-sidebar-muted">
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Admin
        </p>
      )}
      {adminLinks.map((link) =>
        link.customIcon ? (
          <Link
            key={link.href}
            href={link.href}
            onClick={closeMobile}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
              (pathname === link.href || pathname.startsWith(link.href + '/'))
                ? 'nav-active-indicator bg-sidebar-accent text-white'
                : 'text-sidebar-foreground/70 nav-item-hover hoverable:hover:bg-sidebar-accent hoverable:hover:text-white',
            )}
            aria-current={
              pathname === link.href || pathname.startsWith(link.href + '/') ? 'page' : undefined
            }
            title={collapsed ? link.label : undefined}
          >
            <span className="relative inline-flex shrink-0">
              <link.icon className="h-5 w-5" />
              {link.label === 'n8n' && <N8nStatusIndicator />}
            </span>
            {!collapsed && <span className="flex-1 truncate">{link.label}</span>}
          </Link>
        ) : (
          <AdminLink
            key={link.href}
            href={link.href}
            icon={link.icon}
            label={link.label}
            collapsed={collapsed}
            closeMobile={closeMobile}
            pathname={pathname}
          />
        ),
      )}
    </div>
  );
}

interface SidebarNavProps {
  collapsed: boolean;
  closeMobile: () => void;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  session: any;
  onboardingPending: boolean;
}

export function SidebarNav({ collapsed, closeMobile, status, session, onboardingPending }: SidebarNavProps) {
  const pathname = usePathname() ?? '';
  const { isFeatureEnabled } = useFeatureFlags();

  return (
    <nav className="space-y-1 px-2" aria-label="Navegación principal">
      {status === 'loading' ? (
        navItems.map((item) => (
          <div key={item.href} className="flex items-center gap-3 rounded-lg px-3 py-3">
            <Skeleton className="h-5 w-5 shrink-0 rounded-md" />
            {!collapsed && <Skeleton className="h-4 flex-1 max-w-[120px]" />}
          </div>
        ))
      ) : (
        <>
          {navItems.map((item) => {
            const userPlan = session?.user?.plan ?? 'free';
            const hasAccess =
              !item.feature ||
              (canAccess(userPlan, item.feature) && isFeatureEnabled(item.feature));
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <NavItemLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={isActive}
                hasAccess={hasAccess}
                requiredPlan={item.feature ? getFeatureRequiredPlan(item.feature) : undefined}
                closeMobile={closeMobile}
                onboardingPending={onboardingPending}
              />
            );
          })}
          {session?.user?.role === 'admin' && (
            <AdminSection collapsed={collapsed} closeMobile={closeMobile} pathname={pathname} />
          )}
        </>
      )}
    </nav>
  );
}
