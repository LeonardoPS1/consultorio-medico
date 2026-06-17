/**
 * CustomChat — Panel de chat tipo bottom drawer en español
 *
 * Usa el hook useChat de LiveKit para enviar/recibir mensajes.
 * Se muestra como un drawer que sube desde abajo, sobre el video.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@livekit/components-react';
import { X, Send, Loader2 } from 'lucide-react';

// ─── Props ─────────────────────────────────────────────────

interface CustomChatProps {
  onClose: () => void;
}

// ─── Formatear timestamp ───────────────────────────────────

function formatTime(ts: number | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

// ─── Componente ────────────────────────────────────────────

export function CustomChat({ onClose }: CustomChatProps) {
  const { chatMessages, send, isSending } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-focus al input al abrir
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text) return;
      try {
        await send(text);
        setInput('');
      } catch {
        // Error al enviar — ignoramos, LiveKit se encarga
      }
    },
    [input, send]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend(e as unknown as React.FormEvent);
      }
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col bg-black/90 backdrop-blur-md rounded-t-xl border-t border-white/10 max-h-[45vh] sm:max-h-[50vh] w-full animate-slide-up">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <h3 className="text-white text-sm font-semibold">Chat</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title="Cerrar chat"
          aria-label="Cerrar chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ─── Mensajes ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0">
        {chatMessages.length === 0 && (
          <p className="text-white/40 text-xs text-center py-6">
            No hay mensajes todavía. Escribí algo para empezar.
          </p>
        )}

        {chatMessages.map((msg) => {
          const isLocal = msg.from?.identity === undefined; // local = sin identity = nosotros
          return (
            <div
              key={msg.id || msg.timestamp}
              className={`flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}
            >
              {/* Quién y cuándo */}
              <div className="flex items-center gap-2 mb-0.5">
                {!isLocal && (
                  <span className="text-[10px] text-white/40 font-medium uppercase tracking-wide">
                    {msg.from?.name || msg.from?.identity || 'Desconocido'}
                  </span>
                )}
                <span className="text-[10px] text-white/30">
                  {formatTime(msg.timestamp)}
                </span>
              </div>

              {/* Burbuja */}
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm leading-relaxed break-words ${
                  isLocal
                    ? 'bg-blue-500/70 text-white rounded-tr-sm'
                    : 'bg-white/15 text-white/90 rounded-tl-sm'
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── Input ──────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-2.5 border-t border-white/10 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí un mensaje..."
          className="flex-1 bg-white/10 text-white text-sm rounded-xl px-3 py-2 placeholder:text-white/30 outline-none focus:ring-1 focus:ring-blue-400/50 transition-all"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="shrink-0 p-2 rounded-xl bg-blue-500/60 text-white hover:bg-blue-500/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Enviar"
          aria-label="Enviar mensaje"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}
