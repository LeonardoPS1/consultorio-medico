/**
 * Portal Chat — Página de mensajes del paciente
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Loader2, Bot } from 'lucide-react';

interface Mensaje {
  id: string;
  rol: string;
  contenido: string;
  createdAt: string;
}

export default function PortalChatPage() {
  const [convId, setConvId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Obtener o crear conversación
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

  // Obtener mensajes cuando tengamos convId
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
    const interval = setInterval(fetchMensajes, 10000);
    return () => clearInterval(interval);
  }, [convId]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  async function sendMessage() {
    if (!input.trim() || !convId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    setMensajes((prev) => [
      ...prev,
      { id: tempId, rol: 'paciente', contenido: content, createdAt: new Date().toISOString() },
    ]);

    try {
      const r = await fetch(`/api/portal/chat/${convId}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: content }),
      });
      if (r.ok) {
        const res = await r.json();
        // Reemplazar el mensaje temporal con el real
        setMensajes((prev) => prev.map((m) => (m.id === tempId ? res.data : m)));
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
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Mensajes
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Consultá con el equipo médico por este canal</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {error && <div className="text-center text-red-500 text-sm py-8">{error}</div>}

        {mensajes.length === 0 && !error && (
          <div className="text-center text-gray-400 py-12">
            <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay mensajes todavía</p>
            <p className="text-xs mt-1">Escribinos tu consulta y te responderemos a la brevedad</p>
          </div>
        )}

        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.rol === 'paciente' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.rol === 'paciente'
                  ? 'bg-blue-500 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
              }`}
            >
              {msg.rol !== 'paciente' && (
                <div className="text-[10px] font-medium text-blue-500 mb-1 uppercase tracking-wider">
                  {msg.rol === 'asistente_ia'
                    ? '🤖 Asistente IA'
                    : msg.rol === 'medico'
                      ? '👨‍⚕️ Médico'
                      : '📋 Secretaría'}
                </div>
              )}
              <div className="whitespace-pre-wrap break-words">{msg.contenido}</div>
              <div
                className={`text-[10px] mt-1 ${
                  msg.rol === 'paciente' ? 'text-blue-200' : 'text-gray-400'
                }`}
              >
                {formatTime(msg.createdAt)}
                {msg.id.startsWith('temp-') && <span className="ml-1 italic">enviando...</span>}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
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
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending || !!error}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-full p-2.5 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
