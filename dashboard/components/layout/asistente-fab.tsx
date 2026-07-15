'use client';

import { Sparkles, Loader2, Bell, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { MODOS_ASISTENTE } from '@/lib/ia/asistente-prompts';

export function AsistenteFAB() {
  const { open, toggle, sugerenciasPendientes, modo, cargando, alertasProactivas } = useAsistenteIA();

  const modoInfo = MODOS_ASISTENTE.find((m) => m.id === modo);
  const tieneSugerencias = !open && sugerenciasPendientes > 0;
  const mostrarBadge = modo !== 'silencioso' && tieneSugerencias;

  const badgeCount = modo === 'activo'
    ? alertasProactivas.filter(a => a.severidad === 'critical' || a.severidad === 'warning').length
    : sugerenciasPendientes;

  const tieneAlertasCriticas = modo === 'activo' && alertasProactivas.some(a => a.severidad === 'critical');

  return (
    <motion.button
      onClick={toggle}
      className={`group fixed bottom-5 right-5 z-30 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-shadow hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 ${
        modo === 'activo' && tieneAlertasCriticas
          ? 'focus-visible:ring-red-500 shadow-red-500/20 hover:shadow-red-500/30'
          : 'focus-visible:ring-[var(--fab-glow)] shadow-[var(--fab-glow)] hover:shadow-[var(--fab-glow)]'
      }`}
      style={{
        background: modo === 'activo' && tieneAlertasCriticas
          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
          : 'var(--fab-gradient)',
        height: '52px',
        width: '52px',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      title={`Asistente IA — ${modoInfo?.label || 'Silencioso'} (⌘I)`}
      aria-label="Abrir asistente IA"
      aria-expanded={open}
    >
      {modo === 'activo' && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            background: tieneAlertasCriticas
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'var(--fab-gradient)',
            filter: 'blur(12px)',
            opacity: 0.3,
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.08, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <AnimatePresence>
        {mostrarBadge && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{
              background: modo === 'activo' && tieneAlertasCriticas
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'var(--fab-gradient)',
              opacity: 0.5,
            }}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={cargando ? { rotate: 360 } : { rotate: 0 }}
        transition={cargando ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
        className="relative z-10 flex items-center justify-center"
      >
        {cargando ? (
          <Loader2 className="h-5 w-5 text-white drop-shadow-sm" />
        ) : modo === 'activo' ? (
          <Bell className="h-5 w-5 text-white drop-shadow-sm" />
        ) : modo === 'sugerente' ? (
          <Lightbulb className="h-5 w-5 text-white drop-shadow-sm" />
        ) : (
          <Sparkles className="h-5 w-5 text-white drop-shadow-sm" />
        )}
      </motion.div>

      <AnimatePresence>
        {mostrarBadge && (
          <motion.span
            className={`absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm ${
              modo === 'activo' && tieneAlertasCriticas
                ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/30'
                : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30'
            }`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            {badgeCount > 9 ? '9+' : badgeCount}
          </motion.span>
        )}
      </AnimatePresence>

      <span className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 hidden items-center gap-1.5 rounded-lg border border-border/50 bg-popover/90 backdrop-blur-sm px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-sm opacity-0 transition-[opacity,transform] group-hover:opacity-100 group-hover:translate-x-0 sm:flex">
        {modo === 'activo' ? (
          <Bell className="h-3 w-3 text-primary" />
        ) : (
          <Sparkles className="h-3 w-3 text-primary" />
        )}
        Asistente IA
        <span className="ml-0.5 text-muted-foreground/50">· {modoInfo?.label}</span>
        <kbd className="ml-0.5 rounded border border-border/50 bg-muted/50 px-1 font-mono text-[9px] text-muted-foreground">
          ⌘I
        </kbd>
      </span>
    </motion.button>
  );
}
