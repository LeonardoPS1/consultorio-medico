'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  Calendar,
  MessageSquare,
  PlusCircle,
  HeartPulse,
  MoreHorizontal,
  FileText,
  History,
  TrendingUp,
  ScrollText,
  PenTool,
  ClipboardCheck,
  FlaskConical,
  Package,
  User,
  Bell,
  LogOut,
  X,
  Upload,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

// ─── Navigation Data ────────────────────────────────────────
const primaryNav = [
  { href: '/portal/dashboard', label: 'Inicio', icon: HeartPulse },
  { href: '/portal/agendar', label: 'Agendar', icon: PlusCircle },
  { href: '/portal/turnos', label: 'Turnos', icon: Calendar },
  { href: '/portal/mensajes', label: 'Chat', icon: MessageSquare },
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
      { href: '/portal/certificados', label: 'Certificados', icon: ScrollText },
      { href: '/portal/consentimientos', label: 'Docs Legales', icon: PenTool },
      { href: '/portal/ordenes-estudio', label: 'Estudios', icon: FlaskConical },
      { href: '/portal/documentos', label: 'Documentos Subidos', icon: Upload },
    ],
  },
  {
    label: 'Actividad',
    items: [
      { href: '/portal/historial', label: 'Historial', icon: History },
      { href: '/portal/reportes', label: 'Reportes', icon: TrendingUp },
      { href: '/portal/encuestas', label: 'Encuestas', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/portal/paquetes', label: 'Paquetes', icon: Package },
      { href: '/portal/perfil', label: 'Perfil', icon: User },
    ],
  },
];

// ─── Motion variants ────────────────────────────────────────
const itemVariants = {
  idle: { scale: 1, y: 0 },
  hover: {
    scale: 1.05,
    y: -1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 17 },
  },
  tap: {
    scale: 0.92,
    transition: { type: 'spring' as const, stiffness: 600, damping: 20 },
  },
};

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  mounted,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  active: boolean;
  mounted: boolean;
}) {
  return (
    <Link
      href={href}
      data-active={active ? 'true' : undefined}
      className={cn(
        'relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors duration-150 min-w-[55px]',
        active ? 'text-portal-primary' : 'text-portal-muted-fg/60',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {active && mounted && (
        <motion.div
          layoutId="portal-nav-pill"
          className="absolute inset-0 rounded-xl portal-nav-pill"
          transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.5 }}
        />
      )}
      <div className="relative z-[1] flex flex-col items-center">
        <Icon
          className="h-[18px] w-[18px] transition-[color,transform] duration-200"
          style={{
            filter: active ? 'drop-shadow(0 1px 2px hsl(var(--portal-primary) / 0.3))' : 'none',
            transform: active ? 'scale(1.1)' : 'scale(1)',
          }}
        />
      </div>
      <span
        className={cn(
          'relative z-[1] text-[10px] font-medium leading-tight whitespace-nowrap transition-[color] duration-150',
          active ? 'text-portal-primary font-semibold' : 'text-portal-muted-fg/60 font-medium',
        )}
      >
        {label}
      </span>
    </Link>
  );
}

function SecondaryItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
        active
          ? 'bg-portal-primary/10 text-portal-primary font-semibold'
          : 'text-portal-muted-fg/70 hover:bg-portal-muted/40 hover:text-portal-fg',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg',
          active ? 'bg-portal-primary/15' : 'bg-portal-muted/50',
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-portal-primary" />}
    </Link>
  );
}

