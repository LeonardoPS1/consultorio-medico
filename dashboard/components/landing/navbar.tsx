'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronRight, MessageCircle } from 'lucide-react';
import { RegistroExpressModal } from '@/components/landing/registro-modal';

const NAV_ITEMS = [
  { label: 'Funcionalidades', href: '#features' },
  { label: 'Especialidades', href: '#specialties' },
  { label: 'Precios', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export function Navbar() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [registroOpen, setRegistroOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/85 backdrop-blur-xl border-b shadow-sm'
          : 'bg-transparent'
      }`}
    >
      {/* Scroll progress indicator */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-primary/30 origin-left"
        style={{ scaleX: 0 }}
        animate={{ scaleX: scrolled ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      />

      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/aicoremed_dark_1200.svg"
            alt="AiCoreMed"
            className="h-9 md:h-11 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => scrollTo(item.href.slice(1))}
              className="relative px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
            >
              {item.label}
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-2" />
          <Link
            href="/login"
            className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
          >
            Iniciar sesión
          </Link>
          <Button size="sm" className="ml-2 gap-1.5 btn-press" onClick={() => setRegistroOpen(true)}>
            <MessageCircle className="h-3.5 w-3.5" />
            Prueba gratis
          </Button>
        </nav>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenu(!mobileMenu)}
          aria-label="Menú"
        >
          {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden border-t bg-background/95 backdrop-blur-xl overflow-hidden"
          >
            <nav className="container mx-auto flex flex-col gap-0.5 px-4 py-5">
              {NAV_ITEMS.map((item, i) => (
                <motion.button
                  key={item.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => scrollTo(item.href.slice(1))}
                  className="flex items-center justify-between rounded-lg px-4 py-3 text-sm hover:bg-muted active:bg-muted/80 transition-colors min-h-[48px]"
                >
                  <span>{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                </motion.button>
              ))}
              <div className="border-t my-3" />
              <Link
                href="/login"
                className="flex items-center justify-between rounded-lg px-4 py-3 text-sm hover:bg-muted active:bg-muted/80 transition-colors min-h-[48px]"
                onClick={() => setMobileMenu(false)}
              >
                <span>Iniciar sesión</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </Link>
              <div className="mt-2 px-0">
              <Button className="w-full gap-2 min-h-[48px] text-sm" onClick={() => { setMobileMenu(false); setRegistroOpen(true); }}>
                <MessageCircle className="h-4 w-4" />
                Prueba gratis
              </Button>
              </div>
              <p className="text-[11px] text-muted-foreground/60 text-center mt-3">
                Sin tarjeta de crédito · 14 días gratis
              </p>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registro exprés modal */}
      <RegistroExpressModal
        open={registroOpen}
        onOpenChange={setRegistroOpen}
      />
    </header>
  );
}
