/**
 * AsistenteFAB — Botón flotante del asistente IA.
 *
 * Posicionado en bottom-right, con badge de sugerencias pendientes
 * y animación pulse cuando hay sugerencias en modo Sugerente/Activo.
 */

'use client';

import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { MODOS_ASISTENTE } from '@/lib/ia/asistente-prompts';

export function AsistenteFAB() {
  const { open, toggle, sugerenciasPendientes, modo, cargando } = useAsistenteIA();

  const modoInfo = MODOS_ASISTENTE.find((m) => m.id === modo);

  return (
    <motion.button
      onClick={toggle}
      className="group relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-shadow hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`Asistente IA (${modoInfo?.icono || '🔇'} ${modoInfo?.label || 'Silencioso'}) — Ctrl+Shift+I`}
      aria-label="Abrir asistente IA"
      aria-expanded={open}
    >
      {/* Pulse ring cuando hay sugerencias */}
      <AnimatePresence>
        {!open && sugerenciasPendientes > 0 && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
            initial={{ opacity: 0.4, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Icono */}
      <motion.div animate={cargando ? { rotate: 360 } : { rotate: 0 }} transition={cargando ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 0 }}>
        <Sparkles className="h-6 w-6 text-white" />
      </motion.div>

      {/* Badge de sugerencias pendientes */}
      <AnimatePresence>
        {!open && sugerenciasPendientes > 0 && (
          <motion.span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white px-1"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            {sugerenciasPendientes > 9 ? '9+' : sugerenciasPendientes}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
