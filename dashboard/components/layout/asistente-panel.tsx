/**
 * AsistentePanel — Panel de chat del asistente IA flotante.
 *
 * Layout optimizado:
 * - Header compacto con badge de modo + settings + cerrar
 * - Settings inline colapsable (no interfiere con altura)
 * - Tarjetas de sugerencias (grid, visibles, clickeables)
 * - Área de chat con burbujas limpias
 * - Input fijo al fondo
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Loader2, Sparkles, Trash2, AlertCircle, Bot, User,
  Settings2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { MODOS_ASISTENTE } from '@/lib/ia/asistente-prompts';
import { AsistenteSettings } from './asistente-settings';

// ─── Iconos para sugerencias ──────────────────────────────────
const SUGERENCIA_ICONOS: Record<string, string> = {
  conversaciones: '💬',
  pacientes: '👤',
  turnos: '📅',
  recetas: '💊',
  default: '✨',
};

export function AsistentePanel() {
  const {
    open,
    cerrar,
    modo,
    mensajes,
    sugerencias,
    cargando,
    disponible,
    error,
    enviarMensaje,
    enviarSugerencia,
    limpiarChat,
    setModo,
    toggleCategoria,
  } = useAsistenteIA();

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sugerenciasScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Actualiza visibilidad de flechas según scroll
  const updateArrowState = useCallback(() => {
    const el = sugerenciasScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scrollSugerencias = useCallback((direction: 'left' | 'right') => {
    const el = sugerenciasScrollRef.current;
    if (!el) return;
    const scrollAmount = 220; // ancho aprox de una tarjeta
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    // Pequeño delay para que el DOM actualice el scroll position
    setTimeout(updateArrowState, 100);
  }, [updateArrowState]);

  const modoInfo = MODOS_ASISTENTE.find((m) => m.id === modo);

  // Auto-scroll al último mensaje (solo si el usuario está cerca del fondo)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 100) {
      el.scrollTop = el.scrollHeight;
    }
  }, [mensajes, cargando]);

  // Recalcular flechas cuando cambian sugerencias
  useEffect(() => {
    // Esperar a que el DOM renderice las tarjetas
    requestAnimationFrame(() => {
      updateArrowState();
    });
  }, [sugerencias, updateArrowState]);

  // Focus input cuando se abre el panel
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !cargando) {
      enviarMensaje(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // ─── Componentes comunes ──────────────────────────────────

  const BotAvatar = () => (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 mt-0.5 shadow-sm">
      <Bot className="h-3.5 w-3.5 text-white" />
    </div>
  );

  const UserAvatar = () => (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground mt-0.5 shadow-sm">
      <User className="h-3.5 w-3.5" />
    </div>
  );

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-40 flex w-[90vw] flex-col overflow-hidden rounded-2xl border bg-background/95 shadow-2xl backdrop-blur-xl sm:w-[420px]"
      style={{ maxHeight: 'min(80vh, 680px)' }}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={open ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ============================================================ */}
      {/* HEADER */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Asistente IA</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-muted-foreground/70">
                {modoInfo?.icono} {modoInfo?.label}
              </span>
              {disponible === false && (
                <Badge variant="outline" className="h-4 text-[9px] px-1 text-destructive border-destructive/30 leading-none">
                  Sin conexión
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground/60 hover:text-foreground"
            onClick={() => setShowSettings(!showSettings)}
            title="Configuración"
            aria-label="Configuración del asistente"
          >
            <Settings2 className={`h-4 w-4 transition-transform duration-200 ${showSettings ? 'rotate-90' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground/60 hover:text-foreground"
            onClick={cerrar}
            title="Cerrar"
            aria-label="Cerrar asistente"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SETTINGS (colapsable inline) */}
      {/* ============================================================ */}
      <AnimatePresence initial={false}>
        {showSettings && (
          <motion.div
            key="settings"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-b"
          >
            <AsistenteSettings
              modo={modo}
              onModoChange={setModo}
              onClose={() => setShowSettings(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* CONTENT: suggestions + chat alternan según estado */}
      {/* ============================================================ */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* ─── SUGERENCIAS (carrusel horizontal con flechas) ── */}
        <AnimatePresence>
          {sugerencias.length > 0 && !showSettings && (
            <motion.div
              key="sugerencias"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b"
            >
              <div className="px-3 py-2.5">
                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-2">
                  Sugerencias
                </p>
                <div className="relative">
                  {/* Flecha izquierda */}
                  {canScrollLeft && (
                    <button
                      onClick={() => scrollSugerencias('left')}
                      className="absolute -left-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent transition-colors"
                      aria-label="Anterior sugerencia"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}

                  {/* Contenedor scrolleable */}
                  <div
                    ref={sugerenciasScrollRef}
                    onScroll={updateArrowState}
                    className="flex gap-2 overflow-x-auto scrollbar-none scroll-smooth pb-1"
                  >
                    {sugerencias.map((sug) => (
                      <button
                        key={sug.id}
                        onClick={() => enviarSugerencia(sug)}
                        disabled={cargando}
                        className="group flex shrink-0 items-start gap-2 rounded-xl border bg-card/50 px-3 py-2.5 text-left text-xs transition-all hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm disabled:opacity-40"
                        style={{ minWidth: '180px', maxWidth: '220px' }}
                      >
                        <span className="mt-0.5 shrink-0 text-sm leading-none">
                          {SUGERENCIA_ICONOS[sug.id] || SUGERENCIA_ICONOS.default}
                        </span>
                        <span className="leading-snug text-muted-foreground group-hover:text-foreground">
                          {sug.texto}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Flecha derecha */}
                  {canScrollRight && (
                    <button
                      onClick={() => scrollSugerencias('right')}
                      className="absolute -right-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent transition-colors"
                      aria-label="Siguiente sugerencia"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── CHAT (scroll area) ─────────────────────────── */}
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
          <div className="space-y-3">
            {/* Empty state */}
            {mensajes.length === 0 && !cargando && (
              <motion.div
                className="flex flex-col items-center justify-center py-10 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 mb-4 ring-1 ring-indigo-500/10">
                  <Sparkles className="h-7 w-7 text-indigo-500" />
                </div>
                <p className="text-sm font-medium text-foreground">¡Hola! Soy tu asistente</p>
                <p className="mt-1.5 text-xs text-muted-foreground/70 max-w-[260px] leading-relaxed">
                  Preguntame lo que necesites. Puedo ayudarte con turnos, pacientes, recetas y más.
                </p>

                {/* Quick prompts en empty state */}
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {['Resumen del día', 'Próximos turnos', 'Pacientes nuevos'].map((text) => (
                    <button
                      key={text}
                      onClick={() => enviarMensaje(text)}
                      disabled={cargando}
                      className="rounded-full border bg-background px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Burbujas de mensajes */}
            {mensajes.map((msg, i) => (
              <motion.div
                key={`${msg.timestamp}-${i}`}
                className={`flex items-start gap-2.5 ${msg.rol === 'user' ? 'justify-end' : ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {msg.rol === 'assistant' && <BotAvatar />}

                <div
                  className={`rounded-2xl px-3.5 py-2.5 max-w-[80%] text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                    msg.rol === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted/80 rounded-tl-sm'
                  }`}
                >
                  {msg.contenido}
                </div>

                {msg.rol === 'user' && <UserAvatar />}
              </motion.div>
            ))}

            {/* Loading dots */}
            {cargando && (
              <motion.div
                className="flex items-start gap-2.5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <BotAvatar />
                <div className="rounded-2xl rounded-tl-sm bg-muted/80 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground/60">Pensando...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error banner */}
            {error && (
              <motion.div
                className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-destructive">Error de conexión</p>
                  <p className="text-xs text-destructive/70 mt-0.5">{error}</p>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ============================================================ */}
      {/* INPUT AREA */}
      {/* ============================================================ */}
      <div className="border-t px-3 py-2.5">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí tu mensaje..."
              className="min-h-[40px] max-h-[120px] resize-none pr-10 text-sm rounded-xl bg-muted/50 border-muted focus-visible:bg-background"
              rows={1}
              disabled={cargando}
              aria-label="Mensaje para el asistente IA"
            />
            {input.trim() && !cargando && (
              <button
                type="button"
                onClick={() => setInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                tabIndex={-1}
                aria-label="Limpiar input"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={!input.trim() || cargando}
              aria-label="Enviar mensaje"
            >
              {cargando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            {mensajes.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground/40 hover:text-destructive"
                onClick={limpiarChat}
                title="Limpiar chat"
                aria-label="Limpiar historial del chat"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
            >
              {modoInfo?.icono} {modoInfo?.label}
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground/40">
            La IA puede equivocarse. Verificá siempre.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
