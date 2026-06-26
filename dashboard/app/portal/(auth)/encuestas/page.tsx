/**
 * Portal Encuestas Page
 * Rediseñado con portal design system tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  MessageSquareText,
  Loader2,
  ClipboardCheck,
  Send,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';

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

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatShort(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractPuntaje(titulo: string): number {
  const match = titulo.match(/(\d+)\/5/);
  return match ? parseInt(match[1], 10) : 0;
}

function StarRating({
  puntaje,
  size = 'sm',
}: {
  puntaje: number;
  size?: 'sm' | 'md';
}) {
  const h = size === 'md' ? 'h-5' : 'h-4';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${h} w-4`}
          style={{
            fill:
              star <= puntaje
                ? 'hsl(38 92% 50%)'
                : 'hsl(var(--portal-muted-foreground) / 0.15)',
            color:
              star <= puntaje
                ? 'hsl(38 92% 50%)'
                : 'hsl(var(--portal-muted-foreground) / 0.15)',
          }}
        />
      ))}
    </div>
  );
}

function PendingSurveyForm({
  turnos,
  onComplete,
}: {
  turnos: TurnoPendiente[];
  onComplete: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(
    turnos[0]?.id || '',
  );
  const [puntaje, setPuntaje] = useState(0);
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (turnos.length === 0) return null;

  const selected =
    turnos.find((t) => t.id === selectedId) || turnos[0];

  async function handleSubmit() {
    if (puntaje === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/portal/encuestas/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnoId: selected.id,
          puntaje,
          comentario: comentario || undefined,
        }),
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
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--portal-bg-alt)',
          border: '1px solid hsl(var(--portal-border-light))',
          boxShadow: 'var(--portal-shadow-sm)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'hsl(var(--portal-primary) / 0.1)',
            }}
          >
            <ClipboardCheck
              className="h-4 w-4"
              style={{ color: 'hsl(var(--portal-primary))' }}
            />
          </div>
          <div>
            <h2
              className="font-semibold text-sm"
              style={{ color: 'hsl(var(--portal-foreground))' }}
            >
              Calificá tu atención
            </h2>
            <p
              className="text-xs"
              style={{ color: 'hsl(var(--portal-muted-foreground))' }}
            >
              {turnos.length} turno
              {turnos.length !== 1 ? 's' : ''} sin calificar
            </p>
          </div>
        </div>

        {turnos.length > 1 && (
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {turnos.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedId(t.id);
                  setPuntaje(0);
                  setComentario('');
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg border transition-all"
                style={
                  t.id === selectedId
                    ? {
                        background:
                          'hsl(var(--portal-primary) / 0.1)',
                        borderColor:
                          'hsl(var(--portal-primary) / 0.2)',
                        color: 'hsl(var(--portal-primary))',
                      }
                    : {
                        background: 'var(--portal-bg-alt)',
                        borderColor:
                          'hsl(var(--portal-border-light))',
                        color:
                          'hsl(var(--portal-muted-foreground))',
                      }
                }
              >
                {formatShort(t.fechaHora)}
              </button>
            ))}
          </div>
        )}

        <div
          className="flex items-center gap-2 mb-3 text-sm rounded-xl px-3 py-2"
          style={{
            background: 'hsl(var(--portal-muted) / 0.3)',
            color: 'hsl(var(--portal-muted-foreground))',
            border: '1px solid hsl(var(--portal-border-light))',
          }}
        >
          <UserIcon
            className="h-4 w-4 shrink-0"
            style={{
              color: 'hsl(var(--portal-muted-foreground) / 0.5)',
            }}
          />
          {selected.medicoNombre && (
            <span>Dr/a. {selected.medicoNombre} · </span>
          )}
          <span>{formatShort(selected.fechaHora)}</span>
        </div>

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
                className="h-8 w-8 transition-colors duration-150"
                style={{
                  fill:
                    n <= puntaje
                      ? 'hsl(38 92% 50%)'
                      : 'hsl(var(--portal-muted-foreground) / 0.15)',
                  color:
                    n <= puntaje
                      ? 'hsl(38 92% 50%)'
                      : 'hsl(var(--portal-muted-foreground) / 0.15)',
                  filter:
                    n <= puntaje
                      ? 'drop-shadow(0 1px 2px hsl(38 92% 50% / 0.3))'
                      : 'none',
                }}
              />
            </button>
          ))}
          {puntaje > 0 && (
            <span
              className="ml-1 text-sm font-medium"
              style={{
                color: 'hsl(var(--portal-foreground) / 0.7)',
              }}
            >
              {[
                '',
                'Muy malo',
                'Malo',
                'Regular',
                'Bueno',
                'Excelente',
              ][puntaje]}
            </span>
          )}
        </div>

        <AnimatePresence>
          {puntaje > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3 transition-all"
                style={{
                  background: 'hsl(var(--portal-muted) / 0.3)',
                  border:
                    '1px solid hsl(var(--portal-border-light))',
                }}
              >
                <MessageSquareText
                  className="h-4 w-4 shrink-0"
                  style={{
                    color:
                      'hsl(var(--portal-muted-foreground) / 0.5)',
                  }}
                />
                <input
                  type="text"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Contanos cómo fue tu experiencia (opcional)"
                  className="flex-1 text-sm bg-transparent border-none outline-none"
                  style={{
                    color: 'hsl(var(--portal-foreground) / 0.9)',
                  }}
                  maxLength={500}
                />
              </div>

              {error && (
                <p
                  className="text-xs mb-2"
                  style={{
                    color: 'hsl(var(--portal-destructive))',
                  }}
                >
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 disabled:opacity-50 active:scale-[0.97]"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
                  color: '#fff',
                  boxShadow:
                    '0 4px 12px hsl(var(--portal-primary) / 0.25)',
                }}
              >
                {submitting ? (
                  <div
                    className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  />
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
      </div>
    </motion.div>
  );
}

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
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: 'hsl(var(--portal-primary))' }}
        />
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
        <h1
          className="text-2xl font-bold"
          style={{ color: 'hsl(var(--portal-foreground))' }}
        >
          Mis Encuestas
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: 'hsl(var(--portal-muted-foreground))' }}
        >
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
          <div
            className="flex-1 h-px"
            style={{ background: 'hsl(var(--portal-border-light))' }}
          />
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{
              color: 'hsl(var(--portal-muted-foreground) / 0.7)',
            }}
          >
            Historial
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: 'hsl(var(--portal-border-light))' }}
          />
        </div>
      )}

      {encuestas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
          style={{
            color: 'hsl(var(--portal-muted-foreground) / 0.7)',
          }}
        >
          <ClipboardCheck
            className="h-12 w-12 mx-auto mb-3"
            style={{
              color: 'hsl(var(--portal-muted-foreground) / 0.3)',
            }}
          />
          <p
            className="font-medium"
            style={{ color: 'hsl(var(--portal-muted-foreground))' }}
          >
            No tienes encuestas registradas
          </p>
          <p className="text-sm mt-2">
            Después de cada consulta, recibirás una encuesta por
            WhatsApp para calificar tu atención.
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
                transition={{
                  delay: i * 0.04,
                  duration: 0.25,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div
                  className="rounded-2xl p-4 transition-all"
                  style={{
                    background: 'var(--portal-bg-alt)',
                    border:
                      '1px solid hsl(var(--portal-border-light))',
                    boxShadow: 'var(--portal-shadow-sm)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <StarRating puntaje={puntaje} />
                      <span
                        className="text-sm font-medium"
                        style={{
                          color:
                            'hsl(var(--portal-foreground) / 0.8)',
                        }}
                      >
                        {puntaje}/5
                      </span>
                    </div>
                    <span
                      className="text-xs shrink-0"
                      style={{
                        color:
                          'hsl(var(--portal-muted-foreground) / 0.7)',
                      }}
                    >
                      {formatDate(e.createdAt)}
                    </span>
                  </div>

                  {e.medicoNombre && (
                    <p
                      className="text-sm mb-1 flex items-center gap-1"
                      style={{
                        color: 'hsl(var(--portal-muted-foreground))',
                      }}
                    >
                      <UserIcon className="h-3.5 w-3.5" />
                      Dr/a. {e.medicoNombre}
                    </p>
                  )}

                  {e.descripcion &&
                    e.descripcion !== 'Sin comentarios' && (
                      <div
                        className="flex items-start gap-1.5 mt-2 text-sm rounded-xl p-3"
                        style={{
                          background: 'hsl(var(--portal-muted))',
                          color:
                            'hsl(var(--portal-muted-foreground))',
                        }}
                      >
                        <MessageSquareText
                          className="h-4 w-4 mt-0.5 shrink-0"
                          style={{
                            color:
                              'hsl(var(--portal-muted-foreground) / 0.7)',
                          }}
                        />
                        <p>{e.descripcion}</p>
                      </div>
                    )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
