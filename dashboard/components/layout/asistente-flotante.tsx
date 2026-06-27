/**
 * AsistenteFlotante — Orquestador del asistente IA flotante.
 *
 * Compone AsistenteFAB + AsistentePanel.
 * Solo se renderiza si el feature está habilitado (ia-assistant).
 * Agrega un backdrop para cerrar al hacer click fuera.
 */

'use client';

import { AnimatePresence } from 'motion/react';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { AsistenteFAB } from './asistente-fab';
import { AsistentePanel } from './asistente-panel';

export function AsistenteFlotante() {
  const { open, cerrar, habilitado } = useAsistenteIA();

  if (!habilitado) return null;

  return (
    <>
      {/* Backdrop para cerrar al clickar fuera */}
      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-30 bg-background/20 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-0"
            onClick={cerrar}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Panel (posicionado fixed, siempre montado) */}
      <AnimatePresence>
        {open && <AsistentePanel />}
      </AnimatePresence>

      {/* FAB (siempre visible cuando no hay panel abierto) */}
      {!open && <AsistenteFAB />}
    </>
  );
}
