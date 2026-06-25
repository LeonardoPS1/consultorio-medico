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

export default function PortalNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevCount, setPrevCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
        setPrevCount(unreadCount);
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      // silently fail
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
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
      className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl border-t border-border/50 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="relative max-w-2xl mx-auto">
        {/* Scroll indicator left */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-r from-white dark:from-gray-950 to-transparent z-10 flex items-center justify-start pl-1.5 pointer-events-none"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/40" />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={scrollRef} className="flex overflow-x-auto scrollbar-none gap-3 px-6 py-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active ? 'true' : undefined}
                className={`
                  relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[60px] shrink-0
                  transition-all duration-200
                  active:scale-95
                  ${active ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground/70 hover:bg-accent/50'}
                `}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-primary/8"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative z-[1]">
                  <item.icon className={`h-[18px] w-[18px] ${active ? 'drop-shadow-sm scale-110' : ''} transition-all duration-200`} />
                  {/* Active underline indicator */}
                  {active && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-4 h-[3px] rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    />
                  )}
                </div>
                <span className="relative z-[1] text-[10px] font-medium leading-tight whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Notificaciones */}
          <Link
            href="/portal/notificaciones"
            className={`
              relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[60px] shrink-0
              transition-all duration-200
              active:scale-95
              ${pathname === '/portal/notificaciones' ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground/70 hover:bg-accent/50'}
            `}
          >
            {pathname === '/portal/notificaciones' && (
              <motion.div
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl bg-primary/8"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <div className="relative z-[1]">
              <Bell className={`h-[18px] w-[18px] ${pathname === '/portal/notificaciones' ? 'scale-110' : ''} transition-all duration-200`} />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    key={unreadCount}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 shadow-sm"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span className="relative z-[1] text-[10px] font-medium leading-tight">Alertas</span>
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[60px] shrink-0 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-all duration-200 active:scale-95"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span className="text-[10px] font-medium leading-tight">Salir</span>
          </button>
        </div>

        {/* Scroll indicator right */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-0 top-0 bottom-0 w-14 bg-gradient-to-l from-white dark:from-gray-950 to-transparent z-10 flex items-center justify-end pr-1.5 pointer-events-none"
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
