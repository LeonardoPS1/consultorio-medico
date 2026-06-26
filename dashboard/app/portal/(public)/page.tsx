/**
 * Portal del Paciente — Login / Landing público
 * Premium redesign Aicore: glassmorphism, animaciones fluidas,
 * paleta teal+violeta cálida, beneficios en glass cards.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Bug,
  Calendar,
  Shield,
  HeartPulse,
  Loader2,
} from 'lucide-react';
import { isValidPhone } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* ─── Variants ─────────────────────────────────────────── */
const fadeSlideUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.18, ease: [0.65, 0, 0.35, 1] as const },
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.94, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: -8,
    transition: { duration: 0.15 },
  },
};

const springPop = {
  initial: { scale: 0 },
  animate: {
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 350, damping: 18 },
  },
};

const staggerItem = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 + i * 0.07,
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
});

/* ─── Beneficios ───────────────────────────────────────── */
const BENEFICIOS = [
  {
    icon: Calendar,
    titulo: 'Agenda tus horas',
    desc: 'Sin llamar, desde tu celular',
  },
  {
    icon: Shield,
    titulo: 'Documentos siempre disponibles',
    desc: 'Recetas, certificados y más',
  },
  {
    icon: HeartPulse,
    titulo: 'Seguimiento de tu salud',
    desc: 'Historial clínico en un solo lugar',
  },
];

/* ─── States ───────────────────────────────────────────── */
type Step = 'landing' | 'form' | 'sent';

