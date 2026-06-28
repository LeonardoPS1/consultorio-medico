/**
 * AsistentePanel — Panel de chat del asistente IA flotante.
 *
 * 380px desktop (slide-up), Sheet bottom en mobile.
 * Contiene: header con modo badge, chat messages, sugerencias pills, input, settings.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles, Trash2, AlertCircle, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { MODOS_ASISTENTE } from '@/lib/ia/asistente-prompts';
import { AsistenteSettings } from './asistente-settings';

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

  const modoInfo = MODOS_ASISTENTE.find((m) => m.id === modo);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes, cargando]);

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

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-40 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:bottom-6 sm:right-6 sm:w-[380px]"
      // Mobile: full bottom sheet style
      style={{
        // En mobile, hacer más ancho
        width: typeof window !== 'undefined' && window.innerWidth < 640 ? '90vw' : '380px',
        maxHeight: 'min(70vh, 600px)',
      }}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={open ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Asistente IA</h3>
            <p className="text-[10px] text-muted-foreground">
              {modoInfo?.icono} {modoInfo?.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {disponible === false && (
            <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
              Sin conexión
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSettings(!showSettings)}
            title="Configuración"
            aria-label="Configuración del asistente"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={cerrar}
            title="Cerrar"
            aria-label="Cerrar asistente"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings panel (colapsable) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <AsistenteSettings
              modo={modo}
              onModoChange={setModo}
              onClose={() => setShowSettings(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat area */}
      <ScrollArea className="flex-1 px-4 py-3 max-h-[400px]" ref={scrollRef}>
        <div className="space-y-3">
          {/* Empty state */}
          {mensajes.length === 0 && !cargando && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 mb-3">
                <Sparkles className="h-6 w-6 text-indigo-500" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                ¡Hola! Soy tu asistente IA
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-[250px]">
                Preguntame lo que necesites. Puedo sugerir respuestas para tus pacientes, resumir historiales o ayudarte con turnos.
              </p>
            </div>
          )}

          {/* Messages */}
          {mensajes.map((msg, i) => (
            <motion.div
              key={`${msg.timestamp}-${i}`}
              className={`flex items-start gap-2 ${msg.rol === 'user' ? 'justify-end' : ''}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              {msg.rol === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div
                className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap ${
                  msg.rol === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted rounded-tl-sm'
                }`}
              >
                {msg.contenido}
              </div>
              {msg.rol === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </motion.div>
          ))}

          {/* Loading indicator */}
          {cargando && (
            <motion.div
              className="flex items-start gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted-foreground">Pensando...</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-destructive">Error</p>
                <p className="text-xs text-destructive/80">{error}</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Sugerencias pills — scrollable horizontal */}
      <AnimatePresence>
        {sugerencias.length > 0 && !showSettings && (
          <motion.div
            className="px-4 pb-2 overflow-x-auto scrollbar-thin"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex gap-1.5 w-max">
              {sugerencias.map((sug) => (
                <button
                  key={sug.id}
                  onClick={() => enviarSugerencia(sug)}
                  className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                  disabled={cargando}
                  title={sug.prompt}
                >
                  {sug.icono && <span>{sug.icono}</span>}
                  {sug.texto}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="border-t p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preguntame lo que necesites..."
            className="min-h-[38px] max-h-[100px] resize-none text-sm"
            rows={1}
            disabled={cargando}
            aria-label="Mensaje para el asistente IA"
          />
          <div className="flex flex-col gap-1">
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
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
                className="h-7 w-7 shrink-0 text-muted-foreground/60 hover:text-destructive"
                onClick={limpiarChat}
                title="Limpiar chat"
                aria-label="Limpiar historial del chat"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </form>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
          Soy un asistente de IA. Revisá siempre la información antes de actuar.
        </p>
      </div>
    </motion.div>
  );
}
