/**
 * AsistentePanel — Panel de chat del asistente IA flotante.
 *
 * ✨ REDISEÑO 2026 — Mobile-first, glassmorphism, burbujas modernas.
 *
 * Características:
 * - Mobile: fullscreen bottom-sheet con handle + slide-up
 * - Desktop: panel flotante 400px con backdrop-blur
 * - Burbujas con gradiente y mejor espaciado
 * - Input glassy integrado al fondo
 * - Sugerencias como pills tappables
 * - Auto-scroll inteligente
 * - Streaming visual (skeleton vs dots)
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Loader2, Sparkles, Trash2, AlertCircle, Bot, User,
  ChevronDown, Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'motion/react';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { MODOS_ASISTENTE, type ModoAsistente } from '@/lib/ia/asistente-prompts';
import { AsistenteSettings } from './asistente-settings';
import type { Sugerencia } from '@/lib/ia/asistente-prompts';

// ─── Iconos para sugerencias ──────────────────────────────────
const SUGERENCIA_ICONOS: Record<string, string> = {
  conversaciones: '💬',
  pacientes: '👤',
  turnos: '📅',
  recetas: '💊',
  general: '✨',
  default: '✨',
};

// ─── Animaciones ──────────────────────────────────────────────
const springConfig = { type: 'spring' as const, stiffness: 400, damping: 35 };
const fadeConfig = { duration: 0.15, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

// ================================================================
// COMPONENTE PRINCIPAL
// ================================================================

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
  } = useAsistenteIA();

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [nearBottom, setNearBottom] = useState(true);

  const modoInfo = MODOS_ASISTENTE.find((m) => m.id === modo);
  const mostrarSugerencias = sugerencias.length > 0 && !showSettings;

  // ─── Auto-scroll inteligente ───────────────────────────────
  const checkNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setNearBottom(distance < 80);
  }, []);

  useEffect(() => {
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [mensajes, cargando, nearBottom]);

  // ─── Focus on open ─────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ─── Handlers ──────────────────────────────────────────────
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

  const quickPrompt = (text: string) => {
    enviarMensaje(text);
  };

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <>
      {/* ─── MOBILE: Bottom sheet (fullscreen) ─────────────── */}
      <motion.div
        className="fixed inset-x-0 bottom-0 z-40 flex flex-col sm:hidden bg-background"
        style={{ height: '90dvh' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={springConfig}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1" onClick={cerrar}>
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
        </div>

        <PanelContent
          {...{
            mensajes, cargando, error, disponible, input, setInput,
            handleSubmit, handleKeyDown, inputRef, scrollRef, bottomRef,
            checkNearBottom, nearBottom, setShowSettings, showSettings,
            mostrarSugerencias, sugerencias, enviarSugerencia, modo, modoInfo,
            limpiarChat, setModo, quickPrompt, cerrar,
          }}
        />
      </motion.div>

      {/* ─── DESKTOP: Panel flotante ───────────────────────── */}
      <motion.div
        className="fixed bottom-6 right-6 z-40 hidden sm:flex sm:w-[420px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-background/85 shadow-2xl shadow-black/5 backdrop-blur-2xl"
        style={{ maxHeight: 'min(85vh, 720px)' }}
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={fadeConfig}
      >
        <PanelContent
          {...{
            mensajes, cargando, error, disponible, input, setInput,
            handleSubmit, handleKeyDown, inputRef, scrollRef, bottomRef,
            checkNearBottom, nearBottom, setShowSettings, showSettings,
            mostrarSugerencias, sugerencias, enviarSugerencia, modo, modoInfo,
            limpiarChat, setModo, quickPrompt, cerrar,
          }}
        />
      </motion.div>
    </>
  );
}

// ================================================================
// PANEL CONTENT (compartido mobile/desktop)
// ================================================================