/* ─── Componente principal ─────────────────────────────── */
export default function PortalLogin() {
  const [step, setStep] = useState<Step>('landing');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bypassActivo, setBypassActivo] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);

  useEffect(() => {
    fetch('/api/portal/auth/status')
      .then((r) => r.json())
      .then((data) => setBypassActivo(data.bypass === true))
      .catch(() => {})
      .finally(() => setStatusChecked(true));
  }, []);

  async function handleTestAccess() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/portal/auth/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.redirect) {
        window.location.href = data.redirect;
      } else {
        setError(data.error || 'Error al acceder en modo prueba');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cleanPhone = telefono.replace(/[\s\-()]/g, '');
    if (!isValidPhone(cleanPhone)) {
      setError('Ingresá un número de teléfono chileno válido (ej: +56 9 1234 5678)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/portal/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: cleanPhone }),
      });

      if (res.ok) {
        setStep('sent');
      } else {
        const data = await res.json();
        setError(data.error || 'Error al solicitar acceso');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  /* ════════════════════════════════════════════ Sent ════ */
  if (step === 'sent') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'hsl(var(--portal-bg))' }}
      >
        <motion.div
          key="sent"
          variants={fadeSlideUp}
          initial="initial"
          animate="animate"
          className="max-w-sm w-full"
        >
          <div
            className="p-8 rounded-2xl text-center"
            style={{
              background: 'var(--portal-bg-alt)',
              border: '1px solid hsl(var(--portal-border))',
              boxShadow: 'var(--portal-shadow-lg)',
            }}
          >
            <motion.div
              variants={springPop}
              initial="initial"
              animate="animate"
              className="inline-flex items-center justify-center h-20 w-20 rounded-full mb-6"
              style={{ background: 'hsl(var(--portal-primary) / 0.1)' }}
            >
              <CheckCircle
                className="h-10 w-10"
                style={{ color: 'hsl(var(--portal-primary))' }}
              />
            </motion.div>

            <h1
              className="text-2xl font-bold mb-2"
              style={{ color: 'hsl(var(--portal-foreground))' }}
            >
              Enlace enviado
            </h1>
            <p
              className="mb-6 leading-relaxed"
              style={{ color: 'hsl(var(--portal-muted-foreground))' }}
            >
              Te enviamos un enlace de acceso por WhatsApp al número{' '}
              <strong style={{ color: 'hsl(var(--portal-foreground))' }}>
                {telefono}
              </strong>
              .
            </p>

            <div
              className="rounded-xl p-4 mb-6 text-left"
              style={{
                background: 'hsl(var(--portal-muted))',
                border: '1px solid hsl(var(--portal-border-light))',
              }}
            >
              <p
                className="text-sm font-medium mb-1"
                style={{ color: 'hsl(var(--portal-foreground))' }}
              >
                ¿No te llega el mensaje?
              </p>
              <p
                className="text-xs"
                style={{ color: 'hsl(var(--portal-muted-foreground))' }}
              >
                Verifica que el número ingresado sea el mismo que registraste en
                el consultorio. Si el problema persiste, contáctanos por WhatsApp.
              </p>
            </div>

            <p
              className="text-sm mb-6"
              style={{ color: 'hsl(var(--portal-muted-foreground))' }}
            >
              El enlace expira en <strong>10 minutos</strong> y solo funciona una
              vez.
            </p>

            <Button
              variant="outline"
              onClick={() => {
                setStep('landing');
                setTelefono('');
              }}
            >
              ← Ingresar otro número
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ════════════════════════════════════════ Landing ════ */
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden portal-layout"
      style={{ background: 'hsl(var(--portal-bg))' }}
    >
      {/* Ambient gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'hsl(var(--portal-primary) / 0.06)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[30rem] h-[30rem] rounded-full blur-3xl"
          style={{ background: 'hsl(var(--portal-accent) / 0.05)' }}
        />
        <div
          className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'hsl(var(--portal-primary) / 0.03)' }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8 text-center relative z-10">
        <div className="max-w-sm w-full">
          <AnimatePresence mode="wait">
            {step === 'landing' ? (
              /* ── Landing ─────────────────────────────── */
              <motion.div
                key="landing"
                variants={fadeSlideUp}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* Brand */}
                <div className="mb-10">
                  <motion.div
                    variants={springPop}
                    initial="initial"
                    animate="animate"
                    className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-5 shadow-lg"
                    style={{
                      background:
                        'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
                      boxShadow:
                        '0 4px 20px hsl(var(--portal-primary) / 0.2), 0 1px 4px hsl(var(--portal-primary) / 0.1)',
                    }}
                  >
                    <HeartPulse className="h-8 w-8 text-white" />
                  </motion.div>
                  <h1
                    className="text-3xl font-bold mb-1 tracking-tight"
                    style={{ color: 'hsl(var(--portal-foreground))' }}
                  >
                    Portal Salud
                  </h1>
                  <p
                    className="text-sm font-medium tracking-wide"
                    style={{ color: 'hsl(var(--portal-muted-foreground))' }}
                  >
                    Tu salud, siempre contigo
                  </p>
                </div>

                {/* Beneficios */}
                <div className="space-y-3 mb-10 text-left">
                  {BENEFICIOS.map((b, i) => (
                    <motion.div
                      key={b.titulo}
                      variants={staggerItem(i)}
                      initial="initial"
                      animate="animate"
                      className="rounded-xl p-4 flex items-start gap-3"
                      style={{
                        background: 'var(--portal-bg-alt)',
                        border: '1px solid hsl(var(--portal-border-light))',
                        boxShadow: 'var(--portal-shadow-sm)',
                      }}
                    >
                      <div
                        className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          background:
                            'hsl(var(--portal-primary) / 0.1)',
                        }}
                      >
                        <b.icon
                          className="h-5 w-5"
                          style={{
                            color: 'hsl(var(--portal-primary))',
                          }}
                        />
                      </div>
                      <div>
                        <p
                          className="font-medium text-sm"
                          style={{
                            color: 'hsl(var(--portal-foreground))',
                          }}
                        >
                          {b.titulo}
                        </p>
                        <p
                          className="text-xs"
                          style={{
                            color:
                              'hsl(var(--portal-muted-foreground))',
                          }}
                        >
                          {b.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button
                  onClick={() => setStep('form')}
                  className="w-full h-12 rounded-xl text-base font-semibold shadow-lg transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background:
                      'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
                    color: '#fff',
                    boxShadow:
                      '0 4px 16px hsl(var(--portal-primary) / 0.3), 0 1px 4px hsl(var(--portal-primary) / 0.15)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      '0 6px 24px hsl(var(--portal-primary) / 0.35), 0 2px 8px hsl(var(--portal-primary) / 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      '0 4px 16px hsl(var(--portal-primary) / 0.3), 0 1px 4px hsl(var(--portal-primary) / 0.15)';
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    Ingresar al Portal
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </button>

                <p
                  className="mt-4 text-xs"
                  style={{
                    color: 'hsl(var(--portal-muted-foreground) / 0.6)',
                  }}
                >
                  Acceso seguro mediante enlace por WhatsApp
                </p>
              </motion.div>
            ) : (
              /* ── Formulario ────────────────────────── */
              <motion.div
                key="form"
                variants={scaleIn}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div
                  className="rounded-2xl p-6 text-left"
                  style={{
                    background: 'var(--portal-bg-alt)',
                    border: '1px solid hsl(var(--portal-border))',
                    boxShadow: 'var(--portal-shadow-lg)',
                  }}
                >
                  <h2
                    className="text-xl font-bold mb-1"
                    style={{ color: 'hsl(var(--portal-foreground))' }}
                  >
                    Ingresa al Portal
                  </h2>
                  <p
                    className="text-sm mb-6"
                    style={{
                      color: 'hsl(var(--portal-muted-foreground))',
                    }}
                  >
                    Recibe un enlace mágico por WhatsApp
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
                        style={{
                          color: 'hsl(var(--portal-destructive))',
                          background:
                            'hsl(var(--portal-destructive) / 0.1)',
                        }}
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}

                    <div>
                      <label
                        className="block text-sm font-medium mb-1.5"
                        style={{
                          color: 'hsl(var(--portal-foreground))',
                        }}
                      >
                        Número de teléfono
                      </label>
                      <div className="relative">
                        <Phone
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                          style={{
                            color:
                              'hsl(var(--portal-muted-foreground) / 0.5)',
                          }}
                        />
                        <input
                          type="tel"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          placeholder="+56 9 1234 5678"
                          className="w-full pl-10 pr-4 py-3 rounded-xl text-base outline-none transition-all"
                          style={{
                            border:
                              '1px solid hsl(var(--portal-border))',
                            background:
                              'hsl(var(--portal-muted) / 0.4)',
                            color:
                              'hsl(var(--portal-foreground))',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor =
                              'hsl(var(--portal-primary) / 0.5)';
                            e.currentTarget.style.boxShadow =
                              '0 0 0 3px hsl(var(--portal-primary) / 0.1)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor =
                              'hsl(var(--portal-border))';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          autoFocus
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        loading ||
                        !isValidPhone(
                          telefono.replace(/[\s\-()]/g, ''),
                        )
                      }
                      className="w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 active:scale-[0.97]"
                      style={{
                        background:
                          'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
                        color: '#fff',
                      }}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />{' '}
                          Enviando...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Enviar enlace
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  </form>

                  <button
                    onClick={() => setStep('landing')}
                    className="mt-4 w-full text-sm transition-colors"
                    style={{
                      color:
                        'hsl(var(--portal-muted-foreground) / 0.6)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color =
                        'hsl(var(--portal-muted-foreground))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color =
                        'hsl(var(--portal-muted-foreground) / 0.6)';
                    }}
                  >
                    ← Volver
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bypass — solo si está activo */}
          <AnimatePresence>
            {bypassActivo && statusChecked && (
              <motion.div
                key="bypass"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
                className="mt-6"
              >
                <div
                  className="pt-5"
                  style={{
                    borderTop: '1px solid hsl(var(--portal-border-light))',
                  }}
                >
                  <p
                    className="text-xs text-center mb-3"
                    style={{
                      color: 'hsl(var(--portal-muted-foreground) / 0.5)',
                    }}
                  >
                    Modo desarrollo — acceso directo sin autenticación
                  </p>
                  <Button
                    onClick={handleTestAccess}
                    disabled={loading}
                    variant="secondary"
                    className="w-full"
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    {loading ? 'Ingresando...' : 'Acceder sin autenticación (prueba)'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!statusChecked && (
            <div className="mt-8 flex justify-center">
              <Loader2
                className="h-5 w-5 animate-spin"
                style={{ color: 'hsl(var(--portal-muted-foreground))' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center relative z-10">
        <p
          className="text-xs"
          style={{ color: 'hsl(var(--portal-muted-foreground) / 0.5)' }}
        >
          Solo se muestran datos asociados a tu número registrado.
        </p>
      </div>
    </div>
  );
}
