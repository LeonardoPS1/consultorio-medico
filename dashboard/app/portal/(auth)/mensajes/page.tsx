/**
 * Portal Chat — Página de mensajes del paciente
 * Rediseñado con portal design system tokens.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Loader2, Bot } from 'lucide-react';
import { PortalButton } from '@/components/portal/portal-button';
import { PortalCard } from '@/components/portal/portal-card';

interface Mensaje {
  id: string;
  rol: string;
  contenido: string;
  createdAt: string;
}

/* ─── Reusable styles ───────────────────────────────────── */
const headerStyle: React.CSSProperties = {
  background: 'var(--portal-bg-alt)',
  borderBottom: '1px solid hsl(var(--portal-border-light))',
};

const inputBarStyle: React.CSSProperties = {
  background: 'var(--portal-bg-alt)',
  borderTop: '1px solid hsl(var(--portal-border-light))',
};

export default function PortalChatPage() {
  const [convId, setConvId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/portal/chat')
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.id) {
          setConvId(res.data.id);
        } else {
          setError('No se pudo iniciar la conversación');
        }
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!convId) return;
    const fetchMensajes = async () => {
      try {
        const r = await fetch(`/api/portal/chat/${convId}/mensajes`);
        const res = await r.json();
        if (res.data) setMensajes(res.data);
      } catch {
        // ignore polling errors
      }
    };
    fetchMensajes();
    const interval = setInterval(() => {
      if (!document.hidden) fetchMensajes();
    }, 20000);
    return () => clearInterval(interval);
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  async function sendMessage() {
    if (!input.trim() || !convId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    const tempId = `temp-${Date.now()}`;
    setMensajes((prev) => [
      ...prev,
      {
        id: tempId,
        rol: 'paciente',
        contenido: content,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const r = await fetch(`/api/portal/chat/${convId}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: content }),
      });
      if (r.ok) {
        const res = await r.json();
        setMensajes((prev) =>
          prev.map((m) => (m.id === tempId ? res.data : m)),
        );
      } else {
        setMensajes((prev) => prev.filter((m) => m.id !== tempId));
        setInput(content);
      }
    } catch {
      setMensajes((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: 'hsl(var(--portal-primary))' }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{
        height: 'calc(100vh - 12rem)',
      }}
    >
      {/* Header */}
      <div style={{ ...headerStyle, padding: '0.75rem 1rem' }}>
        <h1
          className="text-lg font-semibold flex items-center gap-2"
          style={{ color: 'hsl(var(--portal-foreground))' }}
        >
          <MessageSquare
            className="h-5 w-5"
            style={{ color: 'hsl(var(--portal-primary))' }}
          />
          Mensajes
        </h1>
        <p
          className="text-xs mt-0.5"
          style={{ color: 'hsl(var(--portal-muted-foreground))' }}
        >
          Consultá con el equipo médico por este canal
        </p>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ background: 'hsl(var(--portal-muted) / 0.3)' }}
      >
        {error && (
          <div
            className="text-center text-sm py-8"
            style={{ color: 'hsl(var(--portal-destructive))' }}
          >
            {error}
          </div>
        )}

        {mensajes.length === 0 && !error && (
          <PortalCard className="text-center py-12" padding="lg" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}>
            <Bot
              className="h-12 w-12 mx-auto mb-3"
              style={{ opacity: 0.5 }}
            />
            <p className="text-sm">No hay mensajes todavía</p>
            <p className="text-xs mt-1">
              Escribinos tu consulta y te responderemos a la brevedad
            </p>
          </PortalCard>
        )}

        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.rol === 'paciente' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm"
              style={
                msg.rol === 'paciente'
                  ? {
                      background:
                        'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
                      color: '#fff',
                      borderBottomRightRadius: '0.375rem',
                    }
                  : {
                      background: 'var(--portal-bg-alt)',
                      border:
                        '1px solid hsl(var(--portal-border-light))',
                      color: 'hsl(var(--portal-foreground) / 0.9)',
                      borderBottomLeftRadius: '0.375rem',
                    }
              }
            >
              {msg.rol !== 'paciente' && (
                <div
                  className="text-[10px] font-medium uppercase tracking-wider mb-1"
                  style={{
                    color:
                      msg.rol === 'asistente_ia'
                        ? 'hsl(var(--portal-accent))'
                        : 'hsl(var(--portal-primary))',
                  }}
                >
                  {msg.rol === 'asistente_ia'
                    ? '🤖 Asistente IA'
                    : msg.rol === 'medico'
                      ? '👨‍⚕️ Médico'
                      : '📋 Secretaría'}
                </div>
              )}
              <div className="whitespace-pre-wrap break-words">
                {msg.contenido}
              </div>
              <div
                className="text-[10px] mt-1"
                style={{
                  opacity: msg.rol === 'paciente' ? 0.7 : 0.7,
                }}
              >
                {formatTime(msg.createdAt)}
                {msg.id.startsWith('temp-') && (
                  <span className="ml-1 italic">enviando...</span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ ...inputBarStyle, padding: '0.75rem 1rem' }}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Escribí tu mensaje..."
            maxLength={1000}
            disabled={sending || !!error}
            className="flex-1 px-4 py-2.5 rounded-full text-sm border-0 outline-none disabled:opacity-50"
            style={{
              background: 'hsl(var(--portal-muted))',
              color: 'hsl(var(--portal-foreground))',
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow =
                '0 0 0 2px hsl(var(--portal-primary) / 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <PortalButton
            onClick={sendMessage}
            disabled={!input.trim() || sending || !!error}
            variant="primary"
            style={{
              borderRadius: '9999px',
              padding: '0.625rem',
              height: 'auto',
              width: '2.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sending ? (
              <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </PortalButton>
        </div>
      </div>
    </div>
  );
}
