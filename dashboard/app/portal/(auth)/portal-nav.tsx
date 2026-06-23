'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, FileText, MessageSquare, User, PlusCircle,
  Package, Bell, PenTool, FlaskConical, ClipboardCheck,
  LogOut, ChevronLeft, ChevronRight, TrendingUp,
} from 'lucide-react';

const navItems = [
  { href: '/portal/dashboard', label: 'Inicio', icon: User },
  { href: '/portal/agendar', label: 'Agendar', icon: PlusCircle },
  { href: '/portal/turnos', label: 'Turnos', icon: Calendar },
  { href: '/portal/mensajes', label: 'Chat', icon: MessageSquare },
  { href: '/portal/recetas', label: 'Recetas', icon: FileText },
  { href: '/portal/reportes', label: 'Reportes', icon: TrendingUp },
  { href: '/portal/certificados', label: 'Certificados', icon: FileText },
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200/60 dark:border-gray-800/60 z-20 transition-colors duration-300" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="relative max-w-lg mx-auto">
        {/* Scroll indicator left */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 flex items-center justify-start pl-1 pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4 text-gray-400 dark:text-gray-600" />
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-none gap-1 px-2 py-1.5"
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active ? 'true' : undefined}
                className={`
                  relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[64px] shrink-0
                  transition-all duration-200
                  ${active
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
                  }
                `}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-blue-50/80 dark:bg-blue-950/40"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="relative text-[10px] font-medium leading-tight whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Notificaciones */}
          <Link
            href="/portal/notificaciones"
            className={`
              relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[64px] shrink-0
              transition-all duration-200
              ${pathname === '/portal/notificaciones'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
              }
            `}
          >
            {pathname === '/portal/notificaciones' && (
              <motion.div
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl bg-blue-50/80 dark:bg-blue-950/40"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <div className="relative">
              <Bell className="h-5 w-5" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    key={unreadCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 shadow-sm"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span className="relative text-[10px] font-medium leading-tight">
              Alertas
            </span>
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[64px] shrink-0 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-950/30 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
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
              className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 flex items-center justify-end pr-1 pointer-events-none"
            >
              <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
