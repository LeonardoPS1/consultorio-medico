/**
 * AsistenteSettings — Configuración del asistente IA.
 *
 * Panel inline con selector de modo y toggles de categorías de sugerencias.
 * Diseño compacto y claro.
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { MODOS_ASISTENTE, type ModoAsistente } from '@/lib/ia/asistente-prompts';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { MessageSquare, Users, Calendar, Pill, Volume2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  modo: ModoAsistente;
  onModoChange: (modo: ModoAsistente) => void;
  onClose: () => void;
}

const CATEGORIAS = [
  { id: 'conversaciones', label: 'Conversaciones', icon: MessageSquare, descripcion: 'Sugerir respuestas, resumir chats' },
  { id: 'pacientes', label: 'Pacientes', icon: Users, descripcion: 'Resumir historial, turnos próximos' },
  { id: 'turnos', label: 'Turnos', icon: Calendar, descripcion: 'Resumen del día, sin confirmar' },
  { id: 'recetas', label: 'Recetas', icon: Pill, descripcion: 'Por vencer, renovaciones' },
] as const;

export function AsistenteSettings({ modo, onModoChange, onClose }: Props) {
  const { toggleCategoria, silenciadas } = useAsistenteIA();
  const categoriasScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrowState = useCallback(() => {
    const el = categoriasScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scrollCategorias = useCallback((direction: 'left' | 'right') => {
    const el = categoriasScrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    });
    setTimeout(updateArrowState, 100);
  }, [updateArrowState]);

  // Detectar overflow y actualizar flechas después del layout
  useEffect(() => {
    const el = categoriasScrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => updateArrowState());
    observer.observe(el);

    // Múltiples intentos para capturar layout inicial
    requestAnimationFrame(updateArrowState);
    const timer = setTimeout(updateArrowState, 150);
    const timer2 = setTimeout(updateArrowState, 500);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [updateArrowState]);

  return (
    <div className="px-4 py-3 space-y-3 text-sm">
      {/* ─── Modo selector ─────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">
          Modo del asistente
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {MODOS_ASISTENTE.map((m) => {
            const activo = modo === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onModoChange(m.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all ${
                  activo
                    ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-600 shadow-sm dark:text-indigo-400'
                    : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/20 hover:bg-accent'
                }`}
              >
                <span className="text-lg leading-none">{m.icono}</span>
                <span className="text-[10px] font-semibold leading-tight">{m.label}</span>
                {activo && (
                  <span className="mt-0.5 h-1 w-6 rounded-full bg-indigo-500/50" />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 leading-relaxed">
          {MODOS_ASISTENTE.find((m) => m.id === modo)?.descripcion}
        </p>
      </div>

      {/* ─── Categorías de sugerencias ────────────────────── */}
      {modo !== 'silencioso' && (
        <>
          <hr className="border-border/40" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">
              <Volume2 className="h-3 w-3 inline mr-1 -mt-0.5" />
              Sugerencias activas
            </p>
            <div className="relative">
              {/* Flecha izquierda */}
              {canScrollLeft && (
                <button
                  onClick={() => scrollCategorias('left')}
                  className="absolute -left-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent transition-colors"
                  aria-label="Anteriores categorías"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}

              {/* Contenedor scrolleable */}
              <div
                ref={categoriasScrollRef}
                onScroll={updateArrowState}
                className="flex gap-2 overflow-x-auto scrollbar-none scroll-smooth pb-1"
              >
                {CATEGORIAS.map((cat) => {
                  const Icon = cat.icon;
                  const activa = !silenciadas[cat.id]; // true = no silenciada
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategoria(cat.id)}
                      className={`group flex shrink-0 flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                        activa
                          ? 'border-primary/15 bg-primary/5'
                          : 'border-border/60 bg-background text-muted-foreground/60'
                      }`}
                      style={{ minWidth: '160px', maxWidth: '180px' }}
                    >
                      {/* Icono + Toggle row */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                            activa
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground/50'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>

                        {/* Toggle switch */}
                        <div
                          className={`relative h-5 w-8 shrink-0 rounded-full transition-colors ${
                            activa ? 'bg-primary' : 'bg-muted-foreground/20'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                              activa ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Label */}
                      <p
                        className={`text-xs font-medium leading-tight ${
                          activa ? 'text-foreground' : 'text-muted-foreground/70'
                        }`}
                      >
                        {cat.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 leading-tight line-clamp-2">
                        {cat.descripcion}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Flecha derecha */}
              {canScrollRight && (
                <button
                  onClick={() => scrollCategorias('right')}
                  className="absolute -right-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent transition-colors"
                  aria-label="Siguientes categorías"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── Atajos de teclado ─────────────────────────────── */}
      <hr className="border-border/40" />
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/50">
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Ctrl</kbd>
        <span>+</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Shift</kbd>
        <span>+</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">I</kbd>
        <span className="ml-0.5">abrir / cerrar</span>
      </div>
    </div>
  );
}
