'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    text: 'Desde que implementamos AiCoreMed, nuestras citas se llenan un 30% más rápido y redujimos los ausentes en un 20%. La IA de WhatsApp responde automáticamente mientras nosotros atendemos pacientes.',
    author: 'Dra. María González',
    role: 'Clínica Dental Salud, Chile',
  },
  {
    text: 'El asistente con IA local nos permite tener respuestas inteligentes 24/7 sin depender de APIs externas. Ahorramos al menos 2 horas por día en gestión administrativa.',
    author: 'Dr. Roberto Martínez',
    role: 'Cardiólogo, Buenos Aires',
  },
  {
    text: 'La automatización de recordatorios y la gestión de turnos transformó nuestro centro médico. Pasamos de perder el 25% de los turnos a tener menos del 5% de ausentismo.',
    author: 'Centro Médico Cordillera',
    role: 'Santiago, Chile',
  },
  {
    text: 'El agente de voz con IA nos permite confirmar citas sin intervención humana. Los pacientes ni siquiera notan que están hablando con un asistente virtual.',
    author: 'Clínica Cardiológica del Pacífico',
    role: 'Viña del Mar, Chile',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function Testimonials() {
  return (
    <section className="relative overflow-hidden border-t">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Lo que dicen nuestros clientes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Clínicas y consultorios de toda Latinoamérica ya confían en AiCoreMed
            para transformar su gestión diaria.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.author}
              variants={cardVariants}
              className="relative rounded-xl border bg-card p-6 hover-card flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-primary/30 text-primary/30" />
                ))}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold">{t.author}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
