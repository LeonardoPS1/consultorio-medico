'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  FileText,
  MessageSquare,
  User,
  PlusCircle,
  Package,
  Bell,
  PenTool,
  FlaskConical,
  ClipboardCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  History,
  HeartPulse,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';

// ─── Nav Items ──────────────────────────────────────────────
const navItems = [
  { href: '/portal/dashboard', label: 'Inicio', icon: HeartPulse },
  { href: '/portal/agendar', label: 'Agendar', icon: PlusCircle },
  { href: '/portal/turnos', label: 'Turnos', icon: Calendar },
  { href: '/portal/mensajes', label: 'Chat', icon: MessageSquare },
  { href: '/portal/recetas', label: 'Recetas', icon: FileText },
  { href: '/portal/historial', label: 'Historial', icon: History },
  { href: '/portal/reportes', label: 'Reportes', icon: TrendingUp },
  { href: '/portal/certificados', label: 'Certificados', icon: ScrollText },
  { href: '/portal/consentimientos', label: 'Docs', icon: PenTool },
  { href: '/portal/encuestas', label: 'Encuestas', icon: ClipboardCheck },
  { href: '/portal/ordenes-estudio', label: 'Estudios', icon: FlaskConical },
  { href: '/portal/paquetes', label: 'Paquetes', icon: Package },
  { href: '/portal/perfil', label: 'Perfil', icon: User },
];

// ─── Motion variants ────────────────────────────────────────
const itemVariants = {
  idle: { scale: 1, y: 0 },
  hover: {
    scale: 1.05,
    y: -1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 17,
    },
  },
  tap: {
    scale: 0.92,
    transition: {
      type: 'spring' as const,
      stiffness: 600,
      damping: 20,
    },
  },
};

const scrollIndicatorVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

const badgeVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 15,
      mass: 0.5,
    },
  },
  exit: { scale: 0, opacity: 0, transition: { duration: 0.15 } },
} as const;

// ─── Component ──────────────────────────────────────────────
export default function PortalNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [mounted, setMounted] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

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
    setMounted(true);
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll]);

  useEffect(() => {
    if (!scrollRef.current || !pathname) return;
    const activeEl = scrollRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/portal/logout', { method: 'POST' });
    window.location.href = '/portal';
  }

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/portal/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Glass background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'var(--portal-glass-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--portal-glass-border)',
          boxShadow:
            '0 -4px 20px hsl(225 8% 14% / 0.04), 0 -1px 4px hsl(225 8% 14% / 0.02)',
        }}
      />

      <div className="relative max-w-2xl mx-auto">
        {/* ── Scroll Left Indicator ── */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.div
              key="scroll-left"
              variants={scrollIndicatorVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="absolute left-0 top-0 bottom-0 w-14 z-10 flex items-center justify-start pointer-events-none"
              style={{
                background:
                  'linear-gradient(to right, hsl(var(--portal-bg)) 20%, transparent)',
              }}
            >
              <div
                className="ml-2 flex items-center justify-center w-5 h-5 rounded-full"
                style={{ background: 'hsl(var(--portal-muted) / 0.6)' }}
              >
                <ChevronLeft
                  className="h-3 w-3"
                  style={{ color: 'hsl(var(--portal-muted-foreground) / 0.5)' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Scrollable Nav Items ── */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-none gap-0.5 px-4 py-2"
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <motion.div
                key={item.href}
                variants={itemVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
                className="shrink-0"
              >
                <Link
                  href={item.href}
                  data-active={active ? 'true' : undefined}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[60px] transition-colors duration-150"
                  style={{
                    color: active
                      ? 'hsl(var(--portal-primary))'
                      : 'hsl(var(--portal-muted-foreground) / 0.6)',
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Active pill background */}
                  {active && mounted && (
                    <motion.div
                      layoutId="portal-nav-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'hsl(var(--portal-primary) / 0.1)',
                        boxShadow: '0 1px 2px hsl(var(--portal-primary) / 0.05)',
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 28,
                        mass: 0.5,
                      }}
                    />
                  )}

                  {/* Icon */}
                  <div className="relative z-[1] flex flex-col items-center">
                    <item.icon
                      className="h-[18px] w-[18px] transition-all duration-200"
                      style={{
                        filter: active
                          ? 'drop-shadow(0 1px 2px hsl(var(--portal-primary) / 0.3))'
                          : 'none',
                        transform: active ? 'scale(1.1)' : 'scale(1)',
                      }}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className="relative z-[1] text-[10px] font-medium leading-tight whitespace-nowrap transition-all duration-150"
                    style={{
                      color: active
                        ? 'hsl(var(--portal-primary))'
                        : 'hsl(var(--portal-muted-foreground) / 0.6)',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            );
          })}

          {/* ── Divider ── */}
          <div
            className="shrink-0 w-px mx-1 self-center h-8"
            style={{ background: 'hsl(var(--portal-border-light))' }}
          />

          {/* ── Notificaciones ── */}
          <motion.div
            variants={itemVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            className="shrink-0"
          >
            <Link
              href="/portal/notificaciones"
              className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[60px]"
              style={{
                color:
                  pathname === '/portal/notificaciones'
                    ? 'hsl(var(--portal-primary))'
                    : 'hsl(var(--portal-muted-foreground) / 0.6)',
              }}
              aria-current={pathname === '/portal/notificaciones' ? 'page' : undefined}
            >
              {pathname === '/portal/notificaciones' && mounted && (
                <motion.div
                  layoutId="portal-nav-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'hsl(var(--portal-primary) / 0.1)',
                    boxShadow: '0 1px 2px hsl(var(--portal-primary) / 0.05)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 28,
                    mass: 0.5,
                  }}
                />
              )}
              <div className="relative z-[1] flex flex-col items-center">
                <Bell
                  className="h-[18px] w-[18px] transition-all duration-200"
                  style={{
                    transform:
                      pathname === '/portal/notificaciones' ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
                <AnimatePresence mode="popLayout">
                  {unreadCount > 0 && (
                    <motion.span
                      key={unreadCount}
                      variants={badgeVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      layout
                      className="absolute -top-1.5 -right-1.5 text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 shadow-sm"
                      style={{
                        background: 'hsl(var(--portal-destructive))',
                        color: '#fff',
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <span
                className="relative z-[1] text-[10px] font-medium leading-tight whitespace-nowrap"
                style={{
                  color:
                    pathname === '/portal/notificaciones'
                      ? 'hsl(var(--portal-primary))'
                      : 'hsl(var(--portal-muted-foreground) / 0.6)',
                }}
              >
                Alertas
              </span>
            </Link>
          </motion.div>

          {/* ── Logout ── */}
          <motion.div
            variants={itemVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            className="shrink-0"
          >
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[60px] transition-colors duration-150"
              style={{
                color: 'hsl(var(--portal-muted-foreground) / 0.4)',
              }}
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium leading-tight">Salir</span>
            </button>
          </motion.div>
        </div>

        {/* ── Scroll Right Indicator ── */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.div
              key="scroll-right"
              variants={scrollIndicatorVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="absolute right-0 top-0 bottom-0 w-14 z-10 flex items-center justify-end pointer-events-none"
              style={{
                background:
                  'linear-gradient(to left, hsl(var(--portal-bg)) 20%, transparent)',
              }}
            >
              <div
                className="mr-2 flex items-center justify-center w-5 h-5 rounded-full"
                style={{ background: 'hsl(var(--portal-muted) / 0.6)' }}
              >
                <ChevronRight
                  className="h-3 w-3"
                  style={{ color: 'hsl(var(--portal-muted-foreground) / 0.5)' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
