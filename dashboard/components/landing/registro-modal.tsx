'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
// Nota: checkbox nativo estilizado (shadcn Checkbox no está instalado en este proyecto)

interface RegistroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plan opcional: si se pasa, redirige al checkout de MP después del registro */
  planId?: string;
}

type Step = 'form' | 'loading' | 'success' | 'error';

export function RegistroExpressModal({ open, onOpenChange, planId }: RegistroModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [consentAccepted, setConsentAccepted] = useState(false);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nombre.trim() || form.nombre.trim().length < 2) {
      errors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Ingresa un email válido';
    }
    if (!form.password || form.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (!consentAccepted) {
      errors.consent = 'Debes aceptar la política de privacidad para continuar';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStep('loading');
    setErrorMsg('');

    try {
      // 1. Registrar usuario
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear la cuenta');
      }

      // 2. Auto-login con NextAuth
      setStep('loading');

      const signInResult = await signIn('credentials', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error(
          'Cuenta creada, pero hubo un problema al iniciar sesión. Redirigiendo al login...',
        );
      }

      // 3. Éxito
      setStep('success');

      // 4. Redirigir después de una pausa para mostrar el success
      setTimeout(() => {
        onOpenChange(false);
        const baseUrl = '/dashboard/configuracion?tab=suscripcion';
        const url = planId ? `${baseUrl}&plan=${planId}` : baseUrl;
        router.push(url);
        router.refresh();
      }, 1200);
    } catch (err) {
      setStep('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado');
    }
  };

  const resetForm = () => {
    setStep('form');
    setErrorMsg('');
    setFieldErrors({});
    setForm({ nombre: '', email: '', password: '' });
    setConsentAccepted(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Resetear todo al cerrar
      setTimeout(resetForm, 200);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden gap-0">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-8 pb-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              <AnimatePresence mode="wait">
                {step === 'success' ? (
                  <motion.span
                    key="success-title"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-6 w-6" />
                    Cuenta creada
                  </motion.span>
                ) : (
                  <motion.span
                    key="form-title"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-5 w-5 text-primary" />
                    Crear cuenta gratuita
                  </motion.span>
                )}
              </AnimatePresence>
            </DialogTitle>
            <DialogDescription className="text-sm">
              {step === 'success'
                ? 'Redirigiendo al consultorio...'
                : 'Sin tarjeta de crédito · 14 días gratis'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-4">
          <AnimatePresence mode="wait">
            {step === 'form' && (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="reg-nombre">Nombre completo</Label>
                  <Input
                    id="reg-nombre"
                    placeholder="Dr. Juan Pérez"
                    value={form.nombre}
                    onChange={(e) => {
                      setForm({ ...form, nombre: e.target.value });
                      if (fieldErrors.nombre) setFieldErrors({ ...fieldErrors, nombre: '' });
                    }}
                    className={fieldErrors.nombre ? 'border-destructive' : ''}
                    autoFocus
                  />
                  {fieldErrors.nombre && (
                    <p className="text-xs text-destructive">{fieldErrors.nombre}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="dr@consultorio.com"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                    }}
                    className={fieldErrors.email ? 'border-destructive' : ''}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-destructive">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Contraseña</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value });
                      if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                    }}
                    className={fieldErrors.password ? 'border-destructive' : ''}
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-destructive">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Consentimiento obligatorio */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="reg-consent"
                    checked={consentAccepted}
                    onChange={(e) => {
                      setConsentAccepted(e.target.checked);
                      if (fieldErrors.consent) {
                        setFieldErrors((prev) => ({ ...prev, consent: '' }));
                      }
                    }}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-primary text-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
                  />
                  <label
                    htmlFor="reg-consent"
                    className={`text-xs leading-relaxed cursor-pointer select-none ${
                      fieldErrors.consent ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    Acepto la{' '}
                    <Link
                      href="/privacidad"
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                    >
                      Política de Privacidad
                    </Link>{' '}
                    y los{' '}
                    <Link
                      href="/terminos"
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                    >
                      Términos del Servicio
                    </Link>
                    , y autorizo el tratamiento de mis datos personales y de salud para la gestión
                    de turnos y comunicación.
                  </label>
                </div>
                {fieldErrors.consent && (
                  <p className="text-xs text-destructive">{fieldErrors.consent}</p>
                )}

                {errorMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2"
                  >
                    {errorMsg}
                  </motion.p>
                )}

                <Button type="submit" className="w-full gap-2 min-h-[48px]" size="lg">
                  <Sparkles className="h-4 w-4" />
                  Crear cuenta gratuita
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      router.push('/login');
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Iniciar sesión
                  </button>
                </p>
              </motion.form>
            )}

            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 gap-3"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Creando tu cuenta...</p>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 gap-2"
              >
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-center text-foreground mt-2">
                  Todo listo, {form.nombre.split(' ')[0]}!
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  {planId
                    ? 'Te estamos redirigiendo al checkout...'
                    : 'Redirigiendo a tu consultorio...'}
                </p>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <p className="text-sm text-destructive text-center py-4">{errorMsg}</p>
                <Button variant="outline" className="w-full" onClick={() => setStep('form')}>
                  Intentar de nuevo
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
