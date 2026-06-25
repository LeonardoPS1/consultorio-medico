/**
 * Portal del Paciente — Login / Landing público
 *
 * Rediseño premium con paleta teal, animaciones fluidas vía framer-motion.
 * Estados: landing → formulario → enlace enviado.
 * AicoreMed — Portal Salud
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
  Activity,
  Calendar,
  Shield,
  HeartPulse,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { isValidPhone } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* ─── Variants ─────────────────────────────────────────── */
const fadeSlideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.94 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.15 } },
};

const springPop = {
  initial: { scale: 0 },
  animate: { scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 18 } },
};

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

/* ─── Aicore Brand Colors ────────────────────────────── */
// Paleta profesional oscura: violeta profundo → púrpura
// Refleja el branding moderno de Aicore (tech + IA)

/* ─── Componente principal ─────────────────────────────── */
export default function PortalLogin() {
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [bypassActivo, setBypassActivo] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

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

      const data = await res.json();

      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || 'Error al solicitar acceso');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  /* ─── Sent ───────────────────────────────────────────── */
  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center p-4">
        <motion.div
          key="sent"
          variants={fadeSlideUp}
          initial="initial"
          animate="animate"
          className="max-w-sm w-full text-center"
        >
          <motion.div
            variants={springPop}
            initial="initial"
            animate="animate"
            className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-6"
          >
            <CheckCircle className="h-10 w-10 text-primary" />
          </motion.div>

          <h1 className="text-2xl font-bold mb-2 text-foreground">Enlace enviado</h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Te enviamos un enlace de acceso por WhatsApp al número{' '}
            <strong className="text-foreground">{telefono}</strong>.
          </p>

          <div className="bg-accent/60 rounded-xl p-4 mb-6 text-left border border-border/50">
            <p className="text-sm font-medium mb-1 text-foreground">¿No te llega el mensaje?</p>
            <p className="text-xs text-muted-foreground">
              Verifica que el número ingresado sea el mismo que registraste en el consultorio. Si el
              problema persiste, contáctanos por WhatsApp.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            El enlace expira en <strong>10 minutos</strong> y solo funciona una vez.
          </p>

          <Button
            variant="link"
            onClick={() => {
              setSent(false);
              setTelefono('');
            }}
            className="mt-6"
          >
            Ingresar otro número
          </Button>
        </motion.div>
      </div>
    );
  }

  /* ─── Landing / Form ─────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0533] via-[#2d0a4a] to-[#0f0220] flex flex-col relative overflow-hidden">
      {/* Decoración de fondo — orbes sutiles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 rounded-full bg-indigo-500/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,60,255,0.08)_0%,transparent_70%)]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8 text-center relative z-10">
        <div className="max-w-sm w-full">
          <AnimatePresence mode="wait">
            {!mostrarForm ? (
              /* ── Landing ─────────────────────────────── */
              <motion.div
                key="landing"
                variants={fadeSlideUp}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* Brand — logo + nombre */}
                <div className="mb-10">
                  <motion.div
                    variants={springPop}
                    initial="initial"
                    animate="animate"
                    className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-5 shadow-lg ring-1 ring-white/15"
                  >
                    <HeartPulse className="h-8 w-8 text-white" />
                  </motion.div>
                  <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                    Portal Salud
                  </h1>
                  <p className="text-white/70 text-sm font-medium tracking-wide">
                    Tu salud, siempre contigo
                  </p>
                </div>

                {/* Beneficios */}
                <div className="space-y-3 mb-10 text-left">
                  {BENEFICIOS.map((b, i) => (
                    <motion.div
                      key={b.titulo}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.1 + i * 0.08,
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1] as const,
                      }}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3 ring-1 ring-white/10"
                    >
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                        <b.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{b.titulo}</p>
                        <p className="text-white/60 text-xs">{b.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Button
                  onClick={() => setMostrarForm(true)}
                  size="lg"
                  className="w-full h-12 text-base bg-white text-violet-900 hover:bg-white/90 shadow-lg shadow-black/20 hover:shadow-black/30 transition-all duration-200"
                >
                  Ingresar al Portal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <p className="mt-4 text-xs text-white/50">
                  <Sparkles className="inline h-3 w-3 mr-1" />
                  Acceso seguro mediante enlace por WhatsApp
                </p>
              </motion.div>
            ) : (
              /* ── Formulario ──────────────────────────── */
              <motion.div
                key="form"
                variants={scaleIn}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="bg-white rounded-2xl shadow-2xl shadow-violet-900/20 p-6 text-left">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Ingresa al Portal</h2>
                  <p className="text-sm text-gray-500 mb-6">Recibe un enlace mágico por WhatsApp</p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2.5 rounded-lg text-sm"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Número de teléfono
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          placeholder="+56 9 1234 5678"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary text-base outline-none transition-all bg-gray-50/50"
                          autoFocus
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !isValidPhone(telefono.replace(/[\s\-()]/g, ''))}
                      className="w-full h-11"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                        </>
                      ) : (
                        <>
                          Enviar enlace
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  <Button
                    variant="ghost"
                    onClick={() => setMostrarForm(false)}
                    className="mt-4 text-gray-400 hover:text-gray-600 w-full"
                  >
                    ← Volver
                  </Button>
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
                <div className="border-t border-white/15 pt-6">
                  <p className="text-xs text-white/50 text-center mb-3">
                    Modo desarrollo — acceso directo sin autenticación
                  </p>
                  <Button
                    onClick={handleTestAccess}
                    disabled={loading}
                    variant="secondary"
                    className="w-full bg-white/10 text-white hover:bg-white/20 border border-white/20"
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
              <Loader2 className="h-5 w-5 text-white/60 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center relative z-10">
        <p className="text-xs text-white/50">
          Solo se muestran datos asociados a tu número registrado.
        </p>
      </div>
    </div>
  );
}
