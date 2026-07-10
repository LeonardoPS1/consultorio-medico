'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MessageCircle, ArrowRight, Loader2 } from 'lucide-react';

const BENEFITS = [
  {
    title: 'Demo 100% personalizada',
    desc: 'Entrenamos un asistente con tu especialidad para que lo pruebes en vivo.',
  },
  {
    title: 'Análisis de procesos gratuito',
    desc: 'Identificamos qué tareas administrativas puedes delegar a la IA.',
  },
  {
    title: 'Cotización a medida',
    desc: 'Soluciones escalables según la cantidad de profesionales en tu centro.',
  },
  {
    title: 'Horario de atención',
    desc: 'Lunes a viernes de 9:00 a 18:00 h — respondemos en menos de 1 hora hábil.',
  },
];

export function ContactForm() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    specialty: '',
    size: '',
    phone: '',
    interests: [] as string[],
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleInterest = (v: string) =>
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(v)
        ? prev.interests.filter((i) => i !== v)
        : [...prev.interests, v],
    }));

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          specialty: form.specialty || undefined,
          size: form.size || undefined,
          interests: form.interests,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al enviar');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
      setLoading(false);
      return;
    }
    setLoading(false);
    setSubmitted(true);
  };

  const progress = (step / 3) * 100;

  return (
    <section id="contact" className="relative overflow-hidden border-t bg-muted/20">
      <div className="container mx-auto px-4 md:px-6 py-16 md:py-28">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 max-w-5xl mx-auto">
          {/* Left: benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Transforma la gestión de tu consultorio hoy
            </h2>
            <p className="text-muted-foreground mb-6 md:mb-8">
              Completa el formulario y obtén una demostración personalizada con un agente de IA
              adaptado a tu especialidad.
            </p>

            <div className="space-y-4 sm:space-y-5">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{b.title}</h4>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {!submitted ? (
              <form
                onSubmit={handleSubmit}
                className="rounded-xl border bg-card p-5 sm:p-6 space-y-5 shadow-sm"
              >
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Paso {step} de 3</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
                    />
                  </div>
                </div>

                {/* Step 1 */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <h3 className="text-sm font-semibold">Cuéntanos sobre ti</h3>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        placeholder="Dr. / Dra. / Administrador"
                        className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none transition-[border-color,box-shadow]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        placeholder="ejemplo@consultorio.com"
                        className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none transition-[border-color,box-shadow]"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <h3 className="text-sm font-semibold">Detalles de tu consultorio</h3>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Especialidad
                      </label>
                      <select
                        required
                        value={form.specialty}
                        onChange={(e) => update('specialty', e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none transition-[border-color,box-shadow]"
                      >
                        <option value="" disabled>
                          Selecciona una opción
                        </option>
                        <option value="general">Clínica Médica / Especialidades</option>
                        <option value="odontologia">Clínica Odontológica</option>
                        <option value="oftalmologia">Centro Oftalmológico</option>
                        <option value="estetica">Centro de Estética / Dermatología</option>
                        <option value="otra">Otra Especialidad de Salud</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Tamaño del equipo
                      </label>
                      <select
                        required
                        value={form.size}
                        onChange={(e) => update('size', e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none transition-[border-color,box-shadow]"
                      >
                        <option value="" disabled>
                          Selecciona cantidad
                        </option>
                        <option value="1">1 Profesional</option>
                        <option value="2-5">2 a 5 Profesionales</option>
                        <option value="6-15">6 a 15 Profesionales</option>
                        <option value="16+">Más de 15 Profesionales</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {/* Step 3 */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <h3 className="text-sm font-semibold">Contacto final</h3>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        WhatsApp / Teléfono
                      </label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        placeholder="+56 9 1234 5678"
                        className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none transition-[border-color,box-shadow]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        ¿Qué te interesa probar?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'whatsapp', label: 'WhatsApp IA' },
                          { value: 'llamadas', label: 'Llamadas IA' },
                          { value: 'email', label: 'Emails Auto' },
                          { value: 'crm', label: 'CRM & Agenda' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleInterest(opt.value)}
className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors duration-200 ${
                               form.interests.includes(opt.value)
                                 ? 'bg-primary/10 border-primary/30 text-primary'
                                 : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/30'
                             }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Navigation */}
                <div className="flex items-center gap-3 pt-2">
                  {step > 1 && (
                    <Button type="button" variant="outline" size="default" onClick={prevStep}>
                      Atrás
                    </Button>
                  )}
                  {step < 3 ? (
                    <Button
                      type="button"
                      size="default"
                      className="ml-auto gap-1.5"
                      onClick={nextStep}
                    >
                      Siguiente
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="default"
                      className="ml-auto gap-1.5"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4" />
                          Solicitar demo gratis
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {error && <p className="text-xs text-destructive text-center">{error}</p>}
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border bg-card p-8 text-center space-y-4 shadow-sm"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">¡Solicitud recibida!</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Te contactaremos en menos de 24 horas hábiles con una demo personalizada para tu
                  especialidad.
                </p>
                <p className="text-xs text-primary">
                  Mientras tanto, probá el simulador interactivo o escribinos por WhatsApp.
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
