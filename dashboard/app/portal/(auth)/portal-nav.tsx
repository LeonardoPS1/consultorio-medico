'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
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
  TrendingUp,
  History,
  HeartPulse,
  ScrollText,
  ChevronLeft,
  ChevronRight,
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

// ─── Helper: compute CSS mask class ─────────────────────────
function scrollMaskClass(left: boolean, right: boolean): string {
  if (left && right) return 'portal-nav-scroll-mask-both';
  if (left) return 'portal-nav-scroll-mask-start';
  if (right) return 'portal-nav-scroll-mask-end';
  return '';
}

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

  const SCROLL_AMOUNT = 220;

  function scrollNav(direction: 'left' | 'right') {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -SCROLL_AMOUNT : SCROLL_AMOUNT;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  }

  const maskClass = scrollMaskClass(canScrollLeft, canScrollRight);

  return (
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
          boxShadow:
            '0 -4px 20px hsl(225 8% 14% / 0.04), 0 -1px 4px hsl(225 8% 14% / 0.02)',
        }}
      />

      <div className="relative max-w-2xl mx-auto">
        {/* ── Scroll Left Arrow ── */}
        {canScrollLeft && (
          <button
            onClick={() => scrollNav('left')}
            className="absolute left-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center transition-opacity duration-200 hover:opacity-100"
            style={{ opacity: 0.7 }}
            aria-label="Navegar a la izquierda"
          >
            <div
              className="flex items-center justify-center w-6 h-6 rounded-full"
              style={{ background: 'hsl(var(--portal-muted) / 0.8)' }}
            >
              <ChevronLeft
                className="h-4 w-4"
                style={{ color: 'hsl(var(--portal-muted-foreground) / 0.6)' }}
              />
            </div>
          </button>
        )}

        {/* ── Scroll Right Arrow ── */}
        {canScrollRight && (
          <button
            onClick={() => scrollNav('right')}
            className="absolute right-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center transition-opacity duration-200 hover:opacity-100"
            style={{ opacity: 0.7 }}
            aria-label="Navegar a la derecha"
          >
            <div
              className="flex items-center justify-center w-6 h-6 rounded-full"
              style={{ background: 'hsl(var(--portal-muted) / 0.8)' }}
            >
              <ChevronRight
                className="h-4 w-4"
                style={{ color: 'hsl(var(--portal-muted-foreground) / 0.6)' }}
              />
            </div>
          </button>
        )}

        {/* ── Scrollable Nav Items ── */}
        <div
          ref={scrollRef}
          className={`flex overflow-x-auto scrollbar-none gap-0.5 px-4 py-2 portal-nav-scroll ${maskClass}`}
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
                  className="portal-nav-item relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors duration-150"
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
                      className="absolute inset-0 rounded-xl portal-nav-pill"
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
className="h-[18px] w-[18px] transition-[color,transform] duration-200"
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
                    className="relative z-[1] text-[10px] font-medium leading-tight whitespace-nowrap transition-[color] duration-150"
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
              className="portal-nav-item relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors duration-150"
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
                  className="absolute inset-0 rounded-xl portal-nav-pill"
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
                  className="h-[18px] w-[18px] transition-[color,transform] duration-200"
                  style={{
                    transform:
                      pathname === '/portal/notificaciones'
                        ? 'scale(1.1)'
                        : 'scale(1)',
                  }}
                />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 shadow-sm"
                    style={{
                      background: 'hsl(var(--portal-destructive))',
                      color: '#fff',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
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
              className="portal-nav-item flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors duration-150"
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
      </div>
    </nav>
  );
}
