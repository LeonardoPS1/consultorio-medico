/**
 * AsistenteFlotante — Orquestador del asistente IA flotante.
 *
 * Compone AsistenteFAB + AsistentePanel.
 * Solo se renderiza si el feature está habilitado (ia-assistant).
 * Backdrop sutíl en mobile para cerrar al tocar fuera.
 */

'use client';

import { AnimatePresence } from 'motion/react';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { AsistenteFAB } from './asistente-fab';
import { AsistentePanel } from './asistente-panel';

export function AsistenteFlotante() {
  const { open, cerrar, habilitado, asistenteActivado } = useAsistenteIA();

  if (!habilitado || !asistenteActivado) return null;

  return (
    <>
      {/* Backdrop — solo visible en mobile cuando el panel está abierto */}
      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/10 sm:bg-transparent sm:pointer-events-none"
            onClick={cerrar}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && <AsistentePanel />}
      </AnimatePresence>

      {/* FAB (solo cuando el panel está cerrado) */}
      <AnimatePresence>
        {!open && <AsistenteFAB />}
      </AnimatePresence>
    </>
  );
}
