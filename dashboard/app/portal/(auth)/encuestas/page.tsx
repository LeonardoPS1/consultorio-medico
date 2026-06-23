/**
 * Portal Encuestas Page
 * Lista encuestas respondidas + permite responder turnos sin calificar
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, MessageSquareText, Loader2, ClipboardCheck, Send,
  ChevronRight, User as UserIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ─── Types ────────────────────────────────────────────────

interface Encuesta {
  id: string;
  titulo: string;
  descripcion: string;
  createdAt: string;
  archivos: Record<string, unknown> | null;
  turnoId: string | null;
  medicoNombre: string | null;
}

interface TurnoPendiente {
  id: string;
  fechaHora: string;
  hora: string;
  medicoNombre: string | null;
}

// ─── Helpers ──────────────────────────────────────────────

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatShort(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function extractPuntaje(titulo: string): number {
  const match = titulo.match(/(\d+)\/5/);
  return match ? parseInt(match[1], 10) : 0;
}

// ─── Componentes ──────────────────────────────────────────

function StarRating({ puntaje, size = 'sm' }: { puntaje: number; size?: 'sm' | 'md' }) {
  const h = size === 'md' ? 'h-5' : 'h-4';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${h} w-4 ${
            star <= puntaje
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 dark:fill-gray-700 text-gray-200 dark:text-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Formulario para encuestas pendientes ────────────────

function PendingSurveyForm({
  turnos,
  onComplete,
}: {
  turnos: TurnoPendiente[];
  onComplete: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(turnos[0]?.id || '');
  const [puntaje, setPuntaje] = useState(0);
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (turnos.length === 0) return null;

  const selected = turnos.find((t) => t.id === selectedId) || turnos[0];

  async function handleSubmit() {
    if (puntaje === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/portal/encuestas/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnoId: selected.id, puntaje, comentario: comentario || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar encuesta');
      }
      setPuntaje(0);
      setComentario('');
      const remaining = turnos.filter((t) => t.id !== selected.id);
      if (remaining.length > 0) {
        setSelectedId(remaining[0].id);
      } else {
        onComplete();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="border-blue-100 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-gray-900 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                Calificá tu atención
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {turnos.length} turno{turnos.length !== 1 ? 's' : ''} sin calificar
              </p>
            </div>
          </div>

          {/* Selector de turnos */}
          {turnos.length > 1 && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {turnos.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedId(t.id); setPuntaje(0); setComentario(''); }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    t.id === selectedId
                      ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {formatShort(t.fechaHora)}
                </button>
              ))}
            </div>
          )}

          {/* Info del turno seleccionado */}
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
            <UserIcon className="h-4 w-4 text-gray-400" />
            {selected.medicoNombre && <span>Dr/a. {selected.medicoNombre} · </span>}
            <span>{formatShort(selected.fechaHora)}</span>
          </div>

          {/* Estrellas */}
          <div className="flex items-center gap-1.5 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setPuntaje(n)}
                className={`transition-all duration-150 active:scale-75 ${
                  n <= puntaje ? 'scale-110' : 'opacity-50 hover:opacity-80'
                }`}
                aria-label={`Puntuar ${n} de 5`}
              >
                <Star
                  className={`h-8 w-8 ${
                    n <= puntaje
                      ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm'
                      : 'fill-gray-200 dark:fill-gray-700 text-gray-200 dark:text-gray-700'
                  } transition-colors duration-150`}
                />
              </button>
            ))}
            {puntaje > 0 && (
              <span className="ml-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][puntaje]}
              </span>
            )}
          </div>

          {/* Comentario */}
          <AnimatePresence>
            {puntaje > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 mb-3 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 transition-all">
                  <MessageSquareText className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <input
                    type="text"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Contanos cómo fue tu experiencia (opcional)"
                    className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
                    maxLength={500}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 dark:text-red-400 mb-2">{error}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all duration-150 shadow-sm"
                >
                  {submitting ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar calificación
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Página Principal ─────────────────────────────────────

export default function PortalEncuestasPage() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [pendientes, setPendientes] = useState<TurnoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [encuestasRes, pendientesRes] = await Promise.all([
          fetch('/api/portal/encuestas'),
          fetch('/api/portal/turnos?pendientesEncuesta=true'),
        ]);

        if (cancelled) return;

        if (encuestasRes.ok) {
          const data = await encuestasRes.json();
          setEncuestas(Array.isArray(data) ? data : []);
        }

        if (pendientesRes.ok) {
          const data = await pendientesRes.json();
          setPendientes(data.turnos || []);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis Encuestas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Calificá tu atención y ayudanos a mejorar
        </p>
      </motion.div>

      {/* Encuestas pendientes */}
      <PendingSurveyForm
        key={refreshKey}
        turnos={pendientes}
        onComplete={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Separador */}
      {pendientes.length > 0 && encuestas.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Historial</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>
      )}

      {/* Historial de encuestas */}
      {encuestas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 text-gray-400 dark:text-gray-500"
        >
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-medium text-gray-500 dark:text-gray-400">No tienes encuestas registradas</p>
          <p className="text-sm mt-2 text-gray-400 dark:text-gray-500">
            Después de cada consulta, recibirás una encuesta por WhatsApp para calificar tu atención.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {encuestas.map((e, i) => {
            const puntaje = extractPuntaje(e.titulo);
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <StarRating puntaje={puntaje} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {puntaje}/5
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {formatDate(e.createdAt)}
                      </span>
                    </div>

                    {e.medicoNombre && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <UserIcon className="h-3.5 w-3.5" />
                        Dr/a. {e.medicoNombre}
                      </p>
                    )}

                    {e.descripcion && e.descripcion !== 'Sin comentarios' && (
                      <div className="flex items-start gap-1.5 mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <MessageSquareText className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                        <p>{e.descripcion}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
