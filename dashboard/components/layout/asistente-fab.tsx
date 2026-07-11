/**
 * AsistenteFAB — Botón flotante del asistente IA.
 *
 * ✨ REDISEÑO 2026 — Más compacto, glow refinado, tooltip nativo.
 *
 * Características:
 * - 52px con gradiente vibrante
 * - Glow pulsante sutíl (sin distraer)
 * - Badge de sugerencias con animación spring
 * - Tooltip con shortcut en desktop
 * - Loading spinner cuando está procesando
 */

'use client';

import { Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { MODOS_ASISTENTE } from '@/lib/ia/asistente-prompts';

export function AsistenteFAB() {
  const { open, toggle, sugerenciasPendientes, modo, cargando } = useAsistenteIA();

  const modoInfo = MODOS_ASISTENTE.find((m) => m.id === modo);
  const tieneSugerencias = !open && sugerenciasPendientes > 0;
  const mostrarBadge = modo !== 'silencioso' && tieneSugerencias;

  return (
    <motion.button
      onClick={toggle}
      className="group fixed bottom-5 right-5 z-30 flex h-13 w-13 items-center justify-center rounded-full shadow-lg shadow-[var(--fab-glow)] transition-shadow hover:shadow-xl hover:shadow-[var(--fab-glow)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fab-glow)] focus-visible:ring-offset-2 active:scale-95"
      style={{
        background: 'var(--fab-gradient)',
        height: '52px',
        width: '52px',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      title={`Asistente IA — ${modoInfo?.label || 'Silencioso'} (⌘I)`}
      aria-label="Abrir asistente IA"
      aria-expanded={open}
    >
      {/* ─── Glow sutíl ───────────────────────────────────── */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{
          background: 'var(--fab-gradient)',
          filter: 'blur(10px)',
          opacity: 0.25,
        }}
        animate={{ opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ─── Pulse ring (cuando hay sugerencias) ──────────── */}
      <AnimatePresence>
        {mostrarBadge && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{
              background: 'var(--fab-gradient)',
              opacity: 0.5,
            }}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* ─── Icono / Spinner ──────────────────────────────── */}
      <motion.div
        animate={cargando ? { rotate: 360 } : { rotate: 0 }}
        transition={cargando ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
        className="relative z-10 flex items-center justify-center"
      >
        {cargando ? (
          <Loader2 className="h-5 w-5 text-white drop-shadow-sm" />
        ) : (
          <Sparkles className="h-5 w-5 text-white drop-shadow-sm" />
        )}
      </motion.div>

      {/* ─── Badge de sugerencias pendientes ──────────────── */}
      <AnimatePresence>
        {mostrarBadge && (
          <motion.span
            className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-1 text-[10px] font-bold text-white shadow-sm shadow-amber-500/30"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            {sugerenciasPendientes > 9 ? '9+' : sugerenciasPendientes}
          </motion.span>
        )}
      </AnimatePresence>

      {/* ─── Tooltip (desktop) ─────────────────────────────── */}
      <span className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 hidden items-center gap-1.5 rounded-lg border border-border/50 bg-popover/90 backdrop-blur-sm px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-sm opacity-0 transition-[opacity,transform] group-hover:opacity-100 group-hover:translate-x-0 sm:flex">
        <Sparkles className="h-3 w-3 text-primary" />
        Asistente IA
        <kbd className="ml-0.5 rounded border border-border/50 bg-muted/50 px-1 font-mono text-[9px] text-muted-foreground">
          ⌘I
        </kbd>
      </span>
    </motion.button>
  );
}