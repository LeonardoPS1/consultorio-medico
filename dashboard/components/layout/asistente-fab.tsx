/**
 * AsistenteFAB — Botón flotante del asistente IA.
 *
 * Botón circular grande con gradiente, glow sutíl y badge
 * de sugerencias pendientes. Posicionado fixed abajo a la derecha.
 */

'use client';

import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { MODOS_ASISTENTE } from '@/lib/ia/asistente-prompts';

export function AsistenteFAB() {
  const { open, toggle, sugerenciasPendientes, modo, cargando } = useAsistenteIA();

  const modoInfo = MODOS_ASISTENTE.find((m) => m.id === modo);
  const tieneSugerencias = !open && sugerenciasPendientes > 0;
  // En modo silencioso no mostrar badge de sugerencias
  const mostrarBadge = modo !== 'silencioso' && tieneSugerencias;

  return (
    <motion.button
      onClick={toggle}
      className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-95"
      style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
      }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.93 }}
      title={`Asistente IA (${modoInfo?.icono || '🔇'} ${modoInfo?.label || 'Silencioso'}) — Ctrl+Shift+I`}
      aria-label="Abrir asistente IA"
      aria-expanded={open}
    >
      {/* Glow ring (visible siempre) */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          filter: 'blur(8px)',
          opacity: 0.3,
        }}
        animate={{ opacity: [0.3, 0.45, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Pulse ring cuando hay sugerencias */}
      <AnimatePresence>
        {mostrarBadge && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              opacity: 0.6,
            }}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Icono */}
      <motion.div
        animate={cargando ? { rotate: 360 } : { rotate: 0 }}
        transition={cargando ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
        className="relative z-10"
      >
        <Sparkles className="h-6 w-6 text-white drop-shadow-sm" />
      </motion.div>

      {/* Badge de sugerencias */}
      <AnimatePresence>
        {mostrarBadge && (
          <motion.span
            className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-sm"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            {sugerenciasPendientes > 9 ? '9+' : sugerenciasPendientes}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Tooltip flotante (hover desktop) */}
      <span className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 hidden items-center gap-1.5 rounded-lg border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
        <Sparkles className="h-3 w-3 text-indigo-500" />
        Asistente IA
        <kbd className="ml-0.5 rounded border bg-muted px-1 font-mono text-[9px] text-muted-foreground">
          ⌘I
        </kbd>
      </span>
    </motion.button>
  );
}
