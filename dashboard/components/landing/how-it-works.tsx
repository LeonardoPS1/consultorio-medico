'use client';

import { MessageCircle, Settings, BarChart3, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedSection } from '@/components/landing/animated-section';

const steps = [
  {
    icon: MessageCircle,
    title: 'Conectás tu WhatsApp',
    desc: 'Vincular tu número de WhatsApp con AiCoreMed lleva 2 minutos. La IA empieza a recibir y responder mensajes al instante.',
    gradient: 'from-green-500/20 to-green-600/10',
    iconColor: 'text-green-500',
  },
  {
    icon: Settings,
    title: 'La IA trabaja por vos',
    desc: 'Agenda turnos, responde consultas, envía recordatorios y gestiona cancelaciones automáticamente. Sin intervención del personal.',
    gradient: 'from-primary/20 to-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: BarChart3,
    title: 'Gestionás desde el panel',
    desc: 'Ves todo desde un solo dashboard: turnos, pacientes, reportes, recetas y alertas. Sin papeles, sin llamadas, sin esfuerzo.',
    gradient: 'from-blue-500/20 to-blue-600/10',
    iconColor: 'text-blue-500',
  },
];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden border-t">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 py-20 md:py-28">
        <AnimatedSection className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Cómo funciona</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Configurás una vez y la IA empieza a trabajar. Sin conocimientos técnicos, sin
            configuraciones complejas.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12 max-w-4xl mx-auto">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                {/* Connector line between steps */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%]">
                    <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}

                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: idx * 0.15 }}
                  className={`relative h-24 w-24 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-6`}
                >
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/5" />
                  <Icon className={`h-10 w-10 ${step.iconColor}`} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.15 }}
                >
                  <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                    {idx + 1}
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {step.desc}
                  </p>
                </motion.div>
              </div>
            );
          })}
        </div>

        <AnimatedSection className="text-center mt-12" delay={0.3}>
          <p className="text-sm text-muted-foreground">
            Todo listo en menos de 5 minutos.{' '}
            <span className="font-semibold text-foreground">14 días de prueba gratis.</span>
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