// ─── Component ──────────────────────────────────────────────
export default function PortalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/notificaciones?count=true');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/portal/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  const isSheetOpen = (href: string) => {
    if (!pathname) return false;
    const allSecondary = secondaryGroups.flatMap((g) => g.items).concat(
      { href: '/portal/notificaciones', label: '', icon: Bell },
    );
    return allSecondary.some((i) => {
      if (i.href === '/portal/dashboard') return pathname === i.href;
      return pathname.startsWith(i.href);
    });
  };

  const sheetActive = isSheetOpen('/portal/recetas');

  const hasUnread = unreadCount > 0;

  async function handleLogout() {
    await fetch('/api/portal/logout', { method: 'POST' });
    window.location.href = '/portal';
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Glass background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'var(--portal-glass-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid var(--portal-glass-border)',
            boxShadow: '0 -4px 20px hsl(225 8% 14% / 0.04), 0 -1px 4px hsl(225 8% 14% / 0.02)',
          }}
        />

        <div className="relative max-w-2xl mx-auto">
          <div className="flex justify-around items-center px-2 py-1.5">
            {primaryNav.map((item) => (
              <motion.div
                key={item.href}
                variants={itemVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
              >
                <NavItem
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href)}
                  mounted={mounted}
                />
              </motion.div>
            ))}

            {/* ── Más button ── */}
            <motion.div
              variants={itemVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
            >
              <button
                onClick={() => setSheetOpen(true)}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors duration-150 min-w-[55px]',
                  sheetActive ? 'text-portal-primary' : 'text-portal-muted-fg/60',
                )}
                aria-label="Más opciones"
              >
                {sheetActive && mounted && (
                  <motion.div
                    layoutId="portal-nav-pill"
                    className="absolute inset-0 rounded-xl portal-nav-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.5 }}
                  />
                )}
                <div className="relative z-[1] flex flex-col items-center">
                  <MoreHorizontal
                    className="h-[18px] w-[18px]"
                    style={{
                      transform: sheetActive ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                  {hasUnread && (
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 shadow-sm bg-portal-destructive text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'relative z-[1] text-[10px] font-medium leading-tight whitespace-nowrap',
                    sheetActive ? 'text-portal-primary font-semibold' : 'text-portal-muted-fg/60 font-medium',
                  )}
                >
                  Más
                </span>
              </button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* ── Más Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t-0 p-0 max-h-[70vh] overflow-y-auto"
          style={{
            background: 'var(--portal-glass-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-2 border-b border-portal-border-light"
            style={{
              background: 'var(--portal-glass-bg)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <SheetTitle className="text-sm font-semibold text-portal-fg">Más opciones</SheetTitle>
            <button
              onClick={() => setSheetOpen(false)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-portal-muted-fg/60 hover:text-portal-fg hover:bg-portal-muted/50 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 py-3 space-y-5">
            {/* Secondary groups */}
            {secondaryGroups.map((group) => (
              <div key={group.label}>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-portal-muted-fg/50 px-1 mb-1.5">
                  {group.label}
                </span>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <SecondaryItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={isActive(item.href)}
                      onNavigate={() => setSheetOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Divider */}
            <div className="border-t border-portal-border-light" />

            {/* Notificaciones */}
            <div className="space-y-0.5">
              <Link
                href="/portal/notificaciones"
                onClick={() => setSheetOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
                  pathname === '/portal/notificaciones'
                    ? 'bg-portal-primary/10 text-portal-primary font-semibold'
                    : 'text-portal-muted-fg/70 hover:bg-portal-muted/40 hover:text-portal-fg',
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg relative',
                  pathname === '/portal/notificaciones' ? 'bg-portal-primary/15' : 'bg-portal-muted/50',
                )}>
                  <Bell className="h-4 w-4" />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 shadow-sm bg-portal-destructive text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-sm">Notificaciones</span>
                {hasUnread && (
                  <span className="ml-auto text-xs font-medium text-portal-destructive">
                    {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
                  </span>
                )}
                {pathname === '/portal/notificaciones' && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-portal-primary" />
                )}
              </Link>
            </div>

            {/* Logout */}
            <div className="pb-4">
              <button
                onClick={() => {
                  setSheetOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl transition-all duration-150 text-portal-muted-fg/70 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-portal-muted/50">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-sm">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