interface PanelContentProps {
  mensajes: Array<{ rol: 'user' | 'assistant'; contenido: string; timestamp: number }>;
  cargando: boolean;
  error: string | null;
  disponible: boolean | null;
  input: string;
  setInput: (v: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  checkNearBottom: () => void;
  nearBottom: boolean;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  mostrarSugerencias: boolean;
  sugerencias: Sugerencia[];
  enviarSugerencia: (s: Sugerencia) => void;
  modo: string;
  modoInfo?: { icono: string; label: string };
  limpiarChat: () => void;
  setModo: (modo: ModoAsistente) => void;
  quickPrompt: (t: string) => void;
  cerrar: () => void;
}

function PanelContent({
  mensajes, cargando, error, disponible, input, setInput,
  handleSubmit, handleKeyDown, inputRef, scrollRef, bottomRef,
  checkNearBottom, showSettings, setShowSettings,
  mostrarSugerencias, sugerencias, enviarSugerencia, modo, modoInfo,
  limpiarChat, setModo, quickPrompt, cerrar,
}: PanelContentProps) {
  return (
    <>
      {/* ════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight truncate">Asistente IA</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {modoInfo && (
                <span className="text-[10px] text-muted-foreground/60 leading-none">
                  {modoInfo.icono} {modoInfo.label}
                </span>
              )}
              {disponible === false && (
                <span className="text-[10px] text-destructive/70 leading-none">· Sin conexión</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 transition-colors"
            title="Configuración"
            aria-label="Configuración del asistente"
          >
            <Settings className={`h-3.5 w-3.5 transition-transform duration-200 ${showSettings ? 'rotate-90' : ''}`} />
          </button>
          <button
            onClick={cerrar}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 transition-colors sm:hidden"
            title="Cerrar"
            aria-label="Cerrar asistente"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={cerrar}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 transition-colors"
            title="Cerrar"
            aria-label="Cerrar asistente"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* SETTINGS (colapsable inline) */}
      {/* ════════════════════════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {showSettings && (
          <motion.div
            key="settings"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="overflow-hidden border-b border-border/40"
          >
            <AsistenteSettings
              modo={modo as 'silencioso' | 'sugerente' | 'activo'}
              onModoChange={setModo}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════ */}
      {/* CHAT AREA */}
      {/* ════════════════════════════════════════════════════ */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
        <div
          ref={scrollRef}
          onScroll={checkNearBottom}
          className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent"
        >
          <div className="flex flex-col gap-2.5 max-w-[640px] mx-auto w-full">
            {/* ─── Empty State ─────────────────────────────── */}
            {mensajes.length === 0 && !cargando && (
              <motion.div
                className="flex flex-col items-center justify-center py-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="relative mb-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 ring-1 ring-indigo-500/20">
                    <Sparkles className="h-7 w-7 text-indigo-500" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <p className="text-sm font-semibold text-foreground">¡Hola! Soy tu asistente</p>
                <p className="mt-1 text-xs text-muted-foreground/60 max-w-[280px] leading-relaxed">
                  Preguntame lo que necesites. Puedo ayudarte con turnos, pacientes, recetas y más.
                </p>

                {/* Quick prompts */}
                <div className="mt-5 grid grid-cols-1 gap-1.5 w-full max-w-xs">
                  {[
                    { text: '📊 Resumen del día', action: 'Dame un resumen breve de la actividad del día: turnos, pacientes nuevos y mensajes pendientes.' },
                    { text: '📅 Próximos turnos', action: 'Mostrame los próximos turnos de los próximos días.' },
                    { text: '👥 Pacientes nuevos', action: '¿Hay pacientes nuevos hoy? ¿Cuántos pacientes tengo registrados?' },
                  ].map((item) => (
                    <button
                      key={item.text}
                      onClick={() => quickPrompt(item.action)}
                      disabled={cargando}
                      className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2.5 text-xs text-left text-muted-foreground transition-[background,border-color,color,transform] hover:bg-accent/50 hover:border-indigo-500/20 hover:text-foreground disabled:opacity-40 active:scale-[0.98]"
                    >
                      <span className="shrink-0">{item.text.split(' ')[0]}</span>
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── Mensajes ────────────────────────────────── */}
            {mensajes.map((msg, i) => (
              <motion.div
                key={`${msg.timestamp}-${i}`}
                className={`flex items-start gap-2.5 ${msg.rol === 'user' ? 'flex-row-reverse' : ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={fadeConfig}
              >
                {/* Avatar */}
                {msg.rol === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 mt-0.5 shadow-sm">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}

                {/* Burbuja */}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                    msg.rol === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted/70 backdrop-blur-sm rounded-tl-sm border border-border/30'
                  }`}
                >
                  {msg.contenido}
                </div>

                {msg.rol === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground mt-0.5 shadow-sm">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* ─── Loading skeleton ────────────────────────── */}
            {cargando && (
              <motion.div
                className="flex items-start gap-2.5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 mt-0.5 shadow-sm">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted/70 backdrop-blur-sm border border-border/30 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="h-2 w-2 rounded-full bg-indigo-400/60 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground/50 font-medium">Analizando datos...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Error banner ────────────────────────────── */}
            {error && !cargando && (
              <motion.div
                className="flex items-start gap-2.5 rounded-xl border border-destructive/15 bg-destructive/5 px-3.5 py-2.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-destructive">Error de conexión</p>
                  <p className="text-xs text-destructive/60 mt-0.5">{error}</p>
                  <button
                    onClick={() => quickPrompt(input || 'Reintentar')}
                    className="text-xs text-indigo-500 hover:text-indigo-600 mt-1.5 font-medium"
                  >
                    Reintentar
                  </button>
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />

            {/* ─── Sugerencias Pills (dentro del scroll, flotan sobre el chat) ─── */}
            <AnimatePresence>
              {mostrarSugerencias && (
                <motion.div
                  key="sugerencias"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="sticky bottom-0 -mx-3 -mb-3 mt-auto px-3 pt-6 pb-3 bg-gradient-to-t from-background via-background/95 to-transparent"
                >
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                    {sugerencias.map((sug) => (
                      <button
                        key={sug.id}
                        onClick={() => enviarSugerencia(sug)}
                        disabled={cargando}
                        className="group flex shrink-0 items-center gap-1.5 rounded-full border border-border/40 bg-muted/80 backdrop-blur-sm px-3 py-1.5 text-[11px] whitespace-nowrap transition-[background,border-color,color,transform] hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-foreground disabled:opacity-40 active:scale-95 shadow-sm"
                      >
                        <span className="text-xs leading-none">
                          {SUGERENCIA_ICONOS[sug.categoria] || SUGERENCIA_ICONOS.default}
                        </span>
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                          {sug.texto}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* INPUT AREA — glassy bottom bar */}
      {/* ════════════════════════════════════════════════════ */}
      <div className="shrink-0 border-t border-border/30 bg-gradient-to-t from-background via-background to-transparent">
        <div className="px-3 pt-2 pb-3">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="relative flex-1">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí tu mensaje..."
                className="min-h-[44px] max-h-[120px] resize-none pr-10 text-sm rounded-xl bg-muted/40 border-border/50 focus-visible:bg-background/90 focus-visible:border-indigo-500/30 placeholder:text-muted-foreground/40 transition-[background,border-color]"
                rows={1}
                disabled={cargando}
                aria-label="Mensaje para el asistente IA"
              />
              {input.trim() && !cargando && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
                  tabIndex={-1}
                  aria-label="Limpiar input"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex gap-1">
              <Button
                type="submit"
                size="icon"
                className="h-[44px] w-[44px] shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-sm transition-transform active:scale-95"
                disabled={!input.trim() || cargando}
                aria-label="Enviar mensaje"
              >
                {cargando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>

          {/* Footer row */}
          <div className="mt-2 flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
              >
                {modoInfo?.icono} {modoInfo?.label}
              </button>
              {mensajes.length > 0 && (
                <button
                  onClick={limpiarChat}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] text-muted-foreground/40 hover:text-destructive/70 transition-colors"
                  title="Limpiar chat"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                  Limpiar
                </button>
              )}
            </div>
            <p className="text-[8px] text-muted-foreground/30 leading-none">
              La IA puede equivocarse
            </p>
          </div>
        </div>
      </div>
    </>
  );
}