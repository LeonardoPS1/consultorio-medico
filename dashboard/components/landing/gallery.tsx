'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import Image from 'next/image';

const SCREENSHOTS = [
  { id: 'home', label: 'Panel Principal', src: '/assets/dashboard-real-home.png' },
  { id: 'turnos', label: 'Agenda y Turnos', src: '/assets/dashboard-real-turnos.png' },
  { id: 'pacientes', label: 'Pacientes', src: '/assets/dashboard-real-pacientes.png' },
  { id: 'config', label: 'Configuración', src: '/assets/dashboard-real-configuracion.png' },
  { id: 'reportes', label: 'Reportes', src: '/assets/dashboard-real-reportes.png' },
  { id: 'atencion', label: 'Atención', src: '/assets/dashboard-real-atencion.png' },
  { id: 'recetas', label: 'Recetas', src: '/assets/dashboard-real-recetas.png' },
];

const IMG_WIDTH = 1440;
const IMG_HEIGHT = 900;

export function Gallery() {
  const [active, setActive] = useState(SCREENSHOTS[0].id);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-t bg-muted/20">
      <div className="container mx-auto px-4 md:px-6 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Explorá el sistema por dentro</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Una interfaz intuitiva, moderna y diseñada especialmente para el flujo de trabajo de
            médicos y administradores. 100% real.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex flex-wrap justify-center gap-1.5 mb-8"
        >
          {SCREENSHOTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors duration-200 btn-press ${
                 active === s.id
                   ? 'bg-primary text-primary-foreground shadow-sm'
                   : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
               }`}
            >
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* Screenshot display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative rounded-xl border bg-card shadow-xl overflow-hidden max-w-5xl mx-auto gallery-img-container"
        >
          {/* Mac-style window controls */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-muted/80 border-b flex items-center px-4 gap-2 z-10">
            <span className="w-3 h-3 rounded-full bg-red-400/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <span className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>

          {shouldReduceMotion ? (
            <div className="pt-8">
              <Image
                src={SCREENSHOTS.find((s) => s.id === active)!.src}
                alt={`Captura de ${SCREENSHOTS.find((s) => s.id === active)!.label}`}
                width={IMG_WIDTH}
                height={IMG_HEIGHT}
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="w-full h-auto"
              />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ filter: 'blur(4px)', opacity: 0, scale: 0.97 }}
                animate={{ filter: 'blur(0px)', opacity: 1, scale: 1 }}
                exit={{ filter: 'blur(2px)', opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="pt-8 gallery-img-hover"
              >
              <Image
                src={SCREENSHOTS.find((s) => s.id === active)!.src}
                alt={`Captura de ${SCREENSHOTS.find((s) => s.id === active)!.label}`}
                width={IMG_WIDTH}
                height={IMG_HEIGHT}
                sizes="(max-width: 1024px) 100vw, 1024px"
                priority={active === SCREENSHOTS[0].id}
                className="w-full h-auto"
              />
            </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </section>
  );
}
