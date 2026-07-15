/**
 * Portal del Paciente — Login / Landing público
 * Premium redesign Aicore: glassmorphism, animaciones fluidas,
 * paleta teal+violeta cálida, beneficios en glass cards.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronDown,
  User,
} from 'lucide-react';
import { isValidPhone } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalButton } from '@/components/portal/portal-button';

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

interface BypassPaciente {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
}

/* ─── Componente principal ─────────────────────────────── */
export default function PortalLogin() {
  const [step, setStep] = useState<Step>('landing');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bypassActivo, setBypassActivo] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const [bypassPacientes, setBypassPacientes] = useState<BypassPaciente[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<BypassPaciente | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);

  useEffect(() => {
    fetch('/api/portal/auth/status')
      .then((r) => r.json())
      .then((data) => {
        setBypassActivo(data.bypass === true);
        if (data.pacientes?.length > 0) {
          setBypassPacientes(data.pacientes);
          setPacienteSeleccionado(data.pacientes[0]);
        }
      })
      .catch(() => {})
      .finally(() => setStatusChecked(true));
  }, []);

  async function handleTestAccess(pacienteId?: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/portal/auth/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacienteId }),
      });
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
        className="min-h-screen flex items-center justify-center p-4 portal-layout"
      >
        <motion.div
          key="sent"
          variants={fadeSlideUp}
          initial="initial"
          animate="animate"
          className="max-w-sm w-full"
        >
          <PortalCard padding="lg" className="text-center">
            <motion.div
              variants={springPop}
              initial="initial"
              animate="animate"
              className="inline-flex items-center justify-center h-20 w-20 rounded-full mb-6 bg-portal-primary/10"
            >
              <CheckCircle
                className="h-10 w-10 text-portal-primary"
              />
            </motion.div>

            <h1
              className="text-2xl font-bold mb-2 text-portal-fg"
            >
              Enlace enviado
            </h1>
            <p
              className="mb-6 leading-relaxed text-portal-muted-fg"
            >
              Te enviamos un enlace de acceso por WhatsApp al número{' '}
              <strong className="text-portal-fg">
                {telefono}
              </strong>
              .
            </p>

            <PortalCard padding="md" className="mb-6 text-left">
              <p
                className="text-sm font-medium mb-1 text-portal-fg"
              >
                ¿No te llega el mensaje?
              </p>
              <p
                className="text-xs text-portal-muted-fg"
              >
                Verifica que el número ingresado sea el mismo que registraste en
                el consultorio. Si el problema persiste, contáctanos por WhatsApp.
              </p>
              </PortalCard>

            <p
              className="text-sm mb-6 text-portal-muted-fg"
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
          </PortalCard>
        </motion.div>
      </div>
    );
  }

  /* ════════════════════════════════════════ Landing ════ */
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden portal-layout"
    >
      {/* Ambient gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl bg-portal-primary/6"
        />
        <div
          className="absolute -bottom-40 -left-40 w-[30rem] h-[30rem] rounded-full blur-3xl bg-portal-accent/5"
        />
        <div
          className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full blur-3xl bg-portal-primary/3"
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
                    className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-5 bg-portal-gradient-strong shadow-lg"
                  >
                    <HeartPulse className="h-8 w-8 text-white" />
                  </motion.div>
                  <h1
                    className="text-3xl font-bold mb-1 tracking-tight text-portal-fg"
                  >
                    Portal Salud
                  </h1>
                  <p
                    className="text-sm font-medium tracking-wide text-portal-muted-fg"
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
                    >
                      <PortalCard className="flex items-start gap-3" padding="md">
                        <div
                          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-portal-primary/10"
                        >
                          <b.icon
                            className="h-5 w-5 text-portal-primary"
                          />
                        </div>
                        <div>
                          <p
                            className="font-medium text-sm text-portal-fg"
                          >
                            {b.titulo}
                          </p>
                          <p
                            className="text-xs text-portal-muted-fg"
                          >
                            {b.desc}
                          </p>
                        </div>
                      </PortalCard>
                    </motion.div>
                  ))}
                </div>

                <PortalButton variant="primary" fullWidth onClick={() => setStep('form')} className="!h-12 !text-base">
                  <span className="flex items-center justify-center gap-2">
                    Ingresar al Portal
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </PortalButton>

                <p
                  className="mt-4 text-xs text-portal-muted-fg/60"
                >
                  Acceso seguro mediante enlace por WhatsApp
                </p>

                {/* Bypass directo en landing */}
                {bypassActivo && statusChecked && bypassPacientes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
                    className="mt-8 pt-6 border-t border-portal-border-light"
                  >
                    <p className="text-[10px] text-center font-medium mb-3 uppercase tracking-wider text-portal-muted-fg/40">
                      Modo desarrollo — acceso directo
                    </p>

                    {/* Selector de paciente */}
                    <div className="relative mb-2">
                      <button
                        onClick={() => setSelectorOpen(!selectorOpen)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs border border-portal-border bg-portal-muted/40 text-portal-fg hover:border-portal-primary/30 transition-colors"
                      >
                        <User className="h-3.5 w-3.5 text-portal-muted-fg/50 shrink-0" />
                        <span className="flex-1 truncate">
                          {pacienteSeleccionado
                            ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido} — ${pacienteSeleccionado.telefono}`
                            : 'Seleccionar paciente...'}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-portal-muted-fg/50 transition-transform duration-200 ${selectorOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {selectorOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full mb-1 left-0 right-0 z-10 max-h-48 overflow-y-auto rounded-xl border border-portal-border bg-portal-bg-alt shadow-lg"
                          >
                            {bypassPacientes.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setPacienteSeleccionado(p);
                                  setSelectorOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-portal-primary/5 ${
                                  pacienteSeleccionado?.id === p.id
                                    ? 'bg-portal-primary/10 text-portal-primary font-medium'
                                    : 'text-portal-fg'
                                }`}
                              >
                                <span className="block truncate">{p.nombre} {p.apellido}</span>
                                <span className="block text-[10px] text-portal-muted-fg/60 truncate">{p.telefono}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <PortalButton
                      variant="secondary"
                      fullWidth
                      onClick={() => handleTestAccess(pacienteSeleccionado?.id)}
                      disabled={loading || !pacienteSeleccionado}
                      loading={loading}
                      className="!h-9 !text-xs"
                    >
                      <Bug className="mr-1.5 h-3.5 w-3.5" />
                      Ingresar como {pacienteSeleccionado?.nombre || '...'}
                    </PortalButton>
                  </motion.div>
                )}
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
                <PortalCard padding="lg" className="text-left">
                  <h2
                    className="text-xl font-bold mb-1 text-portal-fg"
                  >
                    Ingresa al Portal
                  </h2>
                  <p
                    className="text-sm mb-6 text-portal-muted-fg"
                  >
                    Recibe un enlace mágico por WhatsApp
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, maxHeight: 0 }}
                        animate={{ opacity: 1, maxHeight: 200 }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm overflow-hidden text-portal-destructive bg-portal-destructive/10"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}

                    <div>
                      <label
                        className="block text-sm font-medium mb-1.5 text-portal-fg"
                      >
                        Número de teléfono
                      </label>
                      <div className="relative">
                        <Phone
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-portal-muted-fg/50"
                        />
                        <input
                          type="tel"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          placeholder="+56 9 1234 5678"
                          className="w-full pl-10 pr-4 py-3 rounded-xl text-base outline-none transition-[border-color,box-shadow] border border-portal-border bg-portal-muted/40 text-portal-fg focus:border-portal-primary/50 focus:shadow-[0_0_0_3px_hsl(var(--portal-primary)/0.1)]"
                          autoFocus
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <PortalButton variant="primary" fullWidth type="submit" disabled={loading || !isValidPhone(telefono.replace(/[\s\-()]/g, ''))} loading={loading}>
                      <span className="flex items-center justify-center gap-2">
                        Enviar enlace
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </PortalButton>
                  </form>

                  <PortalButton variant="ghost" fullWidth onClick={() => setStep('landing')} className="!mt-4">
                    ← Volver
                  </PortalButton>
                  </PortalCard>
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
                  className="pt-5 border-t border-portal-border-light"
                >
                  <p
                    className="text-xs text-center mb-3 text-portal-muted-fg/50"
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
                className="h-5 w-5 animate-spin text-portal-muted-fg"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center relative z-10">
        <p
          className="text-xs text-portal-muted-fg/50"
        >
          Solo se muestran datos asociados a tu número registrado.
        </p>
      </div>
    </div>
  );
}
